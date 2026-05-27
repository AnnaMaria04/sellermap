"use client";

import { useMemo } from "react";
import { AlertTriangle, Download } from "lucide-react";
import { useInventory } from "@/contexts/InventoryContext";
import { useFinance } from "@/hooks/useFinance";
import { computePnL } from "@/lib/inventory/finance";
import { computeTax, calcInsurance, quarterSchedule, thresholdWarnings } from "@/lib/finance/tax";
import { EXPENSE_CATEGORY_LABELS, type TaxRegime } from "@/types/finance";
import { exportData } from "@/lib/export";
import { formatRub } from "@/lib/utils";

interface KudirRow { n: number; date: string; content: string; income: number | string; expense: number | string }

const REGIMES: { id: TaxRegime; name: string; rate: string; desc: string }[] = [
  { id: "usn_income", name: "УСН «Доходы»", rate: "6%", desc: "Налог с выручки. Уменьшается на взносы." },
  { id: "usn_profit", name: "УСН «Д − Р»", rate: "15%", desc: "Налог с прибыли. Нужны документы на расходы." },
  { id: "patent", name: "Патент (ПСН)", rate: "6% ПВГД", desc: "Фиксированная стоимость патента." },
  { id: "npd", name: "НПД", rate: "4–6%", desc: "Самозанятый. Лимит 2,4 млн ₽." },
  { id: "osno", name: "ОСНО", rate: "НДФЛ+НДС", desc: "Общий режим." },
];

function pct(n: number) {
  return `${(n * 100).toLocaleString("ru-RU", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
}

function KPI({ label, value, tone }: { label: string; value: string; tone?: "good" | "bad" }) {
  return (
    <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
      <p className="text-[11px] uppercase tracking-wide text-[var(--c-text3)]">{label}</p>
      <p className={`mt-1.5 text-xl font-bold tabular-nums ${tone === "good" ? "text-[var(--c-green)]" : tone === "bad" ? "text-[var(--c-red)]" : "text-[var(--c-text)]"}`}>{value}</p>
    </div>
  );
}

export function TaxPanel() {
  const { orders } = useInventory();
  const { expenses, taxSettings, saveTaxSettings, addExpense } = useFinance();

  function recordPayment(category: "tax" | "insurance", amount: number, description: string) {
    addExpense({
      date: new Date().toISOString().slice(0, 10),
      category,
      vendor: category === "tax" ? "ФНС" : "СФР/ФНС",
      description,
      amount: Math.round(amount),
      isPersonalPurchase: false,
      excludeFromTax: category === "tax",
      hasDocument: false,
    });
  }

  const year = new Date().getFullYear();

  const data = useMemo(() => {
    const yearOrders = orders.filter((o) => (o.createdAt ?? "").slice(0, 4) === String(year));
    const revenue = computePnL(yearOrders).revenue;

    const isThisYear = (d: string) => (d ?? "").slice(0, 4) === String(year);
    const yearExpenses = expenses.filter((e) => isThisYear(e.date));
    // Operating expenses exclude insurance/tax payments — those are shown on
    // their own lines, so counting them here too would double-subtract.
    const operatingExpenses = yearExpenses
      .filter((e) => e.category !== "insurance" && e.category !== "tax")
      .reduce((s, e) => s + e.amount, 0);
    const deductibleExpenses = yearExpenses
      .filter((e) => !e.isPersonalPurchase && !e.excludeFromTax && e.category !== "tax")
      .reduce((s, e) => s + e.amount, 0);
    const personalPurchases = yearExpenses.filter((e) => e.isPersonalPurchase).reduce((s, e) => s + e.amount, 0);
    const insurancePaid = yearExpenses.filter((e) => e.category === "insurance").reduce((s, e) => s + e.amount, 0);
    const taxPaid = yearExpenses.filter((e) => e.category === "tax").reduce((s, e) => s + e.amount, 0);

    const insuranceDue = calcInsurance(revenue);
    const tax = computeTax({
      regime: taxSettings.regime,
      revenue,
      deductibleExpenses,
      insurancePaid: insurancePaid || insuranceDue.total,
      hasEmployees: taxSettings.hasEmployees,
    });

    const realNet = revenue - operatingExpenses - insuranceDue.total - tax.taxPayable;
    return { revenue, operatingExpenses, deductibleExpenses, personalPurchases, insuranceDue, insurancePaid, taxPaid, tax, realNet };
  }, [orders, expenses, taxSettings, year]);

  const warnings = thresholdWarnings(taxSettings.regime, data.revenue);
  const schedule = quarterSchedule(year);
  const quarterAmount = data.tax.taxPayable / 4;

  function exportKUDiR() {
    const yr = String(year);
    const income: KudirRow[] = orders
      .filter((o) => (o.createdAt ?? "").slice(0, 4) === yr && (o.status === "delivered" || o.status === "shipped"))
      .map((o, i) => ({ n: i + 1, date: o.createdAt, content: `Реализация — заказ ${o.orderNumber}`, income: o.revenue, expense: "" }));
    const exp: KudirRow[] = expenses
      .filter((e) => (e.date ?? "").slice(0, 4) === yr && !e.isPersonalPurchase && !e.excludeFromTax)
      .map((e, i) => ({ n: income.length + i + 1, date: e.date, content: `${EXPENSE_CATEGORY_LABELS[e.category]}${e.description ? ` — ${e.description}` : e.vendor ? ` — ${e.vendor}` : ""}`, income: "", expense: e.amount }));
    exportData<KudirRow>({
      filename: `КУДиР-${yr}`,
      title: `Книга учёта доходов и расходов — ${yr}`,
      format: "excel",
      columns: [
        { key: "n", label: "№" },
        { key: "date", label: "Дата" },
        { key: "content", label: "Содержание операции" },
        { key: "income", label: "Доходы, ₽", align: "right" },
        { key: "expense", label: "Расходы, ₽", align: "right" },
      ],
      rows: [...income, ...exp],
      meta: [
        { label: "Доходы всего", value: formatRub(data.revenue) },
        { label: "Расходы (вычитаемые)", value: formatRub(data.deductibleExpenses) },
      ],
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <button
          onClick={exportKUDiR}
          className="flex items-center gap-1.5 rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
        >
          <Download size={15} /> Скачать КУДиР
        </button>
      </div>

      {/* Regime selector */}
      <div>
        <p className="mb-2 text-sm font-medium text-[var(--c-text2)]">Налоговый режим</p>
        <div className="flex flex-wrap gap-2">
          {REGIMES.map((r) => (
            <button
              key={r.id}
              onClick={() => saveTaxSettings({ ...taxSettings, regime: r.id })}
              className={`min-w-[150px] flex-1 rounded-xl border p-3 text-left transition ${
                taxSettings.regime === r.id
                  ? "border-[var(--c-green)] bg-[var(--c-green-dim)]"
                  : "border-[var(--c-border)] bg-[var(--c-bg2)] hover:bg-[var(--c-bg3)]"
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-semibold text-[var(--c-text)]">{r.name}</span>
                <span className="text-xs text-[var(--c-text3)]">{r.rate}</span>
              </div>
              <p className="mt-1 text-xs text-[var(--c-text3)]">{r.desc}</p>
            </button>
          ))}
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2">
          <input
            type="checkbox"
            checked={taxSettings.hasEmployees}
            onChange={(e) => saveTaxSettings({ ...taxSettings, hasEmployees: e.target.checked })}
            className="h-4 w-4 rounded accent-[var(--c-green)]"
          />
          <span className="text-sm text-[var(--c-text2)]">Есть сотрудники (взносы уменьшают налог не более чем на 50%)</span>
        </label>
      </div>

      {/* Warnings */}
      {warnings.map((w, i) => (
        <div key={i} className="flex items-start gap-2 rounded-xl border border-[var(--c-amber)] bg-[var(--c-amber-dim)] p-3 text-sm text-[var(--c-text)]">
          <AlertTriangle size={16} className="mt-0.5 shrink-0 text-[var(--c-amber)]" />
          {w.text}
        </div>
      ))}

      {/* KPI strip */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <KPI label={`Доход ${year}`} value={formatRub(data.revenue)} />
        <KPI label="Налог к уплате" value={formatRub(data.tax.taxPayable)} tone="bad" />
        <KPI label="Страховые взносы" value={formatRub(data.insuranceDue.total)} />
        <KPI label="Чистая прибыль" value={formatRub(data.realNet)} tone={data.realNet >= 0 ? "good" : "bad"} />
      </div>

      {/* Dual P&L */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <h3 className="text-sm font-semibold text-[var(--c-text)]">Для налоговой</h3>
          <Row label="Доход" value={formatRub(data.revenue)} />
          {taxSettings.regime === "usn_profit" && <Row label="Вычитаемые расходы" value={`− ${formatRub(data.deductibleExpenses)}`} />}
          <Row label="Страховые взносы" value={`− ${formatRub(data.insuranceDue.total)}`} />
          <Row label="Налог" value={formatRub(data.tax.taxPayable)} bold />
          {data.tax.note && <p className="mt-1 text-xs text-[var(--c-text3)]">{data.tax.note}</p>}
        </div>
        <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
          <h3 className="text-sm font-semibold text-[var(--c-text)]">Реальный учёт</h3>
          <Row label="Доход" value={formatRub(data.revenue)} />
          <Row label="Операционные расходы" value={`− ${formatRub(data.operatingExpenses)}`} />
          <Row label="Взносы + налог" value={`− ${formatRub(data.insuranceDue.total + data.tax.taxPayable)}`} />
          <Row label="Чистая прибыль" value={formatRub(data.realNet)} bold />
          <Row label="Маржа" value={data.revenue > 0 ? pct(data.realNet / data.revenue) : "—"} />
        </div>
      </div>

      {data.personalPurchases > 0 && (
        <p className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg3)] p-3 text-xs text-[var(--c-text2)]">
          Личных покупок: {formatRub(data.personalPurchases)} — не уменьшают налог, но учтены в реальной прибыли.
        </p>
      )}

      {/* Insurance contributions */}
      <div className="rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--c-text)]">Страховые взносы ИП</h3>
            <p className="mt-0.5 text-xs text-[var(--c-text3)]">
              Начислено {formatRub(data.insuranceDue.total)} · оплачено {formatRub(data.insurancePaid)}
            </p>
          </div>
          <button
            onClick={() => recordPayment("insurance", Math.max(data.insuranceDue.total - data.insurancePaid, 0), `Страховые взносы ИП ${year}`)}
            className="shrink-0 rounded-lg border border-[var(--c-border2)] px-3 py-1.5 text-sm font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
          >
            Записать оплату
          </button>
        </div>
      </div>

      {/* Quarterly schedule */}
      <div>
        <p className="mb-2 text-sm font-medium text-[var(--c-text2)]">Авансовые платежи {year}</p>
        <div className="overflow-hidden rounded-xl border border-[var(--c-border)] bg-[var(--c-bg2)]">
          {schedule.map((q, i) => (
            <div key={q.label} className={`flex flex-wrap items-center justify-between gap-2 px-4 py-3 ${i < schedule.length - 1 ? "border-b border-[var(--c-border)]" : ""}`}>
              <div>
                <p className="text-sm font-medium text-[var(--c-text)]">{q.label}</p>
                <p className="text-xs text-[var(--c-text3)]">Срок: {q.deadline}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-semibold tabular-nums text-[var(--c-text)]">≈ {formatRub(quarterAmount)}</span>
                <button
                  onClick={() => recordPayment("tax", quarterAmount, `Авансовый платёж — ${q.label} ${year}`)}
                  className="rounded-lg border border-[var(--c-border2)] px-2.5 py-1 text-xs font-medium text-[var(--c-text2)] transition hover:text-[var(--c-text)]"
                >
                  Записать оплату
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <div className={`mt-2 flex items-center justify-between gap-3 text-sm ${bold ? "border-t border-[var(--c-border)] pt-2 font-semibold text-[var(--c-text)]" : "text-[var(--c-text2)]"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
