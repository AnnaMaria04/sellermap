import { NextRequest, NextResponse } from "next/server";

function getBasketNum(nmId: number): string {
  const vol = Math.floor(nmId / 100000);
  if (vol <= 143) return "01";
  if (vol <= 287) return "02";
  if (vol <= 431) return "03";
  if (vol <= 719) return "04";
  if (vol <= 1007) return "05";
  if (vol <= 1061) return "06";
  if (vol <= 1115) return "07";
  if (vol <= 1169) return "08";
  if (vol <= 1313) return "09";
  if (vol <= 1601) return "10";
  if (vol <= 1655) return "11";
  if (vol <= 1919) return "12";
  if (vol <= 2045) return "13";
  if (vol <= 2189) return "14";
  if (vol <= 2405) return "15";
  return "16";
}

export function wbImageUrl(nmId: string | number): string {
  const id = Number(nmId);
  const vol = Math.floor(id / 100000);
  const part = Math.floor(id / 1000);
  const basket = getBasketNum(id);
  return `https://basket-${basket}.wbbasket.ru/vol${vol}/part${part}/${id}/images/c246x328/1.jpg`;
}

export async function GET(req: NextRequest) {
  const query = req.nextUrl.searchParams.get("q");
  if (!query) return NextResponse.json({ error: "q обязателен" }, { status: 400 });

  try {
    const res = await fetch(
      `https://search.wb.ru/exactmatch/ru/common/v5/search?ab_testing=false&appType=1&curr=rub&dest=-1257786&query=${encodeURIComponent(query)}&resultset=catalog&sort=popular&spp=30&suppressSpellcheck=false`,
      { next: { revalidate: 300 } },
    );

    if (!res.ok) return NextResponse.json({ error: "WB поиск недоступен" }, { status: 502 });

    const data = await res.json();
    const products: Array<{
      id: number;
      name: string;
      brand: string;
      salePriceU: number;
      priceU: number;
      reviewRating: number;
      feedbacks: number;
      subjectName?: string;
    }> = data?.data?.products ?? [];
    const total: number = data?.data?.total ?? 0;

    const prices = products
      .slice(0, 30)
      .map((p) => p.salePriceU / 100)
      .filter((p) => p > 0)
      .sort((a, b) => a - b);
    const medianPrice = prices.length > 0 ? Math.round(prices[Math.floor(prices.length / 2)]) : 0;

    // Entry barrier: median reviews at position 20-30
    const midProducts = products.slice(15, 30);
    const entryBarrier =
      midProducts.length > 0
        ? Math.round(midProducts.reduce((s, p) => s + p.feedbacks, 0) / midProducts.length)
        : 0;

    const demandLevel: "высокий" | "средний" | "низкий" =
      total > 500 ? "высокий" : total > 80 ? "средний" : "низкий";

    const competitors = products.slice(0, 5).map((p, i) => ({
      nmId: String(p.id),
      name: p.name,
      brand: p.brand,
      price: p.salePriceU / 100,
      rating: p.reviewRating,
      reviews: p.feedbacks,
      position: i + 1,
      imageUrl: wbImageUrl(p.id),
      category: p.subjectName ?? "",
    }));

    return NextResponse.json({
      query,
      total,
      medianPrice,
      entryBarrier,
      demandLevel,
      competitors,
    });
  } catch {
    return NextResponse.json({ error: "Ошибка поиска WB" }, { status: 502 });
  }
}
