// api/googlescript.ts
export default async function handler(req: any, res: any) {
  try {
    const scriptUrl =
      (req.headers['x-google-script-url'] as string) ||
      (req.query.scriptUrl as string) ||
      process.env.GOOGLE_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbz8iGKX9f9VNECQL1fcQttiMaEuT3a61YS3hE3HYi13SUvx3ShxF3RF69u7LkQhac0V/exec';

    const action = req.query.action || req.body?.action;
    if (!action) {
      return res.status(400).json({ success: false, message: 'Ação não especificada.' });
    }

    // Constrói a URL para o Google Apps Script
    const url = new URL(scriptUrl);
    url.searchParams.set('action', String(action));

    // Forward the 'data' parameter - Google Apps Script espera como query param
    if (req.query.data) {
      url.searchParams.set('data', String(req.query.data));
    } else if (req.body?.data) {
      // Se data estiver no body, codifica e passa como query param
      const dataStr = typeof req.body.data === 'string' 
        ? req.body.data 
        : JSON.stringify(req.body.data);
      url.searchParams.set('data', encodeURIComponent(dataStr));
    }

    // Log para debug
    console.log('[api/googlescript] Request:', {
      action,
      scriptUrl,
      hasData: !!req.query.data || !!req.body?.data
    });

    // Faz a requisição ao Google Apps Script
    const response = await fetch(url.toString(), {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    });

    const responseText = await response.text();
    
    // Tenta fazer parse do JSON
    let data;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error('[api/googlescript] Erro ao parsear resposta:', responseText);
      return res.status(500).json({ 
        success: false, 
        message: 'Resposta inválida do Google Apps Script',
        raw: responseText 
      });
    }

    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('[api/googlescript] Erro:', error);
    return res.status(500).json({ success: false, message: error.message || 'Erro interno' });
  }
}
