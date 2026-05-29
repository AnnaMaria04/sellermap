"use client";

import { useMemo } from "react";
import { Check, RotateCcw } from "lucide-react";
import { useEnabledModules } from "@/hooks/useEnabledModules";
import { GATED_MODULES, SEGMENTS, MODULE_BY_ID, type ModuleId } from "@/lib/modules/registry";
import { resolveEnabledModules } from "@/lib/modules/resolve";
import { useSellerProfile } from "@/hooks/useSellerProfile";
import { cn } from "@/lib/utils";

export default function ModulesSettingsPage() {
  const { profile } = useSellerProfile();
  const { enabled, segment, overrides, setSegment, setOverride, resetOverrides } = useEnabledModules();

  // What the preset alone (no overrides) would enable — to label preset vs override.
  const presetEnabled = useMemo(
    () => resolveEnabledModules({ segment: segment ?? null, channels: profile.channels ?? [] }),
    [segment, profile.channels],
  );

  const isOn = (id: ModuleId) => (enabled ? enabled.has(id) : true);
  const hasOverride = (id: ModuleId) => overrides[id] !== undefined;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[var(--c-text)]">Модули</h1>
        <p className="mt-0.5 text-sm text-[var(--c-text2)]">
          Включайте только то, что нужно вашему бизнесу. Лишнее можно скрыть, а потом вернуть — данные не удаляются.
        </p>
      </div>

      {/* Segment */}
      <section className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
        <h2 className="text-sm font-semibold text-[var(--c-text)]">Тип бизнеса</h2>
        <p className="mt-0.5 text-sm text-[var(--c-text2)]">Задаёт набор модулей по умолчанию.</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {SEGMENTS.map((s) => (
            <button
              key={s.id}
              onClick={() => setSegment(s.id)}
              className={cn(
                "rounded-xl border p-3 text-left transition",
                segment === s.id ? "border-[var(--c-blue)] ring-1 ring-[var(--c-blue)]" : "border-[var(--c-border2)] hover:bg-[var(--c-bg)]",
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-[var(--c-text)]">{s.label}</span>
                {segment === s.id && <Check className="h-4 w-4 text-[var(--c-blue)]" />}
              </div>
              <span className="mt-0.5 block text-xs text-[var(--c-text3)]">{s.description}</span>
            </button>
          ))}
        </div>
      </section>

      {/* Module toggles */}
      <section className="rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
        <div className="mb-3 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--c-text)]">Дополнительные модули</h2>
            <p className="mt-0.5 text-sm text-[var(--c-text2)]">Базовые разделы (товары, заказы, клиенты, аналитика, финансы) включены всегда.</p>
          </div>
          {Object.keys(overrides).length > 0 && (
            <button onClick={resetOverrides} className="inline-flex items-center gap-1.5 rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text)] transition hover:bg-[var(--c-bg)]">
              <RotateCcw className="h-3.5 w-3.5" /> Сбросить к рекомендованным
            </button>
          )}
        </div>

        <div className="divide-y divide-[var(--c-border)]">
          {GATED_MODULES.map((m) => {
            const on = isOn(m.id);
            const byPreset = presetEnabled.has(m.id);
            return (
              <div key={m.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-[var(--c-text)]">{MODULE_BY_ID[m.id].label}</span>
                    {hasOverride(m.id) ? (
                      <span className="rounded bg-[var(--c-bg3)] px-1.5 py-0.5 text-[10px] text-[var(--c-text3)]">вручную</span>
                    ) : byPreset ? (
                      <span className="rounded bg-[var(--c-green-dim)] px-1.5 py-0.5 text-[10px] text-[var(--c-green)]">по умолчанию</span>
                    ) : null}
                  </div>
                  <p className="mt-0.5 text-xs text-[var(--c-text3)]">{m.description}</p>
                </div>
                <button
                  role="switch"
                  aria-checked={on}
                  aria-label={MODULE_BY_ID[m.id].label}
                  onClick={() => setOverride(m.id, byPreset ? (on ? false : null) : (on ? null : true))}
                  className={cn(
                    "relative h-6 w-11 shrink-0 rounded-full transition",
                    on ? "bg-[var(--c-green)]" : "bg-[var(--c-bg3)]",
                  )}
                >
                  <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white transition-all", on ? "left-[22px]" : "left-0.5")} />
                </button>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
