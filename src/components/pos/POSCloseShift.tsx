"use client";

import { useState, useMemo } from "react";
import { X, AlertTriangle, CheckCircle2, Banknote, CreditCard, Smartphone, TrendingUp, Package } from "lucide-react";
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

  const analytics = useMemo(() => {
    if (!session) return null;
    const receipts = session.receipts;

    // Revenue by payment method
    const byMethod = { cash: 0, card: 0, sbp: 0 };
    for (const r of receipts) {
      byMethod[r.paymentMethod] += r.total;
    }

    // Cash sales total (for expected drawer balance)
    const cashSalesTotal = byMethod.cash;

    // Top 5 products by units sold
    const productUnits = new Map<string, { name: string; units: number; revenue: number }>();
    for (const r of receipts) {
      for (const item of r.items) {
        const existing = productUnits.get(item.productId);
        if (existing) {
          existing.units += item.qty;
          existing.revenue += item.qty * item.unitPrice;
        } else {
          productUnits.set(item.productId, {
            name: item.productName,
            units: item.qty,
            revenue: item.qty * item.unitPrice,
          });
        }
      }
    }
    const topProducts = [...productUnits.values()]
      .sort((a, b) => b.units - a.units)
      .slice(0, 5);

    // Average ticket
    const avgTicket = receipts.length > 0 ? session.salesTotal / receipts.length : 0;

    return { byMethod, cashSalesTotal, topProducts, avgTicket };
  }, [session]);

  const expectedCash = useMemo(() => {
    if (!session || !analytics) return session?.openingCash ?? 0;
    return session.openingCash + analytics.cashSalesTotal;
  }, [session, analytics]);

  const countedNum = parseFloat(countedCash) || 0;
  const hasCountedCash = countedCash !== "";
  const discrepancy = hasCountedCash ? countedNum - expectedCash : 0;

  if (!session) return null;

  function handleConfirm() {
    endSession();
    toast.success("Смена закрыта");
    onConfirm(countedNum, note);
  }

  const openedAt = new Date(session.openedAt);
  const closedAt = new Date();
  const durationMs = closedAt.getTime() - openedAt.getTime();
  const durationHours = Math.floor(durationMs / 3600000);
  const durationMins = Math.floor((durationMs % 3600000) / 60000);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg bg-[var(--c-bg2)] border border-[var(--c-border2)] rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-4 sm:px-6 border-b border-[var(--c-border)] flex-shrink-0">
          <h2 className="text-base font-semibold text-[var(--c-text)]">Закрытие смены</h2>
          <button
            type="button"
            onClick={onClose}
            className="flex items-center justify-center w-8 h-8 rounded-lg text-[var(--c-text3)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          <div className="px-4 py-5 sm:px-6 space-y-5">
            {/* Session summary */}
            <div className="rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] px-4 py-3 space-y-2 text-sm">
              <div className="flex justify-between text-[var(--c-text2)]">
                <span>Касса открыта</span>
                <span className="text-[var(--c-text)]">
                  {openedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  {" — "}
                  {closedAt.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                  <span className="text-[var(--c-text3)] ml-1">
                    ({durationHours > 0 ? `${durationHours} ч ` : ""}{durationMins} мин)
                  </span>
                </span>
              </div>
              <div className="flex justify-between text-[var(--c-text2)]">
                <span>Кассир</span>
                <span className="text-[var(--c-text)]">{session.cashierName}</span>
              </div>
              <div className="flex justify-between text-[var(--c-text2)]">
                <span>Продаж</span>
                <span className="text-[var(--c-text)] font-medium">{session.transactionCount}</span>
              </div>
              {analytics && analytics.avgTicket > 0 && (
                <div className="flex justify-between text-[var(--c-text2)]">
                  <span>Средний чек</span>
                  <span className="text-[var(--c-text)] tabular">{formatRub(analytics.avgTicket)}</span>
                </div>
              )}
              <div className="flex justify-between text-[var(--c-text2)] border-t border-[var(--c-border)] pt-2">
                <span className="font-medium">Выручка</span>
                <span className="text-[var(--c-green)] font-semibold tabular">
                  {formatRub(session.salesTotal)}
                </span>
              </div>
            </div>

            {/* Payment method breakdown */}
            {analytics && session.transactionCount > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide flex items-center gap-1.5">
                  <TrendingUp className="w-3.5 h-3.5" />
                  По способам оплаты
                </p>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      { key: "cash" as const, label: "Наличные", Icon: Banknote, color: "var(--c-amber)" },
                      { key: "card" as const, label: "Карта", Icon: CreditCard, color: "var(--c-blue)" },
                      { key: "sbp" as const, label: "СБП", Icon: Smartphone, color: "var(--c-green)" },
                    ]
                  ).map(({ key, label, Icon, color }) => (
                    <div
                      key={key}
                      className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 py-2.5 space-y-1"
                    >
                      <div className="flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" style={{ color }} />
                        <span className="text-xs text-[var(--c-text3)]">{label}</span>
                      </div>
                      <p className="text-sm font-semibold text-[var(--c-text)] tabular">
                        {formatRub(analytics.byMethod[key])}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Top products */}
            {analytics && analytics.topProducts.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide flex items-center gap-1.5">
                  <Package className="w-3.5 h-3.5" />
                  Топ товаров за смену
                </p>
                <div className="rounded-xl border border-[var(--c-border)] overflow-hidden">
                  {analytics.topProducts.map((p, i) => (
                    <div
                      key={p.name}
                      className={`flex items-center gap-3 px-3 py-2 text-sm ${i % 2 === 0 ? "bg-[var(--c-bg3)]" : "bg-transparent"}`}
                    >
                      <span className="w-5 h-5 flex-shrink-0 flex items-center justify-center rounded-full bg-[var(--c-bg2)] text-[10px] font-bold text-[var(--c-text3)] border border-[var(--c-border)]">
                        {i + 1}
                      </span>
                      <span className="flex-1 text-[var(--c-text)] truncate">{p.name}</span>
                      <span className="text-[var(--c-text3)] tabular flex-shrink-0">{p.units} шт</span>
                      <span className="text-[var(--c-text2)] tabular flex-shrink-0 w-20 text-right">
                        {formatRub(p.revenue)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Expected cash */}
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-[var(--c-text3)] uppercase tracking-wide">
                Ожидаемый остаток в кассе
              </label>
              <div className="flex items-center justify-between px-4 py-2.5 rounded-xl bg-[var(--c-bg3)] border border-[var(--c-border)] text-sm">
                <span className="text-[var(--c-text2)]">
                  Остаток ({formatRub(session.openingCash)}) + наличные продажи ({formatRub(analytics?.cashSalesTotal ?? 0)})
                </span>
                <span className="font-semibold text-[var(--c-text)] tabular ml-2 flex-shrink-0">
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
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-[var(--c-text3)]">₽</span>
              </div>
            </div>

            {/* Discrepancy */}
            {hasCountedCash && (
              <div
                className={`flex items-center justify-between px-4 py-2.5 rounded-xl border text-sm font-medium ${
                  discrepancy >= 0
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
        </div>

        {/* Actions */}
        <div className="px-4 pb-5 pt-3 sm:px-6 sm:pb-6 flex gap-3 flex-shrink-0 border-t border-[var(--c-border)]">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 min-h-[44px] py-2.5 rounded-xl border border-[var(--c-border2)] text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] hover:bg-[var(--c-bg3)] transition-colors"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="flex-1 min-h-[44px] py-2.5 rounded-xl bg-[var(--c-red)] text-white text-sm font-semibold hover:opacity-90 active:scale-[0.98] transition-all"
          >
            Закрыть смену
          </button>
        </div>
      </div>
    </div>
  );
}
