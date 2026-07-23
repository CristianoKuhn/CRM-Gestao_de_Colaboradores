/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Tela do Gerador — última peça do roadmap da Escala Inteligente. Monta o
// ContextoMotor a partir do DataService, roda o pipeline completo
// (ScheduleEngine → ScaleGenerator) e permite revisar o resultado antes de
// publicar. Esta tela NÃO contém regra de negócio de escalonamento — toda
// decisão vem do motor (src/features/escala-inteligente/engine); aqui é só
// carregar dados, chamar o motor e desenhar o resultado.

import React, { useMemo, useState } from 'react';
import {
  Cargo,
  Colaborador,
  EscalaGerada,
  Setor,
  TurnoEscalado,
  Usuario,
} from '../../../types';
import { DataService } from '../../../services/DataService';
import { buildCalendarioPeriodo, buildDemandaDoPeriodo } from '../engine/calendarioDemanda';
import { executarScheduleEngine } from '../engine/ScheduleEngine';
import { gerarEscalaDefinitiva, ResultadoGeracaoEscala } from '../engine/ScaleGenerator';
import type { ContextoMotor, ProblemaEscala, ScoreEscala } from '../engine/tiposMotor';
import JustificativaEscalonamento from './JustificativaEscalonamento';
import {
  Wand2,
  RefreshCw,
  AlertTriangle,
  CheckCircle2,
  Sparkles,
  ChevronDown,
  ChevronUp,
  Upload,
  Calendar,
} from 'lucide-react';

interface GeradorEscalaProps {
  currentUser: Usuario;
  empresaId: string;
  colaboradores: Colaborador[];
  setores: Setor[];
  cargos: Cargo[];
  somenteLeitura?: boolean;
}

const SEVERIDADE_ESTILO: Record<ProblemaEscala['severidade'], string> = {
  alta: 'text-rose-700 bg-rose-50 border-rose-100',
  media: 'text-amber-700 bg-amber-50 border-amber-100',
  baixa: 'text-slate-600 bg-slate-50 border-slate-100',
};

const STATUS_TURNO_ESTILO: Record<TurnoEscalado['status'], string> = {
  confirmado: 'text-emerald-700 bg-emerald-50',
  pendente: 'text-amber-700 bg-amber-50',
  conflito: 'text-rose-700 bg-rose-50',
};

function primeiroEUltimoDiaDoMes(mesReferencia: string): { inicio: string; fim: string } {
  const [ano, mes] = mesReferencia.split('-').map(Number);
  const inicio = `${mesReferencia}-01`;
  const ultimoDia = new Date(ano, mes, 0).getDate(); // dia 0 do mês seguinte = último dia deste mês
  const fim = `${mesReferencia}-${String(ultimoDia).padStart(2, '0')}`;
  return { inicio, fim };
}

function formatarDataCurta(dataIso: string): string {
  const [, mes, dia] = dataIso.split('-');
  return `${dia}/${mes}`;
}

function corDaPontuacao(pontuacao: number): string {
  if (pontuacao >= 80) return 'text-emerald-700 bg-emerald-50';
  if (pontuacao >= 60) return 'text-amber-700 bg-amber-50';
  return 'text-rose-700 bg-rose-50';
}

const GeradorEscala: React.FC<GeradorEscalaProps> = ({ currentUser, empresaId, colaboradores, somenteLeitura }) => {
  const hoje = new Date();
  const mesPadrao = `${hoje.getFullYear()}-${String(hoje.getMonth() + 1).padStart(2, '0')}`;

  const [mesSelecionado, setMesSelecionado] = useState(mesPadrao);
  const [gerando, setGerando] = useState(false);
  const [publicando, setPublicando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [publicado, setPublicado] = useState(false);
  const [escalaAtual, setEscalaAtual] = useState<EscalaGerada | null>(null);
  const [resultado, setResultado] = useState<ResultadoGeracaoEscala | null>(null);
  const [scoreEscala, setScoreEscala] = useState<ScoreEscala | null>(null);
  const [turnoExpandidoId, setTurnoExpandidoId] = useState<string | null>(null);

  const colaboradorPorId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c])), [colaboradores]);

  const turnosPorData = useMemo(() => {
    if (!resultado) return [] as [string, TurnoEscalado[]][];
    const mapa = new Map<string, TurnoEscalado[]>();
    resultado.turnos.forEach((t) => {
      const lista = mapa.get(t.data) ?? [];
      lista.push(t);
      mapa.set(t.data, lista);
    });
    mapa.forEach((lista) => lista.sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)));
    return Array.from(mapa.entries()).sort(([a], [b]) => a.localeCompare(b));
  }, [resultado]);

  async function handleGerar() {
    setGerando(true);
    setErro(null);
    setPublicado(false);
    setResultado(null);
    setScoreEscala(null);
    try {
      const { inicio, fim } = primeiroEUltimoDiaDoMes(mesSelecionado);

      const [
        rotinas,
        regrasCobertura,
        perfis,
        regrasDescanso,
        feriados,
        disponibilidades,
        restricoesIndividuais,
        folgasFixas,
        jornadas,
        ferias,
        dayOffs,
        folgas,
        bancoHorasMovimentos,
        turnosJaEscalados,
      ] = await Promise.all([
        DataService.getRotinasOperacionais(),
        DataService.getRegrasCobertura(),
        DataService.getPerfisDisponibilidade(),
        DataService.getRegrasDescanso(),
        DataService.getFeriadosEscala(),
        DataService.getDisponibilidadeColaborador(),
        DataService.getRestricoesIndividuais(),
        DataService.getFolgasFixasEscala(),
        DataService.getJornadasTrabalho(),
        DataService.getFerias(),
        DataService.getDayOffs(),
        DataService.getFolgas(),
        DataService.getBancoHorasMovimentos(),
        DataService.getTurnosEscalados(''), // '' = todas as escalas já publicadas, para checar conflito contra o que já existe
      ]);

      const calendario = buildCalendarioPeriodo(inicio, fim, feriados);
      const demanda = buildDemandaDoPeriodo(calendario, rotinas, regrasCobertura);

      const contexto: ContextoMotor = {
        empresaId,
        periodoInicio: inicio,
        periodoFim: fim,
        demanda,
        colaboradores,
        perfis,
        disponibilidades,
        restricoesIndividuais,
        folgasFixas,
        jornadas,
        ferias,
        dayOffs,
        folgas,
        bancoHorasMovimentos,
        regraDescanso: regrasDescanso[0],
        turnosJaEscalados,
      };

      const escalaId = `escala-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      const resultadoMotor = executarScheduleEngine(contexto);
      const resultadoGeracao = gerarEscalaDefinitiva(contexto, resultadoMotor, { escalaId });

      setEscalaAtual({
        id: escalaId,
        empresaId,
        periodoInicio: inicio,
        periodoFim: fim,
        status: 'rascunho',
        geradoEm: new Date().toISOString(),
        geradoPor: currentUser.id,
        parametrosSnapshot: {},
        resumoValidacoes: {
          totalProblemas: resultadoGeracao.problemas.length,
          scoreGeral: resultadoMotor.scoreEscala.pontuacaoGeral,
        },
      });
      setResultado(resultadoGeracao);
      setScoreEscala(resultadoMotor.scoreEscala);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro inesperado ao gerar a escala.');
    } finally {
      setGerando(false);
    }
  }

  async function handlePublicar() {
    if (!escalaAtual || !resultado) return;
    setPublicando(true);
    setErro(null);
    try {
      await DataService.saveEscalaGerada({ ...escalaAtual, status: 'publicado' });
      await DataService.saveTurnosEscaladosBatch(escalaAtual.id, resultado.turnos);
      setPublicado(true);
    } catch (e) {
      setErro(e instanceof Error ? e.message : 'Erro ao publicar a escala.');
    } finally {
      setPublicando(false);
    }
  }

  return (
    <div className="space-y-5">
      <div className="rounded-2xl border border-slate-100 p-5">
        <div className="flex items-center gap-2 mb-1 text-slate-700 font-semibold text-sm">
          <Wand2 size={16} className="text-teal-500" />
          Gerar escala automaticamente
        </div>
        <p className="text-xs text-slate-500 mb-4">
          O motor cruza rotinas, cobertura, perfis de disponibilidade, férias e regras de descanso para montar uma
          prévia da escala do período. Nada é salvo até você clicar em publicar.
        </p>
        <div className="flex items-end gap-3 flex-wrap">
          <div>
            <label className="block text-[11px] font-semibold text-slate-500 mb-1">Mês de referência</label>
            <input
              type="month"
              value={mesSelecionado}
              onChange={(e) => setMesSelecionado(e.target.value)}
              disabled={gerando || somenteLeitura}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm text-slate-700"
            />
          </div>
          <button
            onClick={handleGerar}
            disabled={gerando || somenteLeitura}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            {gerando ? <RefreshCw size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {gerando ? 'Gerando prévia…' : 'Gerar prévia'}
          </button>
        </div>
        {somenteLeitura && (
          <p className="text-[11px] text-slate-400 mt-3">
            Você tem acesso de leitura — geração e publicação ficam com Administrador, Supervisor ou Coordenador.
          </p>
        )}
      </div>

      {erro && (
        <div className="flex items-center gap-2 text-sm text-rose-700 bg-rose-50 border border-rose-100 rounded-2xl px-4 py-3">
          <AlertTriangle size={16} />
          {erro}
        </div>
      )}

      {resultado && scoreEscala && (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <div className={`rounded-2xl border p-3 ${corDaPontuacao(scoreEscala.pontuacaoGeral)}`}>
              <p className="text-[11px] font-semibold opacity-80">Score geral</p>
              <p className="text-xl font-bold">{scoreEscala.pontuacaoGeral.toFixed(0)}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Slots cobertos</p>
              <p className="text-xl font-bold text-slate-700">
                {resultado.estatisticas.slotsTotalmenteCobertos}/{resultado.estatisticas.totalSlots}
              </p>
            </div>
            <div className="rounded-2xl border border-slate-100 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Parcialmente cobertos</p>
              <p className="text-xl font-bold text-slate-700">{resultado.estatisticas.slotsParcialmenteCobertos}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Sem cobertura</p>
              <p className="text-xl font-bold text-slate-700">{resultado.estatisticas.slotsSemCobertura}</p>
            </div>
            <div className="rounded-2xl border border-slate-100 p-3">
              <p className="text-[11px] font-semibold text-slate-500">Turnos gerados</p>
              <p className="text-xl font-bold text-slate-700">{resultado.estatisticas.totalTurnosGerados}</p>
            </div>
          </div>

          {resultado.problemas.length > 0 && (
            <div className="rounded-2xl border border-slate-100 p-4">
              <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold text-sm">
                <AlertTriangle size={15} className="text-amber-500" />
                Pontos de atenção ({resultado.problemas.length})
              </div>
              <ul className="space-y-2">
                {resultado.problemas.map((p, idx) => (
                  <li key={idx} className={`text-xs rounded-xl border px-3 py-2 ${SEVERIDADE_ESTILO[p.severidade]}`}>
                    {p.descricao}
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="rounded-2xl border border-slate-100 p-4">
            <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold text-sm">
              <Calendar size={15} className="text-teal-500" />
              Prévia dos turnos por dia
            </div>
            <div className="space-y-4 max-h-[480px] overflow-y-auto pr-1">
              {turnosPorData.map(([data, turnos]) => (
                <div key={data}>
                  <p className="text-[11px] font-semibold text-slate-400 mb-1.5">{formatarDataCurta(data)}</p>
                  <div className="space-y-1.5">
                    {turnos.map((t) => {
                      const colaborador = colaboradorPorId.get(t.colaboradorId);
                      const expandido = turnoExpandidoId === t.id;
                      return (
                        <div key={t.id} className="rounded-xl border border-slate-100">
                          <button
                            onClick={() => setTurnoExpandidoId(expandido ? null : t.id)}
                            className="w-full flex items-center justify-between gap-2 px-3 py-2 text-left"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              {t.rotinaCor && (
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: t.rotinaCor }} />
                              )}
                              <span className="text-xs font-semibold text-slate-700 truncate">
                                {colaborador?.nome ?? t.colaboradorId}
                              </span>
                              <span className="text-xs text-slate-400 shrink-0">
                                {t.horaInicio}–{t.horaFim}
                              </span>
                              {t.rotinaNome && <span className="text-[11px] text-slate-400 truncate">{t.rotinaNome}</span>}
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_TURNO_ESTILO[t.status]}`}>
                                {t.status}
                              </span>
                              {expandido ? (
                                <ChevronUp size={14} className="text-slate-400" />
                              ) : (
                                <ChevronDown size={14} className="text-slate-400" />
                              )}
                            </div>
                          </button>
                          {expandido && (
                            <div className="px-3 pb-3">
                              <JustificativaEscalonamento
                                colaboradorNome={colaborador?.nome ?? t.colaboradorId}
                                justificativas={t.justificativas ?? []}
                              />
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
              {turnosPorData.length === 0 && (
                <p className="text-xs text-slate-400">
                  Nenhum turno foi gerado — confira se há rotinas/cobertura cadastradas para o período.
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              onClick={handlePublicar}
              disabled={publicando || publicado || somenteLeitura}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 transition-colors disabled:opacity-50"
            >
              {publicando ? <RefreshCw size={14} className="animate-spin" /> : <Upload size={14} />}
              {publicado ? 'Escala publicada' : publicando ? 'Publicando…' : 'Publicar escala'}
            </button>
            {publicado && (
              <span className="flex items-center gap-1.5 text-xs text-emerald-700 font-semibold">
                <CheckCircle2 size={14} /> Salva com sucesso
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default GeradorEscala;
