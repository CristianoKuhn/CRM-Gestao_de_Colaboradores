// ── Motor Inteligente de Escala — Marco 4.1: Tipos centrais ─────────────────
// Este arquivo é o "contrato" entre os serviços do motor. Nenhum serviço
// conhece o outro diretamente — todos conversam através destas estruturas.
// Isso é o que permite testar cada serviço isolado, e trocar a implementação
// de um sem afetar os demais (ex: trocar o algoritmo de score sem tocar no
// ConstraintValidator).

import type {
  BancoHorasMovimento,
  Colaborador,
  ConfiguracaoEscala,
  DayOff,
  DisponibilidadeColaborador,
  Ferias,
  Folga,
  FolgaFixaEscala,
  JornadaTrabalho,
  PerfilDisponibilidadeColaborador,
  RegraDescanso,
  RestricaoIndividual,
  TurnoEscalado,
} from '../../../types';
import type { SlotDemanda } from './calendarioDemanda';

// ── Contexto: tudo que o motor precisa para rodar, já carregado ────────────
// Importante: o motor NUNCA chama o DataService diretamente. Quem monta o
// ContextoMotor (uma tela, um script, um teste) é responsável por buscar os
// dados primeiro. Isso mantém o motor testável sem rede e sem React.
export interface ContextoMotor {
  empresaId: string;
  periodoInicio: string;
  periodoFim: string;
  demanda: SlotDemanda[]; // já construído pela Etapa 1 (calendarioDemanda.ts)
  colaboradores: Colaborador[];
  perfis: PerfilDisponibilidadeColaborador[];
  disponibilidades: DisponibilidadeColaborador[];
  restricoesIndividuais: RestricaoIndividual[];
  folgasFixas: FolgaFixaEscala[];
  jornadas: JornadaTrabalho[];
  ferias: Ferias[];
  dayOffs: DayOff[];
  folgas: Folga[];
  bancoHorasMovimentos: BancoHorasMovimento[];
  regraDescanso?: RegraDescanso;
  configuracaoEscala?: ConfiguracaoEscala;
  // Turnos que já existem no período (ex: exceções aprovadas manualmente antes
  // desta rodada do motor). Usado para checar descanso/conflito contra o que
  // já está fixado. Vazio na maior parte dos casos nesta etapa.
  turnosJaEscalados: TurnoEscalado[];
}

// ── Candidatos ──────────────────────────────────────────────────────────────
export interface Candidato {
  slotId: string;
  colaboradorId: string;
}

// ── Validação de restrições (ConstraintValidator) ───────────────────────────
export interface MotivoRestricao {
  regra: string; // rótulo curto, ex: "Férias", "Disponibilidade"
  descricao: string;
  // true = elimina o candidato (hard constraint). false = apenas informativo,
  // não impede a alocação, mas fica registrado para a explicabilidade.
  bloqueante: boolean;
}

export interface ResultadoValidacao {
  slotId: string;
  colaboradorId: string;
  pode: boolean;
  motivos: MotivoRestricao[];
}

// ── Pontuação (CandidateScoreCalculator) ────────────────────────────────────
export interface ComponenteScore {
  criterio: string;
  peso: number;
  valor: number; // normalizado 0..1
  contribuicao: number; // peso * valor
}

export interface ScoreCandidato {
  slotId: string;
  colaboradorId: string;
  pontuacao: number;
  componentes: ComponenteScore[];
}

export interface PesosScoreCandidato {
  prioridadeUtilizacao: number;
  preferenciaDeHorario: number;
  disponibilidadeFlexivelCasada: number;
  equilibrioDeCarga: number;
}

// ── Conflitos (ConflictResolver) ─────────────────────────────────────────────
// Nesta etapa o motor ainda não decide quem fica com cada slot — então estes
// conflitos são "potenciais": pares de candidatos válidos que, SE ambos fossem
// escolhidos, violariam uma regra. O algoritmo de decisão (Marco 4.2) vai usar
// esta lista para não escolher combinações inválidas.
export type TipoConflito =
  | 'turnos_simultaneos'
  | 'descanso_insuficiente'
  | 'excesso_dias_consecutivos'
  | 'indisponivel_mas_valido'
  | 'ferias_mas_valido';

export interface Conflito {
  tipo: TipoConflito;
  colaboradorId: string;
  slotIds: string[];
  descricao: string;
  severidade: 'alta' | 'media' | 'baixa';
}

// ── Validação da escala (ScaleValidator) ────────────────────────────────────
export type TipoProblemaEscala =
  | 'cobertura_insuficiente'
  | 'rotina_obrigatoria_sem_candidato'
  | 'descanso_insuficiente'
  | 'excesso_dias_consecutivos';

export interface ProblemaEscala {
  tipo: TipoProblemaEscala;
  slotId?: string;
  colaboradorId?: string;
  descricao: string;
  severidade: 'alta' | 'media' | 'baixa';
}

// ── Score geral da escala (ScaleScoringService) ─────────────────────────────
export interface ComponenteScoreEscala {
  criterio: string;
  peso: number;
  valor: number; // normalizado 0..1
  contribuicao: number;
}

export interface ScoreEscala {
  pontuacaoGeral: number; // 0..100
  componentes: ComponenteScoreEscala[];
}

export interface PesosScoreEscala {
  cobertura: number;
  ausenciaDeConflitos: number;
  qualidadeMediaDosCandidatos: number;
}

// ── Estatísticas e resultado final do motor ─────────────────────────────────
export interface EstatisticasMotor {
  totalColaboradores: number;
  totalSlots: number;
  totalCandidatos: number;
  totalCandidatosValidos: number;
  totalCandidatosInvalidos: number;
  totalConflitos: number;
  totalProblemas: number;
  tempoExecucaoMs: number;
}

export interface ResultadoMotor {
  candidatos: Candidato[];
  candidatosValidos: ResultadoValidacao[];
  candidatosInvalidos: ResultadoValidacao[];
  conflitos: Conflito[];
  validacoes: ProblemaEscala[];
  scoreParcial: Record<string, ScoreCandidato[]>; // chave = slotId
  scoreEscala: ScoreEscala;
  estatisticas: EstatisticasMotor;
}

// ── Logger ───────────────────────────────────────────────────────────────────
// Injetável de propósito — em produção pode virar um logger que grava em algum
// lugar; em teste, pode virar um array pra inspecionar as mensagens.
export interface LoggerMotor {
  info(mensagem: string): void;
  aviso(mensagem: string): void;
  erro(mensagem: string): void;
}

export const consoleLoggerMotor: LoggerMotor = {
  info: (m) => console.log(`[Motor] ${m}`),
  aviso: (m) => console.warn(`[Motor] ${m}`),
  erro: (m) => console.error(`[Motor] ${m}`),
};
