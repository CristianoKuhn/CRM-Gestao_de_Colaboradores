/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 5
//
// comparativoEngine — diff de respostas por papel, genérico (não específico
// de gestor×colaborador, embora seja o uso mais comum). Ver documento de
// arquitetura, seção 5.
// ═══════════════════════════════════════════════════════════════════

import { FormularioTemplate, RespostaCampo } from '../../../types';
import { respostasParaMapa } from './validacaoEngine';

export interface DiferencaResposta {
  perguntaId: string;
  perguntaLabel: string;
  categoriaNome: string;
  notaPapelA?: number;
  notaPapelB?: number;
  diferenca?: number; // notaPapelA - notaPapelB, quando ambos existem
}

/**
 * Compara as respostas de dois papéis (ex.: 'gestor' e 'colaborador') para
 * o mesmo template/instância, competência a competência. Só considera
 * perguntas do tipo 'nota' — é onde uma diferença numérica faz sentido;
 * outros tipos de campo não entram no comparativo por ora.
 */
export function compararRespostasPorPapel(
  template: FormularioTemplate,
  respostas: RespostaCampo[],
  papelA: string,
  papelB: string
): DiferencaResposta[] {
  const respostasA = respostasParaMapa(respostas.filter((r) => r.papel === papelA));
  const respostasB = respostasParaMapa(respostas.filter((r) => r.papel === papelB));

  const linhas: DiferencaResposta[] = [];
  template.categorias.forEach((categoria) => {
    categoria.perguntas.forEach((pergunta) => {
      if (pergunta.tipo !== 'nota') return;
      const notaA = respostasA[pergunta.id]?.valor;
      const notaB = respostasB[pergunta.id]?.valor;
      const temA = typeof notaA === 'number';
      const temB = typeof notaB === 'number';
      if (!temA && !temB) return;
      linhas.push({
        perguntaId: pergunta.id,
        perguntaLabel: pergunta.label,
        categoriaNome: categoria.nome,
        notaPapelA: temA ? (notaA as number) : undefined,
        notaPapelB: temB ? (notaB as number) : undefined,
        diferenca: temA && temB ? (notaA as number) - (notaB as number) : undefined,
      });
    });
  });
  return linhas;
}

/** True se existir pelo menos uma resposta de nota para o papel informado. */
export function papelTemRespostas(respostas: RespostaCampo[], papel: string): boolean {
  return respostas.some((r) => r.papel === papel && typeof r.valor === 'number');
}
