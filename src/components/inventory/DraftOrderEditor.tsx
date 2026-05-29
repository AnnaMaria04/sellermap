"use client";

import { useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Plus, X, Search, Pencil, Info, ChevronsUpDown, ChevronDown, Ban, SquarePen, Globe,
  UserPlus, Image as ImageIcon, Share2, Trash2, ChevronUp, Smile, AtSign, Hash, Paperclip, Check,
} from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import type { Order, OrderItem, Product, Customer } from "@/mock/inventory";
import { formatRub, cn } from "@/lib/utils";

interface Line { key: string; productId: string; name: string; sku: string; unitPrice: number; unitCost: number; qty: number; }
interface Discount { type: "amount" | "percent"; value: number; reason: string; }
interface Shipping { name: string; price: number; }
type Modal = null | "picker" | "custom" | "discount" | "shipping" | "invoice" | "markpaid" | "share" | "note";

export function DraftOrderEditor() {
  const router = useRouter();
  const { products, customers, locations, actions } = useInventory();

  const [saved, setSaved] = useState(false);
  const [draftNo, setDraftNo] = useState("");
  const [updatedAt, setUpdatedAt] = useState("");
  const [lines, setLines] = useState<Line[]>([]);
  const [discount, setDiscount] = useState<Discount | null>(null);
  const [shipping, setShipping] = useState<Shipping | null>(null);
  const [chargeTaxes, setChargeTaxes] = useState(true);
  const [dueLater, setDueLater] = useState(false);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [editTags, setEditTags] = useState(false);
  const [timeline, setTimeline] = useState<{ text: string; at: string }[]>([]);
  const [comment, setComment] = useState("");
  const [modal, setModal] = useState<Modal>(null);
  const [taxPop, setTaxPop] = useState(false);
  const [moreOpen, setMoreOpen] = useState(false);

  const subtotal = lines.reduce((s, l) => s + l.unitPrice * l.qty, 0);
  const itemCount = lines.reduce((s, l) => s + l.qty, 0);
  const discountAmount = discount ? (discount.type === "amount" ? discount.value : (subtotal * discount.value) / 100) : 0;
  const shippingAmount = shipping?.price ?? 0;
  const total = Math.max(0, subtotal - discountAmount) + shippingAmount;
  const hasLines = lines.length > 0;

  function nowLabel() { return new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }); }

  function addProducts(picked: Product[]) {
    setLines((prev) => {
      const next = [...prev];
      for (const p of picked) {
        const ex = next.find((l) => l.productId === p.id);
        if (ex) ex.qty += 1;
        else next.push({ key: p.id, productId: p.id, name: p.name, sku: p.sku, unitPrice: p.price, unitCost: p.costPrice, qty: 1 });
      }
      return next;
    });
  }
  function addCustom(name: string, price: number, qty: number) {
    const k = `custom-${Date.now()}`;
    setLines((prev) => [...prev, { key: k, productId: k, name, sku: "", unitPrice: price, unitCost: 0, qty }]);
  }
  const setQty = (k: string, q: number) => setLines((p) => p.map((l) => (l.key === k ? { ...l, qty: Math.max(1, q) } : l)));
  const removeLine = (k: string) => setLines((p) => p.filter((l) => l.key !== k));

  function saveDraft() {
    if (!saved) {
      const n = `#D${Math.floor(Math.random() * 90 + 10)}`;
      setDraftNo(n);
      setSaved(true);
      setUpdatedAt(nowLabel());
      setTimeline([{ text: "Вы создали черновик заказа.", at: "Только что" }]);
    } else {
      setUpdatedAt(nowLabel());
    }
  }

  function markAsPaid() {
    const now = new Date();
    const items: OrderItem[] = lines.map((l) => ({ productId: l.productId, productName: l.name, sku: l.sku, qty: l.qty, unitPrice: l.unitPrice, unitCost: l.unitCost }));
    const order: Order = {
      id: `ord-${Date.now()}`, orderNumber: `${now.getTime().toString().slice(-5)}`,
      channel: "website", fulfillment: "self", status: "delivered", items,
      locationId: locations.find((l) => l.isDefault)?.id ?? locations[0]?.id ?? "",
      customerId: customer?.id, customerName: customer?.name,
      revenue: total, commissionRate: 0, logisticsCost: shippingAmount, createdAt: now.toISOString(), note: notes || "Создано вручную",
    };
    actions.createOrder(order);
    router.push("/inventory/orders");
  }

  function postComment() {
    if (!comment.trim()) return;
    setTimeline((t) => [{ text: comment.trim(), at: "Только что" }, ...t]);
    setComment("");
  }

  return (
    <>
      {/* Save bar (State A) */}
      {!saved && (
        <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 flex items-center justify-between border-b border-[var(--c-border)] bg-[var(--c-text)] px-4 py-2.5 text-sm text-[var(--c-bg)]">
          <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--c-bg)]/70" /> Несохранённый черновик заказа</span>
          <div className="flex items-center gap-2">
            <button onClick={() => router.push("/inventory/orders/drafts")} className="rounded-lg px-3 py-1.5 font-medium text-[var(--c-bg)]/90 hover:bg-[var(--c-bg)]/10">Отменить</button>
            <button onClick={saveDraft} className="rounded-lg bg-[var(--c-bg)] px-3 py-1.5 font-medium text-[var(--c-text)] hover:opacity-90">Сохранить</button>
          </div>
        </div>
      )}

      <div className="mx-auto max-w-[1180px] px-4 pb-10">
        {/* Header */}
        {!saved ? (
          <div className="mb-5 flex items-center gap-2">
            <Link href="/inventory/orders/drafts" className="text-[var(--c-text3)] hover:text-[var(--c-text)]"><SquarePen className="h-5 w-5" /></Link>
            <span className="text-[var(--c-text3)]">›</span>
            <h1 className="text-lg font-semibold text-[var(--c-text)]">Создать заказ</h1>
          </div>
        ) : (
          <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-center gap-2">
              <Link href="/inventory/orders/drafts" className="text-[var(--c-text3)] hover:text-[var(--c-text)]"><SquarePen className="h-5 w-5" /></Link>
              <span className="text-[var(--c-text3)]">›</span>
              <div>
                <h1 className="text-lg font-semibold text-[var(--c-text)]">{draftNo}</h1>
                <p className="text-xs text-[var(--c-text3)]">Обновлено сегодня в {updatedAt}</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <HBtn onClick={() => { setSaved(false); }}>Дублировать</HBtn>
              <HBtn onClick={() => setModal("share")}>Поделиться</HBtn>
              <div className="relative">
                <HBtn onClick={() => setMoreOpen((v) => !v)}>Действия <ChevronDown className="ml-1 inline h-3.5 w-3.5" /></HBtn>
                {moreOpen && (
                  <div className="absolute right-0 top-full z-40 mt-2 w-52 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1 shadow-xl" onMouseLeave={() => setMoreOpen(false)}>
                    <button onClick={() => router.push("/inventory/orders/drafts")} className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-left text-sm text-[var(--c-red)] hover:bg-[var(--c-bg3)]"><Trash2 className="h-4 w-4" /> Удалить черновик</button>
                  </div>
                )}
              </div>
              <div className="flex">
                <button className="rounded-l-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-1.5 text-[var(--c-text2)] hover:bg-[var(--c-bg)]"><ChevronUp className="h-4 w-4" /></button>
                <button className="rounded-r-lg border border-l-0 border-[var(--c-border)] bg-[var(--c-bg2)] p-1.5 text-[var(--c-text2)] hover:bg-[var(--c-bg)]"><ChevronDown className="h-4 w-4" /></button>
              </div>
            </div>
          </div>
        )}

        <div className="grid gap-5 lg:grid-cols-[1fr_340px]">
          {/* LEFT */}
          <div className="space-y-5">
            {/* Products */}
            <Card>
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold text-[var(--c-text)]">Товары</h2>
                <div className="flex items-center gap-2">
                  <OutlineBtn onClick={() => setModal("picker")}><Plus className="h-3.5 w-3.5" /> Добавить товар</OutlineBtn>
                  <OutlineBtn onClick={() => setModal("custom")}><Plus className="h-3.5 w-3.5" /> Произвольная позиция</OutlineBtn>
                </div>
              </div>
              {hasLines && (
                <div className="mt-3 divide-y divide-[var(--c-border)] border-t border-[var(--c-border)]">
                  {lines.map((l) => (
                    <div key={l.key} className="flex items-center gap-3 py-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text3)]"><ImageIcon className="h-4 w-4" /></span>
                      <div className="min-w-0 flex-1"><div className="truncate text-sm text-[var(--c-blue)]">{l.name}</div>{l.sku && <div className="text-xs text-[var(--c-text3)]">{l.sku}</div>}</div>
                      <span className="text-sm text-[var(--c-blue)]">{formatRub(l.unitPrice)}</span>
                      <input type="number" min={1} value={l.qty} onChange={(e) => setQty(l.key, parseInt(e.target.value) || 1)} className="w-16 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 py-1 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
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
                <Row muted={!hasLines} label={hasLines ? <button onClick={() => setModal("discount")} className="text-[var(--c-blue)] hover:underline">Добавить скидку</button> : <span>Добавить скидку</span>} sub={discount ? (discount.reason || "Скидка") : "—"} value={`−${formatRub(discountAmount)}`} />
                <Row muted={!hasLines} label={hasLines ? <button onClick={() => setModal("shipping")} className="text-[var(--c-blue)] hover:underline">Добавить доставку</button> : <span>Добавить доставку</span>} sub={shipping ? shipping.name : "—"} value={formatRub(shippingAmount)} />
                <div className="relative flex items-center justify-between gap-3 border-b border-[var(--c-border)] px-4 py-3 text-sm">
                  {hasLines ? <button onClick={() => setTaxPop((v) => !v)} className="inline-flex items-center gap-1 text-[var(--c-blue)] hover:underline">Расчётный налог <Info className="h-3.5 w-3.5" /></button> : <span className="inline-flex items-center gap-1 text-[var(--c-text3)]">Расчётный налог <Info className="h-3.5 w-3.5" /></span>}
                  <span className={cn("flex-1", "text-[var(--c-text3)]")}>{chargeTaxes ? "Не рассчитан" : "Не взимается"}</span>
                  <span className={hasLines ? "text-[var(--c-text)]" : "text-[var(--c-text3)]"}>{formatRub(0)}</span>
                  {taxPop && (
                    <div className="absolute right-0 top-full z-40 mt-1 w-64 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-3 shadow-xl">
                      <p className="text-xs text-[var(--c-text2)]">Налоги рассчитываются автоматически.</p>
                      <label className="mt-2 flex items-center gap-2 text-sm text-[var(--c-text)]"><input type="checkbox" checked={chargeTaxes} onChange={(e) => setChargeTaxes(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" /> Взимать налог</label>
                      <div className="mt-2 flex justify-end"><button onClick={() => setTaxPop(false)} className="rounded-lg bg-[var(--c-text)] px-3 py-1 text-xs font-medium text-[var(--c-bg)]">Готово</button></div>
                    </div>
                  )}
                </div>
                <div className={cn("flex items-center justify-between px-4 py-3 text-sm font-semibold", hasLines ? "text-[var(--c-text)]" : "text-[var(--c-text3)]")}><span>Итого</span><span>{formatRub(total)}</span></div>
              </div>

              {!hasLines ? (
                <p className="mt-3 text-sm text-[var(--c-text2)]">Добавьте товар, чтобы рассчитать сумму и увидеть варианты оплаты</p>
              ) : (
                <>
                  <label className="mt-3 flex items-center gap-2 border-t border-[var(--c-border)] pt-3 text-sm text-[var(--c-text)]"><input type="checkbox" checked={dueLater} onChange={(e) => setDueLater(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" /> Оплата позже</label>
                  <div className="mt-4 flex justify-end gap-2">
                    <OutlineBtn onClick={() => { saveDraft(); setModal("invoice"); }}>Отправить счёт</OutlineBtn>
                    <button onClick={() => setModal("markpaid")} className="rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90">Отметить оплаченным</button>
                  </div>
                </>
              )}
            </Card>

            {/* Timeline (State B) */}
            {saved && (
              <div>
                <h2 className="mb-3 text-sm font-semibold text-[var(--c-text)]">Хронология</h2>
                <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
                  <div className="flex items-start gap-2 p-3">
                    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-[var(--c-blue)] text-xs font-semibold text-white">AK</span>
                    <input value={comment} onChange={(e) => setComment(e.target.value)} onKeyDown={(e) => e.key === "Enter" && postComment()} placeholder="Оставьте комментарий…" className="flex-1 bg-transparent py-1.5 text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]" />
                  </div>
                  <div className="flex items-center justify-between border-t border-[var(--c-border)] px-3 py-2">
                    <div className="flex items-center gap-3 text-[var(--c-text3)]"><Smile className="h-4 w-4" /><AtSign className="h-4 w-4" /><Hash className="h-4 w-4" /><Paperclip className="h-4 w-4" /></div>
                    <button onClick={postComment} disabled={!comment.trim()} className={cn("rounded-lg px-3 py-1 text-sm font-medium", comment.trim() ? "bg-[var(--c-text)] text-[var(--c-bg)]" : "bg-[var(--c-bg3)] text-[var(--c-text3)]")}>Опубликовать</button>
                  </div>
                </div>
                <p className="mt-2 text-right text-xs text-[var(--c-text3)]">Комментарии видны только вам и сотрудникам</p>
                <div className="mt-4 space-y-3 border-l border-[var(--c-border)] pl-4 text-sm">
                  <div className="text-[var(--c-text3)]">Сегодня</div>
                  {timeline.map((t, i) => (
                    <div key={i} className="flex items-center justify-between"><span className="text-[var(--c-text)]">{t.text}</span><span className="text-[var(--c-text3)]">{t.at}</span></div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* RIGHT */}
          <div className="space-y-5">
            <SideCard title="Заметки" onEdit={() => setModal("note")}>
              <p className="text-sm text-[var(--c-text3)]">{notes || "Без заметок"}</p>
            </SideCard>
            <SideCard title="Клиент">
              <CustomerSearch customers={customers} selected={customer} onSelect={setCustomer} />
            </SideCard>
            <SideCard title="Рынок" right={<button onClick={() => setModal("share")} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"><Share2 className="h-4 w-4" /></button>}>
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--c-bg3)] px-2 py-1 text-sm text-[var(--c-text)]"><Globe className="h-4 w-4 text-[var(--c-text3)]" /> Россия</span>
              <p className="mt-3 text-xs text-[var(--c-text3)]">Валюта</p>
              <div className="relative mt-1">
                <select className="w-full appearance-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 pr-7 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]">
                  <option>Рубль (RUB ₽)</option><option>Тенге (KZT ₸)</option><option>Бел. рубль (BYN)</option>
                </select>
                <ChevronsUpDown className="pointer-events-none absolute right-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--c-text3)]" />
              </div>
            </SideCard>
            <SideCard title="Теги" onEdit={() => setEditTags((v) => !v)}>
              {editTags || tags ? (
                <input value={tags} onChange={(e) => setTags(e.target.value)} placeholder="Найти или создать теги" className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
              ) : (
                <p className="text-sm text-[var(--c-text3)]">Нет тегов</p>
              )}
            </SideCard>
          </div>
        </div>
      </div>

      {/* Modals */}
      {modal === "picker" && <ProductPicker products={products} onAdd={(p) => { addProducts(p); setModal(null); }} onClose={() => setModal(null)} />}
      {modal === "custom" && <CustomItemModal onAdd={(n, p, q) => { addCustom(n, p, q); setModal(null); }} onClose={() => setModal(null)} />}
      {modal === "discount" && <DiscountModal onClose={() => setModal(null)} onApply={(d) => { setDiscount(d); setModal(null); }} />}
      {modal === "shipping" && <ShippingModal hasCustomer={!!customer} onClose={() => setModal(null)} onApply={(s) => { setShipping(s); setModal(null); }} />}
      {modal === "invoice" && <InvoiceModal draftNo={draftNo} onClose={() => setModal(null)} />}
      {modal === "markpaid" && <Dialog title="Отметить оплаченным" onClose={() => setModal(null)} confirmLabel="Создать заказ" onConfirm={markAsPaid} body="Будет создан заказ без оплаты. Платёж не требуется." />}
      {modal === "share" && <ShareModal onClose={() => setModal(null)} />}
      {modal === "note" && <NoteModal value={notes} onClose={() => setModal(null)} onSave={(v) => { setNotes(v); setModal(null); }} />}
    </>
  );
}

function plural(n: number) { const m = n % 10, h = n % 100; if (m === 1 && h !== 11) return "товар"; if (m >= 2 && m <= 4 && (h < 10 || h >= 20)) return "товара"; return "товаров"; }
function Card({ children }: { children: ReactNode }) { return <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">{children}</div>; }
function HBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) { return <button onClick={onClick} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">{children}</button>; }
function OutlineBtn({ children, onClick }: { children: ReactNode; onClick?: () => void }) { return <button onClick={onClick} className="inline-flex items-center gap-1 rounded-lg border border-[var(--c-border2)] px-2.5 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">{children}</button>; }
function Row({ label, sub, value, muted }: { label: ReactNode; sub: string; value: string; muted?: boolean }) {
  return (<div className="flex items-center justify-between gap-3 border-b border-[var(--c-border)] px-4 py-3 text-sm"><span className={muted ? "text-[var(--c-text3)]" : "text-[var(--c-text)]"}>{label}</span><span className="flex-1 text-[var(--c-text3)]">{sub}</span><span className={muted ? "text-[var(--c-text3)]" : "text-[var(--c-text)]"}>{value}</span></div>);
}
function SideCard({ title, onEdit, right, children }: { title: string; onEdit?: () => void; right?: ReactNode; children: ReactNode }) {
  return (<div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4"><div className="mb-2 flex items-center justify-between"><h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>{right ?? (onEdit && <button onClick={onEdit} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"><Pencil className="h-3.5 w-3.5" /></button>)}</div>{children}</div>);
}

function CustomerSearch({ customers, selected, onSelect }: { customers: Customer[]; selected: Customer | null; onSelect: (c: Customer | null) => void }) {
  const [q, setQ] = useState(""); const [open, setOpen] = useState(false);
  const matches = useMemo(() => (q.trim() ? customers.filter((c) => c.name?.toLowerCase().includes(q.toLowerCase())) : customers).slice(0, 6), [customers, q]);
  if (selected) return (<div className="flex items-center justify-between rounded-lg border border-[var(--c-border2)] px-2.5 py-2"><span className="text-sm text-[var(--c-text)]">{selected.name}</span><button onClick={() => onSelect(null)} className="rounded p-0.5 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button></div>);
  return (
    <div className="relative">
      <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-2.5 py-2 focus-within:border-[var(--c-blue)]"><Search className="h-4 w-4 text-[var(--c-text3)]" /><input value={q} onChange={(e) => setQ(e.target.value)} onFocus={() => setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 150)} placeholder="Поиск клиента" className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]" /></div>
      {open && (<div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl"><Link href="/inventory/customers" className="flex items-center gap-2 border-b border-[var(--c-border)] px-3 py-2 text-sm font-medium text-[var(--c-blue)] hover:bg-[var(--c-bg3)]"><UserPlus className="h-4 w-4" /> Добавить нового клиента</Link><div className="max-h-56 overflow-y-auto">{matches.length === 0 ? <div className="px-3 py-4 text-center text-sm text-[var(--c-text3)]">Клиенты не найдены</div> : matches.map((c) => <button key={c.id} onMouseDown={() => onSelect(c)} className="block w-full px-3 py-2 text-left text-sm text-[var(--c-text)] hover:bg-[var(--c-bg3)]">{c.name}</button>)}</div></div>)}
    </div>
  );
}

// ── Modal shell ───────────────────────────────────────────────────────────────
function ModalShell({ title, onClose, children, footer, width = "max-w-md" }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode; width?: string }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 animate-fade-in" onClick={onClose}>
      <div className={cn("w-full rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up", width)} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3"><h3 className="text-base font-semibold text-[var(--c-text)]">{title}</h3><button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button></div>
        <div className="p-4">{children}</div>
        {footer && <div className="flex justify-end gap-2 border-t border-[var(--c-border)] px-4 py-3">{footer}</div>}
      </div>
    </div>
  );
}
function GhostBtn({ children, onClick }: { children: ReactNode; onClick: () => void }) { return <button onClick={onClick} className="rounded-lg border border-[var(--c-border2)] px-4 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">{children}</button>; }
function PrimaryBtn({ children, onClick, disabled }: { children: ReactNode; onClick: () => void; disabled?: boolean }) { return <button onClick={onClick} disabled={disabled} className="rounded-lg bg-[var(--c-text)] px-4 py-1.5 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90 disabled:opacity-50">{children}</button>; }

function ProductPicker({ products, onAdd, onClose }: { products: Product[]; onAdd: (p: Product[]) => void; onClose: () => void }) {
  const [q, setQ] = useState(""); const [sel, setSel] = useState<Set<string>>(new Set());
  const filtered = products.filter((p) => !q || p.name.toLowerCase().includes(q.toLowerCase()) || p.sku.toLowerCase().includes(q.toLowerCase()));
  const toggle = (id: string) => setSel((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; });
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 animate-fade-in" onClick={onClose}>
      <div className="flex max-h-[80vh] w-full max-w-lg flex-col rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3"><h3 className="text-base font-semibold text-[var(--c-text)]">Выбрать товары</h3><button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button></div>
        <div className="border-b border-[var(--c-border)] px-4 py-2.5"><div className="flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-2.5 py-1.5"><Search className="h-4 w-4 text-[var(--c-text3)]" /><input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск товаров" className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]" /></div></div>
        <div className="min-h-[260px] flex-1 overflow-y-auto p-2">{filtered.length === 0 ? <div className="flex h-[260px] flex-col items-center justify-center gap-2 text-[var(--c-text3)]"><Ban className="h-6 w-6" /><span className="text-sm">Товары не найдены</span></div> : filtered.slice(0, 100).map((p) => (<label key={p.id} className="flex cursor-pointer items-center gap-3 rounded-lg px-3 py-2 hover:bg-[var(--c-bg3)]"><input type="checkbox" checked={sel.has(p.id)} onChange={() => toggle(p.id)} className="h-4 w-4 rounded border-[var(--c-border2)]" /><span className="flex h-8 w-8 items-center justify-center rounded-md border border-[var(--c-border)] bg-[var(--c-bg)] text-[var(--c-text3)]"><ImageIcon className="h-3.5 w-3.5" /></span><span className="min-w-0 flex-1"><span className="block truncate text-sm text-[var(--c-text)]">{p.name}</span>{p.sku && <span className="block text-xs text-[var(--c-text3)]">{p.sku}</span>}</span><span className="text-sm text-[var(--c-text2)]">{formatRub(p.price)}</span></label>))}</div>
        <div className="flex items-center justify-between border-t border-[var(--c-border)] px-4 py-3"><span className="rounded-md bg-[var(--c-bg3)] px-2 py-1 text-sm text-[var(--c-text2)]">{sel.size}/500 выбрано</span><div className="flex gap-2"><GhostBtn onClick={onClose}>Отмена</GhostBtn><PrimaryBtn disabled={sel.size === 0} onClick={() => onAdd(products.filter((p) => sel.has(p.id)))}>Добавить</PrimaryBtn></div></div>
      </div>
    </div>
  );
}

function CustomItemModal({ onAdd, onClose }: { onAdd: (name: string, price: number, qty: number) => void; onClose: () => void }) {
  const [name, setName] = useState(""); const [price, setPrice] = useState(""); const [qty, setQty] = useState("1");
  const [taxable, setTaxable] = useState(true); const [physical, setPhysical] = useState(true); const [weight, setWeight] = useState("0"); const [err, setErr] = useState(false);
  function add() { if (!name.trim()) { setErr(true); return; } onAdd(name.trim(), parseFloat(price) || 0, Math.max(1, parseInt(qty) || 1)); }
  return (
    <ModalShell title="Произвольная позиция" onClose={onClose} footer={<><GhostBtn onClick={onClose}>Отмена</GhostBtn><PrimaryBtn onClick={add}>Добавить позицию</PrimaryBtn></>}>
      <div className="space-y-4">
        <div className="grid grid-cols-[1fr_auto_auto] gap-3">
          <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">Название</span><input value={name} onChange={(e) => { setName(e.target.value); setErr(false); }} className={cn("w-full rounded-lg border bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none", err ? "border-[var(--c-red)]" : "border-[var(--c-border2)] focus:border-[var(--c-blue)]")} />{err && <span className="mt-1 block text-xs text-[var(--c-red)]">Укажите название позиции</span>}</label>
          <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">Цена</span><div className="flex w-28 items-center rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 focus-within:border-[var(--c-blue)]"><span className="text-sm text-[var(--c-text3)]">₽</span><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0" className="w-full bg-transparent px-1.5 py-2 text-sm text-[var(--c-text)] outline-none" /></div></label>
          <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">Кол-во</span><input value={qty} onChange={(e) => setQty(e.target.value)} inputMode="numeric" className="w-20 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" /></label>
        </div>
        <label className="flex items-center gap-2 text-sm text-[var(--c-text)]"><input type="checkbox" checked={taxable} onChange={(e) => setTaxable(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" /> Облагается налогом</label>
        <label className="flex items-center gap-2 text-sm text-[var(--c-text)]"><input type="checkbox" checked={physical} onChange={(e) => setPhysical(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" /> Физический товар</label>
        {physical && (
          <div><p className="text-sm text-[var(--c-text)]">Вес (необязательно)</p><div className="mt-1 flex gap-2"><input value={weight} onChange={(e) => setWeight(e.target.value)} inputMode="decimal" className="flex-1 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" /><select className="rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2 py-2 text-sm text-[var(--c-text)]"><option>кг</option><option>г</option><option>фунт</option><option>унц</option></select></div><p className="mt-1 text-xs text-[var(--c-text3)]">Используется для точного расчёта доставки</p></div>
        )}
      </div>
    </ModalShell>
  );
}

function DiscountModal({ onClose, onApply }: { onClose: () => void; onApply: (d: Discount) => void }) {
  const [custom, setCustom] = useState(false); const [type, setType] = useState<"amount" | "percent">("amount"); const [value, setValue] = useState(""); const [reason, setReason] = useState("");
  return (
    <ModalShell title="Добавить скидку" onClose={onClose} footer={<><GhostBtn onClick={onClose}>Отмена</GhostBtn><PrimaryBtn disabled={!custom || !value} onClick={() => onApply({ type, value: parseFloat(value) || 0, reason })}>Готово</PrimaryBtn></>}>
      <div className="space-y-3">
        <div className="rounded-lg border border-[var(--c-border)] p-3 text-sm text-[var(--c-text2)]">Скидки не настроены. <a href="/inventory/promotions" target="_blank" rel="noreferrer" className="text-[var(--c-blue)] hover:underline">Создать скидку ↗</a></div>
        <label className="flex items-center gap-2 text-sm text-[var(--c-text)]"><input type="checkbox" checked={custom} onChange={(e) => setCustom(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" /> Произвольная скидка для заказа</label>
        {custom && (
          <div className="space-y-3">
            <div className="flex gap-2">
              <select value={type} onChange={(e) => setType(e.target.value as "amount" | "percent")} className="rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)]"><option value="amount">Сумма (₽)</option><option value="percent">Процент (%)</option></select>
              <input value={value} onChange={(e) => setValue(e.target.value)} inputMode="decimal" placeholder={type === "amount" ? "0 ₽" : "0 %"} className="flex-1 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
            </div>
            <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">Причина скидки</span><input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Видна клиенту" className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" /></label>
          </div>
        )}
      </div>
    </ModalShell>
  );
}

function ShippingModal({ hasCustomer, onClose, onApply }: { hasCustomer: boolean; onClose: () => void; onApply: (s: Shipping) => void }) {
  const [name, setName] = useState(""); const [price, setPrice] = useState("");
  return (
    <ModalShell title="Доставка" onClose={onClose} footer={<><GhostBtn onClick={onClose}>Отмена</GhostBtn><PrimaryBtn disabled={!name || !price} onClick={() => onApply({ name: name || "Доставка", price: parseFloat(price) || 0 })}>Готово</PrimaryBtn></>}>
      <div className="space-y-3">
        {!hasCustomer && <div className="rounded-lg border border-[var(--c-amber)]/40 bg-[var(--c-amber)]/10 p-2.5 text-sm text-[var(--c-text2)]">Добавьте адрес клиента, чтобы получить варианты доставки.</div>}
        <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">Название</span><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Бесплатная доставка" className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" /></label>
        <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">Цена</span><input value={price} onChange={(e) => setPrice(e.target.value)} inputMode="decimal" placeholder="0 ₽" className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" /></label>
      </div>
    </ModalShell>
  );
}

function InvoiceModal({ draftNo, onClose }: { draftNo: string; onClose: () => void }) {
  const [cc, setCc] = useState(false);
  return (
    <ModalShell width="max-w-lg" title="Отправить счёт" onClose={onClose} footer={<><GhostBtn onClick={onClose}>Отмена</GhostBtn><PrimaryBtn onClick={onClose}>Просмотреть счёт</PrimaryBtn></>}>
      <div className="space-y-3">
        <Field label="Кому"><input placeholder="email клиента" className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" /></Field>
        <Field label="От"><select className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)]"><option>store@sellermap.ru</option></select></Field>
        <button onClick={() => setCc((v) => !v)} className="text-sm text-[var(--c-blue)] hover:underline">Копия и скрытая копия {cc ? "▴" : "▾"}</button>
        {cc && <Field label="Копия (Cc)"><input className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" /></Field>}
        <Field label="Тема"><input defaultValue={`Счёт ${draftNo}`} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" /></Field>
        <Field label="Сообщение"><textarea rows={3} className="w-full resize-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" /></Field>
      </div>
    </ModalShell>
  );
}

function ShareModal({ onClose }: { onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  const [lock, setLock] = useState(true); const [codes, setCodes] = useState(false);
  return (
    <ModalShell title="Поделиться ссылкой на оформление" onClose={onClose} footer={<><GhostBtn onClick={onClose}>Закрыть</GhostBtn><button onClick={() => { navigator.clipboard?.writeText("https://shop.sellermap.ru/checkout/demo").catch(() => {}); setCopied(true); }} className="flex items-center gap-1.5 rounded-lg bg-[var(--c-text)] px-4 py-1.5 text-sm font-medium text-[var(--c-bg)]">{copied ? <><Check className="h-4 w-4" /> Скопировано</> : "Копировать ссылку"}</button></>}>
      <p className="text-sm text-[var(--c-text2)]">Поделитесь ссылкой на оформление заказа с клиентом.</p>
      <label className="mt-3 flex items-center justify-between gap-2 text-sm text-[var(--c-text)]">Зафиксировать цены <input type="checkbox" checked={lock} onChange={(e) => setLock(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" /></label>
      <label className="mt-2 flex items-center justify-between gap-2 text-sm text-[var(--c-text)]">Разрешить промокоды <input type="checkbox" checked={codes} onChange={(e) => setCodes(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" /></label>
    </ModalShell>
  );
}

function NoteModal({ value, onClose, onSave }: { value: string; onClose: () => void; onSave: (v: string) => void }) {
  const [text, setText] = useState(value);
  return (
    <ModalShell title="Заметка" onClose={onClose} footer={<><GhostBtn onClick={onClose}>Отмена</GhostBtn><PrimaryBtn onClick={() => onSave(text)}>Готово</PrimaryBtn></>}>
      <textarea autoFocus value={text} maxLength={5000} onChange={(e) => setText(e.target.value)} rows={5} className="w-full resize-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
      <p className="mt-1 text-right text-xs text-[var(--c-text3)]">{text.length}/5000</p>
    </ModalShell>
  );
}

function Dialog({ title, body, confirmLabel, onConfirm, onClose }: { title: string; body: string; confirmLabel: string; onConfirm: () => void; onClose: () => void }) {
  return (
    <ModalShell title={title} onClose={onClose} footer={<><GhostBtn onClick={onClose}>Отмена</GhostBtn><PrimaryBtn onClick={onConfirm}>{confirmLabel}</PrimaryBtn></>}>
      <p className="text-sm text-[var(--c-text2)]">{body}</p>
    </ModalShell>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) { return <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">{label}</span>{children}</label>; }
