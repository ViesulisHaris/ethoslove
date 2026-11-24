import type { NextRequest } from "next/server";
import { z } from "zod";
import { answer, failed, jsonBody, organiser } from "@/lib/group/http";
import { groupOfGift, viewGroup } from "@/lib/group/store";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z.object({ giftId: z.uuid() });

/**
 * The sender's panel asking how its group stands: { giftId } → { group | null }, every 20 seconds
 * while the panel is on screen, and when the tab comes back. A POST with the gift's id in the body
 * rather than a GET with it in the address: a gift's id is never put in a URL.
 */
export async function POST(request: NextRequest) {
  const who = await organiser();
  if (!who.ok) return who.response;
  const parsed = input.safeParse(await jsonBody(request));
  if (!parsed.success) return answer({ error: "invalid" }, 400);
  try {
    const group = await groupOfGift(who.admin, who.user.id, parsed.data.giftId);
    return answer({ group: group ? await viewGroup(who.admin, group, who.secret) : null });
  } catch (error) {
    return failed(error);
  }
}
