const NOISE = [
  "high",
  "quality",
  "custom",
  "factory",
  "wholesale",
  "new",
  "hot",
  "sale",
  "product",
  "original",
];

export function removeSupplierNoiseWords(title: string) {
  return title
    .split(/\s+/)
    .filter((word) => !NOISE.includes(word.toLowerCase()))
    .join(" ")
    .trim();
}

export function cleanSupplierTitle(title: string) {
  return removeSupplierNoiseWords(title.replace(/[_-]+/g, " ").replace(/\s+/g, " "));
}

export function suggestRussianKeywords(title: string): string[] {
  const lower = title.toLowerCase();
  const suggestions: string[] = [];
  if (lower.includes("posca")) suggestions.push("маркер POSCA");
  if (lower.includes("marker")) suggestions.push("акриловый маркер", "маркер для рисования", "перманентный маркер");
  if (lower.includes("paint")) suggestions.push("paint marker");
  if (lower.includes("bag")) suggestions.push("органайзер", "косметичка", "сумка органайзер");
  return suggestions;
}

export function generateKeywordCandidates(productTitle: string, specifications: Record<string, unknown> = {}) {
  const cleaned = cleanSupplierTitle(productTitle);
  const brandTokens = cleaned.match(/\b[A-Z0-9]{2,}\b/g) ?? [];
  const specWords = Object.values(specifications)
    .filter((value): value is string => typeof value === "string")
    .slice(0, 3);
  return [...new Set([...suggestRussianKeywords(cleaned), ...brandTokens, cleaned, ...specWords].filter(Boolean))].slice(0, 8);
}
