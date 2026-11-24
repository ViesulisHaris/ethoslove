"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { after } from "next/server";
import { createGiftSchema, giftDataBaseSchema, type GiftData, type GiftLocale } from "@/lib/gift/schema";
import { generateShortId } from "@/lib/gift/short-id";
import { decidePublish, liveEditNeedsUnlock } from "@/lib/gift/publish";
import { NOTE_TEMPLATES, freeTierAtPublish, oldFreeGiftAddsPhotos, sellsNotePhotos } from "@/lib/gift/free-tier";
import { EVERY_GROUP, groupUnlock, photosUnlock } from "@/lib/pricing/products";
import { groupGiftsEnabled } from "@/lib/group/flag";
import { GroupUnavailableError, forgetGroupPhotos, keysOutOfCard, markGroupSent } from "@/lib/group/store";
import { sendSignedGiftEmails } from "@/lib/group/signed-email";
import { GIFTS_BUCKET, giftIdOfStoragePath, storageObjectKey } from "@/lib/gift/assets";
import { deleteGiftStorage } from "@/lib/gift/storage-cleanup";
import { giftStoragePaths } from "@/lib/gift/storage-paths";
import { mediaUrlsAllowed } from "@/lib/gift/media-urls";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth/get-user";
// The manifest and the field schema only: loading the whole template here put every template's
// components, and three.js, into the editor's first download (see src/templates/schemas.ts).
import { getManifest } from "@/templates/manifests";
import { loadFieldsSchema } from "@/templates/schemas";
import { withFieldDefaults } from "@/templates/_shared/field-defaults";
import type { Json } from "@/lib/supabase/types";
import { notifyPublished } from "@/lib/email/notify";
import { claimFreeReply, freeReplyFor, releaseFreeReply } from "@/lib/commerce/free-reply";
import { campaignCoversEdit, campaignCoversNewGift, campaignGiftsLeft, parseCampaignGrant } from "@/lib/commerce/campaign-rules";
import { countCampaignGift } from "@/lib/commerce/campaign";
import { holidayExtraAtPublish, showsExtra, stampedExtra, withoutHolidayExtra, type HolidayExtra } from "@/lib/lifecycle/holiday-extras";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; problems?: string[] };

type Ctx =
  | { ok: false; error: "not_configured" | "unauthenticated" }
  | { ok: true; supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> };
type SignedIn = Extract<Ctx, { ok: true }>;

async function requireContext(): Promise<Ctx> {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase) return { ok: false, error: "not_configured" };
  if (!user) return { ok: false, error: "unauthenticated" };
  return { ok: true, supabase, user };
}

/**
 * Owners can only write drafts themselves (RLS, migration 0007). What recipients see, a publish or
 * an edit to a live gift, is written with the service role once the publish rules have passed, so
 * without SUPABASE_SERVICE_ROLE_KEY those writes are refused up front rather than by the database.
 */
function recipientFacingWriter(): SignedIn["supabase"] | null {
  return getSupabaseAdminClient();
}

/** Every stored file a gift points at, in any field, must sit in the folder of a gift this user owns. */
/**
 * Whether the account holds "a note with photos" for a template: its own unlock row ("photos:<slug>",
 * lib/pricing/products.ts). Row-level security shows a user their own rows only.
 */
async function holdsNotePhotos(ctx: SignedIn, templateSlug: string): Promise<boolean> {
  const { data } = await ctx.supabase.from("template_unlocks").select("template_slug").eq("user_id", ctx.user.id).eq("template_slug", photosUnlock(templateSlug)).maybeSingle();
  return Boolean(data);
}

/**
 * Whether the account holds group cards for a template: its own "group:<slug>" row, or "group:*"
 * (granted by hand). Read from the rows themselves, never through has_template_unlock, which says yes
 * for Everything's "*": Everything is templates, and a group card is sold apart.
 */
async function holdsGroup(ctx: SignedIn, templateSlug: string): Promise<boolean> {
  const { data } = await ctx.supabase.from("template_unlocks").select("template_slug").eq("user_id", ctx.user.id).in("template_slug", [groupUnlock(templateSlug), EVERY_GROUP]);
  return (data?.length ?? 0) > 0;
}

/** A group card: a gift on a template made for one, carrying at least one note other people added. */
function isGroupCard(templateSlug: string, data: { contributions?: unknown }): boolean {
  return Boolean(getManifest(templateSlug)?.features.group) && Array.isArray(data.contributions) && data.contributions.length > 0;
}

/**
 * A group card as recipients may be shown it: without any note its writer has taken back, or its
 * sender removed or turned down (on this device or another). The editor takes such a note out of its
 * own copy when its panel next reads the group, but that copy can be behind, and what goes out is
 * decided here: the note is dropped before anything is stored, and `dropped` says which, so the
 * editor can take them out of what it shows. Only looked up for a gift that carries notes, on a
 * template made for them, while group cards are on: any other gift sends no statement here.
 *
 * A database without the group tables has no notes to have been taken back, so the card goes as it
 * is. Any other failure refuses the save rather than risk sending a note someone withdrew.
 */
async function withoutNotesTakenBack<T extends { contributions?: { key: string }[] }>(writer: SignedIn["supabase"], giftId: string, templateSlug: string, data: T): Promise<{ ok: true; data: T; dropped: string[] } | { ok: false }> {
  if (!data.contributions?.length || !getManifest(templateSlug)?.features.group || !groupGiftsEnabled()) return { ok: true, data, dropped: [] };
  try {
    const out = await keysOutOfCard(writer, giftId);
    const dropped = data.contributions.filter((item) => out.has(item.key)).map((item) => item.key);
    if (dropped.length === 0) return { ok: true, data, dropped };
    return { ok: true, data: { ...data, contributions: data.contributions.filter((item) => !out.has(item.key)) }, dropped };
  } catch (error) {
    if (error instanceof GroupUnavailableError) return { ok: true, data, dropped: [] };
    console.error(`[group] notes taken back not read: ${(error as Error).message}`);
    return { ok: false };
  }
}

/** Work that must not hold up the answer (emails): run once it has gone, or at once where there is no request to wait for. */
function later(task: () => Promise<unknown>) {
  try {
    after(task);
  } catch {
    void task();
  }
}

async function ownsAssets(ctx: SignedIn, data: unknown): Promise<boolean> {
  const giftIds = new Set<string>();
  for (const path of giftStoragePaths(data)) {
    const giftId = giftIdOfStoragePath(path);
    if (!giftId) return false;
    giftIds.add(giftId);
  }
  if (giftIds.size === 0) return true;
  const { data: owned, error } = await ctx.supabase.from("gifts").select("id").eq("user_id", ctx.user.id).in("id", [...giftIds]);
  return !error && (owned?.length ?? 0) === giftIds.size;
}

/**
 * A group card's notes stay only on a template made for them (`features.group`, src/lib/group): on
 * any other, whatever the request carried under `contributions` is taken off before it is stored.
 */
function onlyGroupTemplates<T extends { contributions?: unknown }>(templateSlug: string, data: T): T {
  if (data.contributions === undefined || getManifest(templateSlug)?.features.group) return data;
  const rest = { ...data };
  delete rest.contributions;
  return rest;
}

/** Creates the draft row a gift needs before assets can be uploaded to Storage. */
export async function ensureDraft(input: { templateSlug: string; locale: GiftLocale }): Promise<ActionResult<{ giftId: string; shortId: string }>> {
  const ctx = await requireContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  if (!getManifest(input.templateSlug)) return { ok: false, error: "unknown_template" };

  for (let attempt = 0; attempt < 4; attempt++) {
    const shortId = generateShortId();
    const { data, error } = await ctx.supabase
      .from("gifts")
      .insert({ short_id: shortId, user_id: ctx.user.id, template_slug: input.templateSlug, locale: input.locale, data: {} })
      .select("id, short_id")
      .single();
    if (!error && data) return { ok: true, data: { giftId: data.id, shortId: data.short_id } };
    if (error && error.code !== "23505") return { ok: false, error: error.message };
  }
  return { ok: false, error: "short_id_collision" };
}

/** `expectDraft`: the editor believes this is still a draft, so a gift published since is refused rather than overwritten. */
const saveInput = z.object({ giftId: z.uuid(), data: z.unknown(), expectDraft: z.boolean().optional() });

/** Validates against the template's schema and stores the draft. */
export async function saveDraft(raw: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const ctx = await requireContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const input = saveInput.safeParse(raw);
  if (!input.success) return { ok: false, error: "invalid_input" };

  // Drafts may be incomplete: validate loosely (base shape) but never accept junk.
  const loose = giftDataBaseSchema.partial({ recipientName: true, senderName: true }).safeParse(input.data.data);
  if (!loose.success) return { ok: false, error: "invalid_data", problems: loose.error.issues.map((i) => i.path.join(".")) };

  const { data: row } = await ctx.supabase
    .from("gifts")
    .select("status, template_slug, unlock_at, password_hash, watermark, free_tier:data->>freeTier, held_photos:data->photos, stored_extra:data->>holidayExtra")
    .eq("id", input.data.giftId)
    .eq("user_id", ctx.user.id)
    .single();
  if (!row) return { ok: false, error: "not_found" };
  // An old copy of a draft left on a phone must never land on a gift that went live since.
  if (input.data.expectDraft && row.status !== "draft") return { ok: false, error: "not_draft" };
  // Recipients render whichever template data.templateSlug names, so it always comes from the row.
  // So does the free version a gift that is already out is held to (lib/gift/free-tier.ts): an edit
  // can't move a note back to the roomier rules. A draft still says it for itself.
  // The holiday extra is the server's too (lib/lifecycle/holiday-extras.ts): whatever the row holds, never the browser's word;
  // a draft holds none (a copy of a stamped gift is decided at its own first send).
  const typed = onlyGroupTemplates(row.template_slug, {
    ...loose.data,
    templateSlug: row.template_slug,
    ...(row.status === "draft" ? {} : { freeTier: freeTierAtPublish(undefined, { live: true, stored: row.free_tier }), holidayExtra: stampedExtra({ holidayExtra: row.stored_extra }) ?? undefined }),
  });

  if (row.status === "draft") {
    const { error } = await ctx.supabase
      .from("gifts")
      .update({ data: typed as unknown as Json, locale: typed.locale ?? "en" })
      .eq("id", input.data.giftId)
      .eq("user_id", ctx.user.id)
      .eq("status", "draft");
    if (error) return { ok: false, error: error.message };
    return { ok: true, data: { savedAt: new Date().toISOString() } };
  }

  // A live or scheduled gift is what recipients see: edits to it are held to the publish rules.
  const manifest = getManifest(row.template_slug);
  if (!manifest) return { ok: false, error: "unknown_template" };
  // A note taken back, or removed on another device, never reaches a card that is out.
  const writer = recipientFacingWriter();
  const current = writer ? await withoutNotesTakenBack(writer, input.data.giftId, row.template_slug, typed) : { ok: true as const, data: typed, dropped: [] };
  if (!current.ok) return { ok: false, error: "group_unavailable" };
  const data = current.data;
  const patch = { data: data as unknown as Json, locale: data.locale ?? "en" };
  // A group card that is out stays one only while its group unlock is held (a refund takes it away).
  if (isGroupCard(row.template_slug, data) && !(await holdsGroup(ctx, row.template_slug))) return { ok: false, error: "payment_required" };
  const content = { music: data.music, video: data.video, voiceNote: data.voiceNote, photos: data.photos ?? [], unwrap: data.unwrap, message: data.message, freeTier: data.freeTier };
  const flags = { hasSchedule: row.unlock_at !== null, hasPassword: row.password_hash !== null, watermark: row.watermark };
  // And once the note is for everyone, a free gift from before it takes no new photos without the
  // unlock (lib/gift/free-tier.ts): it can't be edited into the next free gift with photos.
  const needs = liveEditNeedsUnlock(manifest, content, flags) || oldFreeGiftAddsPhotos(manifest, { stored: row.free_tier, photos: row.held_photos }, data.photos ?? []);
  if (needs) {
    const { data: unlocked } = await ctx.supabase.rpc("has_template_unlock", { p_user: ctx.user.id, p_slug: row.template_slug });
    // A note with photos (the "photos" row) covers a note's photos, up to its limit, and nothing else.
    const photosOwned = !unlocked && sellsNotePhotos(manifest) && content.freeTier === "note" && content.photos.length > 0 ? await holdsNotePhotos(ctx, row.template_slug) : false;
    const stillNeeds = !photosOwned || liveEditNeedsUnlock(manifest, content, { ...flags, photosOwned }) || oldFreeGiftAddsPhotos(manifest, { stored: row.free_tier, photos: row.held_photos }, data.photos ?? []);
    if (!unlocked && stillNeeds) {
      // A free reply (lib/commerce/free-reply.ts) may be edited in its own template, footer on, and so
      // may a creator-campaign gift while its grant runs (lib/commerce/campaign-rules.ts).
      const campaign = campaignCoversEdit(parseCampaignGrant(ctx.user.app_metadata), row.template_slug, Date.now());
      const admin = manifest.tier === "premium" && !campaign ? recipientFacingWriter() : null;
      const reply = admin ? await freeReplyFor(admin, { replyGiftId: input.data.giftId, templateSlug: row.template_slug, userId: ctx.user.id }) : null;
      if (!(campaign || reply?.free) || liveEditNeedsUnlock(manifest, content, { ...flags, freeReply: true }) || oldFreeGiftAddsPhotos(manifest, { stored: row.free_tier, photos: row.held_photos }, data.photos ?? []))
        return { ok: false, error: "payment_required" };
    }
  }
  if (!mediaUrlsAllowed({ photos: data.photos ?? [], video: data.video, voiceNote: data.voiceNote, music: data.music, contributions: data.contributions }, { local: true })) return { ok: false, error: "invalid_assets" };
  if (!(await ownsAssets(ctx, data))) return { ok: false, error: "invalid_assets" };

  if (!writer) return { ok: false, error: "not_configured" };
  // Recipients see a live edit at once, so it is stored complete, as publishing stores a gift: a
  // setting it left out (a cleared number box saves none) or a choice the template can't take goes
  // in as the template's default, a number past its limits as the limit. What the sender wrote is
  // kept as it is. On 9 Nov an Arcade gift lost its catches per level this way.
  const fieldsSchema = await loadFieldsSchema(row.template_slug);
  const fields = data.fields && typeof data.fields === "object" ? withFieldDefaults(fieldsSchema, data.fields as Record<string, unknown>) : data.fields;
  const { error } = await writer
    .from("gifts")
    .update({ ...patch, data: { ...data, fields } as unknown as Json, storage_pruned_at: null })
    .eq("id", input.data.giftId)
    .eq("user_id", ctx.user.id)
    .in("status", ["scheduled", "live"]);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { savedAt: new Date().toISOString() } };
}

const publishInput = z.object({
  giftId: z.uuid(),
  data: z.unknown(),
  removeWatermark: z.boolean().default(false),
  password: z.string().max(64).optional(),
  schedule: z.object({ unlockAt: z.iso.datetime({ offset: true }), timezone: z.string().min(1) }).optional(),
  // "Send one back" from a paid premium gift: the signed token that makes this reply free.
  replyToken: z.string().max(400).optional(),
});

/** `takenBack`: the keys of notes left out of a group card because they were taken back or removed since the editor last looked (there only when there are any). */
export async function publishGift(raw: unknown): Promise<ActionResult<{ shortId: string; status: "live" | "scheduled"; holidayExtra: HolidayExtra | null; takenBack?: string[] }>> {
  const ctx = await requireContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const input = publishInput.safeParse(raw);
  if (!input.success) return { ok: false, error: "invalid_input", problems: input.error.issues.map((i) => i.path.join(".")) };

  const { data: gift, error: giftError } = await ctx.supabase
    .from("gifts")
    .select("id, template_slug, user_id, status, created_at, published_at, watermark, free_tier:data->>freeTier, held_photos:data->photos, stored_extra:data->>holidayExtra")
    .eq("id", input.data.giftId)
    .eq("user_id", ctx.user.id)
    .single();
  if (giftError || !gift) return { ok: false, error: "not_found" };

  const manifest = getManifest(gift.template_slug);
  const fieldsSchema = await loadFieldsSchema(gift.template_slug);
  if (!manifest || !fieldsSchema) return { ok: false, error: "unknown_template" };

  const parsed = createGiftSchema(fieldsSchema).safeParse(input.data.data);
  if (!parsed.success) return { ok: false, error: "invalid_data", problems: parsed.error.issues.map((i) => i.path.join(".")) };
  // Recipients render whichever template data.templateSlug names, so it always comes from the row;
  // and the free version it is held to is the server's to say too (freeTierAtPublish): a gift already
  // out keeps its own, and a first publish takes the draft's word only while the test is running.
  const live = gift.status !== "draft";
  const asSent: GiftData = onlyGroupTemplates(gift.template_slug, {
    ...(parsed.data as GiftData),
    templateSlug: gift.template_slug,
    freeTier: NOTE_TEMPLATES.includes(gift.template_slug) ? freeTierAtPublish((parsed.data as GiftData).freeTier, { live, stored: gift.free_tier }) : undefined,
  });

  const { data: unlocked } = await ctx.supabase.rpc("has_template_unlock", { p_user: ctx.user.id, p_slug: gift.template_slug });
  const writer = recipientFacingWriter();
  if (!writer) return { ok: false, error: "not_configured" };
  // A note taken back, or removed on another device, since the editor last looked never goes out:
  // it is dropped here, before the card is judged ready, paid for or stored.
  const current = await withoutNotesTakenBack(writer, gift.id, gift.template_slug, asSent);
  if (!current.ok) return { ok: false, error: "group_unavailable" };
  const data = current.data;
  // A reply to a paid premium gift goes out free, footer on (lib/commerce/free-reply.ts). Only
  // looked at when nothing the sender owns already covers the template.
  const reply =
    !unlocked && manifest.tier === "premium"
      ? await freeReplyFor(writer, { replyGiftId: gift.id, templateSlug: gift.template_slug, userId: ctx.user.id, token: input.data.replyToken })
      : null;

  // A creator with a running campaign grant publishes the campaign's templates free, footer on and no
  // extras (lib/commerce/campaign-rules.ts): a new gift needs one left of the grant's count, a gift
  // already out under it may be published again with its changes.
  const grant = !unlocked && manifest.tier === "premium" && reply?.free !== true ? parseCampaignGrant(ctx.user.app_metadata) : null;
  const firstPublish = gift.status === "draft";
  const campaign = firstPublish ? campaignCoversNewGift(grant, gift.template_slug, Date.now()) : campaignCoversEdit(grant, gift.template_slug, Date.now());

  // A note with photos: only looked up for a note that carries photos and has no unlock behind it.
  const photos = !unlocked && sellsNotePhotos(manifest) && data.freeTier === "note" && data.photos.length > 0 ? await holdsNotePhotos(ctx, gift.template_slug) : false;
  // A group card: only looked up for a gift that carries contributions on a template made for them.
  const group = isGroupCard(gift.template_slug, data) ? await holdsGroup(ctx, gift.template_slug) : false;
  const decision = decidePublish(manifest, data, { unlocked: Boolean(unlocked), photos, group }, {
    removeWatermark: input.data.removeWatermark,
    schedule: Boolean(input.data.schedule),
    password: Boolean(input.data.password),
    freeReply: reply?.free === true,
    campaign,
  });
  // A free gift from before the note, published again once the note is for everyone: no new photos without the unlock.
  if (decision.ok && live && !unlocked && oldFreeGiftAddsPhotos(manifest, { stored: gift.free_tier, photos: gift.held_photos }, data.photos)) return { ok: false, error: "payment_required" };
  // A token that doesn't hold (used already, or not for this gift) says so, so the sheet can explain the price.
  if (!decision.ok) return { ok: false, error: decision.reason === "payment_required" && reply && !reply.free && reply.reason ? reply.reason : decision.reason, problems: decision.problems };
  // Media only from the sender's uploads, the demo and library files and Apple previews (lib/gift/media-urls.ts).
  if (!mediaUrlsAllowed(data)) return { ok: false, error: "invalid_assets" };
  if (!(await ownsAssets(ctx, data))) return { ok: false, error: "invalid_assets" };

  const scheduled = input.data.schedule && new Date(input.data.schedule.unlockAt).getTime() > Date.now();
  // The holiday extra is decided at a publish and kept after; a gift sent before without it can still
  // get it if it was begun inside the days (lib/lifecycle/holiday-extras.ts).
  const holidayExtra = holidayExtraAtPublish(
    { publishedBefore: gift.published_at !== null, stored: { holidayExtra: gift.stored_extra }, createdAt: gift.created_at, publishedAt: gift.published_at, watermark: gift.watermark },
    Date.now(),
    Boolean(unlocked),
  );
  const status = scheduled ? "scheduled" : "live";
  // Taken before the gift goes live, so two replies published with one token can't both be free.
  const claimed = reply?.free && !reply.held ? reply.originalGiftId : null;
  if (claimed && !(await claimFreeReply(writer, claimed, gift.id))) return { ok: false, error: "reply_used" };

  // The password goes on before the gift goes live: it only needs ownership, so it works on a draft,
  // and if the unlock disappeared in the meantime the password is refused before anything is public.
  const { error: pwError } = await ctx.supabase.rpc("set_gift_password", { p_gift_id: gift.id, p_password: input.data.password ?? null });
  if (pwError) {
    if (claimed) await releaseFreeReply(writer, claimed, gift.id);
    return { ok: false, error: pwError.message };
  }

  const { error: updateError } = await writer
    .from("gifts")
    .update({
      data: { ...data, watermark: decision.watermark, holidayExtra } as unknown as Json,
      status,
      is_premium: decision.isPremium,
      watermark: decision.watermark,
      unlock_at: scheduled ? input.data.schedule!.unlockAt : null,
      timezone: input.data.schedule?.timezone ?? null,
      locale: data.locale,
      published_at: new Date().toISOString(),
      storage_pruned_at: null,
    })
    .eq("id", gift.id)
    .eq("user_id", ctx.user.id);
  if (updateError) {
    if (claimed) await releaseFreeReply(writer, claimed, gift.id);
    return { ok: false, error: updateError.message };
  }

  // Counted at publish, so a gift deleted afterwards doesn't hand its slot back.
  if (campaign && firstPublish) await countCampaignGift(writer, ctx.user.id).catch(() => {});

  // A group card that has gone out takes no more notes: its link closes. Only where group cards are
  // on and the template is one; a failure here never undoes a publish that has happened.
  if (manifest.features.group && groupGiftsEnabled()) {
    await markGroupSent(writer, gift.id, Date.now()).catch((e) => console.error(`[group] sent not recorded: ${(e as Error).message}`));
    // "Here's the card you signed", to whoever asked for it and confirmed: now if it is live; a
    // scheduled card sends it when it unlocks (lib/gift/promote.ts and the daily job).
    // They go one after another, up to one a note, so they are sent once the sender has their answer.
    if (status === "live") later(() => sendSignedGiftEmails(writer, gift.id, Date.now()).catch((e) => console.error(`[group] signed emails not sent: ${(e as Error).message}`)));
  }

  const { data: row } = await ctx.supabase.from("gifts").select("short_id").eq("id", gift.id).single();
  revalidatePath("/dashboard");
  void notifyPublished(
    gift.id,
    scheduled ? new Intl.DateTimeFormat(data.locale, { dateStyle: "long", timeStyle: "short", timeZone: input.data.schedule?.timezone }).format(new Date(input.data.schedule!.unlockAt)) : undefined,
  ).catch(() => {});
  return { ok: true, data: { shortId: row?.short_id ?? "", status, holidayExtra: unlocked ? showsExtra({ status, data: { holidayExtra } }) : null, ...(current.dropped.length ? { takenBack: current.dropped } : {}) } };
}

/** Owner-only signed URLs so the editor can preview assets already in Storage. */
export async function signAssetUrls(paths: string[]): Promise<ActionResult<Record<string, string>>> {
  const ctx = await requireContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const keys = paths.map(storageObjectKey);
  if (keys.length === 0) return { ok: true, data: {} };
  const { data, error } = await ctx.supabase.storage.from(GIFTS_BUCKET).createSignedUrls(keys, 60 * 60 * 6);
  if (error) return { ok: false, error: error.message };
  const out: Record<string, string> = {};
  data.forEach((row, i) => {
    if (row.signedUrl) out[paths[i]] = row.signedUrl;
  });
  return { ok: true, data: out };
}

/** Loads an existing gift (owner) for editing. */
export async function loadGiftForEdit(giftId: string): Promise<ActionResult<{ id: string; shortId: string; templateSlug: string; status: string; data: unknown; unlockAt: string | null; timezone: string | null; hasPassword: boolean }>> {
  const ctx = await requireContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { data, error } = await ctx.supabase
    .from("gifts")
    .select("id, short_id, template_slug, status, data, unlock_at, timezone, password_hash")
    .eq("id", giftId)
    .eq("user_id", ctx.user.id)
    .single();
  if (error || !data) return { ok: false, error: "not_found" };
  return {
    ok: true,
    data: {
      id: data.id,
      shortId: data.short_id,
      templateSlug: data.template_slug,
      status: data.status,
      data: data.data,
      unlockAt: data.unlock_at,
      timezone: data.timezone,
      hasPassword: Boolean(data.password_hash),
    },
  };
}

export type CampaignEntitlement = { left: number; endsAt: string | null };

/**
 * Does the current user own this template (or Everything)? False when signed out. `campaign` is set
 * when they don't, but a running creator-campaign grant lets them publish a new gift in it free.
 */
export async function getEntitlement(templateSlug: string): Promise<{ unlocked: boolean; owned: string[]; campaign: CampaignEntitlement | null }> {
  const ctx = await requireContext();
  if (!ctx.ok) return { unlocked: false, owned: [], campaign: null };
  // `owned` lets the editor say which template the buyer already paid for instead of a bare paywall.
  const [{ data }, { data: unlocks }] = await Promise.all([
    ctx.supabase.rpc("has_template_unlock", { p_user: ctx.user.id, p_slug: templateSlug }),
    ctx.supabase.from("template_unlocks").select("template_slug").eq("user_id", ctx.user.id),
  ]);
  const grant = parseCampaignGrant(ctx.user.app_metadata);
  const campaign = !data && campaignCoversNewGift(grant, templateSlug, Date.now()) && grant ? { left: campaignGiftsLeft(grant), endsAt: grant.endsAt } : null;
  return { unlocked: Boolean(data), owned: (unlocks ?? []).map((u) => u.template_slug), campaign };
}

/**
 * Dashboard: duplicate a gift as a new draft (assets are shared by reference until edited). The copy
 * leaves the holiday extra behind: it is a new gift, decided at its own first send.
 */
export async function duplicateGift(giftId: string): Promise<ActionResult<{ giftId: string }>> {
  const ctx = await requireContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { data: source } = await ctx.supabase.from("gifts").select("template_slug, data, locale").eq("id", giftId).eq("user_id", ctx.user.id).single();
  if (!source) return { ok: false, error: "not_found" };
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await ctx.supabase
      .from("gifts")
      .insert({ short_id: generateShortId(), user_id: ctx.user.id, template_slug: source.template_slug, locale: source.locale, data: withoutHolidayExtra(source.data) })
      .select("id")
      .single();
    if (!error && data) {
      revalidatePath("/dashboard");
      return { ok: true, data: { giftId: data.id } };
    }
    if (error && error.code !== "23505") return { ok: false, error: error.message };
  }
  return { ok: false, error: "short_id_collision" };
}

export async function deleteGift(giftId: string): Promise<ActionResult<null>> {
  const ctx = await requireContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { data: gift } = await ctx.supabase
    .from("gifts")
    .select("id")
    .eq("id", giftId)
    .eq("user_id", ctx.user.id)
    .single();
  if (!gift) return { ok: false, error: "not_found" };
  const cleanup = await deleteGiftStorage(gift.id);
  if (cleanup.errors.length) return { ok: false, error: "storage_cleanup_failed" };
  // A group card's waiting photos go with it. Its rows cascade from the gift; the files are removed
  // here as well as can be, and whatever is missed the daily job finds within a day. Only while
  // group cards are on, and never a reason to keep a gift someone asked to delete.
  if (groupGiftsEnabled()) await forgetGroupPhotos({ giftId: gift.id }).catch(() => {});
  const { error } = await ctx.supabase.from("gifts").delete().eq("id", giftId).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true, data: null };
}
