/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, ChevronDown, Check } from 'lucide-react';

// ═══════════════════════════════════════════════════════════════════
// FILTRO MENSAL — componente reutilizável
// ═══════════════════════════════════════════════════════════════════
// Usado nas dashboards que antes mostravam TODO o histórico de uma vez
// (Reconhecimento, Analytics e Indicadores). Por padrão, toda dashboard que
// usa este filtro deve nascer com `modo: 'mesAtual'` — ao entrar na tela, só
// o mês corrente aparece. A partir daí, a pessoa pode trocar para:
//   - "Todos os meses": remove o recorte de data por completo.
//   - "Escolher mês(es)": um ou mais meses específicos, dentro ou fora do
//     mês atual (ex.: só Março, ou Março + Abril + Julho).
// Este arquivo também exporta a lógica de comparação (dataDentroDoFiltroMensal)
// para que cada dashboard filtre sua própria lista de dados sem duplicar a
// regra de "o que conta como dentro do filtro".
// ═══════════════════════════════════════════════════════════════════

export type ModoFiltroMensal = 'mesAtual' | 'todos' | 'personalizado';

export interface FiltroMensalValor {
  modo: ModoFiltroMensal;
  // Só relevante quando modo === 'personalizado'. Cada item é uma chave
  // "AAAA-MM" (ex.: "2026-07").
  meses: string[];
}

export function filtroMensalPadrao(): FiltroMensalValor {
  return { modo: 'mesAtual', meses: [] };
}

function chaveMesAtual(): string {
  return new Date().toISOString().slice(0, 7);
}

// Testa se uma data ISO ("AAAA-MM-DD...") cai dentro do filtro selecionado.
// Datas ausentes/inválidas nunca combinam (mais seguro do que assumir "sim").
export function dataDentroDoFiltroMensal(dataISO: string | undefined | null, filtro: FiltroMensalValor): boolean {
  if (filtro.modo === 'todos') return true;
  if (!dataISO || dataISO.length < 7) return false;
  const mesDaData = dataISO.slice(0, 7);
  if (filtro.modo === 'mesAtual') return mesDaData === chaveMesAtual();
  return filtro.meses.includes(mesDaData);
}

const NOMES_MES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

export function rotuloMes(chaveMes: string): string {
  const [ano, mes] = chaveMes.split('-');
  const indice = Number(mes) - 1;
  const nome = NOMES_MES[indice] || mes;
  return `${nome}/${ano}`;
}

interface FiltroMensalProps {
  valor: FiltroMensalValor;
  onChange: (novoValor: FiltroMensalValor) => void;
  // Datas ISO cruas do conjunto de dados desta dashboard (ex.: todas as
  // dataConcessao de Reconhecimentos, ou todas as `data` da Timeline) — usadas
  // só para montar a lista de meses disponíveis no "Escolher mês(es)". Meses
  // sem nenhum dado ainda aparecem como opção (mês atual sempre aparece).
  datasDisponiveis: (string | undefined | null)[];
}

export default function FiltroMensal({ valor, onChange, datasDisponiveis }: FiltroMensalProps) {
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!aberto) return;
    const aoClicarFora = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberto(false);
      }
    };
    document.addEventListener('mousedown', aoClicarFora);
    return () => document.removeEventListener('mousedown', aoClicarFora);
  }, [aberto]);

  const mesAtual = chaveMesAtual();

  const mesesDisponiveis = useMemo(() => {
    const conjunto = new Set<string>();
    datasDisponiveis.forEach((d) => {
      if (d && d.length >= 7) conjunto.add(d.slice(0, 7));
    });
    conjunto.add(mesAtual); // sempre selecionável, mesmo sem dado ainda
    return Array.from(conjunto).sort().reverse();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [datasDisponiveis]);

  const rotuloResumo = (): string => {
    if (valor.modo === 'mesAtual') return `${rotuloMes(mesAtual)} (mês atual)`;
    if (valor.modo === 'todos') return 'Todos os meses';
    if (valor.meses.length === 0) return 'Escolher mês(es)';
    if (valor.meses.length === 1) return rotuloMes(valor.meses[0]);
    return `${valor.meses.length} meses selecionados`;
  };

  const alternarMes = (mes: string) => {
    const jaSelecionado = valor.modo === 'personalizado' && valor.meses.includes(mes);
    const mesesBase = valor.modo === 'personalizado' ? valor.meses : [];
    const novosMeses = jaSelecionado ? mesesBase.filter((m) => m !== mes) : [...mesesBase, mes];
    onChange({ modo: 'personalizado', meses: novosMeses });
  };

  return (
    <div className="relative" ref={containerRef}>
      <button
        type="button"
        onClick={() => setAberto((a) => !a)}
        className="flex items-center gap-2 px-3.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:border-slate-300 transition cursor-pointer shadow-sm"
      >
        <Calendar size={14} className="text-slate-400" />
        {rotuloResumo()}
        <ChevronDown size={14} className={`text-slate-400 transition-transform ${aberto ? 'rotate-180' : ''}`} />
      </button>

      {aberto && (
        <div className="absolute right-0 mt-2 w-72 bg-white border border-slate-200 rounded-2xl shadow-xl z-30 p-2 animate-scale-up">
          <button
            type="button"
            onClick={() => {
              onChange({ modo: 'mesAtual', meses: [] });
              setAberto(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              valor.modo === 'mesAtual' ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-50 text-slate-600'
            }`}
          >
            <span>Este mês ({rotuloMes(mesAtual)})</span>
            {valor.modo === 'mesAtual' && <Check size={14} />}
          </button>

          <button
            type="button"
            onClick={() => {
              onChange({ modo: 'todos', meses: [] });
              setAberto(false);
            }}
            className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer transition ${
              valor.modo === 'todos' ? 'bg-teal-50 text-teal-700' : 'hover:bg-slate-50 text-slate-600'
            }`}
          >
            <span>Todos os meses</span>
            {valor.modo === 'todos' && <Check size={14} />}
          </button>

          <div className="border-t border-slate-100 mt-2 pt-2">
            <p className="text-[10px] uppercase font-bold text-slate-400 px-3 mb-1">
              Ou escolha um ou mais meses
            </p>
            <div className="max-h-52 overflow-y-auto space-y-0.5">
              {mesesDisponiveis.map((mes) => {
                const marcado = valor.modo === 'personalizado' && valor.meses.includes(mes);
                return (
                  <label
                    key={mes}
                    className="flex items-center gap-2.5 px-3 py-1.5 rounded-lg hover:bg-slate-50 cursor-pointer text-xs text-slate-600"
                  >
                    <input
                      type="checkbox"
                      checked={marcado}
                      onChange={() => alternarMes(mes)}
                      className="w-3.5 h-3.5 text-teal-600 border-slate-300 rounded focus:ring-teal-500 cursor-pointer"
                    />
                    {rotuloMes(mes)}
                    {mes === mesAtual && <span className="text-[9px] text-slate-400">(atual)</span>}
                  </label>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
