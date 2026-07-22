// ── Motor Inteligente de Escala — utilitários de data/hora ──────────────────
// Pequenas funções puras, reaproveitadas por vários serviços do motor.
// Ficam num arquivo à parte justamente para não duplicar essa lógica em
// ConstraintValidator, ConflictResolver e ScaleValidator.

import type { DiaSemana } from '../../../types';

/** "08:00" -> 480 (minutos desde 00:00). Aceita "HH:MM" ou "HH:MM:SS". */
export function horaParaMinutos(hora: string): number {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + (m || 0);
}

/**
 * Duas janelas de horário no MESMO dia se sobrepõem?
 * Não trata virada de meia-noite aqui — turnos que atravessam a meia-noite
 * são raros neste negócio (call center/atendimento) e, quando existirem,
 * devem ser modelados como dois slots (um por dia), igual já é feito hoje.
 */
export function horariosSeSobrepoem(
  inicioA: string,
  fimA: string,
  inicioB: string,
  fimB: string
): boolean {
  const a1 = horaParaMinutos(inicioA);
  const a2 = horaParaMinutos(fimA);
  const b1 = horaParaMinutos(inicioB);
  const b2 = horaParaMinutos(fimB);
  return a1 < b2 && b1 < a2;
}

/** Está o intervalo [inicio, fim] TOTALMENTE contido em [janelaInicio, janelaFim]? */
export function horarioContidoEm(
  inicio: string,
  fim: string,
  janelaInicio: string,
  janelaFim: string
): boolean {
  return horaParaMinutos(inicio) >= horaParaMinutos(janelaInicio) && horaParaMinutos(fim) <= horaParaMinutos(janelaFim);
}

/** yyyy-MM-dd -> dia da semana (0 = domingo), sem depender de fuso do navegador. */
export function diaSemanaDaData(data: string): DiaSemana {
  const [ano, mes, dia] = data.split('-').map(Number);
  return new Date(ano, mes - 1, dia).getDay() as DiaSemana;
}

/** Diferença em dias corridos entre duas datas yyyy-MM-dd (b - a). */
export function diferencaEmDias(dataA: string, dataB: string): number {
  const [a1, a2, a3] = dataA.split('-').map(Number);
  const [b1, b2, b3] = dataB.split('-').map(Number);
  const msPorDia = 1000 * 60 * 60 * 24;
  const a = Date.UTC(a1, a2 - 1, a3);
  const b = Date.UTC(b1, b2 - 1, b3);
  return Math.round((b - a) / msPorDia);
}

/**
 * Horas de descanso entre o fim de um turno num dia e o início de outro turno
 * em outro dia (ou no mesmo dia, se por algum motivo colidirem). Considera a
 * diferença de dias corridos para não errar o cálculo em turnos que passam de
 * um dia pro outro.
 */
export function horasDeDescansoEntreTurnos(
  dataA: string,
  fimA: string,
  dataB: string,
  inicioB: string
): number {
  const diasEntre = diferencaEmDias(dataA, dataB);
  // fimA é contado a partir do início de dataA (dia 0); inicioB precisa do
  // deslocamento de dias até dataB somado ao seu próprio horário.
  const minutosAteFimA = horaParaMinutos(fimA);
  const minutosAteInicioB = diasEntre * 24 * 60 + horaParaMinutos(inicioB);
  return (minutosAteInicioB - minutosAteFimA) / 60;
}
