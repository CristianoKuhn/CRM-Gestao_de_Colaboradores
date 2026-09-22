/**
 * Service Worker — Gestão360 PWA
 *
 * Estratégia:
 *  - Shell do app (HTML, CSS, JS) → Cache First com atualização em background
 *  - Chamadas ao Google Apps Script (backend) → Network First com fallback de cache
 *  - Assets estáticos (ícones, fontes) → Cache First permanente
 *  - API Vercel (/api/*) → Network Only (dados sempre frescos)
 *
 * O SW permite que o app carregue instantaneamente após o primeiro acesso,
 * mesmo com conexão lenta, e mostre uma tela de offline amigável quando
 * não há conexão em vez de uma página de erro do navegador.
 */

const CACHE_VERSION = 'gestao360-v2';
const SHELL_CACHE = `${CACHE_VERSION}-shell`;
const DATA_CACHE  = `${CACHE_VERSION}-data`;

// Recursos do shell do app — carregados no install para garantir offline
const SHELL_URLS = [
  '/',
  '/index.html',
  '/manifest.json',
  '/icon-192x192.svg',
  '/icon-512x512.svg',
  '/favicon.svg',
];

// ── Install: pré-cacheia o shell ─────────────────────────────────────────────
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL_CACHE)
      .then((cache) => cache.addAll(SHELL_URLS))
      .then(() => self.skipWaiting())
      .catch((err) => console.warn('[SW] Falha no install:', err))
  );
});

// ── Activate: remove caches antigos ──────────────────────────────────────────
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(
        keys
          .filter((key) => key.startsWith('gestao360-') && key !== SHELL_CACHE && key !== DATA_CACHE)
          .map((key) => caches.delete(key))
      ))
      .then(() => self.clients.claim())
  );
});

// ── Fetch: estratégias por tipo de recurso ────────────────────────────────────
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar extensões do navegador e requests não-HTTP
  if (!url.protocol.startsWith('http')) return;

  // API Vercel (/api/*) → Network Only: dados sempre frescos
  if (url.pathname.startsWith('/api/')) {
    return; // deixa o navegador tratar normalmente
  }

  // Google Apps Script → Network First com fallback de cache de 5 minutos
  if (url.hostname.includes('script.google.com') || url.hostname.includes('googleapis.com')) {
    event.respondWith(networkFirstWithCache(request, DATA_CACHE, 300));
    return;
  }

  // Assets estáticos (JS, CSS, ícones, fontes) → Cache First
  if (
    url.pathname.match(/\.(js|css|svg|png|jpg|jpeg|woff2?|ttf|otf)$/) ||
    url.pathname.startsWith('/assets/')
  ) {
    event.respondWith(cacheFirst(request, SHELL_CACHE));
    return;
  }

  // Navegação (HTML) → Network First com fallback para shell
  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request)
        .catch(() => caches.match('/index.html').then((r) => r || offlinePage()))
    );
    return;
  }

  // Demais requests → Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request, SHELL_CACHE));
});

// ── Estratégias de cache ──────────────────────────────────────────────────────

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

async function networkFirstWithCache(request, cacheName, maxAgeSeconds) {
  // A Cache API não suporta requests POST (restrição da spec do browser).
  // Requests POST ao GAS são sempre Network Only — o resultado varia por payload.
  if (request.method !== 'GET') {
    try {
      return await fetch(request);
    } catch {
      return new Response(
        JSON.stringify({ success: false, offline: true, message: 'Sem conexão com a internet.' }),
        { headers: { 'Content-Type': 'application/json' }, status: 503 }
      );
    }
  }

  // Apenas GET: Network First com fallback de cache
  try {
    const response = await fetch(request.clone());
    if (response.ok) {
      const cache = await caches.open(cacheName);
      const responseToCache = response.clone();
      const headers = new Headers(responseToCache.headers);
      headers.set('sw-cached-at', Date.now().toString());
      cache.put(request, new Response(await responseToCache.blob(), { headers, status: response.status }));
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

async function staleWhileRevalidate(request, cacheName) {
  // POST não pode ser cacheado — Network Only
  if (request.method !== 'GET') {
    return fetch(request).catch(() =>
      new Response('Sem conexão.', { status: 503 })
    );
  }
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  return cached || fetchPromise || offlinePage();
}

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
</html>`, {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
    status: 200,
  });
}

// ── Background Sync (futuro) ──────────────────────────────────────────────────
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-pendentes') {
    // Placeholder para sincronização de dados pendentes quando a conexão voltar
    event.waitUntil(Promise.resolve());
  }
});

// ── Push Notifications (futuro) ──────────────────────────────────────────────
self.addEventListener('push', (event) => {
  if (!event.data) return;
  const data = event.data.json();
  event.waitUntil(
    self.registration.showNotification(data.title || 'Gestão360', {
      body: data.body || '',
      icon: '/icon-192x192.svg',
      badge: '/icon-72x72.svg',
      tag: data.tag || 'gestao360',
      data: { url: data.url || '/' },
    })
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow(event.notification.data?.url || '/'));
});
