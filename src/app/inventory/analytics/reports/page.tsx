"use client";

import { useMemo, useState, useEffect } from "react";
import Link from "next/link";
import { Search, ChevronDown, ArrowUpDown, Check, ChevronLeft, ChevronRight } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { REPORTS, REPORT_CATEGORIES, type ReportCategory } from "@/lib/analytics/reports";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 50;
const LAST_VIEWED_KEY = "sellermap_report_last_viewed";

type SortKey = "title" | "lastViewed";
type SortDir = "asc" | "desc";

function loadLastViewed(): Record<string, number> {
  if (typeof window === "undefined") return {};
  try {
    return JSON.parse(localStorage.getItem(LAST_VIEWED_KEY) ?? "{}") as Record<string, number>;
  } catch {
    return {};
  }
}

function relativeTime(ts?: number): string {
  if (!ts) return "—";
  const diff = Date.now() - ts;
  const min = Math.floor(diff / 60000);
  if (min < 1) return "только что";
  if (min < 60) return `${min} мин. назад`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} ч. назад`;
  const days = Math.floor(hr / 24);
  return days === 1 ? "вчера" : `${days} дн. назад`;
}

export default function AnalyticsReportsPage() {
  const [query, setQuery] = useState("");
  const [createdByShopify, setCreatedByShopify] = useState(false);
  const [cats, setCats] = useState<ReportCategory[]>([]);
  const [sortKey, setSortKey] = useState<SortKey>("lastViewed");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const [page, setPage] = useState(0);
  const [openMenu, setOpenMenu] = useState<null | "createdBy" | "category">(null);
  const [lastViewed, setLastViewed] = useState<Record<string, number>>({});

  useEffect(() => { setLastViewed(loadLastViewed()); }, []);

  const filtered = useMemo(() => {
    let list = REPORTS.slice();
    if (query.trim()) {
      const q = query.toLowerCase();
      list = list.filter((r) => r.title.toLowerCase().includes(q) || r.category.toLowerCase().includes(q));
    }
    if (createdByShopify) list = list.filter((r) => r.builtin);
    if (cats.length) list = list.filter((r) => cats.includes(r.category));

    list.sort((a, b) => {
      let cmp: number;
      if (sortKey === "title") cmp = a.title.localeCompare(b.title, "ru");
      else cmp = (lastViewed[a.slug] ?? 0) - (lastViewed[b.slug] ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });
    return list;
  }, [query, createdByShopify, cats, sortKey, sortDir, lastViewed]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

  function toggleSort(key: SortKey) {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else { setSortKey(key); setSortDir(key === "title" ? "asc" : "desc"); }
  }

  function recordView(slug: string) {
    const next = { ...loadLastViewed(), [slug]: Date.now() };
    try { localStorage.setItem(LAST_VIEWED_KEY, JSON.stringify(next)); } catch { /* non-fatal */ }
  }

  return (
    <InventoryShell
      title="Отчёты"
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/inventory/analytics/reports/inventory"
            className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]"
          >
            Отчёты по запасам
          </Link>
          <Link
            href="/inventory/analytics/reports/explore"
            className="rounded-lg bg-[var(--c-text)] px-3 py-1.5 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90"
          >
            Новое исследование
          </Link>
        </div>
      }
    >
      {/* Filter + sort bar */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="flex min-w-[220px] flex-1 items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2">
          <Search className="h-4 w-4 text-[var(--c-text3)]" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setPage(0); }}
            placeholder="Поиск отчётов"
            className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]"
          />
        </div>

        {/* Created by */}
        <FilterPill
          label={createdByShopify ? "Автор: SellerMap" : "Автор"}
          open={openMenu === "createdBy"}
          onClick={() => setOpenMenu(openMenu === "createdBy" ? null : "createdBy")}
        >
          <label className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]">
            <input type="checkbox" checked={createdByShopify} onChange={(e) => { setCreatedByShopify(e.target.checked); setPage(0); }} className="h-4 w-4" />
            SellerMap
          </label>
          <button onClick={() => { setCreatedByShopify(false); setOpenMenu(null); }} className="mt-1 w-full rounded-md px-2.5 py-1.5 text-left text-sm text-[var(--c-blue)] hover:bg-[var(--c-bg3)]">Сбросить</button>
        </FilterPill>

        {/* Category */}
        <FilterPill
          label={cats.length ? `Категория (${cats.length})` : "Категория"}
          open={openMenu === "category"}
          onClick={() => setOpenMenu(openMenu === "category" ? null : "category")}
        >
          <div className="max-h-64 overflow-y-auto">
            {REPORT_CATEGORIES.map((c) => (
              <label key={c} className="flex cursor-pointer items-center gap-2 rounded-md px-2.5 py-1.5 text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]">
                <input
                  type="checkbox"
                  checked={cats.includes(c)}
                  onChange={(e) => { setCats((prev) => e.target.checked ? [...prev, c] : prev.filter((x) => x !== c)); setPage(0); }}
                  className="h-4 w-4"
                />
                {c}
              </label>
            ))}
          </div>
          <button onClick={() => { setCats([]); setOpenMenu(null); }} className="mt-1 w-full rounded-md px-2.5 py-1.5 text-left text-sm text-[var(--c-blue)] hover:bg-[var(--c-bg3)]">Сбросить</button>
        </FilterPill>

        <button
          onClick={() => toggleSort(sortKey)}
          title="Сортировка"
          className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-2 text-[var(--c-text2)] transition hover:bg-[var(--c-bg)]"
        >
          <ArrowUpDown className="h-4 w-4" />
        </button>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--c-border)] text-left text-[var(--c-text3)]">
              <Th label="Название" active={sortKey === "title"} dir={sortDir} onClick={() => toggleSort("title")} />
              <th className="px-4 py-2.5 font-medium">Категория</th>
              <Th label="Последний просмотр" active={sortKey === "lastViewed"} dir={sortDir} onClick={() => toggleSort("lastViewed")} />
              <th className="px-4 py-2.5 font-medium">Автор</th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((r) => (
              <tr key={r.slug} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-bg3)]">
                <td className="px-4 py-3">
                  <Link
                    href={`/inventory/analytics/reports/explore?report=${r.slug}`}
                    onClick={() => recordView(r.slug)}
                    className="font-medium text-[var(--c-blue)] hover:underline"
                  >
                    {r.title}
                  </Link>
                </td>
                <td className="px-4 py-3 text-[var(--c-text2)]">{r.category}</td>
                <td className="px-4 py-3 text-[var(--c-text2)]">{relativeTime(lastViewed[r.slug])}</td>
                <td className="px-4 py-3 text-[var(--c-text2)]">{r.builtin ? "SellerMap" : "Вы"}</td>
              </tr>
            ))}
            {pageRows.length === 0 && (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-[var(--c-text3)]">Отчёты не найдены</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="mt-3 flex items-center justify-between text-sm text-[var(--c-text3)]">
        <span>{filtered.length === 0 ? "Нет отчётов" : `${page * PAGE_SIZE + 1}–${Math.min(filtered.length, (page + 1) * PAGE_SIZE)} из ${filtered.length}`}</span>
        <div className="flex gap-2">
          <button onClick={() => setPage((p) => Math.max(0, p - 1))} disabled={page === 0} className="inline-flex items-center gap-1 rounded-lg border border-[var(--c-border)] px-3 py-1.5 text-[var(--c-text2)] disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" /> Назад
          </button>
          <button onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))} disabled={page >= pageCount - 1} className="inline-flex items-center gap-1 rounded-lg border border-[var(--c-border)] px-3 py-1.5 text-[var(--c-text2)] disabled:opacity-40">
            Вперёд <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </InventoryShell>
  );
}

function Th({ label, active, dir, onClick }: { label: string; active: boolean; dir: SortDir; onClick: () => void }) {
  return (
    <th className="px-4 py-2.5 font-medium">
      <button onClick={onClick} className={cn("inline-flex items-center gap-1 hover:text-[var(--c-text)]", active && "text-[var(--c-text)]")}>
        {label}
        {active && <ChevronDown className={cn("h-3.5 w-3.5 transition", dir === "asc" && "rotate-180")} />}
      </button>
    </th>
  );
}

function FilterPill({
  label, open, onClick, children,
}: {
  label: string; open: boolean; onClick: () => void; children: React.ReactNode;
}) {
  return (
    <div className="relative">
      <button
        onClick={onClick}
        onBlur={() => setTimeout(() => { /* allow inner clicks */ }, 0)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border bg-[var(--c-bg2)] px-3 py-2 text-sm font-medium text-[var(--c-text)] transition",
          open ? "border-[var(--c-blue)]" : "border-[var(--c-border)] hover:bg-[var(--c-bg)]",
        )}
      >
        {label}
        <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--c-text3)] transition", open && "rotate-180")} />
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-20" onClick={onClick} />
          <div className="absolute right-0 top-full z-30 mt-1 w-56 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-1 shadow-xl">
            {children}
          </div>
        </>
      )}
    </div>
  );
}
