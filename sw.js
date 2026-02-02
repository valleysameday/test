const CACHE_NAME = "rctx-cache-v1";

const ASSETS = [
  "/",
  "/offline.html",
  "/manifest.json",
  "/main.css",
  "/main.js"
];

// Install → cache core files
self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

// Activate → cleanup old caches
self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// Fetch → cache first, fallback offline
self.addEventListener("fetch", event => {
  event.respondWith(
    caches.match(event.request).then(res => {
      return res || fetch(event.request).catch(() => caches.match("/offline.html"));
    })
  );
});
