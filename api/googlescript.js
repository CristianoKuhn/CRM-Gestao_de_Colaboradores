// API Proxy para Google Apps Script - Resolve problemas de CORS
// Esta função é chamada pelo frontend e faz as requisições ao Google Apps Script

module.exports = async function handler(req, res) {
  // Configurar CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, x-google-script-url');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const scriptUrl =
      req.headers['x-google-script-url'] ||
      process.env.GOOGLE_SCRIPT_URL ||
      'https://script.google.com/macros/s/AKfycbz8iGKX9f9VNECQL1fcQttiMaEuT3a61YS3hE3HYi13SUvx3ShxF3RF69u7LkQhac0V/exec';

    const action = req.query.action || (req.body && req.body.action);
    if (!action) {
      return res.status(400).json({ success: false, message: 'Ação não especificada.' });
    }

    const url = new URL(scriptUrl);
    url.searchParams.set('action', String(action));

    const options = {
      method: req.method,
      headers: { 'Content-Type': 'application/json' },
    };
    
    if (req.method === 'POST') {
      options.body = JSON.stringify(req.body);
    }

    const response = await fetch(url.toString(), options);
    const data = await response.json();
    return res.status(response.status).json(data);
  } catch (error) {
    console.error('[api/googlescript] Erro:', error.message);
    return res.status(500).json({ 
      success: false, 
      message: error.message || 'Erro interno na comunicação com o Google Apps Script.' 
    });
  }
};
