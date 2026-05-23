import { NextResponse } from "next/server";
import { pingWbCategories } from "@/services/wbClient";

export async function GET() {
  return NextResponse.json(await pingWbCategories());
}
