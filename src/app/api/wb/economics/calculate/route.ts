import { NextRequest, NextResponse } from "next/server";
import { calculateUnitEconomics, validateEconomicsInput } from "@/services/economicsCalculator";
import type { EconomicsInput } from "@/types/sellermap";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<EconomicsInput>;
    const validation = validateEconomicsInput(body);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: "Недостаточно данных для расчёта экономики.",
          missingFields: validation.missing,
          negativeFields: validation.negative,
        },
        { status: 400 },
      );
    }

    return NextResponse.json(calculateUnitEconomics(body as EconomicsInput));
  } catch {
    return NextResponse.json({ error: "Не удалось рассчитать экономику." }, { status: 500 });
  }
}
