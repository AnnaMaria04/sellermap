"use client";

import { useEffect, useMemo, useState } from "react";
import { Store, ShoppingCart, X, Plus, Minus, Check } from "lucide-react";
import {
  loadStorefront, submitStoreOrder, type StorefrontSettings, type StoreProduct,
} from "@/lib/storefront/settings";

function rub(n: number) {
  return new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 }).format(n);
}

export default function PublicStorePage() {
  const [s, setS] = useState<StorefrontSettings | null>(null);
  const [cart, setCart] = useState<Record<string, number>>({});
  const [cartOpen, setCartOpen] = useState(false);
  const [checkout, setCheckout] = useState(false);
  const [done, setDone] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", address: "" });

  useEffect(() => { setS(loadStorefront()); }, []);

  const products = s?.products ?? [];
  const accent = s?.accent ?? "#16a34a";
  const lines = useMemo(
    () => Object.entries(cart).map(([id, qty]) => ({ p: products.find((x) => x.id === id), qty })).filter((l): l is { p: StoreProduct; qty: number } => !!l.p),
    [cart, products],
  );
  const total = lines.reduce((sum, l) => sum + l.p.price * l.qty, 0);
  const count = lines.reduce((n, l) => n + l.qty, 0);

  const add = (id: string) => setCart((c) => ({ ...c, [id]: (c[id] ?? 0) + 1 }));
  const dec = (id: string) => setCart((c) => { const n = (c[id] ?? 0) - 1; const next = { ...c }; if (n <= 0) delete next[id]; else next[id] = n; return next; });

  async function placeOrder() {
    if (!s || submitting) return;
    setSubmitting(true);
    try {
      const { number } = await submitStoreOrder(s, {
        customer: { ...form },
        items: lines.map((l) => ({ id: l.p.id, name: l.p.name, price: l.p.price, qty: l.qty })),
        total,
      });
      setDone(number);
      setCart({});
      setCheckout(false);
      setCartOpen(false);
    } finally {
      setSubmitting(false);
    }
  }

  if (s && !s.published) {
    return <Centered><p className="text-[var(--c-text2)]">Магазин ещё не опубликован.</p></Centered>;
  }
  if (!s) return <Centered><p className="text-[var(--c-text3)]">Загрузка…</p></Centered>;

  if (done) {
    return (
      <Centered>
        <span className="flex h-14 w-14 items-center justify-center rounded-full text-white" style={{ background: accent }}><Check className="h-7 w-7" /></span>
        <h1 className="mt-4 text-xl font-bold text-[var(--c-text)]">Заказ оформлен!</h1>
        <p className="mt-1 text-sm text-[var(--c-text2)]">Номер заказа <b>{done}</b>. Мы свяжемся с вами для подтверждения.</p>
        <button onClick={() => setDone(null)} className="mt-5 rounded-lg px-4 py-2 text-sm font-medium text-white" style={{ background: accent }}>Вернуться в магазин</button>
      </Centered>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--c-bg)]">
      {/* Header */}
      <header className="sticky top-0 z-20 text-white" style={{ background: accent }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
          <div>
            <div className="flex items-center gap-2 text-base font-semibold"><Store className="h-5 w-5" /> {s.name}</div>
            <p className="text-xs opacity-90">{s.tagline}</p>
          </div>
          <button onClick={() => setCartOpen(true)} className="relative rounded-lg bg-white/20 p-2 hover:bg-white/30">
            <ShoppingCart className="h-5 w-5" />
            {count > 0 && <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-white px-1 text-xs font-bold" style={{ color: accent }}>{count}</span>}
          </button>
        </div>
      </header>

      {/* Grid */}
      <main className="mx-auto max-w-5xl px-4 py-6">
        {products.length === 0 ? (
          <p className="py-20 text-center text-[var(--c-text3)]">В магазине пока нет товаров.</p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {products.map((p) => (
              <div key={p.id} className="flex flex-col overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
                <div className="flex h-36 items-center justify-center bg-[var(--c-bg3)] text-[var(--c-text3)]">
                  {p.image ? <img src={p.image} alt={p.name} className="h-full w-full object-cover" /> : <Store className="h-8 w-8" />}
                </div>
                <div className="flex flex-1 flex-col p-3">
                  <div className="text-sm font-medium text-[var(--c-text)]">{p.name}</div>
                  {p.description && <div className="mt-0.5 line-clamp-2 text-xs text-[var(--c-text3)]">{p.description}</div>}
                  <div className="mt-2 flex items-center justify-between">
                    <span className="text-sm font-bold" style={{ color: accent }}>{rub(p.price)}</span>
                    <button onClick={() => add(p.id)} className="rounded-lg px-2.5 py-1 text-xs font-medium text-white" style={{ background: accent }}>В корзину</button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
        {s.contact && <p className="mt-8 text-center text-sm text-[var(--c-text3)]">Связь: {s.contact}</p>}
      </main>

      {/* Cart drawer */}
      {cartOpen && (
        <div className="fixed inset-0 z-30 flex justify-end bg-black/40" onClick={() => setCartOpen(false)}>
          <div className="flex h-full w-full max-w-sm flex-col bg-[var(--c-bg2)]" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
              <h2 className="text-base font-semibold text-[var(--c-text)]">Корзина</h2>
              <button onClick={() => setCartOpen(false)} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {lines.length === 0 ? <p className="py-10 text-center text-sm text-[var(--c-text3)]">Корзина пуста</p> : lines.map((l) => (
                <div key={l.p.id} className="flex items-center gap-3 border-b border-[var(--c-border)] py-3">
                  <div className="min-w-0 flex-1"><div className="truncate text-sm text-[var(--c-text)]">{l.p.name}</div><div className="text-xs text-[var(--c-text3)]">{rub(l.p.price)}</div></div>
                  <div className="flex items-center gap-1.5">
                    <button onClick={() => dec(l.p.id)} className="rounded border border-[var(--c-border2)] p-1 text-[var(--c-text2)]"><Minus className="h-3.5 w-3.5" /></button>
                    <span className="w-6 text-center text-sm">{l.qty}</span>
                    <button onClick={() => add(l.p.id)} className="rounded border border-[var(--c-border2)] p-1 text-[var(--c-text2)]"><Plus className="h-3.5 w-3.5" /></button>
                  </div>
                </div>
              ))}
            </div>
            {lines.length > 0 && (
              <div className="border-t border-[var(--c-border)] p-4">
                <div className="mb-3 flex items-center justify-between text-sm"><span className="text-[var(--c-text2)]">Итого</span><span className="font-bold text-[var(--c-text)]">{rub(total)}</span></div>
                <button onClick={() => { setCartOpen(false); setCheckout(true); }} className="w-full rounded-lg py-2.5 text-sm font-medium text-white" style={{ background: accent }}>Оформить заказ</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout */}
      {checkout && (
        <div className="fixed inset-0 z-40 flex items-start justify-center bg-black/40 p-4 pt-16" onClick={() => setCheckout(false)}>
          <div className="w-full max-w-md rounded-2xl bg-[var(--c-bg2)] p-5" onClick={(e) => e.stopPropagation()}>
            <h2 className="text-base font-semibold text-[var(--c-text)]">Оформление заказа</h2>
            <div className="mt-3 space-y-3">
              <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="Имя" className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
              <input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="Телефон" className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
              <input value={form.address} onChange={(e) => setForm({ ...form, address: e.target.value })} placeholder="Адрес доставки" className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
            </div>
            <div className="mt-3 flex items-center justify-between text-sm"><span className="text-[var(--c-text2)]">К оплате</span><span className="font-bold text-[var(--c-text)]">{rub(total)}</span></div>
            <button onClick={placeOrder} disabled={!form.name || !form.phone || submitting} className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-white disabled:opacity-50" style={{ background: accent }}>{submitting ? "Оформляем…" : "Подтвердить заказ"}</button>
            <p className="mt-2 text-center text-xs text-[var(--c-text3)]">Оплата при получении</p>
          </div>
        </div>
      )}
    </div>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--c-bg)] px-6 text-center">{children}</div>;
}
