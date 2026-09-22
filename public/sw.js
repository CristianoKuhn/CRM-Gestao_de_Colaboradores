/**
 * Service Worker — Gestão360 PWA  v2.1
 *
 * Estratégias:
 *  - Shell (HTML/CSS/JS) → Cache First com atualização em background
 *  - Google Apps Script (POST) → Network Only (Cache API não aceita POST)
 *  - Google Apps Script (GET)  → Network First com fallback 5min
 *  - Assets estáticos          → Cache First permanente
 *  - API Vercel (/api/*)       → Network Only (dados sempre frescos)
 */

const CACHE_VERSION = 'gestao360-v2.1';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE  = `${CACHE_VERSION}-data`;

const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  '/favicon.svg',
];

// ── Install ───────────────────────────────────────────────────────────────────
self.addEventListener('install', (event) => {
  // skipWaiting força ativação imediata — substitui o SW antigo sem esperar
  // fechar todas as abas.
  self.skipWaiting();
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .catch((err) => console.warn('[SW] Falha no pré-cache do shell:', err))
  );
});

// ── Activate: limpa TODOS os caches de versões anteriores ─────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('gestao360-') && key !== SHELL_CACHE && key !== DATA_CACHE)
          .map((key) => {
            console.log('[SW] Removendo cache antigo:', key);
            return caches.delete(key);
          })
      ))
      // claim() faz o SW novo controlar imediatamente todas as abas abertas
      .then(() => self.clients.claim())
      .then(() => {
        // Avisa todas as abas que o SW foi atualizado
        self.clients.matchAll({ type: 'window' }).then((clients) => {
          clients.forEach((client) => client.postMessage({ type: 'SW_UPDATED', version: CACHE_VERSION }));
        });
      })
  );
});

// ── Mensagens do cliente → SW ─────────────────────────────────────────────────
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
  if (event.data?.type === 'GET_VERSION') {
    event.source?.postMessage({ type: 'SW_VERSION', version: CACHE_VERSION });
  }
});

// ── Fetch ─────────────────────────────────────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar não-HTTP (chrome-extension://, etc.)
  if (!url.protocol.startsWith('http')) return;

  // Vercel API → Network Only sempre
  if (url.pathname.startsWith('/api/')) return;

  // Google Apps Script:
  //   POST → NUNCA cachear (Cache API proíbe; body é único por chamada)
  //   GET  → Network First com fallback de cache 5min
  if (
    url.hostname.includes('script.google.com') ||
    url.hostname.includes('googleapis.com') ||
    url.hostname.includes('googleusercontent.com')
  ) {
    if (request.method === 'POST') {
      event.respondWith(networkOnly(request));
    } else {
      event.respondWith(networkFirstWithCache(request, DATA_CACHE, 300));
    }
    return;
  }

  // Assets estáticos → Cache First
  if (
    url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|woff2?|ttf|otf)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Navegação HTML → Network First com fallback para shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match('/index.html').then((r) => r || offlinePage())
      )
    );
    return;
  }

  // Restante → Stale While Revalidate (apenas GET)
  if (request.method === 'GET') {
    event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
  }
  // POST restantes → deixa o browser tratar normalmente (sem interceptar)
});

// ── Estratégias ───────────────────────────────────────────────────────────────

// Network Only — para POST ao GAS (resultado único, nunca cachear)
async function networkOnly(request) {
  try {
    return await fetch(request);
  } catch {
    return new Response(
      JSON.stringify({ success: false, offline: true, message: 'Sem conexão com a internet.' }),
      { headers: { 'Content-Type': 'application/json' }, status: 503 }
    );
  }
}

// Cache First — shell e assets estáticos (apenas GET)
async function cacheFirst(request, cacheName) {
  if (request.method !== 'GET') return fetch(request);
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response('Recurso não disponível offline.', { status: 503 });
  }
}

// Network First com cache — GET ao GAS com TTL
async function networkFirstWithCache(request, cacheName, maxAgeSeconds) {
  if (request.method !== 'GET') return networkOnly(request);
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const blob = await response.clone().blob();
      const headers = new Headers(response.headers);
      headers.set('sw-cached-at', Date.now().toString());
      cache.put(request, new Response(blob, { headers, status: response.status }));
    }
    return response;
  } catch {
    const cached = await caches.match(request);
    if (cached) {
      const cachedAt = parseInt(cached.headers.get('sw-cached-at') || '0');
      if (Date.now() - cachedAt < maxAgeSeconds * 1000) return cached;
    }
    return new Response(
      JSON.stringify({ success: false, offline: true, message: 'Sem conexão com a internet.' }),
      { headers: { 'Content-Type': 'application/json' }, status: 503 }
    );
  }
}

// Stale While Revalidate — apenas GET
async function staleWhileRevalidate(request, cacheName) {
  if (request.method !== 'GET') return fetch(request);
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request)
    .then((response) => { if (response.ok) cache.put(request, response.clone()); return response; })
    .catch(() => null);
  return cached || await fetchPromise || offlinePage();
}

// Página de offline
function offlinePage() {
  return new Response(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Gestão360 · Sem conexão</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
           background: #0F172A; color: #F1F5F9; display: flex;
           align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #1E293B; border: 1px solid #334155; border-radius: 24px;
            padding: 48px; max-width: 400px; text-align: center; }
    .icon { font-size: 64px; margin-bottom: 24px; }
    h1 { font-size: 22px; font-weight: 800; color: #0D9488; margin-bottom: 12px; }
    p { color: #94A3B8; line-height: 1.6; margin-bottom: 24px; }
    button { background: #0D9488; color: white; border: none; border-radius: 12px;
             padding: 12px 32px; font-size: 14px; font-weight: 700; cursor: pointer; }
    button:hover { background: #0F766E; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">📡</div>
    <h1>Gestão360</h1>
    <p>Parece que você está sem conexão com a internet.<br>Verifique sua rede e tente novamente.</p>
    <button onclick="window.location.reload()">Tentar novamente</button>
  </div>
</body>
</html>`, { headers: { 'Content-Type': 'text/html; charset=utf-8' }, status: 200 });
}

// ── Sync e Push (futuro) ──────────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pendentes') event.waitUntil(Promise.resolve());
});

self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Gestão360', {
      body: data.body || '', icon: '/icon-192x192.svg', badge: '/icon-72x72.svg',
      tag: data.tag || 'gestao360', data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
