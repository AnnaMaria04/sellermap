"use client";

import { useMemo, useRef, useState } from "react";
import { Boxes, Upload, Download, Copy, Check, RefreshCw, FileCode } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { useInventory } from "@/contexts/InventoryContext";
import { buildOrdersCommerceML, type OneCProduct } from "@/lib/integrations/onec/commerceml";
import type { Product } from "@/mock/inventory";
import { cn } from "@/lib/utils";

function toProduct(p: OneCProduct): Product {
  const today = new Date().toISOString().split("T")[0];
  return {
    id: `1c-${p.externalId}`,
    name: p.name,
    sku: p.sku || `1C-${p.externalId.slice(0, 8)}`,
    description: p.description,
    category: p.category || "Из 1С",
    productType: "product",
    status: "active",
    hasVariants: false,
    variants: [],
    price: p.price,
    costPrice: 0,
    channels: [],
    tags: ["1С"],
    requiresLabeling: false,
    stockByLocation: {},
    reservedUnits: 0,
    damagedUnits: 0,
    inTransitUnits: 0,
    totalPhysical: 0,
    createdAt: today,
    updatedAt: today,
  };
}

export default function Erp1cPage() {
  const { orders, actions } = useInventory();
  const [parsed, setParsed] = useState<OneCProduct[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [copied, setCopied] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const exchangeUrl = useMemo(
    () => (typeof window !== "undefined" ? `${window.location.origin}/api/integrations/1c/catalog` : "/api/integrations/1c/catalog"),
    [],
  );

  function addLog(msg: string) {
    setLog((l) => [`${new Date().toLocaleTimeString("ru-RU")} · ${msg}`, ...l].slice(0, 20));
  }

  async function onFile(file: File) {
    setBusy(true);
    try {
      const xml = await file.text();
      const res = await fetch("/api/integrations/1c/catalog", { method: "POST", headers: { "Content-Type": "application/xml" }, body: xml });
      const json = (await res.json()) as { products?: OneCProduct[]; error?: string };
      if (json.products) {
        setParsed(json.products);
        addLog(`Разобран каталог из 1С: ${json.products.length} товаров`);
      } else {
        addLog(`Ошибка разбора: ${json.error ?? "неизвестно"}`);
      }
    } catch {
      addLog("Не удалось прочитать файл");
    } finally {
      setBusy(false);
    }
  }

  function importParsed() {
    if (!parsed) return;
    for (const p of parsed) actions.addProduct(toProduct(p));
    addLog(`Импортировано в каталог: ${parsed.length} товаров`);
    setParsed(null);
  }

  function exportOrders() {
    const xml = buildOrdersCommerceML(
      orders.slice(0, 500).map((o) => ({
        number: o.orderNumber, date: o.createdAt, total: o.revenue,
        lines: o.items.map((it) => ({ name: it.productName, sku: it.sku, qty: it.qty, unitPrice: it.unitPrice })),
      })),
    );
    const url = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
    const a = document.createElement("a");
    a.href = url; a.download = "orders_1c.xml"; a.click();
    URL.revokeObjectURL(url);
    addLog(`Выгружено заказов: ${Math.min(orders.length, 500)}`);
  }

  return (
    <InventoryShell title="Обмен с 1С" subtitle="Синхронизация товаров, остатков и заказов по CommerceML">
      <div className="mx-auto max-w-[920px] space-y-5">
        {/* Connection */}
        <section className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
          <h2 className="text-sm font-semibold text-[var(--c-text)]">Подключение</h2>
          <p className="mt-0.5 text-sm text-[var(--c-text2)]">
            Укажите этот адрес в 1С (Обмен с сайтом / CommerceML). Формат — CommerceML 2.
          </p>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-3 py-2">
            <FileCode className="h-4 w-4 shrink-0 text-[var(--c-text3)]" />
            <code className="min-w-0 flex-1 truncate text-sm text-[var(--c-text)]">{exchangeUrl}</code>
            <button
              onClick={() => { navigator.clipboard?.writeText(exchangeUrl).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[var(--c-text2)] hover:bg-[var(--c-bg3)]"
            >
              {copied ? <><Check className="h-3.5 w-3.5 text-[var(--c-green)]" /> Скопировано</> : <><Copy className="h-3.5 w-3.5" /> Копировать</>}
            </button>
          </div>
        </section>

        {/* Import / Export */}
        <div className="grid gap-5 sm:grid-cols-2">
          <section className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <div className="flex items-center gap-2"><Upload className="h-4 w-4 text-[var(--c-text2)]" /><h3 className="text-sm font-semibold text-[var(--c-text)]">Импорт из 1С</h3></div>
            <p className="mt-1 text-sm text-[var(--c-text2)]">Загрузите файл выгрузки <code>import.xml</code> / <code>offers.xml</code>.</p>
            <input ref={fileRef} type="file" accept=".xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) onFile(f); }} />
            <button onClick={() => fileRef.current?.click()} disabled={busy} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)] disabled:opacity-50">
              {busy ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />} Выбрать файл
            </button>
          </section>

          <section className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <div className="flex items-center gap-2"><Download className="h-4 w-4 text-[var(--c-text2)]" /><h3 className="text-sm font-semibold text-[var(--c-text)]">Выгрузка заказов</h3></div>
            <p className="mt-1 text-sm text-[var(--c-text2)]">Сформировать CommerceML с заказами для загрузки в 1С.</p>
            <button onClick={exportOrders} className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">
              <Download className="h-4 w-4" /> Выгрузить заказы ({orders.length})
            </button>
          </section>
        </div>

        {/* Parsed preview */}
        {parsed && (
          <section className="rounded-2xl border border-[var(--c-blue)]/40 bg-[var(--c-blue)]/5 p-5">
            <div className="flex items-center justify-between gap-3">
              <h3 className="flex items-center gap-2 text-sm font-semibold text-[var(--c-text)]"><Boxes className="h-4 w-4" /> Найдено товаров: {parsed.length}</h3>
              <div className="flex gap-2">
                <button onClick={() => setParsed(null)} className="rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">Отмена</button>
                <button onClick={importParsed} className="rounded-lg bg-[var(--c-text)] px-3 py-1.5 text-sm font-medium text-[var(--c-bg)] hover:opacity-90">Добавить в каталог</button>
              </div>
            </div>
            <div className="mt-3 max-h-56 overflow-y-auto rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)]">
              {parsed.slice(0, 100).map((p) => (
                <div key={p.externalId} className="flex items-center justify-between gap-3 border-b border-[var(--c-border)] px-3 py-2 text-sm last:border-0">
                  <span className="min-w-0 truncate text-[var(--c-text)]">{p.name}</span>
                  <span className="shrink-0 text-[var(--c-text3)]">{p.sku || "—"}</span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Log */}
        <section className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
          <h3 className="text-sm font-semibold text-[var(--c-text)]">Журнал обмена</h3>
          {log.length === 0 ? (
            <p className="mt-2 text-sm text-[var(--c-text3)]">Пока нет операций.</p>
          ) : (
            <ul className="mt-2 space-y-1 text-sm text-[var(--c-text2)]">
              {log.map((l, i) => <li key={i} className={cn(i === 0 && "text-[var(--c-text)]")}>{l}</li>)}
            </ul>
          )}
        </section>
      </div>
    </InventoryShell>
  );
}
