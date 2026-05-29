/**
 * Analytics targets — a saved goal for a metric over a period, optionally
 * pinned to the dashboard. Persisted to localStorage (no backend dependency),
 * mirroring the storefront-settings pattern.
 */
export interface AnalyticsTarget {
  id: string;
  metric: string;        // METRICS key
  amount: number;        // target value
  period: string;        // human label, e.g. "Май 2026"
  name: string;          // display name, e.g. "Цель на май"
  onDashboard: boolean;  // pinned to the dashboard
  createdAt: string;
}

export const TARGETS_KEY = "sellermap_analytics_targets";

export function loadTargets(): AnalyticsTarget[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(TARGETS_KEY);
    return raw ? (JSON.parse(raw) as AnalyticsTarget[]) : [];
  } catch {
    return [];
  }
}

export function saveTargets(targets: AnalyticsTarget[]) {
  try {
    localStorage.setItem(TARGETS_KEY, JSON.stringify(targets));
  } catch {
    // Storage unavailable (private mode / quota) — non-fatal.
  }
}

export function addTarget(target: AnalyticsTarget): AnalyticsTarget[] {
  const next = [target, ...loadTargets()];
  saveTargets(next);
  return next;
}

export function removeTarget(id: string): AnalyticsTarget[] {
  const next = loadTargets().filter((t) => t.id !== id);
  saveTargets(next);
  return next;
}
