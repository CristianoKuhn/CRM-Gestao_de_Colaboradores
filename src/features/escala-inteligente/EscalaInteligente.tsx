/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Setor } from '../../../types';
import {
  Wand2,
  Clock,
  Users,
  Calendar,
  CheckCircle2,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  X,
} from 'lucide-react';
import {
  RespostasAssistente,
  PRESETS_CONFIGURACAO_INICIAL,
  respostasIniciaisPadrao,
  gerarConfiguracaoAPartirDoAssistente,
  ResultadoAssistente,
} from '../engine/presetsConfiguracaoInicial';

interface AssistenteConfiguracaoInicialProps {
  empresaId: string;
  setores: Setor[];
  onConcluir: (resultado: ResultadoAssistente) => void | Promise<void>;
  onCancelar?: () => void;
}

const TOTAL_PASSOS = 5;

const AssistenteConfiguracaoInicial: React.FC<AssistenteConfiguracaoInicialProps> = ({
  empresaId,
  setores,
  onConcluir,
  onCancelar,
}) => {
  const [passo, setPasso] = useState(0);
  const [respostas, setRespostas] = useState<RespostasAssistente>(() => respostasIniciaisPadrao(empresaId));
  const [salvando, setSalvando] = useState(false);

  const atualizar = <K extends keyof RespostasAssistente>(campo: K, valor: RespostasAssistente[K]) => {
    setRespostas((prev) => ({ ...prev, [campo]: valor }));
  };

  const aplicarPreset = (presetId: string) => {
    const preset = PRESETS_CONFIGURACAO_INICIAL.find((p) => p.id === presetId);
    if (!preset) return;
    setRespostas((prev) => ({ ...prev, ...preset.respostas }));
  };

  const resultado = gerarConfiguracaoAPartirDoAssistente(respostas);

  const avancar = () => setPasso((p) => Math.min(p + 1, TOTAL_PASSOS - 1));
  const voltar = () => setPasso((p) => Math.max(p - 1, 0));

  const concluir = async () => {
    setSalvando(true);
    try {
      await onConcluir(resultado);
    } finally {
      setSalvando(false);
    }
  };

  const inputBase =
    'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400';
  const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

  return (
    <div className="max-w-3xl mx-auto">
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 overflow-hidden">
        {/* Cabeçalho */}
        <div className="bg-gradient-to-r from-teal-600 to-teal-500 px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-white/15 flex items-center justify-center">
              <Wand2 size={20} className="text-white" />
            </div>
            <div>
              <h2 className="text-white font-bold text-lg leading-tight">Assistente de Configuração Inicial</h2>
              <p className="text-teal-50 text-xs">Poucas perguntas, e a Escala Inteligente já nasce configurada.</p>
            </div>
          </div>
          {onCancelar && (
            <button onClick={onCancelar} className="text-teal-50 hover:text-white transition-colors" title="Fechar assistente">
              <X size={20} />
            </button>
          )}
        </div>

        {/* Barra de progresso */}
        <div className="px-6 pt-4">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: TOTAL_PASSOS }).map((_, i) => (
              <div
                key={i}
                className={`h-1.5 flex-1 rounded-full transition-colors ${
                  i <= passo ? 'bg-teal-500' : 'bg-slate-100'
                }`}
              />
            ))}
          </div>
          <p className="text-xs text-slate-400 mt-2">
            Passo {passo + 1} de {TOTAL_PASSOS}
          </p>
        </div>

        <div className="p-6 min-h-[360px]">
          {/* PASSO 0 — ponto de partida */}
          {passo === 0 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Sparkles size={18} className="text-teal-500" />
                Qual modelo mais se parece com a sua operação?
              </h3>
              <p className="text-sm text-slate-500">
                Escolha o mais próximo — você ajusta os detalhes nos próximos passos, e pode refinar tudo depois na
                configuração avançada.
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                {PRESETS_CONFIGURACAO_INICIAL.map((preset) => (
                  <button
                    key={preset.id}
                    onClick={() => aplicarPreset(preset.id)}
                    className="text-left p-4 rounded-2xl border border-slate-200 hover:border-teal-400 hover:bg-teal-50/40 transition-colors"
                  >
                    <p className="font-semibold text-sm text-slate-800">{preset.nome}</p>
                    <p className="text-xs text-slate-500 mt-1">{preset.descricao}</p>
                  </button>
                ))}
              </div>

              {setores.length > 0 && (
                <div className="pt-2">
                  <label className={labelBase}>Aplicar a</label>
                  <select
                    className={inputBase}
                    value={respostas.setorId || ''}
                    onChange={(e) => atualizar('setorId', e.target.value || undefined)}
                  >
                    <option value="">Toda a empresa (todos os setores)</option>
                    {setores.map((s) => (
                      <option key={s.id} value={s.id}>
                        Somente o setor: {s.nome}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          )}

          {/* PASSO 1 — horário de funcionamento */}
          {passo === 1 && (
            <div className="space-y-5">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Clock size={18} className="text-teal-500" />
                Qual o horário de funcionamento?
              </h3>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={respostas.funcionaSegASab}
                    onChange={(e) => atualizar('funcionaSegASab', e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Funciona de segunda a sábado
                </label>
                {respostas.funcionaSegASab && (
                  <div className="grid grid-cols-2 gap-3 pl-6">
                    <div>
                      <label className={labelBase}>Abre às</label>
                      <input
                        type="time"
                        className={inputBase}
                        value={respostas.horaAberturaSegASab}
                        onChange={(e) => atualizar('horaAberturaSegASab', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelBase}>Fecha às</label>
                      <input
                        type="time"
                        className={inputBase}
                        value={respostas.horaFechamentoSegASab === '24:00' ? '23:59' : respostas.horaFechamentoSegASab}
                        onChange={(e) => atualizar('horaFechamentoSegASab', e.target.value)}
                      />
                      <p className="text-[11px] text-slate-400 mt-1">Use 23:59 para representar meia-noite.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 space-y-3">
                <label className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={respostas.funcionaDomingo}
                    onChange={(e) => atualizar('funcionaDomingo', e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Funciona aos domingos
                </label>
                {respostas.funcionaDomingo && (
                  <div className="grid grid-cols-2 gap-3 pl-6">
                    <div>
                      <label className={labelBase}>Abre às</label>
                      <input
                        type="time"
                        className={inputBase}
                        value={respostas.horaAberturaDomingo}
                        onChange={(e) => atualizar('horaAberturaDomingo', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelBase}>Fecha às</label>
                      <input
                        type="time"
                        className={inputBase}
                        value={respostas.horaFechamentoDomingo}
                        onChange={(e) => atualizar('horaFechamentoDomingo', e.target.value)}
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* PASSO 2 — cobertura mínima */}
          {passo === 2 && (
            <div className="space-y-5">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Users size={18} className="text-teal-500" />
                Quantas pessoas você precisa, e a partir de que horário?
              </h3>
              <p className="text-sm text-slate-500">
                Pode ser aproximado — o gerador automático (Módulo 5) tenta bater esse número exato, e o validador
                avisa se ficar abaixo.
              </p>

              <div className="grid sm:grid-cols-2 gap-3">
                <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">A partir de que horário reforça a equipe?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelBase}>Horário</label>
                      <input
                        type="time"
                        className={inputBase}
                        value={respostas.horaCorteAlta}
                        onChange={(e) => atualizar('horaCorteAlta', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelBase}>Mínimo de pessoas</label>
                      <input
                        type="number"
                        min={0}
                        className={inputBase}
                        value={respostas.minimoPadraoDurantePico}
                        onChange={(e) => atualizar('minimoPadraoDurantePico', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                  <p className="text-sm font-semibold text-slate-700">E no fim do expediente, o mínimo?</p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className={labelBase}>A partir de</label>
                      <input
                        type="time"
                        className={inputBase}
                        value={respostas.horaCorteNoturno}
                        onChange={(e) => atualizar('horaCorteNoturno', e.target.value)}
                      />
                    </div>
                    <div>
                      <label className={labelBase}>Mínimo de pessoas</label>
                      <input
                        type="number"
                        min={0}
                        className={inputBase}
                        value={respostas.minimoNoturnoMinimo}
                        onChange={(e) => atualizar('minimoNoturnoMinimo', Number(e.target.value))}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {respostas.funcionaDomingo && (
                <div className="rounded-2xl border border-slate-200 p-4">
                  <label className={labelBase}>Mínimo de pessoas aos domingos</label>
                  <input
                    type="number"
                    min={0}
                    className={`${inputBase} max-w-[160px]`}
                    value={respostas.minimoDomingo}
                    onChange={(e) => atualizar('minimoDomingo', Number(e.target.value))}
                  />
                </div>
              )}
            </div>
          )}

          {/* PASSO 3 — carga horária e banco de horas */}
          {passo === 3 && (
            <div className="space-y-5">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <Calendar size={18} className="text-teal-500" />
                Carga horária e banco de horas
              </h3>

              <div className="grid sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelBase}>Carga horária semanal</label>
                  <input
                    type="number"
                    min={1}
                    className={inputBase}
                    value={respostas.cargaHorariaSemanal}
                    onChange={(e) => atualizar('cargaHorariaSemanal', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelBase}>Intervalo mínimo entre jornadas (horas)</label>
                  <input
                    type="number"
                    min={0}
                    className={inputBase}
                    value={respostas.intervaloMinimoInterjornadaHoras}
                    onChange={(e) => atualizar('intervaloMinimoInterjornadaHoras', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelBase}>Máximo de dias consecutivos</label>
                  <input
                    type="number"
                    min={1}
                    className={inputBase}
                    value={respostas.maxDiasConsecutivos}
                    onChange={(e) => atualizar('maxDiasConsecutivos', Number(e.target.value))}
                  />
                </div>
                <div>
                  <label className={labelBase}>Antecedência mínima para publicar (dias)</label>
                  <input
                    type="number"
                    min={0}
                    className={inputBase}
                    value={respostas.diasAntecedenciaPublicacao}
                    onChange={(e) => atualizar('diasAntecedenciaPublicacao', Number(e.target.value))}
                  />
                </div>
              </div>

              <div className="space-y-2 pt-2">
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={respostas.permiteBancoHoras}
                    onChange={(e) => atualizar('permiteBancoHoras', e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Equipe tem banco de horas
                </label>
                <label className="flex items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={respostas.permiteHoraExtraSemana}
                    onChange={(e) => atualizar('permiteHoraExtraSemana', e.target.checked)}
                    className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                  />
                  Permite hora extra paga durante a semana
                </label>
                {respostas.funcionaDomingo && (
                  <label className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={respostas.domingoContaHoraExtra}
                      onChange={(e) => atualizar('domingoContaHoraExtra', e.target.checked)}
                      className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                    />
                    Domingo trabalhado conta como hora extra paga
                  </label>
                )}
              </div>
            </div>
          )}

          {/* PASSO 4 — revisão */}
          {passo === 4 && (
            <div className="space-y-4">
              <h3 className="font-bold text-slate-800 flex items-center gap-2">
                <CheckCircle2 size={18} className="text-teal-500" />
                Revisão — é isso que vamos aplicar
              </h3>
              <p className="text-sm text-slate-500">
                Nada disso é definitivo: tudo pode ser ajustado depois na configuração avançada, turno a turno,
                regra a regra.
              </p>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Turnos padrão gerados ({resultado.turnos.length})
                </p>
                <div className="space-y-1.5">
                  {resultado.turnos.map((t, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5">
                      <span className="font-medium text-slate-700">{t.nome}</span>
                      <span className="text-slate-500">
                        {t.horaInicio} – {t.horaFim}
                      </span>
                    </div>
                  ))}
                  {resultado.turnos.length === 0 && (
                    <p className="text-xs text-slate-400">Nenhum turno gerado — revise o passo de horário.</p>
                  )}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2">
                  Regras de cobertura geradas ({resultado.regras.length})
                </p>
                <div className="space-y-1.5">
                  {resultado.regras.map((r, i) => (
                    <div key={i} className="flex items-center justify-between text-sm bg-slate-50 rounded-lg px-3 py-1.5">
                      <span className="text-slate-700">
                        {r.diaSemana === 'todos' ? 'Seg-sáb' : r.diaSemana === 0 ? 'Domingo' : `Dia ${r.diaSemana}`}
                        {' '}· {r.horaInicio}–{r.horaFim}
                      </span>
                      <span className="font-medium text-slate-700">mín. {r.quantidadeMinima}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 p-4 grid grid-cols-2 gap-y-1.5 text-sm">
                <span className="text-slate-500">Carga semanal</span>
                <span className="text-right font-medium text-slate-700">{resultado.configuracao.cargaHorariaSemanal}h</span>
                <span className="text-slate-500">Banco de horas</span>
                <span className="text-right font-medium text-slate-700">
                  {resultado.configuracao.permiteBancoHoras ? 'Sim' : 'Não'}
                </span>
                <span className="text-slate-500">Hora extra na semana</span>
                <span className="text-right font-medium text-slate-700">
                  {resultado.configuracao.permiteHoraExtraSemana ? 'Sim' : 'Não'}
                </span>
                <span className="text-slate-500">Domingo é hora extra</span>
                <span className="text-right font-medium text-slate-700">
                  {resultado.configuracao.domingoContaHoraExtra ? 'Sim' : 'Não'}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Rodapé com navegação */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
          <button
            onClick={voltar}
            disabled={passo === 0}
            className="flex items-center gap-1 px-4 py-2 rounded-xl text-sm font-medium text-slate-500 disabled:opacity-30 hover:bg-slate-50 transition-colors"
          >
            <ChevronLeft size={16} /> Voltar
          </button>

          {passo < TOTAL_PASSOS - 1 ? (
            <button
              onClick={avancar}
              className="flex items-center gap-1 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors"
            >
              Avançar <ChevronRight size={16} />
            </button>
          ) : (
            <button
              onClick={concluir}
              disabled={salvando}
              className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-60"
            >
              <CheckCircle2 size={16} />
              {salvando ? 'Aplicando…' : 'Aplicar configuração'}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default AssistenteConfiguracaoInicial;
