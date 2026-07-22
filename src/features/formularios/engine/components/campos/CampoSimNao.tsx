/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { CampoProps } from './CampoNota';

export default function CampoSimNao({ valor, onChange, somenteLeitura }: CampoProps) {
  return (
    <div className="flex gap-2">
      {[
        { label: 'Sim', v: true },
        { label: 'Não', v: false },
      ].map((opcao) => (
        <button
          key={opcao.label}
          type="button"
          disabled={somenteLeitura}
          onClick={() => onChange(opcao.v)}
          className={`px-4 py-2 rounded-lg text-xs font-bold border transition ${
            valor === opcao.v
              ? 'bg-emerald-500 border-emerald-500 text-white'
              : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
          } ${somenteLeitura ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
        >
          {opcao.label}
        </button>
      ))}
    </div>
  );
}
