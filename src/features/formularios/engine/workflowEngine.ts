/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 2
//
// workflowEngine — motor de estados e transições, totalmente desacoplado
// de qualquer processo específico (avaliação, PDI, auditoria...). Cada
// `FormularioTemplate` referencia a `WorkflowDefinicao` que quiser; este
// motor só sabe interpretar o grafo, nunca conhece "avaliação".
//
// Ver documento de arquitetura, seções 3 ("SLA é ortogonal ao Workflow")
// e 5 (Motores). O indicador de atraso NÃO é resolvido aqui — ver
// slaEngine.ts — porque atraso não é um nó do grafo, é um eixo à parte.
// ═══════════════════════════════════════════════════════════════════

import { EstadoWorkflow, TransicaoWorkflow, WorkflowDefinicao } from '../../../types';

export interface ContextoWorkflow {
  /** Papel do usuário atual (ex.: 'gestor', 'colaborador', 'admin'). */
  papel?: string;
}

/** Devolve a definição de um estado a partir do seu id, ou undefined se não existir no grafo. */
export function getEstado(workflow: WorkflowDefinicao, estadoId: string): EstadoWorkflow | undefined {
  return workflow.estados.find((e) => e.id === estadoId);
}

/** True se `estadoId` for um estado final do grafo (ex.: 'concluida', 'arquivada'). */
export function isEstadoFinal(workflow: WorkflowDefinicao, estadoId: string): boolean {
  return getEstado(workflow, estadoId)?.tipo === 'final';
}

/**
 * Lista as transições possíveis a partir do estado atual, filtradas pelo
 * papel do usuário quando a transição declarar `papeisPermitidos`.
 *
 * Transições sem `papeisPermitidos` são abertas a qualquer papel — é o caso
 * mais comum (ex.: "realizar avaliação" para o responsável autenticado).
 */
export function getTransicoesDisponiveis(
  workflow: WorkflowDefinicao,
  estadoAtual: string,
  contexto: ContextoWorkflow = {}
): TransicaoWorkflow[] {
  return workflow.transicoes.filter((t) => {
    if (t.de !== estadoAtual) return false;
    if (!t.papeisPermitidos || t.papeisPermitidos.length === 0) return true;
    return contexto.papel ? t.papeisPermitidos.includes(contexto.papel) : false;
  });
}

/**
 * Aplica uma transição pelo nome da ação (ex.: 'concluir', 'aprovar',
 * 'reprovar', 'reagendar', 'justificar_atraso'). Devolve o novo estado, ou
 * lança erro se a transição não for válida a partir do estado atual — a
 * validação de permissão (`contexto.papel`) já é considerada aqui.
 *
 * Esta função só calcula o novo estado; quem chama é responsável por
 * persistir a instância e gravar a linha em HistoricoEstadoInstancia (ver
 * `concluirInstancia`/`avancarEstadoInstancia` no Apps Script, Sprint 4+).
 */
export function aplicarTransicao(
  workflow: WorkflowDefinicao,
  estadoAtual: string,
  acao: string,
  contexto: ContextoWorkflow = {}
): string {
  const disponiveis = getTransicoesDisponiveis(workflow, estadoAtual, contexto);
  const transicao = disponiveis.find((t) => t.acao === acao);
  if (!transicao) {
    throw new Error(
      `Transição "${acao}" não é válida a partir do estado "${estadoAtual}" neste workflow (ou o papel do usuário não permite).`
    );
  }
  return transicao.para;
}

// ── Workflows padrão (seed) ─────────────────────────────────────────
// Duas definições cobrindo os casos citados na arquitetura (seção 2.2).
// Cadastradas como dado no Apps Script (função `seedFormulariosIniciais`),
// reproduzidas aqui só como referência/constante para uso em testes locais
// e no fallback do modo demo — não é a fonte de verdade em produção.

export const WORKFLOW_SIMPLES: WorkflowDefinicao = {
  id: 'workflow-simples',
  nome: 'Workflow simples (pendente → concluído)',
  estados: [
    { id: 'pendente', nome: 'Pendente', tipo: 'inicial' },
    { id: 'concluida', nome: 'Concluída', tipo: 'final' },
  ],
  transicoes: [{ de: 'pendente', para: 'concluida', acao: 'concluir' }],
};

export const WORKFLOW_PADRAO_AVALIACAO: WorkflowDefinicao = {
  id: 'workflow-padrao-avaliacao',
  nome: 'Workflow padrão de avaliação',
  estados: [
    { id: 'pendente', nome: 'Pendente', tipo: 'inicial' },
    { id: 'em_andamento', nome: 'Em andamento', tipo: 'intermediario' },
    { id: 'concluida', nome: 'Concluída', tipo: 'final' },
    { id: 'arquivada', nome: 'Arquivada', tipo: 'final' },
  ],
  transicoes: [
    { de: 'pendente', para: 'em_andamento', acao: 'iniciar' },
    { de: 'pendente', para: 'concluida', acao: 'concluir' },
    { de: 'em_andamento', para: 'em_andamento', acao: 'salvar_rascunho' },
    { de: 'em_andamento', para: 'em_andamento', acao: 'justificar_atraso' },
    { de: 'em_andamento', para: 'em_andamento', acao: 'reagendar' },
    { de: 'em_andamento', para: 'concluida', acao: 'concluir' },
    { de: 'concluida', para: 'arquivada', acao: 'arquivar' },
  ],
};
