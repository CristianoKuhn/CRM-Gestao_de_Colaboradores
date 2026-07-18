// api/googlescript.ts
export default async function handler(req: any, res: any) {
  try {
    const scriptUrl =
      (req.headers['x-google-script-url'] as string) ||
      (req.query?.scriptUrl as string) ||
      process.env.GOOGLE_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbz8iGKX9f9VNECQL1fcQttiMaEuT3a61YS3hE3HYi13SUvx3ShxF3RF69u7LkQhac0V/exec';

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

    console.log('[api/googlescript] Request:', {
      action,
      method: req.method,
      scriptUrl,
      hasData: bodyObj.data !== undefined,
    });

    let response: Response;

    if (req.method === 'GET') {
      // Compatibilidade retroativa: se algo ainda chamar via GET, repassa como GET.
      const url = new URL(scriptUrl);
      url.searchParams.set('action', String(action));
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
        body: JSON.stringify({ action, data: bodyObj.data }),
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
