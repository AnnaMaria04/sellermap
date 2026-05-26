"use client";

import { useState, useCallback } from "react";
import type { Expense, FinanceState, TaxSettings } from "@/types/finance";

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

export function useFinance() {
  const [state, setState] = useState<FinanceState>(load);

  const addExpense = useCallback((expense: Omit<Expense, "id" | "createdAt">) => {
    setState((prev) => {
      const next: FinanceState = {
        ...prev,
        expenses: [
          {
            ...expense,
            id: `exp-${Date.now()}`,
            createdAt: new Date().toISOString(),
          },
          ...prev.expenses,
        ],
      };
      save(next);
      return next;
    });
  }, []);

  const updateExpense = useCallback((id: string, patch: Partial<Expense>) => {
    setState((prev) => {
      const next: FinanceState = {
        ...prev,
        expenses: prev.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      };
      save(next);
      return next;
    });
  }, []);

  const deleteExpense = useCallback((id: string) => {
    setState((prev) => {
      const next: FinanceState = {
        ...prev,
        expenses: prev.expenses.filter((e) => e.id !== id),
      };
      save(next);
      return next;
    });
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
