/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
import { Colaborador, FormularioInstancia, FormularioTemplate, RespostaAvaliacao180, RespostaCampo, WorkflowDefinicao } from '../types';
import { DataService } from '../services/DataService';
import FormularioRenderer from '../features/formularios/components/FormularioRenderer';
import { aplicarTransicao } from '../features/formularios/engine/workflowEngine';
import { calcularSla } from '../features/formularios/engine/slaEngine';
import { calcularResultado } from '../features/formularios/engine/calculoEngine';

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 3 e 4
//
// ModalFormularioAvaliacao — carrega o FormularioTemplate ativo de uma
// família, encontra ou cria a FormularioInstancia do colaborador, carrega
// as respostas já salvas (rascunho) e delega a renderização ao
// FormularioRenderer (genérico, dirigido por dados).
//
// Sprint 4: a conclusão agora calcula o resultado de verdade (calculoEngine)
// e persiste em `instancia.resultado`. Este modal também atende a Avaliação
// 180° (migrada do ModalAvaliacao180 — que permanece no repositório, não
// utilizado, até a limpeza planejada para o Sprint 6). Quando
// `tipoProcesso === 'avaliacao_180'`, a conclusão grava também em
// `Resultados180` em paralelo, por compatibilidade com telas/relatórios
// que ainda leem essa tabela (arquitetura, seção 2.6).
// ═══════════════════════════════════════════════════════════════════

export interface ModalFormularioAvaliacaoProps {
  isOpen: boolean;
  colaborador: Colaborador | null;
  /** ex.: 'avaliacao-experiencia' — identifica a família de template a usar */
  templateFamiliaId: string;
  /** milestone de compatibilidade com Colaborador.avaliacoesCompletas (ex.: '15', '30', '60', '90') */
  milestone: string;
  dataLimite?: string;
  responsavelId: string;
  onClose: () => void;
  onConcluida: (colaboradorAtualizado: Colaborador) => void;
}

export default function ModalFormularioAvaliacao({
  isOpen,
  colaborador,
  templateFamiliaId,
  milestone,
  dataLimite,
  responsavelId,
  onClose,
  onConcluida,
}: ModalFormularioAvaliacaoProps) {
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [template, setTemplate] = useState<FormularioTemplate | null>(null);
  const [workflow, setWorkflow] = useState<WorkflowDefinicao | null>(null);
  const [instancia, setInstancia] = useState<FormularioInstancia | null>(null);
  const [respostas, setRespostas] = useState<RespostaCampo[]>([]);

  useEffect(() => {
    if (!isOpen || !colaborador) return;
    let cancelado = false;

    const carregar = async () => {
      setCarregando(true);
      setErro(null);
      try {
        const templates = await DataService.getFormularioTemplates(templateFamiliaId);
        const templateAtivo = templates.find((t: FormularioTemplate) => t.ativo) || templates[templates.length - 1];
        if (!templateAtivo) {
          if (!cancelado) setErro('Nenhum template ativo encontrado para esta avaliação.');
          return;
        }

        const [workflows, instanciasExistentes] = await Promise.all([
          DataService.getWorkflowDefinicoes(),
          DataService.getFormularioInstancias({
            entidadeId: colaborador.id,
            tipoProcesso: templateAtivo.tipoProcesso,
          }),
        ]);
        const workflowDoTemplate = workflows.find((w: WorkflowDefinicao) => w.id === templateAtivo.workflowId) || null;

        let instanciaAtual = instanciasExistentes.find(
          (i: FormularioInstancia) => i.estadoWorkflow !== 'concluida' && i.estadoWorkflow !== 'arquivada'
        );
        if (!instanciaAtual) {
          instanciaAtual = {
            id: `form-inst-${colaborador.id}-${templateAtivo.templateFamiliaId}-${Date.now()}`,
            templateId: templateAtivo.id,
            templateFamiliaId: templateAtivo.templateFamiliaId,
            tipoProcesso: templateAtivo.tipoProcesso,
            workflowId: templateAtivo.workflowId,
            entidadeTipo: 'colaborador',
            entidadeId: colaborador.id,
            responsavelId,
            estadoWorkflow: 'pendente',
            dataLimite,
            origem: 'sistema',
            setorId: colaborador.setorId,
            cargoId: colaborador.cargoId,
            liderId: colaborador.liderId,
            empresaId: colaborador.empresaId,
          };
          await DataService.saveFormularioInstancia(instanciaAtual);
        }

        const respostasExistentes = await DataService.getRespostasCampos(instanciaAtual.id);

        if (!cancelado) {
          setTemplate(templateAtivo);
          setWorkflow(workflowDoTemplate);
          setInstancia(instanciaAtual);
          setRespostas(respostasExistentes);
        }
      } catch (e) {
        if (!cancelado) setErro('Não foi possível carregar o formulário. Tente novamente.');
        console.error('Erro ao carregar ModalFormularioAvaliacao:', e);
      } finally {
        if (!cancelado) setCarregando(false);
      }
    };

    carregar();
    return () => {
      cancelado = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, colaborador?.id, templateFamiliaId]);

  if (!isOpen || !colaborador) return null;

  const papel = 'gestor'; // autoavaliação (papel 'colaborador') entra no Sprint 5

  const handleChangeResposta = (perguntaId: string, valor: unknown, comentario?: string) => {
    setRespostas((atuais) => {
      const idx = atuais.findIndex((r) => r.perguntaId === perguntaId && r.papel === papel);
      const agora = new Date().toISOString();
      if (idx >= 0) {
        const copia = [...atuais];
        copia[idx] = { ...copia[idx], valor, comentario, atualizadoEm: agora };
        return copia;
      }
      return [
        ...atuais,
        {
          id: `resp-${instancia?.id || 'novo'}-${perguntaId}-${papel}`,
          instanciaId: instancia?.id || '',
          perguntaId,
          papel,
          valor,
          comentario,
          atualizadoEm: agora,
        },
      ];
    });
  };

  const persistirInstanciaEEstado = async (novoEstado: string, extras: Partial<FormularioInstancia> = {}) => {
    if (!instancia) return null;
    const estadoAnterior = instancia.estadoWorkflow;
    const instanciaAtualizada: FormularioInstancia = {
      ...instancia,
      ...extras,
      estadoWorkflow: novoEstado,
    };
    await DataService.saveFormularioInstancia(instanciaAtualizada);
    await DataService.saveRespostasCamposBatch(instanciaAtualizada.id, respostas);
    if (estadoAnterior !== novoEstado) {
      await DataService.saveHistoricoEstadoInstancia({
        id: `hist-${instanciaAtualizada.id}-${Date.now()}`,
        instanciaId: instanciaAtualizada.id,
        estadoAnterior,
        estadoNovo: novoEstado,
        alteradoPor: responsavelId,
        data: new Date().toISOString(),
      });
    }
    setInstancia(instanciaAtualizada);
    return instanciaAtualizada;
  };

  const handleSalvarRascunho = async () => {
    if (!instancia || !workflow) return;
    setSalvando(true);
    try {
      const acao = instancia.estadoWorkflow === 'pendente' ? 'iniciar' : 'salvar_rascunho';
      const novoEstado = aplicarTransicao(workflow, instancia.estadoWorkflow, acao);
      await persistirInstanciaEEstado(novoEstado, {
        dataInicio: instancia.dataInicio || new Date().toISOString(),
      });
    } catch (e) {
      console.error('Erro ao salvar rascunho:', e);
      setErro('Não foi possível salvar o rascunho agora. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const handleConcluir = async () => {
    if (!instancia || !workflow || !template) return;
    setSalvando(true);
    try {
      const resultado = calcularResultado(template, respostas, papel);
      const novoEstado = aplicarTransicao(workflow, instancia.estadoWorkflow, 'concluir');
      const instanciaConcluida = await persistirInstanciaEEstado(novoEstado, {
        dataConclusao: new Date().toISOString(),
        resultado,
      });

      // Compatibilidade (arquitetura, seção 2.6): a Avaliação 180° grava em
      // paralelo na tabela legada Resultados180, enquanto ela ainda for lida
      // por outras telas/relatórios. Mapeamento: parecer "Excelente" /
      // "Muito Bom" / "Aprovado" → resultado "aprovado"; qualquer outro
      // (ex.: "Necessita acompanhamento") → "reprovado".
      if (instanciaConcluida && template.tipoProcesso === 'avaliacao_180') {
        const respostasDoPapel = respostas.filter((r) => r.papel === papel);
        const respostasLegado: RespostaAvaliacao180[] = respostasDoPapel
          .filter((r) => typeof r.valor === 'number')
          .map((r) => ({
            perguntaId: r.perguntaId,
            nota: r.valor as number,
            comentario: r.comentario || '',
          }));
        const parecerAprovado =
          !resultado.parecerFinal ||
          ['excelente', 'muito bom', 'aprovado'].includes(resultado.parecerFinal.toLowerCase());

        await DataService.saveResultado180({
          id: `resultado-180-${colaborador.id}-${Date.now()}`,
          colaboradorId: colaborador.id,
          dataRealizacao: instanciaConcluida.dataConclusao || new Date().toISOString(),
          resultado: parecerAprovado ? 'aprovado' : 'reprovado',
          mediaGeral: resultado.mediaGeral ?? 0,
          mediaPonderada: resultado.mediaPonderada ?? resultado.mediaGeral ?? 0,
          respostas: respostasLegado,
          observacoes: '',
          avaliadorId: responsavelId,
          tipo: '180',
        });
      }

      // Compatibilidade: mantém Colaborador.avaliacoesCompletas atualizado
      // enquanto ele ainda for lido por outras telas (ver arquitetura, seção 2.6).
      const novasCompletas = [...(colaborador.avaliacoesCompletas || [])];
      if (!novasCompletas.includes(milestone)) novasCompletas.push(milestone);
      onConcluida({ ...colaborador, avaliacoesCompletas: novasCompletas });
    } catch (e) {
      console.error('Erro ao concluir avaliação:', e);
      setErro('Não foi possível concluir a avaliação agora. Tente novamente.');
    } finally {
      setSalvando(false);
    }
  };

  const sla = instancia ? calcularSla(instancia) : 'sem_prazo';
  const avisoPrazo = sla === 'atrasado' ? 'Atrasada — pode ser realizada normalmente' : undefined;

  return (
    <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {template ? template.nome : milestone === '180' ? 'Avaliação 180°' : 'Avaliação de Experiência'}
            </h2>
            <p className="text-xs text-slate-500">{colaborador.nome}</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 text-xl leading-none px-2"
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {carregando && <p className="text-xs text-slate-500">Carregando formulário…</p>}
        {erro && (
          <p className="text-xs text-rose-600 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 mb-3">
            {erro}
          </p>
        )}

        {!carregando && template && (
          <FormularioRenderer
            template={template}
            respostas={respostas}
            papel={papel}
            onChangeResposta={handleChangeResposta}
            onSalvarRascunho={handleSalvarRascunho}
            onConcluir={handleConcluir}
            salvando={salvando}
            avisoPrazo={avisoPrazo}
          />
        )}
      </div>
    </div>
  );
}
