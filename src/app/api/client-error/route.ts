import { NextResponse, type NextRequest } from "next/server";
import { clientErrorSchema } from "@/lib/client-error-schema";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";

export const runtime = "nodejs";
export const maxDuration = 5;

const MAX_BYTES = 8_000;

/**
 * Where an error screen reports what it caught (see src/lib/client-error.ts). It only writes a
 * log line — `[client-error]` in the Vercel logs, at error level — so there is nothing to store and
 * nothing to leak. Same-origin, small and rate-limited, so it can't be used to fill the logs.
 */
export async function POST(request: NextRequest) {
  // Browsers mark every fetch and beacon with Sec-Fetch-Site; another site's page can't pass this.
  const site = request.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new NextResponse(null, { status: 403 });
  if (Number(request.headers.get("content-length") ?? 0) > MAX_BYTES) return new NextResponse(null, { status: 413 });
  if (!(await rateLimit(`client-error:${clientIp(request.headers)}`, { limit: 20, windowSeconds: 600 })))
    return new NextResponse(null, { status: 429 });

  const text = await request.text().catch(() => "");
  if (text.length > MAX_BYTES) return new NextResponse(null, { status: 413 });
  let json: unknown = null;
  try {
    json = JSON.parse(text);
  } catch {
    // stays null and fails the schema below
  }
  const parsed = clientErrorSchema.safeParse(json);
  if (!parsed.success) return new NextResponse(null, { status: 400 });

  const ua = request.headers.get("user-agent")?.slice(0, 300);
  console.error(`[client-error] ${JSON.stringify({ ...parsed.data, ua })}`);
  return new NextResponse(null, { status: 204 });
}
