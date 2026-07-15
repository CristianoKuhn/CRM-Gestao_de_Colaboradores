/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Tarefa, Colaborador, Lider, TipoRegistro, Cargo } from '../types';
import {
  CheckSquare,
  Square,
  Search,
  Calendar,
  AlertCircle,
  CheckCircle,
  Plus,
  Users2,
  Trash2,
} from 'lucide-react';

interface TarefasProps {
  tarefas: Tarefa[];
  colaboradores: Colaborador[];
  lideres: Lider[];
  cargos: Cargo[];
  onToggleTarefa: (id: string) => void;
  onAddTarefa: (tarefa: Tarefa) => void;
}

export default function Tarefas({
  tarefas,
  colaboradores,
  lideres,
  cargos,
  onToggleTarefa,
  onAddTarefa,
}: TarefasProps) {
  const HOJE = new Date();

  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<'Todas' | 'Pendentes' | 'Concluídas' | 'Atrasadas'>('Todas');

  // Nova Tarefa Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [taskTitulo, setTaskTitulo] = useState('');
  const [taskDescricao, setTaskDescricao] = useState('');
  const [taskVencimento, setTaskVencimento] = useState(() => {
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 2);
    return amanha.toISOString().split('T')[0];
  });
  const [taskColaboradorId, setTaskColaboradorId] = useState(colaboradores[0]?.id || '');
  const [taskLiderId, setTaskLiderId] = useState(lideres[0]?.id || '');
  const [taskOrigem, setTaskOrigem] = useState<TipoRegistro>('Acompanhamento');

  // Filtragem inteligente das tarefas
  const tarefasFiltradas = tarefas.filter((task) => {
    const matchesSearch =
      task.titulo.toLowerCase().includes(searchTerm.toLowerCase()) ||
      task.descricao.toLowerCase().includes(searchTerm.toLowerCase());

    const isAtrasada = !task.concluida && new Date(task.vencimento) < HOJE;

    let matchesStatus = true;
    if (filterStatus === 'Pendentes') {
      matchesStatus = !task.concluida;
    } else if (filterStatus === 'Concluídas') {
      matchesStatus = task.concluida;
    } else if (filterStatus === 'Atrasadas') {
      matchesStatus = isAtrasada;
    }

    return matchesSearch && matchesStatus;
  });

  const handleCreateTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitulo || !taskColaboradorId) return;

    const novaTarefa: Tarefa = {
      id: `tar-${Date.now()}`,
      colaboradorId: taskColaboradorId,
      titulo: taskTitulo,
      descricao: taskDescricao,
      vencimento: taskVencimento,
      concluida: false,
      tipoOrigem: taskOrigem,
      responsavelId: taskLiderId,
    };

    onAddTarefa(novaTarefa);
    setIsFormOpen(false);

    // Reset Form
    setTaskTitulo('');
    setTaskDescricao('');
    const amanha = new Date();
    amanha.setDate(amanha.getDate() + 2);
    setTaskVencimento(amanha.toISOString().split('T')[0]);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 animate-fade-in">
      {/* Header Panel */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-100 shadow-sm">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Tarefas e Acompanhamentos</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Gerencie os prazos acordados de feedbacks, planos de desenvolvimento e revisões de desempenho de toda a liderança.
          </p>
        </div>

        <button
          id="btn-abrir-form-tarefa"
          onClick={() => setIsFormOpen(!isFormOpen)}
          className="flex items-center gap-1.5 px-4 py-2.5 bg-teal-500 text-slate-950 font-bold rounded-xl text-sm hover:bg-teal-400 cursor-pointer shadow-md shadow-teal-500/10 transition"
        >
          <Plus size={16} />
          Nova Ação / Tarefa
        </button>
      </div>

      {/* NOVO REGISTRO TAREFA FORM */}
      {isFormOpen && (
        <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-md animate-slide-down max-w-2xl mx-auto">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3 mb-4">
            <h3 className="text-md font-bold text-slate-950">Adicionar Tarefa de Liderança</h3>
            <button
              onClick={() => setIsFormOpen(false)}
              className="text-slate-400 hover:text-slate-600 font-bold cursor-pointer"
            >
              &times;
            </button>
          </div>

          <form onSubmit={handleCreateTask} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Título da Tarefa</label>
                <input
                  type="text"
                  required
                  value={taskTitulo}
                  onChange={(e) => setTaskTitulo(e.target.value)}
                  placeholder="Ex: Revisar PDI de Aline"
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Colaborador Vinculado</label>
                <select
                  value={taskColaboradorId}
                  onChange={(e) => setTaskColaboradorId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  {colaboradores.map((col) => (
                    <option key={col.id} value={col.id}>
                      {col.nome} ({cargos.find((c) => c.id === col.cargoId)?.nome})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Instruções / Detalhes de Ação</label>
              <textarea
                rows={3}
                value={taskDescricao}
                onChange={(e) => setTaskDescricao(e.target.value)}
                placeholder="Ex: Conversar sobre SLAs de atendimento e prazos de code-review..."
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Data de Vencimento</label>
                <input
                  type="date"
                  required
                  value={taskVencimento}
                  onChange={(e) => setTaskVencimento(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Líder Responsável</label>
                <select
                  value={taskLiderId}
                  onChange={(e) => setTaskLiderId(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  {lideres.map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1.5">Origem da Ação</label>
                <select
                  value={taskOrigem}
                  onChange={(e) => setTaskOrigem(e.target.value as TipoRegistro)}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm bg-white focus:outline-none focus:ring-1 focus:ring-teal-500 cursor-pointer"
                >
                  <option value="Conversa Individual (1:1)">Conversa 1:1</option>
                  <option value="Plano de Desenvolvimento Individual (PDI)">Plano de Carreira (PDI)</option>
                  <option value="Feedback Corretivo">Feedback Corretivo</option>
                  <option value="Feedback Positivo">Feedback Positivo</option>
                  <option value="Advertência">Advertência / Alerta</option>
                  <option value="Acompanhamento">Acompanhamento de Rotina</option>
                </select>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-4 py-2 border border-slate-200 text-slate-600 bg-slate-50 rounded-xl text-xs font-semibold hover:bg-slate-100 cursor-pointer transition"
              >
                Cancelar
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-teal-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-teal-400 cursor-pointer transition"
              >
                Criar Tarefa
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Search & Status Filters */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-sm flex flex-col md:flex-row gap-3 items-center">
        {/* Search */}
        <div className="relative w-full md:flex-1">
          <Search size={18} className="absolute left-3 top-3 text-slate-400" />
          <input
            id="search-task"
            type="text"
            placeholder="Pesquise tarefas por título ou descrição..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none"
          />
        </div>

        {/* Filter categories tabs */}
        <div className="flex bg-slate-100 p-1 rounded-xl">
          {(['Todas', 'Pendentes', 'Atrasadas', 'Concluídas'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterStatus(tab)}
              className={`px-4 py-1.5 rounded-lg text-xs font-bold cursor-pointer transition ${
                filterStatus === tab
                  ? 'bg-white text-slate-950 shadow-sm'
                  : 'text-slate-500 hover:text-slate-850'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      {/* Task List / Kanban Style Table (Linear Style) */}
      <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 border-b border-slate-100 text-slate-400 font-bold text-xs uppercase tracking-wider">
                <th className="p-4 pl-6 w-12">Status</th>
                <th className="p-4">Descrição da Tarefa</th>
                <th className="p-4">Colaborador Vinculado</th>
                <th className="p-4">Responsável (Líder)</th>
                <th className="p-4">Prazo Limite</th>
                <th className="p-4">Origem</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700 text-sm">
              {tarefasFiltradas.length === 0 ? (
                <tr>
                  <td colSpan={6} className="text-center py-12 text-slate-400">
                    <CheckSquare className="mx-auto mb-2 text-slate-300" size={36} />
                    <p className="font-semibold text-slate-500">Nenhuma tarefa encontrada</p>
                    <p className="text-xs mt-1">Nenhuma ação de liderança correspondente aos filtros.</p>
                  </td>
                </tr>
              ) : (
                tarefasFiltradas.map((task) => {
                  const col = colaboradores.find((c) => c.id === task.colaboradorId);
                  const lider = lideres.find((l) => l.id === task.responsavelId);

                  const isOverdue = !task.concluida && new Date(task.vencimento) < HOJE;

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-slate-50/50 transition duration-150 group ${
                        task.concluida ? 'opacity-65' : ''
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-4 pl-6">
                        <button
                          id={`btn-toggle-task-${task.id}`}
                          onClick={() => onToggleTarefa(task.id)}
                          className="text-slate-400 hover:text-teal-600 transition cursor-pointer"
                        >
                          {task.concluida ? (
                            <CheckSquare className="text-teal-500" size={20} />
                          ) : (
                            <Square size={20} />
                          )}
                        </button>
                      </td>

                      {/* Title & Description */}
                      <td className="p-4">
                        <div className="max-w-md">
                          <h4
                            className={`font-bold text-slate-900 group-hover:text-teal-600 transition ${
                              task.concluida ? 'line-through text-slate-400' : ''
                            }`}
                          >
                            {task.titulo}
                          </h4>
                          <p className="text-xs text-slate-400 mt-0.5 line-clamp-1">{task.descricao}</p>
                        </div>
                      </td>

                      {/* Colaborador */}
                      <td className="p-4">
                        {col && (
                          <div className="flex items-center gap-2">
                            <img
                              src={col.fotoUrl}
                              alt={col.nome}
                              className="w-6 h-6 rounded-full object-cover border border-slate-100"
                            />
                            <p className="font-semibold text-slate-700 truncate max-w-[120px]">{col.nome}</p>
                          </div>
                        )}
                      </td>

                      {/* Líder Responsável */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          {lider?.fotoUrl && (
                            <img
                              src={lider.fotoUrl}
                              alt={lider.nome}
                              className="w-5 h-5 rounded-full object-cover border border-slate-100"
                            />
                          )}
                          <span className="text-slate-600 text-xs font-semibold">{lider?.nome || 'Nenhum'}</span>
                        </div>
                      </td>

                      {/* Prazo */}
                      <td className="p-4">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-slate-400" />
                          <div>
                            <span
                              className={`text-xs font-semibold ${
                                isOverdue ? 'text-rose-600 font-extrabold bg-rose-50 px-1 py-0.5 rounded' : 'text-slate-600'
                              }`}
                            >
                              {new Date(task.vencimento).toLocaleDateString('pt-BR')}
                            </span>
                            {isOverdue && (
                              <span className="block text-[9px] text-rose-500 font-extrabold uppercase mt-0.5">Atrasado</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Origem Badge */}
                      <td className="p-4">
                        <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide bg-slate-100 border border-slate-200 text-slate-600 rounded">
                          {task.tipoOrigem}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
