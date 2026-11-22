import type { NextRequest } from "next/server";
import { z } from "zod";
import { UUID, answer, failed, jsonBody, notThere, organiser } from "@/lib/group/http";
import { approveEntry, declineEntry, ownedGroup, restoreEntry } from "@/lib/group/store";

export const runtime = "nodejs";
export const maxDuration = 15;

const input = z.discriminatedUnion("action", [
  z.object({ action: z.literal("approve"), withPhoto: z.boolean().default(false) }),
  z.object({ action: z.enum(["reject", "remove", "restore"]) }),
]);

const STATUS: Record<string, number> = { not_found: 404, full: 409, gone: 410, not_allowed: 409, taken_back: 409, photo_failed: 502 };

/**
 * The moderation step: nothing a stranger wrote reaches a gift until its sender says so here.
 *   { action: "approve", withPhoto } → { item, previewUrl? }: the note as the gift's data will hold
 *     it. Asking again returns the same item. 409 "full" once the template's number are in.
 *   { action: "reject" }   a waiting note is turned down.
 *   { action: "remove" }   one already added is taken out (the editor takes it out of the gift).
 *   { action: "restore" }  Undo, within a day: it waits again. 410 "gone" after that.
 * A note its writer has taken back answers 409 "taken_back" to all of them, so the panel can say whose
 * doing it was; one that is in some other state than the panel thought, 409 "not_allowed".
 * Only the account the group belongs to; anyone else gets 404.
 */
export async function POST(request: NextRequest, ctx: RouteContext<"/api/group/[id]/entries/[entryId]">) {
  const who = await organiser();
  if (!who.ok) return who.response;
  const { id, entryId } = await ctx.params;
  if (!UUID.test(id) || !UUID.test(entryId)) return notThere();
  const parsed = input.safeParse(await jsonBody(request));
  if (!parsed.success) return answer({ error: "invalid" }, 400);
  try {
    const group = await ownedGroup(who.admin, who.user.id, id);
    if (!group) return notThere();
    const now = Date.now();
    const done =
      parsed.data.action === "approve"
        ? await approveEntry(who.admin, group, entryId, parsed.data.withPhoto, now)
        : parsed.data.action === "restore"
          ? await restoreEntry(who.admin, group, entryId, now)
          : await declineEntry(who.admin, group, entryId, parsed.data.action, now);
    if (!done.ok) return answer({ error: done.error }, STATUS[done.error] ?? 400);
    return answer({ ok: true, status: done.entry.status, ...(done.item ? { item: done.item } : {}), ...(done.previewUrl ? { previewUrl: done.previewUrl } : {}) });
  } catch (error) {
    return failed(error);
  }
}
