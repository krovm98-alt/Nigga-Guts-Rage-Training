const CACHE = "guts-rage-v5-production-1";
const ASSETS = [
  "./workout.css",
  "./exercise-config.js",
  "./",
  "./index.html",
  "./push.html",
  "./pull.html",
  "./legs.html",
  "./pwa.js",
  "./home.js",
  "./analytics.html",
  "./analytics.js",
  "./progression.js",
  "./storage.js",
  "./workout.js",
  "./push-data.js",
  "./pull-data.js",
  "./legs-data.js",
  "./theme.css",
  "./manifest.webmanifest",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
];
self.addEventListener("install", (e) =>
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS))),
);
self.addEventListener("message", (e) => {
  if (e.data?.type === "ACTIVATE") self.skipWaiting();
});
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((k) => k.startsWith("guts-rage-") && k !== CACHE)
            .map((k) => caches.delete(k)),
        ),
      )
      .then(() => self.clients.claim()),
  ),
);
self.addEventListener("fetch", (e) => {
  const req = e.request,
    url = new URL(req.url);
  if (
    req.method !== "GET" ||
    url.origin !== self.location.origin ||
    !url.href.startsWith(self.registration.scope)
  )
    return;
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      const key = new Request(url.origin + url.pathname);
      const stored = await cache.match(key);
      if (stored) return stored;
      try {
        return await fetch(req);
      } catch {
        return Response.error();
      }
    }),
  );
});
