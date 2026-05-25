"use client";

import { useState, useMemo, useCallback } from "react";
import {
  Package,
  Plus,
  Trash2,
  Edit2,
  ChevronRight,
  X,
  AlertTriangle,
  Star,
  Layers,
  Tag,
  TrendingUp,
  ToggleRight,
  ToggleLeft,
  Info,
  ShoppingBag,
  Zap,
  Check,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";

interface BundleComponent {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  costContribution: number;
}

interface Bundle {
  id: string;
  name: string;
  sku: string;
  status: "active" | "draft" | "archived";
  components: BundleComponent[];
  sellingPrice: number;
  totalCost: number;
  margin: number;
  virtualStock: number;
  createdAt: string;
  channels: string[];
}

const MOCK_BUNDLES: Bundle[] = [
  {
    id: "bnd-001",
    name: "Дорожный набор Премиум",
    sku: "BND-TRAVEL-001",
    status: "active",
    components: [
      { productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", qty: 1, costContribution: 820 },
      { productId: "prod-002", productName: "Несессер водонепроницаемый", sku: "NSS-002", qty: 1, costContribution: 540 },
      { productId: "prod-003", productName: "Компрессионные мешки 3 шт", sku: "CMP-003", qty: 2, costContribution: 290 },
    ],
    sellingPrice: 4990,
    totalCost: 1940,
    margin: 61.1,
    virtualStock: 17,
    createdAt: "2025-03-15",
    channels: ["wildberries", "ozon", "website"],
  },
  {
    id: "bnd-002",
    name: "Кофейный стартер",
    sku: "BND-COFFEE-001",
    status: "active",
    components: [
      { productId: "prod-005", productName: "Кофе зерновой 250г", sku: "COF-005", qty: 2, costContribution: 680 },
      { productId: "prod-006", productName: "Фильтры для кофе 100 шт", sku: "FLT-006", qty: 1, costContribution: 180 },
    ],
    sellingPrice: 2490,
    totalCost: 1540,
    margin: 38.2,
    virtualStock: 18,
    createdAt: "2025-04-02",
    channels: ["wildberries", "website"],
  },
  {
    id: "bnd-003",
    name: "Набор для хранения",
    sku: "BND-STORE-001",
    status: "draft",
    components: [
      { productId: "prod-003", productName: "Компрессионные мешки 3 шт", sku: "CMP-003", qty: 1, costContribution: 290 },
      { productId: "prod-006", productName: "Фильтры для кофе 100 шт", sku: "FLT-006", qty: 2, costContribution: 180 },
      { productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", qty: 1, costContribution: 820 },
    ],
    sellingPrice: 2190,
    totalCost: 1470,
    margin: 32.9,
    virtualStock: 9,
    createdAt: "2025-04-20",
    channels: ["ozon"],
  },
  {
    id: "bnd-004",
    name: "Подарочный набор Путешественника",
    sku: "BND-GIFT-001",
    status: "archived",
    components: [
      { productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", qty: 1, costContribution: 820 },
      { productId: "prod-004", productName: "Замок для чемодана TSA", sku: "LCK-004", qty: 2, costContribution: 340 },
    ],
    sellingPrice: 3290,
    totalCost: 1500,
    margin: 54.4,
    virtualStock: 0,
    createdAt: "2025-02-10",
    channels: ["pos", "website"],
  },
];

const CHANNEL_LABELS: Record<string, string> = {
  wildberries: "WB",
  ozon: "Ozon",
  website: "Сайт",
  pos: "POS",
  yandex_market: "YM",
  telegram: "TG",
};

const STATUS_CONFIG = {
  active:   { label: "Активен",    color: "text-[var(--c-green)]  bg-[var(--c-green)]/10" },
  draft:    { label: "Черновик",   color: "text-[var(--c-amber)]  bg-[var(--c-amber)]/10" },
  archived: { label: "Архив",      color: "text-[var(--c-text3)]  bg-[var(--c-bg3)]" },
};

function fmt(n: number) {
  return n.toLocaleString("ru-RU");
}

function marginColor(m: number) {
  if (m >= 50) return "text-[var(--c-green)] bg-[var(--c-green)]/10";
  if (m >= 30) return "text-[var(--c-amber)] bg-[var(--c-amber)]/10";
  return "text-[var(--c-red)] bg-[var(--c-red)]/10";
}

function getVirtualStock(bundle: Bundle, stockOf: (productId: string) => number): number {
  let min = Infinity;
  for (const c of bundle.components) {
    const avail = stockOf(c.productId);
    const possible = Math.floor(avail / c.qty);
    if (possible < min) min = possible;
  }
  return min === Infinity ? 0 : min;
}

export function BundleProductsPanel() {
  const { products, getAvailableStock: ctxGetAvailableStock } = useInventory();
  const stockOf = useCallback(
    (productId: string) => {
      const p = products.find((x) => x.id === productId);
      return p ? ctxGetAvailableStock(p) : 0;
    },
    [products, ctxGetAvailableStock]
  );
  const [bundles, setBundles] = useState<Bundle[]>(MOCK_BUNDLES);
  const [selected, setSelected] = useState<Bundle | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [autoAssembly, setAutoAssembly] = useState(false);
  const [assembleQty, setAssembleQty] = useState<Record<string, string>>({});
  const [showTooltip, setShowTooltip] = useState(false);
  const [search, setSearch] = useState("");

  const [form, setForm] = useState({
    name: "",
    sku: "",
    sellingPrice: "",
    channels: [] as string[],
    components: [] as Array<{ productId: string; productName: string; sku: string; qty: number }>,
  });
  const [compSearch, setCompSearch] = useState("");

  const filtered = useMemo(
    () => bundles.filter(b => b.name.toLowerCase().includes(search.toLowerCase()) || b.sku.toLowerCase().includes(search.toLowerCase())),
    [bundles, search]
  );

  const stats = useMemo(() => {
    const active = bundles.filter(b => b.status === "active");
    const avgMargin = active.length ? active.reduce((s, b) => s + b.margin, 0) / active.length : 0;
    const totalStockValue = bundles
      .filter(b => b.status === "active")
      .reduce((s, b) => s + getVirtualStock(b, stockOf) * b.sellingPrice, 0);
    return { total: bundles.length, active: active.length, avgMargin, totalStockValue };
  }, [bundles, stockOf]);

  function handleDelete(id: string) {
    setBundles(prev => prev.filter(b => b.id !== id));
    if (selected?.id === id) setSelected(null);
  }

  function handleExplode(bundle: Bundle) {
    setBundles(prev => prev.map(b => b.id === bundle.id ? { ...b, status: "archived" as const } : b));
    setSelected(null);
  }

  function handleAssemble(bundle: Bundle) {
    const qty = parseInt(assembleQty[bundle.id] || "0", 10);
    if (!qty || qty <= 0) return;
    setBundles(prev => prev.map(b => b.id === bundle.id ? { ...b, virtualStock: Math.max(0, getVirtualStock(b, stockOf) - qty) } : b));
    setAssembleQty(prev => ({ ...prev, [bundle.id]: "" }));
  }

  function handleAddComponent(p: Product) {
    if (form.components.find(c => c.productId === p.id)) return;
    setForm(prev => ({
      ...prev,
      components: [...prev.components, { productId: p.id, productName: p.name, sku: p.sku, qty: 1 }],
    }));
    setCompSearch("");
  }

  function handleCreateBundle() {
    if (!form.name || !form.sku || form.components.length === 0) return;
    const totalCost = form.components.reduce((s, c) => {
      const p = products.find(x => x.id === c.productId);
      return s + (p?.costPrice ?? 0) * c.qty;
    }, 0);
    const price = parseFloat(form.sellingPrice) || 0;
    const margin = price > 0 ? ((price - totalCost) / price) * 100 : 0;
    const newBundle: Bundle = {
      id: `bnd-${Date.now()}`,
      name: form.name,
      sku: form.sku,
      status: "draft",
      components: form.components.map(c => {
        const p = products.find(x => x.id === c.productId);
        return { productId: c.productId, productName: c.productName, sku: c.sku, qty: c.qty, costContribution: (p?.costPrice ?? 0) * c.qty };
      }),
      sellingPrice: price,
      totalCost,
      margin,
      virtualStock: 0,
      createdAt: new Date().toISOString().split("T")[0],
      channels: form.channels,
    };
    setBundles(prev => [newBundle, ...prev]);
    setShowCreate(false);
    setForm({ name: "", sku: "", sellingPrice: "", channels: [], components: [] });
  }

  const liveMargin = useMemo(() => {
    const price = parseFloat(form.sellingPrice) || 0;
    const totalCost = form.components.reduce((s, c) => {
      const p = products.find(x => x.id === c.productId);
      return s + (p?.costPrice ?? 0) * c.qty;
    }, 0);
    return price > 0 ? { margin: ((price - totalCost) / price) * 100, cost: totalCost } : { margin: 0, cost: totalCost };
  }, [form.sellingPrice, form.components, products]);

  const productResults = useMemo(
    () => compSearch.length > 1 ? products.filter(p => p.name.toLowerCase().includes(compSearch.toLowerCase()) || p.sku.toLowerCase().includes(compSearch.toLowerCase())).slice(0, 6) : [],
    [compSearch, products]
  );

  const bestBundle = useMemo(() => {
    const active = bundles.filter(b => b.status === "active");
    return active.length ? active.reduce((a, b) => b.margin > a.margin ? b : a) : null;
  }, [bundles]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Комплекты и наборы</h2>
          <p className="text-sm text-[var(--c-text3)] mt-0.5">Управление составными товарами и наборами</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setAutoAssembly(v => !v)}
            className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            {autoAssembly ? <ToggleRight size={16} className="text-[var(--c-green)]" /> : <ToggleLeft size={16} />}
            Авто-сборка
          </button>
          <button
            onClick={() => setShowCreate(true)}
            className="flex items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
          >
            <Plus size={15} />
            Создать комплект
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: "Всего комплектов", value: stats.total, icon: Layers, color: "text-[var(--c-blue)]" },
          { label: "Активных", value: stats.active, icon: Check, color: "text-[var(--c-green)]" },
          { label: "Средняя маржа", value: `${stats.avgMargin.toFixed(1)}%`, icon: TrendingUp, color: "text-[var(--c-amber)]" },
          { label: "Стоимость виртуального стока", value: `${fmt(stats.totalStockValue)} ₽`, icon: Tag, color: "text-[var(--c-text2)]" },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex items-center gap-2 mb-2">
              <s.icon size={15} className={s.color} />
              <span className="text-xs text-[var(--c-text3)]">{s.label}</span>
            </div>
            <div className="text-xl font-bold text-[var(--c-text)]">{s.value}</div>
          </div>
        ))}
      </div>

      {bestBundle && (
        <div className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3">
          <Star size={16} className="text-[var(--c-amber)] shrink-0" />
          <span className="text-sm text-[var(--c-text2)]">
            Лучший комплект по марже: <span className="font-medium text-[var(--c-text)]">{bestBundle.name}</span>
            {" "}&mdash; маржа <span className="text-[var(--c-green)] font-medium">{bestBundle.margin.toFixed(1)}%</span>
          </span>
        </div>
      )}

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Поиск по названию или SKU..."
            className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] pl-9 pr-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-blue)]"
          />
        </div>
      </div>

      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--c-border)]">
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Комплект</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Состав</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">
                <div className="flex items-center justify-end gap-1">
                  Виртуальный остаток
                  <button
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="relative"
                  >
                    <Info size={13} className="text-[var(--c-text3)] hover:text-[var(--c-text2)]" />
                    {showTooltip && (
                      <div className="absolute right-0 top-6 z-10 w-64 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] p-3 text-xs text-[var(--c-text2)] shadow-lg">
                        Рассчитывается как минимальное доступное кол-во среди компонентов с учётом нормы вхождения в комплект.
                      </div>
                    )}
                  </button>
                </div>
              </th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Цена продажи</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Себестоимость</th>
              <th className="px-4 py-3 text-right font-medium text-[var(--c-text3)]">Маржа</th>
              <th className="px-4 py-3 text-left font-medium text-[var(--c-text3)]">Статус</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(bundle => {
              const vs = getVirtualStock(bundle, stockOf);
              const hasNoStock = bundle.components.some(c => stockOf(c.productId) === 0);
              return (
                <tr
                  key={bundle.id}
                  onClick={() => setSelected(bundle)}
                  className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-bg3)] cursor-pointer transition"
                >
                  <td className="px-4 py-3">
                    <div className="font-medium text-[var(--c-text)]">{bundle.name}</div>
                    <div className="text-xs text-[var(--c-text3)]">{bundle.sku}</div>
                    {hasNoStock && (
                      <div className="flex items-center gap-1 mt-1 text-xs text-[var(--c-red)]">
                        <AlertTriangle size={11} />
                        Нет в наличии
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-[var(--c-bg3)] px-2.5 py-0.5 text-xs font-medium text-[var(--c-text2)]">
                      {bundle.components.length} товара
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right font-medium text-[var(--c-text)]">{vs} шт</td>
                  <td className="px-4 py-3 text-right text-[var(--c-text)]">{fmt(bundle.sellingPrice)} ₽</td>
                  <td className="px-4 py-3 text-right text-[var(--c-text2)]">{fmt(bundle.totalCost)} ₽</td>
                  <td className="px-4 py-3 text-right">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", marginColor(bundle.margin))}>
                      {bundle.margin.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", STATUS_CONFIG[bundle.status].color)}>
                      {STATUS_CONFIG[bundle.status].label}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1" onClick={e => e.stopPropagation()}>
                      <button
                        onClick={() => setSelected(bundle)}
                        className="rounded p-1.5 text-[var(--c-text3)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(bundle.id)}
                        className="rounded p-1.5 text-[var(--c-text3)] hover:text-[var(--c-red)] hover:bg-[var(--c-red)]/10 transition"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="px-4 py-12 text-center text-sm text-[var(--c-text3)]">
                  Комплекты не найдены
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex items-start justify-end bg-black/40" onClick={() => setSelected(null)}>
          <div
            className="h-full w-full max-w-xl overflow-y-auto bg-[var(--c-bg)] border-l border-[var(--c-border)] shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="sticky top-0 z-10 flex items-center justify-between border-b border-[var(--c-border)] bg-[var(--c-bg)] px-6 py-4">
              <div>
                <h3 className="font-semibold text-[var(--c-text)]">{selected.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-[var(--c-text3)]">{selected.sku}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", STATUS_CONFIG[selected.status].color)}>
                    {STATUS_CONFIG[selected.status].label}
                  </span>
                </div>
              </div>
              <button onClick={() => setSelected(null)} className="rounded-lg p-2 hover:bg-[var(--c-bg3)] transition">
                <X size={18} className="text-[var(--c-text3)]" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div className="flex flex-wrap gap-2">
                {selected.channels.map(ch => (
                  <span key={ch} className="rounded-full bg-[var(--c-bg3)] border border-[var(--c-border)] px-3 py-1 text-xs text-[var(--c-text2)]">
                    {CHANNEL_LABELS[ch] ?? ch}
                  </span>
                ))}
              </div>

              <div>
                <h4 className="text-sm font-medium text-[var(--c-text)] mb-3">Компоненты</h4>
                <div className="rounded-xl border border-[var(--c-border)] overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                        <th className="px-3 py-2 text-left text-xs font-medium text-[var(--c-text3)]">Товар</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--c-text3)]">Кол-во</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--c-text3)]">Остаток</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-[var(--c-text3)]">Макс. из остатка</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selected.components.map(comp => {
                        const avail = stockOf(comp.productId);
                        const maxFromThis = Math.floor(avail / comp.qty);
                        const vs = getVirtualStock(selected, stockOf);
                        const isLimiting = maxFromThis === vs;
                        return (
                          <tr key={comp.productId} className={cn("border-b border-[var(--c-border)] last:border-0", isLimiting && "bg-[var(--c-amber)]/5")}>
                            <td className="px-3 py-2.5">
                              <div className={cn("font-medium", isLimiting ? "text-[var(--c-amber)]" : "text-[var(--c-text)]")}>{comp.productName}</div>
                              <div className="text-xs text-[var(--c-text3)]">{comp.sku}</div>
                            </td>
                            <td className="px-3 py-2.5 text-right text-[var(--c-text)]">{comp.qty} шт</td>
                            <td className="px-3 py-2.5 text-right">
                              {avail === 0
                                ? <span className="text-[var(--c-red)] font-medium">0 шт</span>
                                : <span className="text-[var(--c-text)]">{avail} шт</span>
                              }
                            </td>
                            <td className="px-3 py-2.5 text-right">
                              <span className={cn("font-medium", isLimiting ? "text-[var(--c-amber)]" : "text-[var(--c-text2)]")}>
                                {maxFromThis} шт
                                {isLimiting && " ⚠"}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                <p className="mt-2 text-xs text-[var(--c-text3)]">
                  Ограничивающий компонент выделен — именно он определяет виртуальный остаток.
                </p>
              </div>

              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 space-y-2.5">
                <h4 className="text-sm font-medium text-[var(--c-text)] mb-1">Структура цены</h4>
                {selected.components.map(comp => (
                  <div key={comp.productId} className="flex items-center justify-between text-sm">
                    <span className="text-[var(--c-text2)]">{comp.productName} × {comp.qty}</span>
                    <span className="text-[var(--c-text)]">{fmt(comp.costContribution)} ₽</span>
                  </div>
                ))}
                <div className="flex items-center justify-between text-sm">
                  <span className="text-[var(--c-text2)]">Упаковка</span>
                  <span className="text-[var(--c-text)]">80 ₽</span>
                </div>
                <div className="border-t border-[var(--c-border)] pt-2 flex items-center justify-between text-sm font-medium">
                  <span className="text-[var(--c-text2)]">Себестоимость итого</span>
                  <span className="text-[var(--c-text)]">{fmt(selected.totalCost)} ₽</span>
                </div>
                <div className="flex items-center justify-between text-sm font-medium">
                  <span className="text-[var(--c-text2)]">Цена продажи</span>
                  <span className="text-[var(--c-green)]">{fmt(selected.sellingPrice)} ₽</span>
                </div>
                <div className="flex items-center justify-between text-sm font-bold">
                  <span className="text-[var(--c-text)]">Маржа</span>
                  <span className={cn("rounded-full px-2.5 py-0.5 text-xs", marginColor(selected.margin))}>
                    {selected.margin.toFixed(1)}%
                  </span>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-medium text-[var(--c-text)] mb-3">Собрать комплекты</h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min="1"
                    value={assembleQty[selected.id] ?? ""}
                    onChange={e => setAssembleQty(prev => ({ ...prev, [selected.id]: e.target.value }))}
                    placeholder="Кол-во"
                    className="w-28 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                  <button
                    onClick={() => handleAssemble(selected)}
                    className="flex items-center gap-2 rounded-lg bg-[var(--c-blue)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
                  >
                    <Zap size={14} />
                    Собрать {assembleQty[selected.id] ? `${assembleQty[selected.id]} шт` : ""}
                  </button>
                </div>
              </div>

              <button
                onClick={() => handleExplode(selected)}
                className="flex w-full items-center justify-center gap-2 rounded-xl border border-[var(--c-red)]/40 py-2.5 text-sm font-medium text-[var(--c-red)] hover:bg-[var(--c-red)]/5 transition"
              >
                <Trash2 size={15} />
                Разобрать комплект
              </button>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
              <h3 className="font-semibold text-[var(--c-text)]">Создать комплект</h3>
              <button onClick={() => setShowCreate(false)} className="rounded-lg p-2 hover:bg-[var(--c-bg3)] transition">
                <X size={18} className="text-[var(--c-text3)]" />
              </button>
            </div>
            <div className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Название</label>
                  <input
                    value={form.name}
                    onChange={e => setForm(p => ({ ...p, name: e.target.value }))}
                    placeholder="Дорожный набор..."
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">SKU</label>
                  <input
                    value={form.sku}
                    onChange={e => setForm(p => ({ ...p, sku: e.target.value }))}
                    placeholder="BND-001"
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Цена продажи (₽)</label>
                <input
                  type="number"
                  value={form.sellingPrice}
                  onChange={e => setForm(p => ({ ...p, sellingPrice: e.target.value }))}
                  placeholder="0"
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                />
                {form.sellingPrice && (
                  <div className="mt-2 flex items-center gap-4 text-xs">
                    <span className="text-[var(--c-text3)]">Себестоимость: {fmt(liveMargin.cost)} ₽</span>
                    <span className={cn("font-medium", liveMargin.margin >= 30 ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                      Маржа: {liveMargin.margin.toFixed(1)}%
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Каналы продаж</label>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                    <button
                      key={k}
                      onClick={() => setForm(p => ({
                        ...p,
                        channels: p.channels.includes(k) ? p.channels.filter(c => c !== k) : [...p.channels, k],
                      }))}
                      className={cn(
                        "rounded-full border px-3 py-1 text-xs transition",
                        form.channels.includes(k)
                          ? "border-[var(--c-blue)] bg-[var(--c-blue)]/10 text-[var(--c-blue)]"
                          : "border-[var(--c-border)] text-[var(--c-text3)] hover:border-[var(--c-text3)]"
                      )}
                    >
                      {v}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--c-text2)] mb-1.5">Добавить компоненты</label>
                <div className="relative">
                  <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                  <input
                    value={compSearch}
                    onChange={e => setCompSearch(e.target.value)}
                    placeholder="Поиск товара..."
                    className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] pl-9 pr-3 py-2 text-sm text-[var(--c-text)] focus:outline-none focus:border-[var(--c-blue)]"
                  />
                  {productResults.length > 0 && (
                    <div className="absolute left-0 right-0 top-full z-20 mt-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] shadow-lg">
                      {productResults.map(p => (
                        <button
                          key={p.id}
                          onClick={() => handleAddComponent(p)}
                          className="flex w-full items-center justify-between px-3 py-2 text-sm hover:bg-[var(--c-bg3)] transition"
                        >
                          <span className="text-[var(--c-text)]">{p.name}</span>
                          <span className="text-[var(--c-text3)]">{p.sku}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {form.components.length > 0 && (
                  <div className="mt-3 space-y-2">
                    {form.components.map((comp, idx) => (
                      <div key={comp.productId} className="flex items-center gap-3 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-2">
                        <span className="flex-1 text-sm text-[var(--c-text)]">{comp.productName}</span>
                        <input
                          type="number"
                          min="1"
                          value={comp.qty}
                          onChange={e => setForm(p => ({
                            ...p,
                            components: p.components.map((c, i) => i === idx ? { ...c, qty: parseInt(e.target.value) || 1 } : c),
                          }))}
                          className="w-16 rounded border border-[var(--c-border)] bg-[var(--c-bg)] px-2 py-1 text-center text-sm text-[var(--c-text)]"
                        />
                        <span className="text-xs text-[var(--c-text3)]">шт</span>
                        <button
                          onClick={() => setForm(p => ({ ...p, components: p.components.filter((_, i) => i !== idx) }))}
                          className="text-[var(--c-text3)] hover:text-[var(--c-red)]"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  onClick={() => setShowCreate(false)}
                  className="flex-1 rounded-xl border border-[var(--c-border)] py-2.5 text-sm text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition"
                >
                  Отмена
                </button>
                <button
                  onClick={handleCreateBundle}
                  className="flex-1 rounded-xl bg-[var(--c-green)] py-2.5 text-sm font-medium text-white hover:opacity-90 transition disabled:opacity-50"
                  disabled={!form.name || !form.sku || form.components.length === 0}
                >
                  Создать комплект
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
