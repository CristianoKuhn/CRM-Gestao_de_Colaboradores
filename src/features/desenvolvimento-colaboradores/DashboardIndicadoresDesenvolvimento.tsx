/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Usuario, Setor, Cargo, Programa, IndicadorDesenvolvimento, Insight } from '../../types';
import { DataService } from '../../services/DataService';
import { BarChart3, RefreshCw, AlertTriangle, TrendingUp, Users, Building2, Sparkles } from 'lucide-react';

interface DashboardIndicadoresDesenvolvimentoProps {
  currentUser: Usuario;
  setores: Setor[];
  cargos: Cargo[];
}

const ROTULOS_INDICADOR: Record<string, string> = {
  taxa_conclusao: 'Taxa de conclusão',
  tempo_medio_conclusao_dias: 'Tempo médio até concluir (dias)',
  inscricoes_em_andamento: 'Inscrições em andamento',
  etapas_atrasadas: 'Etapas atrasadas',
  cobertura_setor: 'Cobertura do setor',
  gap_medio_setor: 'Gap médio do setor',
  bench_strength_cargo: 'Prontidão de sucessão (bench strength)',
  taxa_atraso_geral: 'Taxa de atraso geral',
};

const INDICADORES_PERCENTUAL = new Set([
  'taxa_conclusao',
  'cobertura_setor',
  'gap_medio_setor',
  'bench_strength_cargo',
  'taxa_atraso_geral',
]);

function formatarValor(tipoIndicador: string, valor: number): string {
  if (INDICADORES_PERCENTUAL.has(tipoIndicador)) return `${valor}%`;
  return String(valor);
}

// Motor de Desenvolvimento de Colaboradores — Dashboard de Indicadores. Todo
// valor mostrado aqui vem do cache já recalculado no backend (Princípio 14 da
// Especificação v2 — Indicadores são sempre derivados, nunca escritos
// manualmente); esta tela nunca calcula nada localmente, só lê e formata.
const DashboardIndicadoresDesenvolvimento: React.FC<DashboardIndicadoresDesenvolvimentoProps> = ({
  currentUser,
  setores,
  cargos,
}) => {
  const [carregando, setCarregando] = useState(true);
  const [recalculando, setRecalculando] = useState(false);
  const [indicadores, setIndicadores] = useState<IndicadorDesenvolvimento[]>([]);
  const [programas, setProgramas] = useState<Programa[]>([]);
  const [insightsPrograma, setInsightsPrograma] = useState<Insight[]>([]);
  const [gerandoInsights, setGerandoInsights] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  const podeRecalcular = currentUser.perfil === 'Administrador';

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const [listaIndicadores, listaProgramas, listaInsights] = await Promise.all([
        DataService.getIndicadoresDesenvolvimento(),
        DataService.getProgramas(),
        DataService.getInsights({ entidadeTipo: 'programa', status: 'pendente' }),
      ]);
      setIndicadores(listaIndicadores);
      setProgramas(listaProgramas);
      setInsightsPrograma(listaInsights);
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const recalcular = async () => {
    setErro(null);
    setRecalculando(true);
    try {
      await DataService.recalcularIndicadoresDesenvolvimentoAgora();
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível recalcular os indicadores agora.');
    } finally {
      setRecalculando(false);
    }
  };

  const gerarInsights = async () => {
    setErro(null);
    setGerandoInsights(true);
    try {
      await DataService.gerarInsightsDesenvolvimentoAgora();
      await carregar();
    } catch (e: any) {
      setErro(e?.message || 'Não foi possível gerar os insights agora.');
    } finally {
      setGerandoInsights(false);
    }
  };

  const decidirInsightPrograma = async (id: string, decisao: 'aceito' | 'recusado') => {
    await DataService.decidirInsight(id, decisao, currentUser.id);
    await carregar();
  };

  const valorDe = (tipoIndicador: string, escopoTipo: string, escopoId: string): number | null => {
    const item = indicadores.find(
      (i) => i.tipoIndicador === tipoIndicador && i.escopoTipo === escopoTipo && (i.escopoId || '') === escopoId
    );
    return item ? item.valor : null;
  };

  const indicadoresEmpresa = indicadores.filter((i) => i.escopoTipo === 'empresa');
  const nomePrograma = (id: string) => programas.find((p) => p.id === id)?.nome || 'Programa';

  if (carregando) {
    return (
      <div className="flex items-center justify-center py-24 text-slate-400 gap-2">
        <RefreshCw size={18} className="animate-spin" />
        Carregando Indicadores de Desenvolvimento...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-teal-500/10 flex items-center justify-center text-teal-600">
            <BarChart3 size={22} />
          </div>
          <div>
            <h2 className="font-bold text-xl text-slate-900">Indicadores de Desenvolvimento</h2>
            <p className="text-sm text-slate-400">
              Sempre derivados de Inscrições, Etapas e Perfil — recalculados todo dia, ou sob demanda.
            </p>
          </div>
        </div>
        {podeRecalcular && (
          <div className="flex items-center gap-2">
            <button
              onClick={recalcular}
              disabled={recalculando}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-teal-700 bg-teal-50 hover:bg-teal-100 transition-colors disabled:opacity-50"
            >
              <RefreshCw size={14} className={recalculando ? 'animate-spin' : ''} /> Recalcular agora
            </button>
            <button
              onClick={gerarInsights}
              disabled={gerandoInsights}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-amber-700 bg-amber-50 hover:bg-amber-100 transition-colors disabled:opacity-50"
            >
              <Sparkles size={14} className={gerandoInsights ? 'animate-spin' : ''} /> Gerar insights agora
            </button>
          </div>
        )}
      </div>

      {erro && (
        <div className="flex items-start gap-2 text-xs text-amber-700 bg-amber-50 rounded-xl px-3 py-2">
          <AlertTriangle size={14} className="shrink-0 mt-0.5" />
          {erro}
        </div>
      )}

      {insightsPrograma.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
          <div className="flex items-center gap-2 mb-4">
            <Sparkles size={18} className="text-amber-500" />
            <h3 className="font-bold text-slate-800">Insights de Programa</h3>
          </div>
          <div className="space-y-2">
            {insightsPrograma.map((insight) => (
              <div key={insight.id} className="flex items-start gap-3 rounded-2xl border border-amber-100 bg-amber-50/40 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-slate-700">{insight.texto}</p>
                  <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                    {nomePrograma(insight.entidadeId)} · confiança {Math.round(insight.confianca * 100)}%
                  </p>
                </div>
                {podeRecalcular && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => decidirInsightPrograma(insight.id, 'aceito')}
                      className="text-[11px] font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg px-2 py-1"
                    >
                      Aceitar
                    </button>
                    <button
                      onClick={() => decidirInsightPrograma(insight.id, 'recusado')}
                      className="text-[11px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1"
                    >
                      Recusar
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {indicadores.length === 0 ? (
        <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-10 text-center text-sm text-slate-400">
          Nenhum indicador calculado ainda. {podeRecalcular ? 'Clique em "Recalcular agora" para gerar o primeiro cache.' : ''}
        </div>
      ) : (
        <>
          {/* Empresa */}
          <div className="grid sm:grid-cols-2 gap-4">
            {indicadoresEmpresa.map((i) => (
              <div key={i.id} className="bg-white rounded-3xl shadow-sm border border-slate-100 p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  {ROTULOS_INDICADOR[i.tipoIndicador] || i.tipoIndicador}
                </p>
                <p className="text-3xl font-bold text-slate-800 mt-1">{formatarValor(i.tipoIndicador, i.valor)}</p>
              </div>
            ))}
          </div>

          {/* Programas */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={18} className="text-teal-500" />
              <h3 className="font-bold text-slate-800">Por Programa</h3>
            </div>
            <div className="space-y-2">
              {programas.map((programa) => {
                const taxaConclusao = valorDe('taxa_conclusao', 'programa', programa.id);
                const tempoMedio = valorDe('tempo_medio_conclusao_dias', 'programa', programa.id);
                const emAndamento = valorDe('inscricoes_em_andamento', 'programa', programa.id);
                const atrasadas = valorDe('etapas_atrasadas', 'programa', programa.id);
                if (taxaConclusao === null && emAndamento === null) return null;
                return (
                  <div key={programa.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <span className="font-semibold text-sm text-slate-700 truncate">{nomePrograma(programa.id)}</span>
                    <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                      <span>Conclusão: <b className="text-slate-700">{taxaConclusao ?? 0}%</b></span>
                      <span>Tempo médio: <b className="text-slate-700">{tempoMedio ?? 0}d</b></span>
                      <span>Em andamento: <b className="text-slate-700">{emAndamento ?? 0}</b></span>
                      {(atrasadas ?? 0) > 0 && (
                        <span className="text-rose-500 font-semibold">{atrasadas} atrasada(s)</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Setores */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Building2 size={18} className="text-teal-500" />
              <h3 className="font-bold text-slate-800">Por Setor</h3>
            </div>
            <div className="space-y-2">
              {setores.map((setor) => {
                const cobertura = valorDe('cobertura_setor', 'setor', setor.id);
                const gap = valorDe('gap_medio_setor', 'setor', setor.id);
                if (cobertura === null) return null;
                return (
                  <div key={setor.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <span className="font-semibold text-sm text-slate-700 truncate">{setor.nome}</span>
                    <div className="flex items-center gap-4 text-xs text-slate-500 shrink-0">
                      <span>Cobertura: <b className="text-slate-700">{cobertura}%</b></span>
                      <span className={gap && gap > 0 ? 'text-amber-600 font-semibold' : ''}>
                        Gap médio: <b>{gap ?? 0}%</b>
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Cargos */}
          <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
            <div className="flex items-center gap-2 mb-4">
              <Users size={18} className="text-teal-500" />
              <h3 className="font-bold text-slate-800">Prontidão de Sucessão por Cargo</h3>
            </div>
            <div className="space-y-2">
              {cargos.map((cargo) => {
                const bench = valorDe('bench_strength_cargo', 'cargo', cargo.id);
                if (bench === null) return null;
                return (
                  <div key={cargo.id} className="flex items-center justify-between rounded-2xl border border-slate-100 px-4 py-3">
                    <span className="font-semibold text-sm text-slate-700 truncate">{cargo.nome}</span>
                    <b className="text-sm text-slate-700 shrink-0">{bench}%</b>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default DashboardIndicadoresDesenvolvimento;
