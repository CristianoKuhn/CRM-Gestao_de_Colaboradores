/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { TurnoPadrao, Setor, DiaSemana } from '../../../types';
import { Clock3, Plus, Edit2, Trash2, X, Save } from 'lucide-react';

interface TurnosPadraoManagerProps {
  empresaId: string;
  turnos: TurnoPadrao[];
  setores: Setor[];
  onSalvar: (turno: TurnoPadrao) => void | Promise<void>;
  onExcluir: (id: string) => void | Promise<void>;
  somenteLeitura?: boolean;
}

const DIAS_LABEL: Record<DiaSemana, string> = {
  0: 'Dom',
  1: 'Seg',
  2: 'Ter',
  3: 'Qua',
  4: 'Qui',
  5: 'Sex',
  6: 'Sáb',
};

const TURNO_VAZIO = (empresaId: string): TurnoPadrao => ({
  id: '',
  empresaId,
  nome: '',
  horaInicio: '08:00',
  horaFim: '16:00',
  diasSemana: [1, 2, 3, 4, 5, 6],
  ativo: true,
});

const TurnosPadraoManager: React.FC<TurnosPadraoManagerProps> = ({
  empresaId,
  turnos,
  setores,
  onSalvar,
  onExcluir,
  somenteLeitura,
}) => {
  const [editando, setEditando] = useState<TurnoPadrao | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);

  const inputBase =
    'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
  const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

  const alternarDia = (dia: DiaSemana) => {
    if (!editando) return;
    const jaTem = editando.diasSemana.includes(dia);
    setEditando({
      ...editando,
      diasSemana: jaTem ? editando.diasSemana.filter((d) => d !== dia) : [...editando.diasSemana, dia].sort(),
    });
  };

  const salvarEdicao = async () => {
    if (!editando || !editando.nome.trim()) return;
    const paraSalvar: TurnoPadrao = {
      ...editando,
      id: editando.id || `turno-${Date.now()}`,
    };
    await onSalvar(paraSalvar);
    setEditando(null);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Clock3 size={18} className="text-teal-500" />
          <h3 className="font-bold text-slate-800">Turnos padrão</h3>
        </div>
        {!somenteLeitura && (
          <button
            onClick={() => setEditando(TURNO_VAZIO(empresaId))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <Plus size={14} /> Novo turno
          </button>
        )}
      </div>

      {turnos.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhum turno padrão cadastrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {turnos.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 hover:border-slate-200 transition-colors"
            >
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-sm text-slate-800">{t.nome}</span>
                  {!t.ativo && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                      Inativo
                    </span>
                  )}
                  {t.setorId && (
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 rounded-full px-2 py-0.5">
                      {setores.find((s) => s.id === t.setorId)?.nome || 'Setor'}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-slate-500">
                    {t.horaInicio} – {t.horaFim}
                  </span>
                  <span className="text-xs text-slate-300">·</span>
                  <span className="text-xs text-slate-500">
                    {t.diasSemana
                      .slice()
                      .sort()
                      .map((d) => DIAS_LABEL[d])
                      .join(', ')}
                  </span>
                </div>
              </div>
              {!somenteLeitura && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditando(t)}
                    className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={15} />
                  </button>
                  {confirmandoExclusao === t.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onExcluir(t.id);
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
                      onClick={() => setConfirmandoExclusao(t.id)}
                      className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Modal de edição */}
      {editando && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">{editando.id ? 'Editar turno' : 'Novo turno'}</h4>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelBase}>Nome</label>
                <input
                  className={inputBase}
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  placeholder="Ex: Manhã, Fechamento…"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Início</label>
                  <input
                    type="time"
                    className={inputBase}
                    value={editando.horaInicio}
                    onChange={(e) => setEditando({ ...editando, horaInicio: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelBase}>Fim</label>
                  <input
                    type="time"
                    className={inputBase}
                    value={editando.horaFim}
                    onChange={(e) => setEditando({ ...editando, horaFim: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className={labelBase}>Dias da semana</label>
                <div className="flex gap-1.5 flex-wrap">
                  {([0, 1, 2, 3, 4, 5, 6] as DiaSemana[]).map((dia) => (
                    <button
                      key={dia}
                      type="button"
                      onClick={() => alternarDia(dia)}
                      className={`w-11 h-9 rounded-lg text-xs font-semibold transition-colors ${
                        editando.diasSemana.includes(dia)
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {DIAS_LABEL[dia]}
                    </button>
                  ))}
                </div>
              </div>
              {setores.length > 0 && (
                <div>
                  <label className={labelBase}>Setor (opcional)</label>
                  <select
                    className={inputBase}
                    value={editando.setorId || ''}
                    onChange={(e) => setEditando({ ...editando, setorId: e.target.value || undefined })}
                  >
                    <option value="">Todos os setores</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
              <label className="flex items-center gap-2 text-sm text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={editando.ativo}
                  onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Turno ativo
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
                onClick={salvarEdicao}
                disabled={!editando.nome.trim() || editando.diasSemana.length === 0}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-50"
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

export default TurnosPadraoManager;
