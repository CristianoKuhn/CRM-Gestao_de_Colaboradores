// ── Motor de Disponibilidade Operacional — Geração de Períodos Aquisitivos ──
// Primeira peça do Motor de Férias (primeira implementação do Motor de
// Disponibilidade Operacional). Responsabilidade ÚNICA: a partir da data de
// admissão de um colaborador, decidir quais períodos aquisitivos DEVERIAM
// existir até hoje, e devolver só os que ainda FALTAM criar.
//
// Resolve diretamente a causa raiz do bug diagnosticado: o id de cada período
// agora é determinístico e sempre prefixado pelo colaborador
// (`periodo-<colaboradorId>-<anoBase>`), então dois colaboradores admitidos
// no mesmo ano nunca mais colidem no upsert do backend.
//
// Idempotente por design: chamar de novo depois que alguns períodos já
// existem não duplica nem sobrescreve nada — só completa o que falta (útil
// tanto no dia a dia quanto na migração de histórico da Fase 4, onde
// colaboradores antigos ganham vários anos de período de uma vez).
//
// Este arquivo NÃO calcula saldo (isso é CalculadoraSaldoPeriodo.ts) e NÃO
// persiste nada — só decide o que deveria existir.

import type { PeriodoAquisitivo } from '../../../types';

const DIAS_PADRAO_POR_PERIODO = 30;

function formatarDataISO(data: Date): string {
  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, '0');
  const dia = String(data.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

function adicionarMeses(data: Date, meses: number): Date {
  const resultado = new Date(data);
  resultado.setMonth(resultado.getMonth() + meses);
  return resultado;
}

function idDeterministico(colaboradorId: string, anoBase: number): string {
  return `periodo-${colaboradorId}-${anoBase}`;
}

function classificarStatus(dataInicio: Date, dataFim: Date, hoje: Date): PeriodoAquisitivo['status'] {
  if (dataInicio <= hoje && hoje <= dataFim) return 'ativo';
  if (hoje > dataFim) return 'vencido';
  return 'futuro';
}

export interface ResultadoGeracaoPeriodos {
  periodosNovos: PeriodoAquisitivo[];
  // true quando a data de admissão não permitiu calcular nada (vazia/inválida)
  // — quem chama decide se oferece criação manual nesse caso.
  admissaoInvalida: boolean;
}

/**
 * Gera os períodos aquisitivos que ainda faltam para um colaborador, a partir
 * da data de admissão, sem duplicar os que já existem (comparação por id
 * determinístico, não por posição/índice).
 */
export function gerarPeriodosFaltantes(
  colaboradorId: string,
  dataAdmissao: string,
  periodosExistentes: PeriodoAquisitivo[],
  hoje: Date = new Date(),
  diasPorPeriodo: number = DIAS_PADRAO_POR_PERIODO
): ResultadoGeracaoPeriodos {
  const admissao = new Date(dataAdmissao);
  if (!dataAdmissao || isNaN(admissao.getTime())) {
    return { periodosNovos: [], admissaoInvalida: true };
  }

  const idsExistentes = new Set(periodosExistentes.map((p) => p.id));
  const periodosNovos: PeriodoAquisitivo[] = [];

  let dataInicio = admissao;
  let anoBase = admissao.getFullYear();

  // Gera até o período que cobre hoje (inclusive) — não gera períodos futuros
  // além do atual, para não poluir o select com anos que ainda nem começaram.
  while (dataInicio <= hoje) {
    const id = idDeterministico(colaboradorId, anoBase);
    const dataFim = adicionarMeses(dataInicio, 12);

    if (!idsExistentes.has(id)) {
      periodosNovos.push({
        id,
        colaboradorId,
        anoBase,
        dataInicio: formatarDataISO(dataInicio),
        dataFim: formatarDataISO(dataFim),
        diasDisponiveis: diasPorPeriodo,
        diasUsados: 0, // cache — recalculado por CalculadoraSaldoPeriodo assim que houver movimentos
        diasRestantes: diasPorPeriodo,
        status: classificarStatus(dataInicio, dataFim, hoje),
      });
    }

    dataInicio = adicionarMeses(dataInicio, 12);
    anoBase++;
  }

  return { periodosNovos, admissaoInvalida: false };
}
