"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ChevronLeft, ChevronUp, ChevronDown, Plus, X, Search, Pencil,
  Smile, AtSign, Hash, Paperclip, ImageIcon, ChevronsUpDown,
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import type { Order, OrderItem, Product } from "@/mock/inventory";
import { formatRub, cn } from "@/lib/utils";

interface Line {
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  unitCost: number;
  qty: number;
}

/** Shopify-style draft order editor. Adds catalog products, computes totals,
 *  and «Mark as paid» creates a real order in the workspace. */
export function DraftOrderEditor() {
  const router = useRouter();
  const { products, locations, actions } = useInventory();
  const [lines, setLines] = useState<Line[]>([]);
  const [picker, setPicker] = useState(false);
  const [paymentLater, setPaymentLater] = useState(false);
  const updatedAt = useMemo(() => new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }), []);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const total = subtotal;

  function addProduct(p: Product) {
    setLines((prev) => {
      const existing = prev.find((l) => l.productId === p.id);
      if (existing) return prev.map((l) => (l.productId === p.id ? { ...l, qty: l.qty + 1 } : l));
      return [...prev, { productId: p.id, name: p.name, sku: p.sku, unitPrice: p.price, unitCost: p.costPrice, qty: 1 }];
    });
  }
  function setQty(productId: string, qty: number) {
    setLines((prev) => prev.map((l) => (l.productId === productId ? { ...l, qty: Math.max(1, qty) } : l)));
  }
  function removeLine(productId: string) {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  }

  function markAsPaid() {
    if (lines.length === 0) return;
    const now = new Date();
    const items: OrderItem[] = lines.map((l) => ({
      productId: l.productId, productName: l.name, sku: l.sku, qty: l.qty, unitPrice: l.unitPrice, unitCost: l.unitCost,
    }));
    const order: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `D${now.getTime().toString().slice(-4)}`,
      channel: "website",
      fulfillment: "self",
      status: "delivered",
      items,
      locationId: locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? "",
      revenue: total,
      commissionRate: 0,
      logisticsCost: 0,
      createdAt: now.toISOString(),
      note: "Создано из черновика",
    };
    actions.createOrder(order);
    router.push("/inventory/orders");
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6">
      {/* Header */}
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/inventory/orders/drafts")} className="rounded-md p-1 text-[var(--c-text2)] hover:bg-[var(--c-bg3)]">
            <ChevronLeft className="h-5 w-5" />
          </button>
          <div>
            <h1 className="text-lg font-semibold text-[var(--c-text)]">#D1</h1>
            <p className="text-xs text-[var(--c-text3)]">Обновлено сегодня в {updatedAt}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <HeaderBtn>Дублировать</HeaderBtn>
          <HeaderBtn>Поделиться</HeaderBtn>
          <HeaderBtn>Действия ▾</HeaderBtn>
          <div className="flex">
            <button className="rounded-l-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-1.5 text-[var(--c-text2)] hover:bg-[var(--c-bg2)]"><ChevronUp className="h-4 w-4" /></button>
            <button className="rounded-r-lg border border-l-0 border-[var(--c-border)] bg-[var(--c-bg)] p-1.5 text-[var(--c-text2)] hover:bg-[var(--c-bg2)]"><ChevronDown className="h-4 w-4" /></button>
          </div>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Products */}
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--c-text)]">Товары</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setPicker(true)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--c-border2)] px-2.5 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg2)]">
                  <Plus className="h-3.5 w-3.5" /> Добавить товар
                </button>
                <button onClick={() => addProduct({ id: `custom-${Date.now()}`, name: "Произвольная позиция", sku: "", price: 0, costPrice: 0 } as Product)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--c-border2)] px-2.5 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg2)]">
                  <Plus className="h-3.5 w-3.5" /> Произвольная позиция
                </button>
              </div>
            </div>

            {lines.length === 0 ? (
              <div className="mt-4 flex items-center gap-2 rounded-lg border border-dashed border-[var(--c-border2)] px-3 py-6 text-sm text-[var(--c-text3)]">
                <Search className="h-4 w-4" /> Добавьте товары в черновик заказа.
              </div>
            ) : (
              <div className="mt-3 divide-y divide-[var(--c-border)]">
                {lines.map((l) => (
                  <div key={l.productId} className="flex items-center gap-3 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--c-border)] bg-[var(--c-bg2)] text-[var(--c-text3)]">
                      <ImageIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-[var(--c-text)]">{l.name}</div>
                      {l.sku && <div className="text-xs text-[var(--c-text3)]">{l.sku}</div>}
                    </div>
                    <span className="text-sm text-[var(--c-blue)]">{formatRub(l.unitPrice)}</span>
                    <input
                      type="number" min={1} value={l.qty}
                      onChange={(e) => setQty(l.productId, parseInt(e.target.value) || 1)}
                      className="w-16 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-2 py-1 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]"
                    />
                    <span className="w-20 text-right text-sm font-medium text-[var(--c-text)]">{formatRub(l.unitPrice * l.qty)}</span>
                    <button onClick={() => removeLine(l.productId)} className="rounded-md p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Payment */}
          <Card>
            <h2 className="text-sm font-semibold text-[var(--c-text)]">Оплата</h2>
            <div className="mt-3 rounded-xl border border-[var(--c-border)]">
              <Row label="Подытог" sub={`${itemCount} ${plural(itemCount)}`} value={formatRub(subtotal)} />
              <Row label={<button className="text-[var(--c-blue)] hover:underline">Добавить скидку</button>} sub="—" value={formatRub(0)} />
              <Row label={<button className="text-[var(--c-blue)] hover:underline">Добавить доставку</button>} sub="—" value={formatRub(0)} />
              <Row label="Налог" sub="Не рассчитан" value="" />
              <div className="flex items-center justify-between px-4 py-3 text-sm font-semibold text-[var(--c-text)]">
                <span>Итого</span><span>{formatRub(total)}</span>
              </div>
            </div>
            <label className="mt-3 flex items-center gap-2 border-t border-[var(--c-border)] pt-3 text-sm text-[var(--c-text2)]">
              <input type="checkbox" checked={paymentLater} onChange={(e) => setPaymentLater(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" />
              Оплата позже
            </label>
            <div className="mt-4 flex justify-end gap-2">
              <button className="rounded-lg border border-[var(--c-border2)] px-4 py-2 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg2)]">Отправить счёт</button>
              <button onClick={markAsPaid} disabled={lines.length === 0} className="rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90 disabled:opacity-50">
                Отметить оплаченным
              </button>
            </div>
          </Card>

          {/* Timeline */}
          <div>
            <h2 className="mb-3 text-sm font-semibold text-[var(--c-text)]">Хронология</h2>
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)]">
              <div className="flex items-start gap-2 p-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--c-blue)] text-xs font-semibold text-white">AK</span>
                <input placeholder="Оставьте комментарий…" className="flex-1 bg-transparent py-1.5 text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]" />
              </div>
              <div className="flex items-center justify-between border-t border-[var(--c-border)] px-3 py-2">
                <div className="flex items-center gap-3 text-[var(--c-text3)]">
                  <Smile className="h-4 w-4" /><AtSign className="h-4 w-4" /><Hash className="h-4 w-4" /><Paperclip className="h-4 w-4" />
                </div>
                <button className="rounded-lg bg-[var(--c-bg3)] px-3 py-1 text-sm font-medium text-[var(--c-text2)]">Опубликовать</button>
              </div>
            </div>
            <p className="mt-2 text-right text-xs text-[var(--c-text3)]">Комментарии видны только вам и сотрудникам</p>
            <div className="mt-4 border-l border-[var(--c-border)] pl-4 text-sm">
              <div className="text-[var(--c-text3)]">Сегодня</div>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-[var(--c-text)]">Вы создали черновик заказа.</span>
                <span className="text-[var(--c-text3)]">Только что</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <SideCard title="Заметки" edit>
            <p className="text-sm text-[var(--c-text3)]">Без заметок</p>
          </SideCard>
          <SideCard title="Клиент">
            <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-2.5 py-2">
              <Search className="h-4 w-4 text-[var(--c-text3)]" />
              <input placeholder="Поиск клиента" className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]" />
            </div>
          </SideCard>
          <SideCard title="Рынок">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--c-bg3)] px-2 py-1 text-sm text-[var(--c-text)]">🌍 Россия</span>
            <p className="mt-3 text-xs text-[var(--c-text3)]">Валюта</p>
            <button className="mt-1 flex w-full items-center justify-between rounded-lg border border-[var(--c-border2)] px-2.5 py-2 text-sm text-[var(--c-text)]">
              Рубль (RUB ₽) <ChevronsUpDown className="h-4 w-4 text-[var(--c-text3)]" />
            </button>
          </SideCard>
          <SideCard title="Теги" edit>
            <input className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
          </SideCard>
        </div>
      </div>

      {picker && <ProductPicker products={products} onPick={(p) => { addProduct(p); setPicker(false); }} onClose={() => setPicker(false)} />}
    </div>
  );
}

function plural(n: number) {
  const m = n % 10, h = n % 100;
  if (m === 1 && h !== 11) return "товар";
  if (m >= 2 && m <= 4 && (h < 10 || h >= 20)) return "товара";
  return "товаров";
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4">{children}</div>;
}
function HeaderBtn({ children }: { children: React.ReactNode }) {
  return <button className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg2)]">{children}</button>;
}
function Row({ label, sub, value }: { label: React.ReactNode; sub: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-[var(--c-border)] px-4 py-3 text-sm">
      <span className="text-[var(--c-text)]">{label}</span>
      <span className="flex-1 text-[var(--c-text3)]">{sub}</span>
      <span className="text-[var(--c-text)]">{value}</span>
    </div>
  );
}
function SideCard({ title, edit, children }: { title: string; edit?: boolean; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>
        {edit && <button className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"><Pencil className="h-3.5 w-3.5" /></button>}
      </div>
      {children}
    </div>
  );
}

function ProductPicker({ products, onPick, onClose }: { products: Product[]; onPick: (p: Product) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const filtered = products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()));
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-2 border-b border-[var(--c-border)] px-4 py-3">
          <Search className="h-4 w-4 text-[var(--c-text3)]" />
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск товаров" className="flex-1 bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]" />
          <button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-80 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-[var(--c-text3)]">Ничего не найдено</div>
          ) : filtered.slice(0, 50).map((p) => (
            <button key={p.id} onClick={() => onPick(p)} className="flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2 text-left hover:bg-[var(--c-bg3)]">
              <span className="min-w-0">
                <span className="block truncate text-sm text-[var(--c-text)]">{p.name}</span>
                <span className="block text-xs text-[var(--c-text3)]">{p.sku}</span>
              </span>
              <span className="text-sm text-[var(--c-text2)]">{formatRub(p.price)}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
