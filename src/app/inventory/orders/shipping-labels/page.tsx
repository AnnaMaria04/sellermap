"use client";

import { useState, useRef, useEffect } from "react";
import {
  Percent, Boxes, Printer, ClipboardList, ShieldCheck, Package,
  ChevronDown, Check, Calendar as CalendarIcon, Activity,
} from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { ShippingRateCalculator } from "@/components/inventory/ShippingRateCalculator";
import { cn } from "@/lib/utils";

const BULLETS = [
  { icon: Percent, text: "Скидки до 87% на этикетки доставки" },
  { icon: Boxes, text: "Заказы со всех каналов продаж в одном месте" },
  { icon: Printer, text: "Пакетная печать до 250 этикеток" },
  { icon: ClipboardList, text: "Списки комплектации по ячейкам склада" },
  { icon: ShieldCheck, text: "Страховка на каждую отправку" },
];

const CARRIERS = [
  { name: "Почта России", days: "4–5 рабочих дней", tag: "Дешевле" },
  { name: "СДЭК", days: "1–2 рабочих дня", tag: "Быстрее" },
  { name: "Boxberry", days: "2–3 рабочих дня", tag: "" },
];

export default function ShippingLabelsPage() {
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [calcOpen, setCalcOpen] = useState(false);

  return (
    <InventoryShell
      title="Этикетки доставки"
      actions={<MoreActions showAnalytics={showAnalytics} onToggle={() => setShowAnalytics((v) => !v)} />}
    >
      <div className="mx-auto max-w-[1040px]">
        {showAnalytics && <PerformanceBar />}

        <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-8">
          <div className="grid items-center gap-8 md:grid-cols-2">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">
                Всё, что нужно для отправки — в одном месте
              </h2>
              <ul className="mt-5 space-y-3">
                {BULLETS.map(({ icon: Icon, text }) => (
                  <li key={text} className="flex items-start gap-3 text-sm text-[var(--c-text2)]">
                    <Icon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--c-text3)]" />
                    <span>{text}</span>
                  </li>
                ))}
              </ul>
              <button
                onClick={() => setCalcOpen(true)}
                className="mt-6 rounded-lg border border-[var(--c-border2)] px-4 py-2 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]"
              >
                Рассчитать тарифы
              </button>
            </div>

            <div className="relative flex flex-col items-end gap-2">
              {CARRIERS.map((c) => (
                <div key={c.name} className="flex w-64 items-center justify-between rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 shadow-[0_1px_8px_rgba(0,0,0,0.05)]">
                  <div className="flex items-center gap-2">
                    <span className="flex h-7 w-7 items-center justify-center rounded-md bg-[var(--c-bg3)] text-[var(--c-text3)]">
                      <Package className="h-4 w-4" />
                    </span>
                    <div className="leading-tight">
                      <div className="text-sm font-medium text-[var(--c-text)]">{c.name}</div>
                      <div className="text-xs text-[var(--c-text3)]">{c.days}</div>
                    </div>
                  </div>
                  {c.tag && <span className="rounded-md bg-[var(--c-bg3)] px-1.5 py-0.5 text-xs font-medium text-[var(--c-text2)]">{c.tag}</span>}
                </div>
              ))}
              <ParcelsArt />
            </div>
          </div>
        </div>

        <p className="mt-6 text-center text-sm text-[var(--c-text2)]">
          <a href="#" className="underline decoration-[var(--c-text3)] underline-offset-2 hover:text-[var(--c-text)]">
            Подробнее о покупке этикеток доставки
          </a>
        </p>
      </div>

      {calcOpen && <ShippingRateCalculator onClose={() => setCalcOpen(false)} />}
    </InventoryShell>
  );
}

// ── More actions dropdown ────────────────────────────────────────────────────
function MoreActions({ showAnalytics, onToggle }: { showAnalytics: boolean; onToggle: () => void }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={cn(
          "flex items-center gap-1.5 rounded-lg border bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition",
          open ? "border-[var(--c-blue)] ring-1 ring-[var(--c-blue)]" : "border-[var(--c-border)] hover:bg-[var(--c-bg)]",
        )}
      >
        Действия
        <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--c-text3)] transition", open && "rotate-180")} />
      </button>
      {open && (
        <div className="absolute right-0 top-full z-50 mt-2 w-56 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1 shadow-xl">
          <button
            onClick={() => { onToggle(); setOpen(false); }}
            className="flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]"
          >
            <span className="flex items-center gap-2"><Activity className="h-4 w-4 text-[var(--c-text2)]" /> {showAnalytics ? "Скрыть аналитику" : "Показать аналитику"}</span>
            {showAnalytics && <Check className="h-4 w-4 text-[var(--c-green)]" />}
          </button>
        </div>
      )}
    </div>
  );
}

// ── Delivery performance bar ─────────────────────────────────────────────────
const SCOPES = [
  { id: "today", label: "Сегодня", sub: "В сравнении со вчера" },
  { id: "last7", label: "Последние 7 дней", sub: "В сравнении с предыдущими 7 днями" },
  { id: "last30", label: "Последние 30 дней", sub: "В сравнении с предыдущими 30 днями" },
];
const KPIS = ["Доставлено за 5 дней", "Отправлено на следующий день", "С трекингом"];

function PerformanceBar() {
  const [scope, setScope] = useState("last30");
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    function onDoc(e: MouseEvent) { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);
  const scopeLabel = SCOPES.find((s) => s.id === scope)!.label;

  return (
    <div className="mb-4 rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]">
        <Activity className="h-4 w-4 text-[var(--c-text2)]" /> Эффективность доставки по России
      </div>
      <div className="flex flex-wrap items-stretch gap-x-8 gap-y-3">
        <div ref={ref} className="relative flex items-center">
          <button
            onClick={() => setOpen(!open)}
            className={cn("flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition", open ? "border-[var(--c-blue)] ring-1 ring-[var(--c-blue)]" : "border-[var(--c-border)] hover:bg-[var(--c-bg)]")}
          >
            <CalendarIcon className="h-4 w-4 text-[var(--c-text2)]" /> {scopeLabel}
            <ChevronDown className={cn("h-3.5 w-3.5 text-[var(--c-text3)] transition", open && "rotate-180")} />
          </button>
          {open && (
            <div className="absolute left-0 top-full z-50 mt-2 w-72 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1.5 shadow-xl">
              {SCOPES.map((s) => (
                <button key={s.id} onClick={() => { setScope(s.id); setOpen(false); }} className="flex w-full items-start gap-2.5 rounded-lg px-2.5 py-2 text-left hover:bg-[var(--c-bg3)]">
                  <span className={cn("mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border", scope === s.id ? "border-[var(--c-text)]" : "border-[var(--c-border2)]")}>
                    {scope === s.id && <span className="h-2 w-2 rounded-full bg-[var(--c-text)]" />}
                  </span>
                  <span>
                    <span className="block text-sm font-medium text-[var(--c-text)]">{s.label}</span>
                    <span className="block text-xs text-[var(--c-text3)]">{s.sub}</span>
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>
        {KPIS.map((k) => (
          <div key={k} className="min-w-[140px] border-l border-[var(--c-border)] pl-4 first-of-type:border-0">
            <div className="text-sm text-[var(--c-text2)]">{k}</div>
            <div className="mt-0.5 text-base font-semibold text-[var(--c-text)]">0% <span className="font-normal text-[var(--c-text3)]">—</span></div>
          </div>
        ))}
      </div>
    </div>
  );
}

function ParcelsArt() {
  return (
    <svg width="220" height="120" viewBox="0 0 220 120" fill="none" aria-hidden className="mt-2">
      <rect x="120" y="60" width="80" height="50" rx="4" fill="var(--c-bg3)" stroke="var(--c-border2)" />
      <rect x="70" y="80" width="60" height="30" rx="4" fill="var(--c-bg2)" stroke="var(--c-border2)" />
      <rect x="150" y="34" width="44" height="30" rx="4" fill="var(--c-bg2)" stroke="var(--c-border2)" />
      <rect x="132" y="74" width="16" height="20" rx="2" fill="var(--c-bg)" stroke="var(--c-border2)" />
      <rect x="162" y="42" width="12" height="14" rx="2" fill="var(--c-bg)" stroke="var(--c-border2)" />
    </svg>
  );
}
