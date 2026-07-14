/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type SituacaoColaborador = 'Ativo' | 'Em Acompanhamento' | 'Suspenso' | 'Desligado';

export interface Empresa {
  id: string;
  nome: string;
}

export interface Setor {
  id: string;
  nome: string;
}

export interface Cargo {
  id: string;
  nome: string;
}

export interface Lider {
  id: string;
  nome: string;
  email: string;
  cargo?: string;
  fotoUrl?: string;
}

export interface Colaborador {
  id: string;
  nome: string;
  email: string;
  fotoUrl: string;
  cargoId: string;
  setorId: string;
  liderId: string;
  dataAdmissao: string;
  situacao: SituacaoColaborador;
  empresaId: string;
  telefone?: string;
}

export type TipoRegistro =
  | 'Feedback Corretivo'
  | 'Feedback Positivo'
  | 'Reconhecimento'
  | 'Conversa Individual (1:1)'
  | 'Plano de Desenvolvimento Individual (PDI)'
  | 'Advertência'
  | 'Suspensão'
  | 'Elogio de Cliente'
  | 'Reclamação de Cliente'
  | 'Observação Geral'
  | 'Acompanhamento'
  | 'Outros';

export type PrioridadeRegistro = 'Baixa' | 'Média' | 'Alta' | 'Crítica';

export type StatusRegistro = 'Concluído' | 'Em Andamento' | 'Pendente' | 'Cancelado' | 'Atrasado';

export interface Anexo {
  id: string;
  nome: string;
  tipo: string; // 'imagem' | 'pdf' | 'documento' | 'audio' | 'video'
  url: string;
  tamanho: string;
}

export interface TimelineRegistro {
  id: string;
  colaboradorId: string;
  tipo: TipoRegistro;
  data: string;
  titulo: string;
  descricao: string;
  responsavelId: string; // Lider id
  prioridade: PrioridadeRegistro;
  status: StatusRegistro;
  prazoAcompanhamento?: string; // Data limite para rever
  gerarTarefaFutura: boolean;
  tarefaId?: string;
  anexos: Anexo[];
}

export interface Tarefa {
  id: string;
  colaboradorId: string;
  titulo: string;
  descricao: string;
  vencimento: string;
  concluida: boolean;
  tipoOrigem: TipoRegistro;
  registroId?: string; // Vinculado ao histórico
  responsavelId: string; // Lider id
}

export interface SupabaseConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  isConnected: boolean;
}

export interface GoogleScriptConfig {
  webAppUrl: string;
  driveFolderId: string;
  isConnected: boolean;
}

export type DataSourceProvider = 'local' | 'googlescript' | 'supabase';

