import { NextResponse } from "next/server";
import { BRAND } from "@/config/brand";
import { supportHandoffEmail } from "@/emails/support-handoff";
import { sendEmail } from "@/lib/email/send";
import { clientIp } from "@/lib/request-ip";
import { handleHandoff } from "@/lib/support/handlers";
import { supportStore } from "@/lib/support/store";

export const runtime = "nodejs";
export const maxDuration = 20;

/** The help chat passing a conversation to the team: emails it to the support inbox, reply-to the visitor. */
export async function POST(request: Request) {
  if (request.headers.get("sec-fetch-site") === "cross-site") return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await request.json().catch(() => null);
  const result = await handleHandoff(body, {
    store: supportStore(),
    ip: clientIp(request.headers),
    to: BRAND.supportEmail,
    send: sendEmail,
    render: supportHandoffEmail,
  });
  return NextResponse.json(result.json, { status: result.status, headers: { "cache-control": "no-store" } });
}
