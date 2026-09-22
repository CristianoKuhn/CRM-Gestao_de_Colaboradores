import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'

// ── Service Worker — registro com atualização forçada ─────────────────────────
// skipWaiting() no SW já força a ativação imediata, mas o browser precisa
// descobrir que existe uma nova versão. Forçamos isso a cada carregamento.
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' })
      .then((reg) => {
        // Forçar verificação de atualização a cada visita
        reg.update();

        // Se há um SW waiting (novo instalado mas não ativado), ativar imediatamente
        if (reg.waiting) {
          reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        }

        // Quando um novo SW instalar e entrar em waiting, ativá-lo direto
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing;
          if (!newWorker) return;
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // Novo SW instalado → forçar skip e recarregar uma vez
              newWorker.postMessage({ type: 'SKIP_WAITING' });
              navigator.serviceWorker.addEventListener('controllerchange', () => {
                window.location.reload();
              }, { once: true });
            }
          });
        });
      })
      .catch((err) => console.warn('[SW] Registro falhou:', err));

    // Mensagens vindas do SW
    navigator.serviceWorker.addEventListener('message', (event) => {
      if (event.data?.type === 'SW_UPDATED') {
        console.log('[SW] Atualizado para', event.data.version);
      }
    });
  });
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
