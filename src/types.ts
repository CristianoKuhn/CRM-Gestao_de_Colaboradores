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
  // Regime contratual — usado pelo Motor de Disponibilidade Operacional para
  // diferenciar regras de direito a férias/ausências por tipo de vínculo.
  // Opcional e retrocompatível: colaboradores existentes sem este campo
  // continuam tratados como CLT (padrão) até serem editados.
  regime?: 'CLT' | 'PJ' | 'Estagiario' | 'Outro';
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
  // Dashboards que este usuário pode ver na Sidebar — lista vazia/ausente
  // equivale a "todos habilitados" (ver dashboardVisivelParaUsuario em Sidebar.tsx).
  dashboardsHabilitados?: string[];
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

// ============================================================================
// MOTOR DE DISPONIBILIDADE OPERACIONAL — entidades genéricas (Fase 2: primeira
// implementação é o Motor de Férias, mas o desenho já nasce reutilizável para
// qualquer ausência futura: day off, folga, licença, treinamento, banco de
// horas, evento). Ver documento de arquitetura "Motor de Gestão de Férias e
// Disponibilidade Operacional".
// ============================================================================

// Tipo de ausência coberto por um movimento. 'ferias' é o único com uso real
// hoje; os demais existem desde já para não exigir migração de schema quando
// licenças/treinamentos/eventos forem implementados.
export type TipoAusencia = 'ferias' | 'day_off' | 'folga' | 'licenca' | 'treinamento' | 'banco_horas' | 'evento';

// Natureza do lançamento. 'ajuste_manual' é o mecanismo usado para migrar
// histórico de colaboradores antigos sem apagar/recriar períodos.
export type TipoMovimentoAusencia = 'gozo' | 'venda' | 'ajuste_manual' | 'cancelamento' | 'correcao';

// Fonte de verdade do consumo de qualquer ausência. PeriodoAquisitivo.diasUsados
// / diasRestantes / status são um CACHE derivado destes movimentos — nunca
// devem ser editados diretamente fora da camada que recalcula esse cache
// (ver features/disponibilidade/engine/CalculadoraSaldoPeriodo.ts). Um
// movimento nunca é apagado nem editado depois de criado: para desfazer um
// lançamento, cria-se um NOVO movimento com tipoMovimento: 'cancelamento',
// mesmos `dias` e `ausenciaOrigemId` apontando para o movimento original —
// o saldo final é sempre a soma de todos os lançamentos, nunca uma edição.
export interface MovimentoAusencia {
  id: string;
  colaboradorId: string;
  tipoAusencia: TipoAusencia;
  tipoMovimento: TipoMovimentoAusencia;
  periodoAquisitivoId?: string; // só relevante quando tipoAusencia === 'ferias'
  ausenciaOrigemId?: string; // id do Ferias/DayOff/Folga/movimento que este lançamento se refere ou desfaz
  dataInicio: string;
  dataFim: string;
  dias: number;
  observacoes?: string;
  criadoPor: string;
  criadoEm: string;
}

// Auditoria genérica — não é específica de férias. Reutilizável por qualquer
// entidade do sistema que precise de trilha de "quem fez o quê, quando"
// sem apagar o estado anterior.
export interface HistoricoAlteracao {
  id: string;
  entidade: string; // ex: 'periodo_aquisitivo' | 'movimento_ausencia'
  entidadeId: string;
  acao: 'criacao' | 'edicao' | 'cancelamento';
  usuarioId: string;
  dataHora: string;
  estadoAnterior?: string; // snapshot em JSON, quando acao !== 'criacao'
  observacao?: string;
}

// ── Motor de Disponibilidade Operacional — Fase 6 (Motor de Sugestão) ──
// Distribuição automática de férias ao longo do ano por setor. Convenção de
// pontuação IGUAL à do motor de Escala Inteligente (0 a 1, quanto maior
// melhor) — não a convenção antiga de SugestaoDataFerias (quanto menor
// melhor), para os dois motores ficarem consistentes entre si.
export interface JustificativaSugestaoFerias {
  criterio: string;
  descricao: string;
  favoravel: boolean;
}

export interface SugestaoDistribuicaoFerias {
  colaboradorId: string;
  periodoAquisitivoId: string;
  mes: number; // 1-12
  ano: number;
  dataInicio: string;
  dataFim: string;
  dias: number;
  pontuacao: number; // 0 a 1
  justificativas: JustificativaSugestaoFerias[];
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
  // ── Fase 3 (Motor de Disponibilidade Operacional): parametrização das
  // regras de férias — nada fica fixo no código, tudo lido a partir daqui
  // pelo PlanejadorFerias.tsx (ver detectarConflitos/handleSalvar).
  maximoParcelas: number; // Quantos lançamentos de gozo um mesmo período aquisitivo pode ter
  permitirVendaFerias: boolean; // "Abono pecuniário"
  diasVendidosMaximo: number; // Geralmente até 10 dias (1/3 do período de 30)
  bloquearSobreposicao: boolean; // true = impede salvar; false = só avisa
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

// ── Escala Inteligente — Módulo 2: Rotinas Operacionais ──────────────
// Uma Rotina Operacional é a unidade de cobertura que a IA de geração de escala
// tenta preencher PRIMEIRO, antes de distribuir os colaboradores restantes.
// Ela é mais rica que TurnoPadrao/RegraCobertura porque carrega, na mesma entidade,
// cargo permitido, prioridade e se é obrigatória — TurnoPadrao/RegraCobertura
// continuam existindo e são reaproveitados pelo motor de geração como fallback
// para setores que ainda não migraram para Rotinas.
export type PrioridadeRotina = 'alta' | 'media' | 'baixa';

// Tipo de dia ao qual a rotina se aplica. "feriado" é opcional — quando não há
// rotina de feriado cadastrada para o setor, o motor usa a rotina de "domingo".
export type TipoDiaRotina = 'semana' | 'sabado' | 'domingo' | 'feriado';

export interface RotinaOperacional {
  id: string;
  empresaId: string;
  setorId: string;
  nome: string;
  tipoDia: TipoDiaRotina;
  horaInicio: string;
  horaFim: string;
  quantidadeMinima: number;
  cargosPermitidos: string[]; // ids de Cargo; vazio = qualquer cargo do setor
  prioridade: PrioridadeRotina;
  obrigatoria: boolean;
  ativo: boolean;
  // Cor de exibição na grade semanal (ex: "#7C3AED"). Opcional — se vazia, a tela
  // usa uma cor padrão gerada a partir do id da rotina, só pra nunca ficar sem cor.
  cor?: string;
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
  // Intervalo de almoço/descanso dentro do turno — personalizável por turno,
  // não é um valor fixo da empresa. Ex: alguém que abre às 08:00 pode almoçar
  // às 12:00-13:00, outro que abre às 07:00 pode almoçar 11:00-12:00.
  intervaloInicio?: string;
  intervaloFim?: string;
  setorId: string;
  cargoId: string;
  tipoTurno: TipoTurnoEscalado;
  origem: OrigemTurnoEscalado;
  status: StatusTurnoEscalado;
  observacoes?: string;
  // Qual RotinaOperacional este turno está cobrindo (ex: "Retenção", "Suporte Geral").
  // rotinaNome/rotinaCor são gravados DENORMALIZADOS (copiados no momento da geração),
  // de propósito: se o gestor renomear ou trocar a cor de uma rotina depois, a escala
  // já publicada/histórica não pode mudar de aparência retroativamente.
  rotinaId?: string;
  rotinaNome?: string;
  rotinaCor?: string;
  // Preenchido pelo motor de geração automática (quando existir) para alimentar a
  // explicabilidade — ver JustificativaTurno.
  justificativas?: JustificativaTurno[];
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

// ── Escala Inteligente — Módulo 3: Perfil de Disponibilidade do Colaborador ──
// Consolida, numa entidade própria por colaborador (1 registro = 1 colaborador),
// todas as regras permanentes que o motor de geração de escala deve respeitar.
// Fica em uma planilha própria (PerfisDisponibilidade) em vez de inflar o cadastro
// básico do Colaborador — assim a tela de Colaboradores existente não é tocada e o
// perfil pode evoluir de forma independente.

export interface JornadaContratual {
  diasNormais: DiaSemana[];
  horaEntradaPadrao: string;
  horaSaidaPadrao: string;
  horaInicioAlmoco: string;
  horaFimAlmoco: string;
  cargaHorariaDiaria: number;
  cargaHorariaSemanal: number;
}

// "Exceções à jornada" — cada uma carrega o próprio limite de frequência, e o motor de
// geração nunca pode ultrapassá-lo automaticamente (só numa edição manual explícita).
export type TipoDisponibilidadeFlexivel =
  | 'dia_extra_semana' // ex: pode trabalhar terça a sábado além do padrão contratual
  | 'trabalhar_domingo'
  | 'iniciar_antes'
  | 'terminar_depois'
  | 'dobra_turno'
  | 'cobrir_outro_turno'
  | 'trabalhar_feriado';

export type LimiteFrequencia = '1x_mes' | '2x_mes' | '4x_mes' | 'ilimitado';

export interface DisponibilidadeFlexivel {
  tipo: TipoDisponibilidadeFlexivel;
  limiteFrequencia: LimiteFrequencia;
  observacoes?: string;
}

// Preferências são "soft constraints": o gerador tenta respeitar, mas pode ignorar
// quando a cobertura obrigatória exigir — ao contrário de Restrições, que são "hard".
export type TipoPreferenciaColaborador =
  | 'prefere_manha'
  | 'prefere_tarde'
  | 'prefere_noite'
  | 'prefere_folgar_domingo'
  | 'prefere_trabalhar_sabado';

export interface PreferenciaColaborador {
  tipo: TipoPreferenciaColaborador;
  observacoes?: string;
}

// Habilitações do colaborador por setor/função — diferente de Colaborador.setorId/cargoId
// (que é a lotação "principal"), aqui é a lista completa de onde ele PODE ser escalado.
// O motor de geração nunca escala fora desta lista.
export interface CompetenciaColaborador {
  setorId: string;
  cargoId: string;
  habilitado: boolean;
}

// Restrições são permanentes e obrigatórias ("hard constraints") — o motor nunca pode
// violá-las, mesmo em falta de cobertura.
export type TipoRestricaoPermanente =
  | 'nao_pode_fechar'
  | 'nao_pode_abrir'
  | 'nao_pode_trabalhar_sozinho'
  | 'nao_pode_turno_noturno'
  | 'nao_pode_levantar_carga'
  | 'somente_acompanhado'
  | 'outro';

export interface RestricaoPermanente {
  tipo: TipoRestricaoPermanente;
  observacoes?: string;
}

export type PrioridadeUtilizacaoColaborador = 'fixo' | 'preferencial' | 'flexivel' | 'cobertura' | 'temporario';

export interface PerfilDisponibilidadeColaborador {
  id: string;
  colaboradorId: string;
  jornadaContratual: JornadaContratual;
  disponibilidadesFlexiveis: DisponibilidadeFlexivel[];
  preferencias: PreferenciaColaborador[];
  competencias: CompetenciaColaborador[];
  restricoes: RestricaoPermanente[];
  prioridadeUtilizacao: PrioridadeUtilizacaoColaborador;
  atualizadoEm?: string;
}

// ── Explicabilidade da IA (item 7) ──────────────────────────────────────────
// O motor de geração automática (fase futura, ainda não implementada — ver plano)
// deverá preencher `TurnoEscalado.justificativas` com a lista de motivos que levaram
// à escolha do colaborador. O tipo e o componente de visualização já ficam prontos
// aqui para que, assim que o gerador existir, baste ele popular este campo.
export interface JustificativaTurno {
  regra: string; // rótulo curto, ex: "Disponibilidade", "Habilitação de setor"
  descricao: string; // frase completa, ex: "Está disponível no horário do turno"
  atendida: boolean; // true = motivo positivo (regra respeitada / a favor da escolha)
}

// ═══════════════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 2: Modelagem
// Ver documento de arquitetura "Motor de Formulários Inteligentes com Workflow",
// seções 2 a 8. Plataforma genérica de formulários corporativos com fluxo de
// trabalho — Avaliação de Experiência e Avaliação 180° são os primeiros
// consumidores desta plataforma, não o motor em si. Qualquer processo futuro
// (360°, anual, PDI, feedback, pesquisa de clima/satisfação, onboarding,
// offboarding, checklist, auditoria, inspeção...) usa exatamente as mesmas
// entidades abaixo, sem alteração de schema — só um novo FormularioTemplate.
// ═══════════════════════════════════════════════════════════════════════════

// ── Perguntas genéricas ──────────────────────────────────────────────────
export type TipoPergunta =
  | 'nota'
  | 'texto_curto'
  | 'texto_longo'
  | 'numero'
  | 'data'
  | 'sim_nao'
  | 'multipla_escolha'
  | 'lista'
  | 'escala'
  | 'upload_arquivo'
  | 'assinatura'
  | 'campo_calculado';

export type OperadorCondicao = 'igual' | 'diferente' | 'maior_que' | 'menor_que' | 'contem';

// Regra condicional de EXIBIÇÃO de uma pergunta (ex.: "só mostrar se a resposta
// da pergunta X for Sim"). Resolvida pelo motor de validação, nunca por lógica
// específica de tela — ver validacaoEngine.ts.
export interface CondicaoExibicao {
  perguntaId: string;
  operador: OperadorCondicao;
  valor: unknown;
}

export interface PerguntaFormulario {
  id: string;
  tipo: TipoPergunta;
  label: string;
  descricao?: string;
  obrigatoria: boolean;
  peso?: number; // usado pela regra de cálculo 'media_ponderada'
  escala?: { min: number; max: number }; // para os tipos 'nota' e 'escala'
  opcoes?: string[]; // para 'multipla_escolha' e 'lista'
  permiteComentario?: boolean;
  critica?: boolean; // sinaliza elegibilidade para a regra 'nota_minima_obrigatoria'
  notaMinimaObrigatoria?: number;
  exibirSe?: CondicaoExibicao;
}

export interface CategoriaFormulario {
  id: string;
  nome: string;
  perguntas: PerguntaFormulario[];
}

// ── Motor de cálculo (regras extensíveis, ver arquitetura seção 5) ──────────
export type TipoRegraCalculo =
  | 'media_simples'
  | 'media_ponderada'
  | 'nota_minima_obrigatoria'
  | 'condicional'
  | 'faixa_parecer'
  | 'formula_customizada';

export interface FaixaParecer {
  min: number;
  label: string;
}

// Shape única e flexível para todos os tipos de regra — o `calculoEngine`
// interpreta os campos relevantes conforme `tipo` (registry de avaliadores,
// um por tipo). Novo tipo de regra = nova função no registry, nunca alteração
// de tela.
export interface RegraCalculo {
  tipo: TipoRegraCalculo;
  campoResultado?: string; // ex.: 'mediaGeral', 'mediaPonderada', 'parecerFinal'
  perguntaId?: string; // usado por 'nota_minima_obrigatoria'
  minimo?: number;
  seFalhar?: { campoResultado: string; valor: string };
  se?: { perguntaId: string; operador: OperadorCondicao; valor: unknown }; // usado por 'condicional'
  entao?: { campoResultado: string; valor: string; prioridade?: number };
  baseadoEm?: string; // usado por 'faixa_parecer', ex.: 'mediaPonderada'
  faixas?: FaixaParecer[];
  formula?: string; // reservado para 'formula_customizada' (expressão avaliada sem eval)
}

// ── Template de formulário — versionado, nunca sobrescrito ──────────────────
// Regra de negócio: uma vez que exista `FormularioInstancia` apontando para um
// `id` de template, esse `id` se torna imutável. Qualquer alteração de estrutura
// cria uma nova linha com `versao + 1` e o mesmo `templateFamiliaId`. Ver
// documento de arquitetura, seção 2.1.
export interface FormularioTemplate {
  id: string; // identificador desta versão específica
  templateFamiliaId: string; // identificador estável da família (ex.: "avaliacao-experiencia")
  versao: number;
  nome: string;
  descricao?: string;
  tipoProcesso: string; // string livre e extensível — nunca union fechada
  workflowId: string;
  ativo: boolean; // só a versão ativa de cada família é usada para gerar novas instâncias
  // Sprint 5: quando true, o modal oferece a aba "Autoavaliação do colaborador"
  // além de "Como gestor" (ver ModalFormularioAvaliacao / comparativoEngine).
  permiteAutoavaliacao?: boolean;
  categorias: CategoriaFormulario[];
  regrasCalculo: RegraCalculo[];
  aparencia?: Record<string, unknown>;
  criadoEm: string;
  criadoPor: string;
}

// ── Workflow genérico — desacoplado de qualquer processo ────────────────────
export type TipoEstadoWorkflow = 'inicial' | 'intermediario' | 'final';

export interface EstadoWorkflow {
  id: string;
  nome: string;
  tipo: TipoEstadoWorkflow;
}

export interface TransicaoWorkflow {
  de: string;
  para: string;
  acao: string;
  papeisPermitidos?: string[];
}

export interface WorkflowDefinicao {
  id: string;
  nome: string;
  estados: EstadoWorkflow[];
  transicoes: TransicaoWorkflow[];
}

// ── Instância — generaliza "Avaliacao" para qualquer tipo de formulário ─────
export interface ResultadoFormularioInstancia {
  mediaGeral?: number;
  mediaPonderada?: number;
  parecerFinal?: string;
  camposCalculados?: Record<string, unknown>;
}

export interface FormularioInstancia {
  id: string;
  templateId: string; // aponta para a versão exata usada
  templateFamiliaId: string; // denormalizado, para consultar por família independente da versão
  tipoProcesso: string; // denormalizado do template
  workflowId: string; // denormalizado do template
  entidadeTipo: string; // 'colaborador' hoje; genérico para o futuro ('setor', 'loja'...)
  entidadeId: string;
  responsavelId: string; // quem preenche/avalia
  estadoWorkflow: string; // nó atual do grafo do WorkflowDefinicao
  dataLimite?: string; // ausente = processo sem prazo (ex.: pesquisa de clima aberta)
  dataInicio?: string;
  dataConclusao?: string;
  resultado?: ResultadoFormularioInstancia;
  origem: 'sistema' | 'manual';
  justificativaAtraso?: string;
  dataReagendamento?: string;
  // Snapshot organizacional no momento da criação — preparação para Analytics
  // (arquitetura, seção 6). Nunca atualizado retroativamente, mesmo que o
  // colaborador mude de setor/gestor depois.
  setorId?: string;
  cargoId?: string;
  liderId?: string;
  empresaId?: string;
  // Campos reservados para IA (arquitetura, seção 7) — todos nulos/vazios até a
  // funcionalidade existir; nenhuma migração será necessária quando chegar a hora.
  iaParecerTecnico?: string;
  iaFeedbackGestor?: string;
  iaFeedbackColaborador?: string;
  iaPontosFortes?: string[];
  iaPontosMelhoria?: string[];
  iaSugestoesPdi?: string[];
  iaRecomendacoesTreinamento?: string[];
  iaGeradoEm?: string;
  iaModeloUsado?: string;
}

// ── Resposta — genérica para qualquer tipo de pergunta ───────────────────────
// Uma linha por pergunta × instância × papel — é o que viabiliza autoavaliação
// (papel 'gestor' vs 'colaborador') sem duplicar entidade, e o que permite
// consultas de Analytics por competência (arquitetura, seção 6).
export interface RespostaCampo {
  id: string;
  instanciaId: string;
  perguntaId: string;
  papel: string; // 'gestor' | 'colaborador' | 'auditor' | 'respondente'... livre
  valor: unknown; // formato depende de PerguntaFormulario.tipo; null = ainda não respondida (rascunho)
  comentario?: string;
  atualizadoEm: string;
}

// ── Histórico de transições de estado — genérico para qualquer workflow ─────
export interface HistoricoEstadoInstancia {
  id: string;
  instanciaId: string;
  estadoAnterior: string;
  estadoNovo: string;
  alteradoPor: string;
  data: string;
  observacao?: string;
}

// ═══════════════════════════════════════════════════════════════════════════
// MOTOR DE ITENS OPERACIONAIS — Sprint 1 (evolução do módulo "Tarefas")
// Ver "Motor de Itens Operacionais — Proposta Arquitetural", seções 3, 4, 13.
//
// Sprint 1 entrega só o schema. `Tarefa` (acima) continua existindo e sendo
// usada por Tarefas.tsx/App.tsx sem nenhuma alteração — por baixo, o backend
// já grava em ItensOperacionais (ver arquitetura, seção 17). Estes tipos
// ficam disponíveis para os componentes que os sprints seguintes forem
// introduzindo (Sprint 2 em diante), sem exigir nova migração de schema.
// ═══════════════════════════════════════════════════════════════════════════

// String livre e extensível de propósito — nunca union fechada, para caber
// tipos futuros (plano_de_acao, aprovacao...) sem exigir migração de tipo.
export type TipoItemOperacional = 'tarefa' | 'checkin' | 'plano_de_acao' | 'aprovacao' | string;

export type TipoAtribuicaoItem = 'individual' | 'pool_setor';

// ── Categoria — cadastrável, define a criticidade padrão de quem nasce nela ──
export interface CategoriaItem {
  id: string;
  nome: string;
  criticidadePadrao?: string; // herdada pelo item ao criar, mas editável nele (ver arquitetura, seção 4)
  cor?: string;
  ativo: boolean;
}

// ── Item Operacional — generaliza "Tarefa" para qualquer tipo de item ───────
// (tarefa, check-in, e futuramente plano de ação, aprovação...). Ver
// arquitetura, seção 2 (reflexão sobre elevar o conceito).
export interface ItemOperacional {
  id: string;
  tipoItem: TipoItemOperacional;
  tipoAtribuicao: TipoAtribuicaoItem;
  titulo: string;
  descricao?: string;

  // Categoria/criticidade/prioridade — três eixos independentes (arquitetura, seção 4).
  categoriaId?: string;
  criticidade?: string;
  prioridade?: string;

  // Pessoas envolvidas — colaboradorId é o "sobre quem" (assunto do item, quando
  // fizer sentido); responsavelId é quem precisa executar; solicitanteId é quem
  // criou/vai validar o encerramento (arquitetura, seção 3 e 14).
  colaboradorId?: string;
  responsavelId?: string;
  responsavelTipo?: 'colaborador' | 'usuario';
  solicitanteId?: string;

  // Atribuição em pool de setor (arquitetura, seção 3 e Sprint 4).
  setorIdPool?: string;
  papeisAlvoPool?: string[];

  // Workflow — reaproveita exatamente WorkflowDefinicao (arquitetura, seção 5 e Sprint 2).
  workflowId: string;
  estadoWorkflow: string;

  // Dependências — só previstas no modelo de dados nesta etapa, sem bloqueio
  // automático ainda (arquitetura, seção 8).
  dependeDeIds?: string[];

  dataCriacao?: string;
  dataPrazo?: string;
  dataAssumida?: string;
  dataConclusao?: string;
  dataValidacao?: string;
  dataEncerramento?: string;

  // Origem — de onde este item nasceu, quando não foi criação manual direta
  // (arquitetura, seções 7, 10 e 12 — Templates, Gatilhos, Check-ins).
  origemRecorrenciaId?: string;
  origemTemplateId?: string;
  origemGatilhoId?: string;
  // Origem no Motor de Desenvolvimento de Colaboradores: quando o item foi
  // instanciado a partir de uma Etapa de Inscrição (ver Especificação v2,
  // Princípio 18 e Modelagem Física, seção 1.4). Usado para saber quando a
  // Etapa inteira pode ser concluída automaticamente.
  origemEtapaId?: string;

  // Ponte com o antigo módulo Tarefas (ver arquitetura, seção 17).
  tipoOrigem?: TipoRegistro | string;
  registroId?: string;
  empresaId?: string;
}

// ── Timeline de eventos — qualquer evento relevante do item, não só mudança
// de estado (arquitetura, seção 9). `tipoEvento` é string livre para caber
// novos tipos sem migração: "criado", "estado_alterado", "responsavel_alterado",
// "prioridade_alterada", "comentario_adicionado", "dependencia_resolvida",
// "gerado_por_template", "gerado_por_gatilho"...
export interface ItemEvento {
  id: string;
  itemId: string;
  tipoEvento: string;
  dadosEvento?: Record<string, unknown>;
  autorId?: string;
  data: string;
}

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE DESENVOLVIMENTO DE COLABORADORES — Biblioteca Corporativa
// Ver "Especificação Arquitetural Definitiva v2" e "Modelagem Física
// (Conceitual)". Esta rodada implementa só a camada base: Capacidades,
// Competências, Materiais, Matriz de Competências por Cargo e Áreas de
// Desenvolvimento. Programa/Oferta/Inscrição/Etapa/Evidência/Perfil/
// Certificação/Mentoria/Insight ficam para as próximas rodadas, na ordem
// do Roadmap do Domínio.
// ═══════════════════════════════════════════════════════════════════

export interface CapacidadeBiblioteca {
  id: string;
  nome: string;
  descricao?: string;
  ativo: boolean;
}

// Competência nunca é deletada, só inativada (Princípio 6 da Especificação
// v2 — "Histórico nunca é editado nem apagado" — e regra de negócio da
// Biblioteca) — por isso não existe um "deleteCompetenciaBiblioteca" em
// nenhuma camada, nem aqui nem no backend.
export interface CompetenciaBiblioteca {
  id: string;
  capacidadeId?: string; // opcional — hierarquia aditiva, nunca obrigatória (Princípio 24)
  nome: string;
  descricao?: string;
  categoria?: string;
  niveis: string[]; // escala ordenada e própria desta competência (ex.: ["Não iniciado", ..., "Especialista"])
  ativo: boolean;
}

export type TipoMaterialBiblioteca = 'material' | 'curso' | 'modelo' | 'documento' | 'video' | 'playbook';

export interface MaterialBiblioteca {
  id: string;
  tipo: TipoMaterialBiblioteca;
  nome: string;
  descricao?: string;
  url?: string;
  driveFileId?: string;
  tags?: string[];
  ativo: boolean;
}

export interface MatrizCompetenciaCargo {
  id: string;
  cargoId: string;
  competenciaId: string;
  nivelAlvo: string;
  obrigatorio: boolean;
}

// Recursiva via areaPaiId — puramente organizacional/de navegação, nunca
// participa do fluxo de eventos nem altera o Perfil (Princípio 22).
export interface AreaDesenvolvimento {
  id: string;
  areaPaiId?: string;
  nome: string;
  descricao?: string;
  ordem?: number;
  ativo: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE DESENVOLVIMENTO DE COLABORADORES — Programa (definição)
// Ver "Especificação Arquitetural Definitiva v2" e "Modelagem Física
// (Conceitual)", seção 1.3. Programa é só o molde/definição — nunca é
// executado diretamente (Princípio 20); Oferta/Inscrição/Etapa (a execução
// de verdade, por colaborador) ficam para a próxima rodada.
// ═══════════════════════════════════════════════════════════════════

export type TipoPrograma =
  | 'onboarding'
  | 'pdi'
  | 'lideranca'
  | 'capacitacao'
  | 'certificacao'
  | 'carreira'
  | 'universidade';

export type ModoEstruturaPrograma = 'sequencial' | 'catalogo' | 'continuo';

export type TipoCriterioElegibilidade = 'automatico' | 'indicacao' | 'autoinscricao' | 'gap_competencia';

export interface CriterioElegibilidade {
  tipo: TipoCriterioElegibilidade;
  // Detalhes específicos do critério (ex.: { setorId: '...' } para "automatico").
  // Mantido solto de propósito — o Motor de Elegibilidade (próxima rodada) é
  // quem interpreta o conteúdo de acordo com `tipo`.
  regras?: Record<string, unknown>;
}

// Uma vez com Ofertas vinculadas, um Programa nunca é sobrescrito — qualquer
// mudança de estrutura gera nova versão (mesmo programaFamiliaId, versao+1),
// mesmo padrão de FormularioTemplate (Princípio 17/20).
export interface Programa {
  id: string;
  programaFamiliaId: string;
  versao: number;
  areaDesenvolvimentoId?: string;
  nome: string;
  descricao?: string;
  tipoPrograma: TipoPrograma;
  modoEstrutura: ModoEstruturaPrograma;
  criterioElegibilidade: CriterioElegibilidade;
  ativo: boolean;
  criadoEm?: string;
  criadoPor?: string;
}

export interface CompetenciaAlvoEtapa {
  competenciaId: string;
  nivelAlvo: string;
}

export type TipoItemPadraoEtapa = 'atividade' | 'treinamento' | 'checklist';

export interface ItemPadraoEtapa {
  titulo: string;
  tipoItem: TipoItemPadraoEtapa;
  criticidade?: string;
}

export type PrazoBaseEtapa = 'admissao' | 'oferta' | 'etapa_anterior';

// A dependência entre Etapas é um grafo explícito (dependeDeIds), nunca um
// bloqueio binário fixo (Princípio 10) — isso é o que permite Programas
// sequenciais, com etapas paralelas, ou em catálogo livre sem tabela extra.
export interface ProgramaEtapaTemplate {
  id: string;
  programaId: string;
  ordem: number;
  nome: string;
  objetivos?: string;
  dependeDeIds: string[];
  prazoDias?: number;
  prazoBase: PrazoBaseEtapa;
  competenciasAlvo: CompetenciaAlvoEtapa[];
  itensPadrao: ItemPadraoEtapa[];
  materiaisIds: string[];
  exigeEvidencia: boolean;
  exigeValidacaoEvidencia: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE DESENVOLVIMENTO DE COLABORADORES — Oferta/Inscrição/Etapa/Evidência
// Ver "Especificação Arquitetural Definitiva v2" e "Modelagem Física
// (Conceitual)", seções 1.4/1.5. Esta é a camada de EXECUÇÃO real — Oferta
// publica um Programa, Inscrição vincula um Colaborador a uma Oferta, e
// InscricaoEtapa é a projeção, por colaborador, das ProgramaEtapasTemplate.
// A atualização do Perfil em si (Competências-alvo avaliadas) fica para a
// próxima rodada do Roadmap do Domínio.
// ═══════════════════════════════════════════════════════════════════

export type StatusOferta = 'aberta' | 'encerrada' | 'cancelada';

// Publicação concreta e datada de um Programa — uma "edição"/"turma". Um
// Programa pode ter várias Ofertas simultâneas (Princípio 20 — Programa nunca
// é executado diretamente, só através de uma Oferta).
export interface Oferta {
  id: string;
  programaId: string;
  nome: string;
  dataInicio?: string;
  dataFim?: string;
  vagas?: number;
  facilitadorId?: string;
  status: StatusOferta;
  criadoEm?: string;
}

export type EstadoWorkflowInscricao = 'em_andamento' | 'concluida' | 'cancelada';
export type OrigemInscricao = 'automatico' | 'indicacao' | 'autoinscricao' | 'recomendacao' | 'manual';

// Vínculo entre um Colaborador e uma Oferta específica (nunca diretamente com
// o Programa — Princípio 21). Um colaborador pode ter várias Inscrições
// simultâneas, em Ofertas de Programas diferentes (Princípio 11).
export interface Inscricao {
  id: string;
  colaboradorId: string;
  ofertaId: string;
  programaId: string;
  workflowId?: string;
  estadoWorkflow: EstadoWorkflowInscricao;
  origem: OrigemInscricao;
  dataInicio?: string;
  dataPrevisaoConclusao?: string;
  dataConclusao?: string;
  percentualConcluido: number; // cache — sempre derivado (Princípio 14)
  motivoCancelamento?: string;
}

export type StatusEtapaInscricao =
  | 'bloqueada'
  | 'disponivel'
  | 'em_andamento'
  | 'concluida'
  | 'atrasada'
  | 'encerrada_cancelamento';

export interface InscricaoEtapa {
  id: string;
  inscricaoId: string;
  etapaTemplateId: string;
  ordem: number;
  nome: string;
  status: StatusEtapaInscricao;
  dataPrevista?: string;
  dataConclusao?: string;
  responsavelId?: string;
  observacoes?: string;
}

export type EntidadeTipoEvidencia = 'item_operacional' | 'etapa' | 'avaliacao' | 'certificacao' | 'mentoria';
export type TipoEvidencia = 'documento' | 'video' | 'imagem' | 'observacao' | 'formulario' | 'assinatura' | 'aprovacao';
export type StatusEvidencia = 'pendente' | 'validada' | 'rejeitada';

// Prova associada à conclusão de um Item/Etapa/Avaliação/Certificação/Mentoria
// (Princípio 18). Quando o Programa exige prova, a conclusão só é válida com
// ao menos uma Evidência anexada (e validada, se o Programa também exigir).
export interface Evidencia {
  id: string;
  entidadeTipo: EntidadeTipoEvidencia;
  entidadeId: string;
  tipo: TipoEvidencia;
  url?: string;
  driveFileId?: string;
  texto?: string;
  anexadoPor?: string;
  data?: string;
  status: StatusEvidencia;
  validadoPor?: string;
  dataValidacao?: string;
}

export interface ResultadoConclusaoEtapa {
  id: string;
  etapasLiberadas: string[];
  percentualConcluido: number;
  inscricaoConcluida: boolean;
}

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE DESENVOLVIMENTO DE COLABORADORES — Perfil (Aggregate Root)
// Ver "Especificação Arquitetural Definitiva v2", Princípio 19, e "Modelagem
// Física (Conceitual)", seções 1.6 e 6. O Perfil é o único estado que
// realmente persiste (Princípio 1) — tudo o mais (Programa, Inscrição, Etapa,
// Avaliação, Certificação, Mentoria, Feedback) só existe para gerar eventos
// que o alimentam. Nunca há um "savePerfilCompetencia" genérico de nível —
// toda mudança passa por uma ação de negócio (avaliarCompetencia), nunca por
// upsert cru (Princípio 2).
// ═══════════════════════════════════════════════════════════════════

// Cache do nível atual de uma Competência para um Colaborador — o histórico de
// evolução em si não tem tipo próprio no frontend porque não é uma tabela
// nova: vive em HistoricoAlteracoes (entidade "perfil_competencia"), já
// genérica na plataforma.
export interface PerfilCompetencia {
  id: string;
  colaboradorId: string;
  competenciaId: string;
  nivelAtual: string;
  atualizadoEm?: string;
  atualizadoPor?: string;
}

export type StatusObjetivo = 'aberto' | 'alcancado' | 'expirado';

// Meta nomeada e com prazo — pode (ou não) estar ligada a uma Competência
// (Glossário da Especificação v2: "nem todo Objetivo é uma Competência").
export interface PerfilObjetivo {
  id: string;
  colaboradorId: string;
  titulo: string;
  descricao?: string;
  competenciaId?: string;
  prazo?: string;
  status: StatusObjetivo;
  dataConclusao?: string;
}

export interface CompetenciaResumoPerfil {
  competenciaId: string;
  nome: string;
  nivelAtual: string;
  nivelAlvoCargo: string;
  obrigatorioNoCargo: boolean;
  gap: boolean;
}

export interface InscricaoResumoPerfil {
  inscricaoId: string;
  programaNome: string;
  ofertaNome: string;
  percentualConcluido: number;
  proximaEtapa: string;
}

// PerfilConsolidadoDTO (Modelagem Física, seção 6) — o formato que a tela de
// perfil do colaborador consome numa única chamada ao backend, já com o Gap de
// Competência calculado (Perfil real vs. Matriz de Competências do Cargo).
export interface PerfilConsolidado {
  colaboradorId: string;
  competencias: CompetenciaResumoPerfil[];
  objetivos: PerfilObjetivo[];
  inscricoesAtivas: InscricaoResumoPerfil[];
}

export interface ResultadoEvolucaoCompetencia {
  alterado: boolean;
  nivelAnterior?: string;
  nivelAtual: string;
}

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE DESENVOLVIMENTO DE COLABORADORES — Indicadores
// Ver "Especificação Arquitetural Definitiva v2", Princípio 14 ("Indicadores
// são sempre derivados, nunca escritos manualmente") e "Modelagem Física
// (Conceitual)", seção 1.11. Sempre lido de um cache recalculado no backend —
// nunca existe um "saveIndicador" no frontend.
// ═══════════════════════════════════════════════════════════════════

export type EscopoTipoIndicador = 'setor' | 'cargo' | 'programa' | 'empresa';

export interface IndicadorDesenvolvimento {
  id: string;
  tipoIndicador: string;
  escopoTipo: EscopoTipoIndicador;
  escopoId: string;
  valor: number;
  calculadoEm?: string;
}
