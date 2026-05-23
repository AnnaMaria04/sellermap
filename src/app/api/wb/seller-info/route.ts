import { NextResponse } from "next/server";
import { wbClient } from "@/services/wbClient";

export async function GET() {
  const result = await wbClient("content", "/content/v2/cards/error/list", {
    method: "GET",
  });

  if (!result.ok) {
    return NextResponse.json(
      { error: result.error, note: "WB не предоставляет универсальный публичный seller-info endpoint для всех токенов." },
      { status: result.statusCode },
    );
  }

  return NextResponse.json({
    connected: true,
    note: "Token принят Content API. Seller account profile endpoint будет уточнен по доступам конкретного кабинета.",
  });
}
