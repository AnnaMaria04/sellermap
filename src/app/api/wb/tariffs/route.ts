import { NextResponse } from "next/server";
import {
  getWbAcceptanceCoefficients,
  getWbBoxTariffs,
  getWbCommissionTariffs,
  getWbPalletTariffs,
  getWbReturnTariffs,
} from "@/lib/integrations/wb/tariffs";

export async function GET() {
  const [commission, box, pallet, acceptance, returns] = await Promise.all([
    getWbCommissionTariffs(),
    getWbBoxTariffs(),
    getWbPalletTariffs(),
    getWbAcceptanceCoefficients(),
    getWbReturnTariffs(),
  ]);

  const status =
    [commission, box, pallet, acceptance, returns].some((item) => item.status === "connected")
      ? "connected"
      : commission.status;

  return NextResponse.json({
    ok: status === "connected",
    status,
    fetchedAt: new Date().toISOString(),
    data: { commission, box, pallet, acceptance, returns },
  });
}

