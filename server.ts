/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware para JSON com limite maior para uploads/fotos
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // API Proxy para o Google Apps Script
  app.all('/api/googlescript', async (req, res) => {
    try {
      // Prioridade: Header personalizado -> Env Var -> Fallback Padrão
      const scriptUrl = (req.headers['x-google-script-url'] as string) || 
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
        headers: {
          'Content-Type': 'application/json',
        },
      };

      if (req.method === 'POST') {
        options.body = JSON.stringify(req.body);
      }

      console.log(`[Proxy Backend] Redirecionando ação "${action}" para o Google Sheets...`);
      const response = await fetch(url.toString(), options);
      
      if (!response.ok) {
        return res.status(response.status).json({ 
          success: false, 
          message: `Erro do Google Apps Script: ${response.statusText}` 
        });
      }

      const data = await response.json();
      return res.json(data);
    } catch (error: any) {
      console.error('[Proxy Backend] Erro na conexão:', error);
      return res.status(500).json({ 
        success: false, 
        message: error.message || 'Erro interno na comunicação com o Google Sheets.' 
      });
    }
  });

  // Configuração do Vite (Desenvolvimento vs Produção)
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[Backend] Servidor rodando com sucesso na porta ${PORT}`);
  });
}

startServer();
