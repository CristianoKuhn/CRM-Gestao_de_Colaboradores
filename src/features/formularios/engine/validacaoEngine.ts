/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 3
//
// validacaoEngine — obrigatoriedade de campos e regras condicionais de
// exibição (`exibirSe`). Genérico para qualquer FormularioTemplate, nunca
// específico de um processo. Ver documento de arquitetura, seção 5.
// ═══════════════════════════════════════════════════════════════════

import { CondicaoExibicao, FormularioTemplate, PerguntaFormulario, RespostaCampo } from '../../../types';

/** Mapa de respostas indexado por `perguntaId`, para consulta O(1) pelo motor. */
export type RespostasPorPergunta = Record<string, RespostaCampo | undefined>;

export function respostasParaMapa(respostas: RespostaCampo[]): RespostasPorPergunta {
  const mapa: RespostasPorPergunta = {};
  respostas.forEach((r) => {
    mapa[r.perguntaId] = r;
  });
  return mapa;
}

export function avaliarCondicao(condicao: CondicaoExibicao, valorReferencia: unknown): boolean {
  switch (condicao.operador) {
    case 'igual':
      return valorReferencia === condicao.valor;
    case 'diferente':
      return valorReferencia !== condicao.valor;
    case 'maior_que':
      return typeof valorReferencia === 'number' && typeof condicao.valor === 'number' && valorReferencia > condicao.valor;
    case 'menor_que':
      return typeof valorReferencia === 'number' && typeof condicao.valor === 'number' && valorReferencia < condicao.valor;
    case 'contem':
      return Array.isArray(valorReferencia) && valorReferencia.includes(condicao.valor as never);
    default:
      return true;
  }
}

/** True se a pergunta deve aparecer no formulário, dado o estado atual das respostas. */
export function deveExibirPergunta(pergunta: PerguntaFormulario, respostasPorPergunta: RespostasPorPergunta): boolean {
  if (!pergunta.exibirSe) return true;
  const respostaReferencia = respostasPorPergunta[pergunta.exibirSe.perguntaId];
  return avaliarCondicao(pergunta.exibirSe, respostaReferencia ? respostaReferencia.valor : undefined);
}

function valorPreenchido(valor: unknown): boolean {
  if (valor === null || valor === undefined) return false;
  if (typeof valor === 'string') return valor.trim().length > 0;
  return true;
}

/**
 * Lista as perguntas obrigatórias e atualmente visíveis (`deveExibirPergunta`)
 * que ainda não têm resposta preenchida. Lista vazia = formulário completo.
 */
export function listarPerguntasPendentes(
  template: FormularioTemplate,
  respostasPorPergunta: RespostasPorPergunta
): PerguntaFormulario[] {
  const pendentes: PerguntaFormulario[] = [];
  template.categorias.forEach((categoria) => {
    categoria.perguntas.forEach((pergunta) => {
      if (!pergunta.obrigatoria) return;
      if (!deveExibirPergunta(pergunta, respostasPorPergunta)) return;
      const resposta = respostasPorPergunta[pergunta.id];
      if (!valorPreenchido(resposta?.valor)) pendentes.push(pergunta);
    });
  });
  return pendentes;
}

export function formularioCompleto(template: FormularioTemplate, respostasPorPergunta: RespostasPorPergunta): boolean {
  return listarPerguntasPendentes(template, respostasPorPergunta).length === 0;
}

/** Progresso 0–100 considerando só as perguntas atualmente visíveis (obrigatórias ou não). */
export function calcularProgresso(template: FormularioTemplate, respostasPorPergunta: RespostasPorPergunta): number {
  let total = 0;
  let respondidas = 0;
  template.categorias.forEach((categoria) => {
    categoria.perguntas.forEach((pergunta) => {
      if (!deveExibirPergunta(pergunta, respostasPorPergunta)) return;
      total += 1;
      if (valorPreenchido(respostasPorPergunta[pergunta.id]?.valor)) respondidas += 1;
    });
  });
  if (total === 0) return 0;
  return Math.round((respondidas / total) * 100);
}
