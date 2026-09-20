/**
 * api/gerar-token-sso.ts  — Gestão360
 *
 * Gera um token SSO de uso único (válido por 5 minutos) para que o usuário
 * logado no Gestão360 possa abrir o App-Indicadores-Operacionais já autenticado,
 * sem precisar digitar senha novamente.
 *
 * Fluxo:
 *  1. Sidebar do G360 chama POST /api/gerar-token-sso com o sessionToken atual
 *  2. Este endpoint valida o sessionToken no backend do G360
 *  3. Grava o sso_token na aba Sessoes do G360 (com TTL de 5 min e uso_unico=true)
 *  4. Retorna o sso_token + a URL de destino no IO
 *  5. O frontend abre IO?sso=TOKEN
 *  6. O IO valida TOKEN chamando /api/validar-sso-g360 (no próprio IO)
 *     que por sua vez chama o backend do G360 com action=validarSsoToken
 */

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, message: 'Método não permitido.' });
  }

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const sessionToken: string = body?.sessionToken || '';
    const backendG360Url: string = body?.backendUrl || '';

    if (!sessionToken || !backendG360Url) {
      return res.status(400).json({ success: false, message: 'sessionToken e backendUrl são obrigatórios.' });
    }

    if (!backendG360Url.startsWith('https://script.google.com/')) {
      return res.status(400).json({ success: false, message: 'backendUrl inválida.' });
    }

    // Chama o backend do G360 para:
    // a) validar que a sessão é legítima
    // b) gerar o sso_token persistido na aba Sessoes
    const resp = await fetch(backendG360Url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'gerarSsoToken',
        sessionToken,
      }),
    });

    if (!resp.ok) {
      return res.status(502).json({ success: false, message: 'Falha ao comunicar com o backend do Gestão360.' });
    }

    const dados = await resp.json();

    if (!dados?.data?.ssoToken) {
      return res.status(401).json({
        success: false,
        message: dados?.message || 'Sessão inválida ou expirada. Faça login novamente.',
      });
    }

    return res.status(200).json({
      success: true,
      ssoToken: dados.data.ssoToken,
      expiraEm: dados.data.expiraEm,
    });

  } catch (err: any) {
    console.error('[api/gerar-token-sso]', err);
    return res.status(500).json({ success: false, message: err?.message || 'Erro interno.' });
  }
}
