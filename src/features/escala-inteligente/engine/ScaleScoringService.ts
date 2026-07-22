// ── Motor Inteligente de Escala — ScaleScoringService ───────────────────────
// Responsabilidade ÚNICA: resumir a "qualidade geral" do que o motor encontrou
// num único número (0..100) + a composição desse número. Não corrige nada,
// não decide nada — é só uma fotografia de saúde do resultado parcial.
//
// Pesos abaixo são provisórios (pedido explícito desta etapa: estrutura, não
// pesos finais).

import type { ProblemaEscala, ScoreCandidato } from './tiposMotor';
import type { ComponenteScoreEscala, Conflito, LoggerMotor, PesosScoreEscala, ResultadoValidacao, ScoreEscala } from './tiposMotor';
import { consoleLoggerMotor } from './tiposMotor';
import type { SlotDemanda } from './calendarioDemanda';

export const PESOS_PADRAO_SCORE_ESCALA: PesosScoreEscala = {
  cobertura: 0.5,
  ausenciaDeConflitos: 0.3,
  qualidadeMediaDosCandidatos: 0.2,
};

interface EntradaScoreEscala {
  demanda: SlotDemanda[];
  candidatosValidos: ResultadoValidacao[];
  conflitos: Conflito[];
  validacoes: ProblemaEscala[];
  scoreParcial: Record<string, ScoreCandidato[]>;
}

function calcularValorCobertura(entrada: EntradaScoreEscala): number {
  if (entrada.demanda.length === 0) return 1;
  const problemasDeCobertura = entrada.validacoes.filter(
    (p) => p.tipo === 'cobertura_insuficiente' || p.tipo === 'rotina_obrigatoria_sem_candidato'
  ).length;
  return Math.max(0, 1 - problemasDeCobertura / entrada.demanda.length);
}

function calcularValorAusenciaDeConflitos(entrada: EntradaScoreEscala): number {
  if (entrada.candidatosValidos.length === 0) return 1;
  // Normaliza pelo número de candidatos válidos — uma escala grande naturalmente
  // tem mais oportunidades de conflito do que uma pequena.
  return Math.max(0, 1 - entrada.conflitos.length / entrada.candidatosValidos.length);
}

function calcularValorQualidadeMediaDosCandidatos(entrada: EntradaScoreEscala): number {
  const todasAsPontuacoes = Object.values(entrada.scoreParcial).flat().map((s) => s.pontuacao);
  if (todasAsPontuacoes.length === 0) return 0;
  const media = todasAsPontuacoes.reduce((total, p) => total + p, 0) / todasAsPontuacoes.length;
  return media; // já normalizado 0..1, pois cada ScoreCandidato.pontuacao é soma de contribuições 0..1 ponderadas
}

export function calcularScoreEscala(
  entrada: EntradaScoreEscala,
  pesos: PesosScoreEscala = PESOS_PADRAO_SCORE_ESCALA,
  logger: LoggerMotor = consoleLoggerMotor
): ScoreEscala {
  logger.info('Iniciando ScaleScoringService');

  const componentes: ComponenteScoreEscala[] = [
    { criterio: 'cobertura', peso: pesos.cobertura, valor: calcularValorCobertura(entrada), contribuicao: 0 },
    { criterio: 'ausenciaDeConflitos', peso: pesos.ausenciaDeConflitos, valor: calcularValorAusenciaDeConflitos(entrada), contribuicao: 0 },
    {
      criterio: 'qualidadeMediaDosCandidatos',
      peso: pesos.qualidadeMediaDosCandidatos,
      valor: calcularValorQualidadeMediaDosCandidatos(entrada),
      contribuicao: 0,
    },
  ];

  componentes.forEach((c) => {
    c.contribuicao = c.peso * c.valor;
  });

  const pontuacaoGeral = componentes.reduce((total, c) => total + c.contribuicao, 0) * 100;

  logger.info(`Score geral da escala: ${pontuacaoGeral.toFixed(1)}/100`);

  return { pontuacaoGeral, componentes };
}
