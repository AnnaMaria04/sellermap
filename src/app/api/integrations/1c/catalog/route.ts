import { NextResponse } from "next/server";
import { parseCommerceMLProducts } from "@/lib/integrations/onec/commerceml";

/**
 * 1C ⇄ SellerMap catalog exchange (CommerceML "обмен с сайтом").
 *
 * - GET implements the 1C handshake protocol (plain-text responses):
 *     ?type=catalog&mode=checkauth → "success\n<cookie>\n<value>"
 *     ?type=catalog&mode=init      → "zip=no\nfile_limit=10485760"
 * - POST receives the catalog XML (either from 1C `mode=file/import`, or from
 *   the erp1c page's file upload) and returns the parsed products as JSON so the
 *   client can review and import them through the normal product store.
 *
 * Auth: an exchange token (Authorization: Bearer / ?token=) held in the
 * integration credentials. Stubbed-permissive when unset for local testing.
 */
const EXCHANGE_TOKEN = process.env.ONEC_EXCHANGE_TOKEN;

function authorized(request: Request): boolean {
  if (!EXCHANGE_TOKEN) return true; // not configured → allow (dev / no live 1C yet)
  const url = new URL(request.url);
  const bearer = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  return (bearer ?? url.searchParams.get("token")) === EXCHANGE_TOKEN;
}

export async function GET(request: Request) {
  if (!authorized(request)) return new NextResponse("failure\nunauthorized", { status: 401 });
  const mode = new URL(request.url).searchParams.get("mode");
  if (mode === "checkauth") {
    return new NextResponse("success\nsellermap_1c\nok", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  if (mode === "init") {
    return new NextResponse("zip=no\nfile_limit=10485760", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
  }
  return new NextResponse("success", { headers: { "Content-Type": "text/plain; charset=utf-8" } });
}

export async function POST(request: Request) {
  if (!authorized(request)) return new NextResponse("failure\nunauthorized", { status: 401 });
  const xml = await request.text();
  if (!xml.trim()) return NextResponse.json({ error: "empty_body" }, { status: 400 });
  try {
    const products = parseCommerceMLProducts(xml);
    return NextResponse.json({ products, count: products.length });
  } catch {
    return NextResponse.json({ error: "parse_failed" }, { status: 422 });
  }
}
