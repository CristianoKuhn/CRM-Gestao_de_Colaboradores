/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Fase 6 — Motor de Sugestão de Distribuição de Férias por Setor. Esta tela
// NÃO contém regra de negócio nenhuma — só chama
// features/disponibilidade/engine/SugestorDistribuicaoFerias.ts e desenha o
// resultado, mesma separação já usada no GeradorEscala.tsx da Escala
// Inteligente. "Aplicar" reaproveita o handleSalvarFerias do pai, para que a
// sugestão aceita passe pelo mesmo lançamento no razão que qualquer outra
// férias — sem caminho paralelo.

import React, { useMemo, useState } from 'react';
import { Colaborador, ConfiguracaoFerias, Ferias, PeriodoAquisitivo, Setor, SugestaoDistribuicaoFerias } from '../types';
import { gerarSugestoesSetor } from '../features/disponibilidade/engine/SugestorDistribuicaoFerias';
import { Sparkles, RefreshCw, CheckCircle2, ChevronDown, ChevronUp, X } from 'lucide-react';

interface SugestaoDistribuicaoModalProps {
  setores: Setor[];
  colaboradores: Colaborador[];
  periodosAquisitivos: PeriodoAquisitivo[];
  ferias: Ferias[];
  configuracaoFerias: ConfiguracaoFerias | null;
  onAplicar: (ferias: Ferias) => Promise<void> | void;
  onClose: () => void;
}

const NOMES_MESES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

function corDaPontuacao(pontuacao: number): string {
  if (pontuacao >= 0.7) return 'text-emerald-700 bg-emerald-50';
  if (pontuacao >= 0.4) return 'text-amber-700 bg-amber-50';
  return 'text-rose-700 bg-rose-50';
}

export function SugestaoDistribuicaoModal({
  setores,
  colaboradores,
  periodosAquisitivos,
  ferias,
  configuracaoFerias,
  onAplicar,
  onClose,
}: SugestaoDistribuicaoModalProps) {
  const anoPadrao = new Date().getFullYear();
  const [setorId, setSetorId] = useState('');
  const [ano, setAno] = useState(anoPadrao);
  const [sugestoes, setSugestoes] = useState<SugestaoDistribuicaoFerias[] | null>(null);
  const [expandidaId, setExpandidaId] = useState<string | null>(null);
  const [aplicando, setAplicando] = useState<string | null>(null);
  const [aplicadas, setAplicadas] = useState<Set<string>>(new Set());

  const colaboradorPorId = useMemo(() => new Map(colaboradores.map((c) => [c.id, c])), [colaboradores]);

  function chaveSugestao(s: SugestaoDistribuicaoFerias): string {
    return `${s.colaboradorId}-${s.periodoAquisitivoId}`;
  }

  function handleGerar() {
    if (!setorId) return;
    const colaboradoresDoSetor = colaboradores.filter((c) => c.setorId === setorId && c.situacao !== 'Desligado');
    const geradas = gerarSugestoesSetor(
      colaboradoresDoSetor,
      periodosAquisitivos,
      ferias,
      configuracaoFerias ?? {
        diasAntecedenciaAlerta: 90,
        permitirFeriasProlongadas: true,
        maximoDiasSimultaneoSetor: 3,
        maximoPercentualEquipe: 35,
        diasMinimosAntecedenciaPlanejamento: 7,
        opcoesAntecedencia: [30, 60, 90, 120, 180],
        salarioMinimoDias: 10,
        prazoConcessivoMeses: 12,
        maximoParcelas: 3,
        permitirVendaFerias: true,
        diasVendidosMaximo: 10,
        bloquearSobreposicao: false,
      },
      ano
    );
    setSugestoes(geradas);
    setAplicadas(new Set());
  }

  async function handleAplicar(s: SugestaoDistribuicaoFerias) {
    const chave = chaveSugestao(s);
    setAplicando(chave);
    try {
      const novaFerias: Ferias = {
        id: `fer-sugestao-${Date.now()}`,
        colaboradorId: s.colaboradorId,
        periodoAquisitivoId: s.periodoAquisitivoId,
        dataInicio: s.dataInicio,
        dataFim: s.dataFim,
        dias: s.dias,
        status: 'planejada',
        observacoes: 'Criada a partir da sugestão de distribuição automática.',
        createdAt: new Date().toISOString(),
      };
      await onAplicar(novaFerias);
      setAplicadas((prev) => new Set(prev).add(chave));
    } finally {
      setAplicando(null);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[60] p-4">
      <div className="bg-white rounded-2xl p-6 max-w-3xl w-full shadow-2xl max-h-[85vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-1">
          <h3 className="font-semibold text-lg flex items-center gap-2">
            <Sparkles size={18} className="text-teal-500" /> Sugestão de distribuição de férias
          </h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X size={18} />
          </button>
        </div>
        <p className="text-xs text-slate-500 mb-4">
          O motor propõe automaticamente em que mês cada colaborador do setor deveria tirar férias, evitando
          concentração e priorizando quem está mais perto de perder os dias. Nada é salvo até você clicar em
          "Aplicar" em cada linha.
        </p>

        <div className="flex items-end gap-3 flex-wrap mb-5">
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Setor</label>
            <select
              value={setorId}
              onChange={(e) => setSetorId(e.target.value)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500 min-w-[180px]"
            >
              <option value="">Selecione...</option>
              {setores.map((s) => (
                <option key={s.id} value={s.id}>{s.nome}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Ano</label>
            <input
              type="number"
              value={ano}
              onChange={(e) => setAno(parseInt(e.target.value) || anoPadrao)}
              className="border border-slate-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500 w-24"
            />
          </div>
          <button
            onClick={handleGerar}
            disabled={!setorId}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw size={13} /> Gerar sugestões
          </button>
        </div>

        {sugestoes && sugestoes.length === 0 && (
          <p className="text-xs text-slate-400">
            Nenhum colaborador elegível neste setor — verifique se há período aquisitivo ativo com saldo suficiente.
          </p>
        )}

        {sugestoes && sugestoes.length > 0 && (
          <div className="space-y-2">
            {sugestoes.map((s) => {
              const chave = chaveSugestao(s);
              const colaborador = colaboradorPorId.get(s.colaboradorId);
              const expandida = expandidaId === chave;
              const jaAplicada = aplicadas.has(chave);
              return (
                <div key={chave} className="rounded-xl border border-slate-100">
                  <div className="flex items-center justify-between gap-2 px-4 py-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <button onClick={() => setExpandidaId(expandida ? null : chave)} className="text-slate-400 shrink-0">
                        {expandida ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                      </button>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-800 truncate">{colaborador?.nome ?? s.colaboradorId}</p>
                        <p className="text-[11px] text-slate-500">
                          {NOMES_MESES[s.mes - 1]}/{s.ano} · {s.dias} dia(s)
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${corDaPontuacao(s.pontuacao)}`}>
                        {Math.round(s.pontuacao * 100)}%
                      </span>
                      {jaAplicada ? (
                        <span className="flex items-center gap-1 text-xs text-emerald-700 font-semibold">
                          <CheckCircle2 size={14} /> Aplicada
                        </span>
                      ) : (
                        <button
                          onClick={() => handleAplicar(s)}
                          disabled={aplicando === chave}
                          className="px-3 py-1.5 rounded-lg text-xs font-semibold text-white bg-slate-800 hover:bg-slate-700 transition-colors disabled:opacity-50"
                        >
                          {aplicando === chave ? 'Aplicando…' : 'Aplicar'}
                        </button>
                      )}
                    </div>
                  </div>
                  {expandida && (
                    <div className="px-4 pb-3 space-y-1.5">
                      {s.justificativas.map((j, idx) => (
                        <div key={idx} className={`text-[11px] rounded-lg px-2.5 py-1.5 ${j.favoravel ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-50 text-slate-500'}`}>
                          <span className="font-semibold">{j.criterio}:</span> {j.descricao}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
