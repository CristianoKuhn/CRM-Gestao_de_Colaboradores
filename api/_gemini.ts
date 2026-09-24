/**
 * api/_gemini.ts — utilitário compartilhado entre endpoints de IA
 *
 * Fornece:
 *   - callGeminiWithRetry: chama a API Gemini com retry automático para erros
 *     temporários (503 / 429), usando backoff exponencial com jitter.
 *   - isTransientError: detecta se um erro é temporário e vale a pena tentar de novo.
 *
 * Motivo do retry: o Google Gemini retorna 503 UNAVAILABLE em picos de demanda
 * e 429 RESOURCE_EXHAUSTED quando a cota é atingida. Ambos são transitórios.
 * Um retry com espera resolve a maioria dos casos sem nenhuma ação do usuário.
 */

const MAX_TENTATIVAS = 3;
const BASE_DELAY_MS  = 1_500; // 1.5s → 3s → 6s (com jitter ±20%)

export function isTransientError(e: any): boolean {
  const msg = String(e?.message || e?.error?.message || '');
  const status = e?.status || e?.error?.status || e?.code || e?.error?.code || 0;
  return (
    status === 503 || status === 429 ||
    msg.includes('UNAVAILABLE') ||
    msg.includes('RESOURCE_EXHAUSTED') ||
    msg.includes('high demand') ||
    msg.includes('overloaded') ||
    msg.includes('quota')
  );
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function jitter(ms: number): number {
  // ±20% de variação para evitar thundering herd
  return ms * (0.8 + Math.random() * 0.4);
}

/**
 * Executa `fn` com retry automático para erros transitórios.
 *
 * @param fn        Função que faz a chamada ao Gemini (pode rejeitar com erro)
 * @param contexto  Nome do caller para logs — ex: '[api/resumo-timeline]'
 * @returns         O resultado de `fn` quando bem-sucedido
 * @throws          O último erro se todas as tentativas falharem
 */
export async function callGeminiWithRetry<T>(
  fn: () => Promise<T>,
  contexto = '[api/gemini]',
): Promise<T> {
  let ultimoErro: any;
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      return await fn();
    } catch (e: any) {
      ultimoErro = e;
      if (!isTransientError(e) || tentativa === MAX_TENTATIVAS) throw e;
      const espera = jitter(BASE_DELAY_MS * Math.pow(2, tentativa - 1));
      console.warn(
        `${contexto} Tentativa ${tentativa}/${MAX_TENTATIVAS} falhou (${e?.message || e?.error?.status || '?'}). ` +
        `Aguardando ${Math.round(espera)}ms antes de tentar novamente...`
      );
      await delay(espera);
    }
  }
  throw ultimoErro;
}
