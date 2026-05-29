"use client";

import { useState, useEffect, useRef } from "react";
import { X, MapPin, Pencil, Package, Search, ChevronsUpDown, Loader2, AlertTriangle } from "lucide-react";
import { formatRub, cn } from "@/lib/utils";

type FromMode = "shop" | "custom";
type PkgMode = "sample" | "custom";

interface Rate { carrier: string; service: string; days: string; price: number }

const COUNTRIES = ["Россия", "Казахстан", "Беларусь", "Армения"];
const SAMPLE_DIMS = { l: 20, w: 15, h: 10 }; // cm

export function ShippingRateCalculator({ onClose }: { onClose: () => void }) {
  const [from, setFrom] = useState<FromMode>("shop");
  const [fromAddr, setFromAddr] = useState("");
  const [toCountry, setToCountry] = useState("Россия");
  const [toAddr, setToAddr] = useState("");
  const [pkg, setPkg] = useState<PkgMode>("sample");
  const [dims, setDims] = useState({ l: "", w: "", h: "" });
  const [dimUnit, setDimUnit] = useState<"см" | "дюйм">("см");
  const [weight, setWeight] = useState("1");
  const [weightUnit, setWeightUnit] = useState<"кг" | "г">("кг");

  const [results, setResults] = useState<Rate[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [warnings, setWarnings] = useState<string[]>([]);

  function dimsCm() {
    if (pkg === "sample") return SAMPLE_DIMS;
    const f = dimUnit === "дюйм" ? 2.54 : 1;
    return { l: (parseFloat(dims.l) || 0) * f, w: (parseFloat(dims.w) || 0) * f, h: (parseFloat(dims.h) || 0) * f };
  }
  function weightKg() {
    const n = parseFloat(weight) || 0;
    return weightUnit === "г" ? n / 1000 : n;
  }

  function validate(): string[] {
    const w: string[] = [];
    if (!toAddr.trim()) w.push("Укажите адрес доставки");
    if (weightKg() <= 0) w.push("Укажите вес посылки");
    if (pkg === "custom") {
      const d = dimsCm();
      if (!dims.l || !dims.w || !dims.h) w.push("Укажите размеры посылки");
      else if (d.l < 1 || d.w < 1 || d.h < 1) w.push(`Минимальные размеры — 1 × 1 × 1 ${dimUnit}`);
    }
    return w;
  }

  async function calculate() {
    const w = validate();
    setWarnings(w);
    if (w.length) return;
    setLoading(true);
    setResults(null);
    try {
      const res = await fetch("/api/shipping/rates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toAddress: toAddr, weightKg: weightKg(), dimsCm: dimsCm() }),
      });
      if (!res.ok) {
        const err = (await res.json().catch(() => ({}))) as { error?: string; minCm?: number };
        if (err.error === "min_dimensions") setWarnings([`Минимальные размеры — ${err.minCm} × ${err.minCm} × ${err.minCm} см`]);
        else if (err.error === "weight_required") setWarnings(["Укажите вес посылки"]);
        else setWarnings(["Не удалось рассчитать тарифы"]);
        return;
      }
      const json = (await res.json()) as { rates: Rate[] };
      setResults(json.rates);
    } catch {
      setWarnings(["Не удалось получить тарифы. Попробуйте ещё раз."]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 animate-fade-in" onClick={onClose}>
      <div className="flex w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        {/* Form */}
        <div className="flex w-[58%] flex-col border-r border-[var(--c-border)]">
          <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
            <h3 className="text-base font-semibold text-[var(--c-text)]">Калькулятор тарифов</h3>
            <button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button>
          </div>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
            {/* From */}
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--c-text)]">Откуда</p>
              <div className="flex gap-2">
                <ModeBtn active={from === "shop"} onClick={() => setFrom("shop")} icon={<MapPin className="h-4 w-4" />} label="Адрес магазина" />
                <ModeBtn active={from === "custom"} onClick={() => setFrom("custom")} icon={<Pencil className="h-4 w-4" />} label="Другой адрес" />
              </div>
              {from === "custom" && (
                <div className="mt-2"><AddressField value={fromAddr} onChange={setFromAddr} placeholder="Поиск адреса отправки" /></div>
              )}
            </div>

            {/* To */}
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--c-text)]">Куда</p>
              <div className="mb-2"><Select value={toCountry} onChange={setToCountry} options={COUNTRIES} className="w-44" /></div>
              <AddressField value={toAddr} onChange={setToAddr} placeholder="Индекс, город или адрес" />
            </div>

            {/* Package */}
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--c-text)]">Упаковка</p>
              <div className="flex gap-2">
                <ModeBtn active={pkg === "sample"} onClick={() => setPkg("sample")} icon={<Package className="h-4 w-4" />} label="Образец · 20×15×10 см" />
                <ModeBtn active={pkg === "custom"} onClick={() => setPkg("custom")} icon={<Pencil className="h-4 w-4" />} label="Свои размеры" />
              </div>
              {pkg === "custom" && (
                <div className="mt-2 flex gap-2">
                  <DimInput label="Д" value={dims.l} onChange={(v) => setDims({ ...dims, l: v })} />
                  <DimInput label="Ш" value={dims.w} onChange={(v) => setDims({ ...dims, w: v })} />
                  <DimInput label="В" value={dims.h} onChange={(v) => setDims({ ...dims, h: v })} />
                  <Select value={dimUnit} onChange={(v) => setDimUnit(v as "см" | "дюйм")} options={["см", "дюйм"]} className="w-24" />
                </div>
              )}
            </div>

            {/* Weight */}
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--c-text)]">Вес</p>
              <div className="flex gap-2">
                <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className="flex-1 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
                <Select value={weightUnit} onChange={(v) => setWeightUnit(v as "кг" | "г")} options={["кг", "г"]} className="w-20" />
              </div>
            </div>

            {warnings.length > 0 && (
              <div className="rounded-lg border border-[var(--c-amber)]/40 bg-[var(--c-amber)]/10 p-2.5 text-sm text-[var(--c-text2)]">
                {warnings.map((w) => (
                  <p key={w} className="flex items-start gap-1.5"><AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--c-amber)]" /> {w}</p>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-[var(--c-border)] p-4">
            <button
              onClick={calculate}
              disabled={loading}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90 disabled:opacity-60"
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              Рассчитать тарифы со скидкой
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="flex w-[42%] flex-col bg-[var(--c-bg)]">
          <div className="border-b border-[var(--c-border)] px-4 py-3 text-sm font-semibold text-[var(--c-text)]">Тарифы со скидкой</div>
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <div className="mt-10 flex flex-col items-center gap-2 text-sm text-[var(--c-text3)]">
                <Loader2 className="h-5 w-5 animate-spin" /> Считаем тарифы…
              </div>
            ) : !results ? (
              <p className="mt-8 text-center text-sm text-[var(--c-text3)]">
                Рассчитайте, сколько вы сэкономите, покупая этикетки по сниженным тарифам.
              </p>
            ) : (
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.carrier} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-[var(--c-text)]">{r.carrier}</span>
                      <span className="text-sm font-semibold text-[var(--c-text)]">{formatRub(r.price)}</span>
                    </div>
                    <div className="mt-0.5 flex items-center justify-between text-xs text-[var(--c-text3)]">
                      <span>{r.service}</span><span>{r.days}</span>
                    </div>
                  </div>
                ))}
                <p className="pt-1 text-xs text-[var(--c-text3)]">Оценка по объёмному весу. Точная стоимость — при покупке этикетки.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Address autocomplete ──────────────────────────────────────────────────────
function AddressField({ value, onChange, placeholder }: { value: string; onChange: (v: string) => void; placeholder: string }) {
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const skip = useRef(false); // skip fetch right after selecting

  useEffect(() => {
    if (skip.current) { skip.current = false; return; }
    const q = value.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/shipping/address-suggest?q=${encodeURIComponent(q)}`, { signal: ctrl.signal });
        const json = (await res.json()) as { suggestions: string[] };
        setSuggestions(json.suggestions ?? []);
        setOpen(true);
      } catch { /* aborted */ } finally { setLoading(false); }
    }, 250);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [value]);

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 focus-within:border-[var(--c-blue)]">
        <Search className="h-4 w-4 text-[var(--c-text3)]" />
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => suggestions.length && setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder={placeholder}
          className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]"
        />
        {loading && <Loader2 className="h-3.5 w-3.5 animate-spin text-[var(--c-text3)]" />}
      </div>
      {open && suggestions.length > 0 && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in">
          {suggestions.map((s) => (
            <button
              key={s}
              onMouseDown={() => { skip.current = true; onChange(s); setOpen(false); }}
              className="block w-full px-3 py-2 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]"
            >
              {s}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ModeBtn({ active, onClick, icon, label }: { active: boolean; onClick: () => void; icon: React.ReactNode; label: string }) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex flex-1 items-center gap-1.5 rounded-lg border px-2.5 py-2 text-sm transition",
        active ? "border-[var(--c-text)] text-[var(--c-text)]" : "border-[var(--c-border2)] text-[var(--c-text2)] hover:bg-[var(--c-bg)]",
      )}
    >
      <span className="shrink-0 text-[var(--c-text3)]">{icon}</span>
      <span className="truncate">{label}</span>
    </button>
  );
}

function Select({ value, onChange, options, className }: { value: string; onChange: (v: string) => void; options: string[]; className?: string }) {
  return (
    <div className={cn("relative", className)}>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full appearance-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 pr-7 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]">
        {options.map((o) => <option key={o}>{o}</option>)}
      </select>
      <ChevronsUpDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--c-text3)]" />
    </div>
  );
}

function DimInput({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="flex flex-1 items-center rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 focus-within:border-[var(--c-blue)]">
      <input value={value} onChange={(e) => onChange(e.target.value)} inputMode="decimal" className="w-full bg-transparent px-1 py-2 text-sm text-[var(--c-text)] outline-none" />
      <span className="text-xs text-[var(--c-text3)]">{label}</span>
    </div>
  );
}
