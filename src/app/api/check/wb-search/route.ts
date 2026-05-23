import { NextRequest, NextResponse } from "next/server";
import { getWbImageUrl, searchWbPublicProducts } from "@/services/wbPublicClient";

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
    const products = await searchWbPublicProducts(query, 100);
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
      medianPrice: median(prices),
      entryBarrier,
      demandLevel,
      competitors: products.slice(0, 5).map((product, index) => ({
        nmId: String(product.nmId ?? ""),
        name: product.title,
        brand: product.brand ?? "",
        price: product.price ?? 0,
        rating: product.rating ?? 0,
        reviews: product.reviewCount ?? 0,
        position: index + 1,
        imageUrl: product.image ?? (product.nmId ? getWbImageUrl(product.nmId) : ""),
        category: "",
      })),
      source: "wb_public",
      warning:
        "Источник: публичный каталог WB. Продажи и выручка требуют MPStats или другого аналитического провайдера.",
    });
  } catch (error) {
    const detail = error instanceof Error ? error.message : "Публичный поиск WB недоступен.";
    return NextResponse.json(
      {
        error: "WB поиск недоступен",
        detail,
        recommendation:
          "Публичный WB часто ограничивает серверные IP Vercel. Для стабильной аналитики подключите MPStats или введите конкурентов вручную.",
      },
      { status: 502 },
    );
  }
}
