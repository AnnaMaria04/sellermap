import { NextRequest, NextResponse } from "next/server";
import { validateImages } from "@/services/mediaValidationService";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { images?: Array<{ url: string; source: "supplier_import" | "manual" | "wb_api" }> };
    if (!body.images?.length) {
      return NextResponse.json({ images: [] });
    }
    return NextResponse.json(await validateImages({ images: body.images }));
  } catch {
    return NextResponse.json({ images: [], error: "Ошибка проверки изображений." }, { status: 400 });
  }
}
