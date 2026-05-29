"use client";

import { useEffect } from "react";

/**
 * Registers the network-first service worker (public/sw.js). It never serves a
 * cached HTML shell while online — navigations go to the network and only fall
 * back to /offline.html when truly offline — so the old "stale shell broke
 * /login" regression can't recur. Only Next's content-hashed assets are cached.
 */
export function PWARegister() {
  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const register = () => { navigator.serviceWorker.register("/sw.js").catch(() => {}); };
    if (document.readyState === "complete") register();
    else window.addEventListener("load", register, { once: true });
  }, []);

  return null;
}
