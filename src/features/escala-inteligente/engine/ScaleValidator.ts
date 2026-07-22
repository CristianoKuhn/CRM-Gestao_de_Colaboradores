// ── Motor Inteligente de Escala — ScaleValidator ────────────────────────────
// Responsabilidade ÚNICA: apontar problemas — nunca corrigir, nunca gerar
// relatório formatado. Só a lista estruturada de ProblemaEscala.
//
// Nesta etapa ainda não existe uma escala gerada (o motor não decide quem
// fica com cada slot). Por isso este serviço expõe DUAS funções:
//
//  1) validarCoberturaProjetada — usável JÁ AGORA: confere, para cada slot,
//     se existem candidatos válidos suficientes para, em tese, cobri-lo.
//     Não garante que a cobertura vai se realizar (isso depende do algoritmo
//     de decisão), mas já avisa o gestor se uma rotina obrigatória está sem
//     absolutamente nenhum candidato válido — sinal de alerta útil mesmo
//     antes de gerar a escala.
//
//  2) validarEscalaGerada — a validação "de verdade" de uma escala pronta
//     (lista de TurnoEscalado). Implementada agora, pronta para o Marco 4.2
//     chamar assim que o algoritmo de decisão passar a produzir turnos —
//     mas não é usada em lugar nenhum nesta etapa.

import type { RegraDescanso, TurnoEscalado } from '../../../types';
import type { SlotDemanda } from './calendarioDemanda';
import { diferencaEmDias, horasDeDescansoEntreTurnos } from './motorUtils';
import type { ContextoMotor, LoggerMotor, ProblemaEscala, ResultadoValidacao } from './tiposMotor';
import { consoleLoggerMotor } from './tiposMotor';

export function validarCoberturaProjetada(
  demanda: SlotDemanda[],
  candidatosValidos: ResultadoValidacao[],
  logger: LoggerMotor = consoleLoggerMotor
): ProblemaEscala[] {
  logger.info('Iniciando ScaleValidator (cobertura projetada)');

  const validosPorSlot = new Map<string, number>();
  candidatosValidos.forEach((v) => {
    validosPorSlot.set(v.slotId, (validosPorSlot.get(v.slotId) ?? 0) + 1);
  });

  const problemas: ProblemaEscala[] = [];

  demanda.forEach((slot) => {
    const disponiveis = validosPorSlot.get(slot.id) ?? 0;

    if (disponiveis === 0 && slot.obrigatoria) {
      problemas.push({
        tipo: 'rotina_obrigatoria_sem_candidato',
        slotId: slot.id,
        descricao: `Slot obrigatório "${slot.rotinaNome ?? slot.origem}" em ${slot.data} (${slot.horaInicio}-${slot.horaFim}) não tem nenhum candidato válido.`,
        severidade: 'alta',
      });
    } else if (disponiveis < slot.quantidadeMinima) {
      problemas.push({
        tipo: 'cobertura_insuficiente',
        slotId: slot.id,
        descricao: `Slot "${slot.rotinaNome ?? slot.origem}" em ${slot.data} (${slot.horaInicio}-${slot.horaFim}) precisa de ${slot.quantidadeMinima} e só tem ${disponiveis} candidato(s) válido(s).`,
        severidade: slot.obrigatoria ? 'alta' : 'media',
      });
    }
  });

  logger.info(`${problemas.length} problema(s) de cobertura projetada encontrado(s)`);
  return problemas;
}

const REGRA_DESCANSO_PADRAO: Pick<RegraDescanso, 'intervaloMinimoInterjornadaHoras' | 'maxDiasConsecutivosTrabalho'> = {
  intervaloMinimoInterjornadaHoras: 11,
  maxDiasConsecutivosTrabalho: 6,
};

/**
 * Validação de uma escala JÁ GERADA (turnos com colaborador definido). Não é
 * chamada em lugar nenhum nesta etapa — fica pronta para o Marco 4.2, que vai
 * produzir `TurnoEscalado[]` e poder chamar esta função diretamente.
 */
export function validarEscalaGerada(
  turnos: TurnoEscalado[],
  contexto: ContextoMotor,
  logger: LoggerMotor = consoleLoggerMotor
): ProblemaEscala[] {
  logger.info('Iniciando ScaleValidator (escala gerada)');

  const regraDescanso = contexto.regraDescanso ?? { ...REGRA_DESCANSO_PADRAO, id: '', empresaId: contexto.empresaId };
  const problemas: ProblemaEscala[] = [];

  // Cobertura real: quantos turnos confirmados existem por slot de demanda,
  // comparado ao mínimo exigido.
  const turnosPorSlotAproximado = new Map<string, number>();
  contexto.demanda.forEach((slot) => {
    const quantidade = turnos.filter(
      (t) => t.data === slot.data && t.horaInicio === slot.horaInicio && t.horaFim === slot.horaFim && (t.rotinaId ?? '') === (slot.rotinaId ?? '')
    ).length;
    turnosPorSlotAproximado.set(slot.id, quantidade);

    if (quantidade < slot.quantidadeMinima) {
      problemas.push({
        tipo: 'cobertura_insuficiente',
        slotId: slot.id,
        descricao: `Slot "${slot.rotinaNome ?? slot.origem}" em ${slot.data} ficou com ${quantidade} turno(s), mínimo exigido é ${slot.quantidadeMinima}.`,
        severidade: slot.obrigatoria ? 'alta' : 'media',
      });
    }
  });

  // Descanso e dias consecutivos, por colaborador, sobre os turnos reais.
  const turnosPorColaborador = new Map<string, TurnoEscalado[]>();
  turnos.forEach((t) => {
    const lista = turnosPorColaborador.get(t.colaboradorId) ?? [];
    lista.push(t);
    turnosPorColaborador.set(t.colaboradorId, lista);
  });

  turnosPorColaborador.forEach((turnosDoColaborador, colaboradorId) => {
    const ordenados = [...turnosDoColaborador].sort((a, b) => (a.data + a.horaInicio).localeCompare(b.data + b.horaInicio));

    for (let i = 0; i < ordenados.length - 1; i++) {
      const atual = ordenados[i];
      const proximo = ordenados[i + 1];
      if (atual.data === proximo.data) continue;

      const descanso = horasDeDescansoEntreTurnos(atual.data, atual.horaFim, proximo.data, proximo.horaInicio);
      if (descanso < regraDescanso.intervaloMinimoInterjornadaHoras) {
        problemas.push({
          tipo: 'descanso_insuficiente',
          colaboradorId,
          descricao: `Apenas ${descanso.toFixed(1)}h de descanso entre os turnos de ${atual.data} e ${proximo.data}.`,
          severidade: 'alta',
        });
      }
    }

    const datasUnicas = Array.from(new Set(turnosDoColaborador.map((t) => t.data))).sort();
    let tamanhoSequencia = 1;
    for (let i = 1; i < datasUnicas.length; i++) {
      tamanhoSequencia = diferencaEmDias(datasUnicas[i - 1], datasUnicas[i]) === 1 ? tamanhoSequencia + 1 : 1;
      if (tamanhoSequencia > regraDescanso.maxDiasConsecutivosTrabalho) {
        problemas.push({
          tipo: 'excesso_dias_consecutivos',
          colaboradorId,
          descricao: `${tamanhoSequencia} dias consecutivos trabalhados até ${datasUnicas[i]} (máximo: ${regraDescanso.maxDiasConsecutivosTrabalho}).`,
          severidade: 'media',
        });
      }
    }
  });

  logger.info(`${problemas.length} problema(s) encontrado(s) na escala gerada`);
  return problemas;
}
