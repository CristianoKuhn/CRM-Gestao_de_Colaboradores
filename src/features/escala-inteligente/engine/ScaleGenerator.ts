// ── Motor Inteligente de Escala — ScaleGenerator (Marco 4.2) ────────────────
// Responsabilidade ÚNICA: DECIDIR. Este é o único serviço do motor que tem
// permissão para escolher, entre os candidatos válidos e pontuados que o
// Marco 4.1 já preparou (CandidateBuilder → ConstraintValidator →
// CandidateScoreCalculator → ConflictResolver → ScaleValidator →
// ScaleScoringService), quem efetivamente fica com cada slot.
//
// Não recalcula nada que os serviços anteriores já calcularam — usa o
// `ResultadoMotor` (principalmente `scoreParcial`) como entrada. A única
// regra de negócio nova aqui é a ORDEM de decisão e a checagem de conflito
// contra o que o PRÓPRIO algoritmo já decidiu nesta rodada (diferente do
// ConstraintValidator, que só olha um candidato isolado contra um slot, e do
// ConflictResolver, que só aponta pares "potencialmente" conflitantes sem
// escolher nada).
//
// Estratégia: gulosa (greedy) por prioridade de slot.
//   1) Ordena os slots: obrigatórios primeiro, depois por prioridade
//      decrescente, depois cronologicamente — slots mais críticos "escolhem
//      primeiro" os melhores candidatos.
//   2) Para cada slot, percorre os candidatos já ordenados por pontuação
//      (scoreParcial) e vai aceitando até atingir quantidadeMinima, pulando
//      quem colidiria (mesmo dia sobreposto), quem ficaria com descanso
//      insuficiente, ou quem excederia o máximo de dias consecutivos —
//      sempre considerando o que JÁ foi decidido nesta rodada + os turnos
//      fixos que vieram prontos no ContextoMotor.
//   3) Ao final, roda `validarEscalaGerada` (Etapa 2 do ScaleValidator, já
//      pronta e esperando por este momento) sobre o resultado real.
//
// Isto é gulosa, não um otimizador global (não garante o ótimo absoluto) —
// decisão deliberada desta etapa: previsível, explicável linha a linha (dá
// pra contar exatamente por que um slot ficou descoberto) e rápida o
// suficiente para rodar no navegador. Uma heurística de otimização mais
// sofisticada pode substituir só o `ordenarSlotsPorPrioridade`/critério de
// aceitação depois, sem mudar o contrato de entrada/saída deste arquivo.

import type { Colaborador, JustificativaTurno, PerfilDisponibilidadeColaborador, RegraDescanso, TipoTurnoEscalado, TurnoEscalado } from '../../../types';
import type { SlotDemanda } from './calendarioDemanda';
import { diaSemanaDaData, diferencaEmDias, horariosSeSobrepoem, horasDeDescansoEntreTurnos } from './motorUtils';
import { validarEscalaGerada } from './ScaleValidator';
import type { ComponenteScore, ContextoMotor, LoggerMotor, ProblemaEscala, ResultadoMotor, ScoreCandidato } from './tiposMotor';
import { consoleLoggerMotor } from './tiposMotor';

export interface OpcoesScaleGenerator {
  logger?: LoggerMotor;
  // Id da EscalaGerada que vai "dono" destes turnos. Normalmente já existe
  // (criada pela tela antes de chamar o motor) — se não vier, os turnos saem
  // com escalaId vazio e quem persistir é responsável por preenchê-lo.
  escalaId?: string;
}

export interface EstatisticasGeracao {
  totalSlots: number;
  slotsTotalmenteCobertos: number;
  slotsParcialmenteCobertos: number;
  slotsSemCobertura: number;
  totalTurnosGerados: number;
  tempoExecucaoMs: number;
}

export interface ResultadoGeracaoEscala {
  turnos: TurnoEscalado[];
  problemas: ProblemaEscala[];
  estatisticas: EstatisticasGeracao;
}

// Formato mínimo usado só para checar colisão/descanso/consecutivos durante a
// decisão — não precisa (nem deve) carregar os outros campos de TurnoEscalado.
interface TurnoProvisorio {
  colaboradorId: string;
  data: string;
  horaInicio: string;
  horaFim: string;
}

const REGRA_DESCANSO_PADRAO: Pick<RegraDescanso, 'intervaloMinimoInterjornadaHoras' | 'maxDiasConsecutivosTrabalho'> = {
  intervaloMinimoInterjornadaHoras: 11, // mínimo CLT
  maxDiasConsecutivosTrabalho: 6,
};

const LABEL_CRITERIO: Record<string, string> = {
  prioridadeUtilizacao: 'Prioridade de utilização',
  preferenciaDeHorario: 'Preferência de horário',
  disponibilidadeFlexivelCasada: 'Disponibilidade flexível',
  equilibrioDeCarga: 'Equilíbrio de carga',
};

function descricaoDoComponente(c: ComponenteScore): string {
  const percentual = Math.round(c.valor * 100);
  switch (c.criterio) {
    case 'prioridadeUtilizacao':
      if (c.valor >= 0.75) return 'Colaborador com prioridade alta de utilização (fixo/preferencial) para este tipo de turno.';
      if (c.valor <= 0.25) return 'Colaborador com prioridade baixa de utilização (cobertura/temporário) — usado por falta de opção melhor.';
      return 'Colaborador com prioridade intermediária de utilização.';
    case 'preferenciaDeHorario':
      if (c.valor >= 1) return 'Horário do turno bate com uma preferência declarada pelo colaborador.';
      if (c.valor <= 0) return 'Horário do turno não bate com nenhuma preferência declarada pelo colaborador.';
      return 'Colaborador não declarou preferência de horário — critério neutro.';
    case 'disponibilidadeFlexivelCasada':
      if (c.valor >= 1) return 'Colaborador se ofereceu para este tipo de exceção de jornada (disponibilidade flexível cadastrada).';
      if (c.valor <= 0) return 'Turno cai fora da jornada contratual e sem disponibilidade flexível compatível cadastrada.';
      return 'Turno dentro da jornada contratual padrão do colaborador.';
    case 'equilibrioDeCarga':
      return `Carga de horas já alocada no período é ${percentual >= 70 ? 'baixa' : percentual >= 40 ? 'média' : 'alta'} frente aos demais candidatos deste turno (${percentual}% de folga relativa).`;
    default:
      return `${LABEL_CRITERIO[c.criterio] ?? c.criterio}: ${percentual}%.`;
  }
}

function montarJustificativas(score: ScoreCandidato | undefined): JustificativaTurno[] {
  if (!score) return [];
  return score.componentes.map((c) => ({
    regra: LABEL_CRITERIO[c.criterio] ?? c.criterio,
    descricao: descricaoDoComponente(c),
    atendida: c.valor >= 0.5,
  }));
}

/** Obrigatórios primeiro, depois maior prioridade, depois ordem cronológica — quem é mais crítico "escolhe" primeiro. */
function ordenarSlotsPorPrioridade(demanda: SlotDemanda[]): SlotDemanda[] {
  return [...demanda].sort((a, b) => {
    if (a.obrigatoria !== b.obrigatoria) return a.obrigatoria ? -1 : 1;
    if (a.prioridade !== b.prioridade) return b.prioridade - a.prioridade;
    return (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio);
  });
}

function colideComAlgumTurno(
  colaboradorId: string,
  data: string,
  horaInicio: string,
  horaFim: string,
  turnosDoColaborador: TurnoProvisorio[]
): boolean {
  return turnosDoColaborador.some(
    (t) => t.colaboradorId === colaboradorId && t.data === data && horariosSeSobrepoem(horaInicio, horaFim, t.horaInicio, t.horaFim)
  );
}

function respeitaDescansoMinimo(
  colaboradorId: string,
  data: string,
  horaInicio: string,
  horaFim: string,
  turnosDoColaborador: TurnoProvisorio[],
  intervaloMinimoHoras: number
): boolean {
  return turnosDoColaborador
    .filter((t) => t.colaboradorId === colaboradorId && t.data !== data)
    .every((t) => {
      const descanso =
        t.data < data
          ? horasDeDescansoEntreTurnos(t.data, t.horaFim, data, horaInicio)
          : horasDeDescansoEntreTurnos(data, horaFim, t.data, t.horaInicio);
      return descanso >= intervaloMinimoHoras;
    });
}

/** SE este dia entrar, qual passaria a ser a maior sequência de dias consecutivos do colaborador? Excede o máximo? */
function excederiaDiasConsecutivos(
  colaboradorId: string,
  data: string,
  turnosDoColaborador: TurnoProvisorio[],
  maxDiasConsecutivos: number
): boolean {
  const datas = new Set(turnosDoColaborador.filter((t) => t.colaboradorId === colaboradorId).map((t) => t.data));
  datas.add(data);
  const datasOrdenadas = Array.from(datas).sort();

  let maiorSequencia = 1;
  let sequenciaAtual = 1;
  for (let i = 1; i < datasOrdenadas.length; i++) {
    sequenciaAtual = diferencaEmDias(datasOrdenadas[i - 1], datasOrdenadas[i]) === 1 ? sequenciaAtual + 1 : 1;
    maiorSequencia = Math.max(maiorSequencia, sequenciaAtual);
  }
  return maiorSequencia > maxDiasConsecutivos;
}

/**
 * Qual cargo (dentre os habilitados do colaborador) foi efetivamente usado
 * para preencher este slot — precisa bater com o setor do slot e, se a rotina
 * restringir cargos, estar entre os permitidos. Cai para o cargo principal do
 * cadastro de Colaborador se não houver Perfil ou nenhuma competência exata
 * (ex: slot de cobertura genérica sem setor definido).
 */
function escolherCargoDoColaborador(
  perfil: PerfilDisponibilidadeColaborador | undefined,
  colaborador: Colaborador,
  slot: SlotDemanda
): string {
  if (perfil) {
    const competenciaCompativel = perfil.competencias.find(
      (c) =>
        c.habilitado &&
        (!slot.setorId || c.setorId === slot.setorId) &&
        (slot.cargosPermitidos.length === 0 || slot.cargosPermitidos.includes(c.cargoId))
    );
    if (competenciaCompativel) return competenciaCompativel.cargoId;
  }
  return colaborador.cargoId;
}

/**
 * Classificação para fins de folha (normal/domingo). 'feriado' e 'compensacao'
 * dependem de dados que o ContextoMotor ainda não carrega nesta etapa
 * (lista de FeriadoEscala e histórico de banco de horas ligado a este turno
 * específico) — ficam como próximo refinamento, não travam a geração.
 */
function classificarTipoTurno(data: string): TipoTurnoEscalado {
  return diaSemanaDaData(data) === 0 ? 'domingo' : 'normal';
}

export function gerarEscalaDefinitiva(
  contexto: ContextoMotor,
  resultadoMotor: ResultadoMotor,
  opcoes: OpcoesScaleGenerator = {}
): ResultadoGeracaoEscala {
  const logger = opcoes.logger ?? consoleLoggerMotor;
  const inicio = Date.now();

  logger.info('=== ScaleGenerator (Marco 4.2): iniciando decisão de alocação ===');

  const intervaloMinimoHoras =
    contexto.regraDescanso?.intervaloMinimoInterjornadaHoras ?? REGRA_DESCANSO_PADRAO.intervaloMinimoInterjornadaHoras;
  const maxDiasConsecutivos =
    contexto.regraDescanso?.maxDiasConsecutivosTrabalho ?? REGRA_DESCANSO_PADRAO.maxDiasConsecutivosTrabalho;

  const colaboradorPorId = new Map(contexto.colaboradores.map((c) => [c.id, c]));
  const perfilPorColaborador = new Map(contexto.perfis.map((p) => [p.colaboradorId, p]));

  // Turnos fixos (já publicados/aprovados fora desta rodada) contam para as
  // checagens de conflito, mas nunca são reescritos por este algoritmo.
  const turnosFixos: TurnoProvisorio[] = contexto.turnosJaEscalados.map((t) => ({
    colaboradorId: t.colaboradorId,
    data: t.data,
    horaInicio: t.horaInicio,
    horaFim: t.horaFim,
  }));

  const turnosDecididos: TurnoEscalado[] = [];
  const provisoriosDecididos: TurnoProvisorio[] = [];

  const slotsOrdenados = ordenarSlotsPorPrioridade(contexto.demanda);

  slotsOrdenados.forEach((slot) => {
    const candidatosDoSlot = resultadoMotor.scoreParcial[slot.id] ?? []; // já vem ordenado por pontuação desc.
    let cobertos = 0;

    for (const candidato of candidatosDoSlot) {
      if (cobertos >= slot.quantidadeMinima) break;

      const turnosParaChecagem = [...turnosFixos, ...provisoriosDecididos];

      if (colideComAlgumTurno(candidato.colaboradorId, slot.data, slot.horaInicio, slot.horaFim, turnosParaChecagem)) continue;
      if (!respeitaDescansoMinimo(candidato.colaboradorId, slot.data, slot.horaInicio, slot.horaFim, turnosParaChecagem, intervaloMinimoHoras)) continue;
      if (excederiaDiasConsecutivos(candidato.colaboradorId, slot.data, turnosParaChecagem, maxDiasConsecutivos)) continue;

      const colaborador = colaboradorPorId.get(candidato.colaboradorId);
      if (!colaborador) continue; // defensivo — não deveria acontecer se o candidato veio do CandidateBuilder
      const perfil = perfilPorColaborador.get(candidato.colaboradorId);

      const turno: TurnoEscalado = {
        id: `${slot.id}__${candidato.colaboradorId}`,
        escalaId: opcoes.escalaId ?? '',
        colaboradorId: candidato.colaboradorId,
        data: slot.data,
        horaInicio: slot.horaInicio,
        horaFim: slot.horaFim,
        setorId: slot.setorId ?? colaborador.setorId,
        cargoId: escolherCargoDoColaborador(perfil, colaborador, slot),
        tipoTurno: classificarTipoTurno(slot.data),
        origem: 'automatico',
        status: 'confirmado',
        rotinaId: slot.rotinaId,
        rotinaNome: slot.rotinaNome,
        rotinaCor: slot.rotinaCor,
        justificativas: montarJustificativas(candidato),
      };

      turnosDecididos.push(turno);
      provisoriosDecididos.push({ colaboradorId: candidato.colaboradorId, data: slot.data, horaInicio: slot.horaInicio, horaFim: slot.horaFim });
      cobertos++;
    }

    if (cobertos < slot.quantidadeMinima) {
      logger.aviso(
        `Slot "${slot.rotinaNome ?? slot.origem}" em ${slot.data} (${slot.horaInicio}-${slot.horaFim}) ficou com ${cobertos}/${slot.quantidadeMinima} — sem mais candidatos válidos disponíveis.`
      );
    }
  });

  // Validação "de verdade" sobre o resultado real — reaproveita a função que
  // já estava pronta e esperando por este momento (ver ScaleValidator.ts).
  const problemas = validarEscalaGerada(turnosDecididos, contexto, logger);

  let slotsTotalmenteCobertos = 0;
  let slotsParcialmenteCobertos = 0;
  let slotsSemCobertura = 0;
  slotsOrdenados.forEach((slot) => {
    const quantidade = turnosDecididos.filter(
      (t) => t.data === slot.data && t.horaInicio === slot.horaInicio && t.horaFim === slot.horaFim && (t.rotinaId ?? '') === (slot.rotinaId ?? '')
    ).length;
    if (quantidade === 0) slotsSemCobertura++;
    else if (quantidade < slot.quantidadeMinima) slotsParcialmenteCobertos++;
    else slotsTotalmenteCobertos++;
  });

  const estatisticas: EstatisticasGeracao = {
    totalSlots: slotsOrdenados.length,
    slotsTotalmenteCobertos,
    slotsParcialmenteCobertos,
    slotsSemCobertura,
    totalTurnosGerados: turnosDecididos.length,
    tempoExecucaoMs: Date.now() - inicio,
  };

  logger.info(
    `=== ScaleGenerator: ${turnosDecididos.length} turno(s) decidido(s) (${slotsTotalmenteCobertos}/${slotsOrdenados.length} slots totalmente cobertos) em ${estatisticas.tempoExecucaoMs}ms ===`
  );

  return { turnos: turnosDecididos, problemas, estatisticas };
}
