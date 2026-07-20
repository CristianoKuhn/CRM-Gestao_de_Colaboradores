/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RegraCobertura, Setor, Cargo } from '../../../types';
import { ShieldCheck, Plus, Edit2, Trash2, X, Save } from 'lucide-react';

interface RegrasCoberturaManagerProps {
  empresaId: string;
  regras: RegraCobertura[];
  setores: Setor[];
  cargos: Cargo[];
  onSalvar: (regra: RegraCobertura) => void | Promise<void>;
  onExcluir: (id: string) => void | Promise<void>;
  somenteLeitura?: boolean;
}

const REGRA_VAZIA = (empresaId: string): RegraCobertura => ({
  id: '',
  empresaId,
  diaSemana: 'todos',
  horaInicio: '18:00',
  horaFim: '24:00',
  quantidadeMinima: 1,
  prioridade: 5,
});

function rotuloDia(diaSemana: RegraCobertura['diaSemana']): string {
  if (diaSemana === 'todos') return 'Seg-sáb';
  if (diaSemana === 'domingo' || diaSemana === 0) return 'Domingo';
  const nomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  return nomes[diaSemana] || String(diaSemana);
}

const RegrasCoberturaManager: React.FC<RegrasCoberturaManagerProps> = ({
  empresaId,
  regras,
  setores,
  cargos,
  onSalvar,
  onExcluir,
  somenteLeitura,
}) => {
  const [editando, setEditando] = useState<RegraCobertura | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);

  const inputBase =
    'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
  const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

  const salvarEdicao = async () => {
    if (!editando) return;
    const paraSalvar: RegraCobertura = {
      ...editando,
      id: editando.id || `regra-cobertura-${Date.now()}`,
    };
    await onSalvar(paraSalvar);
    setEditando(null);
  };

  const regrasOrdenadas = [...regras].sort((a, b) => b.prioridade - a.prioridade);

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ShieldCheck size={18} className="text-teal-500" />
          <h3 className="font-bold text-slate-800">Regras de cobertura mínima</h3>
        </div>
        {!somenteLeitura && (
          <button
            onClick={() => setEditando(REGRA_VAZIA(empresaId))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <Plus size={14} /> Nova regra
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-4">
        Quando duas regras cobrem a mesma janela, a de <strong>maior prioridade</strong> prevalece — por isso a regra
        de fechamento (ex: "após 22h, no mínimo 1") costuma ter prioridade mais alta que a de pico (ex: "após 18h, no
        mínimo 6").
      </p>

      {regrasOrdenadas.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhuma regra de cobertura cadastrada ainda.</p>
      ) : (
        <div className="space-y-2">
          {regrasOrdenadas.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 hover:border-slate-200 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 font-bold text-sm">
                  {r.quantidadeMinima}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-slate-800">{rotuloDia(r.diaSemana)}</span>
                    <span className="text-xs text-slate-400">
                      {r.horaInicio} – {r.horaFim}
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5 mt-1">
                    {r.setorId && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 rounded-full px-2 py-0.5">
                        {setores.find((s) => s.id === r.setorId)?.nome || 'Setor'}
                      </span>
                    )}
                    {r.cargoId && (
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
                        {cargos.find((c) => c.id === r.cargoId)?.nome || 'Cargo'}
                      </span>
                    )}
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                      prioridade {r.prioridade}
                    </span>
                  </div>
                </div>
              </div>
              {!somenteLeitura && (
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setEditando(r)}
                    className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                    title="Editar"
                  >
                    <Edit2 size={15} />
                  </button>
                  {confirmandoExclusao === r.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => {
                          onExcluir(r.id);
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
                      onClick={() => setConfirmandoExclusao(r.id)}
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
              <h4 className="font-bold text-slate-800">{editando.id ? 'Editar regra' : 'Nova regra de cobertura'}</h4>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelBase}>Quando vale</label>
                <select
                  className={inputBase}
                  value={editando.diaSemana === 'todos' ? 'todos' : String(editando.diaSemana)}
                  onChange={(e) => {
                    const v = e.target.value;
                    setEditando({
                      ...editando,
                      diaSemana: v === 'todos' ? 'todos' : (Number(v) as RegraCobertura['diaSemana']),
                    });
                  }}
                >
                  <option value="todos">Todos os dias (seg-sáb)</option>
                  <option value="0">Domingo</option>
                  <option value="1">Segunda</option>
                  <option value="2">Terça</option>
                  <option value="3">Quarta</option>
                  <option value="4">Quinta</option>
                  <option value="5">Sexta</option>
                  <option value="6">Sábado</option>
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>A partir de</label>
                  <input
                    type="time"
                    className={inputBase}
                    value={editando.horaInicio}
                    onChange={(e) => setEditando({ ...editando, horaInicio: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelBase}>Até</label>
                  <input
                    type="time"
                    className={inputBase}
                    value={editando.horaFim}
                    onChange={(e) => setEditando({ ...editando, horaFim: e.target.value })}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Quantidade mínima</label>
                  <input
                    type="number"
                    min={0}
                    className={inputBase}
                    value={editando.quantidadeMinima}
                    onChange={(e) => setEditando({ ...editando, quantidadeMinima: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelBase}>Prioridade</label>
                  <input
                    type="number"
                    min={0}
                    className={inputBase}
                    value={editando.prioridade}
                    onChange={(e) => setEditando({ ...editando, prioridade: Number(e.target.value) })}
                  />
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
              {cargos.length > 0 && (
                <div>
                  <label className={labelBase}>Cargo (opcional)</label>
                  <select
                    className={inputBase}
                    value={editando.cargoId || ''}
                    onChange={(e) => setEditando({ ...editando, cargoId: e.target.value || undefined })}
                  >
                    <option value="">Todos os cargos</option>
                    {cargos.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
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

export default RegrasCoberturaManager;
