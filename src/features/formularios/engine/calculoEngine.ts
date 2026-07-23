/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ═══════════════════════════════════════════════════════════════════
// MOTOR DE FORMULÁRIOS INTELIGENTES COM WORKFLOW — Sprint 4
//
// calculoEngine — registry de avaliadores por `regra.tipo` (arquitetura,
// seção 5). Cada regra do template propõe, no máximo, um "candidato" de
// parecer com uma prioridade; o parecer final é sempre o candidato de
// maior prioridade entre os que dispararam — independente da ordem em que
// as regras aparecem no array. Isso é o que permite "se Segurança < 8 →
// Reprovado, mesmo com média 9" sem nenhuma lógica hard-coded (arquitetura,
// seção 2.1.2).
//
// Puramente funcional — chamado a cada mudança de resposta, sem botão
// "calcular" (requisito atendido por construção).
// ═══════════════════════════════════════════════════════════════════

import { FormularioTemplate, PerguntaFormulario, RegraCalculo, RespostaCampo, ResultadoFormularioInstancia } from '../../../types';
import { avaliarCondicao, respostasParaMapa, RespostasPorPergunta } from './validacaoEngine';

interface CandidatoParecer {
  valor: string;
  prioridade: number;
}

// Prioridades fixas para os tipos de regra que não declaram a própria
// prioridade — nota mínima obrigatória sempre vence, faixa de parecer é o
// resultado "padrão" que qualquer regra mais específica pode sobrescrever.
const PRIORIDADE_NOTA_MINIMA = 1000;
const PRIORIDADE_CONDICIONAL_PADRAO = 100;
const PRIORIDADE_FAIXA_PARECER = -1;

function listarPerguntasPorId(template: FormularioTemplate): Record<string, PerguntaFormulario> {
  const mapa: Record<string, PerguntaFormulario> = {};
  template.categorias.forEach((categoria) => {
    categoria.perguntas.forEach((pergunta) => {
      mapa[pergunta.id] = pergunta;
    });
  });
  return mapa;
}

function notasNumericasRespondidas(
  perguntasPorId: Record<string, PerguntaFormulario>,
  respostasPorPergunta: RespostasPorPergunta
): { pergunta: PerguntaFormulario; nota: number }[] {
  return Object.values(perguntasPorId)
    .filter((p) => p.tipo === 'nota')
    .map((pergunta) => ({ pergunta, resposta: respostasPorPergunta[pergunta.id] }))
    .filter((par) => typeof par.resposta?.valor === 'number')
    .map((par) => ({ pergunta: par.pergunta, nota: par.resposta!.valor as number }));
}

function aplicarRegra(
  regra: RegraCalculo,
  template: FormularioTemplate,
  perguntasPorId: Record<string, PerguntaFormulario>,
  respostasPorPergunta: RespostasPorPergunta,
  estado: { mediaGeral?: number; mediaPonderada?: number; camposCalculados: Record<string, unknown> },
  candidatosParecer: CandidatoParecer[]
): void {
  switch (regra.tipo) {
    case 'media_simples': {
      const notas = notasNumericasRespondidas(perguntasPorId, respostasPorPergunta);
      if (notas.length === 0) return;
      const media = notas.reduce((acc, n) => acc + n.nota, 0) / notas.length;
      if (!regra.campoResultado || regra.campoResultado === 'mediaGeral') estado.mediaGeral = media;
      else estado.camposCalculados[regra.campoResultado] = media;
      break;
    }
    case 'media_ponderada': {
      const notas = notasNumericasRespondidas(perguntasPorId, respostasPorPergunta);
      if (notas.length === 0) return;
      const pesoTotal = notas.reduce((acc, n) => acc + (n.pergunta.peso ?? 1), 0);
      if (pesoTotal <= 0) return;
      const somaPonderada = notas.reduce((acc, n) => acc + n.nota * (n.pergunta.peso ?? 1), 0);
      const media = somaPonderada / pesoTotal;
      if (!regra.campoResultado || regra.campoResultado === 'mediaPonderada') estado.mediaPonderada = media;
      else estado.camposCalculados[regra.campoResultado] = media;
      break;
    }
    case 'nota_minima_obrigatoria': {
      if (!regra.perguntaId || regra.minimo === undefined) return;
      const resposta = respostasPorPergunta[regra.perguntaId];
      const nota = typeof resposta?.valor === 'number' ? resposta.valor : undefined;
      if (nota !== undefined && nota < regra.minimo && regra.seFalhar) {
        candidatosParecer.push({ valor: regra.seFalhar.valor, prioridade: PRIORIDADE_NOTA_MINIMA });
      }
      break;
    }
    case 'condicional': {
      if (!regra.se || !regra.entao) return;
      const respostaRef = respostasPorPergunta[regra.se.perguntaId];
      const atende = avaliarCondicao(regra.se, respostaRef ? respostaRef.valor : undefined);
      if (atende) {
        candidatosParecer.push({
          valor: regra.entao.valor,
          prioridade: regra.entao.prioridade ?? PRIORIDADE_CONDICIONAL_PADRAO,
        });
      }
      break;
    }
    case 'faixa_parecer': {
      if (!regra.faixas || regra.faixas.length === 0) return;
      const baseNumero =
        regra.baseadoEm === 'mediaPonderada'
          ? estado.mediaPonderada
          : regra.baseadoEm === 'mediaGeral' || !regra.baseadoEm
          ? estado.mediaGeral
          : (estado.camposCalculados[regra.baseadoEm] as number | undefined);
      if (typeof baseNumero !== 'number') return;
      const faixaEncontrada = [...regra.faixas]
        .sort((a, b) => b.min - a.min)
        .find((faixa) => baseNumero >= faixa.min);
      if (faixaEncontrada) {
        candidatosParecer.push({ valor: faixaEncontrada.label, prioridade: PRIORIDADE_FAIXA_PARECER });
      }
      break;
    }
    case 'formula_customizada': {
      // Reservado (arquitetura, seção 2.1.2) — avaliação de expressão
      // customizada ainda não implementada. Ignorado com segurança: uma
      // regra desse tipo presente no template não quebra o cálculo das
      // demais, só não produz efeito ainda.
      break;
    }
    default:
      break;
  }
  // `template` só é usado para manter a assinatura simétrica caso um tipo de
  // regra futuro precise inspecionar outras partes do template.
  void template;
}

/**
 * Calcula o resultado de uma instância a partir do template e das respostas
 * de um papel (ex.: 'gestor'). Determinístico e sem efeitos colaterais —
 * chamado tanto pela UI (exibição em tempo real) quanto na conclusão da
 * instância (valor persistido).
 */
export function calcularResultado(
  template: FormularioTemplate,
  respostas: RespostaCampo[],
  papel: string
): ResultadoFormularioInstancia {
  const respostasDoPapel = respostas.filter((r) => r.papel === papel);
  const respostasPorPergunta = respostasParaMapa(respostasDoPapel);
  const perguntasPorId = listarPerguntasPorId(template);

  const estado: { mediaGeral?: number; mediaPonderada?: number; camposCalculados: Record<string, unknown> } = {
    camposCalculados: {},
  };
  const candidatosParecer: CandidatoParecer[] = [];

  template.regrasCalculo.forEach((regra) => {
    aplicarRegra(regra, template, perguntasPorId, respostasPorPergunta, estado, candidatosParecer);
  });

  let parecerFinal: string | undefined;
  if (candidatosParecer.length > 0) {
    parecerFinal = candidatosParecer.reduce((melhor, atual) =>
      atual.prioridade > melhor.prioridade ? atual : melhor
    ).valor;
  }

  return {
    mediaGeral: estado.mediaGeral,
    mediaPonderada: estado.mediaPonderada,
    parecerFinal,
    camposCalculados: Object.keys(estado.camposCalculados).length > 0 ? estado.camposCalculados : undefined,
  };
}
