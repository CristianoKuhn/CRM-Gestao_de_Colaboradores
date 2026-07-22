// ── Motor Inteligente de Escala — ConflictResolver ──────────────────────────
// Responsabilidade ÚNICA: DETECTAR conflitos — nunca resolver. "Resolver"
// (escolher qual dos dois slots o colaborador realmente vai ocupar) é trabalho
// do algoritmo de decisão do Marco 4.2, que vai USAR esta lista de conflitos
// para não montar combinações inválidas.
//
// Diferença para o ConstraintValidator: aquele avalia um candidato ISOLADO
// contra UM slot. Este aqui olha o CONJUNTO de candidatos válidos e compara
// pares de slots em que o MESMO colaborador aparece como válido — é uma
// checagem cruzada, não individual.

import type { RegraDescanso } from '../../../types';
import { diferencaEmDias, horariosSeSobrepoem, horasDeDescansoEntreTurnos } from './motorUtils';
import type { Conflito, ContextoMotor, LoggerMotor, ResultadoValidacao } from './tiposMotor';
import { consoleLoggerMotor } from './tiposMotor';
import type { SlotDemanda } from './calendarioDemanda';

const REGRA_DESCANSO_PADRAO: Pick<RegraDescanso, 'intervaloMinimoInterjornadaHoras' | 'maxDiasConsecutivosTrabalho'> = {
  intervaloMinimoInterjornadaHoras: 11, // mínimo CLT
  maxDiasConsecutivosTrabalho: 6,
};

function detectarTurnosSimultaneos(
  colaboradorId: string,
  slotsDoColaborador: SlotDemanda[]
): Conflito[] {
  const conflitos: Conflito[] = [];
  for (let i = 0; i < slotsDoColaborador.length; i++) {
    for (let j = i + 1; j < slotsDoColaborador.length; j++) {
      const a = slotsDoColaborador[i];
      const b = slotsDoColaborador[j];
      if (a.data === b.data && horariosSeSobrepoem(a.horaInicio, a.horaFim, b.horaInicio, b.horaFim)) {
        conflitos.push({
          tipo: 'turnos_simultaneos',
          colaboradorId,
          slotIds: [a.id, b.id],
          descricao: `Colaborador é candidato válido para dois slots que se sobrepõem no mesmo dia (${a.data}).`,
          severidade: 'alta',
        });
      }
    }
  }
  return conflitos;
}

function detectarDescansoInsuficiente(
  colaboradorId: string,
  slotsDoColaborador: SlotDemanda[],
  intervaloMinimoHoras: number
): Conflito[] {
  const conflitos: Conflito[] = [];
  const ordenados = [...slotsDoColaborador].sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio));

  for (let i = 0; i < ordenados.length - 1; i++) {
    const atual = ordenados[i];
    const proximo = ordenados[i + 1];
    if (atual.data === proximo.data) continue; // sobreposição no mesmo dia já é 'turnos_simultaneos'

    const descanso = horasDeDescansoEntreTurnos(atual.data, atual.horaFim, proximo.data, proximo.horaInicio);
    if (descanso < intervaloMinimoHoras) {
      conflitos.push({
        tipo: 'descanso_insuficiente',
        colaboradorId,
        slotIds: [atual.id, proximo.id],
        descricao: `Apenas ${descanso.toFixed(1)}h de descanso entre ${atual.data} e ${proximo.data} (mínimo exigido: ${intervaloMinimoHoras}h).`,
        severidade: 'alta',
      });
    }
  }
  return conflitos;
}

function detectarExcessoDeDiasConsecutivos(
  colaboradorId: string,
  slotsDoColaborador: SlotDemanda[],
  maxDiasConsecutivos: number
): Conflito[] {
  const datasUnicas = Array.from(new Set(slotsDoColaborador.map((s) => s.data))).sort();
  if (datasUnicas.length === 0) return [];

  let inicioSequencia = datasUnicas[0];
  let tamanhoSequencia = 1;
  const conflitos: Conflito[] = [];

  for (let i = 1; i < datasUnicas.length; i++) {
    const consecutivo = diferencaEmDias(datasUnicas[i - 1], datasUnicas[i]) === 1;
    if (consecutivo) {
      tamanhoSequencia++;
    } else {
      tamanhoSequencia = 1;
      inicioSequencia = datasUnicas[i];
    }

    if (tamanhoSequencia > maxDiasConsecutivos) {
      const slotsEnvolvidos = slotsDoColaborador
        .filter((s) => s.data >= inicioSequencia && s.data <= datasUnicas[i])
        .map((s) => s.id);
      conflitos.push({
        tipo: 'excesso_dias_consecutivos',
        colaboradorId,
        slotIds: slotsEnvolvidos,
        descricao: `Sequência de ${tamanhoSequencia} dias consecutivos como candidato válido (máximo permitido: ${maxDiasConsecutivos}), de ${inicioSequencia} a ${datasUnicas[i]}.`,
        severidade: 'media',
      });
    }
  }
  return conflitos;
}

/**
 * Rede de segurança: o ConstraintValidator já deveria ter eliminado candidatos
 * de férias/indisponíveis. Esta checagem é defensiva — cruza candidatosValidos
 * novamente contra férias/day off, para pegar qualquer inconsistência (ex: dado
 * cadastrado/alterado entre as duas etapas, ou uma regra nova ainda não coberta
 * pelo ConstraintValidator).
 */
function detectarInconsistenciasDeFeriasEDisponibilidade(
  candidatosValidos: ResultadoValidacao[],
  contexto: ContextoMotor
): Conflito[] {
  const slotPorId = new Map(contexto.demanda.map((s) => [s.id, s]));
  const conflitos: Conflito[] = [];

  candidatosValidos.forEach((v) => {
    const slot = slotPorId.get(v.slotId);
    if (!slot) return;

    const emFerias = contexto.ferias.some(
      (f) => f.colaboradorId === v.colaboradorId && f.status !== 'cancelada' && slot.data >= f.dataInicio && slot.data <= f.dataFim
    );
    if (emFerias) {
      conflitos.push({
        tipo: 'ferias_mas_valido',
        colaboradorId: v.colaboradorId,
        slotIds: [slot.id],
        descricao: 'Candidato consta como válido mas está de férias nesta data — inconsistência a investigar.',
        severidade: 'alta',
      });
    }
  });

  return conflitos;
}

export function detectarConflitos(
  candidatosValidos: ResultadoValidacao[],
  contexto: ContextoMotor,
  logger: LoggerMotor = consoleLoggerMotor
): Conflito[] {
  logger.info('Iniciando ConflictResolver');

  const regraDescanso = contexto.regraDescanso ?? { ...REGRA_DESCANSO_PADRAO, id: '', empresaId: contexto.empresaId };
  const slotPorId = new Map(contexto.demanda.map((s) => [s.id, s]));

  const slotsPorColaborador = new Map<string, SlotDemanda[]>();
  candidatosValidos.forEach((v) => {
    const slot = slotPorId.get(v.slotId);
    if (!slot) return;
    const lista = slotsPorColaborador.get(v.colaboradorId) ?? [];
    lista.push(slot);
    slotsPorColaborador.set(v.colaboradorId, lista);
  });

  const conflitos: Conflito[] = [];
  slotsPorColaborador.forEach((slots, colaboradorId) => {
    conflitos.push(...detectarTurnosSimultaneos(colaboradorId, slots));
    conflitos.push(...detectarDescansoInsuficiente(colaboradorId, slots, regraDescanso.intervaloMinimoInterjornadaHoras));
    conflitos.push(...detectarExcessoDeDiasConsecutivos(colaboradorId, slots, regraDescanso.maxDiasConsecutivosTrabalho));
  });

  conflitos.push(...detectarInconsistenciasDeFeriasEDisponibilidade(candidatosValidos, contexto));

  logger.info(`${conflitos.length} conflitos potenciais encontrados`);
  return conflitos;
}
