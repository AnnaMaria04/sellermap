"use client";

import { useState, useMemo } from "react";
import {
  X,
  Plus,
  Search,
  Trash2,
  Check,
  Package,
  CalendarDays,
  FileText,
  AlertCircle,
  Truck,
  CreditCard,
} from "lucide-react";
import {
  type PurchaseOrderStatus,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";

interface OrderLine {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  unitCost: number;
}

interface Props {
  onClose: () => void;
  onSave?: (data: unknown) => void;
  /** Pre-select a supplier when opened from the suppliers panel */
  initialSupplierId?: string;
}

const CURRENCY_SYMBOL: Record<string, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  CNY: "¥",
};

const PAYMENT_STATUS_OPTIONS: { value: "unpaid" | "partial" | "paid"; label: string }[] = [
  { value: "unpaid", label: "Не оплачен" },
  { value: "partial", label: "Частично оплачен" },
  { value: "paid", label: "Оплачен" },
];

export function PurchaseOrderForm({ onClose, onSave, initialSupplierId }: Props) {
  const { products, suppliers, locations, actions } = useInventory();

  const [supplierId, setSupplierId] = useState(initialSupplierId ?? "");
  const [locationId, setLocationId] = useState(
    locations.find((l) => l.isDefault)?.id ?? "",
  );
  const [expectedArrival, setExpectedArrival] = useState("");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [paymentStatus, setPaymentStatus] = useState<"unpaid" | "partial" | "paid">("unpaid");
  const [trackingNumber, setTrackingNumber] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<OrderLine[]>([]);
  const [searchProduct, setSearchProduct] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [saved, setSaved] = useState(false);

  const supplier = suppliers.find((s) => s.id === supplierId);
  const currencySymbol = CURRENCY_SYMBOL[supplier?.currency ?? "RUB"] ?? "₽";

  // Auto-fill payment terms from supplier when supplier changes
  function handleSupplierChange(id: string) {
    setSupplierId(id);
    const s = suppliers.find((sup) => sup.id === id);
    if (s?.paymentTerms && !paymentTerms) {
      setPaymentTerms(s.paymentTerms);
    }
  }

  const filteredProducts = useMemo(() => {
    if (!searchProduct)
      return products.filter((p) => p.status === "active").slice(0, 8);
    const q = searchProduct.toLowerCase();
    return products
      .filter(
        (p) =>
          p.status === "active" &&
          (p.name.toLowerCase().includes(q) ||
            p.sku.toLowerCase().includes(q)),
      )
      .slice(0, 8);
  }, [searchProduct, products]);

  function addLine(product: (typeof products)[0]) {
    if (lines.find((l) => l.productId === product.id)) return;
    setLines((prev) => [
      ...prev,
      {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        qty: supplier?.minOrderQty ?? 1,
        unitCost: product.costPrice,
      },
    ]);
    setShowProductSearch(false);
    setSearchProduct("");
  }

  function updateLine(
    productId: string,
    field: "qty" | "unitCost",
    value: number,
  ) {
    setLines((prev) =>
      prev.map((l) =>
        l.productId === productId ? { ...l, [field]: value } : l,
      ),
    );
  }

  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  const totalAmount = lines.reduce((s, l) => s + l.qty * l.unitCost, 0);

  function handleSave(status: PurchaseOrderStatus = "draft") {
    if (!supplierId || lines.length === 0) return;
    const sup = suppliers.find((s) => s.id === supplierId);
    actions.addPurchaseOrder({
      supplierId,
      supplierName: sup?.name ?? supplierId,
      status,
      items: lines.map((l) => ({
        productId: l.productId,
        productName: l.productName,
        sku: l.sku,
        qty: l.qty,
        receivedQty: 0,
        unitCost: l.unitCost,
        totalCost: l.qty * l.unitCost,
      })),
      totalAmount,
      currency: sup?.currency ?? "RUB",
      expectedArrival: expectedArrival || undefined,
      note: note || undefined,
      locationId,
      paymentStatus,
      trackingNumber: trackingNumber || undefined,
    });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onSave?.({});
      onClose();
    }, 800);
  }

  const isValid = supplierId && lines.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />

      <div className="relative ml-auto flex h-full w-full max-w-2xl flex-col bg-[var(--c-bg)] shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-4 sm:px-6">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">
              Новый заказ поставщику
            </h2>
            <p className="text-xs text-[var(--c-text2)]">
              Создайте заказ для пополнения запасов
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
          >
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-4 space-y-6 sm:p-6">
            {/* ── Supplier ──────────────────────────────────────────────── */}
            <Section title="Поставщик">
              <FormField label="Поставщик" required>
                <select
                  value={supplierId}
                  onChange={(e) => handleSupplierChange(e.target.value)}
                  className={selectCls}
                >
                  <option value="">Выберите поставщика</option>
                  {suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {s.country} (срок {s.leadTimeDays}д)
                    </option>
                  ))}
                </select>
              </FormField>

              {supplier && (
                <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
                  <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
                    <InfoRow
                      label="Контакт"
                      value={supplier.contactName ?? "—"}
                    />
                    <InfoRow
                      label="Телефон"
                      value={supplier.phone ?? "—"}
                    />
                    <InfoRow
                      label="Мин. заказ"
                      value={
                        supplier.minOrderQty
                          ? `${supplier.minOrderQty} шт`
                          : "—"
                      }
                    />
                    <InfoRow
                      label="Срок доставки"
                      value={`${supplier.leadTimeDays} дней`}
                    />
                    <InfoRow label="Валюта" value={supplier.currency} />
                    <InfoRow
                      label="Условия оплаты"
                      value={supplier.paymentTerms ?? "—"}
                    />
                  </div>
                  {supplier.leadTimeDays && expectedArrival === "" && (
                    <button
                      onClick={() => {
                        const d = new Date();
                        d.setDate(d.getDate() + supplier.leadTimeDays);
                        setExpectedArrival(d.toISOString().split("T")[0]);
                      }}
                      className="mt-3 flex items-center gap-1.5 text-xs text-[var(--c-green)] hover:opacity-80 transition"
                    >
                      <CalendarDays size={12} />
                      Авто-рассчитать дату (+{supplier.leadTimeDays} дней)
                    </button>
                  )}
                </div>
              )}
            </Section>

            {/* ── Delivery & payment ────────────────────────────────────── */}
            <Section title="Доставка и оплата">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <FormField label="Ожидаемая дата поставки">
                  <input
                    type="date"
                    value={expectedArrival}
                    onChange={(e) => setExpectedArrival(e.target.value)}
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Локация приёмки">
                  <select
                    value={locationId}
                    onChange={(e) => setLocationId(e.target.value)}
                    className={selectCls}
                  >
                    {locations
                      .filter((l) =>
                        ["warehouse", "store", "showroom"].includes(l.type),
                      )
                      .map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                  </select>
                </FormField>
                <FormField label="Условия оплаты">
                  <input
                    type="text"
                    value={paymentTerms}
                    onChange={(e) => setPaymentTerms(e.target.value)}
                    placeholder="50% предоплата, 50% по факту"
                    className={inputCls}
                  />
                </FormField>
                <FormField label="Статус оплаты">
                  <div className="relative">
                    <CreditCard
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)] pointer-events-none"
                    />
                    <select
                      value={paymentStatus}
                      onChange={(e) =>
                        setPaymentStatus(
                          e.target.value as "unpaid" | "partial" | "paid",
                        )
                      }
                      className={cn(selectCls, "pl-9")}
                    >
                      {PAYMENT_STATUS_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </FormField>
                <FormField label="Трек-номер">
                  <div className="relative">
                    <Truck
                      size={14}
                      className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)] pointer-events-none"
                    />
                    <input
                      type="text"
                      value={trackingNumber}
                      onChange={(e) => setTrackingNumber(e.target.value)}
                      placeholder="SZ2024010100"
                      className={cn(inputCls, "pl-9")}
                    />
                  </div>
                </FormField>
              </div>
            </Section>

            {/* ── Products ──────────────────────────────────────────────── */}
            <Section title="Товары">
              {/* Product search */}
              <div className="relative">
                <button
                  onClick={() => setShowProductSearch(!showProductSearch)}
                  className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--c-border2)] bg-[var(--c-bg3)] px-4 py-3 text-sm text-[var(--c-text2)] hover:border-[var(--c-green)] hover:text-[var(--c-text)] transition"
                >
                  <Plus size={15} />
                  Добавить товар
                </button>

                {showProductSearch && (
                  <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl">
                    <div className="p-3 border-b border-[var(--c-border)]">
                      <div className="relative">
                        <Search
                          size={14}
                          className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]"
                        />
                        <input
                          type="text"
                          autoFocus
                          value={searchProduct}
                          onChange={(e) => setSearchProduct(e.target.value)}
                          placeholder="Поиск товара по названию или SKU..."
                          className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-8 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                        />
                      </div>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1">
                      {filteredProducts.map((p) => {
                        const alreadyAdded = lines.find(
                          (l) => l.productId === p.id,
                        );
                        return (
                          <button
                            key={p.id}
                            disabled={!!alreadyAdded}
                            onClick={() => addLine(p)}
                            className={cn(
                              "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left transition",
                              alreadyAdded
                                ? "opacity-40 cursor-not-allowed"
                                : "hover:bg-[var(--c-bg3)]",
                            )}
                          >
                            <div className="h-8 w-8 rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] flex items-center justify-center shrink-0">
                              {p.imageUrl ? (
                                <img
                                  src={p.imageUrl}
                                  alt={p.name}
                                  className="h-full w-full rounded-lg object-cover"
                                />
                              ) : (
                                <Package
                                  size={14}
                                  className="text-[var(--c-text3)]"
                                />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-[var(--c-text)] truncate">
                                {p.name}
                              </p>
                              <p className="text-xs text-[var(--c-text3)]">
                                {p.sku} ·{" "}
                                {p.costPrice.toLocaleString("ru-RU")} ₽
                              </p>
                            </div>
                            {alreadyAdded && (
                              <Check
                                size={14}
                                className="text-[var(--c-green)] shrink-0"
                              />
                            )}
                          </button>
                        );
                      })}
                      {filteredProducts.length === 0 && (
                        <p className="py-4 text-center text-sm text-[var(--c-text3)]">
                          Товары не найдены
                        </p>
                      )}
                    </div>
                    <div className="p-3 border-t border-[var(--c-border)]">
                      <button
                        onClick={() => setShowProductSearch(false)}
                        className="w-full text-xs text-center text-[var(--c-text3)] hover:text-[var(--c-text)] transition"
                      >
                        Закрыть
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Lines table */}
              {lines.length > 0 && (
                <div className="overflow-x-auto rounded-xl border border-[var(--c-border)]">
                  <table className="w-full min-w-[560px]">
                    <thead>
                      <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                        <th className="px-4 py-2 text-left text-xs font-medium text-[var(--c-text2)]">
                          Товар
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-[var(--c-text2)]">
                          Кол-во
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-[var(--c-text2)]">
                          Цена ед.
                        </th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-[var(--c-text2)]">
                          Сумма
                        </th>
                        <th className="w-8 px-4 py-2" />
                      </tr>
                    </thead>
                    <tbody>
                      {lines.map((line) => (
                        <tr
                          key={line.productId}
                          className="border-b border-[var(--c-border)] last:border-0"
                        >
                          <td className="px-4 py-3">
                            <p className="text-sm font-medium text-[var(--c-text)]">
                              {line.productName}
                            </p>
                            <p className="text-xs text-[var(--c-text3)]">
                              {line.sku}
                            </p>
                          </td>
                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min={1}
                              value={line.qty}
                              onChange={(e) =>
                                updateLine(
                                  line.productId,
                                  "qty",
                                  parseInt(e.target.value) || 1,
                                )
                              }
                              className="w-20 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 py-1.5 text-right text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none tabular-nums"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="relative w-28">
                              <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-[var(--c-text3)]">
                                {currencySymbol}
                              </span>
                              <input
                                type="number"
                                min={0}
                                value={line.unitCost}
                                onChange={(e) =>
                                  updateLine(
                                    line.productId,
                                    "unitCost",
                                    parseFloat(e.target.value) || 0,
                                  )
                                }
                                className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-5 pr-2 py-1.5 text-right text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none tabular-nums"
                              />
                            </div>
                          </td>
                          <td className="px-4 py-3 text-right tabular-nums">
                            <span className="text-sm font-medium text-[var(--c-text)]">
                              {(line.qty * line.unitCost).toLocaleString(
                                "ru-RU",
                              )}{" "}
                              {currencySymbol}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => removeLine(line.productId)}
                              className="text-[var(--c-text3)] hover:text-[var(--c-red)] transition"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="border-t border-[var(--c-border)] bg-[var(--c-bg3)]">
                        <td
                          colSpan={3}
                          className="px-4 py-3 text-right text-sm font-medium text-[var(--c-text2)]"
                        >
                          Итого:
                        </td>
                        <td className="px-4 py-3 text-right tabular-nums">
                          <span className="text-base font-bold text-[var(--c-text)]">
                            {totalAmount.toLocaleString("ru-RU")}{" "}
                            {currencySymbol}
                          </span>
                        </td>
                        <td className="px-4 py-3" />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}

              {supplier?.minOrderQty &&
                lines.some((l) => l.qty < supplier.minOrderQty!) && (
                  <div className="flex items-start gap-2 rounded-lg bg-[var(--c-amber-dim)] border border-[rgba(245,166,35,0.2)] p-3">
                    <AlertCircle
                      size={15}
                      className="shrink-0 mt-0.5 text-[var(--c-amber)]"
                    />
                    <p className="text-xs text-[var(--c-amber)]">
                      Минимальный заказ у поставщика: {supplier.minOrderQty}{" "}
                      шт. Проверьте количество.
                    </p>
                  </div>
                )}
            </Section>

            {/* ── Notes ─────────────────────────────────────────────────── */}
            <Section title="Примечание">
              <textarea
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Дополнительные инструкции, требования к упаковке..."
                rows={3}
                className={cn(inputCls, "resize-none")}
              />
            </Section>
          </div>
        </div>

        {/* Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-4 sm:px-6">
          <button
            onClick={onClose}
            className="flex h-10 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 text-sm font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            Отмена
          </button>
          <div className="flex gap-2">
            <button
              onClick={() => handleSave("draft")}
              disabled={!isValid || saved}
              className={cn(
                "flex h-10 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-4 text-sm font-medium transition",
                isValid && !saved
                  ? "text-[var(--c-text2)] hover:text-[var(--c-text)]"
                  : "opacity-40 cursor-not-allowed text-[var(--c-text3)]",
              )}
            >
              <FileText size={14} />
              Черновик
            </button>
            <button
              onClick={() => handleSave("sent")}
              disabled={!isValid || saved}
              className={cn(
                "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
                isValid && !saved
                  ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90"
                  : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
              )}
            >
              {saved ? (
                <>
                  <Check size={14} /> Сохранено
                </>
              ) : (
                "Отправить поставщику"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-4 border-b border-[var(--c-border)] pb-2 text-sm font-semibold text-[var(--c-text)]">
        {title}
      </h3>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

function FormField({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
        {label}
        {required && <span className="ml-1 text-[var(--c-red)]">*</span>}
      </label>
      {children}
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-[var(--c-text3)]">{label}</p>
      <p className="text-sm font-medium text-[var(--c-text)]">{value}</p>
    </div>
  );
}

const inputCls =
  "h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none transition";
const selectCls =
  "h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none transition";
