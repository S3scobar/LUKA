// sw.js — service worker mínimo de LUKA
// Objetivo: hacer la app instalable y que abra rápido/offline sin servir datos viejos.
// - Navegaciones (HTML): red primero, con el shell cacheado como respaldo si no hay conexión.
// - Estáticos propios (css/js/iconos): stale-while-revalidate, se actualizan en segundo plano.
// - Nada de Supabase ni CDNs externos pasa por caché: siempre va a la red.

const CACHE = "luka-shell-v1";
const SHELL = [
  "/",
  "/index.html",
  "/css/main.css",
  "/css/components.css",
  "/css/views.css",
  "/css/glass.css",
  "/css/splash.css",
  "/js/main.js",
  "/favicon.svg",
  "/icon-192.png",
  "/icon-512.png",
  "/manifest.webmanifest"
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE).then((cache) => cache.addAll(SHELL)).catch(() => {}).then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skip-waiting") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  const url = new URL(req.url);

  // Solo gestionamos nuestro propio origen; Supabase, Font Awesome, etc. van directo a la red.
  if (url.origin !== self.location.origin) return;

  // Navegaciones: red primero (para no quedarnos con una versión vieja), shell como respaldo offline.
  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/index.html", copy));
          return res;
        })
        .catch(() => caches.match("/index.html").then((r) => r || caches.match("/")))
    );
    return;
  }

  // Estáticos propios: responde de caché al instante y revalida en segundo plano.
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200 && res.type === "basic") {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached);
      return cached || network;
    })
  );
});
