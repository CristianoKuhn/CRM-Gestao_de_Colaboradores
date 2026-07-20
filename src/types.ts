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
  | 'Férias Gozadas'
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

// Avaliação 180° - Resposta individual
export interface RespostaAvaliacao180 {
  perguntaId: string;
  nota: number;
  comentario: string;
}

// Resultado completo da Avaliação 180°
export interface ResultadoAvaliacao180 {
  id: string;
  colaboradorId: string;
  dataRealizacao: string;
  resultado: 'aprovado' | 'reprovado';
  mediaGeral: number;
  mediaPonderada: number;
  respostas: RespostaAvaliacao180[];
  observacoes: string;
  avaliadorId: string;
  tipo: '180';
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
  useApiProxy?: boolean;
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
  // Hierarquia de supervisão: ids de outros Usuarios (tipicamente perfil "Lider") que este
  // usuário supervisiona. Quando preenchido, a visibilidade dele passa a incluir também os
  // colaboradores desses líderes, além dos seus próprios setoresPermitidos — sem precisar
  // atribuir múltiplos líderes por colaborador (ver documentação técnica, seção 12).
  lideresSupervisionados?: string[];
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
  diasDisponiveis: number; // Dias de férias disponíveis (padrão 30)
  diasUsados: number; // Dias já utilizados
  diasRestantes: number; // Dias restantes (calculado)
  status: 'ativo' | 'vencido' | 'futuro' | 'concluido';
  // Novos campos
  dataConclusao?: string; // Quando foi concluído
  marcaComoUtilizado?: boolean; // Se foi marcado como já utilizado
  observacoes?: string;
}

// Histórico de Período Aquisitivo (visualização)
export interface HistoricoPeriodoAquisitivo {
  id: string;
  colaboradorId: string;
  periodo: string; // Ex: "15/03/2024 até 14/03/2025"
  diasTotais: number;
  diasUtilizados: number;
  diasRestantes: number;
  status: 'Em aquisição' | 'Parcialmente utilizado' | 'Concluído' | 'Vencido';
  dataInicio: string;
  dataFim: string;
}

// Registro de Férias
export interface Ferias {
  id: string;
  colaboradorId: string;
  periodoAquisitivoId: string;
  dataInicio: string;
  dataFim: string;
  dias: number;
  status: 'planejada' | 'concluida' | 'cancelada' | 'em_gozo';
  observacoes?: string;
  createdAt: string;
  // Novos campos
  tipo?: 'integral' | 'parcial';
  periodosUsados?: string[]; // IDs dos períodos aquisitivos utilizados
}

// Alerta Inteligente de Férias
export interface AlertaFerias {
  id: string;
  colaboradorId: string;
  tipo: 'periodo_aquisitivo_vencendo' | 'ferias_vencendo' | 'prazo_concessivo_vencendo' | 'conflito_setor' | 'superior_afastado';
  titulo: string;
  descricao: string;
  severidade: 'verde' | 'amarelo' | 'vermelho';
  diasRestantes?: number;
  dataReferencia?: string;
  recomendacao?: string;
  status: 'pendente' | 'reconhecido' | 'resolvido';
  createdAt: string;
}

// Sugestão de Data para Férias
export interface SugestaoDataFerias {
  data: string;
  motivo: string;
  conflitos: number; // Quantidade de conflitos
  colaboradoresAfastados: number;
  percentualEquipeAfastada: number;
  score: number; // Quanto menor, melhor
}

// Conflito de Férias Detectado
export interface ConflitoFerias {
  tipo: 'mesmo_setor' | 'gestor_afastado' | 'alta_concentracao';
  severidade: 'info' | 'alerta' | 'critico';
  descricao: string;
  colaboradoresAfetados: string[];
  dataInicio: string;
  dataFim: string;
  recomendacao?: string;
}

// Configurações de Férias
export interface ConfiguracaoFerias {
  diasAntecedenciaAlerta: number; // Padrão 90 dias
  permitirFeriasProlongadas: boolean;
  maximoDiasSimultaneoSetor: number; // Máximo de pessoas por setor
  maximoPercentualEquipe: number; // Percentual máximo da equipe
  diasMinimosAntecedenciaPlanejamento: number;
  // Opções de antecedência (para o seletor)
  opcoesAntecedencia: number[]; // [30, 60, 90, 120, 180]
  // Regras trabalhistas
  salarioMinimoDias: number; // Mínimo de dias por período (geralmente 10)
  prazoConcessivoMeses: number; // Prazo máximo para gozar (geralmente 12 meses após período aquisitivo)
}

// Dashboard Macro de Férias (visão anual)
export interface DashboardMacroFerias {
  ano: number;
  meses: {
    mes: number; // 1-12
    colaboradores: {
      colaboradorId: string;
      nome: string;
      setorId: string;
      dataInicio: string;
      dataFim: string;
    }[];
    totalAfastados: number;
    percentualAfastados: number;
  }[];
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

// ═══════════════════════════════════════════════════════════════════
// ESCALA INTELIGENTE — MÓDULO 1: BASE DA ESCALA
// Ver documento de arquitetura ESCALA_INTELIGENTE_ARQUITETURA.md, seções 2-4.
// Entidades de parâmetro/regra (o que alimenta a geração) ficam separadas do
// resultado (EscalaGerada / TurnoEscalado), para permitir reprocessar sem
// perder o histórico do que já foi publicado.
// ═══════════════════════════════════════════════════════════════════

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6; // 0 = domingo

export interface ConfiguracaoEscala {
  empresaId: string;
  cargaHorariaSemanal: number; // ex: 44
  permiteBancoHoras: boolean;
  permiteHoraExtraSemana: boolean; // false no cenário padrão do sistema
  domingoContaHoraExtra: boolean; // true no cenário padrão do sistema
  intervaloMinimoInterjornadaHoras: number; // ex: 11 (CLT)
  maxDiasConsecutivos: number; // ex: 6
  diasAntecedenciaPublicacao: number; // aviso mínimo antes de a escala valer
}

export interface TurnoPadrao {
  id: string;
  empresaId: string;
  nome: string; // "Manhã", "Tarde-Noite", "Fechamento"...
  horaInicio: string; // "07:00"
  horaFim: string; // "15:00"
  diasSemana: DiaSemana[];
  setorId?: string;
  ativo: boolean;
}

export interface JornadaTrabalho {
  id: string;
  colaboradorId: string;
  tipoJornada: string;
  cargaSemanalHoras: number;
  turnoPadraoId?: string;
  dataInicioVigencia: string;
  dataFimVigencia?: string;
  ativo: boolean;
}

export interface DisponibilidadeColaborador {
  id: string;
  colaboradorId: string;
  diaSemana: DiaSemana;
  horaInicio: string;
  horaFim: string;
  tipo: 'disponivel' | 'indisponivel';
  observacoes?: string;
}

export type TipoRestricaoIndividual = 'nao_trabalha_domingo' | 'horario_fixo' | 'carga_reduzida' | 'outro';

export interface RestricaoIndividual {
  id: string;
  colaboradorId: string;
  tipo: TipoRestricaoIndividual;
  detalhes: Record<string, unknown>;
  dataInicio: string;
  dataFim?: string;
  observacoes?: string;
}

export interface FolgaFixaEscala {
  id: string;
  colaboradorId: string;
  diaSemana?: DiaSemana;
  recorrente: boolean;
  dataEspecifica?: string;
  motivo?: string;
}

export interface RegraCobertura {
  id: string;
  empresaId: string;
  setorId?: string;
  cargoId?: string;
  diaSemana: 'todos' | DiaSemana | 'domingo';
  horaInicio: string;
  horaFim: string;
  quantidadeMinima: number;
  prioridade: number; // resolve empate quando duas regras cobrem a mesma janela
}

export interface RegraDescanso {
  id: string;
  empresaId: string;
  intervaloMinimoInterjornadaHoras: number;
  maxDiasConsecutivosTrabalho: number;
  descansoSemanalRemuneradoDia?: DiaSemana;
}

export interface FeriadoEscala {
  id: string;
  empresaId: string;
  data: string;
  nome: string;
  tipo: 'nacional' | 'estadual' | 'municipal' | 'facultativo';
  afetaCobertura: boolean;
}

export type TipoExcecaoEscala = 'folga_extra' | 'trabalho_extra' | 'horario_alterado' | 'cobertura_especial';

export interface ExcecaoEscala {
  id: string;
  colaboradorId?: string; // vazio = evento geral (ex: campanha, evento na cidade)
  data: string;
  tipo: TipoExcecaoEscala;
  detalhes: Record<string, unknown>;
  motivo: string;
  aprovadoPor?: string;
}

export type StatusEscala = 'rascunho' | 'validado' | 'publicado' | 'arquivado';

export interface EscalaGerada {
  id: string;
  empresaId: string;
  periodoInicio: string;
  periodoFim: string;
  status: StatusEscala;
  geradoEm: string;
  geradoPor: string; // Usuario.id
  parametrosSnapshot: Record<string, unknown>;
  resumoValidacoes?: Record<string, unknown>;
}

export type TipoTurnoEscalado = 'normal' | 'domingo' | 'feriado' | 'compensacao';
export type OrigemTurnoEscalado = 'automatico' | 'manual' | 'ajuste';
export type StatusTurnoEscalado = 'confirmado' | 'pendente' | 'conflito';

export interface TurnoEscalado {
  id: string;
  escalaId: string;
  colaboradorId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
  setorId: string;
  cargoId: string;
  tipoTurno: TipoTurnoEscalado;
  origem: OrigemTurnoEscalado;
  status: StatusTurnoEscalado;
  observacoes?: string;
}

export interface BancoHorasMovimento {
  id: string;
  colaboradorId: string;
  data: string;
  tipo: 'credito' | 'debito';
  horas: number;
  origemTurnoId?: string;
  saldoApos: number;
  observacoes?: string;
}
