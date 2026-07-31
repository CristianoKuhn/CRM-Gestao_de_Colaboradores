/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { CapacidadeBiblioteca, CompetenciaBiblioteca } from '../../../../types';
import { Layers, Plus, Edit2, X, Save, Sparkles, Ban, CheckCircle2 } from 'lucide-react';

interface CapacidadesCompetenciasManagerProps {
  capacidades: CapacidadeBiblioteca[];
  competencias: CompetenciaBiblioteca[];
  onSalvarCapacidade: (capacidade: CapacidadeBiblioteca) => void | Promise<void>;
  onSalvarCompetencia: (competencia: CompetenciaBiblioteca) => void | Promise<void>;
  somenteLeitura?: boolean;
}

const CAPACIDADE_VAZIA: CapacidadeBiblioteca = { id: '', nome: '', descricao: '', ativo: true };

const COMPETENCIA_VAZIA = (capacidadeId?: string): CompetenciaBiblioteca => ({
  id: '',
  capacidadeId,
  nome: '',
  descricao: '',
  categoria: '',
  niveis: ['Não iniciado', 'Em desenvolvimento', 'Básico', 'Intermediário', 'Avançado', 'Especialista'],
  ativo: true,
});

const inputBase =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

const CapacidadesCompetenciasManager: React.FC<CapacidadesCompetenciasManagerProps> = ({
  capacidades,
  competencias,
  onSalvarCapacidade,
  onSalvarCompetencia,
  somenteLeitura,
}) => {
  const [editandoCapacidade, setEditandoCapacidade] = useState<CapacidadeBiblioteca | null>(null);
  const [editandoCompetencia, setEditandoCompetencia] = useState<CompetenciaBiblioteca | null>(null);
  const [novoNivel, setNovoNivel] = useState('');

  const salvarCapacidade = async () => {
    if (!editandoCapacidade || !editandoCapacidade.nome.trim()) return;
    await onSalvarCapacidade({
      ...editandoCapacidade,
      id: editandoCapacidade.id || `capacidade-${Date.now()}`,
    });
    setEditandoCapacidade(null);
  };

  const salvarCompetencia = async () => {
    if (!editandoCompetencia || !editandoCompetencia.nome.trim()) return;
    await onSalvarCompetencia({
      ...editandoCompetencia,
      id: editandoCompetencia.id || `competencia-${Date.now()}`,
    });
    setEditandoCompetencia(null);
    setNovoNivel('');
  };

  const capacidadesAtivas = capacidades.filter((c) => c.ativo);
  const semCapacidade = competencias.filter((c) => !c.capacidadeId);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-xs text-slate-400 max-w-lg">
          Capacidades agrupam Competências correlatas (ex.: "Comunicação" agrupa "Escuta ativa", "Clareza",
          "Didática"). É opcional — uma Competência pode existir sem Capacidade.
        </p>
        {!somenteLeitura && (
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setEditandoCapacidade(CAPACIDADE_VAZIA)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 transition-colors"
            >
              <Layers size={14} /> Nova capacidade
            </button>
            <button
              onClick={() => setEditandoCompetencia(COMPETENCIA_VAZIA())}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
            >
              <Plus size={14} /> Nova competência
            </button>
          </div>
        )}
      </div>

      {capacidades.length === 0 && competencias.length === 0 ? (
        <p className="text-sm text-slate-400 py-10 text-center bg-white rounded-3xl border border-slate-100">
          Nenhuma capacidade ou competência cadastrada ainda.
        </p>
      ) : (
        <div className="space-y-3">
          {capacidadesAtivas.map((cap) => {
            const filhas = competencias.filter((c) => c.capacidadeId === cap.id);
            return (
              <div key={cap.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                      <Layers size={16} />
                    </div>
                    <h4 className="font-bold text-slate-800 text-sm">{cap.nome}</h4>
                    {cap.descricao && <span className="text-xs text-slate-400">— {cap.descricao}</span>}
                  </div>
                  {!somenteLeitura && (
                    <button
                      onClick={() => setEditandoCapacidade(cap)}
                      className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
                      title="Editar capacidade"
                    >
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
                <CompetenciasLista
                  competencias={filhas}
                  onEditar={setEditandoCompetencia}
                  somenteLeitura={somenteLeitura}
                />
              </div>
            );
          })}

          {(semCapacidade.length > 0 || capacidadesAtivas.length === 0) && (
            <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center text-slate-500">
                  <Sparkles size={16} />
                </div>
                <h4 className="font-bold text-slate-800 text-sm">Sem capacidade definida</h4>
              </div>
              <CompetenciasLista
                competencias={semCapacidade}
                onEditar={setEditandoCompetencia}
                somenteLeitura={somenteLeitura}
              />
            </div>
          )}
        </div>
      )}

      {/* Modal: Capacidade */}
      {editandoCapacidade && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">
                {editandoCapacidade.id ? 'Editar capacidade' : 'Nova capacidade'}
              </h4>
              <button onClick={() => setEditandoCapacidade(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelBase}>Nome</label>
                <input
                  className={inputBase}
                  value={editandoCapacidade.nome}
                  onChange={(e) => setEditandoCapacidade({ ...editandoCapacidade, nome: e.target.value })}
                  placeholder="Ex.: Comunicação"
                />
              </div>
              <div>
                <label className={labelBase}>Descrição (opcional)</label>
                <textarea
                  className={inputBase}
                  rows={2}
                  value={editandoCapacidade.descricao || ''}
                  onChange={(e) => setEditandoCapacidade({ ...editandoCapacidade, descricao: e.target.value })}
                />
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={editandoCapacidade.ativo}
                  onChange={(e) => setEditandoCapacidade({ ...editandoCapacidade, ativo: e.target.checked })}
                />
                Capacidade ativa
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setEditandoCapacidade(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCapacidade}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700"
              >
                <Save size={15} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Competência */}
      {editandoCompetencia && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">
                {editandoCompetencia.id ? 'Editar competência' : 'Nova competência'}
              </h4>
              <button onClick={() => setEditandoCompetencia(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelBase}>Nome</label>
                <input
                  className={inputBase}
                  value={editandoCompetencia.nome}
                  onChange={(e) => setEditandoCompetencia({ ...editandoCompetencia, nome: e.target.value })}
                  placeholder="Ex.: Escuta ativa"
                />
              </div>
              <div>
                <label className={labelBase}>Capacidade (opcional)</label>
                <select
                  className={inputBase}
                  value={editandoCompetencia.capacidadeId || ''}
                  onChange={(e) =>
                    setEditandoCompetencia({ ...editandoCompetencia, capacidadeId: e.target.value || undefined })
                  }
                >
                  <option value="">Sem capacidade</option>
                  {capacidadesAtivas.map((cap) => (
                    <option key={cap.id} value={cap.id}>
                      {cap.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Categoria</label>
                  <input
                    className={inputBase}
                    value={editandoCompetencia.categoria || ''}
                    onChange={(e) => setEditandoCompetencia({ ...editandoCompetencia, categoria: e.target.value })}
                    placeholder="Técnica / Comportamental"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={editandoCompetencia.ativo}
                      onChange={(e) => setEditandoCompetencia({ ...editandoCompetencia, ativo: e.target.checked })}
                    />
                    Competência ativa
                  </label>
                </div>
              </div>
              <div>
                <label className={labelBase}>Descrição (opcional)</label>
                <textarea
                  className={inputBase}
                  rows={2}
                  value={editandoCompetencia.descricao || ''}
                  onChange={(e) => setEditandoCompetencia({ ...editandoCompetencia, descricao: e.target.value })}
                />
              </div>
              <div>
                <label className={labelBase}>Escala de níveis</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editandoCompetencia.niveis.map((nivel, idx) => (
                    <span
                      key={`${nivel}-${idx}`}
                      className="flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-full px-2.5 py-1"
                    >
                      {nivel}
                      <button
                        onClick={() =>
                          setEditandoCompetencia({
                            ...editandoCompetencia,
                            niveis: editandoCompetencia.niveis.filter((_, i) => i !== idx),
                          })
                        }
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <X size={11} />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className={inputBase}
                    value={novoNivel}
                    onChange={(e) => setNovoNivel(e.target.value)}
                    placeholder="Adicionar nível (ex.: Avançado)"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && novoNivel.trim()) {
                        setEditandoCompetencia({
                          ...editandoCompetencia,
                          niveis: [...editandoCompetencia.niveis, novoNivel.trim()],
                        });
                        setNovoNivel('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!novoNivel.trim()) return;
                      setEditandoCompetencia({
                        ...editandoCompetencia,
                        niveis: [...editandoCompetencia.niveis, novoNivel.trim()],
                      });
                      setNovoNivel('');
                    }}
                    className="px-3 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setEditandoCompetencia(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvarCompetencia}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700"
              >
                <Save size={15} /> Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

// Lista simples de competências dentro de uma capacidade (ou do bucket "sem capacidade").
// Sem botão de excluir de propósito — Competência nunca é deletada, só inativada
// (Princípio 6 da Especificação v2); a inativação acontece editando e desmarcando "ativa".
const CompetenciasLista: React.FC<{
  competencias: CompetenciaBiblioteca[];
  onEditar: (c: CompetenciaBiblioteca) => void;
  somenteLeitura?: boolean;
}> = ({ competencias, onEditar, somenteLeitura }) => {
  if (competencias.length === 0) {
    return <p className="text-xs text-slate-400 italic">Nenhuma competência aqui ainda.</p>;
  }
  return (
    <div className="grid sm:grid-cols-2 gap-2">
      {competencias.map((comp) => (
        <button
          key={comp.id}
          onClick={() => !somenteLeitura && onEditar(comp)}
          disabled={somenteLeitura}
          className={`text-left flex items-center justify-between gap-2 rounded-2xl border px-3 py-2 transition-colors ${
            comp.ativo
              ? 'border-slate-100 hover:border-teal-200 hover:bg-teal-50/40'
              : 'border-slate-100 bg-slate-50 opacity-60'
          }`}
        >
          <div className="min-w-0">
            <p className="text-sm font-semibold text-slate-700 truncate">{comp.nome}</p>
            <p className="text-[11px] text-slate-400 truncate">
              {comp.categoria || 'Sem categoria'} · {comp.niveis.length} níveis
            </p>
          </div>
          {comp.ativo ? (
            <CheckCircle2 size={15} className="text-teal-500 shrink-0" />
          ) : (
            <Ban size={15} className="text-slate-400 shrink-0" />
          )}
        </button>
      ))}
    </div>
  );
};

export default CapacidadesCompetenciasManager;
