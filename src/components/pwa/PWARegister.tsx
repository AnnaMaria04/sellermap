"use client";

import { useEffect } from "react";

/**
 * PWA cleanup. We previously registered a caching service worker that could
 * serve a stale app shell and break client-rendered pages (e.g. /login).
 * This unregisters any installed service worker and clears its caches on load,
 * so users recover automatically. (Install/offline can return later with a
 * properly tested SW.)
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === "undefined") return;
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistrations()
        .then((regs) => regs.forEach((r) => r.unregister()))
        .catch(() => {});
    }
    if (typeof caches !== "undefined") {
      caches.keys().then((keys) => keys.forEach((k) => caches.delete(k))).catch(() => {});
    }
  }, []);

  return null;
}
