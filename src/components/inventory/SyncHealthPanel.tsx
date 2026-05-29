"use client";

import { useEffect, useMemo, useState } from "react";
import {
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Plug,
  Activity,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { loadIntegrations, type PersistedIntegration } from "@/lib/supabase/integrations-store";
import { cn } from "@/lib/utils";

/**
 * F18: a dedicated sync-health view. Previously sync status only surfaced as a
 * relative-time badge inside the IntegrationHub cards. This consolidates every
 * connected channel's freshness, status and cadence into one operational panel.
 */

type Health = "healthy" | "stale" | "error" | "never";

function relativeTime(iso?: string): string {
  if (!iso) return "никогда";
  const diffMs = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diffMs / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин назад`;
  const hrs = Math.floor(min / 60);
  if (hrs < 24) return `${hrs} ч назад`;
  const days = Math.floor(hrs / 24);
  return `${days} дн назад`;
}

function healthOf(i: PersistedIntegration): Health {
  if (i.status === "error") return "error";
  if (!i.lastSyncAt) return "never";
  const ageMin = (Date.now() - new Date(i.lastSyncAt).getTime()) / 60000;
  // Stale once the sync is older than ~3x its configured interval.
  const budget = Math.max(i.intervalMinutes, 15) * 3;
  return ageMin > budget ? "stale" : "healthy";
}

const HEALTH_CONFIG: Record<Health, { label: string; color: string; bg: string; Icon: typeof CheckCircle2 }> = {
  healthy: { label: "В норме", color: "var(--c-green)", bg: "bg-green-500/10", Icon: CheckCircle2 },
  stale: { label: "Устарело", color: "var(--c-amber)", bg: "bg-amber-500/10", Icon: Clock },
  error: { label: "Ошибка", color: "var(--c-red)", bg: "bg-red-500/10", Icon: XCircle },
  never: { label: "Нет синхр.", color: "var(--c-text3)", bg: "bg-[var(--c-bg3)]", Icon: AlertTriangle },
};

export function SyncHealthPanel() {
  const [integrations, setIntegrations] = useState<PersistedIntegration[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshedAt, setRefreshedAt] = useState<Date>(new Date());

  async function refresh() {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }
    try {
      const { data } = await supabase.auth.getUser();
      const userId = data.user?.id;
      if (!userId) return;
      const rows = await loadIntegrations(supabase, userId);
      setIntegrations(rows);
      setRefreshedAt(new Date());
    } catch {
      /* offline — leave empty */
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const summary = useMemo(() => {
    const counts: Record<Health, number> = { healthy: 0, stale: 0, error: 0, never: 0 };
    for (const i of integrations) counts[healthOf(i)]++;
    return counts;
  }, [integrations]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-[var(--c-blue)]" />
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Состояние синхронизации</h2>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
        >
          <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} /> Обновить
        </button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {(Object.keys(HEALTH_CONFIG) as Health[]).map((h) => {
          const { label, color, bg, Icon } = HEALTH_CONFIG[h];
          return (
            <div key={h} className={cn("rounded-xl border border-[var(--c-border)] p-4", bg)}>
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4" style={{ color }} />
                <span className="text-xs text-[var(--c-text2)]">{label}</span>
              </div>
              <div className="mt-1 text-2xl font-bold tabular" style={{ color }}>
                {summary[h]}
              </div>
            </div>
          );
        })}
      </div>

      {/* Per-channel table */}
      <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        {integrations.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-4 py-12 text-center text-sm text-[var(--c-text2)]">
            <Plug className="h-6 w-6 text-[var(--c-text3)]" />
            {loading ? "Загрузка…" : "Нет подключённых интеграций."}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--c-border)] text-left text-xs uppercase text-[var(--c-text3)]">
                <th className="px-4 py-2.5 font-medium">Канал</th>
                <th className="px-4 py-2.5 font-medium">Статус</th>
                <th className="px-4 py-2.5 font-medium">Последняя синхр.</th>
                <th className="px-4 py-2.5 font-medium">Интервал</th>
                <th className="px-4 py-2.5 font-medium">Автосинхр.</th>
              </tr>
            </thead>
            <tbody>
              {integrations.map((i) => {
                const h = healthOf(i);
                const { label, color, Icon } = HEALTH_CONFIG[h];
                return (
                  <tr key={i.id || i.kind} className="border-b border-[var(--c-border)] last:border-0">
                    <td className="px-4 py-3 font-medium text-[var(--c-text)]">{i.name}</td>
                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1.5" style={{ color }}>
                        <Icon className="h-3.5 w-3.5" /> {label}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-[var(--c-text2)]">{relativeTime(i.lastSyncAt)}</td>
                    <td className="px-4 py-3 text-[var(--c-text2)]">{i.intervalMinutes} мин</td>
                    <td className="px-4 py-3 text-[var(--c-text2)]">{i.autoSync ? "Вкл" : "Выкл"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
      <p className="text-xs text-[var(--c-text3)]">
        Обновлено: {refreshedAt.toLocaleTimeString("ru-RU")}
      </p>
    </div>
  );
}
