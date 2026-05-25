"use client";

import { useState } from "react";
import {
  Plus,
  Search,
  Star,
  Phone,
  Mail,
  Globe,
  MessageCircle,
  ChevronRight,
  X,
  Check,
  Building2,
  Truck,
  Package,
  Edit3,
  Trash2,
} from "lucide-react";
import { type Supplier, type Product } from "@/mock/inventory";
import { useInventory } from "@/contexts/InventoryContext";
import { EmptyState } from "@/components/inventory/ui/EmptyState";
import { cn } from "@/lib/utils";

export function SuppliersPanel() {
  const { suppliers, products, actions } = useInventory();
  const [search, setSearch] = useState("");
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showForm, setShowForm] = useState(false);

  const filtered = suppliers.filter(
    (s) =>
      search === "" ||
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.country.toLowerCase().includes(search.toLowerCase()),
  );

  const supplierProducts = (supplierId: string) =>
    products.filter((p) => p.supplierId === supplierId);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--c-text3)]" />
          <input
            type="text"
            placeholder="Поиск поставщика..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] pl-9 pr-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
          />
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
        >
          <Plus size={15} />
          Добавить поставщика
        </button>
      </div>

      {/* Empty state */}
      {filtered.length === 0 && (
        <EmptyState
          icon={<Building2 size={24} />}
          title="Нет поставщиков"
          description="Поставщики не найдены. Измените поиск или добавьте нового поставщика."
          action={
            <button
              onClick={() => setShowForm(true)}
              className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
            >
              <Plus size={15} />
              Добавить поставщика
            </button>
          }
        />
      )}

      {/* Supplier grid */}
      {filtered.length > 0 && (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        {filtered.map((supplier) => {
          const products = supplierProducts(supplier.id);
          return (
            <div
              key={supplier.id}
              onClick={() => setSelectedSupplier(supplier)}
              className="group flex cursor-pointer flex-col gap-4 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5 transition hover:border-[var(--c-border2)] hover:bg-[var(--c-bg3)]"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] text-lg">
                    {supplier.country === "Китай" ? "🇨🇳" : supplier.country === "Германия" ? "🇩🇪" : "🇷🇺"}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-[var(--c-text)]">{supplier.name}</p>
                    <p className="text-xs text-[var(--c-text3)]">{supplier.country}{supplier.city ? `, ${supplier.city}` : ""}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Star size={13} className="text-[var(--c-amber)] fill-[var(--c-amber)]" />
                  <span className="text-xs font-medium text-[var(--c-text)]">{supplier.rating}</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center">
                <SupplierStat label="Срок" value={`${supplier.leadTimeDays}д`} />
                <SupplierStat label="Мин. заказ" value={supplier.minOrderQty ? `${supplier.minOrderQty}шт` : "—"} />
                <SupplierStat label="Товаров" value={products.length} />
              </div>

              {supplier.contactName && (
                <div className="flex items-center gap-2">
                  <div className="h-6 w-6 rounded-full bg-[var(--c-bg3)] border border-[var(--c-border)] flex items-center justify-center">
                    <span className="text-xs">{supplier.contactName[0]}</span>
                  </div>
                  <p className="text-xs text-[var(--c-text2)]">{supplier.contactName}</p>
                </div>
              )}

              <div className="flex items-center gap-3">
                {supplier.phone && (
                  <a href={`tel:${supplier.phone}`} onClick={(e) => e.stopPropagation()} className="text-[var(--c-text3)] hover:text-[var(--c-text)] transition">
                    <Phone size={13} />
                  </a>
                )}
                {supplier.email && (
                  <a href={`mailto:${supplier.email}`} onClick={(e) => e.stopPropagation()} className="text-[var(--c-text3)] hover:text-[var(--c-text)] transition">
                    <Mail size={13} />
                  </a>
                )}
                {supplier.website && (
                  <a href={supplier.website} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[var(--c-text3)] hover:text-[var(--c-text)] transition">
                    <Globe size={13} />
                  </a>
                )}
                {supplier.telegramHandle && (
                  <a href={`https://t.me/${supplier.telegramHandle.replace("@", "")}`} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()} className="text-[var(--c-text3)] hover:text-[var(--c-text)] transition">
                    <MessageCircle size={13} />
                  </a>
                )}
                <span className="ml-auto text-xs text-[var(--c-text3)]">{supplier.currency}</span>
                <ChevronRight size={14} className="text-[var(--c-text3)] opacity-0 group-hover:opacity-100 transition" />
              </div>
            </div>
          );
        })}
      </div>
      )}

      {/* Supplier detail */}
      {selectedSupplier && (
        <SupplierDetailPanel
          supplier={selectedSupplier}
          products={supplierProducts(selectedSupplier.id)}
          onClose={() => setSelectedSupplier(null)}
        />
      )}

      {/* Add supplier form */}
      {showForm && (
        <AddSupplierForm onClose={() => setShowForm(false)} />
      )}
    </div>
  );
}

function SupplierStat({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] py-2">
      <p className="text-xs text-[var(--c-text3)]">{label}</p>
      <p className="text-sm font-semibold text-[var(--c-text)] tabular">{value}</p>
    </div>
  );
}

function SupplierDetailPanel({
  supplier,
  products,
  onClose,
}: {
  supplier: Supplier;
  products: Product[];
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-lg flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] text-lg">
              {supplier.country === "Китай" ? "🇨🇳" : supplier.country === "Германия" ? "🇩🇪" : "🇷🇺"}
            </div>
            <div>
              <h2 className="text-base font-semibold text-[var(--c-text)]">{supplier.name}</h2>
              <p className="text-xs text-[var(--c-text2)]">{supplier.country}{supplier.city ? `, ${supplier.city}` : ""}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
              <Edit3 size={15} />
            </button>
            <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Rating */}
          <div className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                size={16}
                className={star <= Math.round(supplier.rating) ? "text-[var(--c-amber)] fill-[var(--c-amber)]" : "text-[var(--c-border2)]"}
              />
            ))}
            <span className="ml-1 text-sm font-medium text-[var(--c-text)]">{supplier.rating}</span>
          </div>

          {/* Contact info */}
          <Section title="Контакты">
            <div className="space-y-2">
              {supplier.contactName && <ContactRow icon={<Building2 size={14} />} label="Контакт" value={supplier.contactName} />}
              {supplier.email && <ContactRow icon={<Mail size={14} />} label="Email" value={supplier.email} href={`mailto:${supplier.email}`} />}
              {supplier.phone && <ContactRow icon={<Phone size={14} />} label="Телефон" value={supplier.phone} href={`tel:${supplier.phone}`} />}
              {supplier.website && <ContactRow icon={<Globe size={14} />} label="Сайт" value={supplier.website} href={supplier.website} />}
              {supplier.telegramHandle && <ContactRow icon={<MessageCircle size={14} />} label="Telegram" value={supplier.telegramHandle} href={`https://t.me/${supplier.telegramHandle.replace("@", "")}`} />}
            </div>
          </Section>

          {/* Terms */}
          <Section title="Условия">
            <div className="grid grid-cols-2 gap-3">
              <InfoCell label="Срок доставки" value={`${supplier.leadTimeDays} дней`} />
              <InfoCell label="Мин. заказ" value={supplier.minOrderQty ? `${supplier.minOrderQty} шт` : "—"} />
              <InfoCell label="Валюта" value={supplier.currency} />
              <InfoCell label="Оплата" value={supplier.paymentTerms ?? "—"} />
            </div>
          </Section>

          {/* Products */}
          {products.length > 0 && (
            <Section title={`Товары (${products.length})`}>
              <div className="space-y-2">
                {products.map((p) => (
                  <div key={p.id} className="flex items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3">
                    <Package size={15} className="text-[var(--c-text3)] shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--c-text)] truncate">{p.name}</p>
                      <p className="text-xs text-[var(--c-text3)]">{p.sku}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-semibold text-[var(--c-text)] tabular">{p.costPrice.toLocaleString("ru-RU")} ₽</p>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {supplier.notes && (
            <Section title="Заметки">
              <p className="text-sm text-[var(--c-text2)]">{supplier.notes}</p>
            </Section>
          )}
        </div>

        <div className="border-t border-[var(--c-border)] bg-[var(--c-bg2)] p-4 space-y-2">
          <button className="flex w-full h-10 items-center justify-center gap-2 rounded-lg bg-[var(--c-green)] text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition">
            <Plus size={16} />
            Создать заказ поставщику
          </button>
          <button className="flex w-full h-9 items-center justify-center gap-2 rounded-lg border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
            Загрузить прайс-лист
          </button>
        </div>
      </div>
    </div>
  );
}

function ContactRow({ icon, label, value, href }: { icon: React.ReactNode; label: string; value: string; href?: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] px-3 py-2.5">
      <span className="text-[var(--c-text3)]">{icon}</span>
      <div className="flex-1">
        <p className="text-xs text-[var(--c-text3)]">{label}</p>
        {href ? (
          <a href={href} target={href.startsWith("http") ? "_blank" : undefined} rel="noopener noreferrer" className="text-sm text-[var(--c-blue)] hover:opacity-80 transition">
            {value}
          </a>
        ) : (
          <p className="text-sm text-[var(--c-text)]">{value}</p>
        )}
      </div>
    </div>
  );
}

function InfoCell({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] p-3">
      <p className="text-xs text-[var(--c-text3)]">{label}</p>
      <p className="text-sm font-medium text-[var(--c-text)]">{value}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="mb-3 text-xs font-semibold uppercase tracking-wide text-[var(--c-text2)]">{title}</h3>
      {children}
    </div>
  );
}

function AddSupplierForm({ onClose }: { onClose: () => void }) {
  const { actions } = useInventory();
  const [name, setName] = useState("");
  const [country, setCountry] = useState("Россия");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [leadTime, setLeadTime] = useState("7");
  const [minOrder, setMinOrder] = useState("");
  const [currency, setCurrency] = useState<"RUB" | "USD" | "EUR" | "CNY">("RUB");
  const [paymentTerms, setPaymentTerms] = useState("");
  const [notes, setNotes] = useState("");
  const [telegram, setTelegram] = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    if (!name.trim()) return;
    actions.addSupplier({
      name: name.trim(),
      country,
      contactName: contactName || undefined,
      email: email || undefined,
      phone: phone || undefined,
      telegramHandle: telegram || undefined,
      leadTimeDays: parseInt(leadTime) || 7,
      minOrderQty: minOrder ? parseInt(minOrder) : undefined,
      currency,
      paymentTerms: paymentTerms || undefined,
      notes: notes || undefined,
      rating: 5,
    });
    setSaved(true);
    setTimeout(() => { setSaved(false); onClose(); }, 700);
  }

  return (
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative ml-auto flex h-full w-full max-w-xl flex-col bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <h2 className="text-lg font-semibold text-[var(--c-text)]">Добавить поставщика</h2>
          <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)] transition">
            <X size={18} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Основное</h3>
            <div className="space-y-3">
              <Field label="Название компании" required>
                <input type="text" value={name} onChange={(e) => setName(e.target.value)} placeholder="ООО Поставщик" className={inp} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Страна">
                  <select value={country} onChange={(e) => setCountry(e.target.value)} className={inp}>
                    {["Россия", "Китай", "США", "Германия", "Турция", "Италия", "Другая"].map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
                <Field label="Валюта">
                  <select value={currency} onChange={(e) => setCurrency(e.target.value as typeof currency)} className={inp}>
                    {(["RUB", "USD", "EUR", "CNY"] as const).map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </div>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Контакты</h3>
            <div className="space-y-3">
              <Field label="Имя контакта">
                <input type="text" value={contactName} onChange={(e) => setContactName(e.target.value)} placeholder="Иван Петров" className={inp} />
              </Field>
              <div className="grid grid-cols-2 gap-3">
                <Field label="Email">
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="ivan@example.com" className={inp} />
                </Field>
                <Field label="Телефон">
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+7 (999) 123-45-67" className={inp} />
                </Field>
              </div>
              <Field label="Telegram">
                <input type="text" value={telegram} onChange={(e) => setTelegram(e.target.value)} placeholder="@username" className={inp} />
              </Field>
            </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-semibold text-[var(--c-text)] border-b border-[var(--c-border)] pb-2">Условия поставки</h3>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <Field label="Срок доставки (дней)">
                  <input type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} placeholder="7" className={inp} />
                </Field>
                <Field label="Мин. заказ (шт)">
                  <input type="number" value={minOrder} onChange={(e) => setMinOrder(e.target.value)} placeholder="50" className={inp} />
                </Field>
              </div>
              <Field label="Условия оплаты">
                <input type="text" value={paymentTerms} onChange={(e) => setPaymentTerms(e.target.value)} placeholder="50% предоплата, 50% по факту" className={inp} />
              </Field>
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Заметки</label>
            <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} className={cn(inp, "resize-none")} placeholder="Особенности работы, история..." />
          </div>
        </div>

        <div className="flex items-center justify-between gap-3 border-t border-[var(--c-border)] bg-[var(--c-bg2)] px-6 py-4">
          <button onClick={onClose} className="h-10 rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition">
            Отмена
          </button>
          <button
            onClick={handleSave}
            disabled={!name.trim() || saved}
            className={cn(
              "flex h-10 items-center gap-2 rounded-lg px-5 text-sm font-semibold transition",
              name.trim() && !saved ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:bg-[#25e890]" : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
            )}
          >
            {saved ? <><Check size={14} /> Сохранено</> : "Сохранить поставщика"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
        {label}{required && <span className="ml-1 text-[var(--c-red)]">*</span>}
      </label>
      {children}
    </div>
  );
}

const inp = "h-9 w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none transition";
