"use client";

import { useState, useCallback, useEffect } from "react";

const STORAGE_KEY = "sellermap_dismissed_cards";

function load(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set();
  } catch {
    return new Set();
  }
}

/** Tracks which getting-started cards the user dismissed; persisted locally. */
export function useDismissedCards() {
  const [dismissed, setDismissed] = useState<Set<string>>(load);

  // Re-read on mount so SSR (empty set) hydrates to the stored value.
  useEffect(() => { setDismissed(load()); }, []);

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify([...next])); } catch {}
      return next;
    });
  }, []);

  const isDismissed = useCallback((id: string) => dismissed.has(id), [dismissed]);

  return { isDismissed, dismiss };
}
