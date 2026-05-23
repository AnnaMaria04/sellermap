import { NextResponse } from "next/server";
import { wbClient } from "@/services/wbClient";

export async function GET() {
  const [content, analytics, prices, common] = await Promise.all([
    wbClient("content", "/ping"),
    wbClient("analytics", "/ping"),
    wbClient("prices", "/ping"),
    wbClient("common", "/ping"),
  ]);

  return NextResponse.json({
    content: content.ok,
    analytics: analytics.ok,
    prices: prices.ok,
    common: common.ok,
    errors: {
      ...(content.ok ? {} : { content: content.error }),
      ...(analytics.ok ? {} : { analytics: analytics.error }),
      ...(prices.ok ? {} : { prices: prices.error }),
      ...(common.ok ? {} : { common: common.error }),
    },
  });
}
