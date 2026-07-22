/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 1
//
// Princípio central (ver documento de arquitetura, seção 3):
// "Status é dado. Ação é derivada." O status de uma pendência (ex.:
// "atrasada") NUNCA deve decidir, sozinho e espalhado pela tela, se um
// botão de ação aparece ou não. Essa decisão fica centralizada aqui,
// numa função pura, testável.
//
// Esta é a versão mínima do motor, cobrindo hoje apenas os lembretes de
// Avaliação de Experiência (15/30/60/90) e Avaliação 180° do Dashboard —
// o mesmo formato de dado que `calculateReminders()` já produzia.
//
// A partir do Sprint 2, este arquivo evolui para operar sobre
// `FormularioInstancia` + `WorkflowDefinicao` genéricos (qualquer tipo de
// processo, não só avaliação). O contrato público (uma função que recebe
// o estado dos fatos e devolve a lista de ações) permanece o mesmo — só a
// forma de entrada muda. Por isso a UI (Dashboard.tsx) já consome este
// motor via `getAcoesLembreteAvaliacao`, em vez de decidir sozinha.
// ═══════════════════════════════════════════════════════════════════

/** Rótulo de exibição do prazo. Nunca usado para esconder uma ação — só para estilo/cor. */
export type StatusPrazoLembrete = 'no_prazo' | 'atrasado';

export interface AcaoLembreteAvaliacao {
  tipo: 'realizar_avaliacao_180' | 'marcar_concluida';
  label: string;
}

/**
 * Calcula o indicador de prazo a partir de dias restantes.
 * Puramente descritivo — não decide nada sobre o que pode ser feito.
 */
export function calcularStatusPrazoLembrete(diasRestantes: number): StatusPrazoLembrete {
  return diasRestantes < 0 ? 'atrasado' : 'no_prazo';
}

/**
 * Devolve as ações disponíveis para um lembrete de avaliação (experiência ou 180°).
 *
 * Regra de negócio: a ação de realizar/concluir a avaliação é sempre oferecida,
 * independentemente do status de prazo. "Atrasado" é só um estado visual da
 * tarefa (ver `calcularStatusPrazoLembrete`) e nunca pode impedir sua execução.
 */
export function getAcoesLembreteAvaliacao(milestone: string): AcaoLembreteAvaliacao[] {
  if (milestone === '180') {
    return [{ tipo: 'realizar_avaliacao_180', label: '📊 Realizar Avaliação 180°' }];
  }
  return [{ tipo: 'marcar_concluida', label: '✓ Marcar Concluída' }];
}
