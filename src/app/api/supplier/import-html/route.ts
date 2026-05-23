import { NextRequest, NextResponse } from "next/server";
import { importSupplierFromHtml } from "@/services/supplierImportService";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { originalUrl?: string; html?: string };
    if (!body.originalUrl || !body.html) {
      return NextResponse.json({ error: "originalUrl and html required" }, { status: 400 });
    }
    const result = await importSupplierFromHtml(body.originalUrl, body.html);
    return NextResponse.json(result, {
      status: ["failed", "blocked", "identity_mismatch"].includes(result.status) ? 422 : 200,
    });
  } catch {
    return NextResponse.json({ error: "Не удалось разобрать HTML поставщика." }, { status: 500 });
  }
}
