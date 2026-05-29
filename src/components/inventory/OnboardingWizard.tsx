"use client";

import { useState } from "react";
import { Check, PlusCircle, ChevronRight, Package } from "lucide-react";
import { cn } from "@/lib/utils";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import { SEGMENTS, MODULE_BY_ID, GATED_MODULES, type BusinessSegment, type ModuleId } from "@/lib/modules/registry";
import { resolveEnabledModules } from "@/lib/modules/resolve";

const BUSINESS_TYPES = [
  { id: "ip", label: "ИП" },
  { id: "llc", label: "ООО" },
  { id: "sole_proprietor", label: "Самозанятый" },
  { id: "individual", label: "Частное лицо" },
];

const SALES_CHANNELS = [
  { id: "wildberries", label: "Wildberries" },
  { id: "ozon", label: "Ozon" },
  { id: "yandex_market", label: "Яндекс Маркет" },
  { id: "sber", label: "СберМегаМаркет" },
  { id: "website", label: "Свой магазин" },
  { id: "pos", label: "Офлайн" },
];

const INTEGRATIONS = [
  { id: "wildberries", label: "Wildberries", color: "#CB11AB", initial: "WB" },
  { id: "ozon", label: "Ozon", color: "#005BFF", initial: "OZ" },
  { id: "yandex_market", label: "Яндекс Маркет", color: "#FFCC00", initial: "ЯМ" },
];

const STEP_LABELS = ["Компания", "Маркетплейс", "Товар"];

interface Props {
  onComplete: () => void;
}

export function OnboardingWizard({ onComplete }: Props) {
  const { saveProfile } = useSellerProfile();
  const [step, setStep] = useState(1);

  // Step 1 state
  const [company, setCompany] = useState("");
  const [businessType, setBusinessType] = useState("");
  const [channels, setChannels] = useState<string[]>([]);
  const [segment, setSegment] = useState<BusinessSegment | "">("");

  // Step 2 state
  const [apiKeys, setApiKeys] = useState<Record<string, string>>({});
  const [expandedIntegration, setExpandedIntegration] = useState<string | null>(null);

  // Step 3 state — no local state needed, actions navigate

  function toggleChannel(id: string) {
    setChannels((prev) =>
      prev.includes(id) ? prev.filter((c) => c !== id) : [...prev, id],
    );
  }

  function handleApiKeyChange(integrationId: string, value: string) {
    setApiKeys((prev) => ({ ...prev, [integrationId]: value }));
  }

  const hasAnyApiKey = Object.values(apiKeys).some((k) => k.trim().length > 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur px-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl">
        {/* Progress indicator */}
        <div className="border-b border-[var(--c-border)] px-6 py-5">
          <div className="flex items-center gap-2.5 mb-4">
            <Package size={18} className="text-[var(--c-green)]" />
            <span className="text-sm font-semibold text-[var(--c-text)]">SellerMap</span>
          </div>
          <div className="flex items-center">
            {STEP_LABELS.map((label, i) => {
              const n = i + 1;
              const done = step > n;
              const active = step === n;
              return (
                <div key={n} className="flex items-center flex-1 min-w-0 last:flex-none">
                  <div className="flex items-center gap-2 shrink-0">
                    <div
                      className={cn(
                        "flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold border-2 transition",
                        done
                          ? "border-[var(--c-green)] bg-[var(--c-green)] text-[var(--c-bg)]"
                          : active
                            ? "border-[var(--c-green)] bg-transparent text-[var(--c-green)]"
                            : "border-[var(--c-border2)] bg-transparent text-[var(--c-text3)]",
                      )}
                    >
                      {done ? <Check size={12} /> : n}
                    </div>
                    <span
                      className={cn(
                        "text-xs font-medium",
                        active ? "text-[var(--c-text)]" : "text-[var(--c-text3)]",
                      )}
                    >
                      {label}
                    </span>
                  </div>
                  {i < STEP_LABELS.length - 1 && (
                    <div
                      className={cn(
                        "mx-2 h-px flex-1 transition",
                        done ? "bg-[var(--c-green)]" : "bg-[var(--c-border)]",
                      )}
                    />
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
              <h2 className="text-lg font-semibold text-[var(--c-text)]">
                Добро пожаловать в SellerMap!
              </h2>
              <p className="mt-0.5 text-sm text-[var(--c-text3)]">
                Расскажите о своём бизнесе
              </p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
                Название компании / ИП <span className="text-[var(--c-red)]">*</span>
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="ООО «Мой Магазин» или ИП Иванов"
                className="h-10 w-full rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none transition"
              />
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--c-text2)]">
                Тип бизнеса <span className="text-[var(--c-text3)]">— определяет, какие разделы вы увидите</span>
              </label>
              <div className="grid gap-2 sm:grid-cols-2">
                {SEGMENTS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setSegment(s.id === segment ? "" : s.id)}
                    className={cn(
                      "rounded-xl border p-3 text-left transition",
                      segment === s.id ? "border-[var(--c-green)] ring-1 ring-[var(--c-green)]" : "border-[var(--c-border)] hover:bg-[var(--c-bg3)]",
                    )}
                  >
                    <span className="flex items-center justify-between text-sm font-medium text-[var(--c-text)]">
                      {s.label}
                      {segment === s.id && <Check size={14} className="text-[var(--c-green)]" />}
                    </span>
                    <span className="mt-0.5 block text-xs text-[var(--c-text3)]">{s.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--c-text2)]">
                Форма бизнеса
              </label>
              <div className="flex flex-wrap gap-2">
                {BUSINESS_TYPES.map((bt) => (
                  <button
                    key={bt.id}
                    onClick={() => setBusinessType(bt.id === businessType ? "" : bt.id)}
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

            <div>
              <label className="mb-2 block text-xs font-medium text-[var(--c-text2)]">
                Каналы продаж
              </label>
              <div className="grid grid-cols-2 gap-2">
                {SALES_CHANNELS.map((ch) => {
                  const selected = channels.includes(ch.id);
                  return (
                    <button
                      key={ch.id}
                      onClick={() => toggleChannel(ch.id)}
                      className={cn(
                        "flex items-center gap-2.5 rounded-xl border px-3 py-2.5 text-left text-sm transition",
                        selected
                          ? "border-[var(--c-green)] bg-[var(--c-green-dim)] text-[var(--c-green)]"
                          : "border-[var(--c-border)] bg-[var(--c-bg3)] text-[var(--c-text2)] hover:border-[var(--c-border2)] hover:text-[var(--c-text)]",
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-4 w-4 shrink-0 items-center justify-center rounded border transition",
                          selected
                            ? "border-[var(--c-green)] bg-[var(--c-green)] text-[var(--c-bg)]"
                            : "border-[var(--c-border2)]",
                        )}
                      >
                        {selected && <Check size={10} />}
                      </div>
                      <span className="font-medium">{ch.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                onClick={() => { saveProfile({ company: company.trim(), businessType, channels, segment: segment || undefined }); setStep(2); }}
                disabled={!company.trim()}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition",
                  company.trim()
                    ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90"
                    : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
                )}
              >
                Далее
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 2: First integration */}
        {step === 2 && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">
                Подключите маркетплейс
              </h2>
              <p className="mt-0.5 text-sm text-[var(--c-text3)]">
                Необязательно — можно сделать позже
              </p>
            </div>

            <div className="space-y-3">
              {INTEGRATIONS.map((intg) => {
                const expanded = expandedIntegration === intg.id;
                const keyValue = apiKeys[intg.id] ?? "";
                const hasKey = keyValue.trim().length > 0;
                return (
                  <div
                    key={intg.id}
                    className={cn(
                      "rounded-xl border transition overflow-hidden",
                      hasKey
                        ? "border-[var(--c-green)] bg-[var(--c-green-dim)]"
                        : "border-[var(--c-border)] bg-[var(--c-bg3)]",
                    )}
                  >
                    <div className="flex items-center gap-3 px-4 py-3">
                      <div
                        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-xs font-bold text-white"
                        style={{ backgroundColor: intg.color }}
                      >
                        {intg.initial}
                      </div>
                      <span className="flex-1 text-sm font-medium text-[var(--c-text)]">
                        {intg.label}
                      </span>
                      {hasKey ? (
                        <span className="flex items-center gap-1 text-xs font-medium text-[var(--c-green)]">
                          <Check size={12} /> Подключено
                        </span>
                      ) : (
                        <button
                          onClick={() =>
                            setExpandedIntegration(expanded ? null : intg.id)
                          }
                          className="rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-xs font-medium text-[var(--c-text2)] transition hover:border-[var(--c-green)] hover:text-[var(--c-green)]"
                        >
                          Подключить
                        </button>
                      )}
                    </div>

                    {expanded && !hasKey && (
                      <div className="border-t border-[var(--c-border)] px-4 pb-3 pt-3">
                        <label className="mb-1 block text-xs font-medium text-[var(--c-text2)]">
                          API-ключ {intg.label}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={keyValue}
                            onChange={(e) =>
                              handleApiKeyChange(intg.id, e.target.value)
                            }
                            placeholder="Вставьте ключ из личного кабинета"
                            className="h-9 flex-1 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
                          />
                          <button
                            onClick={() => setExpandedIntegration(null)}
                            disabled={!keyValue.trim()}
                            className={cn(
                              "rounded-lg px-3 text-xs font-semibold transition",
                              keyValue.trim()
                                ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90"
                                : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
                            )}
                          >
                            Сохранить
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="flex items-center justify-between pt-1">
              <button
                onClick={() => setStep(3)}
                className="text-sm text-[var(--c-text3)] transition hover:text-[var(--c-text2)]"
              >
                Пропустить
              </button>
              <button
                onClick={() => setStep(3)}
                disabled={!hasAnyApiKey}
                className={cn(
                  "flex items-center gap-2 rounded-xl px-6 py-2.5 text-sm font-semibold transition",
                  hasAnyApiKey
                    ? "bg-[var(--c-green)] text-[var(--c-bg)] hover:opacity-90"
                    : "bg-[var(--c-bg3)] text-[var(--c-text3)] cursor-not-allowed",
                )}
              >
                Далее
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        )}

        {/* Step 3: First product */}
        {step === 3 && (
          <div className="p-6 space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-[var(--c-text)]">
                Добавьте первый товар
              </h2>
              <p className="mt-0.5 text-sm text-[var(--c-text3)]">
                Необязательно — можно сделать позже
              </p>
            </div>

            {/* Modules enabled for this seller, derived from the onboarding
                profile via buildSellerModuleTabs (foundation contract). */}
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-4">
              <p className="text-xs font-medium uppercase text-[var(--c-text3)]">
                Ваши модули
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                {[...resolveEnabledModules({ segment: segment || null, channels })]
                  .filter((id) => GATED_MODULES.some((m) => m.id === id))
                  .map((id: ModuleId) => (
                    <span
                      key={id}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--c-border2)] bg-[var(--c-bg2)] px-2.5 py-1 text-xs text-[var(--c-text2)]"
                    >
                      <Check size={11} className="text-[var(--c-green)]" /> {MODULE_BY_ID[id].label}
                    </span>
                  ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              {/* Import from WB */}
              <button
                onClick={onComplete}
                className="flex flex-col items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-5 text-center transition hover:border-[var(--c-green)] hover:bg-[var(--c-green-dim)] group"
              >
                <div
                  className="flex h-12 w-12 items-center justify-center rounded-xl text-sm font-bold text-white"
                  style={{ backgroundColor: "#CB11AB" }}
                >
                  WB
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--c-text)] group-hover:text-[var(--c-green)] transition">
                    Импортировать с WB
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--c-text3)]">
                    Введите артикул и мы заполним данные
                  </p>
                </div>
              </button>

              {/* Create manually */}
              <button
                onClick={onComplete}
                className="flex flex-col items-center gap-3 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-5 text-center transition hover:border-[var(--c-green)] hover:bg-[var(--c-green-dim)] group"
              >
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-[var(--c-bg2)] border border-[var(--c-border)]">
                  <PlusCircle size={24} className="text-[var(--c-text2)] group-hover:text-[var(--c-green)] transition" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--c-text)] group-hover:text-[var(--c-green)] transition">
                    Создать вручную
                  </p>
                  <p className="mt-0.5 text-xs text-[var(--c-text3)]">
                    Заполните карточку товара самостоятельно
                  </p>
                </div>
              </button>
            </div>

            <div className="flex justify-center pt-1">
              <button
                onClick={onComplete}
                className="text-sm text-[var(--c-text3)] transition hover:text-[var(--c-text2)]"
              >
                Пропустить
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
