"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createGiftSchema, giftDataBaseSchema, type GiftData, type GiftLocale } from "@/lib/gift/schema";
import { generateShortId } from "@/lib/gift/short-id";
import { decidePublish, liveEditNeedsUnlock } from "@/lib/gift/publish";
import { GIFTS_BUCKET, storageObjectKey } from "@/lib/gift/assets";
import { deleteGiftStorage } from "@/lib/gift/storage-cleanup";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getManifest, loadTemplate } from "@/templates/registry";
import type { Json } from "@/lib/supabase/types";
import { notifyPublished } from "@/lib/email/notify";

export type ActionResult<T> = { ok: true; data: T } | { ok: false; error: string; problems?: string[] };

type Ctx =
  | { ok: false; error: "not_configured" | "unauthenticated" }
  | { ok: true; supabase: NonNullable<Awaited<ReturnType<typeof getSupabaseServerClient>>>; user: NonNullable<Awaited<ReturnType<typeof getCurrentUser>>> };

async function requireContext(): Promise<Ctx> {
  const supabase = await getSupabaseServerClient();
  const user = await getCurrentUser();
  if (!supabase) return { ok: false, error: "not_configured" };
  if (!user) return { ok: false, error: "unauthenticated" };
  return { ok: true, supabase, user };
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

const saveInput = z.object({ giftId: z.uuid(), data: z.unknown() });

/** Validates against the template's schema and stores the draft. */
export async function saveDraft(raw: unknown): Promise<ActionResult<{ savedAt: string }>> {
  const ctx = await requireContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const input = saveInput.safeParse(raw);
  if (!input.success) return { ok: false, error: "invalid_input" };

  // Drafts may be incomplete: validate loosely (base shape) but never accept junk.
  const loose = giftDataBaseSchema.partial({ recipientName: true, senderName: true }).safeParse(input.data.data);
  if (!loose.success) return { ok: false, error: "invalid_data", problems: loose.error.issues.map((i) => i.path.join(".")) };

  // A live or scheduled gift is what recipients see: edits to it are held to the publish rules.
  const { data: row } = await ctx.supabase
    .from("gifts")
    .select("status, template_slug, unlock_at, password_hash, watermark")
    .eq("id", input.data.giftId)
    .eq("user_id", ctx.user.id)
    .single();
  if (!row) return { ok: false, error: "not_found" };
  if (row.status !== "draft") {
    const manifest = getManifest(row.template_slug);
    if (!manifest) return { ok: false, error: "unknown_template" };
    const needs = liveEditNeedsUnlock(manifest, { music: loose.data.music, video: loose.data.video, voiceNote: loose.data.voiceNote, photos: loose.data.photos ?? [] }, {
      hasSchedule: row.unlock_at !== null,
      hasPassword: row.password_hash !== null,
      watermark: row.watermark,
    });
    if (needs) {
      const { data: unlocked } = await ctx.supabase.rpc("has_template_unlock", { p_user: ctx.user.id, p_slug: row.template_slug });
      if (!unlocked) return { ok: false, error: "payment_required" };
    }
  }

  const { error } = await ctx.supabase
    .from("gifts")
    .update({ data: loose.data as unknown as Json, locale: loose.data.locale ?? "en", storage_pruned_at: null })
    .eq("id", input.data.giftId)
    .eq("user_id", ctx.user.id)
    .in("status", ["draft", "scheduled", "live"]);
  if (error) return { ok: false, error: error.message };
  return { ok: true, data: { savedAt: new Date().toISOString() } };
}

const publishInput = z.object({
  giftId: z.uuid(),
  data: z.unknown(),
  removeWatermark: z.boolean().default(false),
  password: z.string().max(64).optional(),
  schedule: z.object({ unlockAt: z.iso.datetime({ offset: true }), timezone: z.string().min(1) }).optional(),
});

export async function publishGift(raw: unknown): Promise<ActionResult<{ shortId: string; status: "live" | "scheduled" }>> {
  const ctx = await requireContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const input = publishInput.safeParse(raw);
  if (!input.success) return { ok: false, error: "invalid_input", problems: input.error.issues.map((i) => i.path.join(".")) };

  const { data: gift, error: giftError } = await ctx.supabase
    .from("gifts")
    .select("id, template_slug, user_id")
    .eq("id", input.data.giftId)
    .eq("user_id", ctx.user.id)
    .single();
  if (giftError || !gift) return { ok: false, error: "not_found" };

  const manifest = getManifest(gift.template_slug);
  const mod = await loadTemplate(gift.template_slug);
  if (!manifest || !mod) return { ok: false, error: "unknown_template" };

  const parsed = createGiftSchema(mod.fieldsSchema).safeParse(input.data.data);
  if (!parsed.success) return { ok: false, error: "invalid_data", problems: parsed.error.issues.map((i) => i.path.join(".")) };
  const data = parsed.data as GiftData;

  const { data: unlocked } = await ctx.supabase.rpc("has_template_unlock", { p_user: ctx.user.id, p_slug: gift.template_slug });

  const decision = decidePublish(manifest, data, { unlocked: Boolean(unlocked) }, {
    removeWatermark: input.data.removeWatermark,
    schedule: Boolean(input.data.schedule),
    password: Boolean(input.data.password),
  });
  if (!decision.ok) return { ok: false, error: decision.reason, problems: decision.problems };

  const scheduled = input.data.schedule && new Date(input.data.schedule.unlockAt).getTime() > Date.now();
  const status = scheduled ? "scheduled" : "live";

  const { error: updateError } = await ctx.supabase
    .from("gifts")
    .update({
      data: { ...data, watermark: decision.watermark } as unknown as Json,
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
  if (updateError) return { ok: false, error: updateError.message };

  const { error: pwError } = await ctx.supabase.rpc("set_gift_password", { p_gift_id: gift.id, p_password: input.data.password ?? null });
  if (pwError) return { ok: false, error: pwError.message };

  const { data: row } = await ctx.supabase.from("gifts").select("short_id").eq("id", gift.id).single();
  revalidatePath("/dashboard");
  void notifyPublished(
    gift.id,
    scheduled ? new Intl.DateTimeFormat(data.locale, { dateStyle: "long", timeStyle: "short", timeZone: input.data.schedule?.timezone }).format(new Date(input.data.schedule!.unlockAt)) : undefined,
  ).catch(() => {});
  return { ok: true, data: { shortId: row?.short_id ?? "", status } };
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

/** Does the current user own this template (or Everything)? False when signed out. */
export async function getEntitlement(templateSlug: string): Promise<{ unlocked: boolean; owned: string[] }> {
  const ctx = await requireContext();
  if (!ctx.ok) return { unlocked: false, owned: [] };
  // `owned` lets the editor say which template the buyer already paid for instead of a bare paywall.
  const [{ data }, { data: unlocks }] = await Promise.all([
    ctx.supabase.rpc("has_template_unlock", { p_user: ctx.user.id, p_slug: templateSlug }),
    ctx.supabase.from("template_unlocks").select("template_slug").eq("user_id", ctx.user.id),
  ]);
  return { unlocked: Boolean(data), owned: (unlocks ?? []).map((u) => u.template_slug) };
}

/** Dashboard: duplicate a gift as a new draft (assets are shared by reference until edited). */
export async function duplicateGift(giftId: string): Promise<ActionResult<{ giftId: string }>> {
  const ctx = await requireContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { data: source } = await ctx.supabase.from("gifts").select("template_slug, data, locale").eq("id", giftId).eq("user_id", ctx.user.id).single();
  if (!source) return { ok: false, error: "not_found" };
  for (let attempt = 0; attempt < 4; attempt++) {
    const { data, error } = await ctx.supabase
      .from("gifts")
      .insert({ short_id: generateShortId(), user_id: ctx.user.id, template_slug: source.template_slug, locale: source.locale, data: source.data })
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
  const { error } = await ctx.supabase.from("gifts").delete().eq("id", giftId).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true, data: null };
}

export async function setGiftStatus(giftId: string, status: "draft" | "live" | "archived"): Promise<ActionResult<null>> {
  const ctx = await requireContext();
  if (!ctx.ok) return { ok: false, error: ctx.error };
  const { error } = await ctx.supabase.from("gifts").update({ status }).eq("id", giftId).eq("user_id", ctx.user.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/dashboard");
  return { ok: true, data: null };
}
