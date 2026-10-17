import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { appCatalog } from "@/lib/app/catalog";
import { etagMatches, NO_STORE } from "@/lib/app/http";

export const runtime = "nodejs";
export const maxDuration = 10;

/** Five minutes on the phone, a day at the edge, and a week served stale while it refreshes. */
const CACHE = "public, max-age=300, s-maxage=86400, stale-while-revalidate=604800";

/**
 * The iPhone app's catalogue, in both languages (lib/app/catalog.ts). The same for everybody and
 * only changed by a deploy, so it is cached hard; `ETag` is its version, and a phone that already
 * has it gets a 304.
 */
export async function GET(request: NextRequest) {
  if (!(await rateLimit(`app-catalog:${clientIp(request.headers)}`, { limit: 30, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  const { catalog, json } = appCatalog();
  const etag = `"${catalog.version}"`;
  const headers = { etag, "cache-control": CACHE };
  if (etagMatches(request.headers.get("if-none-match"), etag)) return new NextResponse(null, { status: 304, headers });
  return new NextResponse(json, { headers: { ...headers, "content-type": "application/json; charset=utf-8" } });
}
