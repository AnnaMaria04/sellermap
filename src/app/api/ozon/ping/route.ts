import { NextResponse } from "next/server";
import { pingOzon } from "@/services/ozonClient";

export async function GET() {
  return NextResponse.json(await pingOzon());
}
