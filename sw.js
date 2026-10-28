/* Offline support for the Europe 2026 trip site. Generated from sw-template.js by build-trip.js. */
const VERSION = "20261028175412";
const SHELL = "eu26-shell-" + VERSION;
const DATA_CACHE = "eu26-data";
const SHELL_URLS = [
  "./", "./index.html", "./manifest.webmanifest", "./icon-192.png", "./icon-512.png", "./apple-touch-icon.png",
  "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css", "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
];
const DATA_HOSTS = ["raw.githubusercontent.com", "api.open-meteo.com", "transport.opendata.ch", "api.frankfurter.app", "open.er-api.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(SHELL).then((c) => Promise.all(SHELL_URLS.map((u) => c.add(new Request(u, { cache: "reload" })).catch(() => {})))));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("eu26-shell-") && k !== SHELL).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

function keyFor(url) {
  if (url.origin === self.location.origin) {
    let p = url.pathname;
    if (p.endsWith("/")) p += "index.html";
    return url.origin + p;
  }
  if (url.hostname === "raw.githubusercontent.com") return url.origin + url.pathname;
  return url.href;
}

function networkFirst(req, cacheName, key) {
  const sameOrigin = new URL(req.url).origin === self.location.origin;
  return fetch(sameOrigin ? new Request(req.url, { cache: "no-cache", credentials: "same-origin" }) : req)
    .then((res) => {
      if (res && (res.ok || res.type === "opaque")) {
        const copy = res.clone();
        caches.open(cacheName).then((c) => c.put(key, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() =>
      caches.match(key).then((hit) => hit || (req.mode === "navigate" ? caches.match(self.registration.scope + "index.html") : undefined))
        .then((hit) => hit || new Response("Offline and not cached yet.", { status: 503, headers: { "Content-Type": "text/plain" } }))
    );
}

function cacheFirst(req, cacheName) {
  return caches.match(req).then((hit) => hit || fetch(req).then((res) => {
    if (res && (res.ok || res.type === "opaque")) { const copy = res.clone(); caches.open(cacheName).then((c) => c.put(req, copy)); }
    return res;
  }));
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.hostname === "api.github.com") return;
  if (req.mode === "navigate" || url.origin === self.location.origin) {
    e.respondWith(networkFirst(req, SHELL, keyFor(url)));
    return;
  }
  if (DATA_HOSTS.includes(url.hostname)) {
    e.respondWith(networkFirst(req, DATA_CACHE, keyFor(url)));
    return;
  }
  if (url.hostname === "unpkg.com") {
    e.respondWith(cacheFirst(req, SHELL));
  }
});
