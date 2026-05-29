"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";

/** The five setup milestones a new seller completes to reach first value. */
export interface SetupStatus {
  marketplace: boolean;
  catalog: boolean;
  location: boolean;
  payments: boolean;
  taxes: boolean;
}

export interface GettingStartedState {
  loading: boolean;
  orgId: string | null;
  workspaceName: string;
  status: SetupStatus;
  doneCount: number;
  total: number;
  /** Persist a new workspace name to organizations.name. */
  renameWorkspace: (name: string) => Promise<void>;
}

const EMPTY: SetupStatus = {
  marketplace: false,
  catalog: false,
  location: false,
  payments: false,
  taxes: false,
};

/**
 * Reads the workspace setup state from Supabase (read-only except the workspace
 * rename) and derives each checklist milestone. Falls back to a clean
 * "nothing set up yet" state offline, which is exactly the new-user view.
 */
export function useSetupStatus(): GettingStartedState {
  const [loading, setLoading] = useState(true);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [workspaceName, setWorkspaceName] = useState<string>("Мой магазин");
  const [status, setStatus] = useState<SetupStatus>(EMPTY);
  const supabase = useRef<ReturnType<typeof createClient>>(null);

  useEffect(() => {
    supabase.current = createClient();
    const sb = supabase.current;
    if (!sb) {
      setLoading(false);
      return;
    }
    let cancelled = false;

    (async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (cancelled || !user) {
        setLoading(false);
        return;
      }
      const { data: profile } = await sb.from("profiles").select("org_id").eq("id", user.id).single();
      const org = profile?.org_id ?? null;
      if (cancelled || !org) {
        setLoading(false);
        return;
      }
      setOrgId(org);

      const countOf = (table: "products" | "locations") =>
        sb.from(table).select("id", { count: "exact", head: true }).eq("org_id", org);

      const [orgRow, integrations, products, locations, settings] = await Promise.all([
        sb.from("organizations").select("name").eq("id", org).maybeSingle(),
        sb.from("integrations").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
        countOf("products"),
        countOf("locations"),
        sb.from("org_settings").select("tax_regime, receipt_print_default, manager_pin_hash").eq("org_id", org).maybeSingle(),
      ]);

      if (cancelled) return;

      if (orgRow.data?.name) setWorkspaceName(orgRow.data.name);

      const s = settings.data;
      setStatus({
        marketplace: (integrations.count ?? 0) > 0,
        catalog: (products.count ?? 0) > 0,
        location: (locations.count ?? 0) > 0,
        payments: !!(s && (s.receipt_print_default || s.manager_pin_hash)),
        taxes: !!(s && s.tax_regime),
      });
      setLoading(false);
    })().catch(() => setLoading(false));

    return () => { cancelled = true; };
  }, []);

  const renameWorkspace = useCallback(async (name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setWorkspaceName(trimmed);
    const sb = supabase.current;
    if (sb && orgId) {
      await sb.from("organizations").update({ name: trimmed }).eq("id", orgId);
    }
  }, [orgId]);

  const doneCount = Object.values(status).filter(Boolean).length;

  return { loading, orgId, workspaceName, status, doneCount, total: 5, renameWorkspace };
}
