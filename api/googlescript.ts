// api/googlescript.ts
//
// Security Audit (Fase 1, V09): antes, este proxy aceitava um `scriptUrl`
// arbitrário vindo do header `x-google-script-url` ou da query string, e
// repassava a requisição para QUALQUER URL informada — um Open Proxy/SSRF
// clássico: qualquer pessoa podia usar este endpoint da Vercel para fazer o
// servidor enviar POSTs para onde quisesse (rede interna da Vercel, outro
// alvo qualquer), escondendo a própria origem. Agora o destino é sempre e
// somente a URL configurada no ambiente (ou o valor padrão fixo abaixo);
// nenhum valor vindo da requisição do cliente influencia o destino.
const GOOGLE_SCRIPT_URL_FIXO =
  process.env.GOOGLE_SCRIPT_URL ||
  'https://script.google.com/macros/s/AKfycbz8iGKX9f9VNECQL1fcQttiMaEuT3a61YS3hE3HYi13SUvx3ShxF3RF69u7LkQhac0V/exec';

function validarUrlDoAppsScript(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('GOOGLE_SCRIPT_URL configurada é inválida.');
  }
  if (parsed.protocol !== 'https:' || parsed.hostname !== 'script.google.com') {
    // Trava de sanidade: mesmo a URL vinda de variável de ambiente (não do
    // cliente) precisa ser realmente um deployment do Apps Script — evita
    // que uma variável de ambiente mal configurada vire um SSRF também.
    throw new Error('GOOGLE_SCRIPT_URL configurada não aponta para script.google.com.');
  }
}

export default async function handler(req: any, res: any) {
  try {
    validarUrlDoAppsScript(GOOGLE_SCRIPT_URL_FIXO);
    const scriptUrl = GOOGLE_SCRIPT_URL_FIXO;

    // O corpo pode chegar como string (Content-Type: text/plain, como o front-end
    // agora envia de propósito para evitar preflight CORS) ou já parseado como
    // objeto (caso algum client mande application/json). Tratamos os dois casos.
    let bodyObj: any = {};
    if (req.body) {
      if (typeof req.body === 'string') {
        try { bodyObj = JSON.parse(req.body); } catch { bodyObj = {}; }
      } else {
        bodyObj = req.body;
      }
    }

    const action = bodyObj.action || req.query?.action;
    if (!action) {
      return res.status(400).json({ success: false, message: 'Ação não especificada.' });
    }
    // sessionToken é repassado como está — este proxy nunca inspeciona nem
    // valida sessão (isso é responsabilidade exclusiva do Apps Script), só
    // evita perdê-lo no repasse.
    const sessionToken = bodyObj.sessionToken || req.query?.sessionToken || '';

    console.log('[api/googlescript] Request:', {
      action,
      method: req.method,
      hasData: bodyObj.data !== undefined,
      hasSessionToken: !!sessionToken,
    });

    let response: Response;

    if (req.method === 'GET') {
      // Compatibilidade retroativa: se algo ainda chamar via GET, repassa como GET.
      const url = new URL(scriptUrl);
      url.searchParams.set('action', String(action));
      if (sessionToken) url.searchParams.set('sessionToken', String(sessionToken));
      if (req.query?.data) {
        url.searchParams.set('data', String(req.query.data));
      }
      response = await fetch(url.toString(), { method: 'GET' });
    } else {
      // Caminho principal: repassa como POST com o JSON completo no corpo.
      // Chamada servidor-a-servidor, então não há CORS/preflight a se preocupar aqui.
      response = await fetch(scriptUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
        body: JSON.stringify({ action, sessionToken, data: bodyObj.data }),
      });
    }

    const responseText = await response.text();

    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[api/googlescript] Erro ao parsear resposta:', responseText);
      return res.status(500).json({
        success: false,
        message: 'Resposta inválida do Google Apps Script',
        raw: responseText,
      });
    }

    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('[api/googlescript] Erro:', error);
    return res.status(500).json({ success: false, message: error.message || 'Erro interno' });
  }
}
