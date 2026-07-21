/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Formulário do Perfil de Disponibilidade do Colaborador (Módulo 3 da Escala Inteligente).
// Cobre os grupos 1-6 do pedido: Jornada Contratual, Disponibilidade Flexível,
// Preferências, Competências, Restrições e Prioridade de Utilização.
// O grupo 7 (Explicabilidade) não mora aqui — é lido a partir de TurnoEscalado.justificativas,
// ver JustificativaEscalonamento.tsx.

import React, { useMemo, useState } from 'react';
import {
  Colaborador,
  Setor,
  Cargo,
  DiaSemana,
  PerfilDisponibilidadeColaborador,
  JornadaContratual,
  DisponibilidadeFlexivel,
  TipoDisponibilidadeFlexivel,
  LimiteFrequencia,
  PreferenciaColaborador,
  TipoPreferenciaColaborador,
  CompetenciaColaborador,
  RestricaoPermanente,
  TipoRestricaoPermanente,
  PrioridadeUtilizacaoColaborador,
} from '../../../types';
import { Clock3, Sliders, Heart, BadgeCheck, ShieldAlert, Star, Plus, X } from 'lucide-react';

interface PerfilDisponibilidadeFormProps {
  colaborador: Colaborador;
  perfil: PerfilDisponibilidadeColaborador;
  setores: Setor[];
  cargos: Cargo[];
  onChange: (perfil: PerfilDisponibilidadeColaborador) => void;
  somenteLeitura?: boolean;
}

const DIAS_LABEL: Record<DiaSemana, string> = {
  0: 'Dom', 1: 'Seg', 2: 'Ter', 3: 'Qua', 4: 'Qui', 5: 'Sex', 6: 'Sáb',
};

const TIPO_FLEXIVEL_LABEL: Record<TipoDisponibilidadeFlexivel, string> = {
  dia_extra_semana: 'Pode trabalhar em dia extra à jornada normal',
  trabalhar_domingo: 'Pode trabalhar domingo',
  iniciar_antes: 'Pode iniciar antes do horário padrão',
  terminar_depois: 'Pode terminar depois do horário padrão',
  dobra_turno: 'Pode realizar dobra de turno',
  cobrir_outro_turno: 'Pode cobrir outro turno',
  trabalhar_feriado: 'Pode trabalhar em feriados',
};

const LIMITE_FREQUENCIA_LABEL: Record<LimiteFrequencia, string> = {
  '1x_mes': 'Até 1x por mês',
  '2x_mes': 'Até 2x por mês',
  '4x_mes': 'Até 4x por mês',
  ilimitado: 'Ilimitado',
};

const TIPO_PREFERENCIA_LABEL: Record<TipoPreferenciaColaborador, string> = {
  prefere_manha: 'Prefere manhã',
  prefere_tarde: 'Prefere tarde',
  prefere_noite: 'Prefere noite',
  prefere_folgar_domingo: 'Prefere folgar domingo',
  prefere_trabalhar_sabado: 'Prefere trabalhar sábado',
};

const TIPO_RESTRICAO_LABEL: Record<TipoRestricaoPermanente, string> = {
  nao_pode_fechar: 'Não pode fechar loja',
  nao_pode_abrir: 'Não pode abrir loja',
  nao_pode_trabalhar_sozinho: 'Não pode trabalhar sozinho',
  nao_pode_turno_noturno: 'Não pode realizar turno noturno',
  nao_pode_levantar_carga: 'Não pode levantar carga',
  somente_acompanhado: 'Somente pode atuar acompanhado',
  outro: 'Outra restrição',
};

const PRIORIDADE_LABEL: Record<PrioridadeUtilizacaoColaborador, string> = {
  fixo: 'Fixo',
  preferencial: 'Preferencial',
  flexivel: 'Flexível',
  cobertura: 'Cobertura',
  temporario: 'Temporário',
};

const PRIORIDADE_DESCRICAO: Record<PrioridadeUtilizacaoColaborador, string> = {
  fixo: 'Sempre escalado nos mesmos turnos, alterado só em exceções.',
  preferencial: 'Escalado com prioridade alta antes de flexíveis e cobertura.',
  flexivel: 'Usado para fechar buracos de acordo com a disponibilidade cadastrada.',
  cobertura: 'Só é escalado quando falta gente — folguista/coringa.',
  temporario: 'Vínculo temporário; a IA evita depender dele no longo prazo.',
};

type Aba = 'jornada' | 'flexibilidade' | 'preferencias' | 'competencias' | 'restricoes' | 'prioridade';

const inputBase =
  'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-400';
const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';
const chipBase = 'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors';

const PerfilDisponibilidadeForm: React.FC<PerfilDisponibilidadeFormProps> = ({
  colaborador,
  perfil,
  setores,
  cargos,
  onChange,
  somenteLeitura,
}) => {
  const [aba, setAba] = useState<Aba>('jornada');
  const [novoSetorCompetencia, setNovoSetorCompetencia] = useState('');
  const [novoCargoCompetencia, setNovoCargoCompetencia] = useState('');

  const atualizarJornada = (campo: keyof JornadaContratual, valor: JornadaContratual[keyof JornadaContratual]) => {
    onChange({ ...perfil, jornadaContratual: { ...perfil.jornadaContratual, [campo]: valor } });
  };

  const alternarDiaNormal = (dia: DiaSemana) => {
    const jaTem = perfil.jornadaContratual.diasNormais.includes(dia);
    atualizarJornada(
      'diasNormais',
      jaTem
        ? perfil.jornadaContratual.diasNormais.filter((d) => d !== dia)
        : [...perfil.jornadaContratual.diasNormais, dia].sort()
    );
  };

  const abas: { id: Aba; label: string; icon: typeof Clock3 }[] = [
    { id: 'jornada', label: 'Jornada contratual', icon: Clock3 },
    { id: 'flexibilidade', label: 'Disponibilidade flexível', icon: Sliders },
    { id: 'preferencias', label: 'Preferências', icon: Heart },
    { id: 'competencias', label: 'Competências', icon: BadgeCheck },
    { id: 'restricoes', label: 'Restrições', icon: ShieldAlert },
    { id: 'prioridade', label: 'Prioridade de utilização', icon: Star },
  ];

  const cargosDisponiveisParaSetor = useMemo(
    () => cargos, // cargo não é vinculado a setor no modelo atual — lista completa
    [cargos]
  );

  return (
    <div>
      <div className="flex items-center gap-1.5 bg-slate-100 rounded-2xl p-1 mb-4 flex-wrap">
        {abas.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            onClick={() => setAba(id)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-colors ${
              aba === id ? 'bg-white text-teal-700 shadow-sm' : 'text-slate-500 hover:text-slate-700'
            }`}
          >
            <Icon size={13} /> {label}
          </button>
        ))}
      </div>

      {/* Grupo 1 — Jornada Contratual */}
      {aba === 'jornada' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Esta é a jornada padrão de {colaborador.nome} — a base que a IA usa antes de aplicar qualquer exceção.
          </p>
          <div>
            <label className={labelBase}>Dias normais de trabalho</label>
            <div className="flex gap-1.5 flex-wrap">
              {([0, 1, 2, 3, 4, 5, 6] as DiaSemana[]).map((dia) => (
                <button
                  key={dia}
                  type="button"
                  disabled={somenteLeitura}
                  onClick={() => alternarDiaNormal(dia)}
                  className={`w-11 h-9 rounded-lg text-xs font-semibold transition-colors ${
                    perfil.jornadaContratual.diasNormais.includes(dia)
                      ? 'bg-teal-600 text-white'
                      : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  } disabled:opacity-60`}
                >
                  {DIAS_LABEL[dia]}
                </button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelBase}>Entrada padrão</label>
              <input
                type="time"
                disabled={somenteLeitura}
                className={inputBase}
                value={perfil.jornadaContratual.horaEntradaPadrao}
                onChange={(e) => atualizarJornada('horaEntradaPadrao', e.target.value)}
              />
            </div>
            <div>
              <label className={labelBase}>Saída padrão</label>
              <input
                type="time"
                disabled={somenteLeitura}
                className={inputBase}
                value={perfil.jornadaContratual.horaSaidaPadrao}
                onChange={(e) => atualizarJornada('horaSaidaPadrao', e.target.value)}
              />
            </div>
            <div>
              <label className={labelBase}>Início do almoço</label>
              <input
                type="time"
                disabled={somenteLeitura}
                className={inputBase}
                value={perfil.jornadaContratual.horaInicioAlmoco}
                onChange={(e) => atualizarJornada('horaInicioAlmoco', e.target.value)}
              />
            </div>
            <div>
              <label className={labelBase}>Fim do almoço</label>
              <input
                type="time"
                disabled={somenteLeitura}
                className={inputBase}
                value={perfil.jornadaContratual.horaFimAlmoco}
                onChange={(e) => atualizarJornada('horaFimAlmoco', e.target.value)}
              />
            </div>
            <div>
              <label className={labelBase}>Carga horária diária (h)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                disabled={somenteLeitura}
                className={inputBase}
                value={perfil.jornadaContratual.cargaHorariaDiaria}
                onChange={(e) => atualizarJornada('cargaHorariaDiaria', Number(e.target.value) || 0)}
              />
            </div>
            <div>
              <label className={labelBase}>Carga horária semanal (h)</label>
              <input
                type="number"
                min={0}
                step={0.5}
                disabled={somenteLeitura}
                className={inputBase}
                value={perfil.jornadaContratual.cargaHorariaSemanal}
                onChange={(e) => atualizarJornada('cargaHorariaSemanal', Number(e.target.value) || 0)}
              />
            </div>
          </div>
        </div>
      )}

      {/* Grupo 2 — Disponibilidade Flexível */}
      {aba === 'flexibilidade' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Exceções à jornada padrão. Cada uma tem um limite de frequência que a IA nunca ultrapassa sozinha —
            só numa edição manual explícita.
          </p>
          {(Object.keys(TIPO_FLEXIVEL_LABEL) as TipoDisponibilidadeFlexivel[]).map((tipo) => {
            const existente = perfil.disponibilidadesFlexiveis.find((d) => d.tipo === tipo);
            return (
              <div
                key={tipo}
                className="flex items-center justify-between gap-3 rounded-2xl border border-slate-100 px-4 py-3"
              >
                <label className="flex items-center gap-2 text-sm text-slate-700 flex-1">
                  <input
                    type="checkbox"
                    disabled={somenteLeitura}
                    checked={!!existente}
                    onChange={(e) => {
                      if (e.target.checked) {
                        onChange({
                          ...perfil,
                          disponibilidadesFlexiveis: [
                            ...perfil.disponibilidadesFlexiveis,
                            { tipo, limiteFrequencia: '1x_mes' } as DisponibilidadeFlexivel,
                          ],
                        });
                      } else {
                        onChange({
                          ...perfil,
                          disponibilidadesFlexiveis: perfil.disponibilidadesFlexiveis.filter((d) => d.tipo !== tipo),
                        });
                      }
                    }}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  {TIPO_FLEXIVEL_LABEL[tipo]}
                </label>
                {existente && (
                  <select
                    disabled={somenteLeitura}
                    className="px-2 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-600 focus:outline-none focus:ring-2 focus:ring-teal-500/40"
                    value={existente.limiteFrequencia}
                    onChange={(e) =>
                      onChange({
                        ...perfil,
                        disponibilidadesFlexiveis: perfil.disponibilidadesFlexiveis.map((d) =>
                          d.tipo === tipo ? { ...d, limiteFrequencia: e.target.value as LimiteFrequencia } : d
                        ),
                      })
                    }
                  >
                    {(Object.keys(LIMITE_FREQUENCIA_LABEL) as LimiteFrequencia[]).map((lf) => (
                      <option key={lf} value={lf}>
                        {LIMITE_FREQUENCIA_LABEL[lf]}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Grupo 3 — Preferências */}
      {aba === 'preferencias' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Preferências não são obrigatórias — a IA tenta respeitar, mas pode ignorar quando a cobertura exigir.
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(TIPO_PREFERENCIA_LABEL) as TipoPreferenciaColaborador[]).map((tipo) => {
              const ativo = perfil.preferencias.some((p) => p.tipo === tipo);
              return (
                <button
                  key={tipo}
                  type="button"
                  disabled={somenteLeitura}
                  onClick={() =>
                    onChange({
                      ...perfil,
                      preferencias: ativo
                        ? perfil.preferencias.filter((p) => p.tipo !== tipo)
                        : [...perfil.preferencias, { tipo } as PreferenciaColaborador],
                    })
                  }
                  className={`${chipBase} ${
                    ativo ? 'bg-teal-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  } disabled:opacity-60`}
                >
                  {TIPO_PREFERENCIA_LABEL[tipo]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grupo 4 — Competências */}
      {aba === 'competencias' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Setores e funções em que {colaborador.nome} está habilitado. A IA nunca escala fora desta lista.
          </p>
          {!somenteLeitura && (
            <div className="flex items-end gap-2 flex-wrap">
              <div>
                <label className={labelBase}>Setor</label>
                <select
                  className={inputBase}
                  value={novoSetorCompetencia}
                  onChange={(e) => setNovoSetorCompetencia(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {setores.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.nome}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className={labelBase}>Função</label>
                <select
                  className={inputBase}
                  value={novoCargoCompetencia}
                  onChange={(e) => setNovoCargoCompetencia(e.target.value)}
                >
                  <option value="">Selecione</option>
                  {cargosDisponiveisParaSetor.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nome}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="button"
                disabled={!novoSetorCompetencia || !novoCargoCompetencia}
                onClick={() => {
                  const jaExiste = perfil.competencias.some(
                    (c) => c.setorId === novoSetorCompetencia && c.cargoId === novoCargoCompetencia
                  );
                  if (!jaExiste) {
                    onChange({
                      ...perfil,
                      competencias: [
                        ...perfil.competencias,
                        { setorId: novoSetorCompetencia, cargoId: novoCargoCompetencia, habilitado: true },
                      ],
                    });
                  }
                  setNovoSetorCompetencia('');
                  setNovoCargoCompetencia('');
                }}
                className="flex items-center gap-1 px-3 py-2 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 disabled:opacity-40"
              >
                <Plus size={14} /> Adicionar
              </button>
            </div>
          )}
          <div className="flex gap-1.5 flex-wrap">
            {perfil.competencias.length === 0 && (
              <p className="text-sm text-slate-400 py-2">Nenhuma habilitação cadastrada ainda.</p>
            )}
            {perfil.competencias.map((c, idx) => (
              <span
                key={`${c.setorId}-${c.cargoId}-${idx}`}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-emerald-50 text-emerald-700"
              >
                ✔ {setores.find((s) => s.id === c.setorId)?.nome || c.setorId} ·{' '}
                {cargos.find((cg) => cg.id === c.cargoId)?.nome || c.cargoId}
                {!somenteLeitura && (
                  <button
                    type="button"
                    onClick={() =>
                      onChange({ ...perfil, competencias: perfil.competencias.filter((_, i) => i !== idx) })
                    }
                    className="text-emerald-600 hover:text-emerald-900"
                  >
                    <X size={12} />
                  </button>
                )}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Grupo 5 — Restrições */}
      {aba === 'restricoes' && (
        <div className="space-y-3">
          <p className="text-xs text-slate-400">
            Restrições permanentes ("regras duras") — a IA nunca pode violá-las, mesmo em falta de cobertura.
          </p>
          <div className="flex gap-1.5 flex-wrap">
            {(Object.keys(TIPO_RESTRICAO_LABEL) as TipoRestricaoPermanente[]).map((tipo) => {
              const ativo = perfil.restricoes.some((r) => r.tipo === tipo);
              return (
                <button
                  key={tipo}
                  type="button"
                  disabled={somenteLeitura}
                  onClick={() =>
                    onChange({
                      ...perfil,
                      restricoes: ativo
                        ? perfil.restricoes.filter((r) => r.tipo !== tipo)
                        : [...perfil.restricoes, { tipo } as RestricaoPermanente],
                    })
                  }
                  className={`${chipBase} ${
                    ativo ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                  } disabled:opacity-60`}
                >
                  {TIPO_RESTRICAO_LABEL[tipo]}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Grupo 6 — Prioridade de utilização */}
      {aba === 'prioridade' && (
        <div className="space-y-2">
          <p className="text-xs text-slate-400 mb-2">
            Usada pela IA para decidir quem escalar primeiro quando há mais de um colaborador elegível.
          </p>
          {(Object.keys(PRIORIDADE_LABEL) as PrioridadeUtilizacaoColaborador[]).map((p) => (
            <label
              key={p}
              className={`flex items-start gap-3 rounded-2xl border px-4 py-3 cursor-pointer transition-colors ${
                perfil.prioridadeUtilizacao === p ? 'border-teal-400 bg-teal-50/60' : 'border-slate-100 hover:border-slate-200'
              } ${somenteLeitura ? 'cursor-default' : ''}`}
            >
              <input
                type="radio"
                disabled={somenteLeitura}
                checked={perfil.prioridadeUtilizacao === p}
                onChange={() => onChange({ ...perfil, prioridadeUtilizacao: p })}
                className="mt-1 text-teal-600 focus:ring-teal-500"
              />
              <div>
                <div className="text-sm font-semibold text-slate-800">{PRIORIDADE_LABEL[p]}</div>
                <div className="text-xs text-slate-500">{PRIORIDADE_DESCRICAO[p]}</div>
              </div>
            </label>
          ))}
        </div>
      )}
    </div>
  );
};

export default PerfilDisponibilidadeForm;
