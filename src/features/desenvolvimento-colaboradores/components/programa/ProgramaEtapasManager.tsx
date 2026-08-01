/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Programa,
  ProgramaEtapaTemplate,
  CompetenciaBiblioteca,
  MaterialBiblioteca,
  TipoItemPadraoEtapa,
  PrazoBaseEtapa,
} from '../../../../types';
import { ListOrdered, Plus, Edit2, Trash2, X, Save, ShieldCheck, GitBranch } from 'lucide-react';

interface ProgramaEtapasManagerProps {
  programa: Programa;
  etapas: ProgramaEtapaTemplate[];
  competencias: CompetenciaBiblioteca[];
  materiais: MaterialBiblioteca[];
  onSalvar: (etapa: ProgramaEtapaTemplate) => Promise<void>;
  onExcluir: (id: string) => Promise<void>;
  somenteLeitura?: boolean;
}

const TIPOS_ITEM: { valor: TipoItemPadraoEtapa; label: string }[] = [
  { valor: 'atividade', label: 'Atividade' },
  { valor: 'treinamento', label: 'Treinamento' },
  { valor: 'checklist', label: 'Checklist' },
];

const PRAZOS_BASE: { valor: PrazoBaseEtapa; label: string }[] = [
  { valor: 'admissao', label: 'A partir da admissão' },
  { valor: 'oferta', label: 'A partir do início da Oferta' },
  { valor: 'etapa_anterior', label: 'A partir da conclusão da etapa anterior' },
];

function etapaVazia(programaId: string, proximaOrdem: number): ProgramaEtapaTemplate {
  return {
    id: '',
    programaId,
    ordem: proximaOrdem,
    nome: '',
    objetivos: '',
    dependeDeIds: [],
    prazoDias: 10,
    prazoBase: 'admissao',
    competenciasAlvo: [],
    itensPadrao: [],
    materiaisIds: [],
    exigeEvidencia: false,
    exigeValidacaoEvidencia: false,
  };
}

const inputBase =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

// A dependência entre etapas é um grafo explícito (dependeDeIds), nunca um bloqueio
// binário fixo (Princípio 10 da Especificação v2) — por isso o seletor de dependência
// abaixo é multi-seleção de outras etapas do mesmo Programa, não um campo "anterior/próxima".
const ProgramaEtapasManager: React.FC<ProgramaEtapasManagerProps> = ({
  programa,
  etapas,
  competencias,
  materiais,
  onSalvar,
  onExcluir,
  somenteLeitura,
}) => {
  const [editando, setEditando] = useState<ProgramaEtapaTemplate | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [novoItemTitulo, setNovoItemTitulo] = useState('');
  const [novoItemTipo, setNovoItemTipo] = useState<TipoItemPadraoEtapa>('atividade');

  const etapasOrdenadas = [...etapas].sort((a, b) => a.ordem - b.ordem);
  const competenciasAtivas = competencias.filter((c) => c.ativo);

  const salvar = async () => {
    if (!editando || !editando.nome.trim()) return;
    setErroSalvar(null);
    try {
      await onSalvar({ ...editando, id: editando.id || `etapa-template-${Date.now()}` });
      setEditando(null);
    } catch (e: any) {
      setErroSalvar(
        e?.message || 'Este Programa já possui Ofertas publicadas; a estrutura de etapas não pode mais ser alterada.'
      );
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ListOrdered size={18} className="text-teal-500" />
          <h3 className="font-bold text-slate-800">Etapas de "{programa.nome}"</h3>
        </div>
        {!somenteLeitura && (
          <button
            onClick={() => {
              setErroSalvar(null);
              setEditando(etapaVazia(programa.id, etapasOrdenadas.length + 1));
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <Plus size={14} /> Nova etapa
          </button>
        )}
      </div>

      {etapasOrdenadas.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhuma etapa cadastrada para este programa ainda.</p>
      ) : (
        <div className="space-y-2">
          {etapasOrdenadas.map((etapa) => (
            <div key={etapa.id} className="rounded-2xl border border-slate-100 px-4 py-3 hover:border-slate-200 transition-colors">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 font-bold text-xs shrink-0">
                    {etapa.ordem}
                  </div>
                  <div className="min-w-0">
                    <p className="font-semibold text-sm text-slate-800 truncate">{etapa.nome}</p>
                    <p className="text-[11px] text-slate-400">
                      {etapa.itensPadrao.length} item(ns) · {etapa.competenciasAlvo.length} competência(s)-alvo
                      {etapa.exigeEvidencia && ' · exige evidência'}
                    </p>
                  </div>
                </div>
                {!somenteLeitura && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => {
                        setErroSalvar(null);
                        setEditando(etapa);
                      }}
                      className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors"
                      title="Editar"
                    >
                      <Edit2 size={14} />
                    </button>
                    {confirmandoExclusao === etapa.id ? (
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            onExcluir(etapa.id);
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
                        onClick={() => setConfirmandoExclusao(etapa.id)}
                        className="p-2 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    )}
                  </div>
                )}
              </div>
              {etapa.dependeDeIds.length > 0 && (
                <div className="flex items-center gap-1.5 mt-2 ml-11">
                  <GitBranch size={12} className="text-slate-400" />
                  <span className="text-[11px] text-slate-400">
                    Depende de:{' '}
                    {etapa.dependeDeIds
                      .map((id) => etapas.find((e) => e.id === id)?.nome || id)
                      .join(', ')}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">{editando.id ? 'Editar etapa' : 'Nova etapa'}</h4>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {erroSalvar && (
              <div className="text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">{erroSalvar}</div>
            )}

            <div className="space-y-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelBase}>Ordem</label>
                  <input
                    type="number"
                    className={inputBase}
                    value={editando.ordem}
                    onChange={(e) => setEditando({ ...editando, ordem: Number(e.target.value) })}
                  />
                </div>
                <div className="col-span-2">
                  <label className={labelBase}>Nome</label>
                  <input
                    className={inputBase}
                    value={editando.nome}
                    onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                    placeholder="Ex.: Primeiros 10 dias"
                  />
                </div>
              </div>
              <div>
                <label className={labelBase}>Objetivos (opcional)</label>
                <textarea
                  className={inputBase}
                  rows={2}
                  value={editando.objetivos || ''}
                  onChange={(e) => setEditando({ ...editando, objetivos: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Prazo (dias)</label>
                  <input
                    type="number"
                    className={inputBase}
                    value={editando.prazoDias ?? ''}
                    onChange={(e) => setEditando({ ...editando, prazoDias: Number(e.target.value) })}
                  />
                </div>
                <div>
                  <label className={labelBase}>Contado a partir de</label>
                  <select
                    className={inputBase}
                    value={editando.prazoBase}
                    onChange={(e) => setEditando({ ...editando, prazoBase: e.target.value as PrazoBaseEtapa })}
                  >
                    {PRAZOS_BASE.map((p) => (
                      <option key={p.valor} value={p.valor}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className={labelBase}>Depende de (outras etapas deste programa)</label>
                <div className="flex flex-wrap gap-1.5">
                  {etapasOrdenadas
                    .filter((e) => e.id && e.id !== editando.id)
                    .map((e) => {
                      const marcada = editando.dependeDeIds.includes(e.id);
                      return (
                        <button
                          key={e.id}
                          onClick={() =>
                            setEditando({
                              ...editando,
                              dependeDeIds: marcada
                                ? editando.dependeDeIds.filter((id) => id !== e.id)
                                : [...editando.dependeDeIds, e.id],
                            })
                          }
                          className={`text-[11px] font-semibold rounded-full px-2.5 py-1 transition-colors ${
                            marcada ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {e.nome}
                        </button>
                      );
                    })}
                  {etapasOrdenadas.filter((e) => e.id && e.id !== editando.id).length === 0 && (
                    <span className="text-xs text-slate-400 italic">Nenhuma outra etapa ainda para depender.</span>
                  )}
                </div>
              </div>

              <div>
                <label className={labelBase}>Competências-alvo</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {editando.competenciasAlvo.map((ca, idx) => {
                    const comp = competenciasAtivas.find((c) => c.id === ca.competenciaId);
                    return (
                      <span
                        key={`${ca.competenciaId}-${idx}`}
                        className="flex items-center gap-1 text-[11px] font-semibold bg-teal-50 text-teal-700 rounded-full px-2.5 py-1"
                      >
                        {comp?.nome || ca.competenciaId} → {ca.nivelAlvo}
                        <button
                          onClick={() =>
                            setEditando({
                              ...editando,
                              competenciasAlvo: editando.competenciasAlvo.filter((_, i) => i !== idx),
                            })
                          }
                          className="text-teal-400 hover:text-rose-500"
                        >
                          <X size={11} />
                        </button>
                      </span>
                    );
                  })}
                </div>
                {competenciasAtivas.length > 0 && (
                  <div className="flex gap-2">
                    <select
                      className={inputBase}
                      id="select-nova-competencia-alvo"
                      defaultValue={competenciasAtivas[0].id}
                    >
                      {competenciasAtivas.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nome}
                        </option>
                      ))}
                    </select>
                    <button
                      onClick={() => {
                        const select = document.getElementById('select-nova-competencia-alvo') as HTMLSelectElement | null;
                        const competenciaId = select?.value || competenciasAtivas[0].id;
                        const comp = competenciasAtivas.find((c) => c.id === competenciaId);
                        const nivelAlvo = comp?.niveis[comp.niveis.length - 1] || '';
                        setEditando({
                          ...editando,
                          competenciasAlvo: [...editando.competenciasAlvo, { competenciaId, nivelAlvo }],
                        });
                      }}
                      className="px-3 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 shrink-0"
                    >
                      <Plus size={14} />
                    </button>
                  </div>
                )}
              </div>

              <div>
                <label className={labelBase}>Itens padrão (atividades/treinamentos/checklist)</label>
                <div className="space-y-1 mb-2">
                  {editando.itensPadrao.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs bg-slate-50 rounded-xl px-3 py-1.5"
                    >
                      <span>
                        <span className="font-semibold text-slate-700">{item.titulo}</span>{' '}
                        <span className="text-slate-400">
                          ({TIPOS_ITEM.find((t) => t.valor === item.tipoItem)?.label})
                        </span>
                      </span>
                      <button
                        onClick={() =>
                          setEditando({ ...editando, itensPadrao: editando.itensPadrao.filter((_, i) => i !== idx) })
                        }
                        className="text-slate-400 hover:text-rose-500"
                      >
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="flex gap-2">
                  <select
                    className={inputBase + ' max-w-[140px]'}
                    value={novoItemTipo}
                    onChange={(e) => setNovoItemTipo(e.target.value as TipoItemPadraoEtapa)}
                  >
                    {TIPOS_ITEM.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                  <input
                    className={inputBase}
                    value={novoItemTitulo}
                    onChange={(e) => setNovoItemTitulo(e.target.value)}
                    placeholder="Título do item"
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && novoItemTitulo.trim()) {
                        setEditando({
                          ...editando,
                          itensPadrao: [...editando.itensPadrao, { titulo: novoItemTitulo.trim(), tipoItem: novoItemTipo }],
                        });
                        setNovoItemTitulo('');
                      }
                    }}
                  />
                  <button
                    onClick={() => {
                      if (!novoItemTitulo.trim()) return;
                      setEditando({
                        ...editando,
                        itensPadrao: [...editando.itensPadrao, { titulo: novoItemTitulo.trim(), tipoItem: novoItemTipo }],
                      });
                      setNovoItemTitulo('');
                    }}
                    className="px-3 rounded-xl text-sm font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 shrink-0"
                  >
                    <Plus size={14} />
                  </button>
                </div>
              </div>

              {materiais.length > 0 && (
                <div>
                  <label className={labelBase}>Materiais associados</label>
                  <div className="flex flex-wrap gap-1.5">
                    {materiais.map((m) => {
                      const marcado = editando.materiaisIds.includes(m.id);
                      return (
                        <button
                          key={m.id}
                          onClick={() =>
                            setEditando({
                              ...editando,
                              materiaisIds: marcado
                                ? editando.materiaisIds.filter((id) => id !== m.id)
                                : [...editando.materiaisIds, m.id],
                            })
                          }
                          className={`text-[11px] font-semibold rounded-full px-2.5 py-1 transition-colors ${
                            marcado ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                          }`}
                        >
                          {m.nome}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex items-center gap-4 pt-1">
                <label className="flex items-center gap-2 text-sm text-slate-600">
                  <input
                    type="checkbox"
                    checked={editando.exigeEvidencia}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        exigeEvidencia: e.target.checked,
                        exigeValidacaoEvidencia: e.target.checked ? editando.exigeValidacaoEvidencia : false,
                      })
                    }
                  />
                  Exige Evidência para concluir
                </label>
                {editando.exigeEvidencia && (
                  <label className="flex items-center gap-2 text-sm text-slate-600">
                    <input
                      type="checkbox"
                      checked={editando.exigeValidacaoEvidencia}
                      onChange={(e) => setEditando({ ...editando, exigeValidacaoEvidencia: e.target.checked })}
                    />
                    <ShieldCheck size={14} className="text-teal-500" /> Evidência precisa ser validada
                  </label>
                )}
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

export default ProgramaEtapasManager;
