import { NextRequest, NextResponse } from "next/server";
import { supabaseRest } from "@/services/supabaseRest";

export async function GET(req: NextRequest) {
  const userId = req.nextUrl.searchParams.get("userId");
  const query: Record<string, string> = {
    select: "*",
    order: "created_at.desc",
    limit: req.nextUrl.searchParams.get("limit") ?? "20",
  };
  if (userId) query.user_id = `eq.${userId}`;

  const result = await supabaseRest<unknown[]>("lookups", { query });
  if (!result.ok) {
    return NextResponse.json(
      {
        status: result.status,
        history: [],
        error: result.error,
      },
      { status: result.status === "not_configured" ? 200 : 502 },
    );
  }

  return NextResponse.json({ status: "success", history: result.data });
}
