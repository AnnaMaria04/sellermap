import { NextRequest, NextResponse } from "next/server";
import { searchSimilarProducts } from "@/services/marketDataProvider";

function median(values: number[]) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ error: "q обязателен" }, { status: 400 });

  try {
    const result = await searchSimilarProducts(query, { limit: 100 });
    const products = result.competitors;
    const prices = products
      .map((product) => product.price)
      .filter((price): price is number => typeof price === "number" && price > 0);
    const reviews = products.map((product) => product.reviewCount ?? 0);
    const entrySlice = reviews.slice(15, 30);
    const entryBarrier = entrySlice.length
      ? Math.round(entrySlice.reduce((sum, count) => sum + count, 0) / entrySlice.length)
      : 0;
    const demandLevel: "высокий" | "средний" | "низкий" =
      products.length > 50 ? "высокий" : products.length > 15 ? "средний" : "низкий";

    return NextResponse.json({
      query,
      total: products.length,
      medianPrice: result.marketStats?.medianPrice ?? median(prices),
      entryBarrier,
      demandLevel,
      competitors: products.slice(0, 5).map((product, index) => ({
        nmId: String(product.nmId ?? ""),
        name: product.title,
        brand: product.brand ?? "",
        price: product.price ?? 0,
        rating: product.rating ?? 0,
        reviews: product.reviewCount ?? 0,
        position: product.searchPosition ?? index + 1,
        imageUrl: product.image ?? "",
        category: product.searchKeyword ?? "",
      })),
      source: result.provider,
      status: result.status,
      warnings: result.warnings,
      warning: result.warnings.join(" ") || "Продажи и выручка показываются только если их возвращает подключённый провайдер.",
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Market provider недоступен.";
    return NextResponse.json(
      {
        error: "Поиск похожих товаров недоступен",
        detail,
        recommendation:
          "Подключите Apify WB provider, MPStats, кэш снимков или введите конкурентов вручную.",
      },
      { status: 502 },
    );
  }
}
