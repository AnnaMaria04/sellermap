import { NextRequest, NextResponse } from "next/server";
import { importSupplierProduct } from "@/lib/integrations/suppliers/service";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string };
    if (!body.url) {
      return NextResponse.json({ error: "url required" }, { status: 400 });
    }

    const result = await importSupplierProduct(body.url);
    return NextResponse.json(result, { status: result.status === "failed" ? 422 : 200 });
  } catch {
    return NextResponse.json({ error: "Не удалось импортировать поставщика." }, { status: 500 });
  }
}
