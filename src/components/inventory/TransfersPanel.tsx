"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  Search,
  ArrowRight,
  Check,
  X,
  Truck,
  Package,
  MapPin,
  Trash2,
  ChevronRight,
} from "lucide-react";
import {
  getLocationName,
  type Transfer,
  type TransferStatus,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { TransferStatusBadge } from "./StockStatusBadge";
import { EmptyState } from "@/components/inventory/ui/EmptyState";
import { cn } from "@/lib/utils";

interface Props {
  onCreateTransfer?: () => void;
}

export function TransfersPanel({ onCreateTransfer }: Props) {
  const { transfers, actions } = useInventory();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<TransferStatus | "all">("all");
  const [selectedTransfer, setSelectedTransfer] = useState<Transfer | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = useMemo(() => {
    let list = [...transfers];
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (t) =>
          t.id.toLowerCase().includes(q) ||
          t.items.some((i) => i.productName.toLowerCase().includes(q)) ||
          getLocationName(t.fromLocationId).toLowerCase().includes(q) ||
          getLocationName(t.toLocationId).toLowerCase().includes(q),
      );
    }
    if (statusFilter !== "all") {
      list = list.filter((t) => t.status === statusFilter);
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [transfers, search, statusFilter]);

  return (
    <div className="space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Всего перемещений", value: transfers.length, color: "text-[var(--c-text)]" },
          { label: "В пути", value: transfers.filter((t) => t.status === "in_transit").length, color: "text-[var(--c-amber)]" },
          { label: "Принято", value: transfers.filter((t) => t.status === "received").length, color: "text-[var(--c-green)]" },
          { label: "Частично", value: transfers.filter((t) => t.status === "partial").length, color: "text-[var(--c-blue)]" },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <p className="text-xs text-[var(--c-text2)] mb-1.5">{stat.label}</p>
            <p className={cn("text-2xl font-bold tabular", stat.color)}>{stat.value}</p>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            type="text"
            placeholder="Поиск по локации, товару..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-9 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>

        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as TransferStatus | "all")}
          className="h-9 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все статусы</option>
          <option value="draft">Черновик</option>
          <option value="in_transit">В пути</option>
          <option value="received">Принят</option>
          <option value="partial">Частично</option>
        </select>

        <div className="ml-auto">
          <button
            onClick={() => setShowForm(true)}
            className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
          >
            <Plus size={15} />
            Создать перемещение
          </button>
        </div>
      </div>

      {/* Transfers list */}
      <div className="space-y-3">
        {filtered.length === 0 && (
          <EmptyState
            icon={<Truck size={24} />}
            title="Нет перемещений"
            description="Перемещения не найдены. Измените фильтры или создайте новое перемещение между локациями."
            action={
              <button
                onClick={() => setShowForm(true)}
                className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
              >
                <Plus size={15} />
                Создать перемещение
              </button>
            }
          />
        )}
        {filtered.map((transfer) => (
          <TransferCard
            key={transfer.id}
            transfer={transfer}
            onClick={() => setSelectedTransfer(transfer)}
          />
        ))}
      </div>

      {/* Transfer detail */}
      {selectedTransfer && (
        <TransferDetailPanel
          transfer={selectedTransfer}
          onClose={() => setSelectedTransfer(null)}
        />
      )}

      {/* Create transfer form */}
      {showForm && (
        <CreateTransferForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

function TransferCard({ transfer, onClick }: { transfer: Transfer; onClick: () => void }) {
  const fromName = getLocationName(transfer.fromLocationId);
  const toName = getLocationName(transfer.toLocationId);
  const totalQty = transfer.items.reduce((s, i) => s + i.qty, 0);
  const receivedQty = transfer.items.reduce((s, i) => s + i.receivedQty, 0);

  return (
    <div
      onClick={onClick}
      className="group flex items-center gap-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] px-5 py-4 cursor-pointer hover:bg-[var(--c-bg3)] transition"
    >
      {/* Route */}
      <div className="flex flex-1 items-center gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-[var(--c-text3)]" />
            <span className="text-sm font-medium text-[var(--c-text)]">{fromName}</span>
          </div>
          <ArrowRight size={14} className="text-[var(--c-text3)]" />
          <div className="flex items-center gap-1.5">
            <MapPin size={13} className="text-[var(--c-green)]" />
            <span className="text-sm font-medium text-[var(--c-text)]">{toName}</span>
          </div>
        </div>
        <div className="hidden sm:flex flex-wrap gap-1.5 min-w-0">
          {transfer.items.slice(0, 2).map((item, i) => (
            <span key={i} className="rounded-full bg-[var(--c-bg3)] border border-[var(--c-border)] px-2 py-0.5 text-xs text-[var(--c-text2)]">
              {item.productName} × {item.qty}
            </span>
          ))}
          {transfer.items.length > 2 && (
            <span className="text-xs text-[var(--c-text3)]">+{transfer.items.length - 2}</span>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="flex items-center gap-4 shrink-0">
        <div className="text-right">
          <p className="text-xs text-[var(--c-text3)]">{formatDate(transfer.createdAt)}</p>
          <p className="text-xs text-[var(--c-text2)] mt-0.5 tabular">{totalQty} ед.</p>
        </div>

        {transfer.status === "partial" && (
          <div className="w-16">
            <div className="h-1.5 rounded-full bg-[var(--c-bg3)] overflow-hidden">
              <div
                className="h-full rounded-full bg-[var(--c-green)]"
                style={{ width: `${(receivedQty / totalQty) * 100}%` }}
              />
            </div>
            <p className="text-xs text-[var(--c-text3)] mt-1 text-right tabular">{receivedQty}/{totalQty}</p>
          </div>
        )}

        <TransferStatusBadge status={transfer.status} />
        <ChevronRight size={16} className="text-[var(--c-text3)] opacity-0 group-hover:opacity-100 transition" />
      </div>
    </div>
  );
}

function TransferDetailPanel({ transfer, onClose }: { transfer: Transfer; onClose: () => void }) {
  const { actions } = useInventory();
  const [receiving, setReceiving] = useState(false);
  const [receiveQtys, setReceiveQtys] = useState<Record<string, string>>({});
  const fromName = getLocationName(transfer.fromLocationId);
  const toName = getLocationName(transfer.toLocationId);

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-base font-semibold text-[var(--c-text)]">{transfer.id.toUpperCase()}</h2>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-xs text-[var(--c-text3)]">{fromName}</span>
              <ArrowRight size={12} className="text-[var(--c-text3)]" />
              <span className="text-xs text-[var(--c-green)]">{toName}</span>
            </div>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="flex items-center gap-3">
            <TransferStatusBadge status={transfer.status} />
            <span className="text-xs text-[var(--c-text3)]">Создано: {formatDate(transfer.createdAt)}</span>
          </div>

          {transfer.expectedArrival && (
            <div className="flex items-center gap-2 rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] px-4 py-3">
              <Truck size={15} className="text-[var(--c-amber)]" />
              <div>
                <p className="text-xs text-[var(--c-text2)]">Ожидаемая дата</p>
                <p className="text-sm font-medium text-[var(--c-text)]">{formatDate(transfer.expectedArrival)}</p>
              </div>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-text2)]">Товары</h3>
            <div className="space-y-2">
              {transfer.items.map((item, i) => (
                <div key={i} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--c-text)]">{item.productName}</p>
                      <p className="text-xs text-[var(--c-text3)]">{item.sku}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-[var(--c-text)] tabular">{item.qty} шт</p>
                      {item.receivedQty > 0 && (
                        <p className="text-xs text-[var(--c-green)] tabular">принято {item.receivedQty}</p>
                      )}
                    </div>
                  </div>

                  {receiving && (
                    <div className="mt-3 flex items-center gap-2">
                      <label className="text-xs text-[var(--c-text2)]">Принять:</label>
                      <input
                        type="number"
                        min={0}
                        max={item.qty - item.receivedQty}
                        value={receiveQtys[item.productId] ?? ""}
                        onChange={(e) => setReceiveQtys((prev) => ({ ...prev, [item.productId]: e.target.value }))}
                        className="w-24 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 py-1.5 text-right text-sm focus:border-[var(--c-green)] focus:outline-none tabular text-[var(--c-text)]"
                      />
                      <span className="text-xs text-[var(--c-text3)]">из {item.qty - item.receivedQty}</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          {transfer.note && (
            <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] p-4">
              <p className="text-xs font-medium text-[var(--c-text2)] mb-1">Примечание</p>
              <p className="text-sm text-[var(--c-text)]">{transfer.note}</p>
            </div>
          )}
        </div>

        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg2)] p-4 space-y-2">
          {!receiving && transfer.status === "in_transit" && (
            <button
              onClick={() => { actions.receiveTransfer(transfer.id); onClose(); }}
              className="flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
            >
              <Package size={16} />
              Принять товар
            </button>
          )}
          {receiving && (
            <div className="flex gap-2">
              <button onClick={() => setReceiving(false)} className="flex-1 h-10 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
                Отмена
              </button>
              <button className="flex-1 flex h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition">
                <Check size={14} />
                Подтвердить
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateTransferForm({ onClose }: { onClose: () => void }) {
  const { products, locations, actions } = useInventory();
  const [fromId, setFromId] = useState(locations.find((l) => l.isDefault)?.id ?? "");
  const [toId, setToId] = useState("");
  const [expectedArrival, setExpectedArrival] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<{ productId: string; productName: string; sku: string; qty: number }[]>([]);
  const [searchQ, setSearchQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [saved, setSaved] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = searchQ.toLowerCase();
    return products.filter((p) =>
      p.status === "active" &&
      (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [products, searchQ]);

  function addLine(p: typeof products[0]) {
    if (lines.find((l) => l.productId === p.id)) return;
    setLines((prev) => [...prev, { productId: p.id, productName: p.name, sku: p.sku, qty: 1 }]);
    setShowSearch(false);
    setSearchQ("");
  }

  function handleSave() {
    if (!isValid) return;
    actions.createTransfer({
      fromLocationId: fromId,
      toLocationId: toId,
      status: "in_transit",
      items: lines.map((l) => ({ ...l, receivedQty: 0 })),
      expectedArrival: expectedArrival || undefined,
      note: note || undefined,
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  }

  const isValid = fromId && toId && fromId !== toId && lines.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Новое перемещение</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Route */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Маршрут</h3>
            <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-3">
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Откуда</label>
                <select
                  value={fromId}
                  onChange={(e) => setFromId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                >
                  {locations.filter((l) => !["damaged", "in_transit"].includes(l.type)).map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
              <ArrowRight size={18} className="text-[var(--c-text3)] mt-5" />
              <div>
                <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Куда</label>
                <select
                  value={toId}
                  onChange={(e) => setToId(e.target.value)}
                  className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                >
                  <option value="">Выберите...</option>
                  {locations.filter((l) => l.id !== fromId).map((l) => (
                    <option key={l.id} value={l.id}>{l.name}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Date */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Ожидаемая дата прибытия</label>
            <input
              type="date"
              value={expectedArrival}
              onChange={(e) => setExpectedArrival(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
            />
          </div>

          {/* Products */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Товары</h3>
            <div className="relative mb-3">
              <button
                onClick={() => setShowSearch(!showSearch)}
                className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--c-border2)] bg-[var(--c-bg3)] px-4 py-3 text-sm text-[var(--c-text2)] hover:border-[var(--c-green)] transition"
              >
                <Plus size={14} />
                Добавить товар
              </button>
              {showSearch && (
                <div className="absolute top-full left-0 right-0 mt-1 z-50 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl">
                  <div className="p-3 border-b border-[var(--c-border)]">
                    <input
                      autoFocus
                      type="text"
                      value={searchQ}
                      onChange={(e) => setSearchQ(e.target.value)}
                      placeholder="Поиск..."
                      className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                    />
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    {filteredProducts.map((p) => (
                      <button
                        key={p.id}
                        onClick={() => addLine(p)}
                        className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--c-bg3)] transition"
                      >
                        <p className="text-sm text-[var(--c-text)]">{p.name}</p>
                        <span className="ml-auto text-xs text-[var(--c-text3)]">{p.sku}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {lines.map((line, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3 mb-2">
                <div className="flex-1">
                  <p className="text-sm font-medium text-[var(--c-text)]">{line.productName}</p>
                  <p className="text-xs text-[var(--c-text3)]">{line.sku}</p>
                </div>
                <input
                  type="number"
                  min={1}
                  value={line.qty}
                  onChange={(e) => setLines((prev) => prev.map((l, j) => j === i ? { ...l, qty: parseInt(e.target.value) || 1 } : l))}
                  className="w-20 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 py-1.5 text-right text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none tabular"
                />
                <span className="text-xs text-[var(--c-text3)]">шт</span>
                <button onClick={() => setLines((prev) => prev.filter((_, j) => j !== i))} className="text-[var(--c-text3)] hover:text-[var(--c-red)] transition">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}
          </div>

          {/* Note */}
          <div>
            <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Примечание</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none resize-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-4">
          <button onClick={onClose} className="h-10 rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!isValid || saved}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
              isValid && !saved ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:bg-[#25e890]" : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
            )}
          >
            {saved ? <><Check size={14} /> Создано</> : "Создать перемещение"}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}
