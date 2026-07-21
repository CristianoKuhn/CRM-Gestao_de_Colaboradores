/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Gestão de Rotinas Operacionais (Módulo 2 da Escala Inteligente).
// Uma rotina é a unidade de cobertura obrigatória/recomendada de um setor para um
// tipo de dia (semana / sábado / domingo / feriado). O motor de geração de escala
// cobre as rotinas primeiro e só depois distribui os colaboradores restantes —
// ver ARQUITETURA_ESCALA_MODULO2.md, seção "Ordem de geração".

import React, { useMemo, useState } from 'react';
import { RotinaOperacional, PrioridadeRotina, TipoDiaRotina, Setor, Cargo } from '../../../types';
import { ListChecks, Plus, Edit2, Trash2, X, Save } from 'lucide-react';

interface RotinasOperacionaisManagerProps {
  empresaId: string;
  rotinas: RotinaOperacional[];
  setores: Setor[];
  cargos: Cargo[];
  onSalvar: (rotina: RotinaOperacional) => void | Promise<void>;
  onExcluir: (id: string) => void | Promise<void>;
  somenteLeitura?: boolean;
}

const TIPO_DIA_LABEL: Record<TipoDiaRotina, string> = {
  semana: 'Segunda a sexta',
  sabado: 'Sábado',
  domingo: 'Domingo',
  feriado: 'Feriado',
};

const PRIORIDADE_LABEL: Record<PrioridadeRotina, string> = {
  alta: 'Alta',
  media: 'Média',
  baixa: 'Baixa',
};

const PRIORIDADE_ESTILO: Record<PrioridadeRotina, string> = {
  alta: 'text-rose-700 bg-rose-50',
  media: 'text-amber-700 bg-amber-50',
  baixa: 'text-slate-500 bg-slate-100',
};

const ROTINA_VAZIA = (empresaId: string, setorId: string): RotinaOperacional => ({
  id: '',
  empresaId,
  setorId,
  nome: '',
  tipoDia: 'semana',
  horaInicio: '08:00',
  horaFim: '18:00',
  quantidadeMinima: 1,
  cargosPermitidos: [],
  prioridade: 'media',
  obrigatoria: true,
  ativo: true,
});

const RotinasOperacionaisManager: React.FC<RotinasOperacionaisManagerProps> = ({
  empresaId,
  rotinas,
  setores,
  cargos,
  onSalvar,
  onExcluir,
  somenteLeitura,
}) => {
  const [editando, setEditando] = useState<RotinaOperacional | null>(null);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState<string | null>(null);
  const [filtroSetor, setFiltroSetor] = useState<string>('');

  const inputBase =
    'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
  const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

  const rotinasFiltradas = useMemo(
    () => (filtroSetor ? rotinas.filter((r) => r.setorId === filtroSetor) : rotinas),
    [rotinas, filtroSetor]
  );

  // Agrupadas por setor para ficar fácil enxergar se cada setor já cobriu os
  // 3-4 tipos de dia recomendados pelo pedido original (seg-sex / sáb / dom / feriado opcional).
  const rotinasPorSetor = useMemo(() => {
    const grupos = new Map<string, RotinaOperacional[]>();
    rotinasFiltradas.forEach((r) => {
      const lista = grupos.get(r.setorId) || [];
      lista.push(r);
      grupos.set(r.setorId, lista);
    });
    return grupos;
  }, [rotinasFiltradas]);

  const nomeSetor = (setorId: string) => setores.find((s) => s.id === setorId)?.nome || 'Setor não definido';
  const nomeCargo = (cargoId: string) => cargos.find((c) => c.id === cargoId)?.nome || cargoId;

  const alternarCargo = (cargoId: string) => {
    if (!editando) return;
    const jaTem = editando.cargosPermitidos.includes(cargoId);
    setEditando({
      ...editando,
      cargosPermitidos: jaTem
        ? editando.cargosPermitidos.filter((c) => c !== cargoId)
        : [...editando.cargosPermitidos, cargoId],
    });
  };

  const salvarEdicao = async () => {
    if (!editando || !editando.nome.trim() || !editando.setorId) return;
    const paraSalvar: RotinaOperacional = {
      ...editando,
      id: editando.id || `rotina-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    };
    await onSalvar(paraSalvar);
    setEditando(null);
  };

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
        <div className="flex items-center gap-2">
          <ListChecks size={18} className="text-teal-500" />
          <div>
            <h3 className="font-bold text-slate-800">Rotinas operacionais</h3>
            <p className="text-xs text-slate-400">
              A cobertura obrigatória de cada setor, por tipo de dia. A geração da escala preenche estas rotinas
              antes de distribuir o restante dos colaboradores.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {setores.length > 0 && (
            <select
              className="px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
              value={filtroSetor}
              onChange={(e) => setFiltroSetor(e.target.value)}
            >
              <option value="">Todos os setores</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.nome}
                </option>
              ))}
            </select>
          )}
          {!somenteLeitura && (
            <button
              onClick={() => setEditando(ROTINA_VAZIA(empresaId, filtroSetor || setores[0]?.id || ''))}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors"
            >
              <Plus size={14} /> Nova rotina
            </button>
          )}
        </div>
      </div>

      {rotinasFiltradas.length === 0 ? (
        <p className="text-sm text-slate-400 py-6 text-center">Nenhuma rotina operacional cadastrada ainda.</p>
      ) : (
        <div className="space-y-5">
          {Array.from(rotinasPorSetor.entries()).map(([setorId, lista]) => (
            <div key={setorId}>
              <h4 className="text-xs font-bold uppercase tracking-wide text-slate-400 mb-2">{nomeSetor(setorId)}</h4>
              <div className="space-y-2">
                {lista.map((r) => (
                  <div
                    key={r.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3 hover:border-slate-200 transition-colors"
                  >
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-sm text-slate-800">{r.nome}</span>
                        <span className="text-[10px] font-semibold uppercase tracking-wide text-teal-600 bg-teal-50 rounded-full px-2 py-0.5">
                          {TIPO_DIA_LABEL[r.tipoDia]}
                        </span>
                        <span
                          className={`text-[10px] font-semibold uppercase tracking-wide rounded-full px-2 py-0.5 ${PRIORIDADE_ESTILO[r.prioridade]}`}
                        >
                          {PRIORIDADE_LABEL[r.prioridade]}
                        </span>
                        {r.obrigatoria ? (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-rose-700 bg-rose-50 rounded-full px-2 py-0.5">
                            Obrigatória
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 bg-slate-100 rounded-full px-2 py-0.5">
                            Opcional
                          </span>
                        )}
                        {!r.ativo && (
                          <span className="text-[10px] font-semibold uppercase tracking-wide text-slate-400 bg-slate-100 rounded-full px-2 py-0.5">
                            Inativa
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-1 flex-wrap">
                        <span className="text-xs text-slate-500">
                          {r.horaInicio} – {r.horaFim}
                        </span>
                        <span className="text-xs text-slate-300">·</span>
                        <span className="text-xs text-slate-500">Mín. {r.quantidadeMinima} colaborador(es)</span>
                        {r.cargosPermitidos.length > 0 && (
                          <>
                            <span className="text-xs text-slate-300">·</span>
                            <span className="text-xs text-slate-500">
                              {r.cargosPermitidos.map(nomeCargo).join(', ')}
                            </span>
                          </>
                        )}
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
            </div>
          ))}
        </div>
      )}

      {/* Modal de edição */}
      {editando && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full p-6 border border-slate-100 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h4 className="font-bold text-slate-800">{editando.id ? 'Editar rotina' : 'Nova rotina'}</h4>
              <button onClick={() => setEditando(null)} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className={labelBase}>Nome da rotina</label>
                <input
                  className={inputBase}
                  value={editando.nome}
                  onChange={(e) => setEditando({ ...editando, nome: e.target.value })}
                  placeholder="Ex: Cobertura de balcão, Suporte geral…"
                />
              </div>

              <div>
                <label className={labelBase}>Setor</label>
                <select
                  className={inputBase}
                  value={editando.setorId}
                  onChange={(e) => setEditando({ ...editando, setorId: e.target.value })}
                >
                  <option value="">Selecione um setor</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className={labelBase}>Tipo de dia</label>
                <div className="flex gap-1.5 flex-wrap">
                  {(Object.keys(TIPO_DIA_LABEL) as TipoDiaRotina[]).map((tipo) => (
                    <button
                      key={tipo}
                      type="button"
                      onClick={() => setEditando({ ...editando, tipoDia: tipo })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        editando.tipoDia === tipo
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {TIPO_DIA_LABEL[tipo]}
                    </button>
                  ))}
                </div>
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
                <label className={labelBase}>Quantidade mínima de colaboradores</label>
                <input
                  type="number"
                  min={1}
                  className={inputBase}
                  value={editando.quantidadeMinima}
                  onChange={(e) => setEditando({ ...editando, quantidadeMinima: Number(e.target.value) || 1 })}
                />
              </div>

              {cargos.length > 0 && (
                <div>
                  <label className={labelBase}>Cargos permitidos (vazio = qualquer cargo do setor)</label>
                  <div className="flex gap-1.5 flex-wrap">
                    {cargos.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        onClick={() => alternarCargo(c.id)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                          editando.cargosPermitidos.includes(c.id)
                            ? 'bg-teal-600 text-white'
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {c.nome}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div>
                <label className={labelBase}>Prioridade</label>
                <div className="flex gap-1.5">
                  {(Object.keys(PRIORIDADE_LABEL) as PrioridadeRotina[]).map((p) => (
                    <button
                      key={p}
                      type="button"
                      onClick={() => setEditando({ ...editando, prioridade: p })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors ${
                        editando.prioridade === p
                          ? 'bg-teal-600 text-white'
                          : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                      }`}
                    >
                      {PRIORIDADE_LABEL[p]}
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-700 pt-1">
                <input
                  type="checkbox"
                  checked={editando.obrigatoria}
                  onChange={(e) => setEditando({ ...editando, obrigatoria: e.target.checked })}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Rotina obrigatória (se desmarcada, é tratada como opcional pelo gerador)
              </label>
              <label className="flex items-center gap-2 text-sm text-slate-700">
                <input
                  type="checkbox"
                  checked={editando.ativo}
                  onChange={(e) => setEditando({ ...editando, ativo: e.target.checked })}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                Rotina ativa
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
                disabled={!editando.nome.trim() || !editando.setorId}
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

export default RotinasOperacionaisManager;
