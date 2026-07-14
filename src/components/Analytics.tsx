/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import { Colaborador, TimelineRegistro, Setor, Tarefa } from '../types';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';
import {
  Award,
  AlertTriangle,
  TrendingUp,
  MessageSquare,
  Calendar,
  CheckCircle,
  BarChart2,
  PieChartIcon,
} from 'lucide-react';

interface AnalyticsProps {
  colaboradores: Colaborador[];
  timeline: TimelineRegistro[];
  setores: Setor[];
  tarefas: Tarefa[];
}

export default function Analytics({
  colaboradores,
  timeline,
  setores,
  tarefas,
}: AnalyticsProps) {
  const [activeTab, setActiveTab] = useState<'geral' | 'setores' | 'rankings'>('geral');

  // Cores modernas
  const COLORS = ['#0d9488', '#6366f1', '#f59e0b', '#f43f5e', '#0ea5e9', '#8b5cf6'];
  const FEEDBACK_COLORS = { positivo: '#0d9488', corretivo: '#f97316' };

  // --- 1. Estatísticas Gerais ---
  const totalFeedbacks = timeline.filter((r) => r.tipo.includes('Feedback')).length;
  
  const pdiRegistros = timeline.filter((r) => r.tipo === 'Plano de Desenvolvimento Individual (PDI)');
  const pdiConcluidos = pdiRegistros.filter((r) => r.status === 'Concluído').length;
  const pdisConcluidosTaxa = pdiRegistros.length > 0 ? Math.round((pdiConcluidos / pdiRegistros.length) * 100) : 100;

  const tarefasConcluidas = tarefas.filter((t) => t.concluida).length;
  const taxaConclusaoTarefas = tarefas.length > 0 ? Math.round((tarefasConcluidas / tarefas.length) * 100) : 100;

  const totalDestaques = timeline.filter((r) => r.tipo === 'Reconhecimento' || r.tipo === 'Elogio de Cliente').length;

  // --- 2. Dados por Setor (Comparativo Feedbacks Positivos vs Corretivos) ---
  const dadosSetores = setores.map((setor) => {
    const colaboradoresSetor = colaboradores.filter((c) => c.setorId === setor.id);
    const colIds = colaboradoresSetor.map((c) => c.id);

    // Feedbacks deste setor
    const feedbacksSetor = timeline.filter((r) => colIds.includes(r.colaboradorId));
    const positivos = feedbacksSetor.filter((r) => r.tipo === 'Feedback Positivo').length;
    const corretivos = feedbacksSetor.filter((r) => r.tipo === 'Feedback Corretivo').length;
    const pdis = feedbacksSetor.filter((r) => r.tipo === 'Plano de Desenvolvimento Individual (PDI)').length;

    return {
      name: setor.nome,
      'Feedback Positivo': positivos,
      'Feedback Corretivo': corretivos,
      PDIs: pdis,
      total: feedbacksSetor.length,
    };
  }).filter((d) => d.total > 0 || d.PDIs > 0);

  // --- 3. Distribuição por Tipo de Registro (PieChart) ---
  const tiposRegistrosContagem = timeline.reduce((acc: { [key: string]: number }, cur) => {
    acc[cur.tipo] = (acc[cur.tipo] || 0) + 1;
    return acc;
  }, {});

  const dadosDistribuicao = Object.keys(tiposRegistrosContagem).map((tipo) => ({
    name: tipo,
    value: tiposRegistrosContagem[tipo],
  }));

  // --- 4. Evolução Mensal (Área Chart) ---
  // Mocking da evolução do ano com base nos registros que possuímos e alguns pontos anteriores para preencher
  const dadosEvolucaoMensal = [
    { mes: 'Jan/26', Feedbacks: 3, PDIs: 1, Incidentes: 0 },
    { mes: 'Fev/26', Feedbacks: 5, PDIs: 2, Incidentes: 1 },
    { mes: 'Mar/26', Feedbacks: 4, PDIs: 3, Incidentes: 0 },
    { mes: 'Abr/26', Feedbacks: 6, PDIs: 1, Incidentes: 2 },
    { mes: 'Mai/26', Feedbacks: 8, PDIs: 4, Incidentes: 1 },
    { mes: 'Jun/26', Feedbacks: 11, PDIs: 5, Incidentes: 2 },
    { mes: 'Jul/26', Feedbacks: 14, PDIs: 6, Incidentes: 3 }, // Mês atual concentrado
  ];

  // --- 5. Rankings ---
  // Ranking de Reconhecimento/Elogio de Cliente
  const rankingReconhecimento = colaboradores.map((col) => {
    const elogios = timeline.filter(
      (r) => r.colaboradorId === col.id && (r.tipo === 'Reconhecimento' || r.tipo === 'Elogio de Cliente')
    ).length;
    return { ...col, count: elogios };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  // Ranking de Advertências/Suspensões
  const rankingAdvertencias = colaboradores.map((col) => {
    const incidentes = timeline.filter(
      (r) => r.colaboradorId === col.id && (r.tipo === 'Advertência' || r.tipo === 'Suspensão')
    ).length;
    return { ...col, count: incidentes };
  }).sort((a, b) => b.count - a.count).slice(0, 5);

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Analytics e Indicadores</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Analise métricas agregadas de feedbacks aplicados, taxa de conclusão de planos de carreira (PDI) e distribuição setorial.
          </p>
        </div>

        {/* Dashboard filter categories */}
        <div className="flex bg-slate-100 p-1 rounded-xl shrink-0">
          <button
            onClick={() => setActiveTab('geral')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              activeTab === 'geral' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            Visão Geral
          </button>
          <button
            onClick={() => setActiveTab('setores')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              activeTab === 'setores' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            Comparativo Setores
          </button>
          <button
            onClick={() => setActiveTab('rankings')}
            className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
              activeTab === 'rankings' ? 'bg-white text-slate-950 shadow-sm' : 'text-slate-500 hover:text-slate-850'
            }`}
          >
            Destaques e Rankings
          </button>
        </div>
      </div>

      {/* Row of Performance Cards (Material Design 3 Style) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-teal-50 rounded-xl text-teal-600">
            <MessageSquare size={20} />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Feedbacks Aplicados</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalFeedbacks}</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-600">
            <TrendingUp size={20} />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Conclusão PDIs</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5">{pdisConcluidosTaxa}%</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600">
            <CheckCircle size={20} />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Taxa Acompanhamento</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5">{taxaConclusaoTarefas}%</span>
          </div>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm flex items-center gap-4">
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600">
            <Award size={20} />
          </div>
          <div>
            <span className="text-xs font-medium text-slate-400 block uppercase tracking-wider">Reconhecimentos</span>
            <span className="text-2xl font-extrabold text-slate-900 mt-0.5">{totalDestaques}</span>
          </div>
        </div>
      </div>

      {/* DYNAMIC TAB CONTROLLER RENDERING */}

      {/* TAB 1: VISÃO GERAL */}
      {activeTab === 'geral' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Evolução Mensal Line Chart */}
          <div className="lg:col-span-8 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
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
                  <XAxis dataKey="mes" tickLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
                  <Tooltip />
                  <Legend />
                  <Area type="monotone" dataKey="Feedbacks" stroke="#0d9488" fillOpacity={1} fill="url(#colorFeedbacks)" strokeWidth={2.5} />
                  <Area type="monotone" dataKey="PDIs" stroke="#6366f1" fillOpacity={1} fill="url(#colorPDIs)" strokeWidth={2.5} />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Distribuição por Tipo de Registro Pie Chart */}
          <div className="lg:col-span-4 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4 flex flex-col">
            <div className="flex items-center gap-2">
              <PieChartIcon size={18} className="text-teal-500" />
              <h3 className="font-extrabold text-slate-950 text-sm uppercase tracking-wider">Mix de Registros (%)</h3>
            </div>
            <div className="h-52 w-full text-xs flex-1 flex items-center justify-center relative">
              {dadosDistribuicao.length === 0 ? (
                <p className="text-slate-400 text-center">Aguardando dados...</p>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosDistribuicao}
                      cx="50%"
                      cy="50%"
                      innerRadius={50}
                      outerRadius={75}
                      paddingAngle={4}
                      dataKey="value"
                    >
                      {dadosDistribuicao.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
            <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 mt-2 border-t border-slate-50 pt-3">
              {dadosDistribuicao.map((item, index) => (
                <div key={item.name} className="flex items-center gap-1.5 min-w-0">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span className="truncate">{item.name} ({item.value})</span>
                </div>
              ))}
            </div>
          </div>
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
                  <XAxis dataKey="name" tickLine={false} />
                  <YAxis tickLine={false} axisLine={false} />
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
          {/* Ranking de Reconhecimentos e Elogios */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-amber-500 border-b border-slate-50 pb-3">
              <Award size={18} />
              <h3 className="font-extrabold text-slate-950 text-sm uppercase tracking-wider">
                Destaques: Líderes em Reconhecimento
              </h3>
            </div>

            <div className="space-y-3.5">
              {rankingReconhecimento.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-slate-50 rounded-2xl bg-slate-50/30">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-400 text-sm w-5">{index + 1}º</span>
                    <img src={item.fotoUrl} alt={item.nome} className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{item.nome}</h4>
                      <p className="text-[10px] text-slate-400">
                        {setores.find((s) => s.id === item.setorId)?.nome}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-amber-600 bg-amber-50 px-2 py-1 rounded-lg">
                      {item.count} {item.count === 1 ? 'Elogio/Reconhecimento' : 'Elogios/Reconhecimentos'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Ranking de Incidentes (Advertências/Suspensões) */}
          <div className="bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
            <div className="flex items-center gap-2 text-rose-500 border-b border-slate-50 pb-3">
              <AlertTriangle size={18} />
              <h3 className="font-extrabold text-slate-950 text-sm uppercase tracking-wider">
                Foco de Atenção: Alertas e Incidentes
              </h3>
            </div>

            <div className="space-y-3.5">
              {rankingAdvertencias.map((item, index) => (
                <div key={item.id} className="flex items-center justify-between p-3 border border-slate-50 rounded-2xl bg-slate-50/30">
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-slate-400 text-sm w-5">{index + 1}º</span>
                    <img src={item.fotoUrl} alt={item.nome} className="w-8 h-8 rounded-full object-cover border border-slate-100" />
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">{item.nome}</h4>
                      <p className="text-[10px] text-slate-400">
                        {setores.find((s) => s.id === item.setorId)?.nome}
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="text-xs font-extrabold text-rose-600 bg-rose-50 px-2.5 py-1 rounded-lg">
                      {item.count} {item.count === 1 ? 'Alerta' : 'Alertas'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
