/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface EventoParaResumir {
  data: string;
  tipo: string;
  titulo: string;
  descricao: string;
}

// Fala com api/resumo-timeline.ts — só deve ser chamado quando há eventos
// novos de verdade (o chamador é quem decide isso, para nunca gastar uma
// chamada de IA à toa).
export async function atualizarResumoTimeline(
  nomeColaborador: string,
  resumoAnterior: string,
  novosEventos: EventoParaResumir[]
): Promise<string> {
  const resposta = await fetch('/api/resumo-timeline', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nomeColaborador, resumoAnterior, novosEventos }),
  });

  const dados = await resposta.json();

  if (!resposta.ok || !dados.success) {
    throw new Error(dados?.message || 'Não consegui atualizar o resumo agora.');
  }

  return dados.resumoTexto as string;
}
