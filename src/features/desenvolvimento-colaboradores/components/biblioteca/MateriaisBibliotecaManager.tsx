/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { MaterialBiblioteca, TipoMaterialBiblioteca } from '../../../../types';
import { BookOpen, Plus, Edit2, Trash2, X, Save, FileText, Video, ClipboardList, GraduationCap, File } from 'lucide-react';

interface MateriaisBibliotecaManagerProps {
  materiais: MaterialBiblioteca[];
  onSalvar: (material: MaterialBiblioteca) => void | Promise<void>;
  onExcluir: (id: string) => void | Promise<void>;
  somenteLeitura?: boolean;
}

const TIPOS: { valor: TipoMaterialBiblioteca; label: string; icon: React.ElementType }[] = [
  { valor: 'material', label: 'Material', icon: FileText },
  { valor: 'curso', label: 'Curso', icon: GraduationCap },
  { valor: 'modelo', label: 'Modelo/Template', icon: ClipboardList },
  { valor: 'documento', label: 'Documento', icon: File },
  { valor: 'video', label: 'Vídeo', icon: Video },
  { valor: 'playbook', label: 'Playbook', icon: BookOpen },
];

const MATERIAL_VAZIO: MaterialBiblioteca = {
  id: '',
  tipo: 'material',
  nome: '',
  descricao: '',
  url: '',
  tags: [],
  ativo: true,
};

const inputBase =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

const MateriaisBibliotecaManager: React.FC<MateriaisBibliotecaManagerProps> = ({
  materiais,
  onSalvar,
  onExcluir,
  somenteLeitura,
}) => {
  const [editando, setEditando] = useState<MaterialBiblioteca | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [filtroTipo, setFiltroTipo] = useState<TipoMaterialBiblioteca | 'todos'>('todos');
  const [novaTag, setNovaTag] = useState('');

  const salvarEdicao = async () => {
    if (!editando || !editando.nome.trim()) return;
    await onSalvar({ ...editando, id: editando.id || `material-${Date.now()}` });
    setEditando(null);
    setNovaTag('');
  };

  const materiaisFiltrados = filtroTipo === 'todos' ? materiais : materiais.filter((m) => m.tipo === filtroTipo);

  const iconePara = (tipo: TipoMaterialBiblioteca) => TIPOS.find((t) => t.valor === tipo)?.icon || FileText;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <BookOpen size={18} className="text-teal-500" />
          <h3 className="font-bold text-slate-800">Materiais da Biblioteca</h3>
        </div>
        {!somenteLeitura && (
          <button
            onClick={() => setEditando(MATERIAL_VAZIO)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <Plus size={14} /> Novo material
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-4 max-w-lg">
        Materiais, cursos, modelos, documentos, vídeos e playbooks ficam aqui — reutilizáveis por qualquer Programa,
        em vez de cadastrados de novo a cada iniciativa.
      </p>

      <div className="flex flex-wrap gap-1.5 mb-4">
        <button
          onClick={() => setFiltroTipo('todos')}
          className={`text-xs font-semibold rounded-full px-3 py-1 transition-colors ${
            filtroTipo === 'todos' ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
          }`}
        >
          Todos
        </button>
        {TIPOS.map((t) => (
          <button
            key={t.valor}
            onClick={() => setFiltroTipo(t.valor)}
            className={`text-xs font-semibold rounded-full px-3 py-1 transition-colors ${
              filtroTipo === t.valor ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {materiaisFiltrados.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhum material cadastrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {materiaisFiltrados.map((m) => {
            const Icone = iconePara(m.tipo);
            return (
              <div
                key={m.id}
                className={`flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors ${
                  m.ativo ? 'border-slate-100 hover:border-slate-200' : 'border-slate-100 bg-slate-50 opacity-60'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
                    <Icone size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-slate-800 truncate">{m.nome}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 rounded-full px-2 py-0.5 shrink-0">
                        {TIPOS.find((t) => t.valor === m.tipo)?.label}
                      </span>
                    </div>
                    {m.descricao && <p className="text-xs text-slate-400 truncate">{m.descricao}</p>}
                  </div>
                </div>
                {!somenteLeitura && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => setEditando(m)}
                      className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={15} />
                    </button>
                    {confirmandoExclusao === m.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onExcluir(m.id);
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
                        onClick={() => setConfirmandoExclusao(m.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Excluir"
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
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">{editando.id ? 'Editar material' : 'Novo material'}</h4>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className={labelBase}>Tipo</label>
                <select
                  className={inputBase}
                  value={editando.tipo}
                  onChange={(e) => setEditando({ ...editando, tipo: e.target.value as TipoMaterialBiblioteca })}
                >
                  {TIPOS.map((t) => (
                    <option key={t.valor} value={t.valor}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelBase}>Nome</label>
                <input
                  className={inputBase}
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
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
              <div>
                <label className={labelBase}>Link (opcional)</label>
                <input
                  className={inputBase}
                  value={editando.url || ''}
                  onChange={(e) => setEditando({ ...editando, url: e.target.value })}
                  placeholder="https://..."
                />
              </div>
              <div>
                <label className={labelBase}>Tags</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {(editando.tags || []).map((tag, idx) => (
                    <span
                      key={`${tag}-${idx}`}
                      className="flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-600 rounded-full px-2.5 py-1"
                    >
                      {tag}
                      <button
                        onClick={() =>
                          setEditando({ ...editando, tags: (editando.tags || []).filter((_, i) => i !== idx) })
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
                    value={novaTag}
                    onChange={(e) => setNovaTag(e.target.value)}
                    placeholder="Adicionar tag"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && novaTag.trim()) {
                        setEditando({ ...editando, tags: [...(editando.tags || []), novaTag.trim()] });
                        setNovaTag('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!novaTag.trim()) return;
                      setEditando({ ...editando, tags: [...(editando.tags || []), novaTag.trim()] });
                      setNovaTag('');
                    }}
                    className="px-3 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={editando.ativo}
                  onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })}
                />
                Material ativo
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

export default MateriaisBibliotecaManager;
