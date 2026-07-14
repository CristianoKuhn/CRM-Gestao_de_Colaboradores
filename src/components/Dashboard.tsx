/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  Colaborador,
  TimelineRegistro,
  Tarefa,
  Usuario,
} from '../types';
import {
  MessageSquare,
  AlertTriangle,
  Award,
  Calendar,
  CheckCircle2,
  Users2,
  ListTodo,
  TrendingUp,
  FileSpreadsheet,
  PlusCircle,
  Clock,
  ArrowRight,
  Sparkles,
} from 'lucide-react';

interface DashboardProps {
  colaboradores: Colaborador[];
  timeline: TimelineRegistro[];
  tarefas: Tarefa[];
  onNavigateToList: (tab: string, filter?: any) => void;
  onSelectColaborador: (id: string) => void;
  onOpenNewRegistroModal: (colaboradorId?: string) => void;
  currentUser: Usuario;
  onUpdateColaborador: (col: Colaborador) => void;
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
}: DashboardProps) {
  const HOJE = new Date('2026-07-13');

  // Calcular lembretes de avaliação e período de experiência para o líder direto (ou todos, se Admin/Supervisor/Coordenador)
  const calculateReminders = () => {
    const list: {
      id: string;
      colaborador: Colaborador;
      milestone: string;
      titulo: string;
      prazoData: string;
      atrasado: boolean;
      diasRestantes: number;
    }[] = [];

    colaboradores.forEach((col) => {
      // Filtrar se o usuário logado é o líder direto deste colaborador
      // Se for Admin, Coordenador, Supervisor, pode ver os lembretes de todos.
      // Se for Lider, apenas os dele.
      const isMyColaborador =
        currentUser.perfil === 'Administrador' ||
        currentUser.perfil === 'Coordenador' ||
        currentUser.perfil === 'Supervisor' ||
        col.liderId === currentUser.id ||
        col.liderId?.replace('lid-', 'usu-') === currentUser.id ||
        (col.liderId === 'lid-1' && currentUser.nome.includes('Carlos')); // Demo mapping for seed data

      if (!isMyColaborador) return;

      const admissao = new Date(col.dataAdmissao);
      if (isNaN(admissao.getTime())) return;

      // 1. Período de Experiência (15, 30, 60, 90 dias)
      if (col.realizarExperiencia !== false) {
        const milestones = [15, 30, 60, 90];
        milestones.forEach((days) => {
          const completed = col.avaliacoesCompletas?.includes(String(days));
          if (completed) return;

          const dueDate = new Date(admissao);
          dueDate.setDate(dueDate.getDate() + days);

          const diffTime = dueDate.getTime() - HOJE.getTime();
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          // Mostramos o lembrete se o prazo já passou (atrasado) ou se falta menos de 15 dias
          if (diffDays <= 15) {
            list.push({
              id: `${col.id}-exp-${days}`,
              colaborador: col,
              milestone: String(days),
              titulo: `Avaliação de Experiência - ${days} Dias`,
              prazoData: dueDate.toISOString().split('T')[0],
              atrasado: diffDays < 0,
              diasRestantes: diffDays,
            });
          }
        });
      }

      // 2. Avaliação 180º (padrão de 6 meses)
      const prazoMeses = col.prazoAvaliacao180 || 6;
      const completed180 = col.avaliacoesCompletas?.includes('180');
      if (!completed180) {
        const dueDate180 = new Date(admissao);
        dueDate180.setMonth(dueDate180.getMonth() + prazoMeses);

        const diffTime180 = dueDate180.getTime() - HOJE.getTime();
        const diffDays180 = Math.ceil(diffTime180 / (1000 * 60 * 60 * 24));

        // Mostramos se já passou ou se faltam menos de 30 dias
        if (diffDays180 <= 30) {
          list.push({
            id: `${col.id}-180`,
            colaborador: col,
            milestone: '180',
            titulo: `Avaliação 180º (${prazoMeses} Meses)`,
            prazoData: dueDate180.toISOString().split('T')[0],
            atrasado: diffDays180 < 0,
            diasRestantes: diffDays180,
          });
        }
      }
    });

    return list.sort((a, b) => a.diasRestantes - b.diasRestantes);
  };

  const lembretesAcompanhamento = calculateReminders();

  const handleCompleteMilestone = async (col: Colaborador, milestone: string) => {
    const novasCompletas = [...(col.avaliacoesCompletas || [])];
    if (!novasCompletas.includes(milestone)) {
      novasCompletas.push(milestone);
    }

    const colAtualizado: Colaborador = {
      ...col,
      avaliacoesCompletas: novasCompletas,
    };

    onUpdateColaborador(colAtualizado);
  };

  // 1. Feedbacks Pendentes: Feedbacks em andamento/pendente
  const feedbacksPendentes = timeline.filter(
    (r) =>
      (r.tipo === 'Feedback Corretivo' || r.tipo === 'Feedback Positivo') &&
      r.status !== 'Concluído'
  );

  // 2. Feedbacks Vencidos: Feedbacks com prazo vencido e não concluídos
  const feedbacksVencidos = timeline.filter((r) => {
    if ((r.tipo === 'Feedback Corretivo' || r.tipo === 'Feedback Positivo') && r.status !== 'Concluído' && r.prazoAcompanhamento) {
      const prazo = new Date(r.prazoAcompanhamento);
      return prazo < HOJE;
    }
    return false;
  });

  // 3. PDIs Ativos
  const pdisAtivos = timeline.filter(
    (r) => r.tipo === 'Plano de Desenvolvimento Individual (PDI)' && r.status !== 'Concluído'
  );

  // 4. PDIs Vencidos
  const pdisVencidos = timeline.filter((r) => {
    if (r.tipo === 'Plano de Desenvolvimento Individual (PDI)' && r.status !== 'Concluído' && r.prazoAcompanhamento) {
      const prazo = new Date(r.prazoAcompanhamento);
      return prazo < HOJE;
    }
    return false;
  });

  // 5. Reconhecimentos do Mês (Julho 2026)
  const reconhecimentosMes = timeline.filter((r) => {
    const isReconhecimento =
      r.tipo === 'Reconhecimento' || r.tipo === 'Elogio de Cliente' || r.tipo === 'Feedback Positivo';
    if (!isReconhecimento) return false;
    const dataReg = new Date(r.data);
    return dataReg.getFullYear() === 2026 && dataReg.getMonth() === 6; // Julho é mês 6 (0-indexed)
  });

  // 6. Advertências e Suspensões acumuladas
  const advertencias = timeline.filter(
    (r) => r.tipo === 'Advertência' || r.tipo === 'Suspensão'
  );

  // 7. Aniversários de admissão do mês (Julho)
  const aniversariosMes = colaboradores.filter((c) => {
    const dataAdmissao = new Date(c.dataAdmissao);
    return dataAdmissao.getMonth() === 6; // Julho
  });

  // 8. Colaboradores em Acompanhamento
  const colAcompanhamento = colaboradores.filter((c) => c.situacao === 'Em Acompanhamento');

  // 9. Tarefas Pendentes
  const tarefasPendentes = tarefas.filter((t) => !t.concluida);
  const tarefasAtrasadas = tarefas.filter((t) => {
    if (t.concluida) return false;
    const limite = new Date(t.vencimento);
    return limite < HOJE;
  });

  // Feedbacks mais recentes para lista rápida
  const ultimosEventos = timeline.slice(0, 4);

  return (
    <div className="space-y-8 max-w-7xl mx-auto p-4 animate-fade-in">
      {/* Top Welcome Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Gestão de Equipes</h1>
          <p className="text-sm text-slate-500 mt-1">
            Olá, <span className="font-semibold text-teal-600">Líder</span>. Aqui está o resumo das ações de liderança para hoje, 13 de Julho de 2026.
          </p>
        </div>
        <div className="flex gap-3">
          <button
            id="btn-quick-new-feedback"
            onClick={() => onOpenNewRegistroModal()}
            className="flex items-center gap-2 px-4 py-2.5 bg-teal-500 text-slate-950 rounded-xl text-sm font-semibold hover:bg-teal-400 shadow-md shadow-teal-500/10 cursor-pointer transition-all"
          >
            <PlusCircle size={16} />
            Lançar Feedback
          </button>
          <button
            id="btn-quick-view-colab"
            onClick={() => onNavigateToList('colaboradores')}
            className="flex items-center gap-2 px-4 py-2.5 border border-slate-200 text-slate-700 bg-slate-50 rounded-xl text-sm font-semibold hover:bg-slate-100 cursor-pointer transition-all"
          >
            Ver Colaboradores
            <ArrowRight size={16} />
          </button>
        </div>
      </div>

      {/* Grid de Indicadores Clícaveis (Material Design 3 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
        {/* Card 1: Feedbacks Pendentes */}
        <div
          id="metric-feedbacks-pendentes"
          onClick={() => onNavigateToList('colaboradores', { feedbackStatus: 'Pendente' })}
          className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-lg hover:border-teal-100 cursor-pointer group transition-all duration-300 flex items-start gap-4"
        >
          <div className="p-3 bg-teal-50 rounded-2xl text-teal-600 group-hover:bg-teal-500 group-hover:text-white transition-all">
            <MessageSquare size={22} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Feedbacks Pendentes</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{feedbacksPendentes.length}</span>
              {feedbacksVencidos.length > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 font-medium rounded bg-rose-50 text-rose-600 flex items-center gap-1">
                  <Clock size={10} /> {feedbacksVencidos.length} atrasados
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              Ver lista de feedbacks pendentes <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* Card 2: PDIs Ativos */}
        <div
          id="metric-pdis-ativos"
          onClick={() => onNavigateToList('analytics', { pdiStatus: 'Ativos' })}
          className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-lg hover:border-indigo-100 cursor-pointer group transition-all duration-300 flex items-start gap-4"
        >
          <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 group-hover:bg-indigo-500 group-hover:text-white transition-all">
            <TrendingUp size={22} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">PDIs Ativos</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{pdisAtivos.length}</span>
              {pdisVencidos.length > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 font-medium rounded bg-rose-50 text-rose-600 flex items-center gap-1">
                  {pdisVencidos.length} vencidos
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              Acompanhar planos de carreira <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* Card 3: Reconhecimentos do Mês */}
        <div
          id="metric-reconhecimentos"
          onClick={() => onNavigateToList('analytics', { view: 'reconhecimentos' })}
          className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-lg hover:border-amber-100 cursor-pointer group transition-all duration-300 flex items-start gap-4"
        >
          <div className="p-3 bg-amber-50 rounded-2xl text-amber-600 group-hover:bg-amber-500 group-hover:text-white transition-all">
            <Award size={22} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Reconhecimentos (Mês)</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{reconhecimentosMes.length}</span>
              <span className="text-[10px] text-emerald-600 font-medium">+15% vs prev</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              Visualizar destaques de Julho <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* Card 4: Advertências */}
        <div
          id="metric-advertencias"
          onClick={() => onNavigateToList('analytics', { view: 'incidentes' })}
          className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-lg hover:border-rose-100 cursor-pointer group transition-all duration-300 flex items-start gap-4"
        >
          <div className="p-3 bg-rose-50 rounded-2xl text-rose-600 group-hover:bg-rose-500 group-hover:text-white transition-all">
            <AlertTriangle size={22} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Advertências / Alertas</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{advertencias.length}</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              Análise de incidentes críticos <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* Card 5: Colaboradores em Acompanhamento */}
        <div
          id="metric-colaboradores-acompanhamento"
          onClick={() => onNavigateToList('colaboradores', { situacao: 'Em Acompanhamento' })}
          className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-lg hover:border-orange-100 cursor-pointer group transition-all duration-300 flex items-start gap-4"
        >
          <div className="p-3 bg-orange-50 rounded-2xl text-orange-600 group-hover:bg-orange-500 group-hover:text-white transition-all">
            <Users2 size={22} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Em Acompanhamento</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{colAcompanhamento.length}</span>
              <span className="text-[10px] text-orange-600 font-medium">Atenção líder</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              Ver colaboradores em foco <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* Card 6: Aniversários de Empresa */}
        <div
          id="metric-aniversarios"
          onClick={() => onNavigateToList('colaboradores', { month: 'Julho' })}
          className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-lg hover:border-blue-100 cursor-pointer group transition-all duration-300 flex items-start gap-4"
        >
          <div className="p-3 bg-blue-50 rounded-2xl text-blue-600 group-hover:bg-blue-500 group-hover:text-white transition-all">
            <Calendar size={22} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Aniversários de Admissão</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{aniversariosMes.length}</span>
              <span className="text-[10px] text-blue-600 font-medium">Em Julho</span>
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              Ver aniversariantes de admissão <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* Card 7: Tarefas Pendentes */}
        <div
          id="metric-tarefas-pendentes"
          onClick={() => onNavigateToList('tarefas', { status: 'Pendentes' })}
          className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-lg hover:border-slate-300 cursor-pointer group transition-all duration-300 flex items-start gap-4"
        >
          <div className="p-3 bg-slate-50 rounded-2xl text-slate-600 group-hover:bg-slate-700 group-hover:text-white transition-all">
            <ListTodo size={22} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Tarefas Pendentes</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">{tarefasPendentes.length}</span>
              {tarefasAtrasadas.length > 0 && (
                <span className="text-[11px] px-1.5 py-0.5 font-medium rounded bg-rose-50 text-rose-600">
                  {tarefasAtrasadas.length} atrasadas
                </span>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              Ir para quadro de tarefas <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>

        {/* Card 8: Taxa de Resolução */}
        <div
          id="metric-taxa-resolucao"
          onClick={() => onNavigateToList('analytics')}
          className="bg-white border border-slate-100 rounded-3xl p-5 hover:shadow-lg hover:border-emerald-100 cursor-pointer group transition-all duration-300 flex items-start gap-4"
        >
          <div className="p-3 bg-emerald-50 rounded-2xl text-emerald-600 group-hover:bg-emerald-500 group-hover:text-white transition-all">
            <CheckCircle2 size={22} />
          </div>
          <div>
            <h3 className="text-sm font-medium text-slate-500">Conclusão de Ações</h3>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-slate-900">
                {tarefas.length > 0
                  ? Math.round(((tarefas.length - tarefasPendentes.length) / tarefas.length) * 100)
                  : 100}
                %
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              Visualizar performance de acompanhamento <ArrowRight size={12} className="opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </div>
        </div>
      </div>

      {/* Lembretes de Avaliação / Período de Experiência */}
      {lembretesAcompanhamento.length > 0 && (
        <div className="bg-amber-50/30 border border-amber-100 rounded-3xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-amber-100 text-amber-700 rounded-lg">
                <AlertTriangle size={16} />
              </span>
              <div>
                <h2 className="text-md font-bold text-slate-900">Pendências de Avaliações (Líder Direto)</h2>
                <p className="text-xs text-slate-500">Há colaboradores sob sua gestão com prazos de experiência ou avaliação 180º pendentes.</p>
              </div>
            </div>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800">
              {lembretesAcompanhamento.length} {lembretesAcompanhamento.length === 1 ? 'pendência' : 'pendências'}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lembretesAcompanhamento.map((lembrete) => {
              const col = lembrete.colaborador;
              return (
                <div
                  key={lembrete.id}
                  className={`p-4 rounded-2xl border bg-white flex items-start gap-3.5 shadow-xs hover:shadow-md transition duration-200 ${
                    lembrete.atrasado ? 'border-rose-100 bg-rose-50/5' : 'border-slate-150'
                  }`}
                >
                  <img
                    src={col.fotoUrl}
                    alt={col.nome}
                    className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200 mt-0.5"
                  />
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10px] font-bold tracking-wider text-teal-600 uppercase">
                        {lembrete.titulo}
                      </span>
                      {lembrete.atrasado ? (
                        <span className="text-[9px] font-extrabold bg-rose-50 text-rose-650 px-1.5 py-0.5 rounded-md uppercase">
                          Vencido
                        </span>
                      ) : (
                        <span className="text-[9px] font-extrabold bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-md uppercase">
                          Próximo
                        </span>
                      )}
                    </div>
                    
                    <h4 className="text-sm font-bold text-slate-800 truncate">
                      {col.nome}
                    </h4>
                    
                    <div className="text-[11px] text-slate-500 flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3">
                      <span><strong>Cidade Base:</strong> {col.cidadeBase || 'Não informada'}</span>
                      <span className="hidden sm:inline">&middot;</span>
                      <span><strong>Admissão:</strong> {new Date(col.dataAdmissao).toLocaleDateString('pt-BR')}</span>
                    </div>

                    <p className="text-[11px] text-slate-400">
                      Prazo limite: <strong className="text-slate-600">{new Date(lembrete.prazoData).toLocaleDateString('pt-BR')}</strong> ({lembrete.atrasado ? `${Math.abs(lembrete.diasRestantes)} dias atrás` : `em ${lembrete.diasRestantes} dias`})
                    </p>

                    <div className="flex gap-2 pt-2">
                      <button
                        onClick={() => handleCompleteMilestone(col, lembrete.milestone)}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-lg cursor-pointer transition"
                      >
                        ✓ Marcar Concluída
                      </button>
                      <button
                        onClick={() => onOpenNewRegistroModal(col.id)}
                        className="px-2.5 py-1 bg-slate-150 hover:bg-slate-200 text-slate-700 text-[10px] font-bold rounded-lg cursor-pointer transition"
                      >
                        Lançar Feedback
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Sections: Left (Urgent Tasks), Right (Recent Timeline) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Urgent Leadership Actions (Tasks) */}
        <div className="lg:col-span-5 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Ações Urgentes de Liderança</h2>
              <p className="text-xs text-slate-400 mt-0.5">Acompanhamentos que vencem em breve</p>
            </div>
            <button
              id="btn-view-all-tasks"
              onClick={() => onNavigateToList('tarefas')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
            >
              Ver todas ({tarefasPendentes.length})
            </button>
          </div>

          <div className="space-y-3">
            {tarefasPendentes.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <CheckCircle2 className="mx-auto text-emerald-500 mb-2" size={32} />
                <p className="text-sm font-medium">Nenhuma ação atrasada ou pendente!</p>
                <p className="text-xs">Bom trabalho mantendo o fluxo em dia.</p>
              </div>
            ) : (
              tarefasPendentes.slice(0, 4).map((task) => {
                const colaborador = colaboradores.find((c) => c.id === task.colaboradorId);
                const isOverdue = new Date(task.vencimento) < HOJE;
                return (
                  <div
                    key={task.id}
                    className={`p-3.5 border rounded-2xl flex items-start gap-3.5 hover:bg-slate-50 transition ${
                      isOverdue ? 'border-rose-100 bg-rose-50/10' : 'border-slate-100'
                    }`}
                  >
                    {colaborador && (
                      <img
                        src={colaborador.fotoUrl}
                        alt={colaborador.nome}
                        className="w-9 h-9 rounded-full object-cover shrink-0 border border-slate-200 mt-0.5"
                      />
                    )}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between gap-2">
                        <h4 className="text-sm font-semibold text-slate-800 truncate">{task.titulo}</h4>
                        <span
                          className={`text-[10px] font-semibold px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0 ${
                            isOverdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {isOverdue ? 'Atrasado' : 'Pendente'}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 mt-1 line-clamp-1">{task.descricao}</p>
                      <div className="flex items-center justify-between gap-2 mt-2">
                        <span className="text-[11px] font-medium text-slate-400">
                          Para: <span className="text-slate-600 font-semibold">{colaborador?.nome}</span>
                        </span>
                        <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1">
                          Prazo: {new Date(task.vencimento).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right Column: Recent Activities Timeline */}
        <div className="lg:col-span-7 bg-white border border-slate-100 p-6 rounded-3xl shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-bold text-slate-900">Histórico de Registros Recentes</h2>
              <p className="text-xs text-slate-400 mt-0.5">Últimos feedbacks, PDIs e ocorrências lançadas</p>
            </div>
            <button
              id="btn-view-colab-timeline"
              onClick={() => onNavigateToList('colaboradores')}
              className="text-xs font-semibold text-teal-600 hover:text-teal-700 flex items-center gap-1 cursor-pointer"
            >
              Ver Timelines
            </button>
          </div>

          <div className="space-y-4 relative before:absolute before:left-6 before:top-4 before:bottom-4 before:w-0.5 before:bg-slate-100">
            {ultimosEventos.length === 0 ? (
              <div className="text-center py-8 text-slate-400">
                <p className="text-sm">Nenhum registro no histórico ainda.</p>
              </div>
            ) : (
              ultimosEventos.map((reg) => {
                const col = colaboradores.find((c) => c.id === reg.colaboradorId);
                return (
                  <div key={reg.id} className="flex gap-4 relative items-start group">
                    {/* Badge circular para o tipo de registro */}
                    <div className="relative z-10 w-12 h-12 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition duration-150">
                      {col ? (
                        <img
                          src={col.fotoUrl}
                          alt={col.nome}
                          className="w-9 h-9 rounded-full object-cover border border-white"
                        />
                      ) : (
                        <FileSpreadsheet size={16} className="text-slate-400" />
                      )}
                    </div>

                    <div className="flex-1 bg-slate-50/50 hover:bg-slate-50 p-4 rounded-2xl border border-slate-100 transition duration-150">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 mb-1">
                        <div>
                          <span className="text-[11px] font-bold tracking-wider text-teal-600 uppercase">
                            {reg.tipo}
                          </span>
                          <h4
                            onClick={() => col && onSelectColaborador(col.id)}
                            className="text-sm font-bold text-slate-800 hover:text-teal-600 cursor-pointer mt-0.5"
                          >
                            {col?.nome} &middot; {reg.titulo}
                          </h4>
                        </div>
                        <span className="text-[10px] text-slate-400 font-medium shrink-0">
                          {new Date(reg.data).toLocaleDateString('pt-BR')}
                        </span>
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">{reg.descricao}</p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
