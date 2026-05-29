import { NextResponse } from "next/server";

/**
 * Address suggestions for the shipping calculator.
 *
 * Integration seam: to use real Russian address autocomplete, proxy DaData here
 * (POST https://suggestions.dadata.ru/.../suggest/address with DADATA_API_KEY)
 * and map `suggestions[].value`. Until a key is configured we filter a local
 * dataset so the UX is fully functional offline.
 */
const ADDRESSES = [
  "г. Москва, ул. Тверская, 1",
  "г. Москва, Ленинградский пр-т, 37",
  "г. Москва, ул. Арбат, 12",
  "г. Санкт-Петербург, Невский пр-т, 28",
  "г. Санкт-Петербург, ул. Рубинштейна, 5",
  "г. Новосибирск, Красный пр-т, 25",
  "г. Екатеринбург, ул. Ленина, 50",
  "г. Казань, ул. Баумана, 38",
  "г. Нижний Новгород, ул. Большая Покровская, 10",
  "г. Краснодар, ул. Красная, 32",
  "г. Сочи, ул. Навагинская, 7",
  "г. Ростов-на-Дону, ул. Большая Садовая, 46",
  "г. Самара, ул. Куйбышева, 95",
  "г. Уфа, ул. Ленина, 20",
  "г. Владивосток, ул. Светланская, 29",
];

async function dadata(query: string): Promise<string[] | null> {
  const key = process.env.DADATA_API_KEY;
  if (!key) return null;
  try {
    const res = await fetch("https://suggestions.dadata.ru/suggestions/api/4_1/rs/suggest/address", {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json", Authorization: `Token ${key}` },
      body: JSON.stringify({ query, count: 6 }),
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { suggestions?: { value: string }[] };
    return (json.suggestions ?? []).map((s) => s.value);
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
  if (q.length < 2) return NextResponse.json({ suggestions: [] });

  const live = await dadata(q);
  if (live) return NextResponse.json({ suggestions: live, source: "dadata" });

  const ql = q.toLowerCase();
  const suggestions = ADDRESSES.filter((a) => a.toLowerCase().includes(ql)).slice(0, 6);
  return NextResponse.json({ suggestions, source: "local" });
}
