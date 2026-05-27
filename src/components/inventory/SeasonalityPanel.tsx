"use client";

import { useMemo } from "react";
import { CalendarClock, TrendingUp, Sparkles, Info } from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
} from "recharts";
import { useInventory } from "@/contexts/InventoryContext";
import {
  upcomingEvents, salesByWeek, forecastWeeks, hasEnoughHistory,
} from "@/lib/inventory/seasonality";
import { formatDateRu } from "@/lib/utils";

export function SeasonalityPanel() {
  const { movements } = useInventory();
  const now = useMemo(() => new Date(), []);

  const events = useMemo(() => upcomingEvents(now, 60), [now]);
  const weekly = useMemo(() => salesByWeek(movements, 26, now), [movements, now]);
  const forecast = useMemo(() => forecastWeeks(movements, { weeks: 4, now }), [movements, now]);
  const enough = useMemo(() => hasEnoughHistory(movements), [movements]);

  const weeklyChart = weekly.map((w) => ({
    label: new Date(w.weekStart).toLocaleDateString("ru-RU", { day: "numeric", month: "short" }),
    units: w.units,
  }));
  const totalSold = weekly.reduce((s, w) => s + w.units, 0);

  return (
    <div className="space-y-8">
      {/* ── Upcoming demand events (Russian calendar) ─────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <CalendarClock size={16} className="text-[var(--c-green)]" />
          <h2 className="text-base font-semibold text-[var(--c-text)]">Ближайшие события спроса</h2>
        </div>
        {events.length === 0 ? (
          <p className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5 text-sm text-[var(--c-text3)]">
            В ближайшие 60 дней крупных событий спроса нет.
          </p>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {events.map(({ event, date, daysUntil }) => (
              <div key={event.id} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-[var(--c-text)]">{event.name}</p>
                  <span className="shrink-0 rounded-full bg-[var(--c-bg3)] px-2 py-0.5 text-xs font-medium text-[var(--c-text2)]">
                    через {daysUntil} дн.
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-[var(--c-text3)]">{formatDateRu(date.toISOString())}</p>
                <p className="mt-2 text-xs text-[var(--c-text2)]">{event.hint}</p>
                <div className="mt-2 flex flex-wrap gap-1">
                  {event.categories.map((c) => (
                    <span key={c} className="rounded-md bg-[var(--c-green-dim)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--c-green)]">{c}</span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Weekly sales (last 26 weeks) ──────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <TrendingUp size={16} className="text-[var(--c-blue)]" />
          <h2 className="text-base font-semibold text-[var(--c-text)]">Продажи по неделям</h2>
          <span className="text-xs text-[var(--c-text3)]">· {totalSold} шт за 26 недель</span>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          {totalSold === 0 ? (
            <p className="py-10 text-center text-sm text-[var(--c-text3)]">
              Пока нет данных о продажах. Они накапливаются с каждой продажей в POS и каждой синхронизацией маркетплейсов.
            </p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={weeklyChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
                <CartesianGrid vertical={false} stroke="var(--c-border)" />
                <XAxis dataKey="label" tick={{ fill: "var(--c-text3)", fontSize: 10 }} tickLine={false} axisLine={false} interval={3} />
                <YAxis tick={{ fill: "var(--c-text3)", fontSize: 10 }} tickLine={false} axisLine={false} allowDecimals={false} />
                <Tooltip
                  content={({ active, payload, label }) =>
                    active && payload?.[0] ? (
                      <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-xs shadow-lg">
                        <p className="mb-1 text-[var(--c-text2)]">Неделя с {label}</p>
                        <p className="font-semibold text-[var(--c-text)]">{payload[0].value as number} шт</p>
                      </div>
                    ) : null
                  }
                />
                <Bar dataKey="units" fill="var(--c-blue)" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </section>

      {/* ── 4-week forecast ───────────────────────────────────────────────── */}
      <section>
        <div className="mb-3 flex items-center gap-2">
          <Sparkles size={16} className="text-[var(--c-amber)]" />
          <h2 className="text-base font-semibold text-[var(--c-text)]">Прогноз на 4 недели</h2>
        </div>
        {!enough && (
          <div className="mb-3 flex items-start gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-3 text-xs text-[var(--c-text2)]">
            <Info size={14} className="mt-0.5 shrink-0 text-[var(--c-text3)]" />
            Для сезонного прогноза нужно ~12 недель истории продаж. Пока показываем оценку по последнему среднему — точность вырастет по мере накопления данных.
          </div>
        )}
        <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
          {forecast.map((w, i) => (
            <div key={w.weekStart} className={`flex items-center justify-between gap-3 px-4 py-3 ${i < forecast.length - 1 ? "border-b border-[var(--c-border)]" : ""}`}>
              <div>
                <p className="text-sm font-medium text-[var(--c-text)]">Неделя с {formatDateRu(w.weekStart)}</p>
                {enough && w.index !== 1 && (
                  <p className="text-xs text-[var(--c-text3)]">
                    сезонность {w.index >= 1 ? "+" : ""}{Math.round((w.index - 1) * 100)}%
                  </p>
                )}
              </div>
              <span className="text-sm font-semibold tabular-nums text-[var(--c-text)]">≈ {w.expectedUnits} шт</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
