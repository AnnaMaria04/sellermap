function mpstatsToken() {
  return process.env.MPSTATS_API_TOKEN;
}

async function mpstatsPlaceholder(feature: string) {
  if (!mpstatsToken()) return { status: "missing-token" as const, feature };
  // TODO: Уточнить доступные endpoints MPStats и схему тарифного доступа.
  return { status: "not-implemented" as const, feature };
}

export async function getMpstatsProduct(nmId: string) {
  return mpstatsPlaceholder(`product:${nmId}`);
}

export async function getMpstatsCompetitors(query: { nmId?: string; keyword?: string; category?: string }) {
  return mpstatsPlaceholder(`competitors:${query.nmId ?? query.keyword ?? query.category ?? "unknown"}`);
}

export async function getMpstatsCategoryAnalytics(category: string) {
  return mpstatsPlaceholder(`category:${category}`);
}

export async function getMpstatsKeywordAnalytics(keyword: string) {
  return mpstatsPlaceholder(`keyword:${keyword}`);
}

export async function getMpstatsPriceHistory(nmId: string) {
  return mpstatsPlaceholder(`price-history:${nmId}`);
}

export async function getMpstatsSalesEstimate(nmId: string) {
  return mpstatsPlaceholder(`sales-estimate:${nmId}`);
}

export async function getMpstatsSeoData(nmId: string) {
  return mpstatsPlaceholder(`seo:${nmId}`);
}
