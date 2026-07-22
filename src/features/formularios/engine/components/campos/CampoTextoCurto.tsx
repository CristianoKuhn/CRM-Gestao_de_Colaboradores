/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { CampoProps } from './CampoNota';

export default function CampoTextoCurto({ valor, onChange, somenteLeitura }: CampoProps) {
  return (
    <input
      type="text"
      value={typeof valor === 'string' ? valor : ''}
      disabled={somenteLeitura}
      onChange={(e) => onChange(e.target.value)}
      className="w-full text-sm border border-slate-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-emerald-200"
    />
  );
}
