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
  { id: 'escala-inteligente', label: 'Escala Inteligente' },
  { id: 'usuarios', label: 'Gerenciar Usuários' },
  { id: 'tarefas', label: 'Tarefas de Liderança' },
  { id: 'documentos', label: 'Central Docs' },
  { id: 'reconhecimento', label: 'Reconhecimento' },
  { id: 'metas', label: 'Metas Liderança' },
  { id: 'analytics', label: 'Analytics & PDIs' },
  { id: 'desenvolvimento-biblioteca', label: 'Biblioteca de Desenvolvimento' },
  { id: 'desenvolvimento-programas', label: 'Programas de Desenvolvimento' },
  { id: 'config', label: 'Configurações Gerais' },
];

// Regra central de visibilidade: "dashboard" é sempre visível; os demais dependem da
// lista `dashboardsHabilitados` do usuário. `undefined`/array vazio = tudo habilitado
// (retrocompatibilidade — ver comentário em Usuario.dashboardsHabilitados em types.ts).
export function dashboardVisivelParaUsuario(
  dashboardId: string,
  dashboardsHabilitados: string[] | undefined
): boolean {
  if (dashboardId === 'dashboard') return true;
  if (!dashboardsHabilitados || dashboardsHabilitados.length === 0) return true;
  return dashboardsHabilitados.includes(dashboardId);
}
