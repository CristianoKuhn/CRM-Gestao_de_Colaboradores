/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { useEffect, useState } from 'react';
import { BarChart3 } from 'lucide-react';
import { FormularioInstancia } from '../../../types';
import { DataService } from '../../../services/DataService';

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 5
//
// PainelAnalyticsFormularios — primeira leitura agregada sobre as
// FormularioInstancia concluídas, provando que a modelagem (arquitetura,
// seção 6) sustenta Analytics sem precisar de tabela de agregação: os dados
// já vêm normalizados o suficiente (resultado por instância, snapshot
// organizacional, timestamps) para calcular tudo em memória aqui.
//
// Autossuficiente de propósito: busca seus próprios dados via DataService,
// para não aumentar a superfície de estado do Dashboard.tsx — só precisa
// ser importado e renderizado.
// ═══════════════════════════════════════════════════════════════════

interface MetricasAnalytics {
  totalConcluidas: number;
  mediaGeralEmpresa: number | null;
  distribuicaoParecer: { label: string; total: number }[];
  tempoMedioConclusaoDias: number | null;
}

function calcularMetricas(instancias: FormularioInstancia[]): MetricasAnalytics {
  const concluidas = instancias.filter((i) => i.estadoWorkflow === 'concluida' && i.resultado);

  const medias = concluidas
    .map((i) => i.resultado?.mediaPonderada ?? i.resultado?.mediaGeral)
    .filter((m): m is number => typeof m === 'number');
  const mediaGeralEmpresa = medias.length > 0 ? medias.reduce((a, b) => a + b, 0) / medias.length : null;

  const contagemParecer: Record<string, number> = {};
  concluidas.forEach((i) => {
    const parecer = i.resultado?.parecerFinal;
    if (!parecer) return;
    contagemParecer[parecer] = (contagemParecer[parecer] || 0) + 1;
  });
  const distribuicaoParecer = Object.entries(contagemParecer)
    .map(([label, total]) => ({ label, total }))
    .sort((a, b) => b.total - a.total);

  const duracoes = concluidas
    .filter((i) => i.dataInicio && i.dataConclusao)
    .map((i) => (new Date(i.dataConclusao!).getTime() - new Date(i.dataInicio!).getTime()) / (1000 * 60 * 60 * 24))
    .filter((d) => d >= 0);
  const tempoMedioConclusaoDias = duracoes.length > 0 ? duracoes.reduce((a, b) => a + b, 0) / duracoes.length : null;

  return {
    totalConcluidas: concluidas.length,
    mediaGeralEmpresa,
    distribuicaoParecer,
    tempoMedioConclusaoDias,
  };
}

function corDoParecer(parecer: string): string {
  const normalizado = parecer.toLowerCase();
  if (normalizado.includes('excelente') || normalizado.includes('muito bom') || normalizado.includes('aprovado')) {
    return 'bg-emerald-500';
  }
  if (normalizado.includes('reprovado') || normalizado.includes('acompanhamento')) {
    return 'bg-rose-500';
  }
  return 'bg-slate-400';
}

export default function PainelAnalyticsFormularios() {
  const [carregando, setCarregando] = useState(true);
  const [metricas, setMetricas] = useState<MetricasAnalytics | null>(null);

  useEffect(() => {
    let cancelado = false;
    DataService.getFormularioInstancias()
      .then((instancias) => {
        if (!cancelado) setMetricas(calcularMetricas(instancias));
      })
      .catch((e) => console.error('Erro ao carregar analytics do motor de formulários:', e))
      .finally(() => {
        if (!cancelado) setCarregando(false);
      });
    return () => {
      cancelado = true;
    };
  }, []);

  if (carregando || !metricas || metricas.totalConcluidas === 0) return null;

  const maiorFatia = Math.max(...metricas.distribuicaoParecer.map((d) => d.total), 1);

  return (
    <div className="bg-white border border-slate-100 rounded-3xl p-6 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <BarChart3 size={18} className="text-slate-500" />
        <h2 className="text-sm font-bold text-slate-800">Analytics do Motor de Formulários</h2>
        <span className="text-[10px] text-slate-400">(avaliações concluídas)</span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Concluídas</p>
          <p className="text-2xl font-extrabold text-slate-900">{metricas.totalConcluidas}</p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Média geral</p>
          <p className="text-2xl font-extrabold text-slate-900">
            {metricas.mediaGeralEmpresa !== null ? metricas.mediaGeralEmpresa.toFixed(1) : '—'}
          </p>
        </div>
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Tempo médio p/ concluir</p>
          <p className="text-2xl font-extrabold text-slate-900">
            {metricas.tempoMedioConclusaoDias !== null ? `${metricas.tempoMedioConclusaoDias.toFixed(1)}d` : '—'}
          </p>
        </div>
      </div>

      {metricas.distribuicaoParecer.length > 0 && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase mb-2">Distribuição de parecer</p>
          <div className="flex flex-col gap-1.5">
            {metricas.distribuicaoParecer.map((item) => (
              <div key={item.label} className="flex items-center gap-2">
                <span className="text-[11px] text-slate-600 w-40 truncate">{item.label}</span>
                <div className="flex-1 bg-slate-100 rounded-full h-2">
                  <div
                    className={`h-2 rounded-full ${corDoParecer(item.label)}`}
                    style={{ width: `${(item.total / maiorFatia) * 100}%` }}
                  />
                </div>
                <span className="text-[11px] font-bold text-slate-500 w-6 text-right">{item.total}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
