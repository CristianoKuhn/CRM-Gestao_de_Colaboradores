/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Cargo, CompetenciaBiblioteca, MatrizCompetenciaCargo } from '../../../../types';
import { Target, Plus, Trash2, X, Save } from 'lucide-react';

interface MatrizCompetenciasCargoManagerProps {
  cargos: Cargo[];
  competencias: CompetenciaBiblioteca[];
  matriz: MatrizCompetenciaCargo[];
  onSalvar: (item: MatrizCompetenciaCargo) => void | Promise<void>;
  onExcluir: (id: string) => void | Promise<void>;
  somenteLeitura?: boolean;
}

const inputBase =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

const MatrizCompetenciasCargoManager: React.FC<MatrizCompetenciasCargoManagerProps> = ({
  cargos,
  competencias,
  matriz,
  onSalvar,
  onExcluir,
  somenteLeitura,
}) => {
  const [cargoSelecionadoId, setCargoSelecionadoId] = useState<string>(cargos[0]?.id || '');
  const [editando, setEditando] = useState<MatrizCompetenciaCargo | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);

  const competenciasAtivas = competencias.filter((c) => c.ativo);
  const itensDoCargo = matriz.filter((m) => m.cargoId === cargoSelecionadoId);

  const iniciarNovo = () => {
    if (!cargoSelecionadoId || competenciasAtivas.length === 0) return;
    setEditando({
      id: '',
      cargoId: cargoSelecionadoId,
      competenciaId: competenciasAtivas[0].id,
      nivelAlvo: competenciasAtivas[0].niveis[competenciasAtivas[0].niveis.length - 1] || '',
      obrigatorio: true,
    });
  };

  const salvar = async () => {
    if (!editando) return;
    await onSalvar({ ...editando, id: editando.id || `matriz-${Date.now()}` });
    setEditando(null);
  };

  const competenciaSelecionada = competenciasAtivas.find((c) => c.id === editando?.competenciaId);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <Target size={18} className="text-teal-500" />
          <h3 className="font-bold text-slate-800">Matriz de Competências por Cargo</h3>
        </div>
        {!somenteLeitura && (
          <button
            onClick={iniciarNovo}
            disabled={!cargoSelecionadoId || competenciasAtivas.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
          >
            <Plus size={14} /> Nova exigência
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-4 max-w-lg">
        Define o perfil-alvo de cada Cargo — quais Competências e em qual Nível são esperadas. É a base para calcular
        o Gap de Competência de cada colaborador.
      </p>

      <div className="mb-4">
        <label className={labelBase}>Cargo</label>
        <select className={inputBase + ' max-w-xs'} value={cargoSelecionadoId} onChange={(e) => setCargoSelecionadoId(e.target.value)}>
          {cargos.map((c) => (
            <option key={c.id} value={c.id}>
              {c.nome}
            </option>
          ))}
        </select>
      </div>

      {itensDoCargo.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">
          Nenhuma exigência de competência cadastrada para este cargo ainda.
        </p>
      ) : (
        <div className="space-y-2">
          {itensDoCargo.map((item) => {
            const comp = competencias.find((c) => c.id === item.competenciaId);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 hover:border-slate-200 transition-colors"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">{comp?.nome || 'Competência removida'}</span>
                    {item.obrigatorio && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-600 bg-rose-50 rounded-full px-2 py-0.5">
                        obrigatória
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">Nível alvo: {item.nivelAlvo}</p>
                </div>
                {!somenteLeitura && (
                  <div className="flex items-center gap-1">
                    {confirmandoExclusao === item.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onExcluir(item.id);
                            setConfirmandoExclusao(null);
                          }}
                          className="text-[11px] font-semibold text-white bg-rose-500 hover:bg-rose-600 rounded-lg px-2 py-1"
                        >
                          Confirmar
                        </button>
                        <button
                          onClick={() => setConfirmandoExclusao(null)}
                          className="text-[11px] font-semibold text-slate-500 hover:bg-slate-100 rounded-lg px-2 py-1"
                        >
                          Cancelar
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setConfirmandoExclusao(item.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Remover"
                      >
                        <Trash2 size={15} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">Nova exigência de competência</h4>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelBase}>Competência</label>
                <select
                  className={inputBase}
                  value={editando.competenciaId}
                  onChange={(e) => {
                    const comp = competenciasAtivas.find((c) => c.id === e.target.value);
                    setEditando({
                      ...editando,
                      competenciaId: e.target.value,
                      nivelAlvo: comp?.niveis[comp.niveis.length - 1] || '',
                    });
                  }}
                >
                  {competenciasAtivas.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelBase}>Nível alvo</label>
                <select
                  className={inputBase}
                  value={editando.nivelAlvo}
                  onChange={(e) => setEditando({ ...editando, nivelAlvo: e.target.value })}
                >
                  {(competenciaSelecionada?.niveis || []).map((nivel) => (
                    <option key={nivel} value={nivel}>
                      {nivel}
                    </option>
                  ))}
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={editando.obrigatorio}
                  onChange={(e) => setEditando({ ...editando, obrigatorio: e.target.checked })}
                />
                Obrigatória para o cargo
              </label>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button
                onClick={() => setEditando(null)}
                className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50"
              >
                Cancelar
              </button>
              <button
                onClick={salvar}
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

export default MatrizCompetenciasCargoManager;
