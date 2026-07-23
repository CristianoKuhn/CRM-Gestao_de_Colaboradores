/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { DiferencaResposta } from '../engine/comparativoEngine';

export interface ComparativoRespostasProps {
  diferencas: DiferencaResposta[];
  /** Diferença absoluta a partir da qual a linha é destacada como divergência relevante. */
  limiarDivergencia?: number;
  rotuloPapelA?: string;
  rotuloPapelB?: string;
}

export default function ComparativoRespostas({
  diferencas,
  limiarDivergencia = 2,
  rotuloPapelA = 'Gestor',
  rotuloPapelB = 'Colaborador',
}: ComparativoRespostasProps) {
  if (diferencas.length === 0) {
    return (
      <p className="text-xs text-slate-400">
        Ainda não há respostas suficientes de ambos os lados para comparar.
      </p>
    );
  }

  let categoriaAtual = '';

  return (
    <div className="flex flex-col gap-2">
      <div className="flex items-center justify-between text-[10px] font-bold text-slate-400 uppercase px-1">
        <span>Competência</span>
        <div className="flex gap-4">
          <span className="w-14 text-center">{rotuloPapelA}</span>
          <span className="w-14 text-center">{rotuloPapelB}</span>
          <span className="w-14 text-center">Diferença</span>
        </div>
      </div>
      {diferencas.map((linha) => {
        const mostrarCategoria = linha.categoriaNome !== categoriaAtual;
        categoriaAtual = linha.categoriaNome;
        const divergente = linha.diferenca !== undefined && Math.abs(linha.diferenca) >= limiarDivergencia;
        return (
          <div key={linha.perguntaId}>
            {mostrarCategoria && (
              <p className="text-[10px] font-bold text-slate-400 uppercase mt-2 mb-1">{linha.categoriaNome}</p>
            )}
            <div
              className={`flex items-center justify-between rounded-lg px-2 py-1.5 ${
                divergente ? 'bg-amber-50 border border-amber-200' : 'bg-white border border-slate-100'
              }`}
            >
              <span className="text-xs text-slate-700 flex-1 pr-2">{linha.perguntaLabel}</span>
              <div className="flex gap-4 items-center">
                <span className="w-14 text-center text-xs font-bold text-slate-600">
                  {linha.notaPapelA ?? '—'}
                </span>
                <span className="w-14 text-center text-xs font-bold text-slate-600">
                  {linha.notaPapelB ?? '—'}
                </span>
                <span
                  className={`w-14 text-center text-xs font-bold ${
                    divergente ? 'text-amber-600' : 'text-slate-400'
                  }`}
                >
                  {linha.diferenca !== undefined
                    ? (linha.diferenca > 0 ? '+' : '') + linha.diferenca
                    : '—'}
                </span>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
