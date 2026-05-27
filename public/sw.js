// Kill-switch service worker. A previous version cached the app shell and could
// serve a stale build (mismatched JS chunks) — which broke client-rendered
// pages like /login. This version caches nothing, clears all caches, and
// unregisters itself so any client still running the old SW recovers.
self.addEventListener("install", () => self.skipWaiting());

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      try {
        const keys = await caches.keys();
        await Promise.all(keys.map((k) => caches.delete(k)));
        await self.registration.unregister();
        const clients = await self.clients.matchAll({ type: "window" });
        clients.forEach((c) => c.navigate(c.url));
      } catch {
        // ignore
      }
    })(),
  );
});
// No fetch handler — all requests go straight to the network.
