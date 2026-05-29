"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { logAlertEvent } from "@/lib/inventory/alert-history";

const STORAGE_KEY = "sellermap_dismissed_alerts";

export function useDismissedAlerts() {
  // Best-effort durable mirror (G21): localStorage stays the live source of
  // truth; dismissals are also written to alert_history when signed in.
  const supabase = useRef<ReturnType<typeof createClient>>(null);
  const orgId = useRef<string | null>(null);

  useEffect(() => {
    supabase.current = createClient();
    const sb = supabase.current;
    if (!sb) return;
    let cancelled = false;
    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || cancelled) return;
      const { data: profile } = await sb.from("profiles").select("org_id").eq("id", user.id).single();
      if (!cancelled) orgId.current = profile?.org_id ?? null;
    })();
    return () => { cancelled = true; };
  }, []);

  const persistDismissed = useCallback((ids: string[]) => {
    const sb = supabase.current;
    if (!sb) return;
    for (const id of ids) {
      void logAlertEvent(sb, orgId.current, { alertId: id, event: "dismissed" }).catch(() => {});
    }
  }, []);

  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? new Set<string>(JSON.parse(raw) as string[]) : new Set();
    } catch {
      return new Set();
    }
  });

  const dismiss = useCallback((id: string) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(id);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
    persistDismissed([id]);
  }, [persistDismissed]);

  const dismissAll = useCallback((ids: string[]) => {
    setDismissed((prev) => {
      const next = new Set(prev);
      ids.forEach((id) => next.add(id));
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify([...next]));
      } catch {}
      return next;
    });
    persistDismissed(ids);
  }, [persistDismissed]);

  return { dismissed, dismiss, dismissAll };
}
