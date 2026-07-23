/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { ResultadoFormularioInstancia } from '../../../types';

export interface PainelResultadoProps {
  resultado: ResultadoFormularioInstancia;
}

function corDoParecer(parecer?: string): string {
  if (!parecer) return 'bg-slate-100 text-slate-500';
  const normalizado = parecer.toLowerCase();
  if (normalizado.includes('excelente') || normalizado.includes('muito bom') || normalizado.includes('aprovado')) {
    return 'bg-emerald-100 text-emerald-700';
  }
  if (normalizado.includes('reprovado') || normalizado.includes('acompanhamento')) {
    return 'bg-rose-100 text-rose-700';
  }
  return 'bg-slate-100 text-slate-600';
}

export default function PainelResultado({ resultado }: PainelResultadoProps) {
  const { mediaGeral, mediaPonderada, parecerFinal } = resultado;
  if (mediaGeral === undefined && mediaPonderada === undefined && !parecerFinal) return null;

  return (
    <div className="flex flex-wrap items-center gap-3 bg-slate-50 rounded-xl px-4 py-3">
      {mediaGeral !== undefined && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Média geral</p>
          <p className="text-sm font-bold text-slate-700">{mediaGeral.toFixed(1)}</p>
        </div>
      )}
      {mediaPonderada !== undefined && (
        <div>
          <p className="text-[10px] font-semibold text-slate-400 uppercase">Média ponderada</p>
          <p className="text-sm font-bold text-slate-700">{mediaPonderada.toFixed(1)}</p>
        </div>
      )}
      {parecerFinal && (
        <span className={`ml-auto text-xs font-bold px-3 py-1.5 rounded-full ${corDoParecer(parecerFinal)}`}>
          {parecerFinal}
        </span>
      )}
    </div>
  );
}
