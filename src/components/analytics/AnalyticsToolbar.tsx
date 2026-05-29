"use client";

import { useState, useRef, useEffect } from "react";
import {
  Calendar as CalendarIcon,
  GitCompareArrows,
  ArrowLeftRight,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowRight,
  Clock,
} from "lucide-react";
import {
  PRESET_GROUPS,
  PRESET_LABELS,
  resolvePreset,
  resolveComparison,
  formatRangeLabel,
  COMPARISON_OPTIONS,
  CURRENCIES,
  type PresetId,
  type ComparisonId,
  type Currency,
  type DateRange,
} from "@/lib/analytics/date-range";
import { cn } from "@/lib/utils";

export interface AnalyticsControls {
  preset: PresetId;
  range: DateRange;
  comparison: ComparisonId;
  comparisonRange: DateRange | null;
  currency: Currency;
}

const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function sameDay(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate();
}
function isBetween(d: Date, a: Date, b: Date): boolean {
  const t = d.getTime();
  return t > Math.min(a.getTime(), b.getTime()) && t < Math.max(a.getTime(), b.getTime());
}
function fmtInput(d: Date): string {
  return d.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });
}

function MonthGrid({
  year, month, start, end, onPick,
}: {
  year: number; month: number; start: Date; end: Date; onPick: (d: Date) => void;
}) {
  const first = new Date(year, month, 1);
  const lead = first.getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const today = new Date();

  const cells: (number | null)[] = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div className="w-[280px]">
      <div className="mb-2 text-center text-sm font-semibold text-[var(--c-text)]">
        {MONTHS[month]} {year}
      </div>
      <div className="grid grid-cols-7 gap-y-1 text-center text-xs text-[var(--c-text3)]">
        {WEEKDAYS.map((w) => (
          <div key={w} className="py-1">{w}</div>
        ))}
        {cells.map((d, i) => {
          if (d == null) return <div key={`e${i}`} />;
          const date = new Date(year, month, d);
          const isStart = sameDay(date, start);
          const isEnd = sameDay(date, end);
          const inRange = isBetween(date, start, end);
          const isFuture = date.getTime() > today.getTime() && !sameDay(date, today);
          return (
            <button
              key={d}
              disabled={isFuture}
              onClick={() => onPick(date)}
              className={cn(
                "mx-auto flex h-8 w-8 items-center justify-center rounded-full text-sm transition",
                isFuture && "cursor-not-allowed text-[var(--c-text3)] opacity-40",
                !isFuture && !isStart && !isEnd && !inRange && "text-[var(--c-text)] hover:bg-[var(--c-bg3)]",
                inRange && "rounded-none bg-[var(--c-bg3)] text-[var(--c-text)]",
                (isStart || isEnd) && "bg-[var(--c-text)] font-semibold text-[var(--c-bg)]",
              )}
            >
              {d}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function Pill({
  icon: Icon, label, open, onClick,
}: {
  icon: React.ElementType; label: string; open: boolean; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 rounded-lg border bg-[var(--c-bg)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition",
        open ? "border-[var(--c-blue)] ring-1 ring-[var(--c-blue)]" : "border-[var(--c-border)] hover:bg-[var(--c-bg2)]",
      )}
    >
      <Icon className="h-4 w-4 text-[var(--c-text2)]" />
      {label}
      <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--c-text3)] transition", open && "rotate-180")} />
    </button>
  );
}

export function AnalyticsToolbar({
  value, onChange,
}: {
  value: AnalyticsControls;
  onChange: (next: AnalyticsControls) => void;
}) {
  const [openMenu, setOpenMenu] = useState<null | "range" | "comparison" | "currency">(null);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Draft range while the calendar is open.
  const [draft, setDraft] = useState<DateRange>(value.range);
  const [viewMonth, setViewMonth] = useState(() => {
    const d = new Date(value.range.start);
    return { year: d.getFullYear(), month: d.getMonth() };
  });

  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpenMenu(null);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  function applyPreset(id: PresetId) {
    if (id === "custom") return; // custom is chosen via the calendar
    const range = resolvePreset(id);
    setDraft(range);
    setViewMonth({ year: range.start.getFullYear(), month: range.start.getMonth() });
  }

  function pickDay(d: Date) {
    // First pick (or picking before current start) starts a new selection.
    if (draft.start.getTime() !== draft.end.getTime() || d.getTime() < draft.start.getTime()) {
      const day = new Date(d); day.setHours(0, 0, 0, 0);
      setDraft({ start: day, end: day });
    } else {
      const end = new Date(d); end.setHours(23, 59, 59, 999);
      setDraft({ start: draft.start, end });
    }
  }

  function applyRange() {
    const isToday = sameDay(draft.start, new Date()) && sameDay(draft.end, new Date());
    onChange({
      ...value,
      preset: isToday ? "today" : "custom",
      range: draft,
      comparisonRange: resolveComparison(draft, value.comparison),
    });
    setOpenMenu(null);
  }

  const nextMonth = viewMonth.month === 11
    ? { year: viewMonth.year + 1, month: 0 }
    : { year: viewMonth.year, month: viewMonth.month + 1 };

  const comparisonLabel = value.comparison === "none"
    ? formatRangeLabel(value.range)
    : COMPARISON_OPTIONS.find((c) => c.id === value.comparison)!.label;

  return (
    <div ref={wrapRef} className="relative flex flex-wrap items-center gap-2">
      {/* Date range */}
      <div className="relative">
        <Pill
          icon={CalendarIcon}
          label={value.preset === "custom" ? formatRangeLabel(value.range) : PRESET_LABELS[value.preset]}
          open={openMenu === "range"}
          onClick={() => { setDraft(value.range); setOpenMenu(openMenu === "range" ? null : "range"); }}
        />
        {openMenu === "range" && (
          <div className="absolute left-0 top-full z-50 mt-2 flex rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-xl">
            {/* Presets */}
            <div className="w-40 border-r border-[var(--c-border)] p-2">
              {PRESET_GROUPS.map((group, gi) => (
                <div key={gi} className={cn(gi > 0 && "mt-2 border-t border-[var(--c-border)] pt-2")}>
                  {group.label && (
                    <div className="px-2 py-1 text-xs font-medium text-[var(--c-text3)]">{group.label}</div>
                  )}
                  {group.items.map((p) => (
                    <button
                      key={p.id}
                      onClick={() => applyPreset(p.id)}
                      className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]"
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
              ))}
            </div>

            {/* Calendar */}
            <div className="p-3">
              <div className="mb-3 flex items-center gap-2">
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text)]">
                  {fmtInput(draft.start)}
                </div>
                <ArrowRight className="h-4 w-4 text-[var(--c-text3)]" />
                <div className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--c-border)] px-3 py-2 text-sm text-[var(--c-text)]">
                  {fmtInput(draft.end)}
                </div>
                <button className="rounded-lg border border-[var(--c-border)] p-2 text-[var(--c-text2)]">
                  <Clock className="h-4 w-4" />
                </button>
              </div>
              <div className="flex gap-6">
                <div>
                  <div className="mb-2 flex items-center justify-between">
                    <button
                      onClick={() => setViewMonth(viewMonth.month === 0 ? { year: viewMonth.year - 1, month: 11 } : { year: viewMonth.year, month: viewMonth.month - 1 })}
                      className="rounded p-1 text-[var(--c-text2)] hover:bg-[var(--c-bg3)]"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>
                    <span className="w-4" />
                  </div>
                  <MonthGrid year={viewMonth.year} month={viewMonth.month} start={draft.start} end={draft.end} onPick={pickDay} />
                </div>
                <div>
                  <div className="mb-2 flex items-center justify-end">
                    <button
                      onClick={() => setViewMonth(nextMonth)}
                      className="rounded p-1 text-[var(--c-text2)] hover:bg-[var(--c-bg3)]"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                  <MonthGrid year={nextMonth.year} month={nextMonth.month} start={draft.start} end={draft.end} onPick={pickDay} />
                </div>
              </div>
              <div className="mt-3 flex justify-end gap-2 border-t border-[var(--c-border)] pt-3">
                <button onClick={() => setOpenMenu(null)} className="rounded-lg border border-[var(--c-border)] px-4 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg2)]">Cancel</button>
                <button onClick={applyRange} className="rounded-lg bg-[var(--c-text)] px-4 py-1.5 text-sm font-medium text-[var(--c-bg)] hover:opacity-90">Apply</button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Comparison */}
      <div className="relative">
        <Pill
          icon={GitCompareArrows}
          label={comparisonLabel}
          open={openMenu === "comparison"}
          onClick={() => setOpenMenu(openMenu === "comparison" ? null : "comparison")}
        />
        {openMenu === "comparison" && (
          <div className="absolute left-0 top-full z-50 mt-2 w-64 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-1 shadow-xl">
            {COMPARISON_OPTIONS.map((c) => (
              <button
                key={c.id}
                onClick={() => {
                  onChange({ ...value, comparison: c.id, comparisonRange: resolveComparison(value.range, c.id) });
                  setOpenMenu(null);
                }}
                className={cn(
                  "block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--c-bg3)]",
                  value.comparison === c.id ? "font-medium text-[var(--c-text)]" : "text-[var(--c-text2)]",
                )}
              >
                {c.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Currency */}
      <div className="relative">
        <Pill
          icon={ArrowLeftRight}
          label={value.currency}
          open={openMenu === "currency"}
          onClick={() => setOpenMenu(openMenu === "currency" ? null : "currency")}
        />
        {openMenu === "currency" && (
          <div className="absolute left-0 top-full z-50 mt-2 w-40 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-1 shadow-xl">
            {CURRENCIES.map((c) => (
              <button
                key={c}
                onClick={() => { onChange({ ...value, currency: c }); setOpenMenu(null); }}
                className={cn(
                  "block w-full rounded-md px-3 py-2 text-left text-sm hover:bg-[var(--c-bg3)]",
                  value.currency === c ? "font-medium text-[var(--c-text)]" : "text-[var(--c-text2)]",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
