"use client";

import { useState, useEffect } from "react";
import { X, Mail, Check } from "lucide-react";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "sellermap_abandoned_email";

interface EmailConfig {
  enabled: boolean;
  delay: string;      // when the email is sent after abandonment
  subject: string;
  body: string;
}

const DEFAULTS: EmailConfig = {
  enabled: true,
  delay: "6h",
  subject: "Вы кое-что забыли в корзине",
  body:
    "Здравствуйте!\n\nВы оставили товары в корзине. Завершите заказ — мы сохранили его для вас.\n\nПерейти к оформлению →",
};

const DELAYS = [
  { id: "1h", label: "Через 1 час" },
  { id: "6h", label: "Через 6 часов" },
  { id: "24h", label: "Через 24 часа" },
];

function load(): EmailConfig {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

/** Editor for the automated abandoned-checkout recovery email. */
export function AbandonedEmailEditor({ onClose }: { onClose: () => void }) {
  const [cfg, setCfg] = useState<EmailConfig>(DEFAULTS);
  const [saved, setSaved] = useState(false);

  useEffect(() => { setCfg(load()); }, []);

  function set<K extends keyof EmailConfig>(key: K, value: EmailConfig[K]) {
    setCfg((c) => ({ ...c, [key]: value }));
    setSaved(false);
  }

  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cfg)); } catch {}
    setSaved(true);
    setTimeout(onClose, 700);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 p-4 pt-16 animate-fade-in" onClick={onClose}>
      <div className="flex w-full max-w-3xl overflow-hidden rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] shadow-xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
        {/* Form */}
        <div className="w-[55%] border-r border-[var(--c-border)]">
          <div className="flex items-center justify-between border-b border-[var(--c-border)] px-4 py-3">
            <h3 className="flex items-center gap-2 text-base font-semibold text-[var(--c-text)]">
              <Mail className="h-4 w-4 text-[var(--c-text2)]" /> Письмо о брошенной корзине
            </h3>
            <button onClick={onClose} className="rounded p-1 text-[var(--c-text3)] hover:bg-[var(--c-bg3)]"><X className="h-4 w-4" /></button>
          </div>

          <div className="max-h-[70vh] space-y-4 overflow-y-auto p-4">
            <label className="flex items-center justify-between gap-2 rounded-lg border border-[var(--c-border)] px-3 py-2.5">
              <span className="text-sm text-[var(--c-text)]">Автоматическая отправка</span>
              <input type="checkbox" checked={cfg.enabled} onChange={(e) => set("enabled", e.target.checked)} className="h-4 w-4 rounded border-[var(--c-border2)]" />
            </label>

            <div>
              <p className="mb-1 text-sm font-medium text-[var(--c-text)]">Когда отправлять</p>
              <select value={cfg.delay} onChange={(e) => set("delay", e.target.value)} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]">
                {DELAYS.map((d) => <option key={d.id} value={d.id}>{d.label}</option>)}
              </select>
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-[var(--c-text)]">Тема письма</p>
              <input value={cfg.subject} onChange={(e) => set("subject", e.target.value)} className="w-full rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
            </div>

            <div>
              <p className="mb-1 text-sm font-medium text-[var(--c-text)]">Текст письма</p>
              <textarea value={cfg.body} onChange={(e) => set("body", e.target.value)} rows={7} className="w-full resize-none rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-2 text-sm text-[var(--c-text)] outline-none focus:border-[var(--c-blue)]" />
            </div>

            <p className="text-xs text-[var(--c-text3)]">
              Получатели: клиенты, оставившие корзину{cfg.enabled ? "" : " (отправка отключена)"}.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 border-t border-[var(--c-border)] px-4 py-3">
            <button onClick={onClose} className="rounded-lg border border-[var(--c-border2)] px-4 py-1.5 text-sm font-medium text-[var(--c-text)] hover:bg-[var(--c-bg)]">Отмена</button>
            <button onClick={save} className={cn("flex items-center gap-1.5 rounded-lg px-4 py-1.5 text-sm font-medium text-[var(--c-bg)] transition", saved ? "bg-[var(--c-green)]" : "bg-[var(--c-text)] hover:opacity-90")}>
              {saved ? <><Check className="h-4 w-4" /> Сохранено</> : "Сохранить"}
            </button>
          </div>
        </div>

        {/* Preview */}
        <div className="flex w-[45%] flex-col bg-[var(--c-bg)]">
          <div className="border-b border-[var(--c-border)] px-4 py-3 text-sm font-semibold text-[var(--c-text)]">Предпросмотр</div>
          <div className="flex-1 overflow-y-auto p-4">
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
              <div className="text-xs text-[var(--c-text3)]">Тема</div>
              <div className="mb-3 text-sm font-semibold text-[var(--c-text)]">{cfg.subject || "—"}</div>
              <div className="whitespace-pre-line text-sm leading-relaxed text-[var(--c-text2)]">{cfg.body || "—"}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
