"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "pwa_dismiss_until";

export function PWARegister() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);
  const [show, setShow] = useState(false);

  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
    function onBip(e: Event) {
      e.preventDefault();
      setDeferred(e as BeforeInstallPromptEvent);
      const until = Number(localStorage.getItem(DISMISS_KEY) || "0");
      if (Date.now() > until) setShow(true);
    }
    window.addEventListener("beforeinstallprompt", onBip as EventListener);
    return () => window.removeEventListener("beforeinstallprompt", onBip as EventListener);
  }, []);

  async function install() {
    if (!deferred) return;
    await deferred.prompt();
    await deferred.userChoice.catch(() => {});
    setShow(false);
    setDeferred(null);
  }

  function later() {
    localStorage.setItem(DISMISS_KEY, String(Date.now() + 7 * 86400000));
    setShow(false);
  }

  if (!show) return null;

  return (
    <div className="fixed inset-x-3 bottom-3 z-[60] mx-auto flex max-w-md items-center gap-3 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-3 shadow-2xl sm:left-auto sm:right-4 sm:mx-0">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[var(--c-green-dim)] text-[var(--c-green)]">
        <Download size={18} />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium text-[var(--c-text)]">Добавьте SellerMap на экран</p>
        <p className="text-xs text-[var(--c-text3)]">Работает как приложение — быстрее и удобнее</p>
      </div>
      <button
        onClick={install}
        className="shrink-0 rounded-lg bg-[var(--c-green)] px-3 py-2 text-sm font-semibold text-[var(--c-bg)]"
      >
        Установить
      </button>
      <button onClick={later} aria-label="Не сейчас" className="shrink-0 text-[var(--c-text3)] hover:text-[var(--c-text)]">
        <X size={18} />
      </button>
    </div>
  );
}
