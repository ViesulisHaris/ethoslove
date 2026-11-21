import "server-only";

import { randomUUID } from "node:crypto";
import type { Db } from "@/lib/commerce/db";
import { siteUrl } from "@/lib/email/urls";
import type { GiftContribution } from "@/lib/gift/schema";
import type { Database } from "@/lib/supabase/types";
import { getManifest } from "@/templates/manifests";
import { GROUP_LIMITS, GROUP_RETENTION } from "./limits";
import { copyPhotoToGift, deleteGroupStorage, pendingPhotoPath, removePendingPhotos, signPendingPhotos, storePendingPhoto } from "./photo-store";
import { groupToken, randomRef, sha256Hex } from "./token";

/**
 * Group cards, as the database holds them (migration 0023): one group per draft gift, and what each
 * person added at its link. Everything here runs with the service role, after the route has decided
 * who is asking: the sender (their own group, by account) or anyone holding the link (that group,
 * and only to add a note or take their own back). The gift's own content is never written here:
 * saying yes to a note returns the item, and the editor puts it in the gift (docs/GROUP.md).
 */

export type GroupRow = Database["public"]["Tables"]["gift_groups"]["Row"];
export type EntryRow = Database["public"]["Tables"]["gift_contributions"]["Row"];

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const iso = (ms: number) => new Date(ms).toISOString();

/**
 * The tables aren't there: the switch is on and migration 0023 is not applied. Routes answer 503
 * "unavailable" for this and nothing else on the site notices, since nothing else reads the tables.
 */
export class GroupUnavailableError extends Error {
  constructor(what: string) {
    super(`group cards are unavailable (${what}): is migration 0023_group_gifts.sql applied?`);
    this.name = "GroupUnavailableError";
  }
}

type DbError = { code?: string | null; message?: string | null } | null | undefined;
/** PostgREST's "table not in the schema cache" and Postgres's undefined_table. */
const isMissingTable = (error: DbError) => error?.code === "PGRST205" || error?.code === "42P01";

/** The data of a statement that must work; a missing table is "unavailable", anything else an error. */
function need<T>(result: { data: T; error: DbError }, what: string): T {
  if (!result.error) return result.data;
  if (isMissingTable(result.error)) throw new GroupUnavailableError(what);
  throw new Error(`group ${what}: ${result.error.message ?? "failed"}`);
}

/** What the sender's panel gets. A contributor's address is never part of it, only that one was left. */
export type GroupEntryView = {
  id: string;
  status: EntryRow["status"];
  name: string | null;
  note: string | null;
  photo: { url: string; width: number; height: number } | null;
  wantsEmail: boolean;
  /** What the gift's own data calls it, once it has been added (and still, once taken back). */
  key: string | null;
  reportRef: string;
  createdAt: string;
  decidedAt: string | null;
};

export type GroupView = {
  id: string;
  url: string;
  fromName: string;
  forName: string;
  prompt: string | null;
  max: number;
  noteMax: number;
  takesPhotos: boolean;
  closesAt: string;
  closedAt: string | null;
  sentAt: string | null;
  reportRef: string;
  entries: GroupEntryView[];
};

export const groupUrl = (token: string) => `${siteUrl()}/c/${token}`;

export async function groupOfGift(admin: Db, userId: string, giftId: string): Promise<GroupRow | null> {
  return need(await admin.from("gift_groups").select("*").eq("gift_id", giftId).eq("user_id", userId).maybeSingle(), "read");
}

export async function ownedGroup(admin: Db, userId: string, groupId: string): Promise<GroupRow | null> {
  return need(await admin.from("gift_groups").select("*").eq("id", groupId).eq("user_id", userId).maybeSingle(), "read");
}

export type CreateResult = { ok: true; group: GroupRow } | { ok: false; error: "not_found" | "not_group_template" | "not_draft" };

/**
 * The sender asked for a link to invite people. The group hangs off their draft gift, on a template
 * made for group cards; a gift that already has one gets that one back, so asking twice makes one.
 * The template's own limits are copied in, so the page at the link needs nothing but this row.
 */
export async function createGroup(admin: Db, input: { userId: string; giftId: string; fromName: string; forName: string; prompt: string | null; secret: string; now: number }): Promise<CreateResult> {
  const { data: gift } = await admin.from("gifts").select("id, template_slug, status, locale").eq("id", input.giftId).eq("user_id", input.userId).maybeSingle();
  if (!gift) return { ok: false, error: "not_found" };
  const rules = getManifest(gift.template_slug)?.features.group;
  if (!rules) return { ok: false, error: "not_group_template" };
  const existing = await groupOfGift(admin, input.userId, gift.id);
  if (existing) return { ok: true, group: existing };
  if (gift.status !== "draft") return { ok: false, error: "not_draft" };

  const id = randomUUID();
  const created = await admin
    .from("gift_groups")
    .insert({
      id,
      gift_id: gift.id,
      user_id: input.userId,
      template_slug: gift.template_slug,
      locale: gift.locale === "es" ? "es" : "en",
      from_name: input.fromName,
      for_name: input.forName,
      prompt: input.prompt || null,
      token_sha256: sha256Hex(groupToken(id, 1, input.secret)),
      token_version: 1,
      report_ref: randomRef(8),
      max_entries: Math.min(rules.max, GROUP_LIMITS.open),
      note_max: Math.min(Math.max(rules.noteMax, GROUP_LIMITS.noteFloor), GROUP_LIMITS.entryNote),
      takes_photos: rules.photos,
      closes_at: iso(input.now + GROUP_LIMITS.days * DAY),
    })
    .select("*")
    .single();
  if (created.error?.code === "23505") {
    // Two requests at once: the other one made it.
    const other = await groupOfGift(admin, input.userId, gift.id);
    if (other) return { ok: true, group: other };
  }
  return { ok: true, group: need(created, "create") as GroupRow };
}

/**
 * The group as the sender's panel shows it: the link (made again from the group's id, its version
 * and the secret), and every note that still matters to them. Waiting and added ones always; one
 * they turned down or removed while it can still be undone; one its writer took back only while the
 * gift may still be carrying it. If the secret changed since the link was made, the stored hash is
 * brought up to date here, so the link in the panel is always the one that works.
 */
export async function viewGroup(admin: Db, group: GroupRow, secret: string): Promise<GroupView> {
  const token = groupToken(group.id, group.token_version, secret);
  const hash = sha256Hex(token);
  if (hash !== group.token_sha256) need(await admin.from("gift_groups").update({ token_sha256: hash }).eq("id", group.id), "relink");

  const rows = (need(await admin.from("gift_contributions").select("*").eq("group_id", group.id).order("created_at", { ascending: true }), "entries") ?? []) as EntryRow[];
  const shown = rows.filter((row) => {
    if (row.status === "pending" || row.status === "approved") return true;
    if (row.status === "withdrawn") return Boolean(row.item_key);
    return !row.scrubbed_at;
  });
  const signed = await signPendingPhotos(admin, shown.flatMap((row) => (row.photo_path && !row.scrubbed_at ? [row.photo_path] : [])));
  return {
    id: group.id,
    url: groupUrl(token),
    fromName: group.from_name,
    forName: group.for_name,
    prompt: group.prompt,
    max: group.max_entries,
    noteMax: group.note_max,
    takesPhotos: group.takes_photos,
    closesAt: group.closes_at,
    closedAt: group.closed_at,
    sentAt: group.sent_at,
    reportRef: group.report_ref,
    entries: shown.map((row) => ({
      id: row.id,
      status: row.status,
      name: row.name,
      note: row.note,
      photo: row.photo_path && signed[row.photo_path] && row.photo_width && row.photo_height ? { url: signed[row.photo_path], width: row.photo_width, height: row.photo_height } : null,
      wantsEmail: Boolean(row.email),
      key: row.item_key,
      reportRef: row.report_ref,
      createdAt: row.created_at,
      decidedAt: row.decided_at,
    })),
  };
}

export type GroupPatch = { fromName?: string; forName?: string; prompt?: string | null; closed?: boolean; resetLink?: boolean; extend?: boolean };

/**
 * The sender changes what the page says, closes or reopens the link, makes a new one (the old one
 * then finds nothing), or keeps it open 30 more days, never past 90 from the day it was made. Once
 * the gift has been sent the link stays closed: only the words can still change.
 */
export async function patchGroup(admin: Db, group: GroupRow, patch: GroupPatch, secret: string, now: number): Promise<{ ok: true; group: GroupRow } | { ok: false; error: "sent" }> {
  if (group.sent_at && (patch.closed === false || patch.resetLink || patch.extend)) return { ok: false, error: "sent" };
  const update: Database["public"]["Tables"]["gift_groups"]["Update"] = {};
  if (patch.fromName !== undefined) update.from_name = patch.fromName;
  if (patch.forName !== undefined) update.for_name = patch.forName;
  if (patch.prompt !== undefined) update.prompt = patch.prompt || null;
  if (patch.closed !== undefined) update.closed_at = patch.closed ? (group.closed_at ?? iso(now)) : null;
  if (patch.resetLink) {
    const version = group.token_version >= 999 ? 1 : group.token_version + 1;
    update.token_version = version;
    update.token_sha256 = sha256Hex(groupToken(group.id, version, secret));
  }
  if (patch.extend) {
    const latest = Date.parse(group.created_at) + GROUP_LIMITS.maxDays * DAY;
    update.closes_at = iso(Math.max(Date.parse(group.closes_at), Math.min(now + GROUP_LIMITS.days * DAY, latest)));
  }
  if (Object.keys(update).length === 0) return { ok: true, group };
  const row = need(await admin.from("gift_groups").update(update).eq("id", group.id).select("*").single(), "update") as GroupRow;
  return { ok: true, group: row };
}

export type DecideResult =
  | { ok: true; entry: EntryRow; item?: GiftContribution; previewUrl?: string | null }
  | { ok: false; error: "not_found" | "full" | "gone" | "not_allowed" | "photo_failed" };

function itemOf(entry: EntryRow, key: string, photoPath: string | null): GiftContribution {
  return {
    key,
    name: entry.name ?? "",
    note: entry.note ?? "",
    ...(photoPath && entry.photo_width && entry.photo_height ? { photo: { url: photoPath, width: entry.photo_width, height: entry.photo_height } } : {}),
  };
}

async function entryOf(admin: Db, groupId: string, entryId: string): Promise<EntryRow | null> {
  return need(await admin.from("gift_contributions").select("*").eq("id", entryId).eq("group_id", groupId).maybeSingle(), "entry") as EntryRow | null;
}

async function counts(admin: Db, groupId: string): Promise<{ open: number; approved: number; total: number }> {
  const rows = (need(await admin.from("gift_contributions").select("status").eq("group_id", groupId), "count") ?? []) as Pick<EntryRow, "status">[];
  const approved = rows.filter((row) => row.status === "approved").length;
  return { approved, open: approved + rows.filter((row) => row.status === "pending").length, total: rows.length };
}

/**
 * "Add to gift": the note becomes approved and gets the key the gift's data will call it by; with a
 * photo, the photo is copied into the gift's own folder first. Asking again for a note already added
 * returns the same item, so a panel that lost the answer can simply ask again. The editor, not this,
 * writes the item into the gift.
 */
export async function approveEntry(admin: Db, group: GroupRow, entryId: string, withPhoto: boolean, now: number): Promise<DecideResult> {
  const entry = await entryOf(admin, group.id, entryId);
  if (!entry || entry.scrubbed_at || !entry.name || !entry.note) return { ok: false, error: "not_found" };
  if (entry.status !== "pending" && entry.status !== "approved") return { ok: false, error: "not_allowed" };
  const already = entry.status === "approved" && entry.item_key ? entry.item_key : null;
  if (!already && (await counts(admin, group.id)).approved >= group.max_entries) return { ok: false, error: "full" };

  const key = already ?? randomRef(10);
  let copy: { path: string; previewUrl: string | null } | null = null;
  if (withPhoto && entry.photo_path && group.takes_photos) {
    copy = await copyPhotoToGift(admin, entry.photo_path, group.gift_id, key);
    if (!copy) return { ok: false, error: "photo_failed" };
  }
  if (already) return { ok: true, entry, item: itemOf(entry, key, copy?.path ?? null), previewUrl: copy?.previewUrl ?? null };

  const claimed = need(await admin.from("gift_contributions").update({ status: "approved", item_key: key, decided_at: iso(now) }).eq("id", entry.id).eq("status", "pending").select("*"), "approve") as EntryRow[] | null;
  if (!claimed?.length) {
    // Decided from another tab in the same moment: whatever it is now is the answer.
    const again = await entryOf(admin, group.id, entryId);
    if (again?.status === "approved" && again.item_key) return { ok: true, entry: again, item: itemOf(again, again.item_key, null) };
    return { ok: false, error: "not_allowed" };
  }
  return { ok: true, entry: claimed[0], item: itemOf(claimed[0], key, copy?.path ?? null), previewUrl: copy?.previewUrl ?? null };
}

/** "Remove": a waiting note is turned down, one already in the gift is taken out. Its words stay a day, for Undo. */
export async function declineEntry(admin: Db, group: GroupRow, entryId: string, action: "reject" | "remove", now: number): Promise<DecideResult> {
  const from = action === "reject" ? "pending" : "approved";
  const to = action === "reject" ? "rejected" : "removed";
  const changed = need(await admin.from("gift_contributions").update({ status: to, decided_at: iso(now) }).eq("id", entryId).eq("group_id", group.id).eq("status", from).select("*"), action) as EntryRow[] | null;
  if (changed?.length) return { ok: true, entry: changed[0] };
  const entry = await entryOf(admin, group.id, entryId);
  if (!entry) return { ok: false, error: "not_found" };
  // Asked twice: it is already what was asked for.
  return entry.status === to ? { ok: true, entry } : { ok: false, error: "not_allowed" };
}

/** "Undo", within a day of turning a note down or removing it: it waits for the sender again, with a fresh key next time. */
export async function restoreEntry(admin: Db, group: GroupRow, entryId: string, now: number): Promise<DecideResult> {
  const entry = await entryOf(admin, group.id, entryId);
  if (!entry) return { ok: false, error: "not_found" };
  if (entry.status === "pending") return { ok: true, entry };
  if (entry.status !== "rejected" && entry.status !== "removed") return { ok: false, error: "not_allowed" };
  const decided = entry.decided_at ? Date.parse(entry.decided_at) : 0;
  if (entry.scrubbed_at || !entry.name || !entry.note || now - decided > GROUP_RETENTION.undoHours * HOUR) return { ok: false, error: "gone" };
  if ((await counts(admin, group.id)).open >= group.max_entries) return { ok: false, error: "full" };
  const restored = need(await admin.from("gift_contributions").update({ status: "pending", decided_at: null, item_key: null }).eq("id", entry.id).eq("status", entry.status).select("*"), "restore") as EntryRow[] | null;
  return restored?.length ? { ok: true, entry: restored[0] } : { ok: false, error: "not_allowed" };
}

/** The group and everything sent to it, gone. The notes already in the gift are the gift's, and stay. */
export async function deleteGroup(admin: Db, group: GroupRow): Promise<void> {
  need(await admin.from("gift_contributions").delete().eq("group_id", group.id), "delete entries");
  need(await admin.from("gift_groups").delete().eq("id", group.id), "delete");
  await deleteGroupStorage(admin, group.id).catch(() => {});
}

// What follows is for whoever holds the link: no account, and nothing but this one group.

export async function groupByToken(admin: Db, token: string): Promise<GroupRow | null> {
  return need(await admin.from("gift_groups").select("*").eq("token_sha256", sha256Hex(token)).maybeSingle(), "find") as GroupRow | null;
}

export type LinkState = "open" | "full" | "closed" | "sent";

/** What the page at the link is: taking notes, out of room, closed by the sender (or by time), or sent. */
export async function linkState(admin: Db, group: GroupRow, now: number): Promise<LinkState> {
  if (group.sent_at) return "sent";
  if (group.closed_at || Date.parse(group.closes_at) <= now) return "closed";
  const { open, total } = await counts(admin, group.id);
  return open >= group.max_entries || total >= GROUP_LIMITS.total ? "full" : "open";
}

export type NewEntry = { name: string; note: string; agreed: string; photo: { webp: Buffer; width: number; height: number } | null; email: { address: string; sha256: string; consent: string } | null; withdrawSha256: string };

/**
 * One person's note, stored for the sender to look at. The photo (already re-encoded) goes to the
 * private bucket first, under the id the row is about to have; if the row is then refused, the file
 * is taken away again. The trigger in 0023 is what holds the limits when two notes land together.
 */
export async function addEntry(admin: Db, group: GroupRow, entry: NewEntry, now: number): Promise<{ ok: true; id: string } | { ok: false; error: "full" | "photo_failed" }> {
  const id = randomUUID();
  const path = entry.photo ? pendingPhotoPath(group.id, id) : null;
  if (entry.photo && path && !(await storePendingPhoto(admin, path, entry.photo.webp))) return { ok: false, error: "photo_failed" };
  const { error } = await admin.from("gift_contributions").insert({
    id,
    group_id: group.id,
    name: entry.name,
    note: entry.note,
    photo_path: path,
    photo_width: entry.photo?.width ?? null,
    photo_height: entry.photo?.height ?? null,
    email: entry.email?.address ?? null,
    email_sha256: entry.email?.sha256 ?? null,
    email_consent: entry.email?.consent ?? null,
    email_consent_at: entry.email ? iso(now) : null,
    agreed: entry.agreed,
    withdraw_sha256: entry.withdrawSha256,
    report_ref: randomRef(8),
  });
  if (!error) return { ok: true, id };
  if (path) await removePendingPhotos(admin, [path]).catch(() => {});
  // The trigger's "group is full" (a check violation).
  if (error.code === "23514") return { ok: false, error: "full" };
  need({ data: null, error }, "add");
  return { ok: false, error: "full" };
}

/**
 * "Take my note back", from the browser that wrote it (it kept the secret). Before the gift is sent
 * the note is withdrawn wherever it stood; if it was already in the draft, its key stays on the row
 * so the sender's editor takes it out the next time the panel loads. After sending it is too late
 * for a button: the page gives the support address instead.
 */
export async function withdrawEntry(admin: Db, group: GroupRow, secret: string, now: number): Promise<"ok" | "sent" | "not_found"> {
  if (group.sent_at) return "sent";
  const entry = need(await admin.from("gift_contributions").select("id, status").eq("group_id", group.id).eq("withdraw_sha256", sha256Hex(secret)).maybeSingle(), "withdraw") as Pick<EntryRow, "id" | "status"> | null;
  if (!entry) return "not_found";
  if (entry.status !== "withdrawn") need(await admin.from("gift_contributions").update({ status: "withdrawn", decided_at: iso(now) }).eq("id", entry.id), "withdraw");
  return "ok";
}

/** The gift was published: its link takes no more notes. Safe to call for a gift with no group. */
export async function markGroupSent(admin: Db, giftId: string, now: number): Promise<void> {
  need(await admin.from("gift_groups").update({ sent_at: iso(now) }).eq("gift_id", giftId).is("sent_at", null), "sent");
}
