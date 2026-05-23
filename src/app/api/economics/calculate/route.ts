import { NextRequest, NextResponse } from "next/server";
import { calculateUnitEconomics, validateEconomicsInput } from "@/services/economicsCalculator";
import type { EconomicsInput } from "@/types/sellermap";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<EconomicsInput>;
    const input = {
      ...body,
      productCostRub: body.productCostRub ?? body.productCost,
      wbLogisticsCost: body.wbLogisticsCost ?? body.logisticsCost,
    } as Partial<EconomicsInput>;
    const validation = validateEconomicsInput(input);
    if (!validation.ok) {
      return NextResponse.json(
        {
          error: "Недостаточно данных для расчёта экономики.",
          missingFields: validation.missing,
          negativeFields: validation.negative,
          invalidPercentFields: validation.invalidPercent,
        },
        { status: 400 },
      );
    }
    return NextResponse.json(calculateUnitEconomics(input as EconomicsInput));
  } catch {
    return NextResponse.json({ error: "Не удалось рассчитать экономику." }, { status: 500 });
  }
}
