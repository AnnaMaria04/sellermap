"use client";

import { useMemo, useState } from "react";
import { X, Check, ClipboardPaste, AlertTriangle } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { formatRub } from "@/lib/utils";

/** Bulk-edit product cost (себестоимость). Cost can't come from marketplaces,
 *  so this is how margin gets real. Spreadsheet-style table: edit a buy price
 *  per product, Enter jumps to the next row, one bulk save. Supports paste of
 *  "SKU,cost" lines. Defaults to showing only products that still need a cost. */
export function BulkCostEditor({ onClose }: { onClose?: () => void }) {
  const { products, actions } = useInventory();
  const active = useMemo(() => products.filter((p) => p.status !== "archived"), [products]);
  const missingCount = useMemo(() => active.filter((p) => (p.costPrice ?? 0) <= 0).length, [active]);

  // productId -> new cost override
  const [costs, setCosts] = useState<Map<string, number>>(new Map());
  const [search, setSearch] = useState("");
  const [onlyMissing, setOnlyMissing] = useState(missingCount > 0);
  const [showPaste, setShowPaste] = useState(false);
  const [pasteText, setPasteText] = useState("");

  const costFor = (id: string, fallback: number) => costs.get(id) ?? fallback;
  // A product counts as "filled" once it has a positive cost (saved or pending).
  const isFilled = (id: string, saved: number) => costFor(id, saved) > 0;
  const filledCount = useMemo(() => active.filter((p) => isFilled(p.id, p.costPrice)).length, [active, costs]);

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return active
      .filter((p) => !q || p.name.toLowerCase().includes(q) || p.sku.toLowerCase().includes(q) || (p.barcode ?? "").includes(q))
      .filter((p) => !onlyMissing || !isFilled(p.id, p.costPrice))
      // Missing cost first so the post-sync task is front and center.
      .sort((a, b) => Number(isFilled(a.id, a.costPrice)) - Number(isFilled(b.id, b.costPrice)));
  }, [active, search, onlyMissing, costs]);

  function setCost(id: string, value: number) {
    setCosts((prev) => {
      const next = new Map(prev);
      next.set(id, value);
      return next;
    });
  }

  const changed = useMemo(
    () => active.filter((p) => costs.has(p.id) && costs.get(p.id) !== p.costPrice),
    [active, costs],
  );

  /** Enter advances focus to the next cost input (spreadsheet feel). */
  function onInputKeyDown(e: React.KeyboardEvent<HTMLInputElement>, index: number) {
    if (e.key !== "Enter") return;
    e.preventDefault();
    const next = document.querySelector<HTMLInputElement>(`input[data-cost-row="${index + 1}"]`);
    if (next) { next.focus(); next.select(); }
  }

  /** Parse "SKU,cost" / "barcode;cost" / "SKU<tab>cost" lines and match by SKU or barcode. */
  function applyPaste() {
    const next = new Map(costs);
    let matched = 0;
    for (const line of pasteText.split(/\r?\n/)) {
      const parts = line.split(/[,;\t]/).map((s) => s.trim());
      if (parts.length < 2) continue;
      const key = parts[0].toLowerCase();
      const cost = parseFloat(parts[1].replace(",", "."));
      if (!key || Number.isNaN(cost)) continue;
      const p = active.find((x) => x.sku.toLowerCase() === key || (x.barcode ?? "").toLowerCase() === key);
      if (p) { next.set(p.id, cost); matched++; }
    }
    setCosts(next);
    setShowPaste(false);
    setPasteText("");
    if (matched === 0) alert("Не найдено совпадений по SKU/штрихкоду");
  }

  function save() {
    const updates: Record<string, { costPrice: number }> = {};
    for (const p of changed) updates[p.id] = { costPrice: costs.get(p.id)! };
    if (Object.keys(updates).length > 0) actions.updatePrices(updates);
    onClose?.();
  }

  return (
    <div className="flex h-full flex-col bg-[var(--c-bg)]">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 border-b border-[var(--c-border)] px-4 py-4 sm:px-6">
        <div className="min-w-0">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Заполнить себестоимость</h2>
          <p className="mt-0.5 text-sm text-[var(--c-text2)]">
            Маркетплейсы не передают закупочную цену — задайте её здесь, и P&amp;L, маржа и юнит-экономика станут реальными.
          </p>
        </div>
        <button onClick={onClose} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)] transition">
          <X size={18} />
        </button>
      </div>

      {/* Progress */}
      <div className="border-b border-[var(--c-border)] px-4 py-3 sm:px-6">
        <div className="flex items-center justify-between text-sm">
          <span className="text-[var(--c-text2)]">Заполнено {filledCount} из {active.length}</span>
          {missingCount > 0 && (
            <span className="flex items-center gap-1.5 text-[var(--c-amber)]">
              <AlertTriangle size={13} /> осталось {active.length - filledCount}
            </span>
          )}
        </div>
        <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-[var(--c-bg3)]">
          <div
            className="h-full rounded-full bg-[var(--c-green)] transition-all"
            style={{ width: `${active.length > 0 ? (filledCount / active.length) * 100 : 0}%` }}
          />
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border-b border-[var(--c-border)] px-4 py-3 sm:px-6">
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Поиск по названию, SKU, штрихкоду"
          className="h-9 min-w-[200px] flex-1 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)]"
        />
        <button
          onClick={() => setOnlyMissing((v) => !v)}
          className={`flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium transition ${
            onlyMissing
              ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
              : "border-[var(--c-border2)] text-[var(--c-text2)] hover:text-[var(--c-text)]"
          }`}
        >
          Только без себестоимости
        </button>
        <button
          onClick={() => setShowPaste((v) => !v)}
          className="flex h-9 items-center gap-1.5 rounded-lg border border-[var(--c-border2)] px-3 text-sm font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
        >
          <ClipboardPaste size={15} /> Вставить список
        </button>
      </div>

      {showPaste && (
        <div className="border-b border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3 sm:px-6">
          <p className="mb-2 text-xs text-[var(--c-text3)]">Вставьте строки вида <code>SKU,себестоимость</code> (или штрихкод). Разделитель: запятая, точка с запятой или табуляция.</p>
          <textarea
            value={pasteText}
            onChange={(e) => setPasteText(e.target.value)}
            rows={4}
            placeholder={"ORG-001, 540\nTSH-OV-002; 320"}
            className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] p-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-green)]"
          />
          <div className="mt-2 flex justify-end gap-2">
            <button onClick={() => { setShowPaste(false); setPasteText(""); }} className="rounded-lg px-3 py-1.5 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)]">Отмена</button>
            <button onClick={applyPaste} className="rounded-lg bg-[var(--c-green)] px-3 py-1.5 text-sm font-semibold text-[var(--c-bg)]">Применить</button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="min-h-0 flex-1 overflow-auto">
        {rows.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 py-16 text-center text-sm text-[var(--c-text3)]">
            <Check size={28} className="text-[var(--c-green)]" />
            {onlyMissing ? "У всех товаров указана себестоимость 🎉" : "Товары не найдены"}
          </div>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="sticky top-0 bg-[var(--c-bg2)]">
              <tr className="border-b border-[var(--c-border)] text-left text-xs text-[var(--c-text3)]">
                <th className="px-4 py-2 font-medium">Товар</th>
                <th className="px-4 py-2 text-right font-medium">Цена</th>
                <th className="px-4 py-2 text-right font-medium">Себестоимость</th>
                <th className="px-4 py-2 text-right font-medium">Маржа</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p, i) => {
                const cost = costFor(p.id, p.costPrice);
                const margin = p.price > 0 ? Math.round(((p.price - cost) / p.price) * 1000) / 10 : 0;
                const dirty = costs.has(p.id) && costs.get(p.id) !== p.costPrice;
                return (
                  <tr key={p.id} className="border-b border-[var(--c-border)] last:border-0">
                    <td className="px-4 py-2">
                      <div className="font-medium text-[var(--c-text)]">{p.name}</div>
                      <div className="text-xs text-[var(--c-text3)]">{p.sku}</div>
                    </td>
                    <td className="px-4 py-2 text-right tabular-nums text-[var(--c-text2)]">{formatRub(p.price)}</td>
                    <td className="px-4 py-2 text-right">
                      <input
                        type="number"
                        min={0}
                        data-cost-row={i}
                        value={costs.has(p.id) ? costs.get(p.id)! : p.costPrice || ""}
                        onChange={(e) => setCost(p.id, parseFloat(e.target.value) || 0)}
                        onKeyDown={(e) => onInputKeyDown(e, i)}
                        placeholder="0"
                        className={`h-8 w-24 rounded-lg border bg-[var(--c-bg3)] px-2 text-right text-sm tabular-nums text-[var(--c-text)] outline-none focus:border-[var(--c-green)] ${dirty ? "border-[var(--c-green)]" : "border-[var(--c-border2)]"}`}
                      />
                    </td>
                    <td className={`px-4 py-2 text-right tabular-nums font-medium ${margin >= 0 ? "text-[var(--c-green)]" : "text-[var(--c-red)]"}`}>
                      {p.price > 0 ? `${margin}%` : "—"}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-4 py-3 sm:px-6">
        <span className="text-sm text-[var(--c-text2)]">{changed.length} изменено</span>
        <button
          onClick={save}
          disabled={changed.length === 0}
          className="flex items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-semibold text-[var(--c-bg)] transition hover:opacity-90 disabled:opacity-50"
        >
          <Check size={16} /> Сохранить ({changed.length})
        </button>
      </div>
    </div>
  );
}
