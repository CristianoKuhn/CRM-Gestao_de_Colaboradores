// api/googlescript.ts
export default async function handler(req: any, res: any) {
  try {
    const scriptUrl =
      (req.headers['x-google-script-url'] as string) ||
      process.env.GOOGLE_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbz8iGKX9f9VNECQL1fcQttiMaEuT3a61YS3hE3HYi13SUvx3ShxF3RF69u7LkQhac0V/exec';

    const action = req.query.action || req.body?.action;
    if (!action) {
      return res.status(400).json({ success: false, message: 'Ação não especificada.' });
    }

    const url = new URL(scriptUrl);
    url.searchParams.set('action', String(action));

    // Forward the 'data' parameter for GET requests (Google Apps Script works best with query params)
    if (req.query.data) {
      url.searchParams.set('data', String(req.query.data));
    }

    // For POST requests, also include the data in the body
    const options: RequestInit = {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
    };

    const response = await fetch(url.toString(), options);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('[api/googlescript] Erro:', error);
    return res.status(500).json({ success: false, message: error.message || 'Erro interno' });
  }
}
