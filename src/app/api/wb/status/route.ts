import { NextResponse } from "next/server";
import { hasWbToken } from "@/lib/integrations/wb/client";

export async function GET() {
  return NextResponse.json({
    ok: hasWbToken(),
    status: hasWbToken() ? "connected" : "missing_token",
    label: hasWbToken() ? "подключено" : "ожидает API ключ",
    fetchedAt: new Date().toISOString(),
  });
}

