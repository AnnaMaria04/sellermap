"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import type { Expense, FinanceState, TaxSettings } from "@/types/finance";
import { createClient } from "@/lib/supabase/client";
import type { Json } from "@/lib/supabase/database.types";

const STORAGE_KEY = "sellermap_finance";

const DEFAULT_TAX_SETTINGS: TaxSettings = {
  regime: "usn_income",
  hasEmployees: false,
};

function load(): FinanceState {
  if (typeof window === "undefined") {
    return { expenses: [], taxSettings: DEFAULT_TAX_SETTINGS };
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { expenses: [], taxSettings: DEFAULT_TAX_SETTINGS };
    return JSON.parse(raw) as FinanceState;
  } catch {
    return { expenses: [], taxSettings: DEFAULT_TAX_SETTINGS };
  }
}

function save(state: FinanceState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {}
}

/** Expenses persist to Supabase (org-scoped) when signed in; localStorage is the
 *  offline/no-session fallback. Tax settings stay local for now. */
export function useFinance() {
  const [state, setState] = useState<FinanceState>(load);
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
      if (cancelled || !profile?.org_id) return;
      orgId.current = profile.org_id;
      const { data: rows } = await sb.from("expenses").select("data").eq("org_id", profile.org_id);
      if (cancelled || !rows) return;
      const expenses = rows.map((r) => (r as { data: unknown }).data).filter((d): d is Expense => !!d);
      setState((prev) => {
        const next = { ...prev, expenses };
        save(next);
        return next;
      });
    })();
    return () => { cancelled = true; };
  }, []);

  function persistUpsert(e: Expense) {
    const org = orgId.current;
    const sb = supabase.current;
    if (!org || !sb) return;
    sb.from("expenses")
      .upsert(
        { org_id: org, app_id: e.id, data: e as unknown as Json, amount: e.amount, title: e.description || e.category, incurred_on: e.date },
        { onConflict: "org_id,app_id" },
      )
      .then(() => {}, () => {});
  }

  const addExpense = useCallback((expense: Omit<Expense, "id" | "createdAt">) => {
    const full: Expense = { ...expense, id: `exp-${Date.now()}`, createdAt: new Date().toISOString() };
    setState((prev) => {
      const next: FinanceState = { ...prev, expenses: [full, ...prev.expenses] };
      save(next);
      return next;
    });
    persistUpsert(full);
  }, []);

  const updateExpense = useCallback((id: string, patch: Partial<Expense>) => {
    setState((prev) => {
      const updated = prev.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e));
      const next: FinanceState = { ...prev, expenses: updated };
      save(next);
      const e = updated.find((x) => x.id === id);
      if (e) persistUpsert(e);
      return next;
    });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setState((prev) => {
      const next: FinanceState = { ...prev, expenses: prev.expenses.filter((e) => e.id !== id) };
      save(next);
      return next;
    });
    const org = orgId.current;
    const sb = supabase.current;
    if (org && sb) sb.from("expenses").delete().eq("org_id", org).eq("app_id", id).then(() => {}, () => {});
  }, []);

  const saveTaxSettings = useCallback((settings: TaxSettings) => {
    setState((prev) => {
      const next: FinanceState = { ...prev, taxSettings: settings };
      save(next);
      return next;
    });
  }, []);

  return {
    expenses: state.expenses,
    taxSettings: state.taxSettings,
    addExpense,
    updateExpense,
    deleteExpense,
    saveTaxSettings,
  };
}
