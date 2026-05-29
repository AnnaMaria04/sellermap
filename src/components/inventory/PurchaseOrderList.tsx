"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Plus,
  Search,
  Download,
  Package,
  ChevronRight,
  X,
  Check,
  AlertTriangle,
  Truck,
  Clock,
  FileText,
  ExternalLink,
} from "lucide-react";
import {
  PO_STATUS_LABELS,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { POStatusBadge } from "./StockStatusBadge";
import { EmptyState } from "@/components/inventory/ui/EmptyState";
import { cn } from "@/lib/utils";

function isOverdue(po: PurchaseOrder): boolean {
  if (["closed", "issue"].includes(po.status)) return false;
  if (!po.expectedArrival) return false;
  return new Date(po.expectedArrival) < new Date();
}

function daysOverdue(expectedArrival: string): number {
  const diff = Date.now() - new Date(expectedArrival).getTime();
  return Math.floor(diff / 86400000);
}

function OverdueBadge({ expectedArrival }: { expectedArrival: string }) {
  const days = daysOverdue(expectedArrival);
  return (
    <span className="inline-flex items-center rounded-full border border-[rgba(240,80,80,0.2)] bg-[var(--c-red-dim)] px-2.5 py-1 text-xs font-medium text-[var(--c-red)]">
      Просрочен {days} дн.
    </span>
  );
}

interface Props {
  onCreatePO?: () => void;
}

export function PurchaseOrderList({ onCreatePO }: Props) {
  const router = useRouter();
  const { purchaseOrders, suppliers } = useInventory();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "all">("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const filtered = useMemo(() => {
    let list = [...purchaseOrders];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (po) =>
          po.id.toLowerCase().includes(q) ||
          po.supplierName.toLowerCase().includes(q) ||
          po.items.some((i) => i.productName.toLowerCase().includes(q)),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((po) => po.status === statusFilter);
    }
    if (supplierFilter !== "all") {
      list = list.filter((po) => po.supplierId === supplierFilter);
    }
    return list.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }, [search, statusFilter, supplierFilter, purchaseOrders]);

  const stats = useMemo(() => {
    const all = purchaseOrders;
    return {
      open: all.filter((po) => !["closed", "draft"].includes(po.status)).length,
      inTransit: all.filter((po) => po.status === "in_transit").length,
      issues: all.filter((po) => po.status === "issue").length,
      totalValue: all.filter((po) => po.status !== "draft").reduce((s, po) => s + po.totalAmount, 0),
    };
  }, [purchaseOrders]);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <StatCard label="Открытых заказов" value={stats.open} color="green" />
        <StatCard label="В пути" value={stats.inTransit} icon={<Truck size={16} />} color="amber" />
        <StatCard label="Проблемы" value={stats.issues} icon={<AlertTriangle size={16} />} color={stats.issues > 0 ? "red" : "default"} />
        <StatCard label="На закупку (₽)" value={stats.totalValue.toLocaleString("ru-RU")} color="blue" isText />
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative min-w-[200px] flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            type="text"
            placeholder="Поиск по номеру, поставщику, товару..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-11 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-9 pr-3 text-base text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus | "all")}
          className="h-11 min-w-[44px] rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все статусы</option>
          {Object.entries(PO_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="h-11 min-w-[44px] rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все поставщики</option>
          {suppliers.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <button
            onClick={() => {
              const rows = [
                ["Номер", "Поставщик", "Статус", "Дата создания", "Ожидается", "Сумма", "Оплачено"],
                ...filtered.map((po) => [
                  po.id.toUpperCase(),
                  po.supplierName,
                  po.status,
                  po.createdAt.slice(0, 10),
                  po.expectedArrival ?? "",
                  po.totalAmount,
                  po.paymentStatus,
                ]),
              ];
              const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
              a.download = `заказы_поставщикам_${new Date().toISOString().slice(0, 10)}.csv`;
              a.click();
            }}
            className="flex h-11 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <Download size={14} />
            <span className="hidden sm:inline">Экспорт</span>
          </button>
          <button
            onClick={onCreatePO}
            className="flex h-11 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
          >
            <Plus size={15} />
            <span className="hidden sm:inline">Создать заказ</span>
            <span className="sm:hidden">Создать</span>
          </button>
        </div>
      </div>

      {/* Mobile card list — shown only at <768px */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<Package size={24} />}
          title="Нет заказов поставщикам"
          description="Заказы не найдены. Измените фильтры или создайте новый заказ поставщику."
          action={
            <button
              onClick={onCreatePO}
              className="flex h-11 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
            >
              <Plus size={15} />
              Создать заказ
            </button>
          }
          className="m-4"
        />
      ) : (
        <>
          {/* Mobile cards */}
          <div className="space-y-2 md:hidden">
            {filtered.map((po) => (
              <Link
                key={po.id}
                href={`/inventory/purchase-orders/${po.id}`}
                className="w-full text-left flex flex-col gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 active:bg-[var(--c-bg3)] transition"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-[var(--c-text)]">{po.id.toUpperCase()}</p>
                    <p className="text-xs text-[var(--c-text3)] truncate">{po.supplierName}</p>
                  </div>
                  <p className="text-sm font-semibold text-[var(--c-text)] shrink-0 tabular">
                    {po.totalAmount.toLocaleString("ru-RU")} ₽
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <POStatusBadge status={po.status} />
                  {isOverdue(po) && po.expectedArrival && (
                    <OverdueBadge expectedArrival={po.expectedArrival} />
                  )}
                  <PaymentBadge status={po.paymentStatus ?? "unpaid"} />
                </div>
                {po.expectedArrival && (
                  <div className="flex items-center gap-1.5">
                    <Clock size={12} className="text-[var(--c-text3)]" />
                    <span className="text-xs text-[var(--c-text2)]">Ожид.: {formatDate(po.expectedArrival)}</span>
                  </div>
                )}
                {po.status === "partially_received" && (
                  <ReceiveProgress items={po.items} />
                )}
              </Link>
            ))}
          </div>

          {/* Desktop table — hidden on mobile */}
          <div className="hidden md:block overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--c-border)]">
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">Номер / Поставщик</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">Статус</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">Товары</th>
                    <th className="px-5 py-3 text-right text-xs font-medium text-[var(--c-text2)]">Сумма</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">Ожид. поставка</th>
                    <th className="px-5 py-3 text-left text-xs font-medium text-[var(--c-text2)]">Оплата</th>
                    <th className="w-10 px-5 py-3" />
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((po) => (
                    <tr
                      key={po.id}
                      className="group border-b border-[var(--c-border)] transition last:border-0 hover:bg-[var(--c-bg3)] cursor-pointer"
                      onClick={() => router.push(`/inventory/purchase-orders/${po.id}`)}
                    >
                      <td className="px-5 py-4">
                        <p className="text-sm font-medium text-[var(--c-text)]">{po.id.toUpperCase()}</p>
                        <p className="text-xs text-[var(--c-text3)] mt-0.5 truncate">{po.supplierName}</p>
                        <p className="text-xs text-[var(--c-text3)]">от {formatDate(po.createdAt)}</p>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <POStatusBadge status={po.status} />
                          {isOverdue(po) && po.expectedArrival && (
                            <OverdueBadge expectedArrival={po.expectedArrival} />
                          )}
                        </div>
                        {po.status === "partially_received" && (
                          <div className="mt-1.5">
                            <ReceiveProgress items={po.items} />
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="space-y-1">
                          {po.items.slice(0, 2).map((item, i) => (
                            <p key={i} className="text-xs text-[var(--c-text2)] truncate max-w-[200px]">
                              {item.productName} × {item.qty}
                            </p>
                          ))}
                          {po.items.length > 2 && (
                            <p className="text-xs text-[var(--c-text3)]">+{po.items.length - 2} ещё</p>
                          )}
                        </div>
                      </td>
                      <td className="px-5 py-4 text-right tabular">
                        <p className="text-sm font-semibold text-[var(--c-text)]">
                          {po.totalAmount.toLocaleString("ru-RU")} ₽
                        </p>
                      </td>
                      <td className="px-5 py-4">
                        {po.expectedArrival ? (
                          <div className="flex items-center gap-1.5">
                            <Clock size={12} className="text-[var(--c-text3)]" />
                            <span className="text-xs text-[var(--c-text2)]">{formatDate(po.expectedArrival)}</span>
                          </div>
                        ) : (
                          <span className="text-xs text-[var(--c-text3)]">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <PaymentBadge status={po.paymentStatus ?? "unpaid"} />
                      </td>
                      <td className="px-5 py-4">
                        <ChevronRight size={16} className="text-[var(--c-text3)] opacity-0 group-hover:opacity-100 transition" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Detail panel */}
      {selectedPO && (
        <PODetailPanel po={selectedPO} onClose={() => setSelectedPO(null)} />
      )}
    </div>
  );
}

function PODetailPanel({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
  const { locations, actions } = useInventory();
  const [receiving, setReceiving] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});

  const totalOrdered = po.items.reduce((s, i) => s + i.qty, 0);
  const totalReceived = po.items.reduce((s, i) => s + i.receivedQty, 0);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">{po.id.toUpperCase()}</h2>
            <p className="text-xs text-[var(--c-text2)]">{po.supplierName}</p>
          </div>
          <button
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition"
          >
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Status */}
          <div className="flex items-center justify-between">
            <POStatusBadge status={po.status} />
            <PaymentBadge status={po.paymentStatus ?? "unpaid"} />
          </div>

          {/* Info grid */}
          <div className="grid grid-cols-2 gap-3">
            <InfoCell label="Создан" value={formatDate(po.createdAt)} />
            <InfoCell label="Ожид. поставка" value={po.expectedArrival ? formatDate(po.expectedArrival) : "—"} />
            <InfoCell label="Локация" value={locations.find((l) => l.id === po.locationId)?.name ?? po.locationId} />
            {po.trackingNumber && <InfoCell label="Трэк" value={po.trackingNumber} />}
          </div>

          {/* Progress */}
          {(po.status === "partially_received" || po.status === "closed") && (
            <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-medium text-[var(--c-text2)]">Принято</p>
                <p className="text-sm font-semibold text-[var(--c-text)] tabular">{totalReceived} / {totalOrdered}</p>
              </div>
              <div className="h-2 rounded-full bg-[var(--c-bg2)] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[var(--c-green)] transition-all"
                  style={{ width: `${(totalReceived / totalOrdered) * 100}%` }}
                />
              </div>
            </div>
          )}

          {/* Items */}
          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-text2)]">Позиции заказа</h3>
            <div className="space-y-2">
              {po.items.map((item, i) => (
                <div key={i} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-[var(--c-text)]">{item.productName}</p>
                      <p className="text-xs text-[var(--c-text3)] mt-0.5">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--c-text)] tabular">{item.totalCost.toLocaleString("ru-RU")} ₽</p>
                      <p className="text-xs text-[var(--c-text3)]">{item.unitCost.toLocaleString("ru-RU")} ₽ × {item.qty}</p>
                    </div>
                  </div>
                  {item.receivedQty > 0 && (
                    <div className="mt-2 flex items-center gap-2">
                      <div className="flex-1 h-1.5 rounded-full bg-[var(--c-bg2)] overflow-hidden">
                        <div
                          className="h-full rounded-full bg-[var(--c-green)]"
                          style={{ width: `${(item.receivedQty / item.qty) * 100}%` }}
                        />
                      </div>
                      <p className="text-xs text-[var(--c-text3)] tabular">{item.receivedQty}/{item.qty}</p>
                    </div>
                  )}

                  {receiving && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-xs text-[var(--c-text2)]">Принять:</label>
                      <input
                        type="number"
                        min={0}
                        max={item.qty - item.receivedQty}
                        value={receiveQtys[item.productId] ?? ""}
                        onChange={(e) =>
                          setReceiveQtys((prev) => ({ ...prev, [item.productId]: e.target.value }))
                        }
                        className="w-24 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 py-1.5 text-right text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none tabular"
                      />
                      <span className="text-xs text-[var(--c-text3)]">из {item.qty - item.receivedQty} ост.</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Total */}
          <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] p-4">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-[var(--c-text2)]">Итого по заказу</span>
              <span className="text-lg font-bold text-[var(--c-text)] tabular">
                {po.totalAmount.toLocaleString("ru-RU")} ₽
              </span>
            </div>
          </div>

          {po.note && (
            <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] p-4">
              <p className="text-xs font-medium text-[var(--c-text2)] mb-1">Примечание</p>
              <p className="text-sm text-[var(--c-text)]">{po.note}</p>
            </div>
          )}
        </div>

        {/* Footer actions */}
        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg2)] p-4 space-y-2">
          {!receiving && po.status !== "closed" && po.status !== "draft" && (
            <button
              onClick={() => setReceiving(true)}
              className="flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
            >
              <Package size={16} />
              Принять товар
            </button>
          )}
          {receiving && (
            <div className="flex gap-2">
              <button
                onClick={() => { setReceiving(false); setReceiveQtys({}); }}
                className="flex-1 h-10 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
              >
                Отмена
              </button>
              <button
                onClick={() => {
                  const received: Record<string, number> = {};
                  Object.entries(receiveQtys).forEach(([productId, qtyStr]) => {
                    const qty = parseInt(qtyStr);
                    if (!isNaN(qty) && qty > 0) received[productId] = qty;
                  });
                  if (Object.keys(received).length > 0) {
                    actions.receivePOItems(po.id, received, po.locationId);
                    setReceiving(false);
                  }
                }}
                className="flex-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:opacity-90 transition"
              >
                <Check size={14} />
                Подтвердить приёмку
              </button>
            </div>
          )}
          <button
            onClick={() => {
              const rows = [
                ["Заказ", po.id],
                ["Поставщик", po.supplierName ?? po.supplierId],
                ["Статус", po.status],
                ["Сумма", String(po.totalAmount)],
                [],
                ["Товар", "SKU", "Заказано", "Получено", "Цена", "Сумма"],
                ...po.items.map((it) => [it.productName, it.sku, String(it.qty), String(it.receivedQty ?? 0), String(it.unitCost), String(it.qty * it.unitCost)]),
              ];
              const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
              const a = document.createElement("a");
              a.href = URL.createObjectURL(new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8" }));
              a.download = `${po.id}.csv`;
              a.click();
            }}
            className="flex w-full h-9 items-center justify-center gap-2 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <FileText size={14} />
            Скачать CSV
          </button>
          <Link
            href={`/inventory/purchase-orders/${po.id}`}
            className="flex w-full h-9 items-center justify-center gap-2 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <ExternalLink size={14} />
            Открыть полную страницу →
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, color, icon, isText }: { label: string; value: number | string; color: string; icon?: React.ReactNode; isText?: boolean }) {
  const colorMap: Record<string, string> = {
    green: "text-[var(--c-green)]",
    amber: "text-[var(--c-amber)]",
    red: "text-[var(--c-red)]",
    blue: "text-[var(--c-blue)]",
    default: "text-[var(--c-text2)]",
  };
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className="flex items-center gap-2 mb-2">
        {icon && <span className={colorMap[color]}>{icon}</span>}
        <p className="text-xs text-[var(--c-text2)]">{label}</p>
      </div>
      <p className={cn("font-bold tabular", isText ? "text-lg" : "text-2xl", colorMap[color])}>
        {typeof value === "number" && !isText ? value : value}
      </p>
    </div>
  );
}

function ReceiveProgress({ items }: { items: PurchaseOrder["items"] }) {
  const total = items.reduce((s, i) => s + i.qty, 0);
  const received = items.reduce((s, i) => s + i.receivedQty, 0);
  const pct = total > 0 ? (received / total) * 100 : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full bg-[var(--c-bg)] overflow-hidden">
        <div className="h-full rounded-full bg-[var(--c-green)]" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-[var(--c-text3)] tabular">{received}/{total}</span>
    </div>
  );
}

function PaymentBadge({ status }: { status: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    unpaid:  { label: "Не оплачен",   cls: "bg-[var(--c-red-dim)] text-[var(--c-red)] border-[rgba(240,80,80,0.2)]" },
    partial: { label: "Частично",     cls: "bg-[var(--c-amber-dim)] text-[var(--c-amber)] border-[rgba(245,166,35,0.2)]" },
    paid:    { label: "Оплачен",      cls: "bg-[var(--c-green-dim)] text-[var(--c-green)] border-[rgba(31,209,131,0.2)]" },
  };
  const cfg = map[status] ?? map.unpaid;
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-medium", cfg.cls)}>
      {cfg.label}
    </span>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] p-3">
      <p className="text-xs text-[var(--c-text3)] mb-0.5">{label}</p>
      <p className="text-sm font-medium text-[var(--c-text)]">{value}</p>
    </div>
  );
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}
