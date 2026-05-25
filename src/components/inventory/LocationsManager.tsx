"use client";

import { useState, useMemo } from "react";
import {
  Warehouse,
  Store,
  Eye,
  Globe,
  RotateCcw,
  AlertTriangle,
  Truck,
  Plus,
  X,
  Star,
  ArrowRightLeft,
  ClipboardList,
  Package,
  MapPin,
  ChevronRight,
  Check,
} from "lucide-react";
import { LOCATIONS, PRODUCTS, type Location } from "@/mock/inventory";
import { cn } from "@/lib/utils";

type LocationType = Location["type"];

const CAPACITY_MAX: Record<LocationType, number> = {
  warehouse: 1000,
  store: 200,
  showroom: 150,
  online_reserve: 500,
  returns: 100,
  damaged: 100,
  in_transit: 300,
  backroom: 150,
};

const TYPE_LABELS: Record<LocationType, string> = {
  warehouse: "Склад",
  store: "Магазин",
  showroom: "Шоурум",
  online_reserve: "Онлайн-резерв",
  returns: "Возвраты",
  damaged: "Брак",
  in_transit: "В пути",
  backroom: "Подсобка",
};

const TYPE_COLORS: Record<LocationType, string> = {
  warehouse: "text-[var(--c-blue)] bg-blue-500/10 border-blue-500/20",
  store: "text-[var(--c-green)] bg-green-500/10 border-green-500/20",
  showroom: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  online_reserve: "text-[var(--c-blue)] bg-blue-500/10 border-blue-500/20",
  returns: "text-[var(--c-amber)] bg-amber-500/10 border-amber-500/20",
  damaged: "text-[var(--c-red)] bg-red-500/10 border-red-500/20",
  in_transit: "text-[var(--c-text2)] bg-[var(--c-bg3)] border-[var(--c-border)]",
  backroom: "text-[var(--c-text2)] bg-[var(--c-bg3)] border-[var(--c-border)]",
};

function TypeIcon({ type, size = 16 }: { type: LocationType; size?: number }) {
  const props = { size, strokeWidth: 1.75 };
  if (type === "warehouse") return <Warehouse {...props} />;
  if (type === "store") return <Store {...props} />;
  if (type === "showroom") return <Eye {...props} />;
  if (type === "online_reserve") return <Globe {...props} />;
  if (type === "returns") return <RotateCcw {...props} />;
  if (type === "damaged") return <AlertTriangle {...props} />;
  if (type === "in_transit") return <Truck {...props} />;
  return <Package {...props} />;
}

function TypeBadge({ type }: { type: LocationType }) {
  return (
    <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium", TYPE_COLORS[type])}>
      <TypeIcon type={type} size={11} />
      {TYPE_LABELS[type]}
    </span>
  );
}

function getLocationUnits(locationId: string): number {
  return PRODUCTS.reduce((sum, p) => sum + (p.stockByLocation[locationId] ?? 0), 0);
}

function getLocationValue(locationId: string): number {
  return PRODUCTS.reduce((sum, p) => sum + (p.stockByLocation[locationId] ?? 0) * p.costPrice, 0);
}

function getLocationProductCount(locationId: string): number {
  return PRODUCTS.filter((p) => (p.stockByLocation[locationId] ?? 0) > 0).length;
}

function getLocationProducts(locationId: string) {
  return PRODUCTS.filter((p) => (p.stockByLocation[locationId] ?? 0) > 0).map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    qty: p.stockByLocation[locationId] ?? 0,
    value: (p.stockByLocation[locationId] ?? 0) * p.costPrice,
  }));
}

function formatRub(v: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(v);
}

interface NewLocationForm {
  name: string;
  type: LocationType;
  address: string;
  capacity: string;
}

const FORM_DEFAULTS: NewLocationForm = {
  name: "",
  type: "warehouse",
  address: "",
  capacity: "",
};

export function LocationsManager() {
  const [selectedLocation, setSelectedLocation] = useState<Location | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState<NewLocationForm>(FORM_DEFAULTS);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof NewLocationForm, string>>>({});
  const [saved, setSaved] = useState(false);

  const allLocations = useMemo(() => LOCATIONS, []);

  const totalUnits = useMemo(
    () => allLocations.reduce((s, l) => s + getLocationUnits(l.id), 0),
    [allLocations],
  );

  const warehouseCount = allLocations.filter((l) => l.type === "warehouse").length;
  const storeCount = allLocations.filter((l) => l.type === "store").length;

  function validate() {
    const errs: Partial<Record<keyof NewLocationForm, string>> = {};
    if (!formData.name.trim()) errs.name = "Введите название";
    if (!formData.capacity || isNaN(Number(formData.capacity)) || Number(formData.capacity) <= 0)
      errs.capacity = "Введите корректную вместимость";
    return errs;
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length > 0) {
      setFormErrors(errs);
      return;
    }
    console.log("Новая локация:", formData);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setShowAddForm(false);
      setFormData(FORM_DEFAULTS);
      setFormErrors({});
    }, 700);
  }

  function updateForm(field: keyof NewLocationForm, value: string) {
    setFormData((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Всего локаций", value: allLocations.length, color: "text-[var(--c-text)]" },
          { label: "Единиц товара", value: totalUnits.toLocaleString("ru-RU"), color: "text-[var(--c-blue)]" },
          { label: "Склады", value: warehouseCount, color: "text-[var(--c-green)]" },
          { label: "Магазины", value: storeCount, color: "text-[var(--c-amber)]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <p className="text-xs text-[var(--c-text2)] mb-1.5">{s.label}</p>
            <p className={cn("text-2xl font-bold tabular", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--c-text)]">Локации и склады</h2>
        <button
          onClick={() => { setShowAddForm(true); setFormData(FORM_DEFAULTS); setFormErrors({}); }}
          className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
        >
          <Plus size={15} />
          Добавить локацию
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {allLocations.map((loc) => {
          const units = getLocationUnits(loc.id);
          const value = getLocationValue(loc.id);
          const productCount = getLocationProductCount(loc.id);
          const capacityMax = CAPACITY_MAX[loc.type] ?? 500;
          const pct = Math.min(100, Math.round((units / capacityMax) * 100));

          return (
            <LocationCard
              key={loc.id}
              location={loc}
              units={units}
              value={value}
              productCount={productCount}
              capacityMax={capacityMax}
              capacityPct={pct}
              onClick={() => setSelectedLocation(loc)}
            />
          );
        })}
      </div>

      {selectedLocation && (
        <LocationDetailPanel
          location={selectedLocation}
          onClose={() => setSelectedLocation(null)}
        />
      )}

      {showAddForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowAddForm(false)} />
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-[var(--c-bg)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Добавить локацию</h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-5 p-6">
                <Field label="Название" error={formErrors.name} required>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => updateForm("name", e.target.value)}
                    placeholder="Например: Склад №2"
                    className={cn(
                      "h-9 w-full rounded-lg border bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none",
                      formErrors.name ? "border-[var(--c-red)]" : "border-[var(--c-border)] focus:border-[var(--c-green)]",
                    )}
                  />
                </Field>

                <Field label="Тип">
                  <select
                    value={formData.type}
                    onChange={(e) => updateForm("type", e.target.value as LocationType)}
                    className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                  >
                    {(Object.keys(TYPE_LABELS) as LocationType[]).map((t) => (
                      <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Адрес">
                  <input
                    type="text"
                    value={formData.address}
                    onChange={(e) => updateForm("address", e.target.value)}
                    placeholder="Город, улица, дом"
                    className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                  />
                </Field>

                <Field label="Вместимость (ед.)" error={formErrors.capacity} required>
                  <input
                    type="number"
                    min={1}
                    value={formData.capacity}
                    onChange={(e) => updateForm("capacity", e.target.value)}
                    placeholder="500"
                    className={cn(
                      "h-9 w-full rounded-lg border bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none",
                      formErrors.capacity ? "border-[var(--c-red)]" : "border-[var(--c-border)] focus:border-[var(--c-green)]",
                    )}
                  />
                </Field>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="h-10 rounded-lg border border-[var(--c-border)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={saved}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
                    saved
                      ? "bg-[var(--c-green)]/70 text-[var(--c-bg)] cursor-not-allowed"
                      : "bg-[var(--c-green)] text-[var(--c-bg)] hover:bg-[#25e890]",
                  )}
                >
                  {saved ? <><Check size={14} /> Сохранено</> : "Создать локацию"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">
        {label}
        {required && <span className="ml-0.5 text-[var(--c-red)]">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-[var(--c-red)]">{error}</p>}
    </div>
  );
}

function LocationCard({
  location,
  units,
  value,
  productCount,
  capacityMax,
  capacityPct,
  onClick,
}: {
  location: Location;
  units: number;
  value: number;
  productCount: number;
  capacityMax: number;
  capacityPct: number;
  onClick: () => void;
}) {
  const barColor =
    capacityPct >= 90
      ? "bg-[var(--c-red)]"
      : capacityPct >= 70
        ? "bg-[var(--c-amber)]"
        : "bg-[var(--c-green)]";

  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col gap-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5 hover:bg-[var(--c-bg3)] transition"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={cn("flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border", TYPE_COLORS[location.type])}>
            <TypeIcon type={location.type} size={18} />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-1.5">
              <p className="truncate text-sm font-semibold text-[var(--c-text)]">{location.name}</p>
              {location.isDefault && (
                <span className="flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                  <Star size={8} fill="currentColor" />
                  По умолчанию
                </span>
              )}
            </div>
            {location.address && (
              <p className="mt-0.5 flex items-center gap-1 text-xs text-[var(--c-text3)] truncate">
                <MapPin size={10} />
                {location.address}
              </p>
            )}
          </div>
        </div>
        <TypeBadge type={location.type} />
      </div>

      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-[var(--c-text3)]">Заполненность</span>
          <span className={cn("font-medium tabular", capacityPct >= 90 ? "text-[var(--c-red)]" : capacityPct >= 70 ? "text-[var(--c-amber)]" : "text-[var(--c-text2)]")}>
            {units} / {capacityMax} ед. ({capacityPct}%)
          </span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-[var(--c-bg3)]">
          <div
            className={cn("h-full rounded-full transition-all", barColor)}
            style={{ width: `${capacityPct}%` }}
          />
        </div>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex gap-4">
          <div>
            <p className="text-xs text-[var(--c-text3)]">Позиций</p>
            <p className="mt-0.5 text-sm font-semibold tabular text-[var(--c-text)]">{productCount}</p>
          </div>
          <div>
            <p className="text-xs text-[var(--c-text3)]">Стоимость</p>
            <p className="mt-0.5 text-sm font-semibold tabular text-[var(--c-text)]">{formatRub(value)}</p>
          </div>
        </div>
        <ChevronRight
          size={16}
          className="text-[var(--c-text3)] opacity-0 transition group-hover:opacity-100"
        />
      </div>
    </div>
  );
}

function LocationDetailPanel({ location, onClose }: { location: Location; onClose: () => void }) {
  const products = useMemo(() => getLocationProducts(location.id), [location.id]);
  const units = getLocationUnits(location.id);
  const value = getLocationValue(location.id);
  const capacityMax = CAPACITY_MAX[location.type] ?? 500;
  const pct = Math.min(100, Math.round((units / capacityMax) * 100));
  const barColor =
    pct >= 90 ? "bg-[var(--c-red)]" : pct >= 70 ? "bg-[var(--c-amber)]" : "bg-[var(--c-green)]";

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className={cn("flex h-9 w-9 items-center justify-center rounded-xl border", TYPE_COLORS[location.type])}>
              <TypeIcon type={location.type} size={16} />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h2 className="text-base font-semibold text-[var(--c-text)]">{location.name}</h2>
                {location.isDefault && (
                  <span className="flex items-center gap-0.5 rounded-full bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-semibold text-amber-400">
                    <Star size={8} fill="currentColor" />
                    По умолчанию
                  </span>
                )}
              </div>
              <TypeBadge type={location.type} />
            </div>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {location.address && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] px-4 py-3">
              <MapPin size={14} className="text-[var(--c-text3)]" />
              <p className="text-sm text-[var(--c-text)]">{location.address}</p>
            </div>
          )}

          <div className="grid grid-cols-3 gap-3">
            {[
              { label: "Единиц", value: units.toLocaleString("ru-RU") },
              { label: "Позиций", value: products.length },
              { label: "Стоимость", value: formatRub(value) },
            ].map((s) => (
              <div key={s.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-3 text-center">
                <p className="text-xs text-[var(--c-text3)]">{s.label}</p>
                <p className="mt-1 text-base font-bold text-[var(--c-text)] tabular">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-[var(--c-text2)]">Заполненность склада</span>
              <span className={cn("tabular font-medium", pct >= 90 ? "text-[var(--c-red)]" : pct >= 70 ? "text-[var(--c-amber)]" : "text-[var(--c-text2)]")}>
                {units} / {capacityMax} ед. ({pct}%)
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[var(--c-bg3)]">
              <div className={cn("h-full rounded-full transition-all", barColor)} style={{ width: `${pct}%` }} />
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-text2)]">
              Товары на локации
            </h3>
            {products.length === 0 ? (
              <div className="flex items-center justify-center rounded-xl border border-dashed border-[var(--c-border)] py-10 text-sm text-[var(--c-text3)]">
                Нет товаров на этой локации
              </div>
            ) : (
              <div className="overflow-hidden rounded-xl border border-[var(--c-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">Товар</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">Артикул</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Кол-во</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Сумма</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--c-border)]">
                    {products.map((p) => (
                      <tr key={p.id} className="bg-[var(--c-bg2)] hover:bg-[var(--c-bg3)] transition">
                        <td className="px-4 py-3 text-xs font-medium text-[var(--c-text)]">{p.name}</td>
                        <td className="px-4 py-3 text-xs text-[var(--c-text3)] font-mono">{p.sku}</td>
                        <td className="px-4 py-3 text-right text-xs font-semibold tabular text-[var(--c-text)]">{p.qty}</td>
                        <td className="px-4 py-3 text-right text-xs tabular text-[var(--c-text2)]">{formatRub(p.value)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 border-t border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <button
            onClick={() => console.log("Перемещение из", location.id)}
            className="flex h-10 items-center justify-center gap-2 rounded-lg border border-[var(--c-border)] text-sm font-medium text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
          >
            <ArrowRightLeft size={14} />
            Переместить
          </button>
          <button
            onClick={() => console.log("Инвентаризация", location.id)}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
          >
            <ClipboardList size={14} />
            Инвентаризация
          </button>
        </div>
      </div>
    </div>
  );
}
