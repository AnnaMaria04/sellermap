export type ProductHistorySnapshot = {
  nm_id: string;
  query: string | null;
  price_rub: number | null;
  review_count: number | null;
  search_position: number | null;
  stock_signal: number | null;
  created_at: string;
};

function delta(values: Array<number | null>) {
  const clean = values.filter((value): value is number => typeof value === "number" && Number.isFinite(value));
  if (clean.length < 2) return null;
  return clean[clean.length - 1] - clean[0];
}

export function calculateReviewGrowthFromHistory(history: ProductHistorySnapshot[]) {
  return delta(history.map((snapshot) => snapshot.review_count));
}

export function calculatePriceChangeFromHistory(history: ProductHistorySnapshot[]) {
  return delta(history.map((snapshot) => snapshot.price_rub));
}

export function calculateRankChangeFromHistory(history: ProductHistorySnapshot[], keyword?: string) {
  const scoped = keyword ? history.filter((snapshot) => snapshot.query === keyword) : history;
  return delta(scoped.map((snapshot) => snapshot.search_position));
}
