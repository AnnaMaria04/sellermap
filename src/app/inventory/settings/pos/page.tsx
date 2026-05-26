"use client";

import { useState } from "react";
import { InventoryShell } from "@/components/inventory/InventoryShell";
import { useManagerPin } from "@/store/manager-pin";
import { cn } from "@/lib/utils";
import {
  MonitorSmartphone,
  Lock,
  Unlock,
  Eye,
  EyeOff,
  Check,
  Percent,
  AlertCircle,
  ShieldCheck,
} from "lucide-react";

function SectionCard({ icon, title, children }: { icon: React.ReactNode; title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] overflow-hidden">
      <div className="flex items-center gap-2.5 border-b border-[var(--c-border)] px-5 py-4">
        <span className="text-[var(--c-text2)]">{icon}</span>
        <h3 className="text-sm font-semibold text-[var(--c-text)]">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function PINSetup() {
  const { pinHash, setPin, clearPin, verifyPin, discountThresholdPct, setDiscountThreshold } = useManagerPin();
  const [mode, setMode] = useState<"view" | "set" | "change" | "remove">("view");
  const [currentPin, setCurrentPin] = useState("");
  const [newPin, setNewPin] = useState("");
  const [confirmPin, setConfirmPin] = useState("");
  const [showPin, setShowPin] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  function flash(msg?: string) {
    if (msg) setError(msg);
    else { setSuccess(true); setTimeout(() => { setSuccess(false); setMode("view"); }, 1500); }
  }

  function handleSet() {
    setError(null);
    if (newPin.length < 4) return flash("ПИН должен быть не менее 4 цифр");
    if (!/^\d+$/.test(newPin)) return flash("ПИН должен содержать только цифры");
    if (newPin !== confirmPin) return flash("ПИНы не совпадают");
    if (mode === "change" && !verifyPin(currentPin)) return flash("Неверный текущий ПИН");
    setPin(newPin);
    setNewPin(""); setConfirmPin(""); setCurrentPin("");
    flash();
  }

  function handleRemove() {
    setError(null);
    if (!verifyPin(currentPin)) return flash("Неверный ПИН");
    clearPin();
    setCurrentPin("");
    flash();
  }

  const hasPIN = !!pinHash;

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className={cn(
        "flex items-center gap-2.5 rounded-lg px-4 py-3",
        hasPIN ? "bg-[var(--c-green-dim)]" : "bg-[var(--c-bg3)]",
      )}>
        {hasPIN
          ? <><ShieldCheck size={16} className="text-[var(--c-green)] shrink-0" /><span className="text-sm font-medium text-[var(--c-green)]">ПИН-код менеджера установлен</span></>
          : <><Unlock size={16} className="text-[var(--c-text3)] shrink-0" /><span className="text-sm text-[var(--c-text2)]">ПИН не настроен — скидки не требуют подтверждения</span></>
        }
      </div>

      {/* Threshold */}
      <div className="flex items-center justify-between gap-6">
        <div>
          <p className="text-sm text-[var(--c-text)]">Порог скидки</p>
          <p className="text-xs text-[var(--c-text3)] mt-0.5">Скидка выше этого % запрашивает ПИН менеджера</p>
        </div>
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            min={1}
            max={100}
            value={discountThresholdPct}
            onChange={(e) => setDiscountThreshold(Math.min(100, Math.max(1, Number(e.target.value))))}
            className="h-8 w-20 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-right text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
          />
          <Percent size={13} className="text-[var(--c-text3)]" />
        </div>
      </div>

      {/* Action buttons */}
      {mode === "view" && (
        <div className="flex gap-2">
          <button
            onClick={() => { setMode(hasPIN ? "change" : "set"); setError(null); }}
            className="flex items-center gap-1.5 rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-2 text-sm font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
          >
            <Lock size={14} />
            {hasPIN ? "Сменить ПИН" : "Установить ПИН"}
          </button>
          {hasPIN && (
            <button
              onClick={() => { setMode("remove"); setError(null); }}
              className="flex items-center gap-1.5 rounded-lg border border-[var(--c-red)]/40 bg-[var(--c-red-dim)] px-4 py-2 text-sm font-medium text-[var(--c-red)] hover:opacity-80 transition"
            >
              <Unlock size={14} />
              Удалить ПИН
            </button>
          )}
        </div>
      )}

      {/* Set / Change form */}
      {(mode === "set" || mode === "change") && (
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4 space-y-3">
          {mode === "change" && (
            <div>
              <label className="block text-xs font-medium text-[var(--c-text2)] mb-1">Текущий ПИН</label>
              <div className="relative">
                <input
                  type={showPin ? "text" : "password"}
                  inputMode="numeric"
                  value={currentPin}
                  onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
                  maxLength={8}
                  placeholder="••••"
                  className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 pr-9 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                />
                <button onClick={() => setShowPin((v) => !v)} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[var(--c-text3)]">
                  {showPin ? <EyeOff size={14} /> : <Eye size={14} />}
                </button>
              </div>
            </div>
          )}
          <div>
            <label className="block text-xs font-medium text-[var(--c-text2)] mb-1">Новый ПИН (минимум 4 цифры)</label>
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              value={newPin}
              onChange={(e) => setNewPin(e.target.value.replace(/\D/g, ""))}
              maxLength={8}
              placeholder="••••"
              className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-[var(--c-text2)] mb-1">Подтвердите ПИН</label>
            <input
              type={showPin ? "text" : "password"}
              inputMode="numeric"
              value={confirmPin}
              onChange={(e) => setConfirmPin(e.target.value.replace(/\D/g, ""))}
              maxLength={8}
              placeholder="••••"
              className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
            />
          </div>
          {error && (
            <div className="flex items-center gap-1.5 rounded-lg bg-[var(--c-red-dim)] px-3 py-2 text-xs text-[var(--c-red)]">
              <AlertCircle size={13} />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-1.5 rounded-lg bg-[var(--c-green-dim)] px-3 py-2 text-xs text-[var(--c-green)]">
              <Check size={13} />
              ПИН сохранён
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setMode("view"); setError(null); setNewPin(""); setConfirmPin(""); setCurrentPin(""); }}
              className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-2 text-sm font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              Отмена
            </button>
            <button onClick={handleSet}
              className="rounded-lg bg-[var(--c-green)] px-4 py-2 text-sm font-medium text-white hover:opacity-90 transition"
            >
              Сохранить
            </button>
          </div>
        </div>
      )}

      {/* Remove form */}
      {mode === "remove" && (
        <div className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg)] p-4 space-y-3">
          <div>
            <label className="block text-xs font-medium text-[var(--c-text2)] mb-1">Введите текущий ПИН для подтверждения</label>
            <input
              type="password"
              inputMode="numeric"
              value={currentPin}
              onChange={(e) => setCurrentPin(e.target.value.replace(/\D/g, ""))}
              maxLength={8}
              placeholder="••••"
              className="w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
            />
          </div>
          {error && (
            <div className="flex items-center gap-1.5 rounded-lg bg-[var(--c-red-dim)] px-3 py-2 text-xs text-[var(--c-red)]">
              <AlertCircle size={13} />
              {error}
            </div>
          )}
          {success && (
            <div className="flex items-center gap-1.5 rounded-lg bg-[var(--c-green-dim)] px-3 py-2 text-xs text-[var(--c-green)]">
              <Check size={13} />
              ПИН удалён
            </div>
          )}
          <div className="flex gap-2">
            <button onClick={() => { setMode("view"); setError(null); setCurrentPin(""); }}
              className="rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-2 text-sm font-medium text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              Отмена
            </button>
            <button onClick={handleRemove}
              className="rounded-lg border border-[var(--c-red)]/40 bg-[var(--c-red-dim)] px-4 py-2 text-sm font-medium text-[var(--c-red)] hover:opacity-80 transition"
            >
              Удалить ПИН
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function SettingsPOSPage() {
  return (
    <InventoryShell title="Настройки кассы" subtitle="ПИН менеджера, лимиты скидок и параметры смены">
      <div className="space-y-5">
        <SectionCard icon={<MonitorSmartphone size={15} />} title="Параметры кассы">
          <div className="flex items-center justify-between gap-6">
            <div>
              <p className="text-sm text-[var(--c-text)]">Печать чека по умолчанию</p>
              <p className="text-xs text-[var(--c-text3)] mt-0.5">Открывать диалог печати после каждой продажи</p>
            </div>
            <span className="text-xs text-[var(--c-text3)]">Настраивается на кассе</span>
          </div>
        </SectionCard>

        <SectionCard icon={<Lock size={15} />} title="ПИН менеджера">
          <p className="text-sm text-[var(--c-text2)]">
            Если ПИН установлен, кассир должен ввести код менеджера при применении скидки выше порогового значения.
          </p>
          <PINSetup />
        </SectionCard>
      </div>
    </InventoryShell>
  );
}
