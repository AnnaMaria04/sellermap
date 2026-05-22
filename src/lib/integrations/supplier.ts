import type { SupplierInput } from "@/lib/analysis/types";

export function parseSupplierDomain(supplierUrl: string) {
  try {
    return new URL(supplierUrl).hostname.replace("www.", "");
  } catch {
    return "не определен";
  }
}

export function normalizeSupplierInput(input: SupplierInput) {
  const domain = parseSupplierDomain(input.supplierUrl);
  const supported =
    domain.includes("alibaba") ||
    domain.includes("1688") ||
    domain.includes("aliexpress");

  return {
    ...input,
    domain,
    supported,
    requiresManualConfirmation: true,
    note: supported
      ? "Требуется ручное подтверждение данных поставщика."
      : "Автоматическое извлечение недоступно, используйте ручной ввод.",
  };
}
