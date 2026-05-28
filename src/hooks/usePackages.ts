"use client";

import { useCallback, useEffect, useState } from "react";

/** Reusable shipping package: dimensions + weight (the actual product weight
 *  goes on the product itself; the package is the box used to ship it). */
export interface Package {
  id: string;
  name: string;
  length?: number;   // cm
  width?: number;
  height?: number;
  weight?: number;   // kg, the empty package weight (optional)
  isDefault?: boolean;
}

const STORAGE_KEY = "sellermap_packages";

export function usePackages() {
  const [packages, setPackages] = useState<Package[]>([]);
  const [loaded, setLoaded] = useState(false);

  // Lazy load from localStorage on mount (avoids SSR hydration mismatch).
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) setPackages(JSON.parse(raw) as Package[]);
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  const persist = useCallback((next: Package[]) => {
    setPackages(next);
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }, []);

  const addPackage = useCallback((p: Omit<Package, "id">) => {
    const id = `pkg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const created: Package = { id, ...p };
    setPackages((prev) => {
      // If this one is marked default, clear others' default flag.
      const next = (created.isDefault ? prev.map((x) => ({ ...x, isDefault: false })) : prev).concat(created);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
    return created;
  }, []);

  const updatePackage = useCallback((id: string, patch: Partial<Package>) => {
    setPackages((prev) => {
      const next = prev.map((p) => (p.id === id ? { ...p, ...patch } : p));
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  const removePackage = useCallback((id: string) => {
    setPackages((prev) => {
      const next = prev.filter((p) => p.id !== id);
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); } catch { /* ignore */ }
      return next;
    });
  }, []);

  return { packages, addPackage, updatePackage, removePackage, loaded, persist };
}
