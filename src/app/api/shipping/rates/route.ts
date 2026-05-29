import { NextResponse } from "next/server";

/**
 * Shipping rate quotes for the calculator.
 *
 * Integration seam: this is where a real Russian carrier API is called
 * (СДЭК `calculator/tarifflist`, Почта России tariff API, Boxberry
 * `DeliveryCalculation`) using server-held credentials. Until those are
 * configured we return a realistic estimate based on *chargeable weight*
 * (the greater of actual and volumetric weight) so the flow is end-to-end.
 */

export interface RateRequest {
  toAddress: string;
  weightKg: number;
  dimsCm: { l: number; w: number; h: number };
}

export interface Rate {
  carrier: string;
  service: string;
  days: string;
  price: number;
  currency: "RUB";
}

const VOLUMETRIC_DIVISOR = 5000; // cm³ per kg, industry standard

function quote(weightKg: number, dims: { l: number; w: number; h: number }): Rate[] {
  const volumetric = (dims.l * dims.w * dims.h) / VOLUMETRIC_DIVISOR;
  const chargeable = Math.max(weightKg, volumetric);
  const carriers: Omit<Rate, "price" | "currency">[] = [
    { carrier: "Почта России", service: "Посылка", days: "4–7 дней" },
    { carrier: "СДЭК", service: "Посылка склад-склад", days: "1–3 дня" },
    { carrier: "Boxberry", service: "Доставка до ПВЗ", days: "2–4 дня" },
  ];
  const base: Record<string, [number, number]> = {
    "Почта России": [200, 90],
    "СДЭК": [280, 75],
    "Boxberry": [240, 70],
  };
  return carriers
    .map((c) => {
      const [b, perKg] = base[c.carrier];
      return { ...c, price: Math.round(b + perKg * chargeable), currency: "RUB" as const };
    })
    .sort((a, b) => a.price - b.price);
}

export async function POST(request: Request) {
  let body: Partial<RateRequest>;
  try {
    body = (await request.json()) as Partial<RateRequest>;
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }

  const weightKg = Number(body.weightKg) || 0;
  const dims = body.dimsCm ?? { l: 0, w: 0, h: 0 };

  if (weightKg <= 0) return NextResponse.json({ error: "weight_required" }, { status: 422 });
  if (dims.l < 1 || dims.w < 1 || dims.h < 1) {
    return NextResponse.json({ error: "min_dimensions", minCm: 1 }, { status: 422 });
  }

  return NextResponse.json({ rates: quote(weightKg, dims), source: "estimate" });
}
