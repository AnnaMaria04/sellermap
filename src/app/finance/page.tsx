"use client";

import { useState, useMemo } from "react";
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  Trash2,
  AlertTriangle,
  CheckCircle2,
  Settings,
  FileText,
  X,
  ChevronDown,
  Info,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useFinance } from "@/hooks/useFinance";
import { useInventory } from "@/contexts/InventoryContext";
import { computeTax, formatRubShort } from "@/lib/tax";
import {
  EXPENSE_CATEGORY_LABELS,
  TAX_REGIME_LABELS,
  type ExpenseCategory,
  type Expense,
  type TaxRegime,
  type TaxSettings,
} from "@/types/finance";

type Tab = "pnl" | "taxes" | "settings";

const CURRENT_YEAR = new Date().getFullYear();

// ─── helpers ──────────────────────────────────────────────────────────────────

function rub(n: number) {
  return n.toLocaleString("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 0 });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

// ─── sub-components ───────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "green" | "red" | "amber" | "default";
}) {
  const color =
    tone === "green" ? "text-[var(--c-green)]" :
    tone === "red" ? "text-[var(--c-red)]" :
    tone === "amber" ? "text-[var(--c-amber)]" :
    "text-[var(--c-text)]";
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
      <p className="text-xs font-medium text-[var(--c-text3)]">{label}</p>
      <p className={cn("mt-1 text-2xl font-bold tabular", color)}>{value}</p>
      {sub && <p className="mt-0.5 text-xs text-[var(--c-text3)]">{sub}</p>}
    </div>
  );
}

function TaxRegimeBadge({ regime }: { regime: TaxRegime }) {
  return (
    <span className="inline-flex items-center rounded-full border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2.5 py-0.5 text-xs font-medium text-[var(--c-text2)]">
      {TAX_REGIME_LABELS[regime]}
    </span>
  );
}

// ─── Expense form ─────────────────────────────────────────────────────────────

function ExpenseForm({ onSave, onClose }: { onSave: (e: Omit<Expense, "id" | "createdAt">) => void; onClose: () => void }) {
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [category, setCategory] = useState<ExpenseCategory>("other");
  const [vendor, setVendor] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [isPersonalPurchase, setIsPersonalPurchase] = useState(false);
  const [excludeFromTax, setExcludeFromTax] = useState(false);
  const [hasDocument, setHasDocument] = useState(false);

  const legallyDeductible: ExpenseCategory[] = ["logistics", "packaging", "salary", "rent", "equipment", "software", "legal", "bank", "insurance", "utilities"];
  const showDocWarning = legallyDeductible.includes(category) && !hasDocument && !excludeFromTax;

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const amt = parseFloat(amount.replace(",", "."));
    if (!amt || isNaN(amt)) return;
    onSave({ date, category, vendor, description, amount: amt, isPersonalPurchase, excludeFromTax, hasDocument });
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur px-4">
      <div className="w-full max-w-md rounded-2xl border border-[var(--c-border)] bg-[var(--c-bg)] shadow-2xl">
        <div className="flex items-center justify-between border-b border-[var(--c-border)] px-6 py-4">
          <h2 className="text-base font-semibold text-[var(--c-text)]">Добавить расход</h2>
          <button onClick={onClose} className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--c-text2)] hover:bg-[var(--c-bg3)]">
            <X size={16} />
          </button>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Дата</label>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="h-10 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Сумма, ₽ <span className="text-[var(--c-red)]">*</span></label>
              <input
                type="text"
                inputMode="decimal"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0"
                required
                className="h-10 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Категория</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as ExpenseCategory)}
              className="h-10 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
            >
              {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((k) => (
                <option key={k} value={k}>{EXPENSE_CATEGORY_LABELS[k]}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Поставщик / получатель</label>
            <input
              type="text"
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Яндекс, Wildberries, ИП Иванов…"
              className="h-10 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Описание</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Аренда склада за май, реклама ВКонтакте…"
              className="h-10 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] placeholder:text-[var(--c-text3)] focus:border-[var(--c-green)] focus:outline-none"
            />
          </div>

          <div className="space-y-2">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={isPersonalPurchase}
                onChange={(e) => setIsPersonalPurchase(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-[var(--c-green)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--c-text)]">Личная покупка</p>
                <p className="text-xs text-[var(--c-text3)]">Куплено на личные средства без кассового документа</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={excludeFromTax}
                onChange={(e) => setExcludeFromTax(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-[var(--c-green)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--c-text)]">Не учитывать в налоге</p>
                <p className="text-xs text-[var(--c-text3)]">Расход уже включён или не подлежит вычету</p>
              </div>
            </label>
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={hasDocument}
                onChange={(e) => setHasDocument(e.target.checked)}
                className="mt-0.5 h-4 w-4 rounded accent-[var(--c-green)]"
              />
              <div>
                <p className="text-sm font-medium text-[var(--c-text)]">Есть подтверждающий документ</p>
                <p className="text-xs text-[var(--c-text3)]">Чек, акт, договор</p>
              </div>
            </label>
          </div>

          {showDocWarning && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[rgba(245,158,11,0.3)] bg-[var(--c-amber-dim)] px-4 py-3">
              <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--c-amber)]" />
              <p className="text-xs text-[var(--c-amber)]">
                Без подтверждающего документа налоговая может отказать в вычете этого расхода.
              </p>
            </div>
          )}

          {isPersonalPurchase && (
            <div className="flex items-start gap-2.5 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] px-4 py-3">
              <Info size={15} className="mt-0.5 shrink-0 text-[var(--c-text3)]" />
              <p className="text-xs text-[var(--c-text3)]">
                Эта сумма учитывается в реальной прибыли, но не уменьшает налогооблагаемую базу.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="h-10 rounded-lg border border-[var(--c-border2)] px-4 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!amount}
              className="h-10 rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] disabled:opacity-50 transition"
            >
              Добавить
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function FinancePage() {
  const { expenses, taxSettings, addExpense, deleteExpense, saveTaxSettings } = useFinance();
  const { orders } = useInventory();

  const [tab, setTab] = useState<Tab>("pnl");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<ExpenseCategory | "all">("all");
  const [showSettings, setShowSettings] = useState(false);
  const [draftSettings, setDraftSettings] = useState<TaxSettings>(taxSettings);

  // Revenue from realized orders this year
  const revenue = useMemo(() => {
    const yearStr = String(CURRENT_YEAR);
    return orders
      .filter((o) => (o.status === "shipped" || o.status === "delivered") && o.createdAt.startsWith(yearStr))
      .reduce((s, o) => s + o.revenue, 0);
  }, [orders]);

  const filteredExpenses = useMemo(() => {
    if (categoryFilter === "all") return expenses;
    return expenses.filter((e) => e.category === categoryFilter);
  }, [expenses, categoryFilter]);

  const totals = useMemo(() => {
    const all = expenses.reduce((s, e) => s + e.amount, 0);
    const deductible = expenses
      .filter((e) => !e.isPersonalPurchase && !e.excludeFromTax)
      .reduce((s, e) => s + e.amount, 0);
    const personal = expenses.filter((e) => e.isPersonalPurchase).reduce((s, e) => s + e.amount, 0);
    const missingDocs = expenses.filter(
      (e) => !e.hasDocument && !e.excludeFromTax && !e.isPersonalPurchase,
    ).length;
    return { all, deductible, personal, missingDocs };
  }, [expenses]);

  const taxCalc = useMemo(
    () => computeTax(revenue, totals.deductible, totals.all, taxSettings),
    [revenue, totals.deductible, totals.all, taxSettings],
  );

  const tabs: { id: Tab; label: string }[] = [
    { id: "pnl", label: "Доходы и расходы" },
    { id: "taxes", label: "Налоги" },
    { id: "settings", label: "Настройки" },
  ];

  return (
    <main className="min-h-screen bg-[var(--c-bg)]">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-[var(--c-text)]">Финансы и налоги</h1>
            <p className="mt-1 text-sm text-[var(--c-text3)]">
              Учёт расходов, налоговый расчёт и реальная прибыль
            </p>
          </div>
          <div className="flex items-center gap-2">
            <TaxRegimeBadge regime={taxSettings.regime} />
            <button
              onClick={() => { setTab("settings"); setDraftSettings(taxSettings); }}
              className="flex h-9 items-center gap-2 rounded-lg border border-[var(--c-border2)] px-3 text-sm text-[var(--c-text2)] hover:text-[var(--c-text)] transition"
            >
              <Settings size={14} />
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <KpiCard label="Выручка (YTD)" value={formatRubShort(revenue)} tone="green" />
          <KpiCard label="Расходы (YTD)" value={formatRubShort(totals.all)} tone="red" />
          <KpiCard label="Налог (оценка)" value={formatRubShort(taxCalc.totalTax)} tone="amber" sub={`${taxCalc.taxRate}% ставка`} />
          <KpiCard
            label="Реальная прибыль"
            value={formatRubShort(taxCalc.realNetProfit)}
            tone={taxCalc.realNetProfit >= 0 ? "green" : "red"}
          />
        </div>

        {/* Warnings */}
        {taxCalc.vatWarning && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[rgba(240,80,80,0.3)] bg-[var(--c-red-dim)] px-4 py-3">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--c-red)]" />
            <p className="text-sm text-[var(--c-red)]">
              Выручка превысила 60 млн ₽ — вы стали плательщиком НДС. Обратитесь к бухгалтеру.
            </p>
          </div>
        )}
        {taxCalc.npd_limitWarning && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[rgba(245,158,11,0.3)] bg-[var(--c-amber-dim)] px-4 py-3">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--c-amber)]" />
            <p className="text-sm text-[var(--c-amber)]">
              Выручка превысила 2,4 млн ₽ — лимит НПД исчерпан. Смените режим до конца года.
            </p>
          </div>
        )}
        {totals.missingDocs > 0 && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-[rgba(245,158,11,0.2)] bg-[var(--c-amber-dim)] px-4 py-3">
            <AlertTriangle size={15} className="mt-0.5 shrink-0 text-[var(--c-amber)]" />
            <p className="text-sm text-[var(--c-amber)]">
              {totals.missingDocs} {totals.missingDocs === 1 ? "расход без" : "расхода без"} подтверждающего документа — налоговая может отказать в вычете.
            </p>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-5 flex gap-1 rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-1 w-fit">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={cn(
                "rounded-lg px-4 py-1.5 text-sm font-medium transition whitespace-nowrap",
                tab === t.id
                  ? "bg-[var(--c-bg3)] text-[var(--c-text)]"
                  : "text-[var(--c-text2)] hover:text-[var(--c-text)]",
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* P&L Tab */}
        {tab === "pnl" && (
          <div className="space-y-6">
            {/* P&L summary */}
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {/* Tax P&L */}
              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text3)]">Налоговый P&L</p>
                <div className="mt-4 space-y-2">
                  <PnlRow label="Выручка" value={revenue} positive />
                  <PnlRow label="Вычитаемые расходы" value={-totals.deductible} />
                  <PnlRow label="Страховые взносы" value={-taxCalc.insuranceContributions} />
                  <PnlRow label={`Налог (${taxCalc.taxRate}%)`} value={-taxCalc.taxAfterInsurance} />
                  <div className="border-t border-[var(--c-border)] pt-2 mt-2">
                    <PnlRow label="Налоговая прибыль" value={taxCalc.netProfit} bold />
                  </div>
                </div>
              </div>

              {/* Real P&L */}
              <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text3)]">Реальный P&L</p>
                <div className="mt-4 space-y-2">
                  <PnlRow label="Выручка" value={revenue} positive />
                  <PnlRow label="Все расходы (включая личные)" value={-totals.all} />
                  <PnlRow label="Налог уплаченный" value={-taxCalc.totalTax} />
                  <div className="border-t border-[var(--c-border)] pt-2 mt-2">
                    <PnlRow label="Реальная прибыль" value={taxCalc.realNetProfit} bold />
                  </div>
                </div>
                {totals.personal > 0 && (
                  <p className="mt-3 text-[11px] text-[var(--c-text3)]">
                    ≈ {formatRubShort(totals.personal)} личных расходов включены в реальный P&L, но не в налоговый.
                  </p>
                )}
              </div>
            </div>

            {/* Expense journal */}
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
              <div className="flex items-center justify-between border-b border-[var(--c-border)] px-5 py-4">
                <h2 className="text-sm font-semibold text-[var(--c-text)]">Журнал расходов</h2>
                <div className="flex items-center gap-2">
                  <select
                    value={categoryFilter}
                    onChange={(e) => setCategoryFilter(e.target.value as ExpenseCategory | "all")}
                    className="h-8 rounded-lg border border-[var(--c-border2)] bg-[var(--c-bg3)] px-2 text-xs text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                  >
                    <option value="all">Все категории</option>
                    {(Object.keys(EXPENSE_CATEGORY_LABELS) as ExpenseCategory[]).map((k) => (
                      <option key={k} value={k}>{EXPENSE_CATEGORY_LABELS[k]}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="flex h-8 items-center gap-1.5 rounded-lg bg-[var(--c-green)] px-3 text-xs font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
                  >
                    <Plus size={13} />
                    Добавить
                  </button>
                </div>
              </div>

              {filteredExpenses.length === 0 ? (
                <div className="flex flex-col items-center gap-3 py-10 text-center">
                  <Receipt size={28} className="text-[var(--c-text3)]" />
                  <p className="text-sm text-[var(--c-text3)]">Расходов пока нет</p>
                  <button
                    onClick={() => setShowAddExpense(true)}
                    className="flex h-9 items-center gap-2 rounded-lg bg-[var(--c-green)] px-4 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
                  >
                    <Plus size={15} />
                    Добавить расход
                  </button>
                </div>
              ) : (
                <div className="divide-y divide-[var(--c-border)]">
                  {filteredExpenses.map((expense) => (
                    <ExpenseRow key={expense.id} expense={expense} onDelete={deleteExpense} />
                  ))}
                </div>
              )}

              {filteredExpenses.length > 0 && (
                <div className="border-t border-[var(--c-border)] px-5 py-3 flex justify-between">
                  <span className="text-xs text-[var(--c-text3)]">
                    {filteredExpenses.length} записей
                  </span>
                  <span className="text-sm font-semibold text-[var(--c-text)]">
                    Итого: {rub(filteredExpenses.reduce((s, e) => s + e.amount, 0))}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Taxes Tab */}
        {tab === "taxes" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text3)] mb-4">
                Расчёт налога — {taxSettings.regime === "usn_income" ? "УСН Доходы" : TAX_REGIME_LABELS[taxSettings.regime]}
              </p>
              <div className="space-y-3">
                <TaxDetailRow label="Выручка (налоговая база)" value={rub(revenue)} />
                {(taxSettings.regime === "usn_profit" || taxSettings.regime === "osno" || (taxSettings.regime === "ausn" && taxSettings.ausnType === "profit")) && (
                  <TaxDetailRow label="Вычитаемые расходы" value={`−${rub(totals.deductible)}`} dim />
                )}
                <TaxDetailRow label="Налоговая база" value={rub(taxCalc.taxBase)} bold />
                <TaxDetailRow label={`Ставка налога`} value={`${taxCalc.taxRate}%`} />
                <TaxDetailRow label="Налог до вычетов" value={rub(taxCalc.taxBeforeDeductions)} />
                <TaxDetailRow label="Страховые взносы (2026)" value={`−${rub(taxCalc.insuranceContributions)}`} dim />
                <div className="border-t border-[var(--c-border)] pt-3">
                  <TaxDetailRow label="Налог к уплате" value={rub(taxCalc.taxAfterInsurance)} bold accent />
                </div>
                <TaxDetailRow label="Взносы к уплате" value={rub(taxCalc.insuranceContributions)} />
                <div className="border-t border-[var(--c-border)] pt-3">
                  <TaxDetailRow label="Всего налогов и взносов" value={rub(taxCalc.totalTax)} bold />
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-[var(--c-text3)] mb-4">
                Сравнение режимов при текущей выручке {formatRubShort(revenue)}
              </p>
              <RegimeComparison revenue={revenue} deductible={totals.deductible} allExpenses={totals.all} current={taxSettings} />
            </div>
          </div>
        )}

        {/* Settings Tab */}
        {tab === "settings" && (
          <div className="space-y-5">
            <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-6 space-y-5">
              <h2 className="text-sm font-semibold text-[var(--c-text)]">Налоговый режим</h2>

              <div>
                <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Режим налогообложения</label>
                <select
                  value={draftSettings.regime}
                  onChange={(e) => setDraftSettings((p) => ({ ...p, regime: e.target.value as TaxRegime }))}
                  className="h-10 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                >
                  {(Object.keys(TAX_REGIME_LABELS) as TaxRegime[]).map((r) => (
                    <option key={r} value={r}>{TAX_REGIME_LABELS[r]}</option>
                  ))}
                </select>
              </div>

              <label className="flex items-center gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={draftSettings.hasEmployees}
                  onChange={(e) => setDraftSettings((p) => ({ ...p, hasEmployees: e.target.checked }))}
                  className="h-4 w-4 rounded accent-[var(--c-green)]"
                />
                <div>
                  <p className="text-sm font-medium text-[var(--c-text)]">Есть наёмные сотрудники</p>
                  <p className="text-xs text-[var(--c-text3)]">Влияет на максимальный вычет страховых взносов (50% при УСН Доходы)</p>
                </div>
              </label>

              {(draftSettings.regime === "usn_income" || draftSettings.regime === "usn_profit") && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
                    Региональная ставка (%) — оставьте пустым для федеральной
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={draftSettings.regime === "usn_income" ? 6 : 15}
                    value={draftSettings.regionalRate ?? ""}
                    onChange={(e) => setDraftSettings((p) => ({ ...p, regionalRate: e.target.value ? Number(e.target.value) : undefined }))}
                    placeholder={draftSettings.regime === "usn_income" ? "6" : "15"}
                    className="h-10 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                  />
                </div>
              )}

              {draftSettings.regime === "patent" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">
                    Потенциальный годовой доход по патенту (₽)
                  </label>
                  <input
                    type="number"
                    value={draftSettings.patentAnnualIncome ?? 500000}
                    onChange={(e) => setDraftSettings((p) => ({ ...p, patentAnnualIncome: Number(e.target.value) }))}
                    className="h-10 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                  />
                </div>
              )}

              {draftSettings.regime === "ausn" && (
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-[var(--c-text2)]">Вариант АУСН</label>
                  <select
                    value={draftSettings.ausnType ?? "income"}
                    onChange={(e) => setDraftSettings((p) => ({ ...p, ausnType: e.target.value as "income" | "profit" }))}
                    className="h-10 w-full rounded-lg border border-[var(--c-border)] bg-[var(--c-bg3)] px-3 text-sm text-[var(--c-text)] focus:border-[var(--c-green)] focus:outline-none"
                  >
                    <option value="income">Доходы (8%)</option>
                    <option value="profit">Доходы минус расходы (20%)</option>
                  </select>
                </div>
              )}

              <button
                onClick={() => { saveTaxSettings(draftSettings); setTab("taxes"); }}
                className="flex h-10 items-center gap-2 rounded-lg bg-[var(--c-green)] px-5 text-sm font-semibold text-[var(--c-bg)] hover:bg-[#25e890] transition"
              >
                Сохранить настройки
              </button>
            </div>
          </div>
        )}
      </div>

      {showAddExpense && (
        <ExpenseForm onSave={addExpense} onClose={() => setShowAddExpense(false)} />
      )}
    </main>
  );
}

// ─── Helper components ────────────────────────────────────────────────────────

function PnlRow({ label, value, positive, bold }: { label: string; value: number; positive?: boolean; bold?: boolean }) {
  const isPositive = positive || value >= 0;
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn("text-sm", bold ? "font-semibold text-[var(--c-text)]" : "text-[var(--c-text3)]")}>{label}</span>
      <span className={cn(
        "text-sm tabular font-medium",
        bold ? "font-bold" : "",
        isPositive ? "text-[var(--c-green)]" : "text-[var(--c-red)]",
      )}>
        {value >= 0 ? "+" : ""}{rub(value)}
      </span>
    </div>
  );
}

function TaxDetailRow({ label, value, bold, dim, accent }: { label: string; value: string; bold?: boolean; dim?: boolean; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className={cn(
        "text-sm",
        dim ? "text-[var(--c-text3)]" : bold ? "text-[var(--c-text)] font-semibold" : "text-[var(--c-text2)]",
      )}>
        {label}
      </span>
      <span className={cn(
        "text-sm tabular",
        bold ? "font-bold" : "",
        accent ? "text-[var(--c-amber)] font-bold" : dim ? "text-[var(--c-text3)]" : "text-[var(--c-text)]",
      )}>
        {value}
      </span>
    </div>
  );
}

function ExpenseRow({ expense, onDelete }: { expense: Expense; onDelete: (id: string) => void }) {
  return (
    <div className="flex items-center gap-3 px-5 py-3 hover:bg-[var(--c-bg3)] transition group">
      <div className="shrink-0 w-9 h-9 rounded-lg bg-[var(--c-bg3)] border border-[var(--c-border)] flex items-center justify-center">
        {expense.isPersonalPurchase ? (
          <span className="text-base">👤</span>
        ) : expense.hasDocument ? (
          <FileText size={16} className="text-[var(--c-green)]" />
        ) : (
          <Receipt size={16} className="text-[var(--c-text3)]" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-sm font-medium text-[var(--c-text)] truncate">
            {expense.description || expense.vendor || EXPENSE_CATEGORY_LABELS[expense.category]}
          </p>
          {expense.isPersonalPurchase && (
            <span className="text-[10px] rounded border border-[var(--c-border2)] bg-[var(--c-bg3)] px-1.5 py-0.5 text-[var(--c-text3)]">личное</span>
          )}
          {!expense.hasDocument && !expense.isPersonalPurchase && !expense.excludeFromTax && (
            <span className="text-[10px] rounded border border-[rgba(245,158,11,0.3)] bg-[var(--c-amber-dim)] px-1.5 py-0.5 text-[var(--c-amber)]">нет документа</span>
          )}
        </div>
        <p className="text-xs text-[var(--c-text3)]">
          {EXPENSE_CATEGORY_LABELS[expense.category]}
          {expense.vendor && ` · ${expense.vendor}`}
          {" · "}{formatDate(expense.date)}
        </p>
      </div>
      <div className="text-right shrink-0">
        <p className="text-sm font-semibold text-[var(--c-text)] tabular">{rub(expense.amount)}</p>
        {expense.excludeFromTax && (
          <p className="text-[10px] text-[var(--c-text3)]">не в налоге</p>
        )}
      </div>
      <button
        onClick={() => onDelete(expense.id)}
        className="opacity-0 group-hover:opacity-100 ml-1 flex h-7 w-7 shrink-0 items-center justify-center rounded-lg text-[var(--c-text3)] hover:bg-[var(--c-red-dim)] hover:text-[var(--c-red)] transition"
      >
        <Trash2 size={14} />
      </button>
    </div>
  );
}

const REGIME_ORDER: TaxRegime[] = ["usn_income", "usn_profit", "npd", "patent", "ausn", "osno"];

function RegimeComparison({
  revenue,
  deductible,
  allExpenses,
  current,
}: {
  revenue: number;
  deductible: number;
  allExpenses: number;
  current: TaxSettings;
}) {
  const results = REGIME_ORDER.map((regime) => {
    const settings: TaxSettings = { ...current, regime };
    const calc = computeTax(revenue, deductible, allExpenses, settings);
    return { regime, totalTax: calc.totalTax, netProfit: calc.realNetProfit };
  });

  const minTax = Math.min(...results.map((r) => r.totalTax));

  return (
    <div className="space-y-2">
      {results.map(({ regime, totalTax, netProfit }) => {
        const isCurrent = regime === current.regime;
        const isBest = totalTax === minTax;
        return (
          <div
            key={regime}
            className={cn(
              "flex items-center justify-between rounded-lg px-4 py-2.5 transition",
              isCurrent ? "border border-[var(--c-green)] bg-[var(--c-green-dim)]" : "border border-[var(--c-border)] bg-[var(--c-bg3)]",
            )}
          >
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-sm text-[var(--c-text)] font-medium truncate">{TAX_REGIME_LABELS[regime]}</span>
              {isBest && <span className="shrink-0 text-[10px] rounded-full bg-[var(--c-green-dim)] px-2 py-0.5 text-[var(--c-green)] font-medium">выгоднее всего</span>}
              {isCurrent && <span className="shrink-0 text-[10px] rounded-full bg-[var(--c-border)] px-2 py-0.5 text-[var(--c-text3)]">текущий</span>}
            </div>
            <div className="text-right shrink-0 ml-3">
              <p className="text-sm font-bold text-[var(--c-text)] tabular">{formatRubShort(totalTax)}</p>
              <p className="text-[11px] text-[var(--c-text3)] tabular">прибыль: {formatRubShort(netProfit)}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
