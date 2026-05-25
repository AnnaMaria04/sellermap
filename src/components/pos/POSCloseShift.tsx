"use client";

import { useState, useMemo } from "react";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { usePOSSession } from "@/store/pos-session";
import { formatRub } from "@/lib/utils";
import { toast } from "sonner";

interface POSCloseShiftProps {
  onClose: () => void;
  onConfirm: (countedCash: number, note: string) => void;
}

export function POSCloseShift({ onClose, onConfirm }: POSCloseShiftProps) {
  const { session, endSession } = usePOSSession();
  const [countedCash, setCountedCash] = useState("");
  const [note, setNote] = useState("");

  const expectedCash = useMemo(() => {
    if (!session) return 0;
    // Opening cash + approximate total sales (no payment method breakdown tracked)
    return session.openingCash + session.salesTotal;
  }, [session]);

  const countedNum = parseFloat(countedCash) || 0;
  const hasCountedCash = countedCash !== "";
  const discrepancy = hasCountedCash ? countedNum - expectedCash : 0;

  if (!session) return null;

  function handleConfirm() {
    endSession();
    toast.success("Смена закрыта");
    onConfirm(countedNum, note);
  }

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-md bg-[var(--c-bg2)] border border-[var(--c-border2)] rounded-2xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--c-border)]">
          <h2 className="text-base font-semibold text-[var(--c-text)]">Закрытие смены</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--c-text3)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="px-6 py-5 space-y-5">
          {/* Session summary */}
          <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] px-4 py-3 space-y-2 text-sm">
            <div className="flex justify-between text-[var(--c-text2)]">
              <span>Касса открыта</span>
              <span className="text-[var(--c-text)]">
                {new Date(session.openedAt).toLocaleTimeString("ru-RU", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>
            <div className="flex justify-between text-[var(--c-text2)]">
              <span>Продаж</span>
              <span className="text-[var(--c-text)] font-medium">{session.transactionCount}</span>
            </div>
            <div className="flex justify-between text-[var(--c-text2)]">
              <span>Выручка</span>
              <span className="text-[var(--c-green)] font-semibold tabular-nums">
                {formatRub(session.salesTotal)}
              </span>
            </div>
          </div>

          {/* Expected cash */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">
              Ожидаемый остаток
            </label>
            <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)]">
              <span className="text-sm text-[var(--c-text2)]">Приблизительно</span>
              <span className="text-sm font-semibold text-[var(--c-text)] tabular-nums">
                {formatRub(expectedCash)}
              </span>
            </div>
          </div>

          {/* Counted cash */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">
              Фактический остаток
            </label>
            <div className="relative">
              <input
                type="number"
                min="0"
                value={countedCash}
                onChange={(e) => setCountedCash(e.target.value)}
                placeholder="Введите сумму в кассе"
                className="w-full pl-3 pr-8 py-2.5 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-green)] transition-colors tabular-nums"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text3)]">
                ₽
              </span>
            </div>
          </div>

          {/* Discrepancy */}
          {hasCountedCash && (
            <div
              className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium ${
                discrepancy === 0
                  ? "bg-[var(--c-green-dim)] border-[var(--c-green)]/30 text-[var(--c-green)]"
                  : discrepancy > 0
                    ? "bg-[var(--c-green-dim)] border-[var(--c-green)]/30 text-[var(--c-green)]"
                    : "bg-[var(--c-red-dim)] border-[var(--c-red)]/30 text-[var(--c-red)]"
              }`}
            >
              <div className="flex items-center gap-2">
                {discrepancy < 0 ? (
                  <AlertTriangle className="w-4 h-4" />
                ) : (
                  <CheckCircle2 className="w-4 h-4" />
                )}
                <span>Расхождение</span>
              </div>
              <span className="tabular-nums">
                {discrepancy >= 0 ? "+" : ""}
                {formatRub(discrepancy)}
              </span>
            </div>
          )}

          {/* Note */}
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">
              Примечание (необязательно)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Комментарий к смене..."
              rows={2}
              className="w-full px-3 py-2.5 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:outline-none focus:border-[var(--c-green)] transition-colors resize-none"
            />
          </div>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 py-2.5 rounded-xl bg-[var(--c-red)] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Закрыть смену
          </button>
        </div>
      </div>
    </div>
  );
}
