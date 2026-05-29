"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plus, Search, Globe, X } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { cn } from "@/lib/utils";

const COUNTRIES = ["Россия", "Казахстан", "Беларусь", "Армения"];
const PAYMENT_TERMS = ["Без условий оплаты", "При выполнении", "Net 7", "Net 15", "Net 30", "Net 45", "Net 60", "Net 90"];

export default function NewCompanyPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [companyId, setCompanyId] = useState("");
  const [contact, setContact] = useState("");
  const [contactOpen, setContactOpen] = useState(false);
  const [shipAddr, setShipAddr] = useState<string | null>(null);
  const [billingSame, setBillingSame] = useState(true);
  const [billAddr, setBillAddr] = useState<string | null>(null);
  const [locationId, setLocationId] = useState("");
  const [terms, setTerms] = useState(PAYMENT_TERMS[0]);
  const [anyAddress, setAnyAddress] = useState(false);
  const [submitMode, setSubmitMode] = useState<"auto" | "draft">("auto");
  const [taxId, setTaxId] = useState("");
  const [tax, setTax] = useState("collect");
  const [addrModal, setAddrModal] = useState<null | "ship" | "bill">(null);

  const valid = name.trim().length > 0;
  const save = () => { if (valid) router.push("/inventory/customers/companies"); };

  return (
    <InventoryShell>
      <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 flex items-center justify-between border-b border-[var(--c-border)] bg-[var(--c-text)] px-4 py-2.5 text-sm text-[var(--c-bg)]">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--c-bg)]/70" /> Новая компания</span>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/inventory/customers/companies")} className="rounded-lg px-3 py-1.5 font-medium text-[var(--c-bg)]/90 hover:bg-[var(--c-bg)]/10">Отменить</button>
          <button onClick={save} disabled={!valid} className="rounded-lg bg-[var(--c-bg)] px-3 py-1.5 font-medium text-[var(--c-text)] transition hover:opacity-90 disabled:opacity-50">Сохранить</button>
        </div>
      </div>

      <div className="mx-auto max-w-[640px] px-4 pb-10">
        <div className="mb-5 flex items-center gap-1.5 text-sm">
          <Link href="/inventory/customers/companies" className="text-[var(--c-text2)] hover:text-[var(--c-text)]">Компании</Link>
          <ChevronRight className="h-4 w-4 text-[var(--c-text3)]" /><span className="font-semibold text-[var(--c-text)]">Новая компания</span>
        </div>

        <div className="space-y-5">
          <Card>
            <Field label="Название компании" hint="Отображается в личном кабинете клиента и при оформлении"><Input value={name} onChange={setName} /></Field>
            <Field label="ID компании" hint="Внешний ID или уникальный идентификатор"><Input value={companyId} onChange={setCompanyId} /></Field>
          </Card>

          <Card title="Основной контакт">
            <div className="relative">
              <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-2.5 py-2 focus-within:border-[var(--c-blue)]"><Search className="h-4 w-4 text-[var(--c-text3)]" /><input value={contact} onChange={(e) => setContact(e.target.value)} onFocus={() => setContactOpen(true)} onBlur={() => setTimeout(() => setContactOpen(false), 150)} placeholder="Поиск клиента" className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]" /></div>
              {contactOpen && (
                <div className="absolute left-0 right-0 top-full z-20 mt-1 overflow-hidden rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl">
                  <Link href="/inventory/customers/new" className="flex items-center gap-2 border-b border-[var(--c-border)] px-3 py-2 text-sm font-medium text-[var(--c-blue)] hover:bg-[var(--c-bg3)]"><Plus className="h-4 w-4" /> Добавить нового клиента</Link>
                  <div className="px-3 py-4 text-center text-sm text-[var(--c-text3)]">Клиенты не найдены</div>
                </div>
              )}
            </div>
          </Card>

          <Card title="Местоположение">
            <AddrRow label="Адрес доставки" value={shipAddr} onAdd={() => setAddrModal("ship")} onClear={() => setShipAddr(null)} />
            <label className="mt-2 flex items-center gap-2 text-sm text-[var(--c-text)]"><input type="checkbox" checked={billingSame} onChange={(e) => setBillingSame(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" /> Адрес для счетов совпадает с адресом доставки</label>
            {!billingSame && <div className="mt-2"><AddrRow label="Адрес для счетов" value={billAddr} onAdd={() => setAddrModal("bill")} onClear={() => setBillAddr(null)} /></div>}
            <div className="mt-3"><Field label="ID местоположения"><Input value={locationId} onChange={setLocationId} /></Field></div>
          </Card>

          <Card title="Рынок">
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[var(--c-bg3)] px-2 py-1 text-sm text-[var(--c-text)]"><Globe className="h-4 w-4 text-[var(--c-text3)]" /> Россия</span>
          </Card>

          <Card title="Условия оплаты">
            <Select value={terms} onChange={setTerms} options={PAYMENT_TERMS.map((t) => ({ v: t, l: t }))} />
          </Card>

          <Card title="Оформление">
            <p className="text-sm text-[var(--c-text)]">Адрес доставки</p>
            <label className="mt-1 flex items-center gap-2 text-sm text-[var(--c-text2)]"><input type="checkbox" checked={anyAddress} onChange={(e) => setAnyAddress(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" /> Разрешить отправку на любой разовый адрес</label>
            <p className="mt-3 text-sm text-[var(--c-text)]">Оформление заказов</p>
            <label className="mt-1 flex items-start gap-2 text-sm text-[var(--c-text)]"><input type="radio" name="submit" checked={submitMode === "auto"} onChange={() => setSubmitMode("auto")} className="mt-0.5" /> <span>Автоматически оформлять заказы<span className="block text-xs text-[var(--c-text3)]">Заказы без адреса доставки станут черновиками</span></span></label>
            <label className="mt-2 flex items-center gap-2 text-sm text-[var(--c-text)]"><input type="radio" name="submit" checked={submitMode === "draft"} onChange={() => setSubmitMode("draft")} /> Все заказы — как черновики на проверку</label>
          </Card>

          <Card title="Налоги">
            <Field label="Налоговый ID"><Input value={taxId} onChange={setTaxId} /></Field>
            <Field label="Настройки налогов"><Select value={tax} onChange={setTax} options={[{ v: "collect", l: "Взимать налог" }, { v: "exempt", l: "Взимать, кроме исключений" }, { v: "none", l: "Не взимать налог" }]} /></Field>
          </Card>

          <div className="flex justify-end"><button onClick={save} disabled={!valid} className="rounded-lg bg-[var(--c-text)] px-4 py-2 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90 disabled:opacity-50">Сохранить</button></div>
        </div>
      </div>

      {addrModal && <AddressModal onClose={() => setAddrModal(null)} onSave={(s) => { addrModal === "ship" ? setShipAddr(s) : setBillAddr(s); setAddrModal(null); }} />}
    </InventoryShell>
  );
}

function Card({ title, children }: { title?: string; children: React.ReactNode }) { return <div className="space-y-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">{title && <h2 className="text-sm font-semibold text-[var(--c-text)]">{title}</h2>}{children}</div>; }
function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">{label}</span>{children}{hint && <span className="mt-1 block text-xs text-[var(--c-text3)]">{hint}</span>}</label>; }
function Input({ value, onChange }: { value: string; onChange: (v: string) => void }) { return <input value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />; }
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) { return <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]">{options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>; }
function AddrRow({ label, value, onAdd, onClear }: { label: string; value: string | null; onAdd: () => void; onClear: () => void }) {
  return (
    <div>
      <div className="mb-1 flex items-center justify-between"><span className="text-sm text-[var(--c-text)]">{label}</span>{value && <button onClick={onClear} className="text-sm text-[var(--c-blue)] hover:underline">Очистить</button>}</div>
      {value ? <div className="rounded-lg border border-[var(--c-border)] p-3 text-sm text-[var(--c-text2)]">{value}</div> : <button onClick={onAdd} className="flex w-full items-center justify-between rounded-lg border border-dashed border-[var(--c-border2)] px-3 py-2.5 text-sm text-[var(--c-text)] hover:bg-[var(--c-bg)]"><span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Добавить адрес</span><ChevronRight className="h-4 w-4 text-[var(--c-text3)]" /></button>}
    </div>
  );
}
function AddressModal({ onClose, onSave }: { onClose: () => void; onSave: (s: string) => void }) {
  const [country, setCountry] = useState("Россия"); const [city, setCity] = useState(""); const [addr, setAddr] = useState(""); const [zip, setZip] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3"><h3 className="text-base font-semibold text-[var(--c-text)]">Адрес доставки</h3><button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button></div>
        <div className="space-y-3 p-4">
          <Field label="Страна/регион"><Select value={country} onChange={setCountry} options={COUNTRIES.map((c) => ({ v: c, l: c }))} /></Field>
          <Field label="Адрес"><Input value={addr} onChange={setAddr} /></Field>
          <div className="grid grid-cols-2 gap-3"><Field label="Город"><Input value={city} onChange={setCity} /></Field><Field label="Индекс"><Input value={zip} onChange={setZip} /></Field></div>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--c-border)] px-4 py-3"><button onClick={onClose} className="rounded-lg border border-[var(--c-border2)] px-4 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">Отмена</button><button onClick={() => onSave([addr, city, zip, country].filter(Boolean).join(", "))} className="rounded-lg bg-[var(--c-text)] px-4 py-1.5 text-sm font-medium text-[var(--c-bg)] hover:opacity-90">Сохранить</button></div>
      </div>
    </div>
  );
}
