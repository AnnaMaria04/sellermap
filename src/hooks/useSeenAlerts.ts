"use client";

import { useState, useCallback } from "react";

const STORAGE_KEY = "sellermap_seen_alerts";

/** Tracks which alert ids the user has already viewed (opened the
 *  notifications page). Drives the "unread" badge separately from dismissal. */
export function useSeenAlerts() {
  const [seen, setSeen] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const markSeen = useCallback((ids: string[]) => {
    setSeen((prev) => {
      if (ids.every((id) => prev.has(id))) return prev;
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
  }, []);

  return { seen, markSeen };
}
