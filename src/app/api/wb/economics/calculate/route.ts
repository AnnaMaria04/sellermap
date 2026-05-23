import { NextRequest, NextResponse } from "next/server";
import { calculateEconomics, type EconomicsInput } from "@/lib/economics/calculateEconomics";

const REQUIRED: Array<keyof EconomicsInput> = [
  "sellingPrice",
  "productCost",
  "packagingCost",
  "supplierDeliveryCost",
  "commissionPercent",
  "logisticsCost",
  "storageCost",
  "returnReservePercent",
  "taxPercent",
  "adBudgetPercent",
];

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as Partial<EconomicsInput>;
    const missing = REQUIRED.filter((key) => typeof body[key] !== "number" || Number.isNaN(body[key]));
    if (missing.length > 0 || !body.currency) {
      return NextResponse.json(
        { error: "Недостаточно данных для расчёта экономики.", missingFields: missing },
        { status: 400 },
      );
    }

    return NextResponse.json(calculateEconomics(body as EconomicsInput));
  } catch {
    return NextResponse.json({ error: "Не удалось рассчитать экономику." }, { status: 500 });
  }
}
