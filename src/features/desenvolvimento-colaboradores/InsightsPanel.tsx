/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Usuario, Insight } from '../../types';
import { DataService } from '../../services/DataService';
import { Sparkles, AlertTriangle, TrendingDown, Lightbulb, Check, X, RefreshCw } from 'lucide-react';

interface InsightsPanelProps {
  colaboradorId: string;
  currentUser?: Usuario;
}

const ICONE_POR_TIPO: Record<string, React.ElementType> = {
  risco: AlertTriangle,
  sugestao: Lightbulb,
  prognostico: TrendingDown,
};

const COR_POR_TIPO: Record<string, string> = {
  risco: 'bg-amber-50 text-amber-600',
  sugestao: 'bg-indigo-50 text-indigo-600',
  prognostico: 'bg-slate-100 text-slate-500',
};

// Motor de Desenvolvimento de Colaboradores — Insight/Recomendação (última
// camada do domínio). Um Insight nunca altera nada sozinho (Princípio 15 da
// Especificação v2): só existe "pendente" até um humano aceitar ou recusar.
// Aceitar um Insight de gap de competência cria um Objetivo automaticamente —
// é a única automação documentada, e fica visível no retorno da própria ação.
const InsightsPanel: React.FC<InsightsPanelProps> = ({ colaboradorId, currentUser }) => {
  const [carregando, setCarregando] = useState(true);
  const [insights, setInsights] = useState<Insight[]>([]);
  const [mensagemEfeito, setMensagemEfeito] = useState<string | null>(null);

  const podeDecidir = !!currentUser;

  const carregar = useCallback(async () => {
    setCarregando(true);
    try {
      const lista = await DataService.getInsights({ colaboradorId, status: 'pendente' });
      setInsights(lista);
    } finally {
      setCarregando(false);
    }
  }, [colaboradorId]);

  useEffect(() => {
    carregar();
  }, [carregar]);

  const decidir = async (id: string, decisao: 'aceito' | 'recusado') => {
    setMensagemEfeito(null);
    try {
      const resultado = await DataService.decidirInsight(id, decisao, currentUser?.id);
      if (resultado.efeito?.tipo === 'objetivo_criado') {
        setMensagemEfeito('Um novo Objetivo de desenvolvimento foi criado a partir desta recomendação.');
      }
      await carregar();
    } catch {
      // silencioso — o Insight permanece pendente na lista se algo falhar
    }
  };

  if (carregando) {
    return (
      <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 flex items-center gap-2 text-sm text-slate-400">
        <RefreshCw size={16} className="animate-spin" /> Carregando insights...
      </div>
    );
  }

  if (insights.length === 0) return null;

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-600">
          <Sparkles size={18} />
        </div>
        <div>
          <h3 className="font-bold text-slate-800">Insights</h3>
          <p className="text-xs text-slate-400">Observações geradas por regra — nada muda até você decidir</p>
        </div>
      </div>

      {mensagemEfeito && (
        <div className="text-xs text-teal-700 bg-teal-50 rounded-xl px-3 py-2 mb-3">{mensagemEfeito}</div>
      )}

      <div className="space-y-2">
        {insights.map((insight) => {
          const Icone = ICONE_POR_TIPO[insight.tipo] || Lightbulb;
          const cor = COR_POR_TIPO[insight.tipo] || 'bg-slate-100 text-slate-500';
          return (
            <div key={insight.id} className="flex items-start gap-3 rounded-2xl border border-slate-100 px-4 py-3">
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${cor}`}>
                <Icone size={15} />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm text-slate-700">{insight.texto}</p>
                <p className="text-[10px] text-slate-400 mt-1 uppercase tracking-wide">
                  {insight.tipo} · confiança {Math.round(insight.confianca * 100)}% · origem: {insight.origem}
                </p>
              </div>
              {podeDecidir && (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => decidir(insight.id, 'aceito')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-teal-600 bg-teal-50 hover:bg-teal-100 rounded-lg px-2 py-1"
                  >
                    <Check size={12} /> Aceitar
                  </button>
                  <button
                    onClick={() => decidir(insight.id, 'recusado')}
                    className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 bg-slate-100 hover:bg-slate-200 rounded-lg px-2 py-1"
                  >
                    <X size={12} /> Recusar
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default InsightsPanel;
