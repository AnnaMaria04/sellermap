// Russian small-business tax engine (2026 values). Pure functions, no I/O.
import type { TaxRegime } from "@/types/finance";

export const TAX_2026 = {
  FIXED_INSURANCE: 57_390,
  ADDITIONAL_RATE: 0.01,
  ADDITIONAL_THRESHOLD: 300_000,
  ADDITIONAL_CAP: 321_818,
  NPD_LIMIT: 2_400_000,
  PATENT_LIMIT: 20_000_000,
  USN_VAT_THRESHOLD: 60_000_000,
  USN_LIMIT: 450_000_000,
} as const;

export function calcInsurance(revenue: number) {
  const fixed = TAX_2026.FIXED_INSURANCE;
  const additional = Math.min(
    Math.max(0, revenue - TAX_2026.ADDITIONAL_THRESHOLD) * TAX_2026.ADDITIONAL_RATE,
    TAX_2026.ADDITIONAL_CAP,
  );
  return { fixed, additional, total: fixed + additional };
}

/** УСН «Доходы» — tax reduced by insurance (fully for ИП w/o employees, ≤50% with). */
export function calcUSNIncome(revenue: number, rate: number, hasEmployees: boolean, insurancePaid: number) {
  const taxGross = revenue * (rate / 100);
  const maxDeduction = hasEmployees ? taxGross * 0.5 : taxGross;
  const deduction = Math.min(insurancePaid, maxDeduction);
  return { taxGross, deduction, taxPayable: Math.max(taxGross - deduction, 0) };
}

/** УСН «Доходы минус расходы» — min tax 1% of revenue applies. */
export function calcUSNProfit(revenue: number, deductibleExpenses: number, insurancePaid: number, rate: number) {
  const base = Math.max(revenue - deductibleExpenses - insurancePaid, 0);
  const minimumTax = revenue * 0.01;
  const calculated = base * (rate / 100);
  return { taxBase: base, taxPayable: Math.max(calculated, minimumTax), minimumTaxApplied: calculated < minimumTax };
}

export function calcPatent(pvgd: number, months: number, hasEmployees: boolean, insurancePaid: number) {
  const taxGross = pvgd * 0.06 * (months / 12);
  const maxDeduction = hasEmployees ? taxGross * 0.5 : taxGross;
  return { taxGross, taxPayable: Math.max(taxGross - Math.min(insurancePaid, maxDeduction), 0) };
}

/** НПД — 4% B2C / 6% B2B; here we approximate with a blended/explicit rate. */
export function calcNPD(revenue: number, b2bShare = 0) {
  const tax = revenue * (0.04 * (1 - b2bShare) + 0.06 * b2bShare);
  return { taxPayable: tax };
}

export interface TaxResult {
  regime: TaxRegime;
  revenue: number;
  insurance: { fixed: number; additional: number; total: number };
  taxPayable: number;
  taxBase?: number;
  note?: string;
}

export function computeTax(params: {
  regime: TaxRegime;
  revenue: number;
  deductibleExpenses: number;
  insurancePaid: number;
  hasEmployees: boolean;
  usnRate?: number;
  patentPvgd?: number;
  patentMonths?: number;
}): TaxResult {
  const { regime, revenue, deductibleExpenses, insurancePaid, hasEmployees } = params;
  const insurance = calcInsurance(revenue);
  switch (regime) {
    case "usn_income": {
      const r = calcUSNIncome(revenue, params.usnRate ?? 6, hasEmployees, insurancePaid);
      return { regime, revenue, insurance, taxPayable: r.taxPayable };
    }
    case "usn_profit": {
      const r = calcUSNProfit(revenue, deductibleExpenses, insurancePaid, params.usnRate ?? 15);
      return { regime, revenue, insurance, taxPayable: r.taxPayable, taxBase: r.taxBase, note: r.minimumTaxApplied ? "Применён минимальный налог 1%" : undefined };
    }
    case "patent": {
      const r = calcPatent(params.patentPvgd ?? 0, params.patentMonths ?? 12, hasEmployees, insurancePaid);
      return { regime, revenue, insurance, taxPayable: r.taxPayable };
    }
    case "npd":
      return { regime, revenue, insurance: { fixed: 0, additional: 0, total: 0 }, taxPayable: calcNPD(revenue).taxPayable, note: "На НПД страховые взносы добровольны" };
    default:
      return { regime, revenue, insurance, taxPayable: 0 };
  }
}

/** Quarterly advance deadlines for УСН (28th of the month after the quarter). */
export function quarterSchedule(year: number) {
  return [
    { label: "I квартал", deadline: `28.04.${year}`, monthsCovered: 3 },
    { label: "Полугодие", deadline: `28.07.${year}`, monthsCovered: 6 },
    { label: "9 месяцев", deadline: `28.10.${year}`, monthsCovered: 9 },
    { label: "Год", deadline: `28.04.${year + 1}`, monthsCovered: 12 },
  ];
}

export interface ThresholdWarning { level: "warn" | "info"; text: string }

export function thresholdWarnings(regime: TaxRegime, revenue: number): ThresholdWarning[] {
  const out: ThresholdWarning[] = [];
  const fmt = (n: number) => n.toLocaleString("ru-RU");
  if ((regime === "usn_income" || regime === "usn_profit") && revenue > 54_000_000) {
    out.push({ level: "warn", text: `До порога НДС (60 млн ₽) осталось ${fmt(TAX_2026.USN_VAT_THRESHOLD - revenue)} ₽. При превышении — НДС 5% или 7%.` });
  }
  if (regime === "patent" && revenue > 18_000_000) {
    out.push({ level: "warn", text: `До лимита патента (20 млн ₽) осталось ${fmt(TAX_2026.PATENT_LIMIT - revenue)} ₽. Превышение аннулирует патент.` });
  }
  if (regime === "npd" && revenue > 2_200_000) {
    out.push({ level: "warn", text: `До лимита НПД (2,4 млн ₽) осталось ${fmt(TAX_2026.NPD_LIMIT - revenue)} ₽. При превышении статус утрачивается.` });
  }
  return out;
}
