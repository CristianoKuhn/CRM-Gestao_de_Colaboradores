// ── Motor Inteligente de Escala — CandidateBuilder ──────────────────────────
// Responsabilidade ÚNICA: para cada slot de demanda, listar quais colaboradores
// PODEM em tese participar (têm competência habilitada para o setor/cargo do
// slot e estão numa situação de trabalho ativa). Não avalia disponibilidade,
// férias, restrições, nem calcula pontuação — isso é trabalho de outros
// serviços. Este é intencionalmente o filtro mais "grosso" do pipeline.

import type { Colaborador, PerfilDisponibilidadeColaborador } from '../../../types';
import type { SlotDemanda } from './calendarioDemanda';
import type { Candidato, ContextoMotor, LoggerMotor } from './tiposMotor';
import { consoleLoggerMotor } from './tiposMotor';

const SITUACOES_ELEGIVEIS = new Set(['Ativo', 'Em Acompanhamento']);

function colaboradorElegivelPorSituacao(colaborador: Colaborador): boolean {
  return SITUACOES_ELEGIVEIS.has(colaborador.situacao);
}

/**
 * Sem Perfil de Disponibilidade cadastrado, o colaborador NÃO entra como
 * candidato — é uma escolha de design deliberada: forçar o cadastro do perfil
 * antes de o motor considerar alguém, em vez de assumir competência por
 * omissão (o que poderia escalar alguém sem habilitação declarada).
 */
function perfilHabilitaSlot(
  perfil: PerfilDisponibilidadeColaborador | undefined,
  slot: SlotDemanda
): boolean {
  if (!perfil) return false;
  // Slot sem setor definido (ex: regra de cobertura genérica antiga sem
  // segmentação por setor) — não há como checar competência, então libera.
  if (!slot.setorId) return true;
  return perfil.competencias.some(
    (c) =>
      c.habilitado &&
      c.setorId === slot.setorId &&
      (slot.cargosPermitidos.length === 0 || slot.cargosPermitidos.includes(c.cargoId))
  );
}

export function construirCandidatos(
  contexto: ContextoMotor,
  logger: LoggerMotor = consoleLoggerMotor
): Candidato[] {
  logger.info('Iniciando CandidateBuilder');

  const colaboradoresElegiveis = contexto.colaboradores.filter(colaboradorElegivelPorSituacao);
  logger.info(`${colaboradoresElegiveis.length} colaboradores carregados`);

  const perfilPorColaborador = new Map(contexto.perfis.map((p) => [p.colaboradorId, p]));

  const candidatos: Candidato[] = [];
  for (const slot of contexto.demanda) {
    for (const colaborador of colaboradoresElegiveis) {
      const perfil = perfilPorColaborador.get(colaborador.id);
      if (perfilHabilitaSlot(perfil, slot)) {
        candidatos.push({ slotId: slot.id, colaboradorId: colaborador.id });
      }
    }
  }

  logger.info(`${candidatos.length} candidatos iniciais montados (por competência/habilitação)`);
  return candidatos;
}
