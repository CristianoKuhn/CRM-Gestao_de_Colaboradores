/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Programa, Oferta, StatusOferta } from '../../../../types';
import { CalendarDays, Plus, X, Save, Ban, CheckCircle2, XCircle } from 'lucide-react';

interface OfertaManagerProps {
  programa: Programa;
  ofertas: Oferta[];
  onSalvar: (oferta: Oferta) => Promise<void>;
  onEncerrar: (id: string) => Promise<void>;
  onCancelar: (id: string) => Promise<void>;
  somenteLeitura?: boolean;
}

const STATUS_LABEL: Record<StatusOferta, { label: string; className: string }> = {
  aberta: { label: 'Aberta', className: 'bg-teal-50 text-teal-600' },
  encerrada: { label: 'Encerrada', className: 'bg-slate-100 text-slate-500' },
  cancelada: { label: 'Cancelada', className: 'bg-rose-50 text-rose-500' },
};

function ofertaVazia(programaId: string): Oferta {
  return { id: '', programaId, nome: '', dataInicio: new Date().toISOString().slice(0, 10), status: 'aberta' };
}

const inputBase =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

// Oferta é a publicação concreta e datada de um Programa — uma "turma"/edição
// (Princípio 20 da Especificação v2). É ela, nunca o Programa, que aceita
// Inscrições. Um Programa pode ter várias Ofertas abertas ao mesmo tempo.
const OfertaManager: React.FC<OfertaManagerProps> = ({ programa, ofertas, onSalvar, onEncerrar, onCancelar, somenteLeitura }) => {
  const [editando, setEditando] = useState<Oferta | null>(null);

  const salvar = async () => {
    if (!editando || !editando.nome.trim()) return;
    await onSalvar({ ...editando, id: editando.id || `oferta-${Date.now()}` });
    setEditando(null);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <CalendarDays size={18} className="text-teal-500" />
          <h3 className="font-bold text-slate-800">Ofertas de "{programa.nome}"</h3>
        </div>
        {!somenteLeitura && (
          <button
            onClick={() => setEditando(ofertaVazia(programa.id))}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <Plus size={14} /> Nova oferta
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-4 max-w-lg">
        Uma Oferta é uma turma/edição publicada deste Programa — é nela que as Inscrições acontecem. Pode haver
        várias Ofertas abertas ao mesmo tempo (ex.: "Turma Agosto" e "Turma Novembro").
      </p>

      {ofertas.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhuma Oferta publicada para este programa ainda.</p>
      ) : (
        <div className="space-y-2">
          {ofertas.map((oferta) => {
            const statusInfo = STATUS_LABEL[oferta.status];
            return (
              <div key={oferta.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 hover:border-slate-200 transition-colors">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-sm text-slate-800 truncate">{oferta.nome}</span>
                    <span className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${statusInfo.className}`}>
                      {statusInfo.label}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {oferta.dataInicio || '—'} {oferta.dataFim ? `até ${oferta.dataFim}` : ''}
                    {oferta.vagas ? ` · ${oferta.vagas} vaga(s)` : ''}
                  </p>
                </div>
                {!somenteLeitura && oferta.status === 'aberta' && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => onEncerrar(oferta.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1"
                      title="Encerrar oferta"
                    >
                      <CheckCircle2 size={12} /> Encerrar
                    </button>
                    <button
                      onClick={() => onCancelar(oferta.id)}
                      className="flex items-center gap-1 text-[11px] font-semibold text-rose-500 bg-rose-50 hover:bg-rose-100 rounded-lg px-2 py-1"
                      title="Cancelar oferta"
                    >
                      <XCircle size={12} /> Cancelar
                    </button>
                  </div>
                )}
                {oferta.status !== 'aberta' && (
                  <Ban size={14} className="text-slate-300 shrink-0" />
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
              <h4 className="font-bold text-slate-800">Nova oferta</h4>
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
                  placeholder="Ex.: Turma Agosto/2026"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Data de início</label>
                  <input
                    type="date"
                    className={inputBase}
                    value={editando.dataInicio || ''}
                    onChange={(e) => setEditando({ ...editando, dataInicio: e.target.value })}
                  />
                </div>
                <div>
                  <label className={labelBase}>Data de fim (opcional)</label>
                  <input
                    type="date"
                    className={inputBase}
                    value={editando.dataFim || ''}
                    onChange={(e) => setEditando({ ...editando, dataFim: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className={labelBase}>Vagas (opcional)</label>
                <input
                  type="number"
                  className={inputBase}
                  value={editando.vagas ?? ''}
                  onChange={(e) => setEditando({ ...editando, vagas: e.target.value ? Number(e.target.value) : undefined })}
                />
              </div>
            </div>
            <div className="flex items-center justify-end gap-2 mt-6">
              <button onClick={() => setEditando(null)} className="px-4 py-2 rounded-xl text-sm font-medium text-slate-500 hover:bg-slate-50">
                Cancelar
              </button>
              <button
                onClick={salvar}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700"
              >
                <Save size={15} /> Publicar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfertaManager;
