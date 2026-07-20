/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { ConfiguracaoEscala } from '../../../types';
import { Settings2, Save, CheckCircle2 } from 'lucide-react';

interface ConfiguracaoEscalaFormProps {
  configuracao: ConfiguracaoEscala;
  onSalvar: (config: ConfiguracaoEscala) => void | Promise<void>;
  somenteLeitura?: boolean;
}

const ConfiguracaoEscalaForm: React.FC<ConfiguracaoEscalaFormProps> = ({
  configuracao,
  onSalvar,
  somenteLeitura,
}) => {
  const [form, setForm] = useState<ConfiguracaoEscala>(configuracao);
  const [salvando, setSalvando] = useState(false);
  const [salvo, setSalvo] = useState(false);

  useEffect(() => {
    setForm(configuracao);
  }, [configuracao]);

  const atualizar = <K extends keyof ConfiguracaoEscala>(campo: K, valor: ConfiguracaoEscala[K]) => {
    setForm((prev) => ({ ...prev, [campo]: valor }));
    setSalvo(false);
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      await onSalvar(form);
      setSalvo(true);
    } finally {
      setSalvando(false);
    }
  };

  const inputBase =
    'w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-teal-500/40 focus:border-teal-400 disabled:bg-slate-50 disabled:text-slate-400';
  const labelBase = 'block text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1';

  return (
    <div className="bg-white rounded-3xl shadow-sm border border-slate-100 p-6 space-y-5">
      <div className="flex items-center gap-2">
        <Settings2 size={18} className="text-teal-500" />
        <h3 className="font-bold text-slate-800">Configuração geral da escala</h3>
      </div>

      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className={labelBase}>Carga horária semanal</label>
          <input
            type="number"
            min={1}
            disabled={somenteLeitura}
            className={inputBase}
            value={form.cargaHorariaSemanal}
            onChange={(e) => atualizar('cargaHorariaSemanal', Number(e.target.value))}
          />
        </div>
        <div>
          <label className={labelBase}>Intervalo mínimo entre jornadas (horas)</label>
          <input
            type="number"
            min={0}
            disabled={somenteLeitura}
            className={inputBase}
            value={form.intervaloMinimoInterjornadaHoras}
            onChange={(e) => atualizar('intervaloMinimoInterjornadaHoras', Number(e.target.value))}
          />
        </div>
        <div>
          <label className={labelBase}>Máximo de dias consecutivos</label>
          <input
            type="number"
            min={1}
            disabled={somenteLeitura}
            className={inputBase}
            value={form.maxDiasConsecutivos}
            onChange={(e) => atualizar('maxDiasConsecutivos', Number(e.target.value))}
          />
        </div>
        <div>
          <label className={labelBase}>Antecedência mínima para publicar (dias)</label>
          <input
            type="number"
            min={0}
            disabled={somenteLeitura}
            className={inputBase}
            value={form.diasAntecedenciaPublicacao}
            onChange={(e) => atualizar('diasAntecedenciaPublicacao', Number(e.target.value))}
          />
        </div>
      </div>

      <div className="space-y-2 pt-1">
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            disabled={somenteLeitura}
            checked={form.permiteBancoHoras}
            onChange={(e) => atualizar('permiteBancoHoras', e.target.checked)}
            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          Equipe tem banco de horas
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            disabled={somenteLeitura}
            checked={form.permiteHoraExtraSemana}
            onChange={(e) => atualizar('permiteHoraExtraSemana', e.target.checked)}
            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          Permite hora extra paga durante a semana
        </label>
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            disabled={somenteLeitura}
            checked={form.domingoContaHoraExtra}
            onChange={(e) => atualizar('domingoContaHoraExtra', e.target.checked)}
            className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
          />
          Domingo trabalhado conta como hora extra paga
        </label>
      </div>

      {!somenteLeitura && (
        <div className="flex items-center gap-3 pt-2">
          <button
            onClick={salvar}
            disabled={salvando}
            className="flex items-center gap-2 px-5 py-2 rounded-xl text-sm font-semibold text-white bg-teal-600 hover:bg-teal-700 transition-colors disabled:opacity-60"
          >
            <Save size={16} />
            {salvando ? 'Salvando…' : 'Salvar configuração'}
          </button>
          {salvo && (
            <span className="flex items-center gap-1 text-sm text-teal-600">
              <CheckCircle2 size={16} /> Salvo
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default ConfiguracaoEscalaForm;
