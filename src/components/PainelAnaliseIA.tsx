/**
 * PainelAnaliseIA — Gestão360
 *
 * Exibe a análise inteligente do colaborador gerada pela IA:
 *  - Competências identificadas no histórico (com nível e confiança)
 *  - Padrões de comportamento (positivos e negativos, com frequência)
 *  - Recomendações de treinamento específicas
 *
 * Integra-se ao PainelDesenvolvimento dentro da aba "Desenvolvimento"
 * do ColaboradorProfile. O gestor aciona a análise explicitamente —
 * nunca roda em background (princípio de economia de tokens).
 */

import React, { useState, useCallback } from 'react';
import {
  Sparkles, RefreshCw, TrendingUp, TrendingDown,
  Minus, BookOpen, AlertTriangle, CheckCircle2,
  ChevronDown, ChevronUp, Zap,
} from 'lucide-react';
import {
  AnaliseColaborador,
  CompetenciaIdentificadaIA,
  PadraoComportamentoIA,
  RecomendacaoTreinamentoIA,
  analisarColaborador,
  invalidarCacheAnalise,
} from '../services/AnaliseColaboradorService';
import { Colaborador, TimelineRegistro, CapacidadeBiblioteca, CompetenciaBiblioteca } from '../types';

// ── Props ─────────────────────────────────────────────────────────────────────

interface PainelAnaliseIAProps {
  colaborador: Colaborador;
  timeline: TimelineRegistro[];
  capacidades: CapacidadeBiblioteca[];
  competencias: CompetenciaBiblioteca[];
  resumoExistente?: string;
}

// ── Helpers visuais ───────────────────────────────────────────────────────────

const NIVEL_CONFIG = {
  'Em Desenvolvimento': { cor: 'bg-amber-100 text-amber-800 border-amber-200', icone: TrendingUp, dot: 'bg-amber-400' },
  'Aplicado':           { cor: 'bg-teal-100 text-teal-800 border-teal-200',   icone: CheckCircle2, dot: 'bg-teal-500' },
  'Referência':         { cor: 'bg-indigo-100 text-indigo-800 border-indigo-200', icone: Zap, dot: 'bg-indigo-500' },
};

const URGENCIA_CONFIG = {
  baixa: { cor: 'text-slate-500 bg-slate-100', label: 'Baixa prioridade' },
  media: { cor: 'text-amber-700 bg-amber-50',  label: 'Prioridade média' },
  alta:  { cor: 'text-rose-700 bg-rose-50',    label: 'Alta prioridade' },
};

function BarraConfianca({ valor }: { valor: number }) {
  const pct = Math.round(valor * 100);
  const cor = pct >= 80 ? 'bg-teal-500' : pct >= 60 ? 'bg-amber-400' : 'bg-slate-300';
  return (
    <div className="flex items-center gap-1.5 mt-1">
      <div className="flex-1 h-1 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${cor}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-slate-400 tabular-nums">{pct}%</span>
    </div>
  );
}

function CardCompetencia({ item }: { item: CompetenciaIdentificadaIA }) {
  const [aberto, setAberto] = useState(false);
  const cfg = NIVEL_CONFIG[item.nivel] || NIVEL_CONFIG['Em Desenvolvimento'];
  const Icone = cfg.icone;
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 flex-1 min-w-0">
          <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${cfg.dot}`} />
          <div className="flex-1 min-w-0">
            <p className="font-semibold text-slate-800 text-sm truncate">{item.nome}</p>
            <p className="text-[11px] text-slate-400">{item.competencia}</p>
            <BarraConfianca valor={item.confianca} />
          </div>
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <span className={`flex items-center gap-1 text-[11px] font-bold px-2 py-1 rounded-lg border ${cfg.cor}`}>
            <Icone size={11} /> {item.nivel}
          </span>
          <button
            onClick={() => setAberto(a => !a)}
            className="p-1 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            {aberto ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </button>
        </div>
      </div>
      {aberto && (
        <div className="mt-3 pl-4 border-l-2 border-slate-100 space-y-1.5">
          <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Evidências nos registros</p>
          {item.evidenciasEncontradas.map((ev, i) => (
            <p key={i} className="text-xs text-slate-600 italic">"{ev}"</p>
          ))}
          {item.observacao && (
            <p className="text-xs text-slate-500 mt-1">{item.observacao}</p>
          )}
        </div>
      )}
    </div>
  );
}

function CardPadrao({ item }: { item: PadraoComportamentoIA }) {
  const Icone = item.tipo === 'positivo' ? TrendingUp : item.tipo === 'negativo' ? TrendingDown : Minus;
  const cor = item.tipo === 'positivo'
    ? 'bg-teal-50 border-teal-100 text-teal-700'
    : item.tipo === 'negativo'
    ? 'bg-rose-50 border-rose-100 text-rose-700'
    : 'bg-slate-50 border-slate-100 text-slate-600';
  const iconeCor = item.tipo === 'positivo' ? 'text-teal-500' : item.tipo === 'negativo' ? 'text-rose-500' : 'text-slate-400';
  return (
    <div className={`rounded-2xl border p-4 ${cor}`}>
      <div className="flex items-start gap-2.5">
        <Icone size={16} className={`shrink-0 mt-0.5 ${iconeCor}`} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold">{item.descricao}</p>
          <p className="text-[11px] mt-1 opacity-75">{item.frequencia} · Última ocorrência: {item.ultimaOcorrencia}</p>
          {item.recomendacao && (
            <p className="text-[11px] mt-2 font-medium opacity-90">→ {item.recomendacao}</p>
          )}
        </div>
      </div>
    </div>
  );
}

function CardRecomendacao({ item }: { item: RecomendacaoTreinamentoIA }) {
  const cfg = URGENCIA_CONFIG[item.urgencia] || URGENCIA_CONFIG.baixa;
  return (
    <div className="bg-white border border-slate-100 rounded-2xl p-4 flex items-start gap-3">
      <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
        <BookOpen size={16} className="text-indigo-600" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-semibold text-slate-800 text-sm">{item.capacidade}</p>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cfg.cor}`}>{cfg.label}</span>
        </div>
        <p className="text-xs text-slate-500 mt-1">{item.motivo}</p>
        <p className="text-xs text-indigo-600 font-semibold mt-1.5">📌 {item.tipoTreinamento}</p>
      </div>
    </div>
  );
}

// ── Componente principal ──────────────────────────────────────────────────────

export default function PainelAnaliseIA({
  colaborador,
  timeline,
  capacidades,
  competencias,
  resumoExistente,
}: PainelAnaliseIAProps) {
  const [analise, setAnalise] = useState<AnaliseColaborador | null>(null);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [abaAtiva, setAbaAtiva] = useState<'competencias' | 'padroes' | 'treinamentos'>('competencias');

  const totalAnalisaveis = timeline.filter(r => [
    'Feedback Positivo', 'Feedback Corretivo', 'Reconhecimento',
    'Conversa Individual (1:1)', 'Plano de Desenvolvimento Individual (PDI)',
    'Advertência', 'Suspensão', 'Elogio de Cliente', 'Reclamação de Cliente',
    'Acompanhamento', 'Outros',
  ].includes(r.tipo)).length;

  const executarAnalise = useCallback(async (forcar = false) => {
    setCarregando(true);
    setErro(null);
    try {
      const resultado = await analisarColaborador(
        colaborador, timeline, capacidades, competencias, resumoExistente, forcar
      );
      setAnalise(resultado);
    } catch (e: any) {
      setErro(e?.message || 'Não consegui analisar agora. Tente novamente.');
    } finally {
      setCarregando(false);
    }
  }, [colaborador, timeline, capacidades, competencias, resumoExistente]);

  const forcarAtualizacao = () => {
    invalidarCacheAnalise(colaborador.id);
    executarAnalise(true);
  };

  // ── Estado: não iniciado ──────────────────────────────────────────────────
  if (!analise && !carregando) {
    return (
      <div className="bg-gradient-to-br from-slate-50 to-indigo-50/30 border border-slate-100 rounded-3xl p-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-100 flex items-center justify-center shrink-0">
            <Sparkles size={22} className="text-indigo-600" />
          </div>
          <div className="flex-1">
            <h3 className="font-extrabold text-slate-900 text-base">Análise Inteligente de Competências</h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              A IA analisa os <strong>{totalAnalisaveis} registros</strong> da timeline deste colaborador — feedbacks, conversas, PDIs, reconhecimentos e ocorrências — e identifica automaticamente competências em desenvolvimento ou já aplicadas, padrões de comportamento (positivos e negativos) e recomendações de treinamento específicas.
            </p>
            <p className="text-[11px] text-slate-400 mt-2">
              A análise leva 10-20 segundos e é salva localmente para não precisar repetir.
            </p>
            {erro && (
              <div className="mt-3 flex items-start gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-xl px-3 py-2">
                <AlertTriangle size={13} className="shrink-0 mt-0.5" /> {erro}
              </div>
            )}
            <button
              onClick={() => executarAnalise(false)}
              disabled={totalAnalisaveis === 0}
              className="mt-4 flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer transition"
            >
              <Sparkles size={15} />
              {totalAnalisaveis === 0 ? 'Sem registros para analisar' : 'Iniciar Análise com IA'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Estado: carregando ────────────────────────────────────────────────────
  if (carregando) {
    return (
      <div className="bg-white border border-slate-100 rounded-3xl p-8 flex flex-col items-center gap-4 text-center">
        <div className="w-14 h-14 rounded-2xl bg-indigo-50 flex items-center justify-center">
          <Sparkles size={24} className="text-indigo-500 animate-pulse" />
        </div>
        <div>
          <p className="font-bold text-slate-800">Analisando o histórico...</p>
          <p className="text-xs text-slate-400 mt-1">A IA está lendo {totalAnalisaveis} registros e mapeando competências. Aguarde.</p>
        </div>
        <div className="flex gap-1">
          {[0,1,2].map(i => (
            <div key={i} className="w-2 h-2 rounded-full bg-indigo-400 animate-bounce" style={{ animationDelay: `${i * 150}ms` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!analise) return null;

  // ── Estado: análise pronta ────────────────────────────────────────────────
  const dataFormatada = new Date(analise.geradaEm).toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit'
  });

  const abas = [
    { id: 'competencias', label: `Competências (${analise.competenciasIdentificadas.length})` },
    { id: 'padroes',      label: `Padrões (${analise.padroesComportamento.length})` },
    { id: 'treinamentos', label: `Treinamentos (${analise.recomendacoesTreinamento.length})` },
  ] as const;

  return (
    <div className="bg-white border border-slate-100 rounded-3xl shadow-sm overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-indigo-50/40 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-indigo-100 flex items-center justify-center">
            <Sparkles size={16} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="font-bold text-slate-800 text-sm">Análise de Competências — IA</h3>
            <p className="text-[10px] text-slate-400">{analise.totalEventosAnalisados} registros · gerada em {dataFormatada}</p>
          </div>
        </div>
        <button
          onClick={forcarAtualizacao}
          disabled={carregando}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-xl cursor-pointer transition"
          title="Reanalisar todos os registros"
        >
          <RefreshCw size={12} className={carregando ? 'animate-spin' : ''} />
          Atualizar
        </button>
      </div>

      {/* Resumo narrativo */}
      <div className="px-6 py-4 bg-slate-50 border-b border-slate-100">
        <p className="text-sm text-slate-700 leading-relaxed">{analise.resumoNarrativo}</p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-100 px-6">
        {abas.map(aba => (
          <button
            key={aba.id}
            onClick={() => setAbaAtiva(aba.id)}
            className={`py-3 px-3 text-xs font-bold border-b-2 transition cursor-pointer whitespace-nowrap ${
              abaAtiva === aba.id
                ? 'border-indigo-500 text-indigo-700'
                : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      {/* Conteúdo das tabs */}
      <div className="p-6 space-y-3">
        {abaAtiva === 'competencias' && (
          analise.competenciasIdentificadas.length > 0
            ? analise.competenciasIdentificadas
                .sort((a, b) => {
                  const ordem = { 'Referência': 0, 'Aplicado': 1, 'Em Desenvolvimento': 2 };
                  return (ordem[a.nivel] ?? 3) - (ordem[b.nivel] ?? 3);
                })
                .map((item, i) => <CardCompetencia key={i} item={item} />)
            : <p className="text-sm text-slate-400 text-center py-6">Nenhuma competência identificada com evidências suficientes nos registros.</p>
        )}

        {abaAtiva === 'padroes' && (
          analise.padroesComportamento.length > 0
            ? analise.padroesComportamento
                .sort((a, b) => {
                  const ordem = { negativo: 0, positivo: 1, neutro: 2 };
                  return (ordem[a.tipo] ?? 3) - (ordem[b.tipo] ?? 3);
                })
                .map((item, i) => <CardPadrao key={i} item={item} />)
            : <p className="text-sm text-slate-400 text-center py-6">Nenhum padrão de comportamento identificado no período analisado.</p>
        )}

        {abaAtiva === 'treinamentos' && (
          analise.recomendacoesTreinamento.length > 0
            ? analise.recomendacoesTreinamento
                .sort((a, b) => {
                  const ordem = { alta: 0, media: 1, baixa: 2 };
                  return (ordem[a.urgencia] ?? 3) - (ordem[b.urgencia] ?? 3);
                })
                .map((item, i) => <CardRecomendacao key={i} item={item} />)
            : <p className="text-sm text-slate-400 text-center py-6">Sem recomendações de treinamento no momento.</p>
        )}
      </div>

      {/* Footer */}
      <div className="px-6 pb-4 text-center">
        <p className="text-[10px] text-slate-300">
          Análise gerada por IA a partir dos registros — sempre valide com seu julgamento como gestor.
          Nenhuma alteração é feita automaticamente sem sua aprovação.
        </p>
      </div>
    </div>
  );
}
