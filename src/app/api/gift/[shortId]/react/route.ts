import { NextResponse, type NextRequest } from "next/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { REACTIONS_BUCKET, extensionForMime } from "@/lib/gift/assets";
import { isShortId } from "@/lib/gift/short-id";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { notifyReaction } from "@/lib/email/notify";

export const runtime = "nodejs";
export const maxDuration = 5;

const EMOJI = new Set(["❤️", "😭", "🥹", "😂", "😮"]);
const MAX_AUDIO_BYTES = 3 * 1024 * 1024;
const AUDIO_TYPES = new Set(["audio/webm", "audio/mp4", "audio/mpeg", "audio/ogg", "audio/wav", "audio/aac", "audio/x-m4a"]);

/** Recipient reaction: emoji + optional text + optional ≤20s voice note (multipart). */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/gift/[shortId]/react">) {
  const { shortId } = await ctx.params;
  if (!isShortId(shortId)) return NextResponse.json({ ok: false }, { status: 404 });
  const admin = getSupabaseAdminClient();
  if (!admin) return NextResponse.json({ ok: false }, { status: 503 });
  const ip = clientIp(request.headers);
  if (!(await rateLimit(`react:${ip}:${shortId}`, { limit: 5, windowSeconds: 3600 }))) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const form = await request.formData().catch(() => null);
  if (!form) return NextResponse.json({ ok: false }, { status: 400 });
  const emoji = String(form.get("emoji") ?? "");
  const text = String(form.get("text") ?? "").slice(0, 1000).trim();
  const audio = form.get("audio");
  if (!EMOJI.has(emoji)) return NextResponse.json({ ok: false, error: "bad_emoji" }, { status: 400 });

  // Find the gift id through the public RPC so we never touch gifts directly with recipient input.
  const { data: pub } = await admin.rpc("get_public_gift", { p_short_id: shortId, p_password: null });
  const giftId = pub && typeof pub === "object" ? String((pub as Record<string, unknown>).id) : null;
  if (!giftId) return NextResponse.json({ ok: false }, { status: 404 });

  let audioPath: string | null = null;
  if (audio instanceof File && audio.size > 0) {
    if (audio.size > MAX_AUDIO_BYTES || !AUDIO_TYPES.has(audio.type.split(";")[0])) {
      return NextResponse.json({ ok: false, error: "bad_audio" }, { status: 400 });
    }
    const key = `${giftId}/${crypto.randomUUID()}.${extensionForMime(audio.type.split(";")[0])}`;
    const { error } = await admin.storage.from(REACTIONS_BUCKET).upload(key, audio, { contentType: audio.type.split(";")[0] });
    if (error) return NextResponse.json({ ok: false, error: "upload_failed" }, { status: 500 });
    audioPath = `${REACTIONS_BUCKET}/${key}`;
  }

  const { data, error } = await admin.rpc("add_reaction", { p_short_id: shortId, p_emoji: emoji, p_text: text || null, p_audio_path: audioPath });
  if (error) return NextResponse.json({ ok: false, error: "failed" }, { status: 500 });
  void notifyReaction(giftId, emoji, text || null, Boolean(audioPath)).catch(() => {});
  return NextResponse.json({ ok: true, id: data });
}
