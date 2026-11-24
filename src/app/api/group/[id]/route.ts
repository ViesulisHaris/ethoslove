import type { NextRequest } from "next/server";
import { z } from "zod";
import { cleanLine } from "@/lib/group/clean";
import { UUID, answer, failed, jsonBody, notThere, organiser } from "@/lib/group/http";
import { GROUP_LIMITS } from "@/lib/group/limits";
import { deleteGroup, ownedGroup, patchGroup, viewGroup, type GroupPatch } from "@/lib/group/store";

export const runtime = "nodejs";
export const maxDuration = 10;

const input = z
  .object({ fromName: z.string().max(200), forName: z.string().max(200), prompt: z.string().max(600).nullable(), closed: z.boolean(), resetLink: z.literal(true), extend: z.literal(true) })
  .partial()
  .strict();

/**
 * The sender changes their group: what the page says (fromName, forName, prompt), `closed` to close
 * or reopen the link, `resetLink` for a new one (the old one then finds nothing), `extend` to keep
 * it open 30 more days. → { group }. Only the account the group belongs to; anyone else gets 404.
 */
export async function PATCH(request: NextRequest, ctx: RouteContext<"/api/group/[id]">) {
  const who = await organiser();
  if (!who.ok) return who.response;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notThere();
  const parsed = input.safeParse(await jsonBody(request));
  if (!parsed.success) return answer({ error: "invalid" }, 400);
  const patch: GroupPatch = { closed: parsed.data.closed, resetLink: parsed.data.resetLink, extend: parsed.data.extend };
  for (const key of ["fromName", "forName"] as const) {
    if (parsed.data[key] === undefined) continue;
    const line = cleanLine(parsed.data[key], GROUP_LIMITS.name);
    if (!line) return answer({ error: "invalid" }, 400);
    patch[key] = line;
  }
  if (parsed.data.prompt !== undefined) {
    const line = cleanLine(parsed.data.prompt ?? "", GROUP_LIMITS.prompt, { required: false });
    if (line === null) return answer({ error: "invalid" }, 400);
    patch.prompt = line;
  }
  try {
    const group = await ownedGroup(who.admin, who.user.id, id);
    if (!group) return notThere();
    const changed = await patchGroup(who.admin, group, patch, who.secret, Date.now());
    if (!changed.ok) return answer({ error: changed.error }, 409);
    return answer({ group: await viewGroup(who.admin, changed.group, who.secret) });
  } catch (error) {
    return failed(error);
  }
}

/**
 * The sender deletes their group: its link, and everything sent to it, files included. The notes
 * they already added to the gift are the gift's and stay; the editor is where those are removed.
 */
export async function DELETE(_request: NextRequest, ctx: RouteContext<"/api/group/[id]">) {
  const who = await organiser();
  if (!who.ok) return who.response;
  const { id } = await ctx.params;
  if (!UUID.test(id)) return notThere();
  try {
    const group = await ownedGroup(who.admin, who.user.id, id);
    if (!group) return notThere();
    await deleteGroup(who.admin, group);
    return answer({ ok: true });
  } catch (error) {
    return failed(error);
  }
}
