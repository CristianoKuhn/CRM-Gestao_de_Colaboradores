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
  { id: 'config', label: 'Configurações Gerais' },
];

// ── Security Audit (Fase 1, V07) ────────────────────────────────────────
// "usuarios" (Gerenciar Usuários) continua SEMPRE exclusivo de Administrador
// — gerenciar outras contas e permissões é sensível demais para ser
// delegável. "config" (Configurações Gerais) NÃO é mais admin-only: o
// próprio Administrador decide, pelo checklist de "Dashboards Habilitados"
// em Gerenciar Usuários, se um Coordenador/Líder específico pode acessar
// Configurações Gerais (útil para quem administra a Trilha & Matriz do
// próprio setor, por exemplo, sem precisar virar Administrador do sistema
// inteiro). As ações realmente sensíveis dentro de Config (reset de dados,
// gerenciar Empresas/Setores/Cargos) continuam exigindo Administrador no
// backend mesmo assim — esta liberação é só de VISIBILIDADE da tela.
const DASHBOARDS_SOMENTE_ADMINISTRADOR = new Set(['usuarios']);

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
