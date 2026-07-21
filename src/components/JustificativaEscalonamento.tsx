/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Explicabilidade da IA (item 7 do Módulo 3).
// IMPORTANTE: este componente é só a VISUALIZAÇÃO. Ele lê `TurnoEscalado.justificativas`
// e mostra a lista de motivos — mas quem PREENCHE esse campo é o motor de geração
// automática, que ainda não existe (é a Fase 5/motor de regras do roadmap). Por isso
// este componente já está pronto para uso, mas hoje só renderiza algo se você passar
// justificativas manualmente (ex: para testar o layout) ou depois que o gerador existir.
//
// Uso pretendido: dentro da futura tela de visualização diária/semanal (Fase 8), ao
// clicar num colaborador escalado, abrir isto num popover/modal passando o TurnoEscalado
// correspondente.

import React from 'react';
import { JustificativaTurno } from '../../../types';
import { CheckCircle2, XCircle, Sparkles } from 'lucide-react';

interface JustificativaEscalonamentoProps {
  colaboradorNome: string;
  justificativas: JustificativaTurno[];
}

const JustificativaEscalonamento: React.FC<JustificativaEscalonamentoProps> = ({
  colaboradorNome,
  justificativas,
}) => {
  if (!justificativas || justificativas.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-100 p-4 text-sm text-slate-400">
        <div className="flex items-center gap-2 mb-1 text-slate-500 font-semibold">
          <Sparkles size={15} className="text-slate-300" />
          Sem justificativa disponível
        </div>
        Este turno ainda não tem motivos registrados — ou porque foi um ajuste manual, ou porque o motor de geração
        automática que preenche esta explicação ainda não foi implementado.
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-slate-100 p-4">
      <div className="flex items-center gap-2 mb-3 text-slate-700 font-semibold text-sm">
        <Sparkles size={15} className="text-teal-500" />
        Escalado porque…
      </div>
      <ul className="space-y-2">
        {justificativas.map((j, idx) => (
          <li key={idx} className="flex items-start gap-2 text-sm">
            {j.atendida ? (
              <CheckCircle2 size={16} className="text-emerald-500 mt-0.5 shrink-0" />
            ) : (
              <XCircle size={16} className="text-rose-500 mt-0.5 shrink-0" />
            )}
            <div>
              <span className="font-semibold text-slate-700">{j.regra}: </span>
              <span className="text-slate-600">{j.descricao}</span>
            </div>
          </li>
        ))}
      </ul>
      <p className="text-[11px] text-slate-400 mt-3">Motivos para a escalação de {colaboradorNome}.</p>
    </div>
  );
};

export default JustificativaEscalonamento;
