/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 2
//
// slaEngine — o único lugar do sistema que sabe o que "atrasado" significa.
//
// Ver documento de arquitetura, seção 3 ("A mudança conceitual central:
// SLA é ortogonal ao Workflow"). O indicador de prazo NUNCA é gravado como
// um nó do grafo de workflow — é sempre calculado em tempo real a partir de
// `dataLimite` vs. "agora", de forma totalmente independente de em que
// estado do workflow a instância está. Isso é o que garante que a correção
// do bug original ("atrasada bloqueia execução") vale para qualquer processo
// futuro, sem que cada novo template precise reimplementar esse cuidado.
// ═══════════════════════════════════════════════════════════════════

import { FormularioInstancia } from '../../../types';

export type StatusSla = 'no_prazo' | 'atrasado' | 'sem_prazo';

/**
 * Calcula o indicador de SLA de uma instância de formulário.
 *
 * - Sem `dataLimite` → `sem_prazo` (ex.: pesquisa de clima aberta).
 * - Instância já concluída ou arquivada → sempre `no_prazo`: uma vez
 *   entregue, o atraso deixou de ser um fato relevante para a ação.
 * - Caso contrário, `atrasado` se `hoje` já passou de `dataLimite`.
 *
 * Puramente descritivo: este valor não deve, sozinho, decidir se uma ação
 * é permitida — essa decisão é sempre de `acoesDisponiveis.ts`.
 */
export function calcularSla(
  instancia: Pick<FormularioInstancia, 'dataLimite' | 'estadoWorkflow' | 'dataConclusao'>,
  hoje: Date = new Date()
): StatusSla {
  if (!instancia.dataLimite) return 'sem_prazo';
  if (instancia.dataConclusao || instancia.estadoWorkflow === 'arquivada') return 'no_prazo';

  const limite = new Date(instancia.dataLimite);
  if (isNaN(limite.getTime())) return 'sem_prazo';

  return hoje.getTime() > limite.getTime() ? 'atrasado' : 'no_prazo';
}

/**
 * Dias restantes (positivo) ou dias em atraso (negativo) até `dataLimite`.
 * `null` quando não há prazo definido — a UI deve tratar isso como "sem prazo",
 * nunca como zero dias.
 */
export function calcularDiasRestantes(
  instancia: Pick<FormularioInstancia, 'dataLimite'>,
  hoje: Date = new Date()
): number | null {
  if (!instancia.dataLimite) return null;
  const limite = new Date(instancia.dataLimite);
  if (isNaN(limite.getTime())) return null;

  const diffMs = limite.getTime() - hoje.getTime();
  return Math.ceil(diffMs / (1000 * 60 * 60 * 24));
}
