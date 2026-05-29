"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Check, ExternalLink, Store, Search } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { useInventory } from "@/contexts/InventoryContext";
import { formatRub, cn } from "@/lib/utils";
import {
  loadStorefront, saveStorefront, ACCENT_PRESETS,
  type StorefrontSettings, type StoreProduct,
} from "@/lib/storefront/settings";

export default function StorefrontBuilderPage() {
  const { products, orgId } = useInventory();
  const [s, setS] = useState<StorefrontSettings>(loadStorefront);
  const [q, setQ] = useState("");
  const [savedAt, setSavedAt] = useState(false);

  // Snapshot the shop id so the public /store can route checkouts to this back
  // office through the service-role endpoint.
  useEffect(() => {
    if (orgId && s.orgId !== orgId) setS((prev) => ({ ...prev, orgId }));
  }, [orgId, s.orgId]);

  // Persist on every change (builder ↔ /store share localStorage).
  useEffect(() => { saveStorefront(s); }, [s]);

  const publishedIds = useMemo(() => new Set(s.products.map((p) => p.id)), [s.products]);
  const catalog = useMemo(
    () => products.filter((p) => p.status === "active" && (!q || p.name.toLowerCase().includes(q.toLowerCase()))),
    [products, q],
  );

  function togglePublish(id: string) {
    setS((prev) => {
      if (publishedIds.has(id)) return { ...prev, products: prev.products.filter((p) => p.id !== id) };
      const src = products.find((p) => p.id === id);
      if (!src) return prev;
      const sp: StoreProduct = { id: src.id, name: src.name, price: src.price, image: src.imageUrl, description: src.description, category: src.category };
      return { ...prev, products: [...prev.products, sp] };
    });
  }

  function publishStore(v: boolean) {
    setS((prev) => ({ ...prev, published: v }));
    setSavedAt(true);
    setTimeout(() => setSavedAt(false), 1500);
  }

  const update = <K extends keyof StorefrontSettings>(k: K, v: StorefrontSettings[K]) => setS((prev) => ({ ...prev, [k]: v }));

  return (
    <InventoryShell
      title="Витрина (свой сайт)"
      subtitle="Соберите витрину из каталога и принимайте заказы онлайн"
      actions={
        <Link href="/store" target="_blank" className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">
          <ExternalLink className="h-4 w-4" /> Открыть витрину
        </Link>
      }
    >
      <div className="mx-auto grid max-w-[1100px] gap-5 lg:grid-cols-[1fr_360px]">
        {/* Builder */}
        <div className="space-y-5">
          <section className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-[var(--c-text)]">Оформление</h2>
              <label className="flex items-center gap-2 text-sm text-[var(--c-text)]">
                {savedAt && <span className="text-xs text-[var(--c-green)]">Сохранено</span>}
                <span>Опубликовано</span>
                <button role="switch" aria-checked={s.published} aria-label="Опубликовать витрину" onClick={() => publishStore(!s.published)}
                  className={cn("relative h-6 w-11 rounded-full transition", s.published ? "bg-[var(--c-green)]" : "bg-[var(--c-bg3)]")}>
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", s.published ? "left-[22px]" : "left-0.5")} />
                </button>
              </label>
            </div>
            <div className="mt-3 space-y-3">
              <Field label="Название магазина"><Input value={s.name} onChange={(v) => update("name", v)} /></Field>
              <Field label="Слоган"><Input value={s.tagline} onChange={(v) => update("tagline", v)} /></Field>
              <Field label="Контакт (телефон / email / @telegram)"><Input value={s.contact} onChange={(v) => update("contact", v)} /></Field>
              <div>
                <p className="mb-1 text-sm text-[var(--c-text)]">Цвет бренда</p>
                <div className="flex items-center gap-2">
                  {ACCENT_PRESETS.map((c) => (
                    <button key={c} aria-label={`Цвет ${c}`} onClick={() => update("accent", c)}
                      className={cn("h-7 w-7 rounded-full border-2", s.accent === c ? "border-[var(--c-text)]" : "border-transparent")}
                      style={{ background: c }} />
                  ))}
                  <input type="color" value={s.accent} onChange={(e) => update("accent", e.target.value)} className="h-7 w-10 cursor-pointer rounded border border-[var(--c-border2)] bg-transparent" />
                </div>
              </div>
            </div>
          </section>

          <section className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
            <div className="mb-3 flex items-center justify-between gap-3">
              <h2 className="text-sm font-semibold text-[var(--c-text)]">Товары на витрине <span className="text-[var(--c-text3)]">({s.products.length})</span></h2>
              <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-2.5 py-1.5">
                <Search className="h-4 w-4 text-[var(--c-text3)]" />
                <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Поиск" className="w-32 bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]" />
              </div>
            </div>
            <div className="max-h-80 divide-y divide-[var(--c-border)] overflow-y-auto">
              {catalog.length === 0 ? (
                <p className="py-6 text-center text-sm text-[var(--c-text3)]">Нет активных товаров. Добавьте их в каталоге.</p>
              ) : catalog.map((p) => (
                <label key={p.id} className="flex cursor-pointer items-center gap-3 py-2.5">
                  <input type="checkbox" checked={publishedIds.has(p.id)} onChange={() => togglePublish(p.id)} className="h-4 w-4 rounded border-[var(--c-border2)]" />
                  <span className="min-w-0 flex-1 truncate text-sm text-[var(--c-text)]">{p.name}</span>
                  <span className="text-sm text-[var(--c-text2)]">{formatRub(p.price)}</span>
                </label>
              ))}
            </div>
          </section>
        </div>

        {/* Live preview */}
        <div className="lg:sticky lg:top-6 lg:self-start">
          <p className="mb-2 text-xs font-medium uppercase text-[var(--c-text3)]">Предпросмотр</p>
          <div className="overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)]">
            <div className="p-4 text-white" style={{ background: s.accent }}>
              <div className="flex items-center gap-2 text-sm font-semibold"><Store className="h-4 w-4" /> {s.name || "Мой магазин"}</div>
              <p className="mt-0.5 text-xs opacity-90">{s.tagline}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 p-3">
              {s.products.slice(0, 4).map((p) => (
                <div key={p.id} className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] p-2">
                  <div className="mb-1 flex h-16 items-center justify-center rounded bg-[var(--c-bg3)] text-[var(--c-text3)]">
                    {p.image ? <img src={p.image} alt="" className="h-full w-full rounded object-cover" /> : <Store className="h-5 w-5" />}
                  </div>
                  <div className="truncate text-xs text-[var(--c-text)]">{p.name}</div>
                  <div className="text-xs font-semibold" style={{ color: s.accent }}>{formatRub(p.price)}</div>
                </div>
              ))}
              {s.products.length === 0 && <p className="col-span-2 py-6 text-center text-xs text-[var(--c-text3)]">Выберите товары слева</p>}
            </div>
            <div className="border-t border-[var(--c-border)] p-3">
              <button className="w-full rounded-lg py-2 text-sm font-medium text-white" style={{ background: s.accent }}>В корзину</button>
            </div>
          </div>
          {s.published && (
            <p className="mt-3 flex items-center gap-1.5 text-xs text-[var(--c-green)]"><Check className="h-3.5 w-3.5" /> Витрина опубликована — доступна по адресу /store</p>
          )}
        </div>
      </div>
    </InventoryShell>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">{label}</span>{children}</label>;
}
function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />;
}
