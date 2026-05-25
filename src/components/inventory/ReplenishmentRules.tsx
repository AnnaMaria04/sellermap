"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  X,
  Edit2,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  PauseCircle,
  ShoppingCart,
  Search,
  Check,
  Package,
  ChevronDown,
} from "lucide-react";
import { type ReplenishmentRule, type TriggerType } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";

type RuleStatus = "active" | "paused" | "triggered";

const TRIGGER_LABELS: Record<TriggerType, string> = {
  min_stock: "Мин. остаток",
  days_of_stock: "Дней запаса",
  reorder_point: "Точка перезаказа",
};

const TRIGGER_COLORS: Record<TriggerType, string> = {
  min_stock: "text-[var(--c-blue)] bg-blue-500/10 border-blue-500/20",
  days_of_stock: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  reorder_point: "text-[var(--c-green)] bg-green-500/10 border-green-500/20",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function isTriggeredRecently(rule: ReplenishmentRule): boolean {
  if (!rule.lastTriggered) return false;
  const diff = new Date().getTime() - new Date(rule.lastTriggered).getTime();
  return diff <= 7 * 24 * 3600 * 1000;
}

function getRuleStatus(rule: ReplenishmentRule): RuleStatus {
  if (!rule.isActive) return "paused";
  if (isTriggeredRecently(rule)) return "triggered";
  return "active";
}

interface FormData {
  productId: string;
  supplierId: string;
  triggerType: TriggerType;
  triggerValue: string;
  reorderQty: string;
  isActive: boolean;
}

const FORM_DEFAULTS: FormData = {
  productId: "",
  supplierId: "",
  triggerType: "min_stock",
  triggerValue: "",
  reorderQty: "",
  isActive: true,
};

function StatusIcon({ status }: { status: RuleStatus }) {
  if (status === "triggered") return <AlertTriangle size={14} className="text-[var(--c-amber)]" />;
  if (status === "active") return <CheckCircle2 size={14} className="text-[var(--c-green)]" />;
  return <PauseCircle size={14} className="text-[var(--c-text3)]" />;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div
      onClick={() => onChange(!checked)}
      className={cn(
        "relative flex h-5 w-9 cursor-pointer items-center rounded-full border transition-all",
        checked
          ? "bg-[var(--c-green)] border-[var(--c-green)]"
          : "bg-[var(--c-bg3)] border-[var(--c-border)]",
      )}
    >
      <div
        className={cn(
          "absolute h-3.5 w-3.5 rounded-full bg-white shadow transition-all",
          checked ? "left-[18px]" : "left-[2px]",
        )}
      />
    </div>
  );
}

export function ReplenishmentRules() {
  const { products, suppliers, locations, replenishmentRules: rules, actions } = useInventory();
  const defaultLocationId = locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? "loc-warehouse";
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RuleStatus>("all");
  const [showForm, setShowForm] = useState(false);
  const [editRule, setEditRule] = useState<ReplenishmentRule | null>(null);
  const [formData, setFormData] = useState<FormData>(FORM_DEFAULTS);
  const [formSaved, setFormSaved] = useState(false);
  const [productSearch, setProductSearch] = useState("");
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);

  const activeCount = rules.filter((r) => getRuleStatus(r) === "active").length;
  const triggeredCount = rules.filter((r) => getRuleStatus(r) === "triggered").length;
  const pausedCount = rules.filter((r) => getRuleStatus(r) === "paused").length;

  const filtered = useMemo(() => {
    let list = [...rules];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.productName.toLowerCase().includes(q) ||
          r.sku.toLowerCase().includes(q) ||
          (r.supplierName ?? "").toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((r) => getRuleStatus(r) === statusFilter);
    }
    list.sort((a, b) => {
      const sa = getRuleStatus(a);
      const sb = getRuleStatus(b);
      const order: Record<RuleStatus, number> = { triggered: 0, active: 1, paused: 2 };
      return order[sa] - order[sb];
    });
    return list;
  }, [rules, search, statusFilter]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q),
    ).slice(0, 8);
  }, [productSearch, products]);

  function toggleRule(id: string, active: boolean) {
    actions.updateRule(id, { isActive: active });
  }

  function deleteRule(id: string) {
    actions.deleteRule(id);
    setDeleteConfirm(null);
    setSelected((prev) => { const s = new Set(prev); s.delete(id); return s; });
  }

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const s = new Set(prev);
      if (s.has(id)) s.delete(id);
      else s.add(id);
      return s;
    });
  }

  function enableAll() {
    const targets = selected.size > 0 ? rules.filter((r) => selected.has(r.id)) : rules;
    targets.forEach((r) => actions.updateRule(r.id, { isActive: true }));
  }

  function disableAll() {
    const targets = selected.size > 0 ? rules.filter((r) => selected.has(r.id)) : rules;
    targets.forEach((r) => actions.updateRule(r.id, { isActive: false }));
  }

  function deleteSelected() {
    if (selected.size === 0) return;
    selected.forEach((id) => actions.deleteRule(id));
    setSelected(new Set());
  }

  function openCreate() {
    setEditRule(null);
    setFormData(FORM_DEFAULTS);
    setProductSearch("");
    setShowForm(true);
  }

  function openEdit(rule: ReplenishmentRule) {
    setEditRule(rule);
    const product = products.find((p) => p.id === rule.productId);
    setProductSearch(product?.name ?? rule.productName);
    setFormData({
      productId: rule.productId,
      supplierId: rule.supplierId ?? "",
      triggerType: rule.triggerType,
      triggerValue: String(rule.minStock ?? rule.daysOfStock ?? ""),
      reorderQty: String(rule.reorderQty),
      isActive: rule.isActive,
    });
    setShowForm(true);
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const product = products.find((p) => p.id === formData.productId);
    const supplier = suppliers.find((s) => s.id === formData.supplierId);
    const base: ReplenishmentRule = {
      id: editRule?.id ?? `rule-${Date.now()}`,
      productId: formData.productId,
      productName: product?.name ?? "—",
      sku: product?.sku ?? "—",
      supplierId: formData.supplierId || undefined,
      supplierName: supplier?.name,
      triggerType: formData.triggerType,
      minStock:
        formData.triggerType !== "days_of_stock" ? parseInt(formData.triggerValue) || undefined : undefined,
      daysOfStock:
        formData.triggerType === "days_of_stock" ? parseInt(formData.triggerValue) || undefined : undefined,
      reorderQty: parseInt(formData.reorderQty) || 1,
      isActive: formData.isActive,
      nextCheck: new Date(Date.now() + 86400000).toISOString().split("T")[0],
      lastTriggered: editRule?.lastTriggered,
    };
    if (editRule) {
      actions.updateRule(editRule.id, base);
    } else {
      actions.createRule(base);
    }
    setFormSaved(true);
    setTimeout(() => {
      setFormSaved(false);
      setShowForm(false);
    }, 700);
  }

  function updateForm<K extends keyof FormData>(key: K, value: FormData[K]) {
    setFormData((prev) => ({ ...prev, [key]: value }));
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: "Активных правил", value: activeCount, color: "text-[var(--c-green)]", dot: "bg-[var(--c-green)]" },
          { label: "Требуют внимания", value: triggeredCount, color: "text-[var(--c-amber)]", dot: "bg-[var(--c-amber)]" },
          { label: "На паузе", value: pausedCount, color: "text-[var(--c-text3)]", dot: "bg-[var(--c-text3)]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={cn("h-2 w-2 rounded-full", s.dot)} />
              <p className="text-xs text-[var(--c-text2)]">{s.label}</p>
            </div>
            <p className={cn("text-2xl font-bold tabular", s.color)}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[180px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            type="text"
            placeholder="Поиск по товару, SKU, поставщику..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] pl-9 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as "all" | RuleStatus)}
          className="h-9 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все статусы</option>
          <option value="active">Активные</option>
          <option value="triggered">Сработавшие</option>
          <option value="paused">На паузе</option>
        </select>
        <div className="ml-auto flex items-center gap-2">
          {selected.size > 0 && (
            <span className="text-xs text-[var(--c-text3)]">{selected.size} выбрано</span>
          )}
          <div className="flex items-center gap-1">
            <button
              onClick={enableAll}
              className="h-9 rounded-lg border border-[var(--c-border)] px-3 text-xs text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-green)] transition"
            >
              Включить все
            </button>
            <button
              onClick={disableAll}
              className="h-9 rounded-lg border border-[var(--c-border)] px-3 text-xs text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-amber)] transition"
            >
              Отключить все
            </button>
            {selected.size > 0 && (
              <button
                onClick={deleteSelected}
                className="h-9 rounded-lg border border-[var(--c-red)]/30 px-3 text-xs text-[var(--c-red)] hover:bg-red-500/10 transition"
              >
                Удалить выбранные
              </button>
            )}
          </div>
          <button
            onClick={openCreate}
            className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
          >
            <Plus size={15} />
            Создать правило
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-[var(--c-border)] py-16">
          <Package size={32} className="text-[var(--c-text3)]" strokeWidth={1.5} />
          <p className="text-sm text-[var(--c-text3)]">Нет правил для этого товара</p>
          <button
            onClick={openCreate}
            className="flex items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
          >
            <Plus size={14} />
            Создать правило
          </button>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--c-border)]">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                <th className="w-8 px-3 py-3">
                  <div
                    onClick={() => {
                      if (selected.size === filtered.length) setSelected(new Set());
                      else setSelected(new Set(filtered.map((r) => r.id)));
                    }}
                    className={cn(
                      "flex h-4 w-4 cursor-pointer items-center justify-center rounded border",
                      selected.size === filtered.length && filtered.length > 0
                        ? "border-[var(--c-green)] bg-[var(--c-green)]"
                        : "border-[var(--c-border)] hover:border-[var(--c-green)]",
                    )}
                  >
                    {selected.size === filtered.length && filtered.length > 0 && <Check size={10} className="text-[var(--c-bg)]" />}
                  </div>
                </th>
                {["Товар / SKU", "Поставщик", "Триггер", "Значение", "Заказ, шт.", "Сработало", "Следующая проверка", "Статус", ""].map(
                  (h) => (
                    <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--c-text2)] whitespace-nowrap">
                      {h}
                    </th>
                  ),
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--c-border)]">
              {filtered.map((rule) => {
                const status = getRuleStatus(rule);
                const isSelected = selected.has(rule.id);
                const recentlyTriggered = isTriggeredRecently(rule);

                return (
                  <tr
                    key={rule.id}
                    className={cn(
                      "transition",
                      status === "triggered"
                        ? "bg-amber-500/5 hover:bg-amber-500/10"
                        : "bg-[var(--c-bg2)] hover:bg-[var(--c-bg3)]",
                      isSelected && "ring-1 ring-inset ring-[var(--c-green)]/30",
                    )}
                  >
                    <td className="px-3 py-3">
                      <div
                        onClick={() => toggleSelect(rule.id)}
                        className={cn(
                          "flex h-4 w-4 cursor-pointer items-center justify-center rounded border",
                          isSelected
                            ? "border-[var(--c-green)] bg-[var(--c-green)]"
                            : "border-[var(--c-border)] hover:border-[var(--c-green)]",
                        )}
                      >
                        {isSelected && <Check size={10} className="text-[var(--c-bg)]" />}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs font-medium text-[var(--c-text)]">{rule.productName}</p>
                      <p className="text-[10px] font-mono text-[var(--c-text3)]">{rule.sku}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--c-text2)]">
                      {rule.supplierName ?? <span className="text-[var(--c-text3)]">—</span>}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", TRIGGER_COLORS[rule.triggerType])}>
                        {TRIGGER_LABELS[rule.triggerType]}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs tabular font-medium text-[var(--c-text)]">
                      {rule.triggerType === "days_of_stock"
                        ? `${rule.daysOfStock} дн.`
                        : `≤ ${rule.minStock} ед.`}
                    </td>
                    <td className="px-4 py-3 text-xs tabular font-semibold text-[var(--c-text)]">
                      {rule.reorderQty}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        {rule.lastTriggered ? (
                          <>
                            <span className="text-xs text-[var(--c-text2)]">{formatDate(rule.lastTriggered)}</span>
                            {recentlyTriggered && (
                              <span className="rounded-full bg-amber-500/15 border border-amber-500/25 px-1.5 py-0.5 text-[10px] font-medium text-amber-400">
                                7 дн.
                              </span>
                            )}
                          </>
                        ) : (
                          <span className="text-xs text-[var(--c-text3)]">—</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-xs text-[var(--c-text2)] whitespace-nowrap">
                      {formatDate(rule.nextCheck)}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <StatusIcon status={status} />
                        <Toggle checked={rule.isActive} onChange={(v) => toggleRule(rule.id, v)} />
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        {status === "triggered" && (
                          <button
                            onClick={() => {
                              if (rule.supplierId) {
                                actions.addPurchaseOrder({
                                  supplierId: rule.supplierId,
                                  supplierName: rule.supplierName ?? rule.supplierId,
                                  status: "draft",
                                  items: [{ productId: rule.productId, productName: rule.productName, sku: rule.sku, qty: rule.reorderQty, receivedQty: 0, unitCost: 0, totalCost: 0 }],
                                  totalAmount: 0,
                                  currency: "RUB",
                                  locationId: defaultLocationId,
                                  paymentStatus: "unpaid",
                                });
                              }
                            }}
                            className="flex items-center gap-1 rounded-lg bg-amber-500/15 border border-amber-500/25 px-2 py-1 text-[10px] font-medium text-amber-400 hover:bg-amber-500/25 transition whitespace-nowrap"
                          >
                            <ShoppingCart size={10} />
                            Создать заказ
                          </button>
                        )}
                        <button
                          onClick={() => openEdit(rule)}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text2)] transition"
                        >
                          <Edit2 size={13} />
                        </button>
                        {deleteConfirm === rule.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => deleteRule(rule.id)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15 text-[var(--c-red)] hover:bg-red-500/25 transition"
                            >
                              <Check size={12} />
                            </button>
                            <button
                              onClick={() => setDeleteConfirm(null)}
                              className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-bg3)] transition"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setDeleteConfirm(rule.id)}
                            className="flex h-7 w-7 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-red-500/10 hover:text-[var(--c-red)] transition"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowForm(false)} />
          <div className="relative ml-auto flex h-full w-full max-w-md flex-col bg-[var(--c-bg)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">
                {editRule ? "Редактировать правило" : "Создать правило"}
              </h2>
              <button onClick={() => setShowForm(false)} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-5 p-6">
                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">
                    Товар<span className="ml-0.5 text-[var(--c-red)]">*</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      value={productSearch}
                      onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); }}
                      onFocus={() => setShowProductDropdown(true)}
                      placeholder="Поиск товара..."
                      className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 pr-8 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                    />
                    <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                    {showProductDropdown && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 max-h-52 overflow-y-auto rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl">
                        {filteredProducts.length === 0 ? (
                          <p className="px-4 py-3 text-xs text-[var(--c-text3)]">Товары не найдены</p>
                        ) : (
                          filteredProducts.map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => {
                                updateForm("productId", p.id);
                                setProductSearch(p.name);
                                setShowProductDropdown(false);
                              }}
                              className="flex w-full items-center justify-between px-4 py-2.5 text-left hover:bg-[var(--c-bg3)] transition"
                            >
                              <span className="text-sm text-[var(--c-text)]">{p.name}</span>
                              <span className="ml-2 shrink-0 font-mono text-xs text-[var(--c-text3)]">{p.sku}</span>
                            </button>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Поставщик</label>
                  <select
                    value={formData.supplierId}
                    onChange={(e) => updateForm("supplierId", e.target.value)}
                    className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                  >
                    <option value="">Без поставщика</option>
                    {suppliers.map((s) => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Тип триггера</label>
                  <div className="grid grid-cols-3 gap-2">
                    {(Object.keys(TRIGGER_LABELS) as TriggerType[]).map((t) => (
                      <button
                        key={t}
                        type="button"
                        onClick={() => updateForm("triggerType", t)}
                        className={cn(
                          "rounded-lg border py-2 text-xs font-medium transition",
                          formData.triggerType === t
                            ? TRIGGER_COLORS[t]
                            : "border-[var(--c-border)] text-[var(--c-text3)] hover:text-[var(--c-text2)]",
                        )}
                      >
                        {TRIGGER_LABELS[t]}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">
                    {formData.triggerType === "days_of_stock" ? "Дней запаса (порог)" : "Минимальный остаток (ед.)"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.triggerValue}
                    onChange={(e) => updateForm("triggerValue", e.target.value)}
                    placeholder={formData.triggerType === "days_of_stock" ? "14" : "50"}
                    className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">
                    Количество к заказу (ед.)<span className="ml-0.5 text-[var(--c-red)]">*</span>
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={formData.reorderQty}
                    onChange={(e) => updateForm("reorderQty", e.target.value)}
                    placeholder="100"
                    className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3">
                  <div>
                    <p className="text-sm font-medium text-[var(--c-text)]">Правило активно</p>
                    <p className="text-xs text-[var(--c-text3)]">Правило будет автоматически проверяться</p>
                  </div>
                  <Toggle checked={formData.isActive} onChange={(v) => updateForm("isActive", v)} />
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-4">
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="h-10 rounded-lg border border-[var(--c-border)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  disabled={!formData.productId || !formData.reorderQty || formSaved}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
                    formData.productId && formData.reorderQty && !formSaved
                      ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:bg-[#25e890]"
                      : "cursor-not-allowed bg-[var(--c-bg3)] text-[var(--c-text3)]",
                  )}
                >
                  {formSaved ? (
                    <><Check size={14} /> Сохранено</>
                  ) : editRule ? (
                    "Сохранить изменения"
                  ) : (
                    "Создать правило"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
