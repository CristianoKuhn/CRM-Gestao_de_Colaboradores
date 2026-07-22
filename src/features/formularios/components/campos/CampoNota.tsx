/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { PerguntaFormulario } from '../../../../types';

export interface CampoProps {
  pergunta: PerguntaFormulario;
  valor: unknown;
  comentario?: string;
  onChange: (valor: unknown, comentario?: string) => void;
  somenteLeitura?: boolean;
}

export default function CampoNota({ pergunta, valor, comentario, onChange, somenteLeitura }: CampoProps) {
  const min = pergunta.escala?.min ?? 1;
  const max = pergunta.escala?.max ?? 5;
  const opcoes = Array.from({ length: max - min + 1 }, (_, i) => min + i);
  const notaAtual = typeof valor === 'number' ? valor : null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {opcoes.map((n) => (
          <button
            key={n}
            type="button"
            disabled={somenteLeitura}
            onClick={() => onChange(n, comentario)}
            className={`w-10 h-10 rounded-lg text-sm font-bold border transition ${
              notaAtual === n
                ? 'bg-emerald-500 border-emerald-500 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-emerald-300'
            } ${somenteLeitura ? 'cursor-default opacity-80' : 'cursor-pointer'}`}
          >
            {n}
          </button>
        ))}
      </div>
      {pergunta.permiteComentario && (
        <textarea
          value={comentario || ''}
          disabled={somenteLeitura}
          onChange={(e) => onChange(valor, e.target.value)}
          placeholder="Comentário (opcional)"
          rows={2}
          className="mt-2 w-full text-xs border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        />
      )}
    </div>
  );
}
