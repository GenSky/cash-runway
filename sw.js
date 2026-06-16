const CACHE_NAME = "bumi-v27";
const APP_SHELL = [
  "./",
  "./index.html",
  "./privacy.html",
  "./terms.html",
  "./styles.css?v=27",
  "./app.js?v=27",
  "./assets/bumi-icon.svg",
  "./assets/bumi-logo.svg",
  "./manifest.json",
  "./icon.svg",
];

function cacheFreshResponse(request) {
  return fetch(request).then((response) => {
    const copy = response.clone();
    caches.open(CACHE_NAME).then((cache) => cache.put(request, copy));
    return response;
  });
}

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const url = new URL(event.request.url);
  const isSameOrigin = url.origin === self.location.origin;
  const isAppShellAsset =
    isSameOrigin &&
    APP_SHELL.some((path) => new URL(path, self.registration.scope).pathname === url.pathname);

  if (event.request.mode === "navigate" || isAppShellAsset) {
    event.respondWith(
      cacheFreshResponse(event.request).catch(
        () => caches.match(event.request).then((cached) => cached || caches.match("./index.html"))
      )
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return cacheFreshResponse(event.request).catch(() => caches.match("./index.html"));
    })
  );
});
