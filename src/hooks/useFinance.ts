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
export interface ExpenseCategory {
  id: string;
  name: string;
}

export function useFinance() {
  const [state, setState] = useState<FinanceState>(load);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const supabase = useRef<ReturnType<typeof createClient>>(null);
  const orgId = useRef<string | null>(null);
  // Ref mirror so async category resolution always sees the latest list.
  const categoriesRef = useRef<ExpenseCategory[]>([]);
  useEffect(() => { categoriesRef.current = categories; }, [categories]);

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
      const [{ data: rows }, { data: cats }] = await Promise.all([
        sb.from("expenses").select("data").eq("org_id", profile.org_id),
        sb.from("expense_categories").select("id, name").eq("org_id", profile.org_id),
      ]);
      if (cancelled) return;
      if (rows) {
        const expenses = rows.map((r) => (r as { data: unknown }).data).filter((d): d is Expense => !!d);
        setState((prev) => {
          const next = { ...prev, expenses };
          save(next);
          return next;
        });
      }
      if (cats) setCategories(cats as ExpenseCategory[]);
    })();
    return () => { cancelled = true; };
  }, []);

  /** Resolve (creating on demand) the expense_categories row for a name. */
  async function ensureCategoryId(name?: string): Promise<string | null> {
    const org = orgId.current;
    const sb = supabase.current;
    if (!org || !sb || !name) return null;
    const existing = categoriesRef.current.find((c) => c.name === name);
    if (existing) return existing.id;
    const { data } = await sb
      .from("expense_categories")
      .insert({ org_id: org, name })
      .select("id, name")
      .single();
    if (data) {
      const cat = data as ExpenseCategory;
      categoriesRef.current = [...categoriesRef.current, cat];
      setCategories(categoriesRef.current);
      return cat.id;
    }
    return null;
  }

  async function persistUpsert(e: Expense) {
    const org = orgId.current;
    const sb = supabase.current;
    if (!org || !sb) return;
    const categoryId = await ensureCategoryId(e.category);
    sb.from("expenses")
      .upsert(
        { org_id: org, app_id: e.id, data: e as unknown as Json, amount: e.amount, title: e.description || e.category, incurred_on: e.date, category_id: categoryId },
        { onConflict: "org_id,app_id" },
      )
      .then(() => {}, () => {});
  }

  const addCategory = useCallback((name: string) => {
    void ensureCategoryId(name);
  }, []);

  const deleteCategory = useCallback((id: string) => {
    const org = orgId.current;
    const sb = supabase.current;
    setCategories((prev) => prev.filter((c) => c.id !== id));
    if (org && sb) sb.from("expense_categories").delete().eq("org_id", org).eq("id", id).then(() => {}, () => {});
  }, []);

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
    categories,
    addExpense,
    updateExpense,
    deleteExpense,
    addCategory,
    deleteCategory,
    saveTaxSettings,
  };
}
