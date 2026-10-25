// Service worker de Keycap Studio.
//   · Archivos con huella en el nombre (/assets/…) y modelos/fuentes: caché primero (nunca cambian).
//   · Página y textos: red primero, con la copia en caché como respaldo sin conexión.
//   · /api/ nunca se guarda: son datos vivos del servidor.
// Una versión nueva queda "en espera" hasta que el usuario la acepta (mensaje SKIP_WAITING).
const VERSION = new URL(self.location.href).searchParams.get("v") ?? "0";
const CACHE = `keycap-studio-${VERSION}`;

self.addEventListener("install", () => { /* se activa cuando la aplicación lo pide */ });

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key.startsWith("keycap-studio-") && key !== CACHE).map((key) => caches.delete(key))))
      .then(() => self.clients.claim()),
  );
});

const immutable = (url) => url.pathname.includes("/assets/") || url.pathname.includes("/models/") || url.pathname.endsWith(".woff2");

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin || url.pathname.includes("/api/")) return;
  if (immutable(url)) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request).then((response) => {
      if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {}); }
      return response;
    })));
    return;
  }
  event.respondWith(
    fetch(request)
      .then((response) => {
        if (response.ok) { const copy = response.clone(); caches.open(CACHE).then((cache) => cache.put(request, copy)).catch(() => {}); }
        return response;
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("./"))),
  );
});
