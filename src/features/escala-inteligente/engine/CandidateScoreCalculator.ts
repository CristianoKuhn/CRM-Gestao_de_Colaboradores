// ── Motor Inteligente de Escala — CandidateScoreCalculator ──────────────────
// Responsabilidade ÚNICA: dado um candidato já validado (ConstraintValidator
// disse que ele PODE), calcular uma pontuação de "o quanto ele é uma boa
// escolha" para aquele slot. Não decide nada — só pontua. Quem decide, com
// base nesta pontuação + nos conflitos detectados, é o algoritmo do Marco 4.2.
//
// Os pesos abaixo são um ponto de partida deliberadamente simples — o pedido
// desta etapa é a ESTRUTURA de pontuação, não os pesos definitivos.

import type { PerfilDisponibilidadeColaborador } from '../../../types';
import type { SlotDemanda } from './calendarioDemanda';
import { diaSemanaDaData, horaParaMinutos } from './motorUtils';
import type {
  ComponenteScore,
  ContextoMotor,
  LoggerMotor,
  PesosScoreCandidato,
  ResultadoValidacao,
  ScoreCandidato,
} from './tiposMotor';
import { consoleLoggerMotor } from './tiposMotor';

export const PESOS_PADRAO_SCORE_CANDIDATO: PesosScoreCandidato = {
  prioridadeUtilizacao: 0.35,
  preferenciaDeHorario: 0.25,
  disponibilidadeFlexivelCasada: 0.2,
  equilibrioDeCarga: 0.2,
};

const VALOR_PRIORIDADE_UTILIZACAO: Record<string, number> = {
  fixo: 1,
  preferencial: 0.75,
  flexivel: 0.5,
  cobertura: 0.25,
  temporario: 0.1,
};

function calcularValorPrioridadeUtilizacao(perfil: PerfilDisponibilidadeColaborador | undefined): number {
  if (!perfil) return 0;
  return VALOR_PRIORIDADE_UTILIZACAO[perfil.prioridadeUtilizacao] ?? 0.5;
}

/** 1 se alguma preferência declarada bate com o turno do dia (manhã/tarde/noite/domingo/sábado), senão 0. */
function calcularValorPreferenciaDeHorario(perfil: PerfilDisponibilidadeColaborador | undefined, slot: SlotDemanda): number {
  if (!perfil || perfil.preferencias.length === 0) return 0.5; // neutro — sem preferência declarada não é nem bom nem ruim
  const inicioMin = horaParaMinutos(slot.horaInicio);
  const diaSemana = diaSemanaDaData(slot.data);

  const bateComAlgumaPreferencia = perfil.preferencias.some((p) => {
    if (p.tipo === 'prefere_manha') return inicioMin < 12 * 60;
    if (p.tipo === 'prefere_tarde') return inicioMin >= 12 * 60 && inicioMin < 18 * 60;
    if (p.tipo === 'prefere_noite') return inicioMin >= 18 * 60;
    if (p.tipo === 'prefere_folgar_domingo') return diaSemana !== 0; // slot fora de domingo respeita a preferência
    if (p.tipo === 'prefere_trabalhar_sabado') return diaSemana === 6;
    return false;
  });

  return bateComAlgumaPreferencia ? 1 : 0;
}

/**
 * Se o slot cai num dia fora da jornada contratual (ex: domingo) e o
 * colaborador tem justamente a disponibilidade flexível que libera esse dia,
 * isso é um sinal positivo de bom encaixe (ele SE OFERECEU pra esse tipo de
 * exceção) — pontua mais alto do que simplesmente "está disponível por obrigação".
 */
function calcularValorDisponibilidadeFlexivelCasada(perfil: PerfilDisponibilidadeColaborador | undefined, slot: SlotDemanda): number {
  if (!perfil) return 0;
  const diaSemana = diaSemanaDaData(slot.data);
  const diaForaDaJornada = !perfil.jornadaContratual.diasNormais.includes(diaSemana as never);
  if (!diaForaDaJornada) return 0.5; // dentro do padrão contratual — neutro, não é "extra"

  const tipoEsperado = diaSemana === 0 ? 'trabalhar_domingo' : 'dia_extra_semana';
  const temFlexibilidadeCasada = perfil.disponibilidadesFlexiveis.some((f) => f.tipo === tipoEsperado);
  return temFlexibilidadeCasada ? 1 : 0;
}

/**
 * Equilíbrio de carga: quanto MENOS horas o colaborador já tiver alocadas no
 * período (via turnosJaEscalados), maior o valor — favorece distribuir a
 * carga entre a equipe em vez de sempre escalar os mesmos. Normalizado contra
 * o maior total de horas já alocado entre os candidatos do mesmo slot (feito
 * pelo chamador, ver calcularScores).
 */
function horasJaAlocadasNoPeriodo(colaboradorId: string, contexto: ContextoMotor): number {
  return contexto.turnosJaEscalados
    .filter((t) => t.colaboradorId === colaboradorId)
    .reduce((total, t) => total + (horaParaMinutos(t.horaFim) - horaParaMinutos(t.horaInicio)) / 60, 0);
}

function calcularScoreDeUmCandidato(
  validacao: ResultadoValidacao,
  slot: SlotDemanda,
  contexto: ContextoMotor,
  pesos: PesosScoreCandidato,
  maiorCargaDoSlot: number
): ScoreCandidato {
  const perfil = contexto.perfis.find((p) => p.colaboradorId === validacao.colaboradorId);

  const cargaAtual = horasJaAlocadasNoPeriodo(validacao.colaboradorId, contexto);
  const valorEquilibrioDeCarga = maiorCargaDoSlot === 0 ? 1 : 1 - cargaAtual / maiorCargaDoSlot;

  const componentes: ComponenteScore[] = [
    {
      criterio: 'prioridadeUtilizacao',
      peso: pesos.prioridadeUtilizacao,
      valor: calcularValorPrioridadeUtilizacao(perfil),
      contribuicao: 0,
    },
    {
      criterio: 'preferenciaDeHorario',
      peso: pesos.preferenciaDeHorario,
      valor: calcularValorPreferenciaDeHorario(perfil, slot),
      contribuicao: 0,
    },
    {
      criterio: 'disponibilidadeFlexivelCasada',
      peso: pesos.disponibilidadeFlexivelCasada,
      valor: calcularValorDisponibilidadeFlexivelCasada(perfil, slot),
      contribuicao: 0,
    },
    {
      criterio: 'equilibrioDeCarga',
      peso: pesos.equilibrioDeCarga,
      valor: valorEquilibrioDeCarga,
      contribuicao: 0,
    },
  ];

  componentes.forEach((c) => {
    c.contribuicao = c.peso * c.valor;
  });

  const pontuacao = componentes.reduce((total, c) => total + c.contribuicao, 0);

  return { slotId: slot.id, colaboradorId: validacao.colaboradorId, pontuacao, componentes };
}

export function calcularScores(
  candidatosValidos: ResultadoValidacao[],
  contexto: ContextoMotor,
  pesos: PesosScoreCandidato = PESOS_PADRAO_SCORE_CANDIDATO,
  logger: LoggerMotor = consoleLoggerMotor
): Record<string, ScoreCandidato[]> {
  logger.info('Iniciando CandidateScoreCalculator');

  const slotPorId = new Map(contexto.demanda.map((s) => [s.id, s]));
  const validosPorSlot = new Map<string, ResultadoValidacao[]>();
  candidatosValidos.forEach((v) => {
    const lista = validosPorSlot.get(v.slotId) ?? [];
    lista.push(v);
    validosPorSlot.set(v.slotId, lista);
  });

  const resultado: Record<string, ScoreCandidato[]> = {};

  validosPorSlot.forEach((validacoes, slotId) => {
    const slot = slotPorId.get(slotId);
    if (!slot) return;

    const cargas = validacoes.map((v) => horasJaAlocadasNoPeriodo(v.colaboradorId, contexto));
    const maiorCargaDoSlot = Math.max(0, ...cargas);

    resultado[slotId] = validacoes
      .map((v) => calcularScoreDeUmCandidato(v, slot, contexto, pesos, maiorCargaDoSlot))
      .sort((a, b) => b.pontuacao - a.pontuacao);
  });

  logger.info(`Score calculado para ${candidatosValidos.length} candidatos válidos em ${validosPorSlot.size} slots`);

  return resultado;
}
