"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  Filter,
  Download,
  MoreHorizontal,
  Eye,
  Package,
  ChevronRight,
  X,
  Check,
  AlertTriangle,
  Truck,
  Clock,
  FileText,
} from "lucide-react";
import {
  PURCHASE_ORDERS,
  SUPPLIERS,
  LOCATIONS,
  PO_STATUS_LABELS,
  type PurchaseOrder,
  type PurchaseOrderStatus,
} from "@/mock/inventory";
import { POStatusBadge } from "./StockStatusBadge";
import { cn } from "@/lib/utils";

interface Props {
  onCreatePO?: () => void;
}

export function PurchaseOrderList({ onCreatePO }: Props) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<PurchaseOrderStatus | "all">("all");
  const [supplierFilter, setSupplierFilter] = useState("all");
  const [selectedPO, setSelectedPO] = useState<PurchaseOrder | null>(null);

  const filtered = useMemo(() => {
    let list = [...PURCHASE_ORDERS];
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
  }, [search, statusFilter, supplierFilter]);

  const stats = useMemo(() => {
    const all = PURCHASE_ORDERS;
    return {
      open: all.filter((po) => !["closed", "draft"].includes(po.status)).length,
      inTransit: all.filter((po) => po.status === "in_transit").length,
      issues: all.filter((po) => po.status === "issue").length,
      totalValue: all.filter((po) => po.status !== "draft").reduce((s, po) => s + po.totalAmount, 0),
    };
  }, []);

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
            className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-9 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as PurchaseOrderStatus | "all")}
          className="h-9 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все статусы</option>
          {Object.entries(PO_STATUS_LABELS).map(([v, l]) => (
            <option key={v} value={v}>{l}</option>
          ))}
        </select>

        <select
          value={supplierFilter}
          onChange={(e) => setSupplierFilter(e.target.value)}
          className="h-9 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все поставщики</option>
          {SUPPLIERS.map((s) => (
            <option key={s.id} value={s.id}>{s.name}</option>
          ))}
        </select>

        <div className="ml-auto flex gap-2">
          <button className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
            <Download size={14} />
            Экспорт
          </button>
          <button
            onClick={onCreatePO}
            className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
          >
            <Plus size={15} />
            Создать заказ
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
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
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-[var(--c-text3)]">Заказы не найдены</td>
                </tr>
              )}
              {filtered.map((po) => (
                <tr
                  key={po.id}
                  className="group border-b border-[var(--c-border)] transition last:border-0 hover:bg-[var(--c-bg3)] cursor-pointer"
                  onClick={() => setSelectedPO(po)}
                >
                  <td className="px-5 py-4">
                    <p className="text-sm font-medium text-[var(--c-text)]">{po.id.toUpperCase()}</p>
                    <p className="text-xs text-[var(--c-text3)] mt-0.5">{po.supplierName}</p>
                    <p className="text-xs text-[var(--c-text3)]">от {formatDate(po.createdAt)}</p>
                  </td>
                  <td className="px-5 py-4">
                    <POStatusBadge status={po.status} />
                    {po.status === "partially_received" && (
                      <div className="mt-1.5">
                        <ReceiveProgress items={po.items} />
                      </div>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="space-y-1">
                      {po.items.slice(0, 2).map((item, i) => (
                        <p key={i} className="text-xs text-[var(--c-text2)]">
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

      {/* Detail panel */}
      {selectedPO && (
        <PODetailPanel po={selectedPO} onClose={() => setSelectedPO(null)} />
      )}
    </div>
  );
}

function PODetailPanel({ po, onClose }: { po: PurchaseOrder; onClose: () => void }) {
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
            <InfoCell label="Локация" value={LOCATIONS.find((l) => l.id === po.locationId)?.name ?? po.locationId} />
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
              className="flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
            >
              <Package size={16} />
              Принять товар
            </button>
          )}
          {receiving && (
            <div className="flex gap-2">
              <button
                onClick={() => setReceiving(false)}
                className="flex-1 h-10 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
              >
                Отмена
              </button>
              <button
                className="flex-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
              >
                <Check size={14} />
                Подтвердить приёмку
              </button>
            </div>
          )}
          <button className="flex w-full h-9 items-center justify-center gap-2 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
            <FileText size={14} />
            Скачать PDF
          </button>
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
