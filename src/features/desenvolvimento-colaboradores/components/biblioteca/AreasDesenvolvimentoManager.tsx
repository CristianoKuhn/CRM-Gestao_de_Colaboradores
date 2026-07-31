/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AreaDesenvolvimento } from '../../../../types';
import { FolderTree, Plus, Edit2, Trash2, X, Save, AlertTriangle } from 'lucide-react';

interface AreasDesenvolvimentoManagerProps {
  areas: AreaDesenvolvimento[];
  onSalvar: (area: AreaDesenvolvimento) => void | Promise<void>;
  onExcluir: (id: string) => void | Promise<void>;
  somenteLeitura?: boolean;
}

const AREA_VAZIA = (areaPaiId?: string): AreaDesenvolvimento => ({
  id: '',
  areaPaiId,
  nome: '',
  descricao: '',
  ordem: 0,
  ativo: true,
});

const inputBase =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

// Puramente organizacional/de navegação (Princípio 22) — nunca participa do fluxo de
// eventos nem altera o Perfil. Serve só para agrupar Programas (ex.: Universidade
// Corporativa → Academia Comercial → Programa "Negociação").
const AreasDesenvolvimentoManager: React.FC<AreasDesenvolvimentoManagerProps> = ({
  areas,
  onSalvar,
  onExcluir,
  somenteLeitura,
}) => {
  const [editando, setEditando] = useState<AreaDesenvolvimento | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [erroExclusao, setErroExclusao] = useState<string | null>(null);

  const raizes = [...areas]
    .filter((a) => !a.areaPaiId)
    .sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const filhasDe = (id: string) =>
    [...areas].filter((a) => a.areaPaiId === id).sort((a, b) => (a.ordem ?? 0) - (b.ordem ?? 0));

  const temFilhas = (id: string) => areas.some((a) => a.areaPaiId === id);

  const salvar = async () => {
    if (!editando || !editando.nome.trim()) return;
    await onSalvar({ ...editando, id: editando.id || `area-dev-${Date.now()}` });
    setEditando(null);
  };

  const tentarExcluir = (area: AreaDesenvolvimento) => {
    if (temFilhas(area.id)) {
      setErroExclusao(area.id);
      return;
    }
    setConfirmandoExclusao(area.id);
  };

  const renderArea = (area: AreaDesenvolvimento, nivel: number) => (
    <div key={area.id} style={{ marginLeft: nivel * 20 }}>
      <div
        className={`flex items-center justify-between rounded-2xl border px-4 py-3 mb-2 transition-colors ${
          area.ativo ? 'border-slate-100 hover:border-slate-200' : 'border-slate-100 bg-slate-50 opacity-60'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
            <FolderTree size={15} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-sm text-slate-800 truncate">{area.nome}</p>
            {area.descricao && <p className="text-xs text-slate-400 truncate">{area.descricao}</p>}
          </div>
        </div>
        {!somenteLeitura && (
          <div className="flex items-center gap-1 shrink-0">
            <button
              onClick={() => setEditando(AREA_VAZIA(area.id))}
              className="p-2 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors"
              title="Nova subárea"
            >
              <Plus size={14} />
            </button>
            <button
              onClick={() => setEditando(area)}
              className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
              title="Editar"
            >
              <Edit2 size={14} />
            </button>
            {confirmandoExclusao === area.id ? (
              <div className="flex items-center gap-1">
                <button
                  onClick={() => {
                    onExcluir(area.id);
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
                onClick={() => tentarExcluir(area)}
                className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                title="Remover"
              >
                <Trash2 size={14} />
              </button>
            )}
          </div>
        )}
      </div>
      {erroExclusao === area.id && (
        <div className="flex items-center gap-1.5 text-[11px] text-amber-700 bg-amber-50 rounded-xl px-3 py-1.5 mb-2 -mt-1">
          <AlertTriangle size={12} />
          Esta área tem subáreas vinculadas e não pode ser removida.
          <button onClick={() => setErroExclusao(null)} className="ml-auto text-amber-500 hover:text-amber-700">
            <X size={12} />
          </button>
        </div>
      )}
      {filhasDe(area.id).map((filha) => renderArea(filha, nivel + 1))}
    </div>
  );

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <FolderTree size={18} className="text-teal-500" />
          <h3 className="font-bold text-slate-800">Áreas de Desenvolvimento</h3>
        </div>
        {!somenteLeitura && (
          <button
            onClick={() => setEditando(AREA_VAZIA())}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <Plus size={14} /> Nova área raiz
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-4 max-w-lg">
        Agrupa Programas para navegação e relatórios (ex.: "Universidade Corporativa" → "Academia Comercial" →
        Programa "Negociação"). Puramente organizacional — não altera o Perfil de ninguém.
      </p>

      {raizes.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhuma área de desenvolvimento cadastrada ainda.</p>
      ) : (
        <div>{raizes.map((area) => renderArea(area, 0))}</div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-md w-full p-6 border border-slate-100">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">
                {editando.id ? 'Editar área' : editando.areaPaiId ? 'Nova subárea' : 'Nova área raiz'}
              </h4>
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
                  placeholder="Ex.: Universidade Corporativa"
                />
              </div>
              <div>
                <label className={labelBase}>Descrição (opcional)</label>
                <textarea
                  className={inputBase}
                  rows={2}
                  value={editando.descricao || ''}
                  onChange={(e) => setEditando({ ...editando, descricao: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Ordem</label>
                  <input
                    type="number"
                    className={inputBase}
                    value={editando.ordem ?? 0}
                    onChange={(e) => setEditando({ ...editando, ordem: Number(e.target.value) })}
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={editando.ativo}
                      onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })}
                    />
                    Área ativa
                  </label>
                </div>
              </div>
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

export default AreasDesenvolvimentoManager;
