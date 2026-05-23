import { NextRequest, NextResponse } from "next/server";
import { wbClient } from "@/services/wbClient";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { nmId?: number; vendorCode?: string };
    if (!body.nmId && !body.vendorCode) {
      return NextResponse.json({ error: "nmId or vendorCode required" }, { status: 400 });
    }

    const result = await wbClient("content", "/content/v2/get/cards/list", {
      method: "POST",
      body: JSON.stringify({
        settings: {
          cursor: { limit: 10 },
          filter: {
            ...(body.nmId ? { nmID: body.nmId } : {}),
            ...(body.vendorCode ? { vendorCode: body.vendorCode } : {}),
            withPhoto: -1,
          },
        },
      }),
    });

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.statusCode });
    }

    return NextResponse.json(result.data);
  } catch {
    return NextResponse.json({ error: "Не удалось получить карточку WB." }, { status: 500 });
  }
}
