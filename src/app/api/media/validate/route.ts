import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as {
      url?: string;
      format?: string;
      sizeBytes?: number;
      width?: number;
      height?: number;
    };
    const issues: string[] = [];

    if (body.format && !["jpg", "jpeg", "png", "webp"].includes(body.format.toLowerCase())) {
      issues.push("Неподдерживаемый формат изображения.");
    }
    if (body.sizeBytes && body.sizeBytes > 10 * 1024 * 1024) {
      issues.push("Файл больше 10 МБ.");
    }
    if (body.width && body.width < 700) issues.push("Ширина меньше 700 px.");
    if (body.height && body.height < 700) issues.push("Высота меньше 700 px.");
    if (body.url && !/^https?:\/\//i.test(body.url)) {
      issues.push("Публичная ссылка на изображение недоступна.");
    }

    return NextResponse.json({
      valid: issues.length === 0,
      issues,
      wbReady: false,
      message: "Imported supplier image must be validated before WB upload.",
    });
  } catch {
    return NextResponse.json({ valid: false, issues: ["Ошибка проверки изображения."], wbReady: false }, { status: 400 });
  }
}
