// Do not cache private profiles, messages, authentication or API responses.
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('fetch', event => {
  if (event.request.mode !== 'navigate' || event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  event.respondWith(fetch(event.request).catch(() => new Response('<!doctype html><html lang="tr"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>SCENE</title><body style="background:#fff7f3;color:#790e25;font-family:system-ui;text-align:center;padding:48px"><h1>SCENE</h1><p>İnternet bağlantını kontrol et.</p><button onclick="location.reload()">Tekrar dene</button></body></html>', {headers:{'Content-Type':'text/html; charset=utf-8'},status:503})));
});