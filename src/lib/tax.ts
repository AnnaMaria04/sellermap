import type { TaxSettings } from "@/types/finance";

// 2026 fixed insurance contribution (no employees)
const FIXED_INSURANCE_2026 = 57_390;
const INSURANCE_1PCT_CAP = 321_818;
const INSURANCE_BASE_THRESHOLD = 300_000;

export interface TaxCalcResult {
  regime: TaxSettings["regime"];
  revenue: number;
  deductibleExpenses: number;
  taxBase: number;
  taxRate: number;
  taxBeforeDeductions: number;
  insuranceContributions: number;
  taxAfterInsurance: number;
  totalTax: number;
  netProfit: number;
  realNetProfit: number;
  vatWarning: boolean;
  npd_limitWarning: boolean;
}

export function computeTax(
  revenue: number,
  deductibleExpenses: number,
  allExpenses: number,
  settings: TaxSettings,
): TaxCalcResult {
  const insurance =
    FIXED_INSURANCE_2026 +
    Math.min(
      Math.max(0, revenue - INSURANCE_BASE_THRESHOLD) * 0.01,
      INSURANCE_1PCT_CAP - FIXED_INSURANCE_2026,
    );

  let taxBase = 0;
  let taxRate = 0;
  let taxBeforeDeductions = 0;
  let taxAfterInsurance = 0;

  switch (settings.regime) {
    case "usn_income": {
      const rate = settings.regionalRate ?? 6;
      taxBase = revenue;
      taxRate = rate;
      taxBeforeDeductions = (revenue * rate) / 100;
      const maxInsuranceDeduction = settings.hasEmployees
        ? taxBeforeDeductions * 0.5
        : taxBeforeDeductions;
      taxAfterInsurance = Math.max(0, taxBeforeDeductions - Math.min(insurance, maxInsuranceDeduction));
      break;
    }
    case "usn_profit": {
      const rate = settings.regionalRate ?? 15;
      taxBase = Math.max(0, revenue - deductibleExpenses - insurance);
      taxRate = rate;
      const computed = (taxBase * rate) / 100;
      const minimum = revenue * 0.01;
      taxBeforeDeductions = Math.max(computed, minimum);
      taxAfterInsurance = taxBeforeDeductions;
      break;
    }
    case "npd": {
      taxRate = 6; // business income; 4% for individuals
      taxBase = revenue;
      taxBeforeDeductions = (revenue * taxRate) / 100;
      taxAfterInsurance = taxBeforeDeductions;
      break;
    }
    case "patent": {
      const annualIncome = settings.patentAnnualIncome ?? 500_000;
      taxBeforeDeductions = (annualIncome * 6) / 100;
      taxBase = annualIncome;
      taxRate = 6;
      const maxInsuranceDeduction = settings.hasEmployees
        ? taxBeforeDeductions * 0.5
        : taxBeforeDeductions;
      taxAfterInsurance = Math.max(0, taxBeforeDeductions - Math.min(insurance, maxInsuranceDeduction));
      break;
    }
    case "ausn": {
      if (settings.ausnType === "profit") {
        taxBase = Math.max(0, revenue - deductibleExpenses);
        taxRate = 20;
      } else {
        taxBase = revenue;
        taxRate = 8;
      }
      taxBeforeDeductions = (taxBase * taxRate) / 100;
      taxAfterInsurance = taxBeforeDeductions;
      break;
    }
    case "osno": {
      taxBase = Math.max(0, revenue - deductibleExpenses);
      taxRate = 20;
      taxBeforeDeductions = (taxBase * taxRate) / 100;
      taxAfterInsurance = taxBeforeDeductions;
      break;
    }
  }

  const totalTax = taxAfterInsurance + (settings.regime !== "usn_income" ? insurance : 0);
  const netProfit = revenue - deductibleExpenses - totalTax;
  const realNetProfit = revenue - allExpenses - totalTax;

  return {
    regime: settings.regime,
    revenue,
    deductibleExpenses,
    taxBase,
    taxRate,
    taxBeforeDeductions,
    insuranceContributions: insurance,
    taxAfterInsurance,
    totalTax,
    netProfit,
    realNetProfit,
    vatWarning: revenue >= 60_000_000,
    npd_limitWarning: settings.regime === "npd" && revenue >= 2_400_000,
  };
}

export function formatRubShort(n: number): string {
  if (Math.abs(n) >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}М ₽`;
  if (Math.abs(n) >= 1_000) return `${(n / 1_000).toFixed(0)}К ₽`;
  return `${Math.round(n).toLocaleString("ru-RU")} ₽`;
}
