export type ExpenseCategory =
  | "marketing"
  | "logistics"
  | "packaging"
  | "salary"
  | "rent"
  | "equipment"
  | "software"
  | "legal"
  | "bank"
  | "tax"
  | "insurance"
  | "utilities"
  | "other";

export const EXPENSE_CATEGORY_LABELS: Record<ExpenseCategory, string> = {
  marketing: "Маркетинг",
  logistics: "Логистика",
  packaging: "Упаковка",
  salary: "Зарплата / услуги",
  rent: "Аренда",
  equipment: "Оборудование",
  software: "ПО и подписки",
  legal: "Юридические",
  bank: "Банк и эквайринг",
  tax: "Налоги и взносы",
  insurance: "Страхование",
  utilities: "Коммуналка",
  other: "Прочее",
};

export interface Expense {
  id: string;
  date: string;
  category: ExpenseCategory;
  vendor: string;
  description: string;
  amount: number;
  isPersonalPurchase: boolean;
  excludeFromTax: boolean;
  hasDocument: boolean;
  createdAt: string;
}

export type TaxRegime =
  | "usn_income"        // УСН Доходы 6%
  | "usn_profit"        // УСН Доходы минус расходы 15%
  | "patent"            // ПСН
  | "npd"               // НПД (самозанятый)
  | "osno"              // ОСНО
  | "ausn";             // АУСН (8% или 20%)

export const TAX_REGIME_LABELS: Record<TaxRegime, string> = {
  usn_income: "УСН «Доходы» (6%)",
  usn_profit: "УСН «Доходы − Расходы» (15%)",
  patent: "Патент (ПСН)",
  npd: "НПД / Самозанятый",
  osno: "ОСНО",
  ausn: "АУСН (автоматизированная УСН)",
};

export interface TaxSettings {
  regime: TaxRegime;
  hasEmployees: boolean;
  regionalRate?: number;
  patentAnnualIncome?: number;
  ausnType?: "income" | "profit";
}

export interface FinanceState {
  expenses: Expense[];
  taxSettings: TaxSettings;
}
