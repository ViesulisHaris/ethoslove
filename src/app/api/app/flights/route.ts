import { NextResponse, type NextRequest } from "next/server";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { appFlights } from "@/lib/app/flights";
import { appLocale, NO_STORE } from "@/lib/app/http";

export const runtime = "nodejs";
export const maxDuration = 5;

const DAY = 60 * 60 * 24;

/** GET /api/app/flights: search links for a flight, with the distance and the time in the air (lib/app/flights.ts). */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  if (!(await rateLimit(`app-flights:${clientIp(request.headers)}`, { limit: 60, windowSeconds: 60 }))) return NextResponse.json({ error: "rate_limited" }, { status: 429, headers: NO_STORE });
  const result = appFlights({ from: params.get("from"), to: params.get("to"), depart: params.get("depart"), back: params.get("back"), adults: params.get("adults"), locale: appLocale(params) });
  if ("error" in result) return NextResponse.json({ error: result.error }, { status: 400, headers: NO_STORE });
  return NextResponse.json(result, { headers: { "cache-control": `public, max-age=${DAY}, s-maxage=${DAY}` } });
}
