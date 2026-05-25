"use client";

import { useState, useMemo } from "react";
import {
  X,
  Plus,
  Trash2,
  Search,
  Check,
  Camera,
  AlertTriangle,
  Package,
  ChevronRight,
  FileText,
} from "lucide-react";
import { PRODUCTS, LOCATIONS, type Product } from "@/mock/inventory";
import { cn } from "@/lib/utils";

type WriteOffReason =
  | "damaged"
  | "expired"
  | "theft"
  | "loss"
  | "defect"
  | "return_disposal"
  | "other";

interface WriteOffLine {
  productId: string;
  productName: string;
  sku: string;
  qty: number;
  reason: WriteOffReason;
  note?: string;
  photo?: string;
}

interface CompletedWriteOff {
  id: string;
  locationId: string;
  lines: WriteOffLine[];
  totalQty: number;
  createdAt: string;
  createdBy: string;
}

const REASON_LABELS: Record<WriteOffReason, string> = {
  damaged:          "Повреждение",
  expired:          "Срок годности",
  theft:            "Кража/недостача",
  loss:             "Потеря",
  defect:           "Производственный брак",
  return_disposal:  "Утилизация возврата",
  other:            "Прочее",
};

const COMPLETED_WRITEOFFS: CompletedWriteOff[] = [
  {
    id: "wo-001",
    locationId: "loc-warehouse",
    lines: [
      { productId: "prod-004", productName: "Крафт-пакет с ручками", sku: "PKG-KRAFT-001", qty: 52, reason: "damaged", note: "Намокли при доставке" },
    ],
    totalQty: 52,
    createdAt: "2026-05-15",
    createdBy: "Мария Иванова",
  },
  {
    id: "wo-002",
    locationId: "loc-store",
    lines: [
      { productId: "prod-002", productName: "Футболка оверсайз", sku: "TSH-002", qty: 2, reason: "damaged", note: "Порвались при примерке" },
      { productId: "prod-001", productName: "Органайзер для путешествий", sku: "ORG-001", qty: 1, reason: "theft" },
    ],
    totalQty: 3,
    createdAt: "2026-05-08",
    createdBy: "Пётр Сидоров",
  },
];

export function WriteOffPanel() {
  const [showForm, setShowForm] = useState(false);
  const [history] = useState<CompletedWriteOff[]>(COMPLETED_WRITEOFFS);

  const totalLost = history.reduce((s, wo) => s + wo.totalQty, 0);

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Списаний</p>
          <p className="text-2xl font-bold text-[var(--c-text)]">{history.length}</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Единиц списано</p>
          <p className="text-2xl font-bold text-[var(--c-red)]">{totalLost}</p>
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <p className="text-xs text-[var(--c-text2)] mb-1.5">Сумма потерь</p>
          <p className="text-2xl font-bold text-[var(--c-red)]">
            ~{(history.flatMap((wo) => wo.lines).reduce((s, l) => {
              const p = PRODUCTS.find((p) => p.id === l.productId);
              return s + l.qty * (p?.costPrice ?? 0);
            }, 0)).toLocaleString("ru-RU")} ₽
          </p>
        </div>
      </div>

      <div className="flex items-center justify-between">
        <h2 className="text-base font-semibold text-[var(--c-text)]">История списаний</h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
        >
          <Plus size={15} />
          Создать списание
        </button>
      </div>

      <div className="space-y-3">
        {history.map((wo) => (
          <WriteOffCard key={wo.id} writeOff={wo} />
        ))}
      </div>

      {showForm && <WriteOffForm onClose={() => setShowForm(false)} />}
    </div>
  );
}

function WriteOffCard({ writeOff }: { writeOff: CompletedWriteOff }) {
  const [expanded, setExpanded] = useState(false);
  const locationName = LOCATIONS.find((l) => l.id === writeOff.locationId)?.name ?? writeOff.locationId;

  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-4 px-5 py-4 text-left hover:bg-[var(--c-bg3)] transition"
      >
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[var(--c-red-dim)] border border-[rgba(240,80,80,0.2)]">
          <Trash2 size={16} className="text-[var(--c-red)]" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-[var(--c-text)]">{writeOff.id.toUpperCase()}</p>
          <p className="text-xs text-[var(--c-text3)]">{locationName} · {formatDate(writeOff.createdAt)} · {writeOff.createdBy}</p>
        </div>
        <div className="text-right shrink-0">
          <p className="text-sm font-bold text-[var(--c-red)] tabular">−{writeOff.totalQty} шт</p>
          <p className="text-xs text-[var(--c-text3)]">{writeOff.lines.length} позиций</p>
        </div>
        <ChevronRight size={16} className={cn("text-[var(--c-text3)] transition", expanded && "rotate-90")} />
      </button>

      {expanded && (
        <div className="border-t border-[var(--c-border)] p-4 space-y-2">
          {writeOff.lines.map((line, i) => (
            <div key={i} className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3">
              <Package size={14} className="text-[var(--c-text3)] shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[var(--c-text)] truncate">{line.productName}</p>
                <p className="text-xs text-[var(--c-text3)]">{line.sku}</p>
                <p className="text-xs text-[var(--c-text2)] mt-0.5">{REASON_LABELS[line.reason]}</p>
                {line.note && <p className="text-xs text-[var(--c-text3)] italic mt-0.5">{line.note}</p>}
              </div>
              <p className="text-sm font-bold text-[var(--c-red)] tabular shrink-0">−{line.qty}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function WriteOffForm({ onClose }: { onClose: () => void }) {
  const [locationId, setLocationId] = useState(LOCATIONS.find((l) => l.isDefault)?.id ?? "");
  const [lines, setLines] = useState<WriteOffLine[]>([]);
  const [note, setNote] = useState("");
  const [searchQ, setSearchQ] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [saved, setSaved] = useState(false);

  const filteredProducts = useMemo(() => {
    const q = searchQ.toLowerCase();
    return PRODUCTS.filter((p) =>
      p.status === "active" &&
      (p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q))
    ).slice(0, 8);
  }, [searchQ]);

  function addLine(p: Product) {
    if (lines.find((l) => l.productId === p.id)) return;
    setLines((prev) => [...prev, {
      productId: p.id,
      productName: p.name,
      sku: p.sku,
      qty: 1,
      reason: "damaged",
    }]);
    setShowSearch(false);
    setSearchQ("");
  }

  function updateLine(idx: number, updates: Partial<WriteOffLine>) {
    setLines((prev) => prev.map((l, i) => i === idx ? { ...l, ...updates } : l));
  }

  function removeLine(idx: number) {
    setLines((prev) => prev.filter((_, i) => i !== idx));
  }

  function handleSave() {
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  }

  const isValid = locationId && lines.length > 0;

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div>
            <h2 className="text-lg font-semibold text-[var(--c-text)]">Создать списание</h2>
            <p className="text-xs text-[var(--c-text2)]">Спишите бракованный, просроченный или утраченный товар</p>
          </div>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Warning */}
          <div className="flex items-start gap-3 rounded-xl border border-[rgba(240,80,80,0.2)] bg-[var(--c-red-dim)] p-4">
            <AlertTriangle size={16} className="text-[var(--c-red)] shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-[var(--c-red)]">Необратимая операция</p>
              <p className="text-xs text-[var(--c-red)] opacity-80 mt-0.5">После подтверждения остатки будут скорректированы и движение будет записано в историю</p>
            </div>
          </div>

          {/* Location */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Локация списания</label>
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
            >
              {LOCATIONS.filter((l) => !["in_transit"].includes(l.type)).map((l) => (
                <option key={l.id} value={l.id}>{l.name}</option>
              ))}
            </select>
          </div>

          {/* Lines */}
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Товары для списания</h3>

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
                    <div className="relative">
                      <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
                      <input
                        autoFocus
                        type="text"
                        value={searchQ}
                        onChange={(e) => setSearchQ(e.target.value)}
                        placeholder="Поиск товара..."
                        className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-8 pr-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                      />
                    </div>
                  </div>
                  <div className="max-h-48 overflow-y-auto p-1">
                    {filteredProducts.map((p) => (
                      <button key={p.id} onClick={() => addLine(p)} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition">
                        <p className="flex-1 text-left">{p.name}</p>
                        <span className="text-xs text-[var(--c-text3)]">{p.sku}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="space-y-3">
              {lines.map((line, i) => (
                <div key={i} className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-[var(--c-text)]">{line.productName}</p>
                      <p className="text-xs text-[var(--c-text3)]">{line.sku}</p>
                    </div>
                    <button onClick={() => removeLine(i)} className="text-[var(--c-text3)] hover:text-[var(--c-red)] transition">
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="mb-1 block text-xs text-[var(--c-text2)]">Количество</label>
                      <input
                        type="number"
                        min={1}
                        value={line.qty}
                        onChange={(e) => updateLine(i, { qty: parseInt(e.target.value) || 1 })}
                        className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none tabular text-right"
                      />
                    </div>
                    <div>
                      <label className="mb-1 block text-xs text-[var(--c-text2)]">Причина</label>
                      <select
                        value={line.reason}
                        onChange={(e) => updateLine(i, { reason: e.target.value as WriteOffReason })}
                        className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 text-xs text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                      >
                        {Object.entries(REASON_LABELS).map(([v, l]) => (
                          <option key={v} value={v}>{l}</option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="mb-1 block text-xs text-[var(--c-text2)]">Примечание</label>
                    <input
                      type="text"
                      value={line.note ?? ""}
                      onChange={(e) => updateLine(i, { note: e.target.value })}
                      placeholder="Уточните причину..."
                      className="h-8 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                    />
                  </div>

                  <button className="flex items-center gap-2 text-xs text-[var(--c-text3)] hover:text-[var(--c-text)] transition">
                    <Camera size={12} />
                    Прикрепить фото
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* General note */}
          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Общее примечание</label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={2}
              placeholder="Обстоятельства, документы, ответственный..."
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
              isValid && !saved
                ? "bg-[var(--c-red)] text-white hover:opacity-90"
                : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
            )}
          >
            {saved ? <><Check size={14} /> Списано</> : <><Trash2 size={14} /> Подтвердить списание</>}
          </button>
        </div>
      </div>
    </div>
  );
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" });
}
