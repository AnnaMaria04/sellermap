"use client";

import { use, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Edit3,
  MoreHorizontal,
  Barcode,
  Package,
  Truck,
  ShoppingCart,
  Copy,
  Archive,
  Star,
  AlertTriangle,
  CheckCircle,
  MapPin,
  TrendingUp,
  History,
  X,
  Plus,
  Minus,
} from "lucide-react";
import type { ProductStatus } from "@/mock/inventory";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { StockStatusBadge, ProductStatusBadge, MovementTypeBadge } from "@/components/inventory/StockStatusBadge";
import {
  getAvailableStock,
  getStockStatus,
  getSupplierName,
  PRODUCT_TYPE_LABELS,
  CHANNEL_LABELS,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { STOCK_TERMS } from "@/components/inventory/ui/StockTerms";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export default function ProductDetailPage({ params }: Props) {
  const { id } = use(params);
  const { products, movements: allMovements, suppliers, locations, actions } = useInventory();
  const product = products.find((p) => p.id === id);

  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: product?.name ?? "",
    category: product?.category ?? "",
    price: product?.price ?? 0,
    costPrice: product?.costPrice ?? 0,
    status: (product?.status ?? "active") as ProductStatus,
    description: product?.description ?? "",
  });

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name,
        category: product.category,
        price: product.price,
        costPrice: product.costPrice,
        status: product.status,
        description: product.description ?? "",
      });
    }
  }, [product?.id]);

  const saveEdit = () => {
    if (!product) return;
    const margin = form.price > 0 ? Math.round(((form.price - form.costPrice) / form.price) * 1000) / 10 : 0;
    actions.updateProduct(product.id, { ...form, margin });
    setEditing(false);
  };

  if (!product) {
    return (
      <InventoryShell>
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <Package size={48} className="text-[var(--c-text3)] mb-4" />
          <h1 className="text-xl font-bold text-[var(--c-text)]">Товар не найден</h1>
          <p className="mt-2 text-sm text-[var(--c-text2)]">Товар с ID {id} не существует</p>
          <Link href="/inventory/products" className="mt-4 flex items-center gap-2 text-sm text-[var(--c-green)] hover:opacity-80 transition">
            <ArrowLeft size={14} />
            Назад к товарам
          </Link>
        </div>
      </InventoryShell>
    );
  }

  const available = getAvailableStock(product);
  const stockStatus = getStockStatus(product);
  const supplier = suppliers.find((s) => s.id === product.supplierId);
  const movements = allMovements.filter((m) => m.productId === product.id);
  const margin = product.margin ?? 0;

  return (
    <InventoryShell
      title={product.name}
      subtitle={`SKU: ${product.sku}`}
      actions={
        <div className="flex items-center gap-2">
          <Link
            href="/inventory/products"
            className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <ArrowLeft size={14} />
            Назад
          </Link>
          <button
            onClick={() => setEditing(true)}
            className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <Edit3 size={14} />
            Редактировать
          </button>
          <button className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition">
            <ShoppingCart size={14} />
            Заказать
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Left column — 2/3 */}
        <div className="space-y-6 lg:col-span-2">
          {/* Product header */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
            <div className="flex items-start gap-5">
              {/* Image */}
              <div className="h-24 w-24 shrink-0 overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)]">
                {product.imageUrl ? (
                  <img src={product.imageUrl} alt={product.name} className="h-full w-full object-cover" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center text-3xl">📦</div>
                )}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-2">
                  <ProductStatusBadge status={product.status} />
                  <StockStatusBadge status={stockStatus} count={available} />
                  {product.requiresLabeling && (
                    <span className="inline-flex items-center gap-1 rounded-full border border-[rgba(77,159,255,0.2)] bg-[var(--c-blue-dim)] px-2.5 py-1 text-xs font-medium text-[var(--c-blue)]">
                      🏷️ Маркировка
                    </span>
                  )}
                </div>

                <h1 className="text-2xl font-bold text-[var(--c-text)]">{product.name}</h1>

                {product.description && (
                  <p className="mt-2 text-sm text-[var(--c-text2)]">{product.description}</p>
                )}

                <div className="mt-4 flex flex-wrap gap-3">
                  <div>
                    <p className="text-xs text-[var(--c-text3)]">Тип</p>
                    <p className="text-sm font-medium text-[var(--c-text)]">{PRODUCT_TYPE_LABELS[product.productType]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-[var(--c-text3)]">Категория</p>
                    <p className="text-sm font-medium text-[var(--c-text)]">{product.category}</p>
                  </div>
                  {product.barcode && (
                    <div>
                      <p className="text-xs text-[var(--c-text3)]">Штрихкод</p>
                      <p className="text-sm font-medium text-[var(--c-text)] font-mono">{product.barcode}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Pricing */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
            <h2 className="mb-4 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Цены и маржа</h2>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <PriceCell label="Цена продажи" value={`${product.price.toLocaleString("ru-RU")} ₽`} main />
              <PriceCell label="Закупочная цена" value={`${product.costPrice.toLocaleString("ru-RU")} ₽`} />
              {product.packagingCost && <PriceCell label="Упаковка" value={`${product.packagingCost} ₽`} />}
              <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] p-4">
                <p className="text-xs text-[var(--c-text3)] mb-1">Маржа</p>
                <p className={cn(
                  "text-2xl font-bold tabular",
                  margin >= 30 ? "text-[var(--c-green)]" : margin >= 15 ? "text-[var(--c-amber)]" : "text-[var(--c-red)]",
                )}>
                  {margin.toFixed(1)}%
                </p>
                <div className="mt-2 h-1.5 rounded-full bg-[var(--c-bg2)] overflow-hidden">
                  <div
                    className={cn("h-full rounded-full", margin >= 30 ? "bg-[var(--c-green)]" : margin >= 15 ? "bg-[var(--c-amber)]" : "bg-[var(--c-red)]")}
                    style={{ width: `${Math.min(100, margin)}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Stock by location */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
            <h2 className="mb-4 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Остатки по локациям</h2>

            {/* Summary formula */}
            <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <StockPill label={STOCK_TERMS.onHand.short} value={product.totalPhysical} color="default" />
              <StockPill label={STOCK_TERMS.committed.short} value={product.reservedUnits} color="amber" minus />
              <StockPill label={STOCK_TERMS.unavailable.short} value={product.damagedUnits} color="red" minus />
              <StockPill label={STOCK_TERMS.incoming.short} value={product.inTransitUnits} color="blue" />
            </div>
            <div className="mb-5 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] px-4 py-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-[var(--c-text2)]" title={STOCK_TERMS.available.hint}>{STOCK_TERMS.available.label} к продаже</span>
                <span className={cn(
                  "text-2xl font-bold tabular",
                  stockStatus === "out_of_stock" ? "text-[var(--c-red)]" :
                  stockStatus === "low_stock" ? "text-[var(--c-amber)]" :
                  "text-[var(--c-green)]",
                )}>
                  {available}
                </span>
              </div>
            </div>

            {/* By location */}
            <div className="space-y-2">
              {Object.entries(product.stockByLocation).map(([locId, qty]) => {
                const loc = locations.find((l) => l.id === locId);
                return (
                  <div key={locId} className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3">
                    <MapPin size={14} className="text-[var(--c-text3)] shrink-0" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--c-text)]">{loc?.name ?? locId}</p>
                      <p className="text-xs text-[var(--c-text3)]">{loc?.type}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => actions.adjustStock(product.id, locId, -1, "adjustment", "Ручная корректировка")}
                        disabled={qty <= 0}
                        aria-label="Уменьшить остаток"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg2)] transition disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        <Minus size={14} />
                      </button>
                      <p className="w-10 text-center text-base font-bold text-[var(--c-text)] tabular">{qty}</p>
                      <button
                        onClick={() => actions.adjustStock(product.id, locId, 1, "adjustment", "Ручная корректировка")}
                        aria-label="Увеличить остаток"
                        className="flex h-7 w-7 items-center justify-center rounded-lg border border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg2)] transition"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Variants */}
          {product.hasVariants && product.variants.length > 0 && (
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
              <h2 className="mb-4 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">
                Варианты ({product.variants.length})
              </h2>
              <div className="overflow-hidden rounded-xl border border-[var(--c-border)]">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">Вариант</th>
                      <th className="px-4 py-2.5 text-left text-xs font-medium text-[var(--c-text2)]">SKU</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Цена</th>
                      <th className="px-4 py-2.5 text-right text-xs font-medium text-[var(--c-text2)]">Остаток</th>
                    </tr>
                  </thead>
                  <tbody>
                    {product.variants.map((v) => {
                      const totalStock = Object.values(v.stock).reduce((s, q) => s + q, 0);
                      return (
                        <tr key={v.id} className="border-b border-[var(--c-border)] last:border-0 hover:bg-[var(--c-bg3)] transition">
                          <td className="px-4 py-3 font-medium text-[var(--c-text)]">{v.name}</td>
                          <td className="px-4 py-3 text-xs font-mono text-[var(--c-text3)]">{v.sku}</td>
                          <td className="px-4 py-3 text-right tabular text-[var(--c-text)]">{v.price.toLocaleString("ru-RU")} ₽</td>
                          <td className="px-4 py-3 text-right tabular">
                            <span className={cn(
                              "font-semibold",
                              totalStock === 0 ? "text-[var(--c-red)]" :
                              totalStock < 5 ? "text-[var(--c-amber)]" :
                              "text-[var(--c-text)]",
                            )}>
                              {totalStock}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Movement history */}
          {movements.length > 0 && (
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6">
              <div className="flex items-center justify-between mb-4 border-b border-[var(--c-border)] pb-2">
                <h2 className="text-sm font-semibold text-[var(--c-text)]">История движений</h2>
                <Link href="/inventory/history" className="text-xs text-[var(--c-text3)] hover:text-[var(--c-text)] transition">
                  Вся история →
                </Link>
              </div>
              <div className="space-y-2">
                {movements.slice(0, 5).map((m) => {
                  const isPositive = m.qtyDelta > 0;
                  return (
                    <div key={m.id} className="flex items-center gap-3 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] px-4 py-3">
                      <div className={cn(
                        "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-bold",
                        isPositive ? "bg-[var(--c-green-dim)] text-[var(--c-green)]" : "bg-[var(--c-red-dim)] text-[var(--c-red)]",
                      )}>
                        {isPositive ? "+" : "−"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <MovementTypeBadge type={m.type} />
                        {m.reason && <p className="text-xs text-[var(--c-text3)] mt-0.5 truncate">{m.reason}</p>}
                      </div>
                      <div className="text-right shrink-0">
                        <p className={cn("text-sm font-bold tabular", isPositive ? "text-[var(--c-green)]" : "text-[var(--c-red)]")}>
                          {isPositive ? "+" : ""}{m.qtyDelta}
                        </p>
                        <p className="text-xs text-[var(--c-text3)]">{m.qtyBefore}→{m.qtyAfter}</p>
                        <p className="text-xs text-[var(--c-text3)]">{formatDate(m.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Right column — 1/3 */}
        <div className="space-y-4">
          {/* Channels */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)]">Каналы продаж</h3>
            <div className="flex flex-wrap gap-2">
              {product.channels.map((ch) => (
                <span key={ch} className="inline-flex items-center rounded-full border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2.5 py-1 text-xs text-[var(--c-text2)]">
                  {CHANNEL_LABELS[ch]}
                </span>
              ))}
            </div>
          </div>

          {/* Supplier */}
          {supplier && (
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
              <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)]">Поставщик</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] text-lg">
                  {supplier.country === "Китай" ? "🇨🇳" : supplier.country === "Германия" ? "🇩🇪" : "🇷🇺"}
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--c-text)]">{supplier.name}</p>
                  <p className="text-xs text-[var(--c-text3)]">{supplier.country}</p>
                </div>
              </div>
              <div className="space-y-2 text-xs">
                <InfoRow label="Срок" value={`${supplier.leadTimeDays} дней`} />
                <InfoRow label="Мин. заказ" value={supplier.minOrderQty ? `${supplier.minOrderQty} шт` : "—"} />
                <InfoRow label="Условия" value={supplier.paymentTerms ?? "—"} />
              </div>
              <button className="mt-3 flex w-full h-9 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition">
                <ShoppingCart size={14} />
                Создать заказ
              </button>
            </div>
          )}

          {/* Tags */}
          {product.tags.length > 0 && (
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
              <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)]">Теги</h3>
              <div className="flex flex-wrap gap-2">
                {product.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-[var(--c-bg3)] border border-[var(--c-border2)] px-2.5 py-1 text-xs text-[var(--c-text2)]">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Labeling */}
          {product.requiresLabeling && (
            <div className="rounded-xl border border-[rgba(77,159,255,0.2)] bg-[var(--c-blue-dim)] p-5">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold text-[var(--c-blue)]">
                🏷️ Маркировка
              </h3>
              <div className="space-y-2 text-xs">
                <InfoRow label="Тип" value={product.labelingType ?? "—"} />
                {product.gtin && <InfoRow label="GTIN" value={product.gtin} />}
                {product.batchNumber && <InfoRow label="Партия" value={product.batchNumber} />}
                {product.expiryDate && <InfoRow label="Срок годности" value={product.expiryDate} />}
              </div>
              {!product.dataMatrixCode && (
                <div className="mt-3 flex items-center gap-2 rounded-lg bg-[rgba(240,80,80,0.1)] border border-[rgba(240,80,80,0.2)] px-3 py-2">
                  <AlertTriangle size={12} className="text-[var(--c-red)] shrink-0" />
                  <p className="text-xs text-[var(--c-red)]">Нет Data Matrix кода</p>
                </div>
              )}
            </div>
          )}

          {/* Quick actions */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)]">Действия</h3>
            <div className="space-y-1.5">
              {[
                { icon: Barcode, label: "Печать этикетки" },
                { icon: Copy, label: "Дублировать товар" },
                { icon: Truck, label: "Принять товар" },
                { icon: Archive, label: "Архивировать" },
              ].map((action) => (
                <button
                  key={action.label}
                  className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
                >
                  <action.icon size={14} />
                  {action.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dates */}
          <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)]">Информация</h3>
            <div className="space-y-2 text-xs">
              <InfoRow label="Создан" value={formatDate(product.createdAt)} />
              <InfoRow label="Обновлён" value={formatDate(product.updatedAt)} />
            </div>
          </div>
        </div>
      </div>

      {/* Edit drawer */}
      {editing && (
        <div className="fixed inset-0 z-50 flex">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditing(false)}
          />
          <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[var(--c-bg)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
              <h2 className="text-base font-semibold text-[var(--c-text)]">Редактировать товар</h2>
              <button
                onClick={() => setEditing(false)}
                aria-label="Закрыть"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 space-y-4 overflow-y-auto px-6 py-5">
              <Field label="Название">
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)] transition"
                />
              </Field>

              <Field label="Категория">
                <input
                  type="text"
                  value={form.category}
                  onChange={(e) => setForm((f) => ({ ...f, category: e.target.value }))}
                  className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)] transition"
                />
              </Field>

              <div className="grid grid-cols-2 gap-4">
                <Field label="Цена продажи, ₽">
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => setForm((f) => ({ ...f, price: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] tabular outline-none focus:border-[var(--c-green)] transition"
                  />
                </Field>
                <Field label="Закупочная цена, ₽">
                  <input
                    type="number"
                    value={form.costPrice}
                    onChange={(e) => setForm((f) => ({ ...f, costPrice: Number(e.target.value) }))}
                    className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] tabular outline-none focus:border-[var(--c-green)] transition"
                  />
                </Field>
              </div>

              <Field label="Статус">
                <select
                  value={form.status}
                  onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as ProductStatus }))}
                  className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)] transition"
                >
                  <option value="active">Активен</option>
                  <option value="draft">Черновик</option>
                  <option value="archived">В архиве</option>
                </select>
              </Field>

              <Field label="Описание">
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                  className="w-full resize-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)] transition"
                />
              </Field>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-[var(--c-border)] px-6 py-4">
              <button
                onClick={() => setEditing(false)}
                className="flex h-9 items-center rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
              >
                Отмена
              </button>
              <button
                onClick={saveEdit}
                className="flex h-9 items-center rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
              >
                Сохранить
              </button>
            </div>
          </div>
        </div>
      )}
    </InventoryShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">{label}</label>
      {children}
    </div>
  );
}

function PriceCell({ label, value, main }: { label: string; value: string; main?: boolean }) {
  return (
    <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] p-4">
      <p className="text-xs text-[var(--c-text3)] mb-1">{label}</p>
      <p className={cn("font-bold tabular", main ? "text-xl text-[var(--c-text)]" : "text-base text-[var(--c-text2)]")}>
        {value}
      </p>
    </div>
  );
}

function StockPill({ label, value, color, minus }: { label: string; value: number; color: string; minus?: boolean }) {
  const colors: Record<string, string> = {
    default: "text-[var(--c-text)]",
    amber: "text-[var(--c-amber)]",
    red: "text-[var(--c-red)]",
    blue: "text-[var(--c-blue)]",
  };
  return (
    <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] p-3 text-center">
      <p className="text-xs text-[var(--c-text3)]">{label}</p>
      <p className={cn("text-base font-bold tabular", colors[color])}>
        {minus ? "−" : ""}{value}
      </p>
    </div>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-[var(--c-text3)]">{label}</span>
      <span className="font-medium text-[var(--c-text)]">{value}</span>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}
