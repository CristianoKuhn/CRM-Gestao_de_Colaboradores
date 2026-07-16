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
  setoresPermitidos?: string[];
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
  cidadeBase?: string;
  prazoAvaliacao180?: number;
  realizarExperiencia?: boolean;
  avaliacoesCompletas?: string[];
  dataNascimento?: string;
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
  | 'Férias Planejadas'
  | 'Demissão'
  | 'Afastamento'
  | 'Licença'
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

export interface OnboardingItem {
  id: string;
  setorIds: string[]; // Alterado para múltiplos setores
  titulo: string;
  descricao: string;
}

export interface OnboardingChecklist {
  id: string;
  colaboradorId: string;
  itemsConcluidos: string[]; // IDs dos OnboardingItem
  dataCriacao: string;
}

// Avaliação de Período de Experiência (15, 30, 60, 90 dias)
export interface AvaliacaoExperiencia {
  id: string;
  colaboradorId: string;
  dias: number; // 15, 30, 60 ou 90
  dataVencimento: string;
  status: 'pendente' | 'aprovado' | 'reprovado';
  resultado?: string;
  dataRealizacao?: string;
  observacoes?: string;
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

export interface Usuario {
  id: string;
  nome: string;
  email: string;
  senha_hash?: string;
  perfil: 'Administrador' | 'Coordenador' | 'Supervisor' | 'Lider';
  setor_id: string;
  setoresPermitidos?: string[];
  ativo: boolean;
  ultimo_login?: string;
}

// Tipos para Alertas Inteligentes
export type TipoAlerta = 
  | 'sem_interacao'
  | 'aniversario_nascimento'
  | 'aniversario_casa'
  | 'avaliacao_180';

export type StatusAlerta = 'pendente' | 'reconhecido' | 'resolvido';

export interface AlertaInteligente {
  id: string;
  tipo: TipoAlerta;
  colaboradorId: string;
  titulo: string;
  descricao: string;
  dataReferencia: string;
  diasRestantes: number;
  status: StatusAlerta;
  dataCriacao: string;
  dataReconhecimento?: string;
  dataResolucao?: string;
  parametroDias?: number; // Dias parametrizados (ex: X dias sem interação)
}

export interface ConfiguracaoAlertas {
  diasSemInteracao: number; // Padrão: 14 dias
  diasAntecedenciaAniversario: number; // Padrão: 15 dias
  diasAntecedenciaAvaliacao180: number; // Padrão: 30 dias
  alertasPersistentes: boolean; // Padrão: true
}

// ========== P3: CENTRAL DE DOCUMENTOS ==========
export type CategoriaDocumento = 
  | 'certificado'
  | 'termo_assinado'
  | 'advertencia'
  | 'avaliacao'
  | 'feedback_pdf'
  | 'contrato'
  | 'curriculo'
  | 'documento_pessoal'
  | 'outro';

export interface Documento {
  id: string;
  colaboradorId: string;
  nome: string;
  categoria: CategoriaDocumento;
  tipoArquivo: string; // pdf, docx, png, jpg, etc
  url: string; // URL no Google Drive
  driveFileId?: string; // ID do arquivo no Drive
  tamanho: string; // Ex: "2.5 MB"
  uploadedPor: string; // Usuario ID
  dataUpload: string;
  descricao?: string;
}

// ========== P4: SISTEMA DE RECONHECIMENTO ==========
export interface TipoReconhecimento {
  id: string;
  nome: string; // Ex: "MVP do Mês", "Inovador", "Team Player"
  icone: string; // Nome do ícone Lucide
  cor: string; // Cor em hex ou Tailwind
  ativo: boolean;
  criterios?: string; // Descrição dos critérios
}

export interface Reconhecimento {
  id: string;
  colaboradorId: string;
  tipoId: string; // ID do TipoReconhecimento
  titulo: string;
  descricao: string;
  concedidoPor: string; // Usuario ID (gestor)
  dataConcessao: string;
  visibleEquipe: boolean; // Se aparece no mural da equipe
  arquivoUrl?: string; // Certificação PDF, se aplicável
}

export interface ConfiguracaoReconhecimento {
  tipos: TipoReconhecimento[];
  permitirIndicacaoPeer: boolean; // Se colaboradores podem indicar colegas
  permiteUploadCertificado: boolean;
  notificacoesAutomaticas: boolean;
}

// ========== P4: LINHA DO TEMPO INTELIGENTE ==========
export interface ItemLinhaTempo {
  id: string;
  tipo: 'registro' | 'documento' | 'reconhecimento' | 'meta' | 'tarefa' | 'avaliacao';
  titulo: string;
  descricao: string;
  data: string;
  icone: string;
  cor: string;
  entidadeId?: string; // ID da entidade relacionada (registro, documento, etc)
  entidadeTipo?: string; // Tipo da entidade
}

// ========== P5: SISTEMA DE METAS ==========
export type TipoInteracao = 
  | 'avaliacao_180'
  | 'avaliacao_bem_estar'
  | 'avaliacao_experiencia'
  | 'feedback'
  | 'conversa_alinhamento'
  | 'conversa_disciplinar'
  | 'conversa_informal'
  | 'conversa_desenvolvimento'
  | 'conversa_reconhecimento'
  | 'onboarding'
  | 'pdiavaliacao_360';

export interface MetaLideranca {
  id: string;
  liderId: string;
  tipoInteracao: TipoInteracao;
  titulo: string;
  descricao: string;
  quantidadeMinima: number; // Meta mensal
  periodo: 'mensal' | 'trimestral' | 'semestral';
  ativo: boolean;
}

export interface MetaSetor {
  id: string;
  setorId: string;
  tipoInteracao: TipoInteracao;
  titulo: string;
  descricao: string;
  quantidadeMinima: number; // Meta mensal
  periodo: 'mensal' | 'trimestral' | 'semestral';
  ativo: boolean;
}

export interface AcompanhamentoRealizado {
  id: string;
  tipoInteracao: TipoInteracao;
  colaboradorId: string;
  liderId: string;
  setorId: string;
  data: string;
  descricao?: string;
  documentoId?: string; // Link para documento gerado
}

export interface ResumoMetas {
  liderId: string;
  periodo: string; // YYYY-MM
  metas: {
    metaId: string;
    tipoInteracao: TipoInteracao;
    quantidadeMeta: number;
    quantidadeRealizada: number;
    percentual: number;
  }[];
  totalMeta: number;
  totalRealizado: number;
  percentualGeral: number;
}

// ========== P6: GESTÃO DE PESSOAS ==========

// Período Aquisitivo de Férias
export interface PeriodoAquisitivo {
  id: string;
  colaboradorId: string;
  anoBase: number; // Ano de referência para o período aquisitivo
  dataInicio: string; // Data de início do período
  dataFim: string; // Data de fim do período (dataInicio + 12 meses)
  diasDisponiveis: number; // Dias de férias disponíveis
  diasUsados: number; // Dias já utilizados
  status: 'ativo' | 'vencido' | 'futuro';
  diasRestantes?: number; // Dias restantes (calculado)
}

// Registro de Férias
export interface Ferias {
  id: string;
  colaboradorId: string;
  periodoAquisitivoId: string;
  dataInicio: string;
  dataFim: string;
  dias: number;
  status: 'planejada' | 'concluida' | 'cancelada';
  observacoes?: string;
  createdAt: string;
}

// DayOff - Folga pelo aniversário
export interface DayOff {
  id: string;
  colaboradorId: string;
  ano: number;
  dataLimite: string; // Geralmente 30 dias após o aniversário
  dataUtilizacao?: string;
  status: 'disponivel' | 'utilizado' | 'vencido';
  observacoes?: string;
}

// Folga Compensatória
export interface Folga {
  id: string;
  colaboradorId: string;
  data: string;
  motivo: string;
  status: 'aprovada' | 'pendente' | 'cancelada';
  observacoes?: string;
  createdAt: string;
}

// Configurações de Gestão de Pessoas
export interface ConfiguracaoGestaoPessoas {
  diasAntecedenciaFerias: number; // Dias de antecedência para planejar férias
  permitirFeriasProlongadas: boolean; // Permitir férias > 30 dias
  maximoDiasFolga: number; // Máximo de folgas por ano
  obrigarPeriodoAquisitivo: boolean; // Exigir período aquisitivo completo
  anteciparAniversario: boolean; // Permitir antecipar aniversário de empresa
  notificacoes: {
    ferias90dias: boolean;
    feriasVencendo: boolean;
    dayoffPendente: boolean;
    folgasPendentes: boolean;
    aniversarioProximo: boolean;
    aniversarioEmpresaProximo: boolean;
  };
}

// Ciclo de Vida do Colaborador (dados calculados)
export interface CicloVidaColaborador {
  colaboradorId: string;
  tempoDeEmpresa: string; // Ex: "2 anos, 3 meses"
  tempoDeEmpresaDias: number;
  proximasFérias: {
    dataInicio?: string;
    dataFim?: string;
    dias?: number;
  };
  prazoMaximoFerias: string; // Data limite para gozar férias
  statusFerias: 'elegivel' | 'pendente' | 'vencido' | 'em_gozo';
  proximoAniversario: string;
  diasParaAniversario: number;
  proximoAniversarioEmpresa: string;
  diasParaAniversarioEmpresa: number;
  dayOff: {
    disponivel: boolean;
    diasRestantes?: number;
    dataLimite?: string;
  };
  ultimoFeedback?: string;
  ultimaAvaliacao?: string;
  ultimoPDI?: string;
  ultimoReconhecimento?: string;
}
