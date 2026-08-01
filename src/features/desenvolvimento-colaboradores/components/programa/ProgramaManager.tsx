/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  Programa,
  TipoPrograma,
  ModoEstruturaPrograma,
  TipoCriterioElegibilidade,
  AreaDesenvolvimento,
  Setor,
} from '../../../../types';
import { ClipboardList, Plus, Edit2, X, Save, Layers, AlertTriangle } from 'lucide-react';

interface ProgramaManagerProps {
  programas: Programa[];
  areas: AreaDesenvolvimento[];
  setores: Setor[];
  programaSelecionadoId: string | null;
  onSelecionarPrograma: (id: string) => void;
  onSalvar: (programa: Programa) => Promise<void>;
  somenteLeitura?: boolean;
}

const TIPOS_PROGRAMA: { valor: TipoPrograma; label: string }[] = [
  { valor: 'onboarding', label: 'Onboarding' },
  { valor: 'pdi', label: 'PDI' },
  { valor: 'lideranca', label: 'Formação de Liderança' },
  { valor: 'capacitacao', label: 'Capacitação' },
  { valor: 'certificacao', label: 'Certificação' },
  { valor: 'carreira', label: 'Plano de Carreira' },
  { valor: 'universidade', label: 'Universidade Corporativa' },
];

const MODOS_ESTRUTURA: { valor: ModoEstruturaPrograma; label: string; descricao: string }[] = [
  { valor: 'sequencial', label: 'Sequencial', descricao: 'Etapas com dependência entre si (ex.: Onboarding, Formação de Liderança)' },
  { valor: 'catalogo', label: 'Catálogo', descricao: 'Itens livres, sem ordem obrigatória (ex.: Universidade Corporativa)' },
  { valor: 'continuo', label: 'Contínuo', descricao: 'Sem data de término, revisado periodicamente (ex.: Plano de Carreira, PDI)' },
];

const CRITERIOS_ELEGIBILIDADE: { valor: TipoCriterioElegibilidade; label: string }[] = [
  { valor: 'automatico', label: 'Automático (por admissão no setor)' },
  { valor: 'indicacao', label: 'Indicação (gestor/líder aprova)' },
  { valor: 'autoinscricao', label: 'Autoinscrição livre' },
  { valor: 'gap_competencia', label: 'A partir de Gap de Competência' },
];

function programaVazio(): Programa {
  const familiaId = `programa-familia-${Date.now()}`;
  return {
    id: '',
    programaFamiliaId: familiaId,
    versao: 1,
    nome: '',
    descricao: '',
    tipoPrograma: 'onboarding',
    modoEstrutura: 'sequencial',
    criterioElegibilidade: { tipo: 'automatico' },
    ativo: true,
  };
}

const inputBase =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

// Programa é só o molde/definição — nunca é executado diretamente (Princípio 20 da
// Especificação v2). Uma vez com Oferta vinculada, o backend recusa a sobrescrita:
// este componente trata esse erro pedindo para criar uma nova versão em vez de
// deixar a mensagem crua do backend estourar sem contexto.
const ProgramaManager: React.FC<ProgramaManagerProps> = ({
  programas,
  areas,
  setores,
  programaSelecionadoId,
  onSelecionarPrograma,
  onSalvar,
  somenteLeitura,
}) => {
  const [editando, setEditando] = useState<Programa | null>(null);
  const [erroSalvar, setErroSalvar] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const programasAtivos = [...programas].filter((p) => p.ativo).sort((a, b) => a.nome.localeCompare(b.nome));

  const salvar = async () => {
    if (!editando || !editando.nome.trim()) return;
    setSalvando(true);
    setErroSalvar(null);
    try {
      await onSalvar({ ...editando, id: editando.id || `programa-${Date.now()}` });
      setEditando(null);
    } catch (e: any) {
      setErroSalvar(
        e?.message ||
          'Este Programa já possui Ofertas publicadas e não pode ser sobrescrito. Crie uma nova versão (novo Programa com o mesmo objetivo).'
      );
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <ClipboardList size={18} className="text-teal-500" />
          <h3 className="font-bold text-slate-800">Programas</h3>
        </div>
        {!somenteLeitura && (
          <button
            onClick={() => {
              setErroSalvar(null);
              setEditando(programaVazio());
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
          >
            <Plus size={14} /> Novo programa
          </button>
        )}
      </div>

      <p className="text-xs text-slate-400 mb-4 max-w-lg">
        Onboarding, PDI, Formação de Liderança, Capacitação, Certificação, Plano de Carreira e Universidade
        Corporativa são todos Programas — diferenciados só pelo Modo de Estrutura e pelo Critério de Elegibilidade.
      </p>

      {programasAtivos.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhum programa cadastrado ainda.</p>
      ) : (
        <div className="space-y-2">
          {programasAtivos.map((p) => {
            const area = areas.find((a) => a.id === p.areaDesenvolvimentoId);
            const selecionado = programaSelecionadoId === p.id;
            return (
              <button
                key={p.id}
                onClick={() => onSelecionarPrograma(p.id)}
                className={`w-full text-left flex items-center justify-between rounded-2xl border px-4 py-3 transition-colors ${
                  selecionado ? 'border-teal-300 bg-teal-50/50' : 'border-slate-100 hover:border-slate-200'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-teal-50 flex items-center justify-center text-teal-700 shrink-0">
                    <Layers size={16} />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-slate-800 truncate">{p.nome}</span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 rounded-full px-2 py-0.5">
                        {TIPOS_PROGRAMA.find((t) => t.valor === p.tipoPrograma)?.label}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
                        {MODOS_ESTRUTURA.find((m) => m.valor === p.modoEstrutura)?.label}
                      </span>
                      <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                        v{p.versao}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      {area?.nome || 'Sem área de desenvolvimento'} ·{' '}
                      {CRITERIOS_ELEGIBILIDADE.find((c) => c.valor === p.criterioElegibilidade?.tipo)?.label}
                    </p>
                  </div>
                </div>
                {!somenteLeitura && (
                  <span
                    onClick={(e) => {
                      e.stopPropagation();
                      setErroSalvar(null);
                      setEditando(p);
                    }}
                    className="p-2 rounded-lg text-slate-400 hover:text-teal-600 hover:bg-teal-50 transition-colors shrink-0"
                    title="Editar"
                  >
                    <Edit2 size={14} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {editando && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">{editando.id ? 'Editar programa' : 'Novo programa'}</h4>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            {erroSalvar && (
              <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2 mb-3">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" />
                {erroSalvar}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className={labelBase}>Nome</label>
                <input
                  className={inputBase}
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  placeholder="Ex.: Onboarding SAC"
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
                  <label className={labelBase}>Tipo de programa</label>
                  <select
                    className={inputBase}
                    value={editando.tipoPrograma}
                    onChange={(e) => setEditando({ ...editando, tipoPrograma: e.target.value as TipoPrograma })}
                  >
                    {TIPOS_PROGRAMA.map((t) => (
                      <option key={t.valor} value={t.valor}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelBase}>Área de desenvolvimento</label>
                  <select
                    className={inputBase}
                    value={editando.areaDesenvolvimentoId || ''}
                    onChange={(e) =>
                      setEditando({ ...editando, areaDesenvolvimentoId: e.target.value || undefined })
                    }
                  >
                    <option value="">Sem área</option>
                    {areas.map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.nome}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className={labelBase}>Modo de estrutura</label>
                <select
                  className={inputBase}
                  value={editando.modoEstrutura}
                  onChange={(e) => setEditando({ ...editando, modoEstrutura: e.target.value as ModoEstruturaPrograma })}
                >
                  {MODOS_ESTRUTURA.map((m) => (
                    <option key={m.valor} value={m.valor}>
                      {m.label}
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 mt-1">
                  {MODOS_ESTRUTURA.find((m) => m.valor === editando.modoEstrutura)?.descricao}
                </p>
              </div>
              <div>
                <label className={labelBase}>Critério de elegibilidade</label>
                <select
                  className={inputBase}
                  value={editando.criterioElegibilidade?.tipo || 'automatico'}
                  onChange={(e) =>
                    setEditando({
                      ...editando,
                      criterioElegibilidade: { tipo: e.target.value as TipoCriterioElegibilidade, regras: {} },
                    })
                  }
                >
                  {CRITERIOS_ELEGIBILIDADE.map((c) => (
                    <option key={c.valor} value={c.valor}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              {editando.criterioElegibilidade?.tipo === 'automatico' && (
                <div>
                  <label className={labelBase}>Setor que dispara a inscrição automática</label>
                  <select
                    className={inputBase}
                    value={(editando.criterioElegibilidade.regras?.setorId as string) || ''}
                    onChange={(e) =>
                      setEditando({
                        ...editando,
                        criterioElegibilidade: {
                          tipo: 'automatico',
                          regras: { setorId: e.target.value || undefined },
                        },
                      })
                    }
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
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={editando.ativo}
                  onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })}
                />
                Programa ativo
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
                disabled={salvando}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 disabled:opacity-60"
              >
                <Save size={15} /> {salvando ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProgramaManager;
