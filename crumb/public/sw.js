// Crumb service worker: the app keeps working offline with what it has already seen.
// Build-specific values are filled in by scripts/postbuild.mjs.
const VERSION = "__VERSION__";
const SHELL = __SHELL__;
const SHELL_CACHE = `crumb-shell-${VERSION}`;
const DATA_CACHE = "crumb-data";
const IMG_CACHE = "crumb-img";
const MAX_IMAGES = 240;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(SHELL_CACHE)
      .then((c) => c.addAll(SHELL))
      .then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("crumb-shell-") && k !== SHELL_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

async function trim(cacheName, max) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  for (const k of keys.slice(0, Math.max(0, keys.length - max))) await cache.delete(k);
}

async function networkFirst(req, cacheName) {
  const cache = await caches.open(cacheName);
  try {
    const res = await fetch(req);
    if (res.ok) cache.put(req, res.clone());
    return res;
  } catch (e) {
    const hit = await cache.match(req, { ignoreSearch: true });
    if (hit) return hit;
    throw e;
  }
}

async function cacheFirst(req, cacheName, max) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  if (res.ok) {
    await cache.put(req, res.clone());
    if (max) trim(cacheName, max);
  }
  return res;
}

async function staleWhileRevalidate(req, cacheName) {
  const cache = await caches.open(cacheName);
  const hit = await cache.match(req);
  const fresh = fetch(req)
    .then((res) => {
      if (res.ok) cache.put(req, res.clone());
      return res;
    })
    .catch(() => hit);
  return hit ?? fresh;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;
  const scope = new URL(self.registration.scope).pathname;
  const path = url.pathname.startsWith(scope) ? url.pathname.slice(scope.length) : url.pathname;

  if (req.mode === "navigate") {
    event.respondWith(
      fetch(req).catch(async () => (await caches.match(req, { ignoreSearch: true })) ?? (await caches.match(scope)) ?? caches.match(scope + "index.html")),
    );
  } else if (path === "content/index.json" || path.startsWith("content/schedule/")) {
    event.respondWith(networkFirst(req, DATA_CACHE));
  } else if (path.startsWith("content/t/")) {
    event.respondWith(staleWhileRevalidate(req, DATA_CACHE));
  } else if (path.startsWith("img/")) {
    event.respondWith(cacheFirst(req, IMG_CACHE, MAX_IMAGES));
  } else if (path.startsWith("assets/")) {
    event.respondWith(cacheFirst(req, SHELL_CACHE));
  }
});
