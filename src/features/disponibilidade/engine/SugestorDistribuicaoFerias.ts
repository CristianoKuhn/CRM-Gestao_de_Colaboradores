// ── Motor de Disponibilidade Operacional — Sugestão de Distribuição de
//    Férias por Setor (Fase 6) ────────────────────────────────────────────
// Responsabilidade ÚNICA: dado um setor e um ano, sugerir automaticamente EM
// QUE MÊS cada colaborador elegível deveria tirar férias, distribuindo ao
// longo do ano em vez de deixar todo mundo concentrado no mesmo período.
//
// Não é "verificar conflito depois que a pessoa já escolheu uma data" (isso
// já existe em PlanejadorFerias.tsx via detectarConflitos) — aqui o motor
// PROPÕE a data, exatamente o diferencial pedido na arquitetura original.
//
// Desenho pensado para virar Motor de Simulação depois, sem refatoração
// estrutural: a pontuação de cada mês candidato é a média de uma LISTA de
// critérios plugáveis (mesmo padrão de CandidateScoreCalculator.ts na Escala
// Inteligente). Sazonalidade, criticidade do colaborador, calendário
// operacional e impacto na Escala Inteligente entram depois como novos itens
// nessa mesma lista — nunca como reescrita do motor.
//
// Estratégia: gulosa (greedy), processando primeiro quem está mais perto de
// perder os dias (vencimento do período mais próximo) — mesma lógica de
// "quem é mais crítico decide primeiro" já usada no ScaleGenerator da Escala
// Inteligente. Cada sugestão aceita entra no cálculo dos próximos
// colaboradores, para não sugerir o mesmo mês pra todo mundo.

import type { Colaborador, ConfiguracaoFerias, Ferias, JustificativaSugestaoFerias, PeriodoAquisitivo, SugestaoDistribuicaoFerias } from '../../../types';

export interface ContextoSugestaoDistribuicao {
  colaborador: Colaborador;
  periodo: PeriodoAquisitivo;
  colaboradoresDoSetor: Colaborador[];
  // Férias já confirmadas/planejadas do setor inteiro no ano, JÁ incluindo as
  // sugestões aceitas anteriormente nesta mesma rodada (ver gerarSugestoesSetor).
  feriasDoSetorNoAno: Ferias[];
  configuracao: ConfiguracaoFerias;
  ano: number;
}

export interface CriterioSugestaoFerias {
  criterio: string;
  // Retorna 0 a 1 (quanto maior, melhor esse mês é para este colaborador) e
  // uma descrição legível para a justificativa.
  calcular: (mes: number, contexto: ContextoSugestaoDistribuicao) => { valor: number; descricao: string };
}

function mesOverlapsFerias(mes: number, ano: number, f: Ferias): boolean {
  const inicio = new Date(f.dataInicio);
  const fim = new Date(f.dataFim);
  const inicioDoMes = new Date(ano, mes - 1, 1);
  const fimDoMes = new Date(ano, mes, 0);
  return inicio <= fimDoMes && fim >= inicioDoMes;
}

/** Evita concentração de setor: penaliza meses onde o limite configurado (quantidade e percentual) já está no talo. */
export const criterioConcentracaoSetor: CriterioSugestaoFerias = {
  criterio: 'Concentração do setor',
  calcular: (mes, ctx) => {
    const colegasNoMes = ctx.feriasDoSetorNoAno.filter(
      (f) => f.colaboradorId !== ctx.colaborador.id && f.status !== 'cancelada' && mesOverlapsFerias(mes, ctx.ano, f)
    ).length;
    const totalSetor = ctx.colaboradoresDoSetor.length || 1;
    const percentualSeEntrar = ((colegasNoMes + 1) / totalSetor) * 100;

    const excedeuQuantidade = colegasNoMes + 1 > ctx.configuracao.maximoDiasSimultaneoSetor;
    const excedeuPercentual = percentualSeEntrar > ctx.configuracao.maximoPercentualEquipe;

    if (excedeuQuantidade || excedeuPercentual) {
      return {
        valor: 0,
        descricao: `Já haveria ${colegasNoMes + 1} pessoa(s) do setor de férias (${Math.round(percentualSeEntrar)}% da equipe) — acima do limite configurado.`,
      };
    }
    const folga = 1 - colegasNoMes / Math.max(1, ctx.configuracao.maximoDiasSimultaneoSetor);
    return {
      valor: Math.max(0, Math.min(1, folga)),
      descricao: `${colegasNoMes} colega(s) do setor já de férias neste mês (limite: ${ctx.configuracao.maximoDiasSimultaneoSetor}).`,
    };
  },
};

/** Distribui ao longo do ano: prefere meses com menos gente da empresa toda já ausente, para não empilhar tudo no mesmo trimestre. */
export const criterioDistribuicaoAnual: CriterioSugestaoFerias = {
  criterio: 'Distribuição ao longo do ano',
  calcular: (mes, ctx) => {
    const totalNoMes = ctx.feriasDoSetorNoAno.filter((f) => f.status !== 'cancelada' && mesOverlapsFerias(mes, ctx.ano, f)).length;
    const maiorContagemPossivel = Math.max(1, ctx.colaboradoresDoSetor.length);
    const valor = Math.max(0, 1 - totalNoMes / maiorContagemPossivel);
    return {
      valor,
      descricao: totalNoMes === 0 ? 'Mês ainda sem ninguém do setor de férias.' : `${totalNoMes} lançamento(s) do setor já neste mês.`,
    };
  },
};

/** Urgência: períodos mais perto de vencer (ver prazoConcessivoMeses) pontuam mais alto em meses mais próximos, para não perder o direito. */
export const criterioUrgenciaVencimento: CriterioSugestaoFerias = {
  criterio: 'Urgência do vencimento',
  calcular: (mes, ctx) => {
    const vencimento = new Date(ctx.periodo.dataFim);
    vencimento.setMonth(vencimento.getMonth() + ctx.configuracao.prazoConcessivoMeses);
    const candidato = new Date(ctx.ano, mes - 1, 15);
    const mesesAteVencer = (vencimento.getFullYear() - candidato.getFullYear()) * 12 + (vencimento.getMonth() - candidato.getMonth());

    if (mesesAteVencer < 0) {
      return { valor: 0, descricao: 'Este mês já estaria após o vencimento do período — não serve.' };
    }
    // Quanto mais perto do vencimento sem ultrapassar, maior a urgência de já resolver.
    const valor = mesesAteVencer <= 3 ? 1 : Math.max(0.2, 1 - (mesesAteVencer - 3) / 12);
    return {
      valor,
      descricao: mesesAteVencer <= 3 ? `Período vence em ${mesesAteVencer} mês(es) — prioridade alta.` : `Período vence em ${mesesAteVencer} mês(es).`,
    };
  },
};

export const CRITERIOS_PADRAO_SUGESTAO_FERIAS: CriterioSugestaoFerias[] = [
  criterioConcentracaoSetor,
  criterioDistribuicaoAnual,
  criterioUrgenciaVencimento,
];

function melhorMesParaColaborador(
  contexto: ContextoSugestaoDistribuicao,
  criterios: CriterioSugestaoFerias[]
): { mes: number; pontuacao: number; justificativas: JustificativaSugestaoFerias[] } | null {
  let melhor: { mes: number; pontuacao: number; justificativas: JustificativaSugestaoFerias[] } | null = null;

  for (let mes = 1; mes <= 12; mes++) {
    const avaliacoes = criterios.map((c) => ({ criterio: c.criterio, ...c.calcular(mes, contexto) }));
    const pontuacao = avaliacoes.reduce((soma, a) => soma + a.valor, 0) / avaliacoes.length;
    if (!melhor || pontuacao > melhor.pontuacao) {
      melhor = {
        mes,
        pontuacao,
        justificativas: avaliacoes.map((a) => ({ criterio: a.criterio, descricao: a.descricao, favoravel: a.valor >= 0.5 })),
      };
    }
  }
  return melhor;
}

/**
 * Gera sugestões de distribuição para todos os colaboradores elegíveis de um
 * setor (período ativo com saldo disponível e ainda sem férias suficientes
 * planejadas para cobrir o saldo). Processa em ordem de urgência de
 * vencimento — quem tem menos tempo decide primeiro, e sua sugestão já entra
 * no cálculo de quem vem depois (mesmo espírito guloso do ScaleGenerator).
 */
export function gerarSugestoesSetor(
  colaboradoresDoSetor: Colaborador[],
  periodosAquisitivos: PeriodoAquisitivo[],
  feriasExistentes: Ferias[],
  configuracao: ConfiguracaoFerias,
  ano: number,
  criterios: CriterioSugestaoFerias[] = CRITERIOS_PADRAO_SUGESTAO_FERIAS
): SugestaoDistribuicaoFerias[] {
  const elegiveis = colaboradoresDoSetor
    .map((colaborador) => {
      const periodo = periodosAquisitivos.find((p) => p.colaboradorId === colaborador.id && p.status === 'ativo');
      return periodo && periodo.diasDisponiveis - periodo.diasUsados >= configuracao.salarioMinimoDias
        ? { colaborador, periodo }
        : null;
    })
    .filter((x): x is { colaborador: Colaborador; periodo: PeriodoAquisitivo } => x !== null)
    // Quem vence primeiro decide primeiro.
    .sort((a, b) => new Date(a.periodo.dataFim).getTime() - new Date(b.periodo.dataFim).getTime());

  const sugestoes: SugestaoDistribuicaoFerias[] = [];
  let feriasAcumuladas = [...feriasExistentes];

  for (const { colaborador, periodo } of elegiveis) {
    const contexto: ContextoSugestaoDistribuicao = {
      colaborador,
      periodo,
      colaboradoresDoSetor,
      feriasDoSetorNoAno: feriasAcumuladas,
      configuracao,
      ano,
    };
    const resultado = melhorMesParaColaborador(contexto, criterios);
    if (!resultado) continue;

    const dias = Math.min(periodo.diasDisponiveis - periodo.diasUsados, 30);
    const dataInicio = new Date(ano, resultado.mes - 1, 1);
    const dataFim = new Date(dataInicio);
    dataFim.setDate(dataFim.getDate() + dias - 1);

    const sugestao: SugestaoDistribuicaoFerias = {
      colaboradorId: colaborador.id,
      periodoAquisitivoId: periodo.id,
      mes: resultado.mes,
      ano,
      dataInicio: dataInicio.toISOString().split('T')[0],
      dataFim: dataFim.toISOString().split('T')[0],
      dias,
      pontuacao: resultado.pontuacao,
      justificativas: resultado.justificativas,
    };
    sugestoes.push(sugestao);

    // A sugestão recém-aceita passa a valer para os próximos colaboradores
    // do setor — é isto que garante distribuição real, não sugestões
    // independentes que poderiam todas cair no "melhor mês" ao mesmo tempo.
    feriasAcumuladas = [
      ...feriasAcumuladas,
      {
        id: `sugestao-provisoria-${colaborador.id}`,
        colaboradorId: colaborador.id,
        periodoAquisitivoId: periodo.id,
        dataInicio: sugestao.dataInicio,
        dataFim: sugestao.dataFim,
        dias,
        status: 'planejada',
        createdAt: new Date().toISOString(),
      },
    ];
  }

  return sugestoes;
}
