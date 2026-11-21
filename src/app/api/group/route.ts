import type { NextRequest } from "next/server";
import { z } from "zod";
import { cleanLine } from "@/lib/group/clean";
import { answer, failed, jsonBody, organiser } from "@/lib/group/http";
import { GROUP_LIMITS } from "@/lib/group/limits";
import { createGroup, viewGroup } from "@/lib/group/store";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({ giftId: z.uuid(), fromName: z.string().max(200), forName: z.string().max(200), prompt: z.string().max(600).optional() });

/**
 * "Create the link": { giftId, fromName, forName, prompt? } → { group }. The signed-in sender turns
 * their draft, on a template made for group cards, into one people can add a note to. A gift that
 * already has a group gets it back, so asking twice makes one link. The gift's id travels in the
 * body, never in an address. 404 while the switch is off; 503 "unavailable" before migration 0023.
 */
export async function POST(request: NextRequest) {
  const who = await organiser();
  if (!who.ok) return who.response;
  const parsed = input.safeParse(await jsonBody(request));
  if (!parsed.success) return answer({ error: "invalid" }, 400);
  const fromName = cleanLine(parsed.data.fromName, GROUP_LIMITS.name);
  const forName = cleanLine(parsed.data.forName, GROUP_LIMITS.name);
  const prompt = cleanLine(parsed.data.prompt ?? "", GROUP_LIMITS.prompt, { required: false });
  if (!fromName || !forName || prompt === null) return answer({ error: "invalid" }, 400);
  try {
    const made = await createGroup(who.admin, { userId: who.user.id, giftId: parsed.data.giftId, fromName, forName, prompt, secret: who.secret, now: Date.now() });
    if (!made.ok) return answer({ error: made.error }, made.error === "not_found" ? 404 : made.error === "not_draft" ? 409 : 400);
    return answer({ group: await viewGroup(who.admin, made.group, who.secret) });
  } catch (error) {
    return failed(error);
  }
}
