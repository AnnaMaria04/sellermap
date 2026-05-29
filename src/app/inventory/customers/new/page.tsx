"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ChevronRight, Plus, Pencil, X } from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { useInventory } from "@/contexts/InventoryContext";
import { cn } from "@/lib/utils";

interface Address { country: string; firstName: string; lastName: string; company: string; address1: string; address2: string; city: string; province: string; zip: string; phone: string; }
const EMPTY_ADDR: Address = { country: "Россия", firstName: "", lastName: "", company: "", address1: "", address2: "", city: "", province: "", zip: "", phone: "" };
const COUNTRIES = ["Россия", "Казахстан", "Беларусь", "Армения"];

export default function NewCustomerPage() {
  const router = useRouter();
  const { actions } = useInventory();
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [emailOptIn, setEmailOptIn] = useState(false);
  const [smsOptIn, setSmsOptIn] = useState(false);
  const [tax, setTax] = useState("collect");
  const [notes, setNotes] = useState("");
  const [tags, setTags] = useState("");
  const [address, setAddress] = useState<Address | null>(null);
  const [addrModal, setAddrModal] = useState(false);

  const name = `${first} ${last}`.trim();
  const valid = name.length > 0;

  function save() {
    if (!valid) return;
    actions.createCustomer({
      name,
      email: email || undefined,
      phone: phone || undefined,
      city: address?.city || undefined,
      tier: "new",
      loyaltyPoints: 0,
      totalOrders: 0,
      totalSpent: 0,
      tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      note: notes || undefined,
    });
    router.push("/inventory/customers");
  }

  return (
    <InventoryShell>
      {/* Save bar */}
      <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 flex items-center justify-between border-b border-[var(--c-border)] bg-[var(--c-text)] px-4 py-2.5 text-sm text-[var(--c-bg)]">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--c-bg)]/70" /> Новый клиент</span>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/inventory/customers")} className="rounded-lg px-3 py-1.5 font-medium text-[var(--c-bg)]/90 hover:bg-[var(--c-bg)]/10">Отменить</button>
          <button onClick={save} disabled={!valid} className="rounded-lg bg-[var(--c-bg)] px-3 py-1.5 font-medium text-[var(--c-text)] transition hover:opacity-90 disabled:opacity-50">Сохранить</button>
        </div>
      </div>

      <div className="mx-auto max-w-[1100px] px-4 pb-10">
        <div className="mb-5 flex items-center gap-1.5 text-sm">
          <Link href="/inventory/customers" className="text-[var(--c-text2)] hover:text-[var(--c-text)]">Клиенты</Link>
          <ChevronRight className="h-4 w-4 text-[var(--c-text3)]" />
          <span className="font-semibold text-[var(--c-text)]">Новый клиент</span>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
          {/* LEFT */}
          <div className="space-y-5">
            <Card title="Обзор клиента">
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Имя"><Input value={first} onChange={setFirst} /></Field>
                <Field label="Фамилия"><Input value={last} onChange={setLast} /></Field>
              </div>
              <Field label="Язык">
                <Select value="ru" onChange={() => {}} options={[{ v: "ru", l: "Русский (по умолчанию)" }]} />
                <p className="mt-1 text-xs text-[var(--c-text3)]">Клиент будет получать уведомления на этом языке.</p>
              </Field>
              <Field label="Email"><Input type="email" value={email} onChange={setEmail} /></Field>
              <Field label="Телефон">
                <div className="flex gap-2">
                  <span className="flex items-center rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 text-sm text-[var(--c-text)]">🇷🇺 +7</span>
                  <Input value={phone} onChange={setPhone} className="flex-1" />
                </div>
              </Field>
              <label className={cn("mt-1 flex items-center gap-2 text-sm", email.trim() ? "text-[var(--c-text)]" : "cursor-not-allowed text-[var(--c-text3)]")}>
                <input type="checkbox" disabled={!email.trim()} checked={emailOptIn && !!email.trim()} onChange={(e) => setEmailOptIn(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)] disabled:cursor-not-allowed disabled:opacity-50" /> Клиент согласен получать email-рассылку
              </label>
              <label className={cn("flex items-center gap-2 text-sm", phone.trim() ? "text-[var(--c-text)]" : "cursor-not-allowed text-[var(--c-text3)]")}>
                <input type="checkbox" disabled={!phone.trim()} checked={smsOptIn && !!phone.trim()} onChange={(e) => setSmsOptIn(e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)] disabled:cursor-not-allowed disabled:opacity-50" /> Клиент согласен получать SMS-рассылку
              </label>
              <p className="mt-1 text-xs text-[var(--c-text3)]">Получите согласие клиента, прежде чем отправлять маркетинговые сообщения.</p>
            </Card>

            <Card title="Адрес по умолчанию">
              {address ? (
                <div className="flex items-start justify-between gap-3 rounded-lg border border-[var(--c-border)] p-3 text-sm">
                  <div className="text-[var(--c-text2)]">
                    <div className="text-[var(--c-text)]">{address.firstName} {address.lastName}</div>
                    <div>{[address.address1, address.city, address.zip].filter(Boolean).join(", ")}</div>
                    <div>{address.country}</div>
                  </div>
                  <button onClick={() => setAddrModal(true)} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"><Pencil className="h-4 w-4" /></button>
                </div>
              ) : (
                <button onClick={() => setAddrModal(true)} className="flex w-full items-center justify-between rounded-lg border border-dashed border-[var(--c-border2)] px-3 py-2.5 text-sm text-[var(--c-text)] hover:bg-[var(--c-bg)]">
                  <span className="flex items-center gap-2"><Plus className="h-4 w-4" /> Добавить адрес</span>
                  <ChevronRight className="h-4 w-4 text-[var(--c-text3)]" />
                </button>
              )}
            </Card>

            <Card title="Налоги">
              <Field label="Настройки налогов">
                <Select value={tax} onChange={setTax} options={[
                  { v: "collect", l: "Взимать налог" },
                  { v: "exempt", l: "Взимать, кроме исключений" },
                  { v: "none", l: "Не взимать налог" },
                ]} />
              </Field>
            </Card>
          </div>

          {/* RIGHT */}
          <div className="space-y-5">
            <Card title="Заметки">
              <textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} placeholder="Заметки видны только вам" className="w-full resize-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
            </Card>
            <Card title="Теги">
              <Input value={tags} onChange={setTags} placeholder="Найти или создать теги" />
            </Card>
          </div>
        </div>
      </div>

      {addrModal && <AddressModal initial={address ?? EMPTY_ADDR} onClose={() => setAddrModal(false)} onSave={(a) => { setAddress(a); setAddrModal(false); }} />}
    </InventoryShell>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="space-y-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4"><h2 className="text-sm font-semibold text-[var(--c-text)]">{title}</h2>{children}</div>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">{label}</span>{children}</label>;
}
function Input({ value, onChange, type = "text", placeholder, className }: { value: string; onChange: (v: string) => void; type?: string; placeholder?: string; className?: string }) {
  return <input type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} className={cn("w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]", className)} />;
}
function Select({ value, onChange, options }: { value: string; onChange: (v: string) => void; options: { v: string; l: string }[] }) {
  return <select value={value} onChange={(e) => onChange(e.target.value)} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]">{options.map((o) => <option key={o.v} value={o.v}>{o.l}</option>)}</select>;
}

function AddressModal({ initial, onClose, onSave }: { initial: Address; onClose: () => void; onSave: (a: Address) => void }) {
  const [a, setA] = useState<Address>(initial);
  const set = (k: keyof Address, v: string) => setA({ ...a, [k]: v });
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 animate-fade-in" onClick={onClose}>
      <div className="w-full max-w-lg rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
          <h3 className="text-base font-semibold text-[var(--c-text)]">Адрес по умолчанию</h3>
          <button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button>
        </div>
        <div className="max-h-[70vh] space-y-3 overflow-y-auto p-4">
          <Field label="Страна/регион"><Select value={a.country} onChange={(v) => set("country", v)} options={COUNTRIES.map((c) => ({ v: c, l: c }))} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Имя"><Input value={a.firstName} onChange={(v) => set("firstName", v)} /></Field>
            <Field label="Фамилия"><Input value={a.lastName} onChange={(v) => set("lastName", v)} /></Field>
          </div>
          <Field label="Компания"><Input value={a.company} onChange={(v) => set("company", v)} /></Field>
          <Field label="Адрес"><Input value={a.address1} onChange={(v) => set("address1", v)} placeholder="Улица, дом" /></Field>
          <Field label="Квартира, офис и т.д."><Input value={a.address2} onChange={(v) => set("address2", v)} /></Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Город"><Input value={a.city} onChange={(v) => set("city", v)} /></Field>
            <Field label="Индекс"><Input value={a.zip} onChange={(v) => set("zip", v)} /></Field>
          </div>
          <Field label="Телефон"><Input value={a.phone} onChange={(v) => set("phone", v)} /></Field>
        </div>
        <div className="flex justify-end gap-2 border-t border-[var(--c-border)] px-4 py-3">
          <button onClick={onClose} className="rounded-lg border border-[var(--c-border2)] px-4 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">Отмена</button>
          <button onClick={() => onSave(a)} className="rounded-lg bg-[var(--c-text)] px-4 py-1.5 text-sm font-medium text-[var(--c-bg)] hover:opacity-90">Сохранить</button>
        </div>
      </div>
    </div>
  );
}
