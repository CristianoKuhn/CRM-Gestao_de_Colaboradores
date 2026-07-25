// ── Motor de Disponibilidade Operacional — Cálculo de Saldo de Período ──────
// Responsabilidade ÚNICA: dado um PeriodoAquisitivo e o razão (ledger) de
// MovimentoAusencia ligados a ele, derivar diasUsados/diasRestantes/status.
//
// PeriodoAquisitivo.diasUsados/diasRestantes são um CACHE — este arquivo é o
// ÚNICO lugar autorizado a calculá-los. Todo o resto do sistema (telas,
// outros motores) lê o cache já pronto; ninguém mais faz essa conta.
//
// Cada tipo de movimento tem um sinal fixo na soma: lançamentos de consumo
// (gozo, venda, ajuste_manual, correção) somam dias usados; um
// 'cancelamento' subtrai — desfazendo um lançamento anterior sem apagá-lo
// (ver o comentário de MovimentoAusencia em types.ts).

import type { MovimentoAusencia, PeriodoAquisitivo, TipoMovimentoAusencia } from '../../../types';

const SINAL_POR_TIPO_MOVIMENTO: Record<TipoMovimentoAusencia, 1 | -1> = {
  gozo: 1,
  venda: 1,
  ajuste_manual: 1,
  correcao: 1,
  cancelamento: -1,
};

/**
 * Soma líquida de dias consumidos de um período, a partir do razão de
 * movimentos — já filtrado para os movimentos daquele período específico.
 */
export function calcularDiasUsados(movimentosDoPeriodo: MovimentoAusencia[]): number {
  const total = movimentosDoPeriodo.reduce((soma, m) => soma + m.dias * SINAL_POR_TIPO_MOVIMENTO[m.tipoMovimento], 0);
  return Math.max(0, total); // nunca negativo — cancelamento não pode deixar saldo "usado" abaixo de zero
}

function classificarStatusPosSaldo(periodo: PeriodoAquisitivo, diasUsados: number, diasRestantes: number, hoje: Date): PeriodoAquisitivo['status'] {
  if (diasRestantes <= 0) return 'concluido';
  const dataFim = new Date(periodo.dataFim);
  const dataInicio = new Date(periodo.dataInicio);
  if (dataInicio <= hoje && hoje <= dataFim) return 'ativo';
  if (hoje > dataFim) return 'vencido';
  return 'futuro';
}

/**
 * Devolve o período com diasUsados/diasRestantes/status recalculados a partir
 * do razão de movimentos. Não muta o período recebido — devolve uma cópia,
 * pra quem chama decidir explicitamente quando persistir (mesma disciplina
 * de imutabilidade do motor de escala).
 */
export function recalcularSaldoPeriodo(
  periodo: PeriodoAquisitivo,
  todosOsMovimentos: MovimentoAusencia[],
  hoje: Date = new Date()
): PeriodoAquisitivo {
  const movimentosDoPeriodo = todosOsMovimentos.filter(
    (m) => m.tipoAusencia === 'ferias' && m.periodoAquisitivoId === periodo.id
  );
  const diasUsados = calcularDiasUsados(movimentosDoPeriodo);
  const diasRestantes = Math.max(0, periodo.diasDisponiveis - diasUsados);

  return {
    ...periodo,
    diasUsados,
    diasRestantes,
    status: classificarStatusPosSaldo(periodo, diasUsados, diasRestantes, hoje),
  };
}

/** Atalho para recalcular vários períodos do mesmo colaborador de uma vez. */
export function recalcularSaldoDeTodosOsPeriodos(
  periodos: PeriodoAquisitivo[],
  todosOsMovimentos: MovimentoAusencia[],
  hoje: Date = new Date()
): PeriodoAquisitivo[] {
  return periodos.map((p) => recalcularSaldoPeriodo(p, todosOsMovimentos, hoje));
}
