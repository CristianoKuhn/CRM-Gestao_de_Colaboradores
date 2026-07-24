/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useState } from 'react';
import {
  Users,
  CheckSquare,
  AlertTriangle,
  Calendar,
  ClipboardCheck,
  ListTodo,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import {
  Colaborador,
  TimelineRegistro,
  Tarefa,
  Usuario,
  OnboardingItem,
  OnboardingChecklist,
  AvaliacaoExperiencia,
  ConfiguracaoAlertas,
} from '../types';
import ModalFormularioAvaliacao from './ModalFormularioAvaliacao';
import PainelAnalyticsFormularios from '../features/formularios/components/PainelAnalyticsFormularios';
import { getAcoesLembreteAvaliacao, calcularStatusPrazoLembrete } from '../features/formularios/engine/acoesDisponiveis';

// ═══════════════════════════════════════════════════════════════════
// Dashboard — reconstruído (o arquivo estava sobrescrito com a
// documentação técnica do Motor de Formulários, sem nenhum import/export
// válido: o build inteiro estava quebrado e nenhum lembrete de Avaliação
// de Experiência/180° podia abrir, porque este era o componente que os
// disparava). A documentação viva do motor deve ficar em
// docs/motor-formularios.md, não em um .tsx — ver nota ao final do arquivo.
//
// Princípio "status é dado, ação é derivada" (ver acoesDisponiveis.ts):
// nenhuma condição de atraso decide aqui se o botão de avaliação aparece —
// ele sempre aparece; o atraso só muda o rótulo/cor.
// ═══════════════════════════════════════════════════════════════════

interface DashboardProps {
  colaboradores: Colaborador[];
  timeline: TimelineRegistro[];
  tarefas: Tarefa[];
  onNavigateToList: (tab: string, filters?: any) => void;
  onSelectColaborador: (id: string) => void;
  onOpenNewRegistroModal: (colaboradorId?: string) => void;
  currentUser: Usuario;
  onUpdateColaborador: (colaborador: Colaborador) => Promise<Colaborador> | void;
  onboardingItems: OnboardingItem[];
  onboardingChecklists: OnboardingChecklist[];
  onSaveOnboardingChecklist: (checklist: OnboardingChecklist) => void;
  avaliacoesExperiencia: AvaliacaoExperiencia[];
  onUpdateAvaliacaoExperiencia: (avaliacao: AvaliacaoExperiencia) => void;
  configuracaoAlertas: ConfiguracaoAlertas;
}

interface LembreteAvaliacao {
  colaborador: Colaborador;
  milestone: string; // '15' | '30' | '60' | '90' | '180'
  templateFamiliaId: string;
  label: string;
  dataLimite?: string;
  diasRestantes: number;
}

const HOJE = new Date();

function diffEmDias(data: Date): number {
  return Math.ceil((data.getTime() - HOJE.getTime()) / (1000 * 60 * 60 * 24));
}

export default function Dashboard({
  colaboradores,
  timeline,
  tarefas,
  onNavigateToList,
  onSelectColaborador,
  onOpenNewRegistroModal,
  currentUser,
  onUpdateColaborador,
  onboardingItems,
  onboardingChecklists,
  onSaveOnboardingChecklist,
  avaliacoesExperiencia,
  onUpdateAvaliacaoExperiencia,
  configuracaoAlertas,
}: DashboardProps) {
  const [avaliacaoAberta, setAvaliacaoAberta] = useState<LembreteAvaliacao | null>(null);

  const colaboradoresAtivos = colaboradores.filter((c) => c.situacao !== 'Desligado');
  const colAcompanhamento = colaboradores.filter((c) => c.situacao === 'Em Acompanhamento');
  const tarefasPendentes = tarefas.filter((t) => !t.concluida);
  const tarefasAtrasadas = tarefasPendentes.filter((t) => new Date(t.vencimento) < HOJE);

  // ── Lembretes de Avaliação de Experiência (15/30/60/90 dias) ────────────
  // Fonte de verdade: as entidades AvaliacaoExperiencia já pré-geradas na
  // criação do colaborador (ver App.handleAddColaborador). Mostra pendentes
  // dentro da janela configurada, e SEMPRE as atrasadas (nunca escondidas).
  const lembretesExperiencia: LembreteAvaliacao[] = avaliacoesExperiencia
    .filter((a) => a.status === 'pendente')
    .map((a): LembreteAvaliacao | null => {
      const colaborador = colaboradores.find((c) => c.id === a.colaboradorId);
      if (!colaborador || colaborador.situacao === 'Desligado') return null;
      const diasRestantes = diffEmDias(new Date(a.dataVencimento));
      if (diasRestantes > (configuracaoAlertas?.diasAntecedenciaAvaliacao180 ?? 30)) return null;
      return {
        colaborador,
        milestone: String(a.dias),
        templateFamiliaId: 'avaliacao-experiencia',
        label: `Avaliação de ${a.dias} dias`,
        dataLimite: a.dataVencimento,
        diasRestantes,
      };
    })
    .filter((l): l is LembreteAvaliacao => l !== null)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  // ── Lembretes de Avaliação 180° ──────────────────────────────────────────
  // Não existe entidade pré-gerada equivalente: a data-alvo é calculada a
  // partir de dataAdmissao + prazoAvaliacao180 (meses, padrão 6), mesmo
  // cálculo usado por gerarAlertasAutomaticos() no backend (Code.gs).
  const lembretes180: LembreteAvaliacao[] = colaboradoresAtivos
    .filter((c) => c.realizarExperiencia !== false)
    .map((c): LembreteAvaliacao | null => {
      if (!c.dataAdmissao) return null;
      if ((c.avaliacoesCompletas || []).includes('180')) return null;
      const dataAdmissao = new Date(c.dataAdmissao);
      if (isNaN(dataAdmissao.getTime())) return null;
      const prazoMeses = c.prazoAvaliacao180 ?? 6;
      const dataAlvo = new Date(dataAdmissao);
      dataAlvo.setMonth(dataAlvo.getMonth() + prazoMeses);
      const diasRestantes = diffEmDias(dataAlvo);
      if (diasRestantes > (configuracaoAlertas?.diasAntecedenciaAvaliacao180 ?? 30)) return null;
      return {
        colaborador: c,
        milestone: '180',
        templateFamiliaId: 'avaliacao-180',
        label: 'Avaliação 180°',
        dataLimite: dataAlvo.toISOString(),
        diasRestantes,
      };
    })
    .filter((l): l is LembreteAvaliacao => l !== null)
    .sort((a, b) => a.diasRestantes - b.diasRestantes);

  const todosOsLembretes = [...lembretes180, ...lembretesExperiencia].sort(
    (a, b) => a.diasRestantes - b.diasRestantes
  );

  // ── Onboarding pendente ───────────────────────────────────────────────
  const onboardingPendentes = colaboradoresAtivos
    .map((c) => {
      const itensDoSetor = onboardingItems.filter((i) => i.setorIds.includes(c.setorId));
      if (itensDoSetor.length === 0) return null;
      const checklist = onboardingChecklists.find((ck) => ck.colaboradorId === c.id);
      const concluidos = checklist?.itemsConcluidos?.length || 0;
      if (concluidos >= itensDoSetor.length) return null;
      return { colaborador: c, total: itensDoSetor.length, concluidos };
    })
    .filter((o): o is { colaborador: Colaborador; total: number; concluidos: number } => o !== null);

  const abrirAvaliacao = (lembrete: LembreteAvaliacao) => setAvaliacaoAberta(lembrete);

  const handleConcluida = async (colaboradorAtualizado: Colaborador) => {
    await onUpdateColaborador(colaboradorAtualizado);
    if (avaliacaoAberta && avaliacaoAberta.milestone !== '180') {
      const registro = avaliacoesExperiencia.find(
        (a) => a.colaboradorId === avaliacaoAberta.colaborador.id && String(a.dias) === avaliacaoAberta.milestone
      );
      if (registro) {
        onUpdateAvaliacaoExperiencia({
          ...registro,
          status: 'aprovado',
          dataRealizacao: new Date().toISOString(),
        });
      }
    }
    setAvaliacaoAberta(null);
  };

  return (
    <div className="p-6 md:p-8 flex flex-col gap-6">
      {/* Cabeçalho */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-slate-900">Olá, {currentUser?.nome?.split(' ')[0]} 👋</h1>
          <p className="text-sm text-slate-500">Aqui está o panorama da sua equipe hoje.</p>
        </div>
        <button
          onClick={() => onOpenNewRegistroModal()}
          className="flex items-center gap-2 bg-slate-900 text-white text-xs font-bold px-4 py-2.5 rounded-xl hover:bg-slate-800 transition"
        >
          <Sparkles size={14} /> Novo Feedback
        </button>
      </div>

      {/* Cards de estatísticas */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => onNavigateToList('colaboradores')}
          className="bg-white border border-slate-100 rounded-2xl p-4 text-left hover:shadow-md transition"
        >
          <Users size={18} className="text-teal-500 mb-2" />
          <p className="text-2xl font-extrabold text-slate-900">{colaboradoresAtivos.length}</p>
          <p className="text-xs text-slate-400 font-semibold">Colaboradores ativos</p>
        </button>
        <button
          onClick={() => onNavigateToList('tarefas')}
          className="bg-white border border-slate-100 rounded-2xl p-4 text-left hover:shadow-md transition"
        >
          <CheckSquare size={18} className="text-indigo-500 mb-2" />
          <p className="text-2xl font-extrabold text-slate-900">{tarefasPendentes.length}</p>
          <p className="text-xs text-slate-400 font-semibold">
            Tarefas pendentes {tarefasAtrasadas.length > 0 && `(${tarefasAtrasadas.length} atrasadas)`}
          </p>
        </button>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <AlertTriangle size={18} className="text-amber-500 mb-2" />
          <p className="text-2xl font-extrabold text-slate-900">{colAcompanhamento.length}</p>
          <p className="text-xs text-slate-400 font-semibold">Em acompanhamento</p>
        </div>
        <div className="bg-white border border-slate-100 rounded-2xl p-4">
          <ClipboardCheck size={18} className="text-rose-500 mb-2" />
          <p className="text-2xl font-extrabold text-slate-900">{todosOsLembretes.length}</p>
          <p className="text-xs text-slate-400 font-semibold">Avaliações pendentes</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Lembretes de Avaliação (Experiência + 180°) */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <Calendar size={18} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800">Avaliações a realizar</h2>
          </div>
          {todosOsLembretes.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma avaliação pendente no momento. 🎉</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
              {todosOsLembretes.map((lembrete) => {
                const statusPrazo = calcularStatusPrazoLembrete(lembrete.diasRestantes);
                const acoes = getAcoesLembreteAvaliacao(lembrete.milestone);
                return (
                  <div
                    key={`${lembrete.colaborador.id}-${lembrete.milestone}`}
                    className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <button
                        onClick={() => onSelectColaborador(lembrete.colaborador.id)}
                        className="text-xs font-bold text-slate-700 hover:text-teal-600 truncate block"
                      >
                        {lembrete.colaborador.nome}
                      </button>
                      <p
                        className={`text-[10px] font-semibold ${
                          statusPrazo === 'atrasado' ? 'text-rose-500' : 'text-slate-400'
                        }`}
                      >
                        {lembrete.label} ·{' '}
                        {statusPrazo === 'atrasado'
                          ? `Atrasada há ${Math.abs(lembrete.diasRestantes)} dia(s)`
                          : `Vence em ${lembrete.diasRestantes} dia(s)`}
                      </p>
                    </div>
                    <button
                      onClick={() => abrirAvaliacao(lembrete)}
                      className="shrink-0 text-[11px] font-bold px-3 py-1.5 rounded-full bg-teal-50 text-teal-700 hover:bg-teal-100 transition whitespace-nowrap"
                    >
                      {acoes[0]?.label || 'Realizar'}
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Tarefas pendentes */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <ListTodo size={18} className="text-slate-500" />
              <h2 className="text-sm font-bold text-slate-800">Tarefas de Liderança</h2>
            </div>
            <button
              onClick={() => onNavigateToList('tarefas')}
              className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1"
            >
              Ver todas <ArrowRight size={12} />
            </button>
          </div>
          {tarefasPendentes.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhuma tarefa pendente. 🎉</p>
          ) : (
            <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
              {tarefasPendentes.slice(0, 8).map((task) => {
                const col = colaboradores.find((c) => c.id === task.colaboradorId);
                const atrasada = new Date(task.vencimento) < HOJE;
                return (
                  <div key={task.id} className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-slate-700 truncate">{task.titulo}</p>
                      <p className="text-[10px] text-slate-400">{col?.nome || 'Geral'}</p>
                    </div>
                    <span
                      className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${
                        atrasada ? 'bg-rose-50 text-rose-600' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      {new Date(task.vencimento).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Colaboradores em acompanhamento */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle size={18} className="text-amber-500" />
            <h2 className="text-sm font-bold text-slate-800">Em acompanhamento</h2>
          </div>
          {colAcompanhamento.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhum colaborador em acompanhamento.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {colAcompanhamento.map((c) => (
                <button
                  key={c.id}
                  onClick={() => onSelectColaborador(c.id)}
                  className="flex items-center justify-between bg-amber-50/50 rounded-xl px-3 py-2.5 text-left hover:bg-amber-50 transition"
                >
                  <span className="text-xs font-bold text-slate-700">{c.nome}</span>
                  <ArrowRight size={12} className="text-amber-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Onboarding pendente */}
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
          <div className="flex items-center gap-2 mb-4">
            <ClipboardCheck size={18} className="text-slate-500" />
            <h2 className="text-sm font-bold text-slate-800">Onboarding em andamento</h2>
          </div>
          {onboardingPendentes.length === 0 ? (
            <p className="text-xs text-slate-400">Nenhum onboarding em aberto.</p>
          ) : (
            <div className="flex flex-col gap-2">
              {onboardingPendentes.map(({ colaborador, total, concluidos }) => (
                <button
                  key={colaborador.id}
                  onClick={() => onSelectColaborador(colaborador.id)}
                  className="flex items-center justify-between bg-slate-50 rounded-xl px-3 py-2.5 text-left hover:bg-slate-100 transition"
                >
                  <span className="text-xs font-bold text-slate-700">{colaborador.nome}</span>
                  <span className="text-[10px] font-bold text-slate-500">
                    {concluidos}/{total} itens
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Analytics do Motor de Formulários (evolução/comparativos agregados) */}
      <PainelAnalyticsFormularios />

      {avaliacaoAberta && (
        <ModalFormularioAvaliacao
          isOpen={!!avaliacaoAberta}
          colaborador={avaliacaoAberta.colaborador}
          templateFamiliaId={avaliacaoAberta.templateFamiliaId}
          milestone={avaliacaoAberta.milestone}
          dataLimite={avaliacaoAberta.dataLimite}
          responsavelId={currentUser.id}
          onClose={() => setAvaliacaoAberta(null)}
          onConcluida={handleConcluida}
        />
      )}
    </div>
  );
}

// NOTA: a documentação técnica completa do Motor de Formulários (antes
// indevidamente salva por cima deste componente) deve viver em
// docs/motor-formularios.md, não em um arquivo .tsx — recriar o doc lá se
// for necessário; um componente React precisa de código, não de prosa.
