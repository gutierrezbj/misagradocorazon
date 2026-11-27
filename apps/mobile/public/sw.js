// Service worker de la beta web (SDD-05 US-27, ADR-016). Hace la app instalable y rápida al volver:
// - los ficheros con hash del build (/_expo/static/...) se sirven desde caché;
// - la página se pide siempre a la red y solo se usa la copia si no hay conexión;
// - nada de la API: va a otro dominio y nunca se guarda (datos personales, GDPR art. 9).
// v2: v1 podía guardar como "/" el aviso de privacidad o los términos; al activar se borra.
const CACHE = "msc-web-v2";
// Páginas estáticas (aviso de privacidad y términos): no son la app y no se guardan como "/".
const STATIC_PAGES = ["/privacidad/", "/terminos/", "/fonts/"];
const SHELL = ["/", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method !== "GET" || url.origin !== self.location.origin) return;

  if (STATIC_PAGES.some((p) => url.pathname.startsWith(p) || url.pathname === p.slice(0, -1))) return;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put("/", copy));
          return res;
        })
        .catch(() => caches.match("/")),
    );
    return;
  }

  if (url.pathname.startsWith("/_expo/static/") || url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then(
        (hit) =>
          hit ||
          fetch(req).then((res) => {
            if (res.ok) {
              const copy = res.clone();
              caches.open(CACHE).then((c) => c.put(req, copy));
            }
            return res;
          }),
      ),
    );
  }
});
