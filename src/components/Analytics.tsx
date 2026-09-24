/**
 * Analytics.tsx — Painel de Analytics com Drill-down Interativo
 *
 * Funcionalidades adicionadas:
 *  - Drill-down do Mix de Registros: clicar em qualquer fatia do donut
 *    expande uma lista detalhada com líder, colaborador e "Ver descrição"
 *  - Modal de descrição: abre o registro completo sem sair da tela
 *  - Painel de Padrões: destaca colaboradores com recorrência (≥2) no tipo selecionado
 *  - Badge de recorrência: colaborador recorrente fica destacado em âmbar
 *  - Evoluçao mensal calculada dos dados reais (não mais mock)
 */

import { useState, useMemo } from 'react';
import { Colaborador, TimelineRegistro, Setor, Tarefa, Lider } from '../types';
import FiltroMensal, {
  FiltroMensalValor,
  filtroMensalPadrao,
  dataDentroDoFiltroMensal,
} from './FiltroMensal';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, PieChart, Pie, Cell, AreaChart, Area,
} from 'recharts';
import {
  Award, AlertTriangle, TrendingUp, MessageSquare, Calendar,
  CheckCircle, BarChart2, PieChartIcon, X, ChevronDown, ChevronUp,
  Eye, AlertCircle, Users,
} from 'lucide-react';

interface AnalyticsProps {
  colaboradores: Colaborador[];
  timeline: TimelineRegistro[];
  setores: Setor[];
  tarefas: Tarefa[];
  lideres?: Lider[];
}

// Modal de descrição do registro
interface ModalDescricaoProps {
  registro: TimelineRegistro;
  colaboradorNome: string;
  liderNome: string;
  onFechar: () => void;
}

function ModalDescricao({ registro, colaboradorNome, liderNome, onFechar }: ModalDescricaoProps) {
  return (
    <div
      className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={onFechar}
    >
      <div
        className="bg-white rounded-3xl shadow-2xl w-full max-w-lg max-h-[85vh] overflow-y-auto"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-slate-100">
          <div className="flex-1 pr-4">
            <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full uppercase tracking-wider">
              {registro.tipo}
            </span>
            <h2 className="text-base font-bold text-slate-900 mt-2">{registro.titulo}</h2>
            <p className="text-xs text-slate-400 mt-1">
              {new Date(registro.data).toLocaleDateString('pt-BR', {
                day: '2-digit', month: 'long', year: 'numeric',
              })}
            </p>
          </div>
          <button
            onClick={onFechar}
            className="p-2 hover:bg-slate-100 rounded-xl transition shrink-0"
          >
            <X size={18} className="text-slate-400" />
          </button>
        </div>

        {/* Partes */}
        <div className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Colaborador</p>
              <p className="text-sm font-semibold text-slate-800">{colaboradorNome}</p>
            </div>
            <div className="bg-slate-50 rounded-2xl p-3">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Líder Responsável</p>
              <p className="text-sm font-semibold text-slate-800">{liderNome}</p>
            </div>
          </div>

          {/* Descrição */}
          <div>
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">Descrição</p>
            <div className="bg-slate-50 rounded-2xl p-4 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
              {registro.descricao || <span className="text-slate-400 italic">Sem descrição registrada.</span>}
            </div>
          </div>

          {/* Status */}
          {registro.status && (
            <div className="flex items-center gap-2">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status:</p>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                registro.status === 'Concluído'
                  ? 'bg-emerald-50 text-emerald-700'
                  : registro.status === 'Pendente'
                  ? 'bg-amber-50 text-amber-700'
                  : 'bg-slate-100 text-slate-600'
              }`}>
                {registro.status}
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Cores do donut
const CORES_TIPO: Record<string, string> = {
  'Feedback Positivo':                    '#0d9488',
  'Feedback Corretivo':                   '#f97316',
  'Observação Geral':                     '#6366f1',
  'Conversa Individual 1:1':              '#f59e0b',
  'Advertência':                          '#f43f5e',
  'Suspensão':                            '#be123c',
  'Plano de Desenvolvimento Individual (PDI)': '#8b5cf6',
  'Reconhecimento':                       '#0ea5e9',
  'Elogio de Cliente':                    '#10b981',
  'Mudança de Cargo':                     '#64748b',
  'Acompanhamento':                       '#a855f7',
};
const COR_FALLBACK = '#94a3b8';

function corParaTipo(tipo: string, index: number): string {
  if (CORES_TIPO[tipo]) return CORES_TIPO[tipo];
  const paleta = ['#0d9488','#6366f1','#f59e0b','#f43f5e','#0ea5e9','#8b5cf6','#10b981','#f97316'];
  return paleta[index % paleta.length] ?? COR_FALLBACK;
}

export default function Analytics({
  colaboradores,
  timeline,
  setores,
  tarefas,
  lideres = [],
}: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'setores' | 'rankings'>('geral');
  const [filtroMes, setFiltroMes] = useState<FiltroMensalValor>(filtroMensalPadrao());

  // Estado do drill-down
  const [tipoSelecionado, setTipoSelecionado] = useState<string | null>(null);
  const [drillAberto, setDrillAberto] = useState(false);

  // Modal de descrição
  const [registroModal, setRegistroModal] = useState<TimelineRegistro | null>(null);

  const timelineFiltrada = timeline.filter(r => dataDentroDoFiltroMensal(r.data, filtroMes));
  const tarefasFiltradas = tarefas.filter(t => dataDentroDoFiltroMensal(t.vencimento, filtroMes));

  const FEEDBACK_COLORS = { positivo: '#0d9488', corretivo: '#f97316' };

  // --- KPIs ---
  const totalFeedbacks = timelineFiltrada.filter(r => r.tipo.includes('Feedback')).length;
  const pdiRegistros = timelineFiltrada.filter(r => r.tipo === 'Plano de Desenvolvimento Individual (PDI)');
  const pdiConcluidos = pdiRegistros.filter(r => r.status === 'Concluído').length;
  const pdisConcluidosTaxa = pdiRegistros.length > 0 ? Math.round((pdiConcluidos / pdiRegistros.length) * 100) : 100;
  const tarefasConcluidas = tarefasFiltradas.filter(t => t.concluida).length;
  const taxaConclusaoTarefas = tarefasFiltradas.length > 0 ? Math.round((tarefasConcluidas / tarefasFiltradas.length) * 100) : 100;
  const totalDestaques = timelineFiltrada.filter(r => r.tipo === 'Reconhecimento' || r.tipo === 'Elogio de Cliente').length;

  // --- Comparativo por setor ---
  const dadosSetores = setores.map(setor => {
    const colIds = colaboradores.filter(c => c.setorId === setor.id).map(c => c.id);
    const feedbacksSetor = timelineFiltrada.filter(r => colIds.includes(r.colaboradorId));
    return {
      name: setor.nome,
      'Feedback Positivo': feedbacksSetor.filter(r => r.tipo === 'Feedback Positivo').length,
      'Feedback Corretivo': feedbacksSetor.filter(r => r.tipo === 'Feedback Corretivo').length,
      PDIs: feedbacksSetor.filter(r => r.tipo === 'Plano de Desenvolvimento Individual (PDI)').length,
      total: feedbacksSetor.length,
    };
  }).filter(d => d.total > 0 || d.PDIs > 0);

  // --- Mix de Registros (donut) ---
  const tiposContagem = timelineFiltrada.reduce((acc: Record<string, number>, cur) => {
    acc[cur.tipo] = (acc[cur.tipo] || 0) + 1;
    return acc;
  }, {});
  const dadosDistribuicao = Object.entries(tiposContagem)
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  // --- Evolução Mensal REAL (últimos 12 meses dos dados) ---
  const dadosEvolucaoMensal = useMemo(() => {
    const agora = new Date();
    const meses: { mes: string; Feedbacks: number; PDIs: number }[] = [];
    for (let i = 11; i >= 0; i--) {
      const ref = new Date(agora.getFullYear(), agora.getMonth() - i, 1);
      const ano = ref.getFullYear();
      const mes = ref.getMonth();
      const label = `${ref.toLocaleString('pt-BR', { month: 'short' })}/${String(ano).slice(2)}`;
      const regsDoMes = timeline.filter(r => {
        const d = new Date(r.data);
        return d.getFullYear() === ano && d.getMonth() === mes;
      });
      meses.push({
        mes: label.replace('.', ''),
        Feedbacks: regsDoMes.filter(r => r.tipo.includes('Feedback')).length,
        PDIs: regsDoMes.filter(r => r.tipo === 'Plano de Desenvolvimento Individual (PDI)').length,
      });
    }
    return meses;
  }, [timeline]);

  // --- Rankings ---
  const colaboradoresAtivos = colaboradores.filter(c => c.situacao !== 'Desligado');

  const rankingReconhecimento = colaboradoresAtivos
    .map(col => ({
      ...col,
      count: timelineFiltrada.filter(r =>
        r.colaboradorId === col.id && (r.tipo === 'Reconhecimento' || r.tipo === 'Elogio de Cliente')
      ).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  const rankingAdvertencias = colaboradoresAtivos
    .map(col => ({
      ...col,
      count: timelineFiltrada.filter(r =>
        r.colaboradorId === col.id && (r.tipo === 'Advertência' || r.tipo === 'Suspensão')
      ).length,
    }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5);

  // --- DRILL-DOWN: registros do tipo selecionado ---
  const registrosDrillDown = useMemo(() => {
    if (!tipoSelecionado) return [];
    return timelineFiltrada.filter(r => r.tipo === tipoSelecionado);
  }, [tipoSelecionado, timelineFiltrada]);

  // Contagem de ocorrências por colaborador no tipo selecionado
  const recorrenciaPorColaborador = useMemo(() => {
    const contagem: Record<string, number> = {};
    registrosDrillDown.forEach(r => {
      contagem[r.colaboradorId] = (contagem[r.colaboradorId] || 0) + 1;
    });
    return contagem;
  }, [registrosDrillDown]);

  // Colaboradores com recorrência (≥2 registros do mesmo tipo)
  const colaboradoresRecorrentes = useMemo(() => {
    return Object.entries(recorrenciaPorColaborador)
      .filter(([, count]) => count >= 2)
      .sort((a, b) => b[1] - a[1]);
  }, [recorrenciaPorColaborador]);

  // Helpers
  const getNomeColaborador = (id: string) =>
    colaboradores.find(c => c.id === id)?.nome ?? 'Colaborador';
  const getFotoColaborador = (id: string) =>
    colaboradores.find(c => c.id === id)?.fotoUrl ?? '';
  const getNomeLider = (responsavelId: string) => {
    const lider = lideres.find(l => l.id === responsavelId);
    if (lider) return lider.nome;
    const col = colaboradores.find(c => c.id === responsavelId);
    return col?.nome ?? 'Líder';
  };

  // Clicar na fatia do donut
  const handleFatiaClick = (data: { name?: string } | null) => {
    if (!data?.name) return;
    if (tipoSelecionado === data.name) {
      setDrillAberto(d => !d);
    } else {
      setTipoSelecionado(data.name);
      setDrillAberto(true);
    }
  };

  // Cor da fatia selecionada
  const corTipoSelecionado = tipoSelecionado
    ? corParaTipo(tipoSelecionado, dadosDistribuicao.findIndex(d => d.name === tipoSelecionado))
    : '#6366f1';

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in">

      {/* Modal de descrição */}
      {registroModal && (
        <ModalDescricao
          registro={registroModal}
          colaboradorNome={getNomeColaborador(registroModal.colaboradorId)}
          liderNome={getNomeLider(registroModal.responsavelId)}
          onFechar={() => setRegistroModal(null)}
        />
      )}

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics e Indicadores</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analise métricas agregadas de feedbacks aplicados, taxa de conclusão de planos de carreira (PDI) e distribuição setorial.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <FiltroMensal
            valor={filtroMes}
            onChange={setFiltroMes}
            datasDisponiveis={timeline.map(r => r.data)}
          />
          <div className="flex bg-slate-100 p-1 rounded-xl">
            {(['geral', 'setores', 'rankings'] as const).map(tab => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                  activeTab === tab ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-850'
                }`}
              >
                {tab === 'geral' ? 'Visão Geral' : tab === 'setores' ? 'Comparativo Setores' : 'Destaques e Rankings'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Feedbacks Aplicados', valor: totalFeedbacks, cor: 'teal', icon: <MessageSquare size={20} /> },
          { label: 'Conclusão PDIs',       valor: `${pdisConcluidosTaxa}%`, cor: 'indigo', icon: <TrendingUp size={20} /> },
          { label: 'Taxa Acompanhamento',  valor: `${taxaConclusaoTarefas}%`, cor: 'emerald', icon: <CheckCircle size={20} /> },
          { label: 'Reconhecimentos',      valor: totalDestaques, cor: 'amber', icon: <Award size={20} /> },
        ].map(({ label, valor, cor, icon }) => (
          <div key={label} className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
            <div className={`p-3 bg-${cor}-50 rounded-xl text-${cor}-600`}>{icon}</div>
            <div>
              <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">{label}</span>
              <span className="text-2xl font-extrabold text-slate-900 mt-0.5">{valor}</span>
            </div>
          </div>
        ))}
      </div>

      {/* TAB 1: VISÃO GERAL */}
      {activeTab === 'geral' && (
        <div className="space-y-6">

          {/* Evolução Mensal — largura total */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2">
              <Calendar size={18} className="text-indigo-500" />
              <h3 className="font-extrabold text-slate-950 text-sm uppercase tracking-wider">Evolução Mensal de Ações de Liderança</h3>
            </div>
            <div className="h-72 w-full text-xs">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={dadosEvolucaoMensal} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorFeedbacks" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#0d9488" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#0d9488" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="colorPDIs" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="mes" tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="Feedbacks" stroke="#0d9488" fillOpacity={1} fill="url(#colorFeedbacks)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="PDIs" stroke="#6366f1" fillOpacity={1} fill="url(#colorPDIs)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Mix de Registros — bloco próprio, largura total, donut grande */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm">
            {/* Header */}
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <PieChartIcon size={18} className="text-teal-500" />
                <h3 className="font-extrabold text-slate-950 text-sm uppercase tracking-wider">Mix de Registros (%)</h3>
              </div>
              {tipoSelecionado && (
                <button
                  onClick={() => { setTipoSelecionado(null); setDrillAberto(false); }}
                  className="text-xs text-slate-400 hover:text-slate-600 transition px-2 py-1 hover:bg-slate-100 rounded-lg"
                >
                  ✕ Limpar seleção
                </button>
              )}
            </div>
            <p className="text-[11px] text-slate-400 mb-5">
              Clique em uma fatia ou item da legenda para ver os detalhes dos registros ↓
            </p>

            {dadosDistribuicao.length === 0 ? (
              <p className="text-slate-400 text-center py-8">Aguardando dados...</p>
            ) : (
              <div className="flex flex-col md:flex-row items-center gap-6">
                {/* Donut — ocupa metade esquerda */}
                <div className="w-full md:w-1/2 shrink-0" style={{ height: 320 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={dadosDistribuicao}
                        cx="50%"
                        cy="50%"
                        innerRadius={80}
                        outerRadius={130}
                        paddingAngle={3}
                        dataKey="value"
                        onClick={handleFatiaClick}
                        cursor="pointer"
                      >
                        {dadosDistribuicao.map((entry, index) => (
                          <Cell
                            key={`cell-${index}`}
                            fill={corParaTipo(entry.name, index)}
                            opacity={tipoSelecionado && tipoSelecionado !== entry.name ? 0.3 : 1}
                            stroke={tipoSelecionado === entry.name ? '#1e293b' : 'transparent'}
                            strokeWidth={tipoSelecionado === entry.name ? 3 : 0}
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>

                {/* Legenda clicável — metade direita, duas colunas */}
                <div className="w-full md:w-1/2 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {dadosDistribuicao.map((item, index) => {
                    const total = dadosDistribuicao.reduce((s, d) => s + d.value, 0);
                    const pct = total > 0 ? Math.round((item.value / total) * 100) : 0;
                    const selecionado = tipoSelecionado === item.name;
                    return (
                      <button
                        key={item.name}
                        onClick={() => handleFatiaClick(item)}
                        className={`flex items-center gap-2.5 text-left rounded-xl px-3 py-2.5 border transition ${
                          selecionado
                            ? 'border-slate-300 bg-slate-100 shadow-sm'
                            : 'border-slate-100 hover:border-slate-200 hover:bg-slate-50'
                        }`}
                      >
                        <span
                          className="w-3 h-3 rounded-full shrink-0"
                          style={{ backgroundColor: corParaTipo(item.name, index) }}
                        />
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-semibold truncate ${selecionado ? 'text-slate-900' : 'text-slate-600'}`}>
                            {item.name}
                          </p>
                          <p className="text-[10px] text-slate-400 font-mono">
                            {item.value} registros · {pct}%
                          </p>
                        </div>
                        {selecionado && (
                          <span className="text-[9px] font-bold bg-slate-800 text-white px-1.5 py-0.5 rounded-full shrink-0">
                            ✓
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          {/* ── PAINEL DE DRILL-DOWN ── */}
          {tipoSelecionado && drillAberto && (
            <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
              {/* Header do drill-down */}
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-slate-50 transition"
                onClick={() => setDrillAberto(d => !d)}
              >
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0"
                    style={{ backgroundColor: corTipoSelecionado }}
                  />
                  <div>
                    <h3 className="font-extrabold text-slate-900 text-sm">
                      {tipoSelecionado}
                    </h3>
                    <p className="text-xs text-slate-400">
                      {registrosDrillDown.length} registro(s) no período selecionado
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {colaboradoresRecorrentes.length > 0 && (
                    <span className="flex items-center gap-1 text-[10px] font-bold bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                      <AlertCircle size={11} />
                      {colaboradoresRecorrentes.length} recorrente(s)
                    </span>
                  )}
                  {drillAberto ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
                </div>
              </div>

              {/* Painel de Padrões — Recorrências */}
              {colaboradoresRecorrentes.length > 0 && (
                <div className="mx-5 mb-4 bg-amber-50 border border-amber-200 rounded-2xl p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users size={14} className="text-amber-600" />
                    <p className="text-xs font-bold text-amber-800 uppercase tracking-wider">
                      ⚠️ Padrão Identificado — Colaboradores Recorrentes
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {colaboradoresRecorrentes.map(([colId, count]) => (
                      <div
                        key={colId}
                        className="flex items-center gap-2 bg-white border border-amber-200 rounded-xl px-3 py-2"
                      >
                        {getFotoColaborador(colId) && (
                          <img
                            src={getFotoColaborador(colId)}
                            alt=""
                            className="w-6 h-6 rounded-full object-cover border border-amber-200"
                          />
                        )}
                        <span className="text-xs font-semibold text-slate-800">
                          {getNomeColaborador(colId)}
                        </span>
                        <span className="text-[10px] font-bold bg-amber-500 text-white rounded-full px-2 py-0.5">
                          {count}×
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lista de registros */}
              {registrosDrillDown.length === 0 ? (
                <div className="px-5 pb-5 text-center text-sm text-slate-400">
                  Nenhum registro encontrado para este período.
                </div>
              ) : (
                <div className="px-5 pb-5 space-y-2 max-h-[480px] overflow-y-auto">
                  {/* Header da tabela */}
                  <div className="grid grid-cols-12 gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider px-3 pb-1 border-b border-slate-100">
                    <span className="col-span-3">Líder</span>
                    <span className="col-span-4">Colaborador</span>
                    <span className="col-span-3">Data</span>
                    <span className="col-span-2 text-right">Ação</span>
                  </div>

                  {registrosDrillDown
                    .sort((a, b) => new Date(b.data).getTime() - new Date(a.data).getTime())
                    .map(registro => {
                      const nomeCol = getNomeColaborador(registro.colaboradorId);
                      const fotoCol = getFotoColaborador(registro.colaboradorId);
                      const nomeLider = getNomeLider(registro.responsavelId);
                      const qtd = recorrenciaPorColaborador[registro.colaboradorId] ?? 1;
                      const recorrente = qtd >= 2;

                      return (
                        <div
                          key={registro.id}
                          className={`grid grid-cols-12 gap-2 items-center p-3 rounded-2xl border transition ${
                            recorrente
                              ? 'bg-amber-50/60 border-amber-200'
                              : 'bg-slate-50/40 border-slate-100 hover:border-slate-200'
                          }`}
                        >
                          {/* Líder */}
                          <div className="col-span-3 flex items-center gap-1.5 min-w-0">
                            <span className="text-xs text-slate-600 font-semibold truncate">{nomeLider}</span>
                          </div>

                          {/* Colaborador */}
                          <div className="col-span-4 flex items-center gap-2 min-w-0">
                            {fotoCol && (
                              <img
                                src={fotoCol}
                                alt={nomeCol}
                                className="w-6 h-6 rounded-full object-cover border border-slate-200 shrink-0"
                              />
                            )}
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-800 truncate">{nomeCol}</p>
                              {recorrente && (
                                <span className="inline-flex items-center gap-0.5 text-[9px] font-bold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-full mt-0.5">
                                  <AlertCircle size={9} /> {qtd}× neste tipo
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Data */}
                          <div className="col-span-3">
                            <span className="text-[10px] text-slate-400">
                              {new Date(registro.data).toLocaleDateString('pt-BR', {
                                day: '2-digit', month: 'short', year: '2-digit',
                              })}
                            </span>
                            {registro.titulo && (
                              <p className="text-[10px] text-slate-500 truncate mt-0.5" title={registro.titulo}>
                                {registro.titulo}
                              </p>
                            )}
                          </div>

                          {/* Ação */}
                          <div className="col-span-2 flex justify-end">
                            <button
                              onClick={() => setRegistroModal(registro)}
                              className="flex items-center gap-1 text-[10px] font-bold text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 px-2.5 py-1.5 rounded-xl transition"
                            >
                              <Eye size={11} /> Ver
                            </button>
                          </div>
                        </div>
                      );
                    })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: COMPARATIVO SETORES */}
      {activeTab === 'setores' && (
        <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-6">
          <div className="flex items-center gap-2">
            <BarChart2 size={18} className="text-teal-500" />
            <h3 className="font-extrabold text-slate-950 text-sm uppercase tracking-wider">
              Volume de Feedbacks Positivos vs Corretivos por Setor
            </h3>
          </div>
          <div className="h-96 w-full text-xs">
            {dadosSetores.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-400">
                Ainda não há registros na timeline vinculados aos setores para exibição.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dadosSetores} margin={{ top: 20, right: 10, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                  <XAxis dataKey="name" tickLine={false} tick={{ fontSize: 10 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Legend />
                  <Bar dataKey="Feedback Positivo" fill={FEEDBACK_COLORS.positivo} radius={[4, 4, 0, 0]} barSize={24} />
                  <Bar dataKey="Feedback Corretivo" fill={FEEDBACK_COLORS.corretivo} radius={[4, 4, 0, 0]} barSize={24} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>
      )}

      {/* TAB 3: RANKINGS E DESTAQUES */}
      {activeTab === 'rankings' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Reconhecimentos */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-500 border-b border-slate-50 pb-3">
              <Award size={18} />
              <h3 className="font-extrabold text-slate-950 text-sm uppercase tracking-wider">
                Destaques: Líderes em Reconhecimento
              </h3>
            </div>
            <div className="space-y-3.5">
              {rankingReconhecimento.filter(i => i.count > 0).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-slate-50 rounded-2xl bg-slate-50/30">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-400 text-sm w-5">{index + 1}º</span>
                    {item.fotoUrl && (
                      <img src={item.fotoUrl} alt={item.nome} className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                    )}
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{item.nome}</h4>
                      <p className="text-[10px] text-slate-400">
                        {setores.find(s => s.id === item.setorId)?.nome}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                    {item.count} {item.count === 1 ? 'Elogio/Reconhecimento' : 'Elogios/Reconhecimentos'}
                  </span>
                </div>
              ))}
              {rankingReconhecimento.every(i => i.count === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">Nenhum reconhecimento no período.</p>
              )}
            </div>
          </div>

          {/* Advertências */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-500 border-b border-slate-50 pb-3">
              <AlertTriangle size={18} />
              <h3 className="font-extrabold text-slate-950 text-sm uppercase tracking-wider">
                Foco de Atenção: Alertas e Incidentes
              </h3>
            </div>
            <div className="space-y-3.5">
              {rankingAdvertencias.filter(i => i.count > 0).map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-slate-50 rounded-2xl bg-slate-50/30">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-400 text-sm w-5">{index + 1}º</span>
                    {item.fotoUrl && (
                      <img src={item.fotoUrl} alt={item.nome} className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                    )}
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{item.nome}</h4>
                      <p className="text-[10px] text-slate-400">
                        {setores.find(s => s.id === item.setorId)?.nome}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                    {item.count} {item.count === 1 ? 'Alerta' : 'Alertas'}
                  </span>
                </div>
              ))}
              {rankingAdvertencias.every(i => i.count === 0) && (
                <p className="text-sm text-slate-400 text-center py-4">Nenhuma advertência ou suspensão no período.</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
