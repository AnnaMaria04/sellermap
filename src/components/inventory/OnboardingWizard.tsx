"use client";

import { useState } from "react";
import {
  Package,
  ChevronRight,
  Check,
  Building2,
  Layers,
  ArrowRight,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { type SellerProfile } from "@/hooks/useSellerProfile";
import { CHANNEL_LABELS, type SalesChannel } from "@/mock/inventory";

const BUSINESS_TYPES = [
  { id: "ooo",   label: "ООО" },
  { id: "ip",    label: "ИП" },
  { id: "self",  label: "Самозанятый" },
  { id: "other", label: "Другое" },
];

const CHANNELS: SalesChannel[] = ["wildberries", "ozon", "yandex_market", "website", "pos", "telegram"];

interface Props {
  onComplete: (profile: Partial<SellerProfile>) => void;
}

export function OnboardingWizard({ onComplete }: Props) {
  const [step, setStep] = useState(1);
  const [company, setCompany] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [channels, setChannels] = useState<SalesChannel[]>([]);

  function toggleChannel(ch: SalesChannel) {
    setChannels((prev) =>
      prev.includes(ch) ? prev.filter((c) => c !== ch) : [...prev, ch],
    );
  }

  function finish() {
    onComplete({ company, businessType, channels, onboardingComplete: true });
  }

  const stepLabels = ["Компания", "Каналы", "Готово"];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md px-4">
      <div className="w-full max-w-lg rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="border-b border-[var(--c-border)] px-6 py-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Package size={20} className="text-[var(--c-green)]" />
            <span className="text-base font-semibold text-[var(--c-text)]">Добро пожаловать в SellerMap</span>
          </div>
          {/* Steps */}
          <div className="flex items-center gap-2">
            {stepLabels.map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <div key={n} className="flex items-center gap-2 flex-1 min-w-0">
                  <div className={cn(
                    "flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold transition",
                    done ? "bg-[var(--c-green)] text-[var(--c-bg)]" :
                    active ? "bg-[var(--c-green)]/20 border border-[var(--c-green)] text-[var(--c-green)]" :
                    "bg-[var(--c-bg3)] text-[var(--c-text3)]",
                  )}>
                    {done ? <Check size={12} /> : n}
                  </div>
                  <span className={cn(
                    "text-xs truncate",
                    active ? "text-[var(--c-text)]" : "text-[var(--c-text3)]",
                  )}>
                    {label}
                  </span>
                  {i < stepLabels.length - 1 && (
                    <ChevronRight size={12} className="text-[var(--c-text3)] shrink-0 ml-auto" />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Step 1: Company info */}
        {step === 1 && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Расскажите о компании</h2>
              <p className="mt-0.5 text-sm text-[var(--c-text3)]">Помогите нам настроить SellerMap под вас</p>
            </div>
            <div>
              <label className="mb-1.5 flex items-center gap-1.5 text-xs font-medium text-[var(--c-text2)]">
                <Building2 size={12} /> Название компании
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="ООО «Мой Магазин» или имя ИП"
                className="h-10 w-full rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--c-text2)]">Форма собственности</label>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPES.map((bt) => (
                  <button
                    key={bt.id}
                    onClick={() => setBusinessType(bt.id)}
                    className={cn(
                      "rounded-lg border px-4 py-2 text-sm font-medium transition",
                      businessType === bt.id
                        ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
                        : "border-[var(--c-border)] bg-[var(--c-bg3)] text-[var(--c-text2)] hover:text-[var(--c-text)]",
                    )}
                  >
                    {bt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Sales channels */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Где вы продаёте?</h2>
              <p className="mt-0.5 text-sm text-[var(--c-text3)]">Выберите каналы продаж — можно добавить позже</p>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {CHANNELS.map((ch) => {
                const sel = channels.includes(ch);
                return (
                  <button
                    key={ch}
                    onClick={() => toggleChannel(ch)}
                    className={cn(
                      "flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                      sel
                        ? "border-[var(--c-green)] bg-[var(--c-green-dim)]"
                        : "border-[var(--c-border)] bg-[var(--c-bg3)] hover:border-[var(--c-border2)]",
                    )}
                  >
                    <div className={cn(
                      "flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition",
                      sel ? "border-[var(--c-green)] bg-[var(--c-green)] text-[var(--c-bg)]" : "border-[var(--c-border)]",
                    )}>
                      {sel && <Check size={11} />}
                    </div>
                    <span className={cn("text-sm font-medium", sel ? "text-[var(--c-green)]" : "text-[var(--c-text2)]")}>
                      {CHANNEL_LABELS[ch]}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Done */}
        {step === 3 && (
          <div className="p-6 space-y-5 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--c-green-dim)] border border-[var(--c-green)]/30 mx-auto">
              <Check size={28} className="text-[var(--c-green)]" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">Всё готово{company ? `, ${company}` : ""}!</h2>
              <p className="mt-1 text-sm text-[var(--c-text3)]">
                Ваш кабинет продавца настроен. Начните с добавления первого товара или подключите маркетплейс.
              </p>
            </div>
            <div className="flex gap-3">
              <a
                href="/inventory/products"
                onClick={finish}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] py-2.5 text-sm font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
              >
                <Package size={15} />
                Добавить товар
              </a>
              <a
                href="/inventory/integrations"
                onClick={finish}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] py-2.5 text-sm font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
              >
                <Layers size={15} />
                Подключить WB
              </a>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between border-t border-[var(--c-border)] px-6 py-4">
          {step > 1 && step < 3 ? (
            <button
              onClick={() => setStep((s) => s - 1)}
              className="text-sm text-[var(--c-text3)] hover:text-[var(--c-text2)] transition"
            >
              Назад
            </button>
          ) : (
            <div />
          )}

          {step < 3 && (
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  if (step === 2) { setStep(3); } else { setStep((s) => s + 1); }
                }}
                className="text-xs text-[var(--c-text3)] hover:text-[var(--c-text2)] transition"
              >
                Пропустить
              </button>
              <button
                onClick={() => setStep((s) => s + 1)}
                className="flex items-center gap-2 rounded-xl bg-[var(--c-green)] px-5 py-2 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
              >
                Далее
                <ArrowRight size={15} />
              </button>
            </div>
          )}

          {step === 3 && (
            <button
              onClick={finish}
              className="flex items-center gap-2 rounded-xl bg-[var(--c-green)] px-6 py-2 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
            >
              Перейти в кабинет
              <ArrowRight size={15} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
