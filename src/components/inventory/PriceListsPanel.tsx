"use client";

import { useState } from "react";
import {
  Plus,
  Edit2,
  Copy,
  Archive,
  Star,
  Download,
  X,
  ChevronRight,
  Users,
  Calendar,
  Package,
  CheckCircle,
  Pencil,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";

type PriceListStatus = "active" | "draft" | "archived" | "scheduled";
type DiscountType = "percentage" | "fixed" | "override";

interface PriceListItem {
  productId: string;
  productName: string;
  sku: string;
  basePrice: number;
  discountType: DiscountType;
  discountValue: number;
  finalPrice: number;
}

interface PriceList {
  id: string;
  name: string;
  description?: string;
  status: PriceListStatus;
  currency: "RUB";
  discountType: DiscountType;
  defaultDiscount: number;
  items: PriceListItem[];
  customerGroups: string[];
  validFrom?: string;
  validTo?: string;
  createdAt: string;
  isDefault: boolean;
}

const ALL_GROUPS = ["Розница", "Оптовики", "Дилеры", "VIP", "Сотрудники"];

function buildItems(products: Product[], discountType: DiscountType, discountValue: number): PriceListItem[] {
  return products.slice(0, 4).map(p => {
    let finalPrice = p.price;
    if (discountType === "percentage") finalPrice = Math.round(p.price * (1 - discountValue / 100));
    if (discountType === "fixed") finalPrice = Math.max(0, p.price - discountValue);
    if (discountType === "override") finalPrice = discountValue || p.price;
    return { productId: p.id, productName: p.name, sku: p.sku, basePrice: p.price, discountType, discountValue, finalPrice };
  });
}

type PriceListSpec = Omit<PriceList, "items">;

const PRICE_LIST_SPECS: PriceListSpec[] = [
  { id: "pl-1", name: "Розничная", description: "Стандартные розничные цены для конечных покупателей", status: "active", currency: "RUB", discountType: "percentage", defaultDiscount: 0, customerGroups: ["Розница"], createdAt: "2025-01-10", isDefault: true },
  { id: "pl-2", name: "Оптовая", description: "Скидка 20% для оптовых покупателей от 50 единиц", status: "active", currency: "RUB", discountType: "percentage", defaultDiscount: 20, customerGroups: ["Оптовики"], createdAt: "2025-02-01", isDefault: false },
  { id: "pl-3", name: "Дилерская", description: "Специальные условия для официальных дилеров", status: "active", currency: "RUB", discountType: "percentage", defaultDiscount: 30, customerGroups: ["Дилеры"], createdAt: "2025-03-15", isDefault: false },
  { id: "pl-4", name: "Акционная", description: "Временные цены для проведения акций и распродаж", status: "scheduled", currency: "RUB", discountType: "percentage", defaultDiscount: 15, customerGroups: ["Розница", "Оптовики"], validFrom: "2026-06-01", validTo: "2026-06-30", createdAt: "2026-05-20", isDefault: false },
  { id: "pl-5", name: "VIP-клиенты", description: "Индивидуальные цены для постоянных VIP-покупателей", status: "active", currency: "RUB", discountType: "percentage", defaultDiscount: 25, customerGroups: ["VIP"], createdAt: "2025-04-01", isDefault: false },
];

const STATUS_LABELS: Record<PriceListStatus, string> = {
  active: "Активна",
  draft: "Черновик",
  archived: "Архив",
  scheduled: "Запланирована",
};

const STATUS_COLORS: Record<PriceListStatus, { bg: string; color: string }> = {
  active: { bg: "rgba(34,197,94,0.12)", color: "var(--c-green)" },
  draft: { bg: "var(--c-bg3)", color: "var(--c-text3)" },
  archived: { bg: "var(--c-bg3)", color: "var(--c-text3)" },
  scheduled: { bg: "rgba(59,130,246,0.12)", color: "var(--c-blue)" },
};

const DISCOUNT_LABELS: Record<DiscountType, string> = {
  percentage: "% скидка",
  fixed: "Фиксированная скидка",
  override: "Новая цена",
};

function formatRub(n: number) {
  return n.toLocaleString("ru-RU") + " ₽";
}

export function PriceListsPanel() {
  const { products } = useInventory();
  const [priceLists, setPriceLists] = useState<PriceList[]>(() =>
    PRICE_LIST_SPECS.map(spec => ({ ...spec, items: buildItems(products, spec.discountType, spec.defaultDiscount) }))
  );
  const [selected, setSelected] = useState<PriceList | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [editItemValue, setEditItemValue] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<string | null>(null);

  const [newForm, setNewForm] = useState({
    name: "",
    description: "",
    discountType: "percentage" as DiscountType,
    defaultDiscount: 0,
    customerGroups: [] as string[],
    validFrom: "",
    validTo: "",
  });

  function setDefault(id: string) {
    setPriceLists(ls => ls.map(l => ({ ...l, isDefault: l.id === id })));
    if (selected?.id === id) setSelected(s => s ? { ...s, isDefault: true } : null);
  }

  function archiveList(id: string) {
    setPriceLists(ls => ls.map(l => l.id === id ? { ...l, status: "archived" } : l));
    if (selected?.id === id) setSelected(null);
  }

  function duplicateList(list: PriceList) {
    const copy: PriceList = { ...list, id: "pl-" + Date.now(), name: list.name + " (копия)", isDefault: false, status: "draft", createdAt: "2026-05-25" };
    setPriceLists(ls => [...ls, copy]);
  }

  function createPriceList() {
    const items = buildItems(products, newForm.discountType, newForm.defaultDiscount);
    const newList: PriceList = {
      id: "pl-" + Date.now(),
      name: newForm.name || "Новый прайс-лист",
      description: newForm.description,
      status: "draft",
      currency: "RUB",
      discountType: newForm.discountType,
      defaultDiscount: newForm.defaultDiscount,
      items,
      customerGroups: newForm.customerGroups,
      validFrom: newForm.validFrom || undefined,
      validTo: newForm.validTo || undefined,
      createdAt: "2026-05-25",
      isDefault: false,
    };
    setPriceLists(ls => [...ls, newList]);
    setShowCreate(false);
    setNewForm({ name: "", description: "", discountType: "percentage", defaultDiscount: 0, customerGroups: [], validFrom: "", validTo: "" });
  }

  function startEditItem(item: PriceListItem) {
    setEditingItemId(item.productId);
    setEditItemValue(String(item.discountValue));
  }

  function saveItemEdit(item: PriceListItem) {
    if (!selected) return;
    const val = parseFloat(editItemValue) || 0;
    let finalPrice = item.basePrice;
    if (item.discountType === "percentage") finalPrice = Math.round(item.basePrice * (1 - val / 100));
    if (item.discountType === "fixed") finalPrice = Math.max(0, item.basePrice - val);
    if (item.discountType === "override") finalPrice = val;
    const updatedItems = selected.items.map(i => i.productId === item.productId ? { ...i, discountValue: val, finalPrice } : i);
    const updated = { ...selected, items: updatedItems };
    setSelected(updated);
    setPriceLists(ls => ls.map(l => l.id === selected.id ? updated : l));
    setEditingItemId(null);
  }

  function toggleGroup(group: string) {
    setNewForm(f => ({
      ...f,
      customerGroups: f.customerGroups.includes(group)
        ? f.customerGroups.filter(g => g !== group)
        : [...f.customerGroups, group],
    }));
  }

  return (
    <div style={{ background: "var(--c-bg)", color: "var(--c-text)", minHeight: "100%" }} className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold">Прайс-листы</h2>
          <p style={{ color: "var(--c-text2)" }} className="text-sm mt-0.5">Управление ценовыми группами и скидками</p>
        </div>
        <button onClick={() => setShowCreate(true)}
          style={{ background: "var(--c-blue)", color: "#fff" }}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold hover:opacity-90 transition-opacity">
          <Plus size={15} />
          Создать прайс-лист
        </button>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {priceLists.map(list => {
          const sc = STATUS_COLORS[list.status];
          return (
            <div key={list.id}
              onClick={() => setSelected(list)}
              style={{ background: "var(--c-bg2)", border: `1px solid ${selected?.id === list.id ? "var(--c-blue)" : "var(--c-border)"}`, cursor: "pointer" }}
              className="rounded-2xl p-5 flex flex-col gap-4 hover:border-blue-500 transition-colors">
              <div className="flex items-start justify-between">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-base truncate">{list.name}</span>
                    {list.isDefault && (
                      <span style={{ background: "rgba(251,191,36,0.15)", color: "var(--c-amber)" }} className="text-xs px-2 py-0.5 rounded-full flex items-center gap-1 shrink-0">
                        <Star size={10} />
                        По умолчанию
                      </span>
                    )}
                  </div>
                  {list.description && (
                    <p className="text-xs mt-1 line-clamp-2" style={{ color: "var(--c-text2)" }}>{list.description}</p>
                  )}
                </div>
                <span style={{ background: sc.bg, color: sc.color }} className="text-xs px-2 py-0.5 rounded-full shrink-0 ml-2">{STATUS_LABELS[list.status]}</span>
              </div>

              <div className="flex items-center gap-4 text-xs" style={{ color: "var(--c-text2)" }}>
                <div className="flex items-center gap-1">
                  <Package size={12} />
                  {list.items.length} товаров
                </div>
                <div className="flex items-center gap-1">
                  <Users size={12} />
                  {list.customerGroups.join(", ") || "—"}
                </div>
              </div>

              {(list.validFrom || list.validTo) && (
                <div className="flex items-center gap-1.5 text-xs" style={{ color: "var(--c-text3)" }}>
                  <Calendar size={11} />
                  {list.validFrom && <span>с {list.validFrom}</span>}
                  {list.validTo && <span>по {list.validTo}</span>}
                </div>
              )}

              <div className="flex items-center gap-1.5 flex-wrap">
                {list.customerGroups.map(g => (
                  <span key={g} style={{ background: "var(--c-bg3)", color: "var(--c-text2)" }} className="text-xs px-2 py-0.5 rounded-full">{g}</span>
                ))}
              </div>

              <div className="flex items-center gap-2 pt-1 border-t" style={{ borderColor: "var(--c-border)" }}>
                <button onClick={e => { e.stopPropagation(); setSelected(list); }}
                  style={{ background: "var(--c-bg3)", color: "var(--c-text2)" }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity">
                  <Edit2 size={12} />
                  Изменить
                </button>
                <button onClick={e => { e.stopPropagation(); duplicateList(list); }}
                  style={{ background: "var(--c-bg3)", color: "var(--c-text2)" }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-80 transition-opacity">
                  <Copy size={12} />
                  Дублировать
                </button>
                {list.status !== "archived" && !list.isDefault && (
                  <button onClick={e => { e.stopPropagation(); archiveList(list.id); }}
                    style={{ color: "var(--c-text3)" }}
                    className="p-1.5 rounded-lg hover:opacity-70 transition-opacity ml-auto">
                    <Archive size={13} />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {selected && (
        <div className="fixed inset-0 z-50 flex" style={{ background: "rgba(0,0,0,0.5)" }}>
          <div className="ml-auto w-full max-w-2xl h-full overflow-y-auto" style={{ background: "var(--c-bg2)", borderLeft: "1px solid var(--c-border)" }}>
            <div className="sticky top-0 z-10 flex items-center justify-between px-6 py-4 border-b" style={{ background: "var(--c-bg2)", borderColor: "var(--c-border)" }}>
              <div className="flex items-center gap-3">
                <div>
                  <div className="font-semibold text-lg">{selected.name}</div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span style={{ background: STATUS_COLORS[selected.status].bg, color: STATUS_COLORS[selected.status].color }} className="text-xs px-2 py-0.5 rounded-full">{STATUS_LABELS[selected.status]}</span>
                    {selected.isDefault && <span style={{ color: "var(--c-amber)" }} className="text-xs flex items-center gap-1"><Star size={11} />По умолчанию</span>}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button style={{ background: "var(--c-bg3)", color: "var(--c-text2)" }} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs hover:opacity-80">
                  <Download size={12} />
                  Excel
                </button>
                <button onClick={() => setSelected(null)} style={{ color: "var(--c-text3)" }} className="hover:opacity-70 p-1">
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-6">
              {selected.description && (
                <p className="text-sm" style={{ color: "var(--c-text2)" }}>{selected.description}</p>
              )}

              <div style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)" }} className="rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold" style={{ color: "var(--c-text3)" }}>ПРАВИЛА ЦЕНООБРАЗОВАНИЯ</div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--c-text2)" }}>Тип скидки</span>
                  <span className="text-sm font-medium">{DISCOUNT_LABELS[selected.discountType]}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: "var(--c-text2)" }}>Скидка по умолчанию</span>
                  <span className="text-sm font-medium" style={{ color: "var(--c-green)" }}>
                    {selected.discountType === "percentage" ? `${selected.defaultDiscount}%` : selected.discountType === "fixed" ? formatRub(selected.defaultDiscount) : `→ ${formatRub(selected.defaultDiscount)}`}
                  </span>
                </div>
                {(selected.validFrom || selected.validTo) && (
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "var(--c-text2)" }}>Срок действия</span>
                    <span className="text-sm">{selected.validFrom} — {selected.validTo}</span>
                  </div>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-xs font-semibold" style={{ color: "var(--c-text3)" }}>ТОВАРЫ И ЦЕНЫ</div>
                </div>
                <div style={{ border: "1px solid var(--c-border)" }} className="rounded-xl overflow-hidden">
                  <div style={{ background: "var(--c-bg3)", borderBottom: "1px solid var(--c-border)", color: "var(--c-text3)" }} className="grid grid-cols-5 px-4 py-2 text-xs">
                    {["Товар", "Артикул", "Баз. цена", "Скидка", "Итоговая цена"].map((h, i) => (
                      <div key={i}>{h}</div>
                    ))}
                  </div>
                  {selected.items.map((item, i) => (
                    <div key={item.productId} className={cn("grid grid-cols-5 items-center px-4 py-3 text-sm", i < selected.items.length - 1 && "border-b")}
                      style={{ background: "var(--c-bg2)", borderColor: "var(--c-border)" }}>
                      <div className="font-medium text-xs truncate pr-2">{item.productName}</div>
                      <div className="text-xs" style={{ color: "var(--c-text3)" }}>{item.sku}</div>
                      <div className="text-xs" style={{ color: "var(--c-text2)" }}>{formatRub(item.basePrice)}</div>
                      <div className="flex items-center gap-1">
                        {editingItemId === item.productId ? (
                          <div className="flex items-center gap-1">
                            <input value={editItemValue} onChange={e => setEditItemValue(e.target.value)}
                              style={{ background: "var(--c-bg3)", border: "1px solid var(--c-blue)", color: "var(--c-text)" }}
                              className="w-16 rounded px-1.5 py-0.5 text-xs outline-none" />
                            <button onClick={() => saveItemEdit(item)} style={{ color: "var(--c-green)" }}>
                              <CheckCircle size={13} />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-1 group">
                            <span className="text-xs" style={{ color: "var(--c-amber)" }}>
                              {item.discountType === "percentage" ? `${item.discountValue}%` : item.discountType === "fixed" ? `−${formatRub(item.discountValue)}` : `→${formatRub(item.discountValue)}`}
                            </span>
                            <button onClick={() => startEditItem(item)} style={{ color: "var(--c-text3)" }} className="opacity-0 group-hover:opacity-100 transition-opacity">
                              <Pencil size={11} />
                            </button>
                          </div>
                        )}
                      </div>
                      <div className="text-xs font-semibold" style={{ color: "var(--c-green)" }}>{formatRub(item.finalPrice)}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)" }} className="rounded-xl p-4 space-y-3">
                <div className="text-xs font-semibold" style={{ color: "var(--c-text3)" }}>ГРУППЫ ПОКУПАТЕЛЕЙ</div>
                <div className="flex flex-wrap gap-2">
                  {ALL_GROUPS.map(g => {
                    const active = selected.customerGroups.includes(g);
                    return (
                      <button key={g}
                        style={{ background: active ? "rgba(59,130,246,0.15)" : "var(--c-bg2)", border: `1px solid ${active ? "var(--c-blue)" : "var(--c-border)"}`, color: active ? "var(--c-blue)" : "var(--c-text2)" }}
                        className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity">
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="flex gap-3">
                {!selected.isDefault && (
                  <button onClick={() => setDefault(selected.id)}
                    style={{ background: "rgba(251,191,36,0.12)", border: "1px solid var(--c-amber)", color: "var(--c-amber)" }}
                    className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-medium hover:opacity-90">
                    <Star size={14} />
                    Установить по умолчанию
                  </button>
                )}
                <button style={{ background: "var(--c-blue)", color: "#fff" }} className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">
                  Применить к заказу
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.6)" }}>
          <div style={{ background: "var(--c-bg2)", border: "1px solid var(--c-border)" }} className="rounded-2xl w-full max-w-lg shadow-2xl">
            <div className="flex items-center justify-between p-5 border-b" style={{ borderColor: "var(--c-border)" }}>
              <div className="font-semibold">Создать прайс-лист</div>
              <button onClick={() => setShowCreate(false)} style={{ color: "var(--c-text3)" }} className="hover:opacity-70">
                <X size={18} />
              </button>
            </div>
            <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Название прайс-листа</label>
                <input value={newForm.name} onChange={e => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="Например: Оптовые цены..."
                  style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:opacity-40" />
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Описание</label>
                <textarea value={newForm.description} onChange={e => setNewForm(f => ({ ...f, description: e.target.value }))} placeholder="Краткое описание..."
                  style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none placeholder:opacity-40 resize-none h-16" />
              </div>
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: "var(--c-text2)" }}>Тип скидки по умолчанию</label>
                <div className="flex gap-2">
                  {(["percentage", "fixed", "override"] as DiscountType[]).map(dt => (
                    <button key={dt} onClick={() => setNewForm(f => ({ ...f, discountType: dt }))}
                      style={{ background: newForm.discountType === dt ? "var(--c-blue)" : "var(--c-bg3)", border: "1px solid var(--c-border)", color: newForm.discountType === dt ? "#fff" : "var(--c-text2)" }}
                      className="flex-1 py-2 rounded-lg text-xs font-medium transition-colors">
                      {dt === "percentage" ? "% скидка" : dt === "fixed" ? "Фикс. скидка" : "Новая цена"}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>
                  {newForm.discountType === "percentage" ? "Скидка, %" : newForm.discountType === "fixed" ? "Скидка, ₽" : "Новая цена, ₽"}
                </label>
                <input type="number" value={newForm.defaultDiscount} onChange={e => setNewForm(f => ({ ...f, defaultDiscount: parseFloat(e.target.value) || 0 }))}
                  style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                  className="w-full rounded-lg px-3 py-2 text-sm outline-none" min={0} />
              </div>
              <div>
                <label className="text-xs font-medium mb-2 block" style={{ color: "var(--c-text2)" }}>Группы покупателей</label>
                <div className="flex flex-wrap gap-2">
                  {ALL_GROUPS.map(g => {
                    const active = newForm.customerGroups.includes(g);
                    return (
                      <button key={g} onClick={() => toggleGroup(g)}
                        style={{ background: active ? "rgba(59,130,246,0.15)" : "var(--c-bg3)", border: `1px solid ${active ? "var(--c-blue)" : "var(--c-border)"}`, color: active ? "var(--c-blue)" : "var(--c-text2)" }}
                        className="text-xs px-3 py-1.5 rounded-lg hover:opacity-80 transition-opacity">
                        {g}
                      </button>
                    );
                  })}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Действует с</label>
                  <input type="date" value={newForm.validFrom} onChange={e => setNewForm(f => ({ ...f, validFrom: e.target.value }))}
                    style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
                <div>
                  <label className="text-xs font-medium mb-1 block" style={{ color: "var(--c-text2)" }}>Действует по</label>
                  <input type="date" value={newForm.validTo} onChange={e => setNewForm(f => ({ ...f, validTo: e.target.value }))}
                    style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text)" }}
                    className="w-full rounded-lg px-3 py-2 text-sm outline-none" />
                </div>
              </div>
              <div className="flex gap-3 pt-1">
                <button onClick={() => setShowCreate(false)}
                  style={{ background: "var(--c-bg3)", border: "1px solid var(--c-border)", color: "var(--c-text2)" }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium hover:opacity-80">Отмена</button>
                <button onClick={createPriceList}
                  style={{ background: "var(--c-blue)", color: "#fff" }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold hover:opacity-90">
                  Создать прайс-лист
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
