/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface LisaMensagem {
  role: 'user' | 'model';
  texto: string;
}

export interface LisaAcaoNavegar {
  tela: string;
  colaboradorNome?: string;
}

export interface LisaResposta {
  texto: string | null;
  acoes: LisaAcaoNavegar[];
}

// Fala com o backend seguro da Lisa (api/lisa.ts) — a chave do Gemini nunca
// passa pelo navegador, só o texto da conversa.
export async function perguntarParaLisa(
  mensagem: string,
  historico: LisaMensagem[]
): Promise<LisaResposta> {
  const resposta = await fetch('/api/lisa', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mensagem, historico }),
  });

  const dados = await resposta.json();

  if (!resposta.ok || !dados.success) {
    throw new Error(dados?.message || 'Não consegui falar com a Lisa agora.');
  }

  return { texto: dados.texto, acoes: dados.acoes || [] };
}
