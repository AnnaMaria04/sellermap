import { NextRequest, NextResponse } from "next/server";
import { supabaseRest } from "@/services/supabaseRest";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const result = await supabaseRest<unknown[]>("lookups", {
    method: "POST",
    body: JSON.stringify(body),
  });

  if (!result.ok) {
    return NextResponse.json(
      {
        status: result.status,
        error: result.error,
      },
      { status: result.status === "not_configured" ? 200 : 502 },
    );
  }

  return NextResponse.json({ status: "success", lookup: result.data[0] ?? null });
}
