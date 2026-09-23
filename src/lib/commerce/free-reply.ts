import { linkSecret } from "@/lib/lifecycle/links";
import { getManifest } from "@/templates/manifests";
import type { Db } from "./db";
import { mintReplyToken, readReplyToken } from "./reply-token";

/**
 * The free reply: someone who received a paid premium gift sends one back in the same template for
 * free, with the "Made with Ethos" footer on. Extras, no footer, scheduling or a password still cost
 * the normal price (lib/gift/publish.ts decides that). The right to it travels in a signed token in
 * the "send one back" link (./reply-token.ts); free_replies (migration 0012) keeps it to one reply
 * per gift answered, whoever holds a token for it, for good: deleting the reply doesn't give it back.
 */

type GiftRow = { status: string; template_slug: string; watermark: boolean };

/** A gift that earns a free reply: live, a premium template, and paid for (sent without the footer). */
export function earnsFreeReply(gift: GiftRow): boolean {
  return gift.status === "live" && getManifest(gift.template_slug)?.tier === "premium" && !gift.watermark;
}

/**
 * The token for the end of a gift's "send one back" link, or null when the gift earns none or its
 * one free reply has been sent already: the editor then opens at the normal price instead of
 * promising a free reply that publishing would refuse.
 *
 * Minted by the gift page itself, for a gift it has just shown (app/[locale]/(gift)/g/[shortId]), so
 * only someone who could open the gift gets one: a password-protected gift's password is checked
 * before this is ever called. A token handed out for a bare short id would let anyone holding the link
 * but not the password spend the recipient's free reply.
 */
export async function replyTokenForGift(db: Db, gift: GiftRow & { id: string }): Promise<string | null> {
  const secret = linkSecret();
  if (!secret || !earnsFreeReply(gift)) return null;
  const { data: used } = await db.from("free_replies").select("original_gift_id").eq("original_gift_id", gift.id).maybeSingle();
  if (used) return null;
  return mintReplyToken({ giftId: gift.id, templateSlug: gift.template_slug }, secret);
}

export type FreeReply =
  /** `held`: this reply already took the free reply (being edited or published again). */
  | { free: true; originalGiftId: string; held: boolean }
  /** `reason` is null when no token was offered at all. */
  | { free: false; reason: "reply_invalid" | "reply_used" | null };

/**
 * Whether the gift being published or edited (`replyGiftId`) goes out as a free reply: it already
 * holds one, or the token names a gift in the same template that earns one, isn't the sender's own,
 * and hasn't been answered for free yet.
 */
export async function freeReplyFor(
  db: Db,
  args: { replyGiftId: string; templateSlug: string; userId: string; token?: string | null },
): Promise<FreeReply> {
  const { data: held } = await db.from("free_replies").select("original_gift_id").eq("reply_gift_id", args.replyGiftId).maybeSingle();
  if (held) return { free: true, originalGiftId: held.original_gift_id, held: true };
  if (!args.token) return { free: false, reason: null };
  const secret = linkSecret();
  const claim = secret ? readReplyToken(args.token, secret) : null;
  if (!claim || claim.templateSlug !== args.templateSlug || claim.giftId === args.replyGiftId) return { free: false, reason: "reply_invalid" };
  const { data: answered } = await db.from("gifts").select("user_id, template_slug, status, watermark").eq("id", claim.giftId).maybeSingle();
  if (!answered || answered.template_slug !== args.templateSlug || answered.user_id === args.userId || !earnsFreeReply(answered))
    return { free: false, reason: "reply_invalid" };
  const { data: used } = await db.from("free_replies").select("reply_gift_id").eq("original_gift_id", claim.giftId).maybeSingle();
  if (used) return { free: false, reason: "reply_used" };
  return { free: true, originalGiftId: claim.giftId, held: false };
}

/**
 * Takes the gift's one free reply for this reply, before it goes live: of two replies published at
 * once with the same token, one gets it. True when it is this reply's (now or already).
 */
export async function claimFreeReply(db: Db, originalGiftId: string, replyGiftId: string): Promise<boolean> {
  const { error } = await db.from("free_replies").insert({ original_gift_id: originalGiftId, reply_gift_id: replyGiftId });
  if (!error) return true;
  if (error.code !== "23505") {
    console.error("[free reply] claim failed", error.message);
    return false;
  }
  const { data } = await db.from("free_replies").select("reply_gift_id").eq("original_gift_id", originalGiftId).maybeSingle();
  return data?.reply_gift_id === replyGiftId;
}

/** Hands the free reply back when the publish it was taken for didn't go through. */
export async function releaseFreeReply(db: Db, originalGiftId: string, replyGiftId: string): Promise<void> {
  await db.from("free_replies").delete().eq("original_gift_id", originalGiftId).eq("reply_gift_id", replyGiftId);
}
