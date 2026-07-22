// ── Motor Inteligente de Escala — ConstraintValidator ───────────────────────
// Responsabilidade ÚNICA: para cada par (candidato, slot), responder "pode" ou
// "não pode", com o motivo. Cada checagem olha o candidato ISOLADAMENTE contra
// aquele slot — nunca compara um candidato com outro slot dele mesmo (isso é
// trabalho do ConflictResolver, que enxerga o conjunto inteiro).
//
// Este serviço não decide nada além de pode/não pode: não pontua, não
// resolve empate, não escolhe. Cada checarX() é uma função pura e pequena,
// fácil de testar e de ajustar isoladamente.

import type {
  DisponibilidadeColaborador,
  Ferias,
  DayOff,
  Folga,
  FolgaFixaEscala,
  PerfilDisponibilidadeColaborador,
  RegraDescanso,
  RestricaoIndividual,
  TurnoEscalado,
} from '../../../types';
import type { SlotDemanda } from './calendarioDemanda';
import { diaSemanaDaData, horarioContidoEm, horariosSeSobrepoem, horasDeDescansoEntreTurnos } from './motorUtils';
import type { Candidato, ContextoMotor, LoggerMotor, MotivoRestricao, ResultadoValidacao } from './tiposMotor';
import { consoleLoggerMotor } from './tiposMotor';

function checarFerias(colaboradorId: string, data: string, ferias: Ferias[]): MotivoRestricao | null {
  const emFerias = ferias.some(
    (f) => f.colaboradorId === colaboradorId && f.status !== 'cancelada' && data >= f.dataInicio && data <= f.dataFim
  );
  if (!emFerias) return null;
  return { regra: 'Férias', descricao: 'Colaborador está de férias nesta data.', bloqueante: true };
}

function checarDayOff(colaboradorId: string, data: string, dayOffs: DayOff[]): MotivoRestricao | null {
  const usandoDayOff = dayOffs.some((d) => d.colaboradorId === colaboradorId && d.dataUtilizacao === data && d.status === 'utilizado');
  if (!usandoDayOff) return null;
  return { regra: 'Day off', descricao: 'Colaborador está de day off nesta data.', bloqueante: true };
}

function checarFolgaCompensatoria(colaboradorId: string, data: string, folgas: Folga[]): MotivoRestricao | null {
  const emFolga = folgas.some((f) => f.colaboradorId === colaboradorId && f.data === data && f.status === 'aprovada');
  if (!emFolga) return null;
  return { regra: 'Folga compensatória', descricao: 'Colaborador tem folga compensatória aprovada nesta data.', bloqueante: true };
}

function checarFolgaFixa(
  colaboradorId: string,
  data: string,
  diaSemana: number,
  folgasFixas: FolgaFixaEscala[]
): MotivoRestricao | null {
  const temFolgaFixa = folgasFixas.some(
    (f) =>
      f.colaboradorId === colaboradorId &&
      ((f.recorrente && f.diaSemana === diaSemana) || (!f.recorrente && f.dataEspecifica === data))
  );
  if (!temFolgaFixa) return null;
  return { regra: 'Folga fixa', descricao: 'Colaborador tem folga fixa cadastrada neste dia.', bloqueante: true };
}

const REGRA_DESCANSO_PADRAO_VALIDATOR: Pick<RegraDescanso, 'intervaloMinimoInterjornadaHoras'> = {
  intervaloMinimoInterjornadaHoras: 11,
};

/**
 * Turnos que já existem fora da rodada atual do motor (ex: exceções aprovadas
 * manualmente, ou turnos gerados em uma rodada anterior e já publicados) são
 * FIXOS — o motor não pode mudá-los. Por isso, mesmo um slot que passaria em
 * todas as outras checagens precisa respeitar o descanso mínimo em relação a
 * esses turnos fixos do MESMO colaborador, inclusive quando o turno fixo está
 * um pouco antes ou depois do período sendo gerado (ex: turno de sábado à
 * noite gerado no mês anterior colidindo com o domingo de manhã deste mês).
 */
function checarDescansoContraTurnosFixos(
  colaboradorId: string,
  slot: SlotDemanda,
  turnosJaEscalados: TurnoEscalado[],
  intervaloMinimoHoras: number
): MotivoRestricao | null {
  const turnosDoColaborador = turnosJaEscalados.filter((t) => t.colaboradorId === colaboradorId);

  for (const turno of turnosDoColaborador) {
    if (turno.data === slot.data && horariosSeSobrepoem(slot.horaInicio, slot.horaFim, turno.horaInicio, turno.horaFim)) {
      return { regra: 'Descanso/conflito', descricao: `Já existe um turno fixo sobreposto em ${turno.data}.`, bloqueante: true };
    }

    if (turno.data < slot.data) {
      const descanso = horasDeDescansoEntreTurnos(turno.data, turno.horaFim, slot.data, slot.horaInicio);
      if (descanso < intervaloMinimoHoras) {
        return {
          regra: 'Descanso/conflito',
          descricao: `Apenas ${descanso.toFixed(1)}h de descanso em relação ao turno fixo de ${turno.data} (mínimo: ${intervaloMinimoHoras}h).`,
          bloqueante: true,
        };
      }
    } else if (turno.data > slot.data) {
      const descanso = horasDeDescansoEntreTurnos(slot.data, slot.horaFim, turno.data, turno.horaInicio);
      if (descanso < intervaloMinimoHoras) {
        return {
          regra: 'Descanso/conflito',
          descricao: `Apenas ${descanso.toFixed(1)}h de descanso em relação ao turno fixo de ${turno.data} (mínimo: ${intervaloMinimoHoras}h).`,
          bloqueante: true,
        };
      }
    }
  }

  return null;
}

/**
 * Disponibilidade: primeiro olha as exceções pontuais em DisponibilidadeColaborador
 * para aquele dia da semana (podem ser "disponivel" ou "indisponivel", cadastradas
 * manualmente). Se não houver nenhuma exceção para o dia, cai para a jornada
 * contratual do Perfil (diasNormais + horário padrão) e, se ainda assim o dia não
 * bater, verifica se existe uma DisponibilidadeFlexivel do tipo certo
 * ('dia_extra_semana' ou 'trabalhar_domingo') que libere o dia excepcionalmente.
 */
function checarDisponibilidade(
  slot: SlotDemanda,
  diaSemana: number,
  perfil: PerfilDisponibilidadeColaborador | undefined,
  disponibilidades: DisponibilidadeColaborador[]
): MotivoRestricao | null {
  const excecoesDoColaborador = disponibilidades.filter((d) => d.diaSemana === diaSemana);

  if (excecoesDoColaborador.length > 0) {
    const indisponivelCobrindoSlot = excecoesDoColaborador.some(
      (d) => d.tipo === 'indisponivel' && horariosSeSobrepoem(slot.horaInicio, slot.horaFim, d.horaInicio, d.horaFim)
    );
    if (indisponivelCobrindoSlot) {
      return { regra: 'Disponibilidade', descricao: 'Colaborador marcou indisponibilidade pontual neste horário.', bloqueante: true };
    }
    const disponiveis = excecoesDoColaborador.filter((d) => d.tipo === 'disponivel');
    if (disponiveis.length > 0) {
      const cobreOSlot = disponiveis.some((d) => horarioContidoEm(slot.horaInicio, slot.horaFim, d.horaInicio, d.horaFim));
      if (!cobreOSlot) {
        return { regra: 'Disponibilidade', descricao: 'Horário do slot fora da disponibilidade pontual declarada.', bloqueante: true };
      }
      return null; // coberto por uma exceção explícita de disponibilidade
    }
  }

  // Sem exceção pontual para o dia — cai para a jornada contratual do perfil.
  if (!perfil) {
    return { regra: 'Disponibilidade', descricao: 'Sem Perfil de Disponibilidade cadastrado.', bloqueante: true };
  }

  const diaNaJornadaContratual = perfil.jornadaContratual.diasNormais.includes(diaSemana as never);
  if (diaNaJornadaContratual) return null;

  // Dia fora da jornada contratual — só libera se houver flexibilidade cadastrada
  // para esse tipo de exceção (domingo vs. outro dia extra da semana).
  const tipoFlexibilidadeNecessaria = diaSemana === 0 ? 'trabalhar_domingo' : 'dia_extra_semana';
  const temFlexibilidade = perfil.disponibilidadesFlexiveis.some((f) => f.tipo === tipoFlexibilidadeNecessaria);
  if (temFlexibilidade) return null;

  return {
    regra: 'Disponibilidade',
    descricao:
      diaSemana === 0
        ? 'Colaborador não tem flexibilidade cadastrada para trabalhar aos domingos.'
        : 'Dia fora da jornada contratual e sem disponibilidade flexível cadastrada para dia extra.',
    bloqueante: true,
  };
}

/**
 * Restrições individuais pontuais (tabela RestricoesIndividuais). Hoje só o
 * tipo 'nao_trabalha_domingo' tem semântica fechada o bastante para virar hard
 * constraint automaticamente. Os demais tipos ('horario_fixo', 'carga_reduzida',
 * 'outro') carregam `detalhes` em formato livre — nesta etapa, tratamos como
 * informativo (não bloqueia), até definirmos um formato estruturado para eles.
 */
function checarRestricoesIndividuais(
  colaboradorId: string,
  data: string,
  diaSemana: number,
  restricoes: RestricaoIndividual[]
): MotivoRestricao[] {
  const motivos: MotivoRestricao[] = [];
  const vigentes = restricoes.filter(
    (r) => r.colaboradorId === colaboradorId && data >= r.dataInicio && (!r.dataFim || data <= r.dataFim)
  );

  vigentes.forEach((r) => {
    if (r.tipo === 'nao_trabalha_domingo' && diaSemana === 0) {
      motivos.push({ regra: 'Restrição individual', descricao: 'Colaborador tem restrição de não trabalhar aos domingos.', bloqueante: true });
    } else if (r.tipo !== 'nao_trabalha_domingo') {
      motivos.push({
        regra: 'Restrição individual',
        descricao: `Restrição do tipo "${r.tipo}" cadastrada (avaliação detalhada ainda não automatizada nesta etapa).`,
        bloqueante: false,
      });
    }
  });

  return motivos;
}

/**
 * Restrições permanentes do Perfil de Disponibilidade. 'nao_pode_turno_noturno'
 * usa uma heurística simples (turno começando às 22h ou depois, ou terminando
 * às 06h ou antes) — suficiente para esta etapa; pode ser refinado depois com
 * uma janela noturna configurável por empresa.
 */
function checarRestricoesPermanentes(perfil: PerfilDisponibilidadeColaborador | undefined, slot: SlotDemanda): MotivoRestricao[] {
  if (!perfil) return [];
  const motivos: MotivoRestricao[] = [];

  perfil.restricoes.forEach((r) => {
    if (r.tipo === 'nao_pode_turno_noturno') {
      const inicioMin = slot.horaInicio.split(':').map(Number)[0] * 60 + Number(slot.horaInicio.split(':')[1]);
      const fimMin = slot.horaFim.split(':').map(Number)[0] * 60 + Number(slot.horaFim.split(':')[1]);
      const ehNoturno = inicioMin >= 22 * 60 || fimMin <= 6 * 60;
      if (ehNoturno) {
        motivos.push({ regra: 'Restrição permanente', descricao: 'Colaborador não pode fazer turno noturno.', bloqueante: true });
      }
    } else {
      // Demais tipos (nao_pode_abrir, nao_pode_fechar, nao_pode_trabalhar_sozinho,
      // nao_pode_levantar_carga, somente_acompanhado) dependem de contexto que o
      // ConstraintValidator não tem isoladamente (ex: quem mais está no slot).
      // Ficam registrados aqui como informativos; a checagem definitiva de
      // "sozinho"/"acompanhado" é feita depois, quando o algoritmo de decisão
      // (Marco 4.2) já souber quem mais foi alocado no mesmo slot.
      motivos.push({
        regra: 'Restrição permanente',
        descricao: `Restrição "${r.tipo}" cadastrada — avaliação depende da composição final do slot.`,
        bloqueante: false,
      });
    }
  });

  return motivos;
}

function validarCandidato(
  candidato: Candidato,
  slot: SlotDemanda,
  contexto: ContextoMotor
): ResultadoValidacao {
  const diaSemana = diaSemanaDaData(slot.data);
  const perfil = contexto.perfis.find((p) => p.colaboradorId === candidato.colaboradorId);
  const intervaloMinimoHoras =
    contexto.regraDescanso?.intervaloMinimoInterjornadaHoras ?? REGRA_DESCANSO_PADRAO_VALIDATOR.intervaloMinimoInterjornadaHoras;

  const motivos: MotivoRestricao[] = [];
  const checagensBloqueantes = [
    checarFerias(candidato.colaboradorId, slot.data, contexto.ferias),
    checarDayOff(candidato.colaboradorId, slot.data, contexto.dayOffs),
    checarFolgaCompensatoria(candidato.colaboradorId, slot.data, contexto.folgas),
    checarFolgaFixa(candidato.colaboradorId, slot.data, diaSemana, contexto.folgasFixas),
    checarDescansoContraTurnosFixos(candidato.colaboradorId, slot, contexto.turnosJaEscalados, intervaloMinimoHoras),
    checarDisponibilidade(
      slot,
      diaSemana,
      perfil,
      contexto.disponibilidades.filter((d) => d.colaboradorId === candidato.colaboradorId)
    ),
  ];

  checagensBloqueantes.forEach((motivo) => {
    if (motivo) motivos.push(motivo);
  });

  motivos.push(...checarRestricoesIndividuais(candidato.colaboradorId, slot.data, diaSemana, contexto.restricoesIndividuais));
  motivos.push(...checarRestricoesPermanentes(perfil, slot));

  const pode = !motivos.some((m) => m.bloqueante);

  return { slotId: slot.id, colaboradorId: candidato.colaboradorId, pode, motivos };
}

export function validarRestricoes(
  candidatos: Candidato[],
  contexto: ContextoMotor,
  logger: LoggerMotor = consoleLoggerMotor
): ResultadoValidacao[] {
  logger.info('Iniciando ConstraintValidator');

  const slotPorId = new Map(contexto.demanda.map((s) => [s.id, s]));
  const resultados: ResultadoValidacao[] = [];

  for (const candidato of candidatos) {
    const slot = slotPorId.get(candidato.slotId);
    if (!slot) continue; // defensivo — não deveria acontecer se o candidato veio do CandidateBuilder
    resultados.push(validarCandidato(candidato, slot, contexto));
  }

  const validos = resultados.filter((r) => r.pode).length;
  logger.info(`${validos} candidatos válidos de ${resultados.length} avaliados`);

  return resultados;
}
