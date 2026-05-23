import { NextRequest, NextResponse } from "next/server";
import { importSupplierProduct } from "@/services/supplierImportService";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { url?: string; preferredProvider?: "auto" | "apify" | "html_meta" };
    if (!body.url) return NextResponse.json({ error: "URL required" }, { status: 400 });

    const result = await importSupplierProduct({
      url: body.url,
      preferredProvider: body.preferredProvider ?? "auto",
    });

    return NextResponse.json(result, {
      status: ["failed", "blocked", "identity_mismatch"].includes(result.status) ? 422 : 200,
    });
  } catch {
    return NextResponse.json({ error: "Supplier import failed" }, { status: 500 });
  }
}
