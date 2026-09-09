/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Fonte única da lista de dashboards do menu lateral. Usado tanto pelo Sidebar (para
// decidir o que renderizar) quanto pela tela de Usuários (para montar o checklist de
// "dashboards habilitados" no cadastro/edição). Manter os dois em módulos separados
// causaria divergência: um novo item de menu adicionado só no Sidebar nunca apareceria
// como opção configurável em Usuários, e vice-versa.
//
// "dashboard" (Dashboard principal) não entra nesta lista de propósito — ele é sempre
// visível para qualquer usuário autenticado, não é selecionável/desativável.
export interface DashboardSelecionavel {
  id: string;
  label: string;
}

export const DASHBOARDS_SELECIONAVEIS: DashboardSelecionavel[] = [
  { id: 'colaboradores', label: 'Colaboradores' },
  { id: 'gestao-pessoas', label: 'Gestão de Pessoas' },
  { id: 'usuarios', label: 'Gerenciar Usuários' },
  { id: 'tarefas', label: 'Tarefas de Liderança' },
  { id: 'documentos', label: 'Central Docs' },
  { id: 'reconhecimento', label: 'Reconhecimento' },
  { id: 'metas', label: 'Metas Liderança' },
  { id: 'analytics', label: 'Analytics & PDIs' },
  { id: 'desenvolvimento-biblioteca', label: 'Biblioteca de Desenvolvimento' },
  { id: 'desenvolvimento-programas', label: 'Programas de Desenvolvimento' },
  { id: 'desenvolvimento-indicadores', label: 'Indicadores de Desenvolvimento' },
  { id: 'config', label: 'Configurações Gerais' },
];

// ── Security Audit (Fase 1, V07) ────────────────────────────────────────
// "usuarios" (Gerenciar Usuários) e "config" (Configurações Gerais, que
// inclui o botão de Reset de Dados) são telas ADMINISTRATIVAS, não
// dashboards de conteúdo — nunca deveriam entrar na mesma lista "opt-out"
// abaixo, cujo padrão é "tudo visível se nada foi configurado". Isso
// permitia que qualquer usuário recém-criado, sem nenhuma configuração
// explícita, enxergasse essas telas por padrão. Elas agora exigem perfil
// Administrador SEMPRE, independente de `dashboardsHabilitados`.
//
// IMPORTANTE: isto é só uma trava de UI (esconder o item de menu). A
// autorização de verdade tem que estar no backend (ver Security Audit,
// seção E) — esconder o botão nunca é suficiente sozinho.
const DASHBOARDS_SOMENTE_ADMINISTRADOR = new Set(['usuarios', 'config']);

// Regra central de visibilidade: "dashboard" é sempre visível; os itens
// administrativos exigem perfil Administrador; os demais dependem da lista
// `dashboardsHabilitados` do usuário — `undefined`/array vazio = tudo
// habilitado (retrocompatibilidade — ver comentário em
// Usuario.dashboardsHabilitados em types.ts).
export function dashboardVisivelParaUsuario(
  dashboardId: string,
  dashboardsHabilitados: string[] | undefined,
  perfil: string | undefined
): boolean {
  if (dashboardId === 'dashboard') return true;
  if (DASHBOARDS_SOMENTE_ADMINISTRADOR.has(dashboardId)) {
    return perfil === 'Administrador';
  }
  if (!dashboardsHabilitados || dashboardsHabilitados.length === 0) return true;
  return dashboardsHabilitados.includes(dashboardId);
}
