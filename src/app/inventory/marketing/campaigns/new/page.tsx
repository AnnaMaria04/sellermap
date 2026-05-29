"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  FolderOpen, Info, Calendar, ChevronDown, PanelRightClose, PanelRightOpen,
  Copy, Plus, X, Check, Search, QrCode, ChevronLeft, ChevronRight,
} from "lucide-react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { cn } from "@/lib/utils";

const CHARTS = [
  "Сеансы по каналам", "Продажи по каналам", "Сеансы по UTM", "Продажи по UTM",
  "Новые и вернувшиеся клиенты", "Продажи по заказам", "Продано товаров", "Сеансы по устройствам",
];

export default function CampaignEditorPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [panelOpen, setPanelOpen] = useState(true);
  const [tutorial, setTutorial] = useState(false);
  const [tStep, setTStep] = useState(0);
  const [copied, setCopied] = useState(false);
  const [modal, setModal] = useState<null | "link" | "rule" | "activities">(null);
  const id = "b4ab98";

  function copyId() { navigator.clipboard?.writeText(id).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }

  return (
    <InventoryShell>
      <div className="sticky top-0 z-30 -mx-6 -mt-6 mb-6 flex items-center justify-between border-b border-[var(--c-border)] bg-[var(--c-text)] px-4 py-2.5 text-sm text-[var(--c-bg)]">
        <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-full bg-[var(--c-bg)]/70" /> Черновик кампании</span>
        <div className="flex items-center gap-2">
          <button onClick={() => router.push("/inventory/marketing/campaigns")} className="rounded-lg px-3 py-1.5 font-medium text-[var(--c-bg)]/90 hover:bg-[var(--c-bg)]/10">Отменить</button>
          <button onClick={() => router.push("/inventory/marketing/campaigns")} disabled={!name.trim()} className="rounded-lg bg-[var(--c-bg)] px-3 py-1.5 font-medium text-[var(--c-text)] transition hover:opacity-90 disabled:opacity-50">Сохранить</button>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-4 pb-10">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2"><FolderOpen className="h-5 w-5 text-[var(--c-text3)]" /><span className="text-[var(--c-text3)]">›</span><h1 className="text-lg font-semibold text-[var(--c-text)]">Создать кампанию</h1></div>
          <div className="relative">
            <button onClick={() => { setTutorial(true); setTStep(0); }} className="rounded-full border border-[var(--c-border)] bg-[var(--c-bg2)] p-1.5 text-[var(--c-text2)] hover:bg-[var(--c-bg)]"><Info className="h-4 w-4" /></button>
            {tutorial && (
              <div className="absolute right-0 top-full z-40 mt-2 w-72 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4 shadow-xl">
                <div className="flex h-24 items-center justify-center rounded-lg bg-[var(--c-bg3)] text-[var(--c-text3)]"><FolderOpen className="h-8 w-8" /></div>
                <p className="mt-3 text-sm font-semibold text-[var(--c-text)]">Отслеживайте кампании на всех площадках</p>
                <p className="mt-1 text-sm text-[var(--c-text2)]">Шаг {tStep + 1} из 4. Создавайте ссылки и правила, чтобы видеть эффект каждой кампании.</p>
                <div className="mt-3 flex items-center justify-between">
                  <button disabled={tStep === 0} onClick={() => setTStep((s) => s - 1)} className="rounded p-1 text-[var(--c-text2)] disabled:opacity-40"><ChevronLeft className="h-4 w-4" /></button>
                  <button onClick={() => (tStep < 3 ? setTStep((s) => s + 1) : setTutorial(false))} className="rounded-lg bg-[var(--c-text)] px-3 py-1 text-xs font-medium text-[var(--c-bg)]">{tStep < 3 ? "Далее" : "Готово"}</button>
                  <button disabled={tStep === 3} onClick={() => setTStep((s) => s + 1)} className="rounded p-1 text-[var(--c-text2)] disabled:opacity-40"><ChevronRight className="h-4 w-4" /></button>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className={cn("grid gap-5", panelOpen ? "lg:grid-cols-[1fr_320px]" : "grid-cols-1")}>
          {/* Analytics */}
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-2">
              <DisabledPill icon={<Calendar className="h-4 w-4" />} label="С начала года" />
              <DisabledPill icon={<ChevronDown className="h-4 w-4" />} label="Последний непрямой клик" />
              {!panelOpen && <button onClick={() => setPanelOpen(true)} className="ml-auto inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border2)] px-2.5 py-1.5 text-sm text-[var(--c-text)] hover:bg-[var(--c-bg2)]"><PanelRightOpen className="h-4 w-4" /> Настройки</button>}
            </div>
            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
              {["Сеансы", "Продажи", "Заказы", "Средний чек"].map((k) => (
                <div key={k} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4"><div className="text-sm text-[var(--c-text2)]">{k}</div><div className="mt-1 text-sm text-[var(--c-text3)]">Нет данных</div></div>
              ))}
            </div>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {CHARTS.map((c) => (
                <div key={c} className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4"><div className="text-sm font-medium text-[var(--c-text)]">{c}</div><div className="flex h-28 items-center justify-center text-sm text-[var(--c-text3)]">Нет данных за период</div></div>
              ))}
            </div>
          </div>

          {/* Settings panel */}
          {panelOpen && (
            <div className="space-y-4">
              <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
                <div className="mb-3 flex items-center justify-between"><span className="text-sm font-semibold text-[var(--c-text)]">Кампания</span><button onClick={() => setPanelOpen(false)} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]" title="Свернуть панель"><PanelRightClose className="h-4 w-4" /></button></div>
                <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">Название кампании</span><input autoFocus value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" /></label>
                <div className="mt-2 flex items-center gap-2 text-xs text-[var(--c-text3)]">ID: {id}<button onClick={copyId} className="inline-flex items-center gap-1 rounded p-1 hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]">{copied ? <><Check className="h-3.5 w-3.5 text-[var(--c-green)]" /> Скопировано</> : <Copy className="h-3.5 w-3.5" />}</button></div>
              </div>

              <PanelSection title="Ссылки для шаринга" onAdd={() => setModal("link")}>
                <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border)] p-2 text-sm">
                  <span className="flex h-8 w-8 items-center justify-center rounded bg-[var(--c-bg3)] text-[var(--c-text3)]"><QrCode className="h-4 w-4" /></span>
                  <span className="min-w-0 flex-1 truncate text-[var(--c-text2)]">/s/{id}</span>
                </div>
              </PanelSection>

              <PanelSection title="Авто-правила" onAdd={() => setModal("rule")}>
                <p className="text-sm text-[var(--c-text3)]">Создайте правила, чтобы автоматически сопоставлять активности.</p>
              </PanelSection>

              <PanelSection title="Активности кампании" onAdd={() => setModal("activities")}>
                <p className="text-sm text-[var(--c-text3)]">Назначьте активности вручную.</p>
              </PanelSection>
            </div>
          )}
        </div>
      </div>

      {modal === "link" && <LinkModal onClose={() => setModal(null)} />}
      {modal === "rule" && <RuleModal onClose={() => setModal(null)} />}
      {modal === "activities" && <ActivitiesModal onClose={() => setModal(null)} />}
    </InventoryShell>
  );
}

function DisabledPill({ icon, label }: { icon: React.ReactNode; label: string }) {
  return <span title="Доступно после сохранения кампании" className="inline-flex cursor-not-allowed items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg2)] px-3 py-1.5 text-sm text-[var(--c-text3)] opacity-60">{icon}{label}</span>;
}
function PanelSection({ title, onAdd, children }: { title: string; onAdd: () => void; children: React.ReactNode }) {
  return <div className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4"><div className="mb-2 flex items-center justify-between"><span className="text-sm font-semibold text-[var(--c-text)]">{title}</span><button onClick={onAdd} className="rounded p-1 text-[var(--c-text2)] hover:bg-[var(--c-bg3)] hover:text-[var(--c-text)]"><Plus className="h-4 w-4" /></button></div>{children}</div>;
}
function Shell({ title, onClose, children, footer }: { title: string; onClose: () => void; children: React.ReactNode; footer: React.ReactNode }) {
  return <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-20 animate-fade-in" onClick={onClose}><div className="w-full max-w-md rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}><div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3"><h3 className="text-base font-semibold text-[var(--c-text)]">{title}</h3><button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button></div><div className="space-y-3 p-4">{children}</div><div className="flex justify-end gap-2 border-t border-[var(--c-border)] px-4 py-3">{footer}</div></div></div>;
}
function In({ ph, value, onChange }: { ph: string; value?: string; onChange?: (v: string) => void }) { return <input value={value} onChange={(e) => onChange?.(e.target.value)} placeholder={ph} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />; }
function Lbl({ t, children }: { t: string; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-sm text-[var(--c-text)]">{t}</span>{children}</label>; }
function Ghost({ children, onClick }: { children: React.ReactNode; onClick: () => void }) { return <button onClick={onClick} className="rounded-lg border border-[var(--c-border2)] px-4 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">{children}</button>; }
function Primary({ children, onClick, disabled }: { children: React.ReactNode; onClick: () => void; disabled?: boolean }) { return <button onClick={onClick} disabled={disabled} className="rounded-lg bg-[var(--c-text)] px-4 py-1.5 text-sm font-medium text-[var(--c-bg)] transition hover:opacity-90 disabled:opacity-50">{children}</button>; }

function LinkModal({ onClose }: { onClose: () => void }) {
  const [handle, setHandle] = useState("/"); const [utm, setUtm] = useState(false);
  return (
    <Shell title="Создать ссылку для шаринга" onClose={onClose} footer={<><Ghost onClick={onClose}>Отмена</Ghost><Primary disabled={handle === "/"} onClick={onClose}>Сохранить</Primary></>}>
      <Lbl t="Назначение"><In ph="Главная" value="Главная" /></Lbl>
      <Lbl t="Короткая ссылка"><In ph="/" value={handle} onChange={setHandle} /></Lbl>
      <button onClick={() => setUtm((v) => !v)} className="text-sm text-[var(--c-blue)] hover:underline">Дополнительные UTM-параметры {utm ? "▴" : "▾"}</button>
      {utm && <div className="space-y-2"><In ph="utm_campaign — напр. распродажа" /><In ph="utm_source — shareable_link" value="shareable_link" /><In ph="utm_medium — напр. social" /><In ph="utm_term — ключевые слова" /><In ph="utm_content — тип контента" /></div>}
    </Shell>
  );
}
function RuleModal({ onClose }: { onClose: () => void }) {
  return (
    <Shell title="Создать авто-правило" onClose={onClose} footer={<><Ghost onClick={onClose}>Отмена</Ghost><Primary onClick={onClose}>Сохранить</Primary></>}>
      {["utm_campaign — напр. распродажа", "utm_source — напр. facebook", "utm_medium — напр. social", "utm_term — ключевые слова", "utm_content — тип контента", "Канал — напр. Google", "Тип — напр. paid"].map((p) => <In key={p} ph={p} />)}
    </Shell>
  );
}
function ActivitiesModal({ onClose }: { onClose: () => void }) {
  return (
    <Shell title="Назначить активности" onClose={onClose} footer={<><Ghost onClick={onClose}>Отмена</Ghost><Primary disabled onClick={onClose}>Сохранить</Primary></>}>
      <div className="flex items-center gap-2 rounded-lg border border-[var(--c-border2)] px-2.5 py-2"><Search className="h-4 w-4 text-[var(--c-text3)]" /><input autoFocus placeholder="Поиск активностей" className="w-full bg-transparent text-sm text-[var(--c-text)] outline-none placeholder:text-[var(--c-text3)]" /></div>
      <div className="flex gap-2"><span className="rounded-lg border border-[var(--c-border2)] px-2.5 py-1 text-sm text-[var(--c-text2)]">Канал ▾</span><span className="rounded-lg border border-[var(--c-border2)] px-2.5 py-1 text-sm text-[var(--c-text2)]">Тип ▾</span></div>
      <div className="py-6 text-center text-sm text-[var(--c-text3)]">Ничего не найдено. Измените фильтры или запрос.</div>
    </Shell>
  );
}
