"use client";

import { useState } from "react";
import { X, MapPin, Pencil, Package, Search, ChevronsUpDown } from "lucide-react";
import { formatRub, cn } from "@/lib/utils";

type FromMode = "shop" | "custom";
type PkgMode = "sample" | "custom";

interface RateResult {
  carrier: string;
  days: string;
  price: number;
  tag?: string;
}

const COUNTRIES = ["Россия", "Казахстан", "Беларусь", "Армения"];

/** Estimate carrier rates from weight — a local stand-in for a carrier API. */
function estimateRates(weightKg: number): RateResult[] {
  const w = Math.max(0.1, weightKg);
  return [
    { carrier: "Почта России", days: "4–5 рабочих дней", price: Math.round(250 + w * 80), tag: "Дешевле" },
    { carrier: "СДЭК", days: "1–2 рабочих дня", price: Math.round(300 + w * 70), tag: "Быстрее" },
    { carrier: "Boxberry", days: "2–3 рабочих дня", price: Math.round(280 + w * 65) },
  ].sort((a, b) => a.price - b.price);
}

export function ShippingRateCalculator({ onClose }: { onClose: () => void }) {
  const [from, setFrom] = useState<FromMode>("shop");
  const [pkg, setPkg] = useState<PkgMode>("sample");
  const [toCountry, setToCountry] = useState("Россия");
  const [toAddress, setToAddress] = useState("");
  const [weight, setWeight] = useState("1");
  const [weightUnit, setWeightUnit] = useState("кг");
  const [results, setResults] = useState<RateResult[] | null>(null);

  const weightNum = parseFloat(weight) || 0;
  const missing: string[] = [];
  if (!toAddress.trim()) missing.push("адрес или индекс доставки");
  if (weightNum <= 0) missing.push("вес посылки");
  const valid = missing.length === 0;

  function calculate() {
    if (!valid) return;
    const kg = weightUnit === "г" ? weightNum / 1000 : weightNum;
    setResults(estimateRates(kg));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 animate-fade-in" onClick={onClose}>
      <div className="flex w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        {/* Left: form */}
        <div className="w-[58%] border-r border-[var(--c-border)]">
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
                <div className="mt-2 flex gap-2">
                  <Select value={toCountry} onChange={() => {}} options={COUNTRIES} className="w-36" />
                  <SearchInput placeholder="Поиск адреса" />
                </div>
              )}
            </div>

            {/* To */}
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--c-text)]">Куда</p>
              <div className="flex gap-2">
                <Select value={toCountry} onChange={setToCountry} options={COUNTRIES} className="w-36" />
                <SearchInput placeholder="Индекс или город" value={toAddress} onChange={setToAddress} />
              </div>
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
                  <DimInput label="Д" /><DimInput label="Ш" /><DimInput label="В" />
                  <Select value="см" onChange={() => {}} options={["см", "дюйм"]} className="w-20" />
                </div>
              )}
            </div>

            {/* Weight */}
            <div>
              <p className="mb-1 text-sm font-medium text-[var(--c-text)]">Вес</p>
              <div className="flex gap-2">
                <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className="flex-1 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
                <Select value={weightUnit} onChange={setWeightUnit} options={["кг", "г"]} className="w-20" />
              </div>
            </div>

            <div>
              <button
                onClick={calculate}
                disabled={!valid}
                className="w-full rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Рассчитать тарифы со скидкой
              </button>
              {!valid && (
                <p className="mt-1.5 text-xs text-[var(--c-text3)]">Заполните: {missing.join(", ")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Right: results */}
        <div className="flex w-[42%] flex-col bg-[var(--c-bg)]">
          <div className="border-b border-[var(--c-border)] px-4 py-3 text-sm font-semibold text-[var(--c-text)]">Тарифы</div>
          <div className="flex-1 overflow-y-auto p-4">
            {!results ? (
              <p className="mt-8 text-center text-sm text-[var(--c-text3)]">
                Рассчитайте, сколько вы сэкономите, покупая этикетки по сниженным тарифам.
              </p>
            ) : (
              <div className="space-y-2">
                {results.map((r) => (
                  <div key={r.carrier} className="flex items-center justify-between rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2.5">
                    <div className="leading-tight">
                      <div className="flex items-center gap-2 text-sm font-medium text-[var(--c-text)]">
                        {r.carrier}
                        {r.tag && <span className="rounded-md bg-[var(--c-bg3)] px-1.5 py-0.5 text-xs text-[var(--c-text2)]">{r.tag}</span>}
                      </div>
                      <div className="text-xs text-[var(--c-text3)]">{r.days}</div>
                    </div>
                    <span className="text-sm font-semibold text-[var(--c-text)]">{formatRub(r.price)}</span>
                  </div>
                ))}
                <p className="pt-1 text-xs text-[var(--c-text3)]">Оценка по весу. Точная стоимость — при покупке этикетки.</p>
              </div>
            )}
          </div>
        </div>
      </div>
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

function SearchInput({ placeholder, value, onChange }: { placeholder: string; value?: string; onChange?: (v: string) => void }) {
  return (
    <div className="flex flex-1 items-center gap-2 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 focus-within:border-[var(--c-blue)]">
      <Search className="h-4 w-4 text-[var(--c-text3)]" />
      <input value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={placeholder} className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]" />
    </div>
  );
}

function DimInput({ label }: { label: string }) {
  return (
    <div className="flex flex-1 items-center rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 focus-within:border-[var(--c-blue)]">
      <span className="text-xs text-[var(--c-text3)]">{label}</span>
      <input inputMode="decimal" className="w-full bg-transparent px-1.5 py-2 text-sm text-[var(--c-text)] outline-none" />
    </div>
  );
}
