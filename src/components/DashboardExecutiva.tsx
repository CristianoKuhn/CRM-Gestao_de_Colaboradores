/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect, useCallback } from 'react';
import {
  Colaborador,
  TimelineRegistro,
  Tarefa,
  Usuario,
  AvaliacaoExperiencia,
  ConfiguracaoAlertas,
  Reconhecimento,
  AlertaInteligente,
  Setor,
  Programa,
  IndicadorDesenvolvimento,
  Ferias,
} from '../types';
import { DataService } from '../services/DataService';
import { calcularLembretes180, calcularLembretesExperiencia } from '../utils/lembretesAvaliacao';
import Dashboard from './Dashboard';
import Analytics from './Analytics';
import {
  LayoutDashboard,
  Users2,
  GraduationCap,
  Target,
  Heart,
  AlertTriangle,
  BarChart3,
  Gauge,
  ClipboardCheck,
  UserX,
  Plane,
  ArrowRight,
  ChevronDown,
} from 'lucide-react';

interface DashboardExecutivaProps {
  colaboradores: Colaborador[];
  timeline: TimelineRegistro[];
  tarefas: Tarefa[];
  reconhecimentos: Reconhecimento[];
  alertas: AlertaInteligente[];
  setores: Setor[];
  onNavigateToList: (tab: string, filters?: any) => void;
  onSelectColaborador: (id: string) => void;
  onOpenNewRegistroModal: (colaboradorId?: string) => void;
  currentUser: Usuario;
  onUpdateColaborador: (colaborador: Colaborador) => Promise<Colaborador> | void;
  avaliacoesExperiencia: AvaliacaoExperiencia[];
  onUpdateAvaliacaoExperiencia: (avaliacao: AvaliacaoExperiencia) => void;
  configuracaoAlertas: ConfiguracaoAlertas;
}

type AbaExecutiva = 'visao-geral' | 'operacional' | 'analytics';

function mesesEntre(dataInicio: Date, dataFim: Date): number {
  return (
    (dataFim.getFullYear() - dataInicio.getFullYear()) * 12 + (dataFim.getMonth() - dataInicio.getMonth())
  );
}

// Sprint 4 da Reestruturação ERP — Dashboard Estratégica. Substitui a
// fragmentação entre Dashboard.tsx/Analytics.tsx/Indicadores por um único
// ponto de entrada, com as 5 seções pedidas (Pessoas, Desenvolvimento,
// Competências, Liderança, Alertas). Todo número aqui vem de dado já
// existente ou do cache de Indicadores já calculado — nada é recalculado do
// zero na tela. Dashboard e Analytics não foram removidos: viram abas
// internas, até confirmar que nada de uso real depende só delas.
export default function DashboardExecutiva(props: DashboardExecutivaProps) {
  const { colaboradores, timeline, tarefas, reconhecimentos, alertas, setores, currentUser } = props;

  const [aba, setAba] = useState<AbaExecutiva>('visao-geral');
  const [carregando, setCarregando] = useState(true);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [indicadores, setIndicadores] = useState<IndicadorDesenvolvimento[]>([]);
  const [colaboradoresComGapCritico, setColaboradoresComGapCritico] = useState(0);
  const [ferias, setFerias] = useState<Ferias[]>([]);
  const [mostrarTodosSemInteracao, setMostrarTodosSemInteracao] = useState(false);

  const carregarDadosDesenvolvimento = useCallback(async () => {
    setCarregando(true);
    try {
      const [listaProgramas, listaIndicadores, listaInsights] = await Promise.all([
        DataService.getProgramas(),
        DataService.getIndicadoresDesenvolvimento(),
        DataService.getInsights({ entidadeTipo: 'colaborador', status: 'pendente' }),
      ]);
      setProgramas(listaProgramas);
      setIndicadores(listaIndicadores);
      // Um colaborador pode ter mais de um Insight pendente — conta pessoas
      // distintas, não insights.
      setColaboradoresComGapCritico(new Set(listaInsights.map((i) => i.entidadeId)).size);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregarDadosDesenvolvimento();
  }, [carregarDadosDesenvolvimento]);

  // Férias ainda não é levantada em App.tsx (só GestaoPessoas/PlanejadorFerias
  // buscam a própria cópia hoje) — segue o mesmo padrão aqui, buscando
  // diretamente, em vez de encadear uma mudança maior no App.tsx só por isso.
  useEffect(() => {
    DataService.getFerias().then(setFerias);
  }, []);

  const valorIndicador = (tipo: string, escopoTipo: string, escopoId = ''): number | null => {
    const item = indicadores.find((i) => i.tipoIndicador === tipo && i.escopoTipo === escopoTipo && (i.escopoId || '') === escopoId);
    return item ? item.valor : null;
  };

  // ── Pessoas ─────────────────────────────────────────────────────────
  const hoje = new Date();
  const colaboradoresAtivos = colaboradores.filter((c) => c.situacao !== 'Desligado');
  const desligados = colaboradores.filter((c) => c.situacao === 'Desligado');
  const admitidosUltimos30Dias = colaboradores.filter((c) => {
    const admissao = new Date(c.dataAdmissao);
    if (isNaN(admissao.getTime())) return false;
    const dias = Math.round((hoje.getTime() - admissao.getTime()) / (1000 * 60 * 60 * 24));
    return dias >= 0 && dias <= 30;
  }).length;
  const temposDeCasaMeses = colaboradoresAtivos
    .map((c) => {
      const admissao = new Date(c.dataAdmissao);
      return isNaN(admissao.getTime()) ? null : mesesEntre(admissao, hoje);
    })
    .filter((m): m is number => m !== null);
  const tempoMedioDeCasaMeses =
    temposDeCasaMeses.length > 0 ? Math.round(temposDeCasaMeses.reduce((a, b) => a + b, 0) / temposDeCasaMeses.length) : 0;

  // ── Desenvolvimento ───────────────────────────────────────────────────
  const programasAtivos = valorIndicador('programas_ativos', 'empresa') ?? programas.filter((p) => p.ativo).length;
  const taxaAtrasoGeral = valorIndicador('taxa_atraso_geral', 'empresa') ?? 0;

  // ── Competências ────────────────────────────────────────────────────
  const gapsPorSetor = indicadores.filter((i) => i.tipoIndicador === 'gap_medio_setor' && i.escopoTipo === 'setor');
  const gapMedioEmpresa =
    gapsPorSetor.length > 0 ? Math.round(gapsPorSetor.reduce((soma, i) => soma + i.valor, 0) / gapsPorSetor.length) : 0;

  // ── Liderança ───────────────────────────────────────────────────────
  const feedbacksPendentes = timeline.filter(
    (r) => (r.tipo === 'Feedback Corretivo' || r.tipo === 'Feedback Positivo') && r.status === 'Pendente'
  ).length;
  const objetivosAbertos = valorIndicador('objetivos_abertos', 'empresa') ?? 0;
  const reconhecimentosUltimos30Dias = reconhecimentos.filter((r) => {
    const data = new Date(r.dataConcessao);
    if (isNaN(data.getTime())) return false;
    const dias = Math.round((hoje.getTime() - data.getTime()) / (1000 * 60 * 60 * 24));
    return dias >= 0 && dias <= 30;
  }).length;

  // ── Alertas ─────────────────────────────────────────────────────────
  const alertasPendentes = alertas.filter((a) => a.status === 'pendente');
  const alertasPorTipo = alertasPendentes.reduce<Record<string, number>>((mapa, a) => {
    mapa[a.tipo] = (mapa[a.tipo] || 0) + 1;
    return mapa;
  }, {});
  const topAlertas = Object.entries(alertasPorTipo)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 4);

  // ── Radar de negligência: sem interação há mais de 3 meses ────────────
  // Independente do alerta "sem_interacao" (esse é de curto prazo, ~14 dias,
  // e serve para outro fim). Aqui é uma checagem de longo prazo, direto da
  // timeline: quem nunca teve registro nenhum entra com prioridade máxima.
  const hojeZerado = new Date();
  hojeZerado.setHours(0, 0, 0, 0);
  const colaboradoresSemInteracao = colaboradoresAtivos
    .map((c) => {
      const datasValidas = timeline
        .filter((r) => r.colaboradorId === c.id)
        .map((r) => new Date(r.data))
        .filter((d) => !isNaN(d.getTime()));
      const ultimaData = datasValidas.length > 0 ? new Date(Math.max(...datasValidas.map((d) => d.getTime()))) : null;
      const diasSemContato = ultimaData
        ? Math.round((hojeZerado.getTime() - ultimaData.getTime()) / (1000 * 60 * 60 * 24))
        : Infinity;
      return { colaborador: c, diasSemContato };
    })
    .filter((item) => item.diasSemContato > 90)
    .sort((a, b) => b.diasSemContato - a.diasSemContato);

  // ── Avaliações urgentes (180° em até 7 dias ou já atrasada + Experiência
  // dentro da janela configurada) — versão enxuta da lista completa que
  // continua disponível na aba "Dashboard Operacional".
  const avaliacoesUrgentes = [
    ...calcularLembretes180(colaboradores, props.configuracaoAlertas, hoje).filter((l) => l.diasRestantes <= 7),
    ...calcularLembretesExperiencia(colaboradores, props.avaliacoesExperiencia, props.configuracaoAlertas, hoje),
  ].sort((a, b) => a.diasRestantes - b.diasRestantes);

  // ── Férias em gozo ou começando nos próximos 30 dias ──────────────────
  const feriasProximas = ferias
    .filter((f) => f.status === 'planejada' || f.status === 'em_gozo')
    .map((f) => ({ ferias: f, inicio: new Date(f.dataInicio), fim: new Date(f.dataFim), colaborador: colaboradores.find((c) => c.id === f.colaboradorId) }))
    .filter((item): item is typeof item & { colaborador: Colaborador } => !!item.colaborador && !isNaN(item.inicio.getTime()) && item.fim >= hojeZerado)
    .filter((item) => Math.round((item.inicio.getTime() - hojeZerado.getTime()) / (1000 * 60 * 60 * 24)) <= 30)
    .sort((a, b) => a.inicio.getTime() - b.inicio.getTime());

  const abas: { id: AbaExecutiva; label: string; icon: React.ElementType }[] = [
    { id: 'visao-geral', label: 'Visão Geral', icon: LayoutDashboard },
    { id: 'operacional', label: 'Dashboard Operacional', icon: Gauge },
    { id: 'analytics', label: 'Analytics', icon: BarChart3 },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-11 h-11 rounded-2xl bg-slate-900 flex items-center justify-center text-teal-400">
          <LayoutDashboard size={22} />
        </div>
        <div>
          <h2 className="font-bold text-xl text-slate-900">Dashboard Executiva</h2>
          <p className="text-sm text-slate-400">
            Pessoas, Desenvolvimento, Competências, Liderança e Alertas — tudo em um só lugar, direto dos motores.
          </p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 border-b border-slate-100 pb-3">
        {abas.map((item) => {
          const Icone = item.icon;
          const ativa = aba === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setAba(item.id)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-sm font-semibold transition-colors ${
                ativa ? 'bg-slate-900 text-teal-400 shadow-sm' : 'text-slate-500 hover:bg-slate-100'
              }`}
            >
              <Icone size={15} />
              {item.label}
            </button>
          );
        })}
      </div>

      {aba === 'visao-geral' && (
        <div className="space-y-6">
          {carregando ? (
            <div className="text-sm text-slate-400 py-10 text-center">Carregando indicadores...</div>
          ) : (
            <div className="grid md:grid-cols-2 xl:grid-cols-5 gap-4">
              {/* Pessoas */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Users2 size={16} className="text-teal-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Pessoas</h3>
                </div>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><dt className="text-slate-400">Ativos</dt><dd className="font-bold text-slate-700">{colaboradoresAtivos.length}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Admitidos (30d)</dt><dd className="font-bold text-slate-700">{admitidosUltimos30Dias}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Desligados</dt><dd className="font-bold text-slate-700">{desligados.length}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Tempo médio de casa</dt><dd className="font-bold text-slate-700">{tempoMedioDeCasaMeses}m</dd></div>
                </dl>
              </div>

              {/* Desenvolvimento */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <GraduationCap size={16} className="text-teal-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Desenvolvimento</h3>
                </div>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><dt className="text-slate-400">Programas ativos</dt><dd className="font-bold text-slate-700">{programasAtivos}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Etapas atrasadas</dt><dd className="font-bold text-slate-700">{taxaAtrasoGeral}%</dd></div>
                </dl>
              </div>

              {/* Competências */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Target size={16} className="text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Competências</h3>
                </div>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><dt className="text-slate-400">Gap médio da empresa</dt><dd className="font-bold text-slate-700">{gapMedioEmpresa}%</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Colaboradores com gap crítico</dt><dd className="font-bold text-amber-600">{colaboradoresComGapCritico}</dd></div>
                </dl>
              </div>

              {/* Liderança */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Heart size={16} className="text-rose-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Liderança</h3>
                </div>
                <dl className="space-y-1.5 text-xs">
                  <div className="flex justify-between"><dt className="text-slate-400">Feedbacks pendentes</dt><dd className="font-bold text-slate-700">{feedbacksPendentes}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Objetivos/PDIs abertos</dt><dd className="font-bold text-slate-700">{objetivosAbertos}</dd></div>
                  <div className="flex justify-between"><dt className="text-slate-400">Reconhecimentos (30d)</dt><dd className="font-bold text-slate-700">{reconhecimentosUltimos30Dias}</dd></div>
                </dl>
              </div>

              {/* Alertas */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <AlertTriangle size={16} className="text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Alertas</h3>
                </div>
                {topAlertas.length === 0 ? (
                  <p className="text-xs text-slate-400">Nenhum alerta pendente.</p>
                ) : (
                  <dl className="space-y-1.5 text-xs">
                    {topAlertas.map(([tipo, total]) => (
                      <div key={tipo} className="flex justify-between gap-2">
                        <dt className="text-slate-400 truncate">{tipo.replace(/_/g, ' ')}</dt>
                        <dd className="font-bold text-slate-700 shrink-0">{total}</dd>
                      </div>
                    ))}
                  </dl>
                )}
                <p className="text-[10px] text-slate-400 mt-2 pt-2 border-t border-slate-50">
                  {alertasPendentes.length} pendente(s) no total
                </p>
              </div>
            </div>
          )}

          {/* Painéis de ação — quem precisa de atenção AGORA, não só um número */}
          {!carregando && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              {/* Avaliações urgentes */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <ClipboardCheck size={16} className="text-rose-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Avaliações a organizar</h3>
                </div>
                {avaliacoesUrgentes.length === 0 ? (
                  <p className="text-xs text-slate-400">Nada urgente — em dia. 🎉</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {avaliacoesUrgentes.slice(0, 6).map((l) => (
                      <button
                        key={`${l.colaborador.id}-${l.milestone}`}
                        onClick={() => props.onSelectColaborador(l.colaborador.id)}
                        className="flex items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2 text-left transition cursor-pointer"
                      >
                        <span className="min-w-0">
                          <span className="text-xs font-bold text-slate-700 truncate block">{l.colaborador.nome}</span>
                          <span className="text-[10px] text-slate-400">{l.label}</span>
                        </span>
                        <span
                          className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${
                            l.diasRestantes < 0 ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'
                          }`}
                        >
                          {l.diasRestantes < 0 ? `Atrasada ${Math.abs(l.diasRestantes)}d` : l.diasRestantes === 0 ? 'Hoje' : `${l.diasRestantes}d`}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
                {avaliacoesUrgentes.length > 0 && (
                  <button
                    onClick={() => setAba('operacional')}
                    className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 mt-3 pt-2 border-t border-slate-50"
                  >
                    Ver lista completa <ArrowRight size={11} />
                  </button>
                )}
              </div>

              {/* Sem interação há 3+ meses */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <UserX size={16} className="text-amber-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Sem interação há 3+ meses</h3>
                </div>
                {colaboradoresSemInteracao.length === 0 ? (
                  <p className="text-xs text-slate-400">Todo mundo com contato recente. 🎉</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {(mostrarTodosSemInteracao ? colaboradoresSemInteracao : colaboradoresSemInteracao.slice(0, 3)).map(
                      (item) => (
                        <button
                          key={item.colaborador.id}
                          onClick={() => props.onSelectColaborador(item.colaborador.id)}
                          className="flex items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2 text-left transition cursor-pointer"
                        >
                          <span className="text-xs font-bold text-slate-700 truncate">{item.colaborador.nome}</span>
                          <span className="shrink-0 text-[10px] font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-600">
                            {item.diasSemContato === Infinity ? 'Nunca' : `${item.diasSemContato}d`}
                          </span>
                        </button>
                      )
                    )}
                  </div>
                )}
                {colaboradoresSemInteracao.length > 3 && (
                  <button
                    onClick={() => setMostrarTodosSemInteracao((v) => !v)}
                    className="text-[11px] font-bold text-teal-600 hover:text-teal-700 flex items-center gap-1 mt-3 pt-2 border-t border-slate-50"
                  >
                    {mostrarTodosSemInteracao ? 'Ver só os 3 primeiros' : `Ver todos (${colaboradoresSemInteracao.length})`}
                    <ChevronDown size={12} className={mostrarTodosSemInteracao ? 'rotate-180 transition' : 'transition'} />
                  </button>
                )}
              </div>

              {/* Férias */}
              <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center gap-2 mb-3">
                  <Plane size={16} className="text-indigo-500" />
                  <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wide">Férias</h3>
                </div>
                {feriasProximas.length === 0 ? (
                  <p className="text-xs text-slate-400">Ninguém de férias nos próximos 30 dias.</p>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {feriasProximas.slice(0, 6).map((item) => {
                      const emGozo = item.ferias.status === 'em_gozo' || item.inicio <= hojeZerado;
                      return (
                        <button
                          key={item.ferias.id}
                          onClick={() => props.onSelectColaborador(item.colaborador.id)}
                          className="flex items-center justify-between gap-2 bg-slate-50 hover:bg-slate-100 rounded-xl px-3 py-2 text-left transition cursor-pointer"
                        >
                          <span className="min-w-0">
                            <span className="text-xs font-bold text-slate-700 truncate block">{item.colaborador.nome}</span>
                            <span className="text-[10px] text-slate-400">
                              {item.inicio.toLocaleDateString('pt-BR')} – {item.fim.toLocaleDateString('pt-BR')}
                            </span>
                          </span>
                          <span
                            className={`shrink-0 text-[10px] font-bold px-2 py-1 rounded-full ${
                              emGozo ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {emGozo ? 'Em gozo' : 'Planejada'}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {aba === 'operacional' && (
        <Dashboard
          colaboradores={colaboradores}
          timeline={timeline}
          tarefas={tarefas}
          onNavigateToList={props.onNavigateToList}
          onSelectColaborador={props.onSelectColaborador}
          onOpenNewRegistroModal={props.onOpenNewRegistroModal}
          currentUser={currentUser}
          onUpdateColaborador={props.onUpdateColaborador}
          avaliacoesExperiencia={props.avaliacoesExperiencia}
          onUpdateAvaliacaoExperiencia={props.onUpdateAvaliacaoExperiencia}
          configuracaoAlertas={props.configuracaoAlertas}
        />
      )}

      {aba === 'analytics' && (
        <Analytics colaboradores={colaboradores} timeline={timeline} setores={setores} tarefas={tarefas} />
      )}
    </div>
  );
}
