// ── Motor Inteligente de Escala — ScheduleEngine ────────────────────────────
// Responsabilidade ÚNICA: orquestrar. Este arquivo NÃO deve conter nenhuma
// regra de negócio — só chama os outros serviços na ordem certa e monta o
// objeto de retorno. Se você está pensando em adicionar um `if` com uma regra
// de escala aqui, é sinal de que ele pertence a outro serviço.
//
// Pipeline (Marco 4.1):
//   Carregar dados (feito por quem monta o ContextoMotor, fora daqui)
//     -> CandidateBuilder
//     -> ConstraintValidator
//     -> CandidateScoreCalculator
//     -> ConflictResolver
//     -> ScaleValidator (cobertura projetada)
//     -> ScaleScoringService
//     -> retorna ResultadoMotor estruturado
//
// Ainda NÃO gera a escala definitiva, não persiste nada, não toca em UI.

import { construirCandidatos } from './CandidateBuilder';
import { validarRestricoes } from './ConstraintValidator';
import { calcularScores, PESOS_PADRAO_SCORE_CANDIDATO } from './CandidateScoreCalculator';
import { detectarConflitos } from './ConflictResolver';
import { validarCoberturaProjetada } from './ScaleValidator';
import { calcularScoreEscala, PESOS_PADRAO_SCORE_ESCALA } from './ScaleScoringService';
import type {
  ContextoMotor,
  EstatisticasMotor,
  LoggerMotor,
  PesosScoreCandidato,
  PesosScoreEscala,
  ResultadoMotor,
} from './tiposMotor';
import { consoleLoggerMotor } from './tiposMotor';

export interface OpcoesScheduleEngine {
  logger?: LoggerMotor;
  pesosScoreCandidato?: PesosScoreCandidato;
  pesosScoreEscala?: PesosScoreEscala;
}

export function executarScheduleEngine(contexto: ContextoMotor, opcoes: OpcoesScheduleEngine = {}): ResultadoMotor {
  const logger = opcoes.logger ?? consoleLoggerMotor;
  const inicio = Date.now();

  logger.info('=== ScheduleEngine: iniciando pipeline do Motor Inteligente ===');

  const candidatos = construirCandidatos(contexto, logger);
  const validacoesCandidatos = validarRestricoes(candidatos, contexto, logger);
  const candidatosValidos = validacoesCandidatos.filter((v) => v.pode);
  const candidatosInvalidos = validacoesCandidatos.filter((v) => !v.pode);

  const scoreParcial = calcularScores(candidatosValidos, contexto, opcoes.pesosScoreCandidato ?? PESOS_PADRAO_SCORE_CANDIDATO, logger);

  const conflitos = detectarConflitos(candidatosValidos, contexto, logger);

  const validacoes = validarCoberturaProjetada(contexto.demanda, candidatosValidos, logger);

  const scoreEscala = calcularScoreEscala(
    { demanda: contexto.demanda, candidatosValidos, conflitos, validacoes, scoreParcial },
    opcoes.pesosScoreEscala ?? PESOS_PADRAO_SCORE_ESCALA,
    logger
  );

  const estatisticas: EstatisticasMotor = {
    totalColaboradores: contexto.colaboradores.length,
    totalSlots: contexto.demanda.length,
    totalCandidatos: candidatos.length,
    totalCandidatosValidos: candidatosValidos.length,
    totalCandidatosInvalidos: candidatosInvalidos.length,
    totalConflitos: conflitos.length,
    totalProblemas: validacoes.length,
    tempoExecucaoMs: Date.now() - inicio,
  };

  logger.info(`=== ScheduleEngine: pipeline concluído em ${estatisticas.tempoExecucaoMs}ms ===`);

  return {
    candidatos,
    candidatosValidos,
    candidatosInvalidos,
    conflitos,
    validacoes,
    scoreParcial,
    scoreEscala,
    estatisticas,
  };
}
