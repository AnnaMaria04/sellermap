import type { CommissionMatch } from "@/types/sellermap";

export function normalizeCategoryName(name: string) {
  return name.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9]+/gi, " ").trim();
}

export function suggestWbCategoriesFromTitle(title: string): string[] {
  const normalized = normalizeCategoryName(title);
  if (normalized.includes("marker") || normalized.includes("маркер") || normalized.includes("posca")) {
    return ["Канцелярия", "Маркеры", "Товары для творчества"];
  }
  if (normalized.includes("bag") || normalized.includes("органайзер") || normalized.includes("косметич")) {
    return ["Аксессуары для путешествий", "Косметички", "Сумки"];
  }
  return ["Категория WB не определена"];
}

export function matchCategoryToCommission(category: string, commissionTariffs: unknown[]): CommissionMatch | null {
  const target = normalizeCategoryName(category);
  for (const row of commissionTariffs) {
    if (!row || typeof row !== "object") continue;
    const item = row as Record<string, unknown>;
    const name = String(item.subjectName ?? item.subject ?? item.category ?? item.name ?? "");
    const commission = Number(item.commission ?? item.commissionPercent ?? item.kgvpMarketplace ?? item.kgvpSupplier);
    if (name && normalizeCategoryName(name).includes(target) && Number.isFinite(commission)) {
      return {
        categoryName: name,
        subjectName: typeof item.subjectName === "string" ? item.subjectName : undefined,
        commissionPercent: commission,
        source: "wb_api",
        confidence: 0.82,
      };
    }
  }
  return null;
}
