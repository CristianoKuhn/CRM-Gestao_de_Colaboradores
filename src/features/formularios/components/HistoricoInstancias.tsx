/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { FormularioInstancia } from '../../../types';

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 4
//
// HistoricoInstancias — linha do tempo genérica de instâncias concluídas,
// com evolução das médias. Funciona para qualquer `tipoProcesso`, não só
// avaliação — quem decide o que exibir é quem chama este componente
// (ex.: ColaboradorProfile filtra por entidadeId antes de passar aqui).
//
// Ajuste (harmonização visual do Perfil do Colaborador): existir uma
// FormularioInstancia com estadoWorkflow "concluida"/"arquivada" não é
// garantia de que ela tenha conteúdo — o Motor de Avaliação de Experiência
// agenda instâncias automaticamente (15/30/60/90 dias) que podem chegar a
// esse estado sem que nenhum gestor tenha de fato preenchido nota, parecer
// ou feedback. Mostrar essas entradas "vazias" só produz um bloco grande e
// repetitivo sem informação nenhuma (ver captura de tela do CRM). Por isso,
// além do filtro de estado, agora também exigimos que exista pelo menos um
// dado de resultado real antes de renderizar o item.
// ═══════════════════════════════════════════════════════════════════

const ROTULOS_TIPO_PROCESSO: Record<string, string> = {
  avaliacao_experiencia: 'Avaliação de Experiência',
  avaliacao_180: 'Avaliação 180°',
  avaliacao_360: 'Avaliação 360°',
  avaliacao_anual: 'Avaliação Anual',
  feedback: 'Feedback',
  pdi: 'PDI',
};

function rotuloTipoProcesso(tipoProcesso: string): string {
  return ROTULOS_TIPO_PROCESSO[tipoProcesso] || tipoProcesso;
}

function corDoParecer(parecer?: string): string {
  if (!parecer) return 'bg-slate-100 text-slate-500';
  const normalizado = parecer.toLowerCase();
  if (normalizado.includes('excelente') || normalizado.includes('muito bom') || normalizado.includes('aprovado')) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (normalizado.includes('reprovado') || normalizado.includes('acompanhamento')) {
    return 'bg-rose-100 text-rose-700';
  }
  return 'bg-slate-100 text-slate-600';
}

// Considera "preenchida" uma instância que tenha pelo menos um dado de
// resultado real — média (simples ou ponderada), parecer final, ou algum
// campo de IA já gerado. Uma instância "concluída" sem nenhum desses dados
// é, na prática, um agendamento vazio e não deve aparecer no histórico.
function temResultadoPreenchido(instancia: FormularioInstancia): boolean {
  const resultado = instancia.resultado;
  if (resultado) {
    if (resultado.mediaGeral !== undefined && resultado.mediaGeral !== null) return true;
    if (resultado.mediaPonderada !== undefined && resultado.mediaPonderada !== null) return true;
    if (resultado.parecerFinal) return true;
  }
  if (instancia.iaParecerTecnico) return true;
  if (instancia.iaFeedbackGestor) return true;
  if (instancia.iaFeedbackColaborador) return true;
  return false;
}

export interface HistoricoInstanciasProps {
  instancias: FormularioInstancia[];
  vazio?: string;
}

export default function HistoricoInstancias({ instancias, vazio }: HistoricoInstanciasProps) {
  const concluidas = instancias
    .filter((i) => i.estadoWorkflow === 'concluida' || i.estadoWorkflow === 'arquivada')
    .filter(temResultadoPreenchido)
    .slice()
    .sort((a, b) => new Date(b.dataConclusao || 0).getTime() - new Date(a.dataConclusao || 0).getTime());

  if (concluidas.length === 0) {
    return <p className="text-sm text-slate-400">{vazio || 'Nenhuma avaliação concluída ainda.'}</p>;
  }

  return (
    <div className="flex flex-col gap-2">
      {concluidas.map((instancia) => {
        const media = instancia.resultado?.mediaPonderada ?? instancia.resultado?.mediaGeral;
        return (
          <div key={instancia.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl px-3 py-2.5">
            <div>
              <p className="text-xs font-bold text-slate-700">{rotuloTipoProcesso(instancia.tipoProcesso)}</p>
              <p className="text-[10px] text-slate-400">
                {instancia.dataConclusao ? new Date(instancia.dataConclusao).toLocaleDateString('pt-BR') : '—'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {media !== undefined && (
                <span className="text-xs font-bold text-slate-600">{media.toFixed(1)}</span>
              )}
              {instancia.resultado?.parecerFinal && (
                <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${corDoParecer(instancia.resultado.parecerFinal)}`}>
                  {instancia.resultado.parecerFinal}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
