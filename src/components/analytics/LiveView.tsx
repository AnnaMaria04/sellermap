"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Eye,
  Globe,
  Map as MapIcon,
  Maximize,
  Minimize,
  Minus,
  Plus,
  Search,
} from "lucide-react";
import { Area, AreaChart, ResponsiveContainer } from "recharts";
import { useInventory } from "@/contexts/InventoryContext";
import { MetricInfo } from "./MetricInfo";
import { LiveMap, type MapMarker, type MapMode } from "./LiveMap";
import {
  METRICS,
  computeSalesTotals,
  salesByProduct,
  type TimePoint,
} from "@/lib/analytics/metrics";
import { resolvePreset, formatMoney, DEFAULT_CURRENCY } from "@/lib/analytics/date-range";
import { cn } from "@/lib/utils";

// Built-in RU city list for the location search combobox (no geocoder needed).
const RU_CITIES = [
  "Москва",
  "Санкт-Петербург",
  "Казань",
  "Екатеринбург",
  "Новосибирск",
  "Краснодар",
  "Ростов-на-Дону",
  "Самара",
  "Уфа",
  "Челябинск",
];

// Streamer mode cycles full → numbers-only → hidden, then back.
type StreamerState = 0 | 1 | 2;

const ZOOM_MIN = 0.7;
const ZOOM_MAX = 1.8;
const REFRESH_MS = 10_000;

/**
 * A tiny seeded pseudo-random generator so the "live" simulated numbers walk
 * deterministically within a minute (avoids hydration noise and keeps the page
 * feeling alive without a backend).
 */
function seededInt(seed: number, min: number, max: number): number {
  const x = Math.sin(seed) * 10000;
  const frac = x - Math.floor(x);
  return min + Math.floor(frac * (max - min + 1));
}

/** Build a short sparkline series seeded by a base value (display only). */
function sparkline(base: number, seed: number): TimePoint[] {
  return Array.from({ length: 12 }, (_, i) => ({
    label: String(i),
    value: Math.max(0, Math.round(base * (0.5 + Math.abs(Math.sin(seed + i)) * 0.9))),
  }));
}

/** Real-time operational view (reference design "Live View"). */
export function LiveView() {
  const { orders, returns, customers } = useInventory();
  const today = useMemo(() => resolvePreset("today"), []);
  const totals = useMemo(
    () => computeSalesTotals(orders, returns, today.start, today.end),
    [orders, returns, today],
  );
  const money = (n: number) => formatMoney(n, DEFAULT_CURRENCY);

  // ── Live simulation tick ────────────────────────────────────────────────
  // `tick` advances every REFRESH_MS; `updatedAt` drives the "N сек назад"
  // indicator (re-rendered on the same interval).
  const [tick, setTick] = useState(0);
  const [updatedAt, setUpdatedAt] = useState(() => Date.now());
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const refresh = setInterval(() => {
      setTick((t) => t + 1);
      setUpdatedAt(Date.now());
    }, REFRESH_MS);
    // Lightweight 1s clock just for the "seconds ago" label.
    const clock = setInterval(() => setNow(Date.now()), 1000);
    return () => {
      clearInterval(refresh);
      clearInterval(clock);
    };
  }, []);

  // Simulated live counters seeded by the current minute + tick so they nudge
  // on each refresh but stay stable within a render pass.
  const liveSeed = Math.floor(updatedAt / 60_000) + tick;
  const visitors = seededInt(liveSeed, 3, 24);
  const sessions = visitors + seededInt(liveSeed + 1, 0, 12);
  const activeCarts = seededInt(liveSeed + 2, 0, Math.max(1, visitors - 1));
  const checkingOut = seededInt(liveSeed + 3, 0, Math.max(1, activeCarts));

  const secondsAgo = Math.max(0, Math.floor((now - updatedAt) / 1000));
  const liveLabel = secondsAgo < 5 ? "Только что" : `${secondsAgo} сек назад`;

  // ── Derived data panels ──────────────────────────────────────────────────
  const regionRows = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of orders) {
      if (o.status === "cancelled") continue;
      if (new Date(o.createdAt).getTime() < today.start.getTime()) continue;
      if (new Date(o.createdAt).getTime() > today.end.getTime()) continue;
      const region = o.region ?? "Не указан";
      map.set(region, (map.get(region) ?? 0) + 1);
    }
    return [...map.entries()]
      .map(([label, value]) => ({ label, value }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 6);
  }, [orders, today]);

  const customerSplit = useMemo(() => {
    let returning = 0;
    let fresh = 0;
    for (const c of customers) {
      if (c.totalOrders > 1) returning++;
      else fresh++;
    }
    return { fresh, returning, total: fresh + returning };
  }, [customers]);

  const productRows = useMemo(
    () => salesByProduct(orders, today.start, today.end),
    [orders, today],
  );

  // Map markers: today's orders by region (teal) + simulated visitors (grey).
  const markers = useMemo<MapMarker[]>(() => {
    const orderMarkers: MapMarker[] = regionRows.map((r) => ({
      region: r.label,
      kind: "order",
      weight: r.value,
    }));
    // Scatter simulated visitors across the built-in cities.
    const visitorMarkers: MapMarker[] = RU_CITIES.slice(0, Math.min(visitors, RU_CITIES.length)).map(
      (city) => ({ region: city, kind: "visitor", weight: 1 }),
    );
    return [...visitorMarkers, ...orderMarkers];
  }, [regionRows, visitors]);

  // ── Map controls state ─────────────────────────────────────────────────────
  const [mode, setMode] = useState<MapMode>("globe");
  const [streamer, setStreamer] = useState<StreamerState>(0);
  const [zoom, setZoom] = useState(1);
  const [spin, setSpin] = useState(0);
  const [centerRegion, setCenterRegion] = useState<string | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [query, setQuery] = useState("");
  const [searchOpen, setSearchOpen] = useState(false);

  const containerRef = useRef<HTMLDivElement | null>(null);
  const searchRef = useRef<HTMLDivElement | null>(null);

  // Gentle auto-rotation of the globe (paused in flat-map mode).
  useEffect(() => {
    if (mode !== "globe") return;
    const id = setInterval(() => setSpin((s) => (s + 0.4) % 360), 50);
    return () => clearInterval(id);
  }, [mode]);

  // Fullscreen API wiring — also catches Escape via the native event.
  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // Close the search dropdown on outside click.
  useEffect(() => {
    if (!searchOpen) return;
    const onClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setSearchOpen(false);
      }
    };
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [searchOpen]);

  function toggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      void document.exitFullscreen();
    } else {
      void el.requestFullscreen?.();
    }
  }

  function selectCity(city: string) {
    setCenterRegion(city);
    setQuery(city);
    setSearchOpen(false);
    // In globe mode, recentre/highlight; in map mode the spec says no pan.
  }

  const suggestions = useMemo(
    () =>
      query.trim()
        ? RU_CITIES.filter((c) => c.toLowerCase().includes(query.trim().toLowerCase()))
        : RU_CITIES,
    [query],
  );

  // Flat-map mode is full-bleed: the data panel is hidden regardless of streamer.
  const panelHidden = mode === "map" || streamer === 2;
  // Streamer state 1 hides the descriptive section labels but keeps the numbers.
  const labelsHidden = streamer >= 1;

  return (
    <div
      ref={containerRef}
      className={cn(
        // Negative margins cancel InventoryShell's px-6 py-6 padding for a
        // full-bleed map area; the height fills the viewport below the header.
        "-mx-6 -my-6 flex h-[calc(100vh-3.5rem)] flex-col bg-[var(--c-bg)] lg:h-[calc(100vh-8rem)]",
        isFullscreen && "h-screen",
      )}
    >
      {/* Zone A — internal live header */}
      <div className="flex shrink-0 items-center gap-2 border-b border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3">
        <span className="relative flex h-2.5 w-2.5">
          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--c-green)] opacity-75" />
          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[var(--c-green)]" />
        </span>
        <h2 className="text-base font-semibold text-[var(--c-text)]">В реальном времени</h2>
        <span className="ml-2 flex items-center gap-1.5 text-sm text-[var(--c-text2)]">
          <span className="h-2 w-2 rounded-full bg-[var(--c-blue)]" />
          {liveLabel}
        </span>
      </div>

      {/* Zone B + C — data panel and map */}
      <div className="flex min-h-0 flex-1 flex-col lg:flex-row">
        {!panelHidden && (
          <div className="w-full shrink-0 space-y-3 overflow-y-auto border-b border-[var(--c-border)] bg-[var(--c-bg)] p-4 lg:w-[300px] lg:border-b-0 lg:border-r">
            <BigStat
              label="Посетителей сейчас"
              value={String(visitors)}
              labelsHidden={labelsHidden}
            />
            <BigStat
              label="Итоговые продажи"
              metricKey="totalSales"
              value={money(totals.totalSales)}
              spark={sparkline(Math.max(1, totals.totalSales / 1000), liveSeed)}
              labelsHidden={labelsHidden}
            />
            <div className="grid grid-cols-2 gap-3">
              <BigStat
                label="Сеансы"
                metricKey="sessions"
                value={String(sessions)}
                spark={sparkline(sessions, liveSeed + 5)}
                labelsHidden={labelsHidden}
              />
              <BigStat
                label="Заказы"
                metricKey="orders"
                value={String(totals.orders)}
                spark={sparkline(Math.max(1, totals.orders), liveSeed + 7)}
                labelsHidden={labelsHidden}
              />
            </div>

            {/* Customer behaviour funnel */}
            <Card>
              <CardLabel hidden={labelsHidden}>Поведение клиентов</CardLabel>
              <div className={cn("grid grid-cols-3 gap-3 text-sm", !labelsHidden && "mt-3")}>
                {(
                  [
                    ["Активные корзины", activeCarts],
                    ["Оформляют", checkingOut],
                    ["Купили", totals.orders],
                  ] as const
                ).map(([label, value]) => (
                  <div key={label}>
                    {!labelsHidden && <div className="text-[var(--c-text2)]">{label}</div>}
                    <div className="mt-1 text-lg font-semibold text-[var(--c-text)]">{value}</div>
                  </div>
                ))}
              </div>
            </Card>

            {/* Sessions by region */}
            <Card>
              <CardLabel hidden={labelsHidden}>Сеансы по регионам</CardLabel>
              {regionRows.length === 0 ? (
                <NoData />
              ) : (
                <BarList rows={regionRows} className={cn(!labelsHidden && "mt-3")} />
              )}
            </Card>

            {/* New vs returning customers */}
            <Card>
              <CardLabel hidden={labelsHidden}>Новые и вернувшиеся клиенты</CardLabel>
              {customerSplit.total === 0 ? (
                <NoData />
              ) : (
                <SplitBar
                  fresh={customerSplit.fresh}
                  returning={customerSplit.returning}
                  className={cn(!labelsHidden && "mt-3")}
                />
              )}
            </Card>

            {/* Sales by product */}
            <Card>
              {labelsHidden ? null : <MetricInfo metric={METRICS.salesByProduct} className="text-sm" />}
              {productRows.length === 0 ? (
                <NoData />
              ) : (
                <BarList
                  rows={productRows}
                  format={(v) => money(v)}
                  className={cn(!labelsHidden && "mt-3")}
                />
              )}
            </Card>
          </div>
        )}

        {/* Zone C — map area with overlay controls */}
        <div className="relative min-h-[320px] flex-1 overflow-hidden bg-gradient-to-b from-[var(--c-bg2)] to-[var(--c-bg)]">
          <LiveMap mode={mode} markers={markers} zoom={zoom} spin={spin} centerRegion={centerRegion} />

          {/* Zone D — top-right control cluster */}
          <div className="absolute right-3 top-3 flex items-start gap-2">
            {/* Location search combobox */}
            <div ref={searchRef} className="relative">
              {searchOpen ? (
                <div className="w-56 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-lg">
                  <div className="flex items-center gap-2 border-b border-[var(--c-border)] px-3 py-2">
                    <Search className="h-4 w-4 shrink-0 text-[var(--c-text3)]" />
                    <input
                      autoFocus
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      placeholder="Поиск города…"
                      className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]"
                    />
                  </div>
                  <ul className="max-h-56 overflow-y-auto py-1">
                    {suggestions.length === 0 ? (
                      <li className="px-3 py-2 text-sm text-[var(--c-text3)]">Ничего не найдено</li>
                    ) : (
                      suggestions.map((c) => (
                        <li key={c}>
                          <button
                            onClick={() => selectCity(c)}
                            className="w-full px-3 py-1.5 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]"
                          >
                            {c}
                          </button>
                        </li>
                      ))
                    )}
                  </ul>
                </div>
              ) : (
                <GhostButton title="Поиск города" onClick={() => setSearchOpen(true)}>
                  <Search className="h-4 w-4" />
                </GhostButton>
              )}
            </div>

            <GhostButton
              title="Режим стримера"
              active={streamer !== 0}
              onClick={() => setStreamer((s) => ((s + 1) % 3) as StreamerState)}
            >
              <Eye className="h-4 w-4" />
            </GhostButton>

            <GhostButton
              title={mode === "globe" ? "Плоская карта" : "Глобус"}
              onClick={() => setMode((m) => (m === "globe" ? "map" : "globe"))}
            >
              {mode === "globe" ? <MapIcon className="h-4 w-4" /> : <Globe className="h-4 w-4" />}
            </GhostButton>

            <GhostButton
              title={isFullscreen ? "Выйти из полноэкранного режима" : "Полный экран"}
              onClick={toggleFullscreen}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </GhostButton>
          </div>

          {/* Zone E — zoom controls (globe: scale, map: no-op per spec) */}
          <div className="absolute bottom-3 right-3 flex flex-col overflow-hidden rounded-lg border border-[var(--c-border)] bg-white shadow">
            <button
              title="Приблизить"
              onClick={() => setZoom((z) => Math.min(ZOOM_MAX, +(z + 0.2).toFixed(2)))}
              className="flex h-9 w-9 items-center justify-center text-gray-700 hover:bg-gray-100"
            >
              <Plus className="h-4 w-4" />
            </button>
            <div className="h-px bg-gray-200" />
            <button
              title="Отдалить"
              onClick={() => setZoom((z) => Math.max(ZOOM_MIN, +(z - 0.2).toFixed(2)))}
              className="flex h-9 w-9 items-center justify-center text-gray-700 hover:bg-gray-100"
            >
              <Minus className="h-4 w-4" />
            </button>
          </div>

          {/* Legend — non-interactive */}
          <div className="absolute bottom-3 left-3 flex flex-col gap-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)]/90 px-3 py-2 text-xs text-[var(--c-text2)] backdrop-blur">
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#14b8a6]" /> Заказы
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-[#94a3b8]" /> Посетители сейчас
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Presentational helpers ────────────────────────────────────────────────────

function GhostButton({
  children,
  title,
  onClick,
  active,
}: {
  children: React.ReactNode;
  title: string;
  onClick: () => void;
  active?: boolean;
}) {
  return (
    <button
      title={title}
      aria-label={title}
      onClick={onClick}
      className={cn(
        "flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)]/90 text-[var(--c-text2)] backdrop-blur transition hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]",
        active && "bg-[var(--c-blue)] text-white hover:bg-[var(--c-blue)] hover:text-white",
      )}
    >
      {children}
    </button>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">{children}</div>
  );
}

function CardLabel({ children, hidden }: { children: React.ReactNode; hidden?: boolean }) {
  if (hidden) return null;
  return (
    <span className="text-sm font-semibold text-[var(--c-text)] underline decoration-dotted decoration-[var(--c-text3)] underline-offset-4">
      {children}
    </span>
  );
}

function BigStat({
  label,
  value,
  metricKey,
  spark,
  labelsHidden,
}: {
  label: string;
  value: string;
  metricKey?: string;
  spark?: TimePoint[];
  labelsHidden?: boolean;
}) {
  return (
    <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      {labelsHidden ? null : metricKey ? (
        <MetricInfo metric={METRICS[metricKey]} className="text-sm" />
      ) : (
        <span className="text-sm font-semibold text-[var(--c-text)] underline decoration-dotted decoration-[var(--c-text3)] underline-offset-4">
          {label}
        </span>
      )}
      <div className="mt-1 text-2xl font-bold text-[var(--c-text)]">{value}</div>
      {spark && (
        <div className="mt-2 h-8">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={spark} margin={{ top: 2, right: 0, bottom: 0, left: 0 }}>
              <Area
                type="monotone"
                dataKey="value"
                stroke="var(--c-green)"
                fill="var(--c-green)"
                fillOpacity={0.15}
                strokeWidth={1.5}
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}

function BarList({
  rows,
  format,
  className,
}: {
  rows: { label: string; value: number }[];
  format?: (v: number) => string;
  className?: string;
}) {
  const max = Math.max(1, ...rows.map((r) => r.value));
  return (
    <div className={cn("space-y-2", className)}>
      {rows.map((r) => (
        <div key={r.label}>
          <div className="flex items-baseline justify-between text-sm">
            <span className="truncate text-[var(--c-text)]">{r.label}</span>
            <span className="ml-2 shrink-0 tabular-nums text-[var(--c-text2)]">
              {format ? format(r.value) : r.value}
            </span>
          </div>
          <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--c-bg3)]">
            <div
              className="h-full rounded-full bg-[var(--c-green)]"
              style={{ width: `${(r.value / max) * 100}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}

function SplitBar({
  fresh,
  returning,
  className,
}: {
  fresh: number;
  returning: number;
  className?: string;
}) {
  const total = Math.max(1, fresh + returning);
  return (
    <div className={className}>
      <div className="flex h-2.5 overflow-hidden rounded-full bg-[var(--c-bg3)]">
        <div className="h-full bg-[var(--c-blue)]" style={{ width: `${(fresh / total) * 100}%` }} />
        <div className="h-full bg-[var(--c-green)]" style={{ width: `${(returning / total) * 100}%` }} />
      </div>
      <div className="mt-2 flex justify-between text-sm">
        <span className="flex items-center gap-1.5 text-[var(--c-text2)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--c-blue)]" /> Новые: {fresh}
        </span>
        <span className="flex items-center gap-1.5 text-[var(--c-text2)]">
          <span className="h-2.5 w-2.5 rounded-full bg-[var(--c-green)]" /> Вернувшиеся: {returning}
        </span>
      </div>
    </div>
  );
}

function NoData() {
  return (
    <div className="flex h-24 items-center justify-center text-sm text-[var(--c-text3)]">
      Нет данных за этот период
    </div>
  );
}
