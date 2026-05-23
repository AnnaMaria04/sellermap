import { NextResponse } from "next/server";

export async function POST() {
  return NextResponse.json({
    status: "manual_review_required",
    message: "Screenshot extraction is prepared but OCR/AI extraction is not implemented yet.",
  });
}
