"use client";

import { useState, useMemo } from "react";
import {
  Plus,
  X,
  Search,
  Package,
  Check,
  ChevronRight,
  RotateCcw,
  Trash2,
  AlertTriangle,
  Clock,
} from "lucide-react";
import {
  type ProductReturn, type ReturnStatus, type ReturnReason, type ReturnItem,
  type SalesChannel,
} from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { cn, formatRub } from "@/lib/utils";


const STATUS_LABELS: Record<ReturnStatus, string> = {
  pending: "Ожидает",
  inspected: "Проверен",
  restocked: "Принят",
  written_off: "Списан",
  refunded: "Возврат денег",
};

const STATUS_COLORS: Record<ReturnStatus, string> = {
  pending: "text-[var(--c-amber)] bg-amber-500/10 border-amber-500/20",
  inspected: "text-[var(--c-blue)] bg-blue-500/10 border-blue-500/20",
  restocked: "text-[var(--c-green)] bg-green-500/10 border-green-500/20",
  written_off: "text-[var(--c-red)] bg-red-500/10 border-red-500/20",
  refunded: "text-purple-400 bg-purple-500/10 border-purple-500/20",
};

const REASON_LABELS: Record<ReturnReason, string> = {
  wrong_item: "Не тот товар",
  defective: "Брак",
  not_as_described: "Не соответствует",
  changed_mind: "Передумал",
  damaged_shipping: "Повреждён при доставке",
  other: "Другое",
};

const CHANNEL_COLORS: Record<string, string> = {
  wildberries: "text-purple-400 bg-purple-500/10 border-purple-500/20",
  ozon: "text-[var(--c-blue)] bg-blue-500/10 border-blue-500/20",
  website: "text-[var(--c-green)] bg-green-500/10 border-green-500/20",
  pos: "text-[var(--c-text2)] bg-[var(--c-bg3)] border-[var(--c-border)]",
  yandex: "text-amber-400 bg-amber-500/10 border-amber-500/20",
  telegram: "text-[var(--c-blue)] bg-blue-500/10 border-blue-500/20",
};

const CHANNEL_LABELS: Record<string, string> = {
  wildberries: "WB",
  ozon: "Ozon",
  website: "Сайт",
  pos: "POS",
  yandex: "ЯМ",
  telegram: "TG",
};

const CONDITION_COLORS: Record<string, string> = {
  new: "text-[var(--c-green)] bg-green-500/10 border-green-500/20",
  good: "text-[var(--c-blue)] bg-blue-500/10 border-blue-500/20",
  damaged: "text-[var(--c-amber)] bg-amber-500/10 border-amber-500/20",
  unsellable: "text-[var(--c-red)] bg-red-500/10 border-red-500/20",
};

const CONDITION_LABELS: Record<string, string> = {
  new: "Новый",
  good: "Хорошее",
  damaged: "Повреждён",
  unsellable: "Непригоден",
};

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function Badge({ className, children }: { className?: string; children: React.ReactNode }) {
  return (
    <span className={cn("inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium", className)}>
      {children}
    </span>
  );
}

interface NewReturnLine {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  condition: ReturnItem["condition"];
}

export function ReturnsPanel() {
  const { products, returns, actions } = useInventory();
  const [selectedReturn, setSelectedReturn] = useState<ProductReturn | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [statusFilter, setStatusFilter] = useState<ReturnStatus | "all">("all");
  const [channelFilter, setChannelFilter] = useState("all");
  const [search, setSearch] = useState("");

  const [formChannel, setFormChannel] = useState("wildberries");
  const [formOrderRef, setFormOrderRef] = useState("");
  const [formCustomer, setFormCustomer] = useState("");
  const [formReason, setFormReason] = useState<ReturnReason>("wrong_item");
  const [formNote, setFormNote] = useState("");
  const [formLines, setFormLines] = useState<NewReturnLine[]>([]);
  const [productSearch, setProductSearch] = useState("");
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [formSaved, setFormSaved] = useState(false);

  function resetForm() {
    setFormChannel("wildberries");
    setFormOrderRef("");
    setFormCustomer("");
    setFormReason("wrong_item");
    setFormNote("");
    setFormLines([]);
    setProductSearch("");
    setShowProductSearch(false);
    setFormSaved(false);
  }

  const pendingCount = returns.filter((r) => r.status === "pending").length;
  const inspectedCount = returns.filter((r) => r.status === "inspected").length;
  const restockedCount = returns.filter((r) => r.status === "restocked").length;
  const writtenOffCount = returns.filter((r) => r.status === "written_off").length;
  const totalReturnValue = returns.reduce((s, r) => s + r.totalValue, 0);

  const processedReturns = returns.filter((r) => r.processedAt && r.createdAt);
  const avgDays = processedReturns.length > 0
    ? Math.round(
        processedReturns.reduce((s, r) => {
          const diff = new Date(r.processedAt!).getTime() - new Date(r.createdAt).getTime();
          return s + diff / 86400000;
        }, 0) / processedReturns.length
      )
    : 0;

  const filtered = useMemo(() => {
    let list = [...returns];
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    if (channelFilter !== "all") list = list.filter((r) => r.channel === channelFilter);
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(
        (r) =>
          r.id.toLowerCase().includes(q) ||
          r.customerName.toLowerCase().includes(q) ||
          r.orderRef.toLowerCase().includes(q),
      );
    }
    return list.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }, [returns, statusFilter, channelFilter, search]);

  const filteredProducts = useMemo(() => {
    const q = productSearch.toLowerCase();
    return products.filter(
      (p) => p.status === "active" && (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q)),
    ).slice(0, 8);
  }, [productSearch, products]);

  function addProductLine(p: (typeof products)[0]) {
    if (formLines.find((l) => l.productId === p.id)) return;
    setFormLines((prev) => [...prev, { productId: p.id, productName: p.name, sku: p.sku, qty: 1, condition: "good" }]);
    setShowProductSearch(false);
    setProductSearch("");
  }

  function handleFormSubmit(e: React.FormEvent) {
    e.preventDefault();
    const id = `RET-${Date.now()}`;
    const now = new Date().toISOString().slice(0, 10);
    const returnRecord: ProductReturn = {
      id,
      status: "pending",
      channel: formChannel as SalesChannel | "manual",
      orderRef: formOrderRef,
      customerName: formCustomer,
      reason: formReason as ReturnReason,
      items: formLines.map((l) => ({ ...l, action: "restock" as const })),
      totalValue: formLines.reduce((s, l) => {
        const p = products.find((p) => p.id === l.productId);
        return s + (p?.price ?? 0) * l.qty;
      }, 0),
      createdAt: now,
      locationId: "loc-returns",
      note: formNote || undefined,
    };
    actions.createReturn(returnRecord);
    setFormSaved(true);
    setTimeout(() => {
      setShowForm(false);
      resetForm();
    }, 700);
  }

  const channels = Array.from(new Set(returns.map((r) => r.channel)));

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <p className="text-xs text-[var(--c-text3)]">
          Сумма возвратов: {formatRub(totalReturnValue)} · Среднее время обработки: {avgDays} дн.
        </p>
        <button
          onClick={() => setShowForm(true)}
          className="flex h-9 shrink-0 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
        >
          <Plus size={15} />
          Создать возврат
        </button>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: "Ожидает", value: pendingCount, color: "text-[var(--c-amber)]", dotColor: "bg-[var(--c-amber)]" },
          { label: "Проверен", value: inspectedCount, color: "text-[var(--c-blue)]", dotColor: "bg-[var(--c-blue)]" },
          { label: "Принят", value: restockedCount, color: "text-[var(--c-green)]", dotColor: "bg-[var(--c-green)]" },
          { label: "Списан", value: writtenOffCount, color: "text-[var(--c-red)]", dotColor: "bg-[var(--c-red)]" },
        ].map((s) => (
          <div key={s.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <div className="flex items-center gap-1.5 mb-1.5">
              <span className={cn("h-2 w-2 rounded-full", s.dotColor)} />
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
            placeholder="Поиск по ID, клиенту, заказу..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] pl-9 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as ReturnStatus | "all")}
          className="h-9 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все статусы</option>
          {(Object.keys(STATUS_LABELS) as ReturnStatus[]).map((s) => (
            <option key={s} value={s}>{STATUS_LABELS[s]}</option>
          ))}
        </select>
        <select
          value={channelFilter}
          onChange={(e) => setChannelFilter(e.target.value)}
          className="h-9 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
        >
          <option value="all">Все каналы</option>
          {channels.map((c) => (
            <option key={c} value={c}>{CHANNEL_LABELS[c] ?? c}</option>
          ))}
        </select>
      </div>

      <div className="overflow-x-auto rounded-xl border border-[var(--c-border)]">
        <table className="w-full min-w-[860px] text-sm">
          <thead>
            <tr className="border-b border-[var(--c-border)] bg-[var(--c-bg3)]">
              {["ID", "Клиент", "Канал", "Заказ", "Позиции", "Сумма", "Причина", "Статус", "Дата", ""].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-xs font-medium text-[var(--c-text2)] whitespace-nowrap">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--c-border)]">
            {filtered.length === 0 && (
              <tr>
                <td colSpan={9} className="px-4 py-10 text-center text-sm text-[var(--c-text3)]">
                  Возвраты не найдены
                </td>
              </tr>
            )}
            {filtered.map((ret) => (
              <tr
                key={ret.id}
                onClick={() => setSelectedReturn(ret)}
                className="cursor-pointer bg-[var(--c-bg2)] hover:bg-[var(--c-bg3)] transition"
              >
                <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--c-text)]">{ret.id}</td>
                <td className="px-4 py-3 text-xs text-[var(--c-text)]">{ret.customerName}</td>
                <td className="px-4 py-3">
                  <Badge className={CHANNEL_COLORS[ret.channel] ?? "text-[var(--c-text2)] bg-[var(--c-bg3)] border-[var(--c-border)]"}>
                    {CHANNEL_LABELS[ret.channel] ?? ret.channel}
                  </Badge>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--c-text3)]">{ret.orderRef}</td>
                <td className="px-4 py-3 text-xs tabular text-[var(--c-text)]">{ret.items.length}</td>
                <td className="px-4 py-3 text-xs tabular font-semibold text-[var(--c-text)]">{formatRub(ret.totalValue)}</td>
                <td className="px-4 py-3">
                  <span className="text-xs text-[var(--c-text2)]">{REASON_LABELS[ret.reason]}</span>
                </td>
                <td className="px-4 py-3">
                  <Badge className={STATUS_COLORS[ret.status]}>{STATUS_LABELS[ret.status]}</Badge>
                </td>
                <td className="px-4 py-3 text-xs text-[var(--c-text3)] whitespace-nowrap">{formatDate(ret.createdAt)}</td>
                <td className="px-4 py-3">
                  <ChevronRight size={14} className="text-[var(--c-text3)]" />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {selectedReturn && (
        <ReturnDetailPanel ret={selectedReturn} onClose={() => setSelectedReturn(null)} />
      )}

      {showForm && (
        <div className="fixed inset-0 z-50 flex">
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => { setShowForm(false); resetForm(); }} />
          <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[var(--c-bg)] shadow-2xl">
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Создать возврат</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleFormSubmit} className="flex flex-1 flex-col overflow-y-auto">
              <div className="flex-1 space-y-5 p-6">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Канал</label>
                    <select
                      value={formChannel}
                      onChange={(e) => setFormChannel(e.target.value)}
                      className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                    >
                      {Object.entries(CHANNEL_LABELS).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Номер заказа</label>
                    <input
                      type="text"
                      value={formOrderRef}
                      onChange={(e) => setFormOrderRef(e.target.value)}
                      placeholder="WB-12345"
                      className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Имя покупателя</label>
                  <input
                    type="text"
                    value={formCustomer}
                    onChange={(e) => setFormCustomer(e.target.value)}
                    placeholder="Иван Иванов"
                    className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Причина возврата</label>
                  <select
                    value={formReason}
                    onChange={(e) => setFormReason(e.target.value as ReturnReason)}
                    className="h-9 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                  >
                    {(Object.keys(REASON_LABELS) as ReturnReason[]).map((r) => (
                      <option key={r} value={r}>{REASON_LABELS[r]}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Товары</label>
                  <div className="relative mb-2">
                    <button
                      type="button"
                      onClick={() => setShowProductSearch(!showProductSearch)}
                      className="flex w-full items-center gap-2 rounded-xl border border-dashed border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-2.5 text-sm text-[var(--c-text2)] hover:border-[var(--c-green)] transition"
                    >
                      <Plus size={14} />
                      Добавить товар
                    </button>
                    {showProductSearch && (
                      <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl">
                        <div className="border-b border-[var(--c-border)] p-3">
                          <input
                            autoFocus
                            type="text"
                            value={productSearch}
                            onChange={(e) => setProductSearch(e.target.value)}
                            placeholder="Поиск..."
                            className="h-8 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                          />
                        </div>
                        <div className="max-h-44 overflow-y-auto p-1">
                          {filteredProducts.map((p) => (
                            <button
                              type="button"
                              key={p.id}
                              onClick={() => addProductLine(p)}
                              className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-left hover:bg-[var(--c-bg3)] transition"
                            >
                              <span className="text-sm text-[var(--c-text)]">{p.name}</span>
                              <span className="ml-2 shrink-0 text-xs text-[var(--c-text3)]">{p.sku}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="space-y-2">
                    {formLines.map((line, i) => (
                      <div key={i} className="flex items-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-3">
                        <div className="flex-1 min-w-0">
                          <p className="truncate text-xs font-medium text-[var(--c-text)]">{line.productName}</p>
                          <p className="text-[10px] text-[var(--c-text3)]">{line.sku}</p>
                        </div>
                        <input
                          type="number"
                          min={1}
                          value={line.qty}
                          onChange={(e) =>
                            setFormLines((prev) =>
                              prev.map((l, j) => (j === i ? { ...l, qty: parseInt(e.target.value) || 1 } : l)),
                            )
                          }
                          className="w-14 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-2 py-1 text-right text-xs text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                        />
                        <select
                          value={line.condition}
                          onChange={(e) =>
                            setFormLines((prev) =>
                              prev.map((l, j) =>
                                j === i ? { ...l, condition: e.target.value as ReturnItem["condition"] } : l,
                              ),
                            )
                          }
                          className="h-7 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-2 text-xs text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                        >
                          {Object.entries(CONDITION_LABELS).map(([k, v]) => (
                            <option key={k} value={k}>{v}</option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setFormLines((prev) => prev.filter((_, j) => j !== i))}
                          className="text-[var(--c-text3)] hover:text-[var(--c-red)] transition"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">Примечание</label>
                  <textarea
                    value={formNote}
                    onChange={(e) => setFormNote(e.target.value)}
                    rows={2}
                    placeholder="Дополнительная информация..."
                    className="w-full resize-none rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                  />
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
                  disabled={formSaved}
                  className={cn(
                    "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
                    formSaved
                      ? "bg-[var(--c-green)]/70 text-[var(--c-bg)] cursor-not-allowed"
                      : "bg-[var(--c-green)] text-[var(--c-bg)] hover:bg-[#25e890]",
                  )}
                >
                  {formSaved ? <><Check size={14} /> Создан</> : "Создать возврат"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function ReturnDetailPanel({ ret, onClose }: { ret: ProductReturn; onClose: () => void }) {
  const { locations, actions } = useInventory();
  const [itemActions, setItemActions] = useState<Record<string, ReturnItem["action"]>>(
    Object.fromEntries(ret.items.map((item, i) => [i, item.action])),
  );
  const [processed, setProcessed] = useState(false);

  function handleProcess() {
    ret.items.forEach((item, i) => {
      const action = itemActions[i] ?? item.action;
      if (action === "restock") {
        actions.adjustStock(item.productId, ret.locationId, item.qty, "return", "Возврат — оприходование");
      } else if (action === "write_off") {
        actions.adjustStock(item.productId, ret.locationId, -item.qty, "write_off", "Возврат — списание");
      }
    });
    actions.updateReturnStatus(ret.id, "restocked");
    setProcessed(true);
    setTimeout(() => { setProcessed(false); onClose(); }, 700);
  }

  const locationName = locations.find((l) => l.id === ret.locationId)?.name ?? ret.locationId;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--c-text)]">{ret.id}</h2>
              <Badge className={STATUS_COLORS[ret.status]}>{STATUS_LABELS[ret.status]}</Badge>
            </div>
            <p className="mt-0.5 text-xs text-[var(--c-text3)]">{ret.customerName} · {ret.orderRef}</p>
          </div>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
            <X size={16} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div className="grid grid-cols-2 gap-3">
            {[
              { label: "Канал", value: <Badge className={CHANNEL_COLORS[ret.channel] ?? "text-[var(--c-text2)] bg-[var(--c-bg3)] border-[var(--c-border)]"}>{CHANNEL_LABELS[ret.channel] ?? ret.channel}</Badge> },
              { label: "Причина", value: <span className="text-xs text-[var(--c-text)]">{REASON_LABELS[ret.reason]}</span> },
              { label: "Локация", value: <span className="text-xs text-[var(--c-text)]">{locationName}</span> },
              { label: "Сумма", value: <span className="text-xs font-semibold text-[var(--c-text)]">{formatRub(ret.totalValue)}</span> },
            ].map((row) => (
              <div key={row.label} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-3">
                <p className="mb-1 text-xs text-[var(--c-text3)]">{row.label}</p>
                {row.value}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-4 text-xs text-[var(--c-text3)]">
            <span className="flex items-center gap-1"><Clock size={11} /> Создан: {formatDate(ret.createdAt)}</span>
            {ret.processedAt && <span className="flex items-center gap-1"><Check size={11} className="text-[var(--c-green)]" /> Обработан: {formatDate(ret.processedAt)}</span>}
          </div>

          {ret.note && (
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
              <p className="mb-1 text-xs font-medium text-[var(--c-text2)]">Примечание</p>
              <p className="text-sm text-[var(--c-text)]">{ret.note}</p>
            </div>
          )}

          <div>
            <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-text2)]">Товары в возврате</h3>
            <div className="space-y-3">
              {ret.items.map((item, i) => (
                <div key={i} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div>
                      <p className="text-sm font-medium text-[var(--c-text)]">{item.productName}</p>
                      <p className="text-xs text-[var(--c-text3)]">{item.sku} · {item.qty} шт.</p>
                    </div>
                    <Badge className={CONDITION_COLORS[item.condition]}>
                      {CONDITION_LABELS[item.condition]}
                    </Badge>
                  </div>
                  <div className="flex gap-2">
                    {(["restock", "write_off", "quarantine"] as ReturnItem["action"][]).map((action) => {
                      const labels: Record<ReturnItem["action"], string> = {
                        restock: "Принять на склад",
                        write_off: "Списать",
                        quarantine: "Карантин",
                      };
                      const colors: Record<ReturnItem["action"], string> = {
                        restock: "border-[var(--c-green)] text-[var(--c-green)] bg-green-500/10",
                        write_off: "border-[var(--c-red)] text-[var(--c-red)] bg-red-500/10",
                        quarantine: "border-[var(--c-amber)] text-[var(--c-amber)] bg-amber-500/10",
                      };
                      const active = itemActions[i] === action;
                      return (
                        <button
                          key={action}
                          onClick={() => setItemActions((prev) => ({ ...prev, [i]: action }))}
                          className={cn(
                            "flex-1 rounded-lg border py-1.5 text-xs font-medium transition",
                            active
                              ? colors[action]
                              : "border-[var(--c-border)] text-[var(--c-text3)] hover:text-[var(--c-text2)]",
                          )}
                        >
                          {labels[action]}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {ret.status !== "restocked" && ret.status !== "written_off" && ret.status !== "refunded" && (
          <div className="border-t border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
            <button
              onClick={handleProcess}
              disabled={processed}
              className={cn(
                "flex w-full h-10 items-center justify-center gap-2 rounded-lg text-sm font-semibold transition",
                processed
                  ? "bg-[var(--c-green)]/70 text-[var(--c-bg)] cursor-not-allowed"
                  : "bg-[var(--c-green)] text-[var(--c-bg)] hover:bg-[#25e890]",
              )}
            >
              {processed ? <><Check size={14} /> Обработано</> : <><RotateCcw size={14} /> Обработать возврат</>}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
