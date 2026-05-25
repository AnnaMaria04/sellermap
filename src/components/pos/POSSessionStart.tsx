"use client";

import { useState, useEffect } from "react";
import { ShoppingCart } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { usePOSSession } from "@/store/pos-session";
import { toast } from "sonner";

function formatCurrentDate(d: Date): string {
  return d.toLocaleDateString("ru-RU", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

function formatCurrentTime(d: Date): string {
  return d.toLocaleTimeString("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function POSSessionStart() {
  const { locations } = useInventory();
  const { startSession } = usePOSSession();

  const storeLocations = locations.filter((l) => l.type !== "online_reserve");

  const [locationId, setLocationId] = useState(storeLocations[0]?.id ?? "");
  const [cashierName, setCashierName] = useState(() => {
    if (typeof window !== "undefined") {
      return localStorage.getItem("pos_cashier_name") ?? "";
    }
    return "";
  });
  const [openingCash, setOpeningCash] = useState("0");
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  function handleStart() {
    if (!locationId) {
      toast.error("Выберите локацию");
      return;
    }
    if (!cashierName.trim()) {
      toast.error("Введите имя кассира");
      return;
    }

    localStorage.setItem("pos_cashier_name", cashierName.trim());

    const location = storeLocations.find((l) => l.id === locationId);
    startSession({
      locationId,
      locationName: location?.name ?? locationId,
      cashierName: cashierName.trim(),
      openingCash: parseFloat(openingCash) || 0,
    });

    toast.success("Смена открыта");
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--c-bg)] p-4 pb-6">
      <div className="w-full max-w-md min-h-screen md:min-h-0 bg-[var(--c-bg2)] border border-[var(--c-border)] rounded-2xl shadow-xl overflow-hidden flex flex-col md:block">
        {/* Header */}
        <div className="flex flex-col items-center gap-3 px-8 pt-8 pb-6 border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
          <div className="flex items-center gap-2">
            <ShoppingCart className="w-7 h-7 text-[var(--c-green)]" />
            <span className="text-xl font-bold text-[var(--c-text)]">SellerMap</span>
          </div>
          <h1 className="text-lg font-semibold text-[var(--c-text)]">Начало смены</h1>
          <div className="text-center">
            <p className="text-sm text-[var(--c-text2)] capitalize">{formatCurrentDate(now)}</p>
            <p className="text-2xl font-mono font-semibold text-[var(--c-text)] mt-1 tabular-nums">
              {formatCurrentTime(now)}
            </p>
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 px-8 py-6 space-y-5">
          {/* Location */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">
              Локация
            </label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-12 w-full px-3 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] text-base text-[var(--c-text)] focus:outline-none focus:border-[var(--c-green)] transition-colors appearance-none"
            >
              {storeLocations.map((loc) => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {/* Cashier name */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">
              Имя кассира
            </label>
            <input
              type="text"
              value={cashierName}
              onChange={(e) => setCashierName(e.target.value)}
              placeholder="Ваше имя"
              className="h-12 w-full px-3 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] text-base text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-green)] transition-colors"
            />
          </div>

          {/* Opening cash */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">
              Сумма в кассе
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={openingCash}
                onChange={(e) => setOpeningCash(e.target.value)}
                placeholder="0"
                className="h-12 w-full pl-3 pr-8 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] text-base text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-green)] transition-colors tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text3)]">
                ₽
              </span>
            </div>
          </div>

          {/* Submit */}
          <button
            type="button"
            onClick={handleStart}
            className="h-14 w-full rounded-xl bg-[var(--c-green)] text-[var(--c-bg)] text-lg font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Начать смену
          </button>
        </div>
      </div>
    </div>
  );
}
