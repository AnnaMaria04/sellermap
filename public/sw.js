// SellerMap service worker — network-first, shell-safe.
//
// History: a previous SW cached the HTML app shell and served stale JS chunks,
// breaking client-rendered pages like /login. This version NEVER serves a cached
// HTML document while online: navigations are network-first and only fall back
// to an offline page when the network is truly unreachable. Only Next's
// content-hashed static assets (immutable, filename changes per build) are
// cached, so a stale shell can't happen again.

const VERSION = "v2";
const STATIC_CACHE = `sm-static-${VERSION}`;
const OFFLINE_URL = "/offline.html";

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(STATIC_CACHE).then((c) => c.add(OFFLINE_URL)).then(() => self.skipWaiting()),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== STATIC_CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  );
});

// Only cache-first these immutable, content-hashed asset paths.
function isHashedAsset(url) {
  return (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname === "/manifest.webmanifest" ||
    /\.(?:js|css|woff2?|ttf|otf|png|jpg|jpeg|svg|gif|webp|ico)$/.test(url.pathname)
  );
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return; // never touch cross-origin (Supabase, WB, etc.)

  // Navigations / HTML documents: network-first, offline fallback. Never serve a
  // cached shell while online — this is what previously broke /login.
  if (request.mode === "navigate") {
    event.respondWith(
      (async () => {
        try {
          return await fetch(request);
        } catch {
          return (await caches.match(OFFLINE_URL)) ?? Response.error();
        }
      })(),
    );
    return;
  }

  // Content-hashed static assets: cache-first with background fill.
  if (isHashedAsset(url)) {
    event.respondWith(
      (async () => {
        const cached = await caches.match(request);
        if (cached) return cached;
        try {
          const res = await fetch(request);
          if (res.ok && res.type === "basic") {
            const cache = await caches.open(STATIC_CACHE);
            cache.put(request, res.clone());
          }
          return res;
        } catch {
          return Response.error();
        }
      })(),
    );
    return;
  }

  // Everything else (API routes, _next/data, etc.): straight to network.
});
