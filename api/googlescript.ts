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

    const options: RequestInit = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (req.method === 'POST') {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url.toString(), options);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error: any) {
    console.error('[api/googlescript] Erro:', error);
    return res.status(500).json({ success: false, message: error.message || 'Erro interno' });
  }
}
