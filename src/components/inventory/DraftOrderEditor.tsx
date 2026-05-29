"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, X, Search, Pencil, Info, ChevronsUpDown, Ban, SquarePen, Globe, UserPlus, Image as ImageIcon,
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import type { Order, OrderItem, Product, Customer } from "@/mock/inventory";
import { formatRub, cn } from "@/lib/utils";

interface Line {
  key: string;
  productId: string;
  name: string;
  sku: string;
  unitPrice: number;
  unitCost: number;
  qty: number;
}

/** Create-order (draft) editor, modelled on the reference. */
export function DraftOrderEditor() {
  const router = useRouter();
  const { products, customers, locations, actions } = useInventory();
  const [lines, setLines] = useState<Line[]>([]);
  const [picker, setPicker] = useState(false);
  const [customItem, setCustomItem] = useState(false);
  const [dueLater, setDueLater] = useState(false);
  const [remindersHidden, setRemindersHidden] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const hasLines = lines.length > 0;

  function addProducts(picked: Product[]) {
    setLines((prev) => {
      const next = [...prev];
      for (const p of picked) {
        const existing = next.find((l) => l.productId === p.id);
        if (existing) existing.qty += 1;
        else next.push({ key: p.id, productId: p.id, name: p.name, sku: p.sku, unitPrice: p.price, unitCost: p.costPrice, qty: 1 });
      }
      return next;
    });
  }
  function addCustom(name: string, price: number, qty: number) {
    setLines((prev) => [...prev, { key: `custom-${Date.now()}`, productId: `custom-${Date.now()}`, name, sku: "", unitPrice: price, unitCost: 0, qty }]);
  }
  function setQty(key: string, qty: number) {
    setLines((prev) => prev.map((l) => (l.key === key ? { ...l, qty: Math.max(1, qty) } : l)));
  }
  function removeLine(key: string) {
    setLines((prev) => prev.filter((l) => l.key !== key));
  }

  function createOrder() {
    if (!hasLines) return;
    const now = new Date();
    const items: OrderItem[] = lines.map((l) => ({
      productId: l.productId, productName: l.name, sku: l.sku, qty: l.qty, unitPrice: l.unitPrice, unitCost: l.unitCost,
    }));
    const order: Order = {
      id: `ord-${Date.now()}`,
      orderNumber: `${now.getTime().toString().slice(-5)}`,
      channel: "website",
      fulfillment: "self",
      status: dueLater ? "new" : "delivered",
      items,
      locationId: locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? "",
      customerId: customer?.id,
      customerName: customer?.name,
      revenue: subtotal,
      commissionRate: 0,
      logisticsCost: 0,
      createdAt: now.toISOString(),
      note: "Создано вручную",
    };
    actions.createOrder(order);
    router.push("/inventory/orders");
  }

  return (
    <div className="mx-auto max-w-[1180px] px-4 py-6">
      {/* Header — breadcrumb only */}
      <div className="mb-5 flex items-center gap-2">
        <Link href="/inventory/orders/drafts" className="text-[var(--c-text3)] hover:text-[var(--c-text)]">
          <SquarePen className="h-5 w-5" />
        </Link>
        <span className="text-[var(--c-text3)]">›</span>
        <h1 className="text-lg font-semibold text-[var(--c-text)]">Создать заказ</h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
        {/* Left column */}
        <div className="space-y-5">
          {/* Products */}
          <Card>
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-sm font-semibold text-[var(--c-text)]">Товары</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setPicker(true)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--c-border2)] px-2.5 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">
                  <Plus className="h-3.5 w-3.5" /> Добавить товар
                </button>
                <button onClick={() => setCustomItem(true)} className="inline-flex items-center gap-1 rounded-lg border border-[var(--c-border2)] px-2.5 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">
                  <Plus className="h-3.5 w-3.5" /> Произвольная позиция
                </button>
              </div>
            </div>

            {hasLines && (
              <div className="mt-3 divide-y divide-[var(--c-border)] border-t border-[var(--c-border)]">
                {lines.map((l) => (
                  <div key={l.key} className="flex items-center gap-3 py-3">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text3)]">
                      <ImageIcon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm text-[var(--c-text)]">{l.name}</div>
                      {l.sku && <div className="text-xs text-[var(--c-text3)]">{l.sku}</div>}
                    </div>
                    <span className="text-sm text-[var(--c-blue)]">{formatRub(l.unitPrice)}</span>
                    <input
                      type="number" min={1} value={l.qty}
                      onChange={(e) => setQty(l.key, parseInt(e.target.value) || 1)}
                      className="w-16 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 py-1 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]"
                    />
                    <span className="w-20 text-right text-sm text-[var(--c-text)]">{formatRub(l.unitPrice * l.qty)}</span>
                    <button onClick={() => removeLine(l.key)} className="rounded-md p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"><X className="h-4 w-4" /></button>
                  </div>
                ))}
              </div>
            )}
          </Card>

          {/* Payment */}
          <Card>
            <h2 className="text-sm font-semibold text-[var(--c-text)]">Оплата</h2>
            <div className="mt-3 rounded-xl border border-[var(--c-border)]">
              <Row muted={!hasLines} label="Подытог" sub={hasLines ? `${itemCount} ${plural(itemCount)}` : ""} value={formatRub(subtotal)} />
              <Row muted={!hasLines} label={<span className="text-[var(--c-blue)]">Добавить скидку</span>} sub="—" value={formatRub(0)} />
              <Row muted={!hasLines} label={<span className="text-[var(--c-blue)]">Добавить доставку</span>} sub="—" value={formatRub(0)} />
              <Row muted={!hasLines} label={<span className="inline-flex items-center gap-1">Расчётный налог <Info className="h-3.5 w-3.5 text-[var(--c-text3)]" /></span>} sub="Не рассчитан" value="" />
              <div className={cn("flex items-center justify-between px-4 py-3 text-sm font-semibold", hasLines ? "text-[var(--c-text)]" : "text-[var(--c-text3)]")}>
                <span>Итого</span><span>{formatRub(subtotal)}</span>
              </div>
            </div>

            {!hasLines ? (
              <p className="mt-3 text-sm text-[var(--c-text2)]">
                Добавьте товар, чтобы рассчитать сумму и увидеть варианты оплаты
              </p>
            ) : (
              <>
                <label className="mt-3 flex items-center gap-2 border-t border-[var(--c-border)] pt-3 text-sm text-[var(--c-text)]">
                  <input type="checkbox" checked={dueLater} onChange={(e) => setDueLater(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" />
                  Оплата позже
                </label>

                {dueLater && (
                  <div className="mt-3 space-y-3">
                    <div>
                      <p className="text-sm text-[var(--c-text)]">Условия оплаты</p>
                      <select className="mt-1 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)]">
                        <option>Оплата при получении</option>
                        <option>Через 7 дней</option>
                        <option>Через 15 дней</option>
                        <option>Через 30 дней</option>
                      </select>
                    </div>
                    <p className="text-sm text-[var(--c-text2)]">
                      <span className="font-medium text-[var(--c-text)]">Оплата при отправке счёта.</span> Остаток можно принять на странице заказа.
                    </p>
                    {!remindersHidden && (
                      <div className="relative rounded-lg border border-[var(--c-blue)]/30 bg-[var(--c-blue)]/10 p-3 pr-8 text-sm text-[var(--c-text2)]">
                        <button onClick={() => setRemindersHidden(true)} className="absolute right-2 top-2 rounded p-0.5 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-3.5 w-3.5" /></button>
                        <p className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 shrink-0 text-[var(--c-blue)]" /> Покупатели могут получать автоматические напоминания об оплате, когда срок наступает позже.</p>
                        <button className="mt-2 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-1 text-xs font-medium text-[var(--c-text)]">Настроить напоминания</button>
                      </div>
                    )}
                  </div>
                )}

                <div className="mt-4 flex justify-end gap-2">
                  <button className="rounded-lg border border-[var(--c-border2)] px-4 py-2 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">Отправить счёт</button>
                  <button onClick={createOrder} className="rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90">Создать заказ</button>
                </div>
              </>
            )}
          </Card>
        </div>

        {/* Right column */}
        <div className="space-y-5">
          <SideCard title="Заметки" edit>
            <p className="text-sm text-[var(--c-text3)]">Без заметок</p>
          </SideCard>

          <SideCard title="Клиент">
            <CustomerSearch customers={customers} selected={customer} onSelect={setCustomer} />
          </SideCard>

          <SideCard title="Рынок" icon={<ChevronsUpDown className="h-4 w-4 text-[var(--c-text3)]" />}>
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--c-bg3)] px-2 py-1 text-sm text-[var(--c-text)]">
              <Globe className="h-4 w-4 text-[var(--c-text3)]" /> Россия
            </span>
            <p className="mt-3 text-xs text-[var(--c-text3)]">Валюта</p>
            <button className="mt-1 flex w-full items-center justify-between rounded-lg border border-[var(--c-border2)] px-2.5 py-2 text-sm text-[var(--c-text)]">
              Рубль (RUB ₽) <ChevronsUpDown className="h-4 w-4 text-[var(--c-text3)]" />
            </button>
          </SideCard>

          <SideCard title="Теги" edit>
            <input className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
          </SideCard>
        </div>
      </div>

      {picker && <ProductPicker products={products} onAdd={(p) => { addProducts(p); setPicker(false); }} onClose={() => setPicker(false)} />}
      {customItem && <CustomItemModal onAdd={(n, p, q) => { addCustom(n, p, q); setCustomItem(false); }} onClose={() => setCustomItem(false)} />}
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
  return <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">{children}</div>;
}
function Row({ label, sub, value, muted }: { label: React.ReactNode; sub: string; value: string; muted?: boolean }) {
  return (
    <div className={cn("flex items-center justify-between gap-3 border-b border-[var(--c-border)] px-4 py-3 text-sm", muted && "text-[var(--c-text3)]")}>
      <span className={muted ? "text-[var(--c-text3)]" : "text-[var(--c-text)]"}>{label}</span>
      <span className="flex-1 text-[var(--c-text3)]">{sub}</span>
      <span className={muted ? "text-[var(--c-text3)]" : "text-[var(--c-text)]"}>{value}</span>
    </div>
  );
}
function SideCard({ title, edit, icon, children }: { title: string; edit?: boolean; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <div className="mb-2 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>
        {edit ? <button className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"><Pencil className="h-3.5 w-3.5" /></button> : icon}
      </div>
      {children}
    </div>
  );
}

// ── Customer search ─────────────────────────────────────────────────────────
function CustomerSearch({ customers, selected, onSelect }: { customers: Customer[]; selected: Customer | null; onSelect: (c: Customer | null) => void }) {
  const [q, setQ] = useState("");
  const [open, setOpen] = useState(false);
  const matches = useMemo(
    () => (q.trim() ? customers.filter((c) => c.name?.toLowerCase().includes(q.toLowerCase())).slice(0, 6) : customers.slice(0, 6)),
    [customers, q],
  );

  if (selected) {
    return (
      <div className="flex items-center justify-between rounded-lg border border-[var(--c-border2)] px-2.5 py-2">
        <span className="text-sm text-[var(--c-text)]">{selected.name}</span>
        <button onClick={() => onSelect(null)} className="rounded p-0.5 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"><X className="h-4 w-4" /></button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-2.5 py-2 focus-within:border-[var(--c-blue)]">
        <Search className="h-4 w-4 text-[var(--c-text3)]" />
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          placeholder="Поиск клиента"
          className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]"
        />
      </div>
      {open && (
        <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in">
          <Link href="/inventory/customers" className="flex items-center gap-2 border-b border-[var(--c-border)] px-3 py-2 text-sm font-medium text-[var(--c-blue)] hover:bg-[var(--c-bg3)]">
            <UserPlus className="h-4 w-4" /> Добавить нового клиента
          </Link>
          <div className="max-h-56 overflow-y-auto">
            {matches.length === 0 ? (
              <div className="px-3 py-4 text-center text-sm text-[var(--c-text3)]">Клиенты не найдены</div>
            ) : matches.map((c) => (
              <button key={c.id} onMouseDown={() => onSelect(c)} className="block w-full px-3 py-2 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]">
                {c.name}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Select products modal (reference image 2) ────────────────────────────────
function ProductPicker({ products, onAdd, onClose }: { products: Product[]; onAdd: (p: Product[]) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const filtered = products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()));

  function toggle(id: string) {
    setSelected((prev) => { const n = new Set(prev); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 animate-fade-in" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
          <h3 className="text-base font-semibold text-[var(--c-text)]">Выбрать товары</h3>
          <button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="border-b border-[var(--c-border)] px-4 py-2.5">
          <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-2.5 py-1.5">
            <Search className="h-4 w-4 text-[var(--c-text3)]" />
            <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск товаров" className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]" />
          </div>
        </div>
        <div className="min-h-[260px] flex-1 overflow-y-auto p-2">
          {filtered.length === 0 ? (
            <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-[var(--c-text3)]">
              <Ban className="h-6 w-6" />
              <span className="text-sm">Товары не найдены</span>
            </div>
          ) : filtered.slice(0, 100).map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--c-bg3)]">
              <input type="checkbox" checked={selected.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 rounded border-[var(--c-border2)]" />
              <span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text3)]"><ImageIcon className="h-3.5 w-3.5" /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-[var(--c-text)]">{p.name}</span>
                {p.sku && <span className="block text-xs text-[var(--c-text3)]">{p.sku}</span>}
              </span>
              <span className="text-sm text-[var(--c-text2)]">{formatRub(p.price)}</span>
            </label>
          ))}
        </div>
        <div className="flex items-center justify-between border-t border-[var(--c-border)] px-4 py-3">
          <span className="rounded-md bg-[var(--c-bg3)] px-2 py-1 text-sm text-[var(--c-text2)]">{selected.size}/500 выбрано</span>
          <div className="flex gap-2">
            <button onClick={onClose} className="rounded-lg border border-[var(--c-border2)] px-4 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">Отмена</button>
            <button
              disabled={selected.size === 0}
              onClick={() => onAdd(products.filter((p) => selected.has(p.id)))}
              className="rounded-lg bg-[var(--c-text)] px-4 py-1.5 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90 disabled:opacity-50"
            >
              Добавить
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Add custom item modal (reference image 3) ────────────────────────────────
function CustomItemModal({ onAdd, onClose }: { onAdd: (name: string, price: number, qty: number) => void; onClose: () => void }) {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [qty, setQty] = useState("1");
  const [taxable, setTaxable] = useState(true);
  const [physical, setPhysical] = useState(true);
  const [weight, setWeight] = useState("0");

  const valid = name.trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-24 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-md rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
          <h3 className="text-base font-semibold text-[var(--c-text)]">Произвольная позиция</h3>
          <button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-4 p-4">
          <div className="grid grid-cols-[1fr_auto_auto] gap-3">
            <Field label="Название">
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
            </Field>
            <Field label="Цена">
              <input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0" className="w-24 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
            </Field>
            <Field label="Кол-во">
              <input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" className="w-20 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
            <input type="checkbox" checked={taxable} onChange={(e) => setTaxable(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" /> Облагается налогом
          </label>
          <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
            <input type="checkbox" checked={physical} onChange={(e) => setPhysical(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" /> Физический товар
          </label>
          {physical && (
            <div>
              <p className="text-sm text-[var(--c-text)]">Вес (необязательно)</p>
              <div className="mt-1 flex gap-2">
                <input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className="flex-1 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
                <select className="rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 py-2 text-sm text-[var(--c-text)]"><option>кг</option><option>г</option></select>
              </div>
              <p className="mt-1 text-xs text-[var(--c-text3)]">Используется для точного расчёта стоимости доставки</p>
            </div>
          )}
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--c-border)] px-4 py-3">
          <button onClick={onClose} className="rounded-lg border border-[var(--c-border2)] px-4 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">Отмена</button>
          <button
            disabled={!valid}
            onClick={() => onAdd(name.trim(), parseFloat(price) || 0, Math.max(1, parseInt(qty) || 1))}
            className="rounded-lg bg-[var(--c-text)] px-4 py-1.5 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90 disabled:opacity-50"
          >
            Добавить позицию
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm text-[var(--c-text)]">{label}</span>
      {children}
    </label>
  );
}
