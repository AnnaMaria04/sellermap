"use client";

import { useRef, useState } from "react";
import { X, UploadCloud, FileText, Check } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";

const SAMPLE = "name,email,phone,city\nИван Иванов,ivan@mail.ru,+7 900 000-00-00,Москва\n";

/** Imports customers from a CSV (columns: name,email,phone,city). */
export function CustomerImportModal({ onClose }: { onClose: () => void }) {
  const { actions } = useInventory();
  const [file, setFile] = useState<File | null>(null);
  const [dragging, setDragging] = useState(false);
  const [done, setDone] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  function parse(text: string): number {
    const rows = text.split(/\r?\n/).map((r) => r.trim()).filter(Boolean);
    if (rows.length === 0) return 0;
    const start = /name|имя|email/i.test(rows[0]) ? 1 : 0;
    let n = 0;
    for (let i = start; i < rows.length; i++) {
      const [name, email, phone, city] = rows[i].split(",").map((c) => c.trim());
      if (!name) continue;
      actions.createCustomer({
        name, email: email || undefined, phone: phone || undefined, city: city || undefined,
        tier: "new", loyaltyPoints: 0, totalOrders: 0, totalSpent: 0, tags: [],
      });
      n++;
    }
    return n;
  }

  async function doImport() {
    if (!file) return;
    const text = await file.text();
    setDone(parse(text));
  }

  function downloadSample() {
    const url = URL.createObjectURL(new Blob([SAMPLE], { type: "text/csv" }));
    const a = document.createElement("a");
    a.href = url; a.download = "customers_template.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
          <h3 className="text-base font-semibold text-[var(--c-text)]">Импорт клиентов из CSV</h3>
          <button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button>
        </div>

        <div className="p-4">
          {done !== null ? (
            <div className="flex flex-col items-center gap-2 py-8 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--c-green-dim)] text-[var(--c-green)]"><Check className="h-6 w-6" /></span>
              <p className="text-sm text-[var(--c-text)]">Импортировано клиентов: <b>{done}</b></p>
            </div>
          ) : (
            <>
              <div
                onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                onDragLeave={() => setDragging(false)}
                onDrop={(e) => { e.preventDefault(); setDragging(false); const f = e.dataTransfer.files?.[0]; if (f) setFile(f); }}
                onClick={() => inputRef.current?.click()}
                className={cn("flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed px-4 py-10 text-center transition", dragging ? "border-[var(--c-blue)] bg-[var(--c-blue)]/5" : "border-[var(--c-border2)] hover:bg-[var(--c-bg)]")}
              >
                {file ? <FileText className="h-7 w-7 text-[var(--c-text2)]" /> : <UploadCloud className="h-7 w-7 text-[var(--c-text3)]" />}
                <span className="text-sm font-medium text-[var(--c-text)]">{file ? file.name : "Добавить файл"}</span>
                <span className="text-xs text-[var(--c-text3)]">Принимается .csv</span>
                <input ref={inputRef} type="file" accept=".csv" className="hidden" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
              </div>
              <button onClick={downloadSample} className="mt-2 text-sm text-[var(--c-blue)] hover:underline">Скачать пример CSV</button>
            </>
          )}
        </div>

        <div className="flex justify-end gap-2 border-t border-[var(--c-border)] px-4 py-3">
          <button onClick={onClose} className="rounded-lg border border-[var(--c-border2)] px-4 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">{done !== null ? "Закрыть" : "Отмена"}</button>
          {done === null && (
            <button onClick={doImport} disabled={!file} className="rounded-lg bg-[var(--c-text)] px-4 py-1.5 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90 disabled:opacity-50">Импортировать</button>
          )}
        </div>
      </div>
    </div>
  );
}
