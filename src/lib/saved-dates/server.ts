import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getCurrentUser } from "@/lib/auth/get-user";
import { KIND_IDS, type PlaceKind } from "@/lib/dates/kinds";
import { EMPTY_PLAN, readPlan } from "@/lib/dates/plan";
import { FREE_SAVED_DATES } from "@/lib/pricing/products";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { Database, Inserts, Json, Tables, Updates } from "@/lib/supabase/types";
import { getTrip } from "@/lib/trips/presets";
import { supabaseCouple, type Couple } from "./couple";
import type { SavedDate, SavedDateSummary, SavedDatesList, SavedKind, SavedPerson } from "./types";
import { deriveColumns, MAX_SAVED_DATES, readSavedData, readTripData, type InputError, type PatchInput, type SaveInput } from "./validate";

/**
 * The saved-dates rules (docs/MEMBERSHIP.md 3.1), over a store and a couple passed in, so they are
 * unit-tested without a database. Reads go through the signed-in user's own client, where
 * row-level security decides what they may see (their rows and, while they share a membership,
 * their partner's); every write is the service role's, after the checks here, because the free
 * limit and who may edit depend on membership, which the browser can't be trusted to say.
 */

type Client = SupabaseClient<Database>;
export type SavedRow = Tables<"saved_dates">;
/** What a card needs, without the plan: a list of fifty dates is not fifty whole plans. */
export type SavedListRow = Omit<SavedRow, "data" | "reminded_for"> & { idea: string | null; trip_id: string | null; first_stops: unknown[] };
export type OwnKey = { id: string; created_at: string; updated_at: string };
export type Profile = { name: string | null; email: string | null };
/**
 * Why the database refused a write: `duplicate`, that trip is saved already (23505 on the one-row-
 * per-trip index); `cap`, saved_dates_cap's 500 (23514, "too many saved dates"); `check`, any other
 * CHECK in 0015 (a title, a city or a plan longer than the table takes), which is the input's fault
 * and never "the limit".
 */
export type Refused = { refused: "duplicate" | "cap" | "check"; detail?: string };

export interface SavedStore {
  /** Every row the signed-in user may read, as RLS decides. */
  listVisible(): Promise<SavedListRow[]>;
  getVisible(id: string): Promise<SavedRow | null>;
  /** All of an owner's rows, service role: what the free limit counts and "the three most recent" ranks. */
  ownKeys(ownerId: string): Promise<OwnKey[]>;
  findOwnTrip(ownerId: string, tripId: string): Promise<SavedRow | null>;
  /**
   * The new row, or why it was refused. `created_at` and `updated_at` are the database's own
   * (their defaults): two saves at once are ranked by one clock, not by two servers' clocks.
   */
  insert(row: Inserts<"saved_dates">): Promise<{ row: SavedRow } | Refused>;
  /**
   * With `version`, only while the row is still at that version: null when someone saved first (or
   * it's gone). A new version gets the database's `updated_at` (0015's saved_dates_touch).
   */
  update(id: string, patch: Updates<"saved_dates">, version: number | null): Promise<SavedRow | null | Refused>;
  remove(id: string, ownerId: string): Promise<boolean>;
  profiles(ids: string[]): Promise<Map<string, Profile>>;
}

export type SavedDeps = { viewerId: string; store: SavedStore; couple: Couple };

/** A database error: the route answers 503 and logs it, and nothing is guessed. */
export class SavedStoreError extends Error {}

// ---------------------------------------------------------------------------------------------
// The shapes the API answers with
// ---------------------------------------------------------------------------------------------

type Fields = Record<string, unknown>;
const isFields = (value: unknown): value is Fields => typeof value === "object" && value !== null && !Array.isArray(value);

/** A person by name, or by the first letter of their email when they gave no name. The email itself never leaves. */
export function personOf(profile: Profile | undefined): SavedPerson {
  const name = profile?.name?.trim() || null;
  const first = Array.from((name ?? profile?.email ?? "").trim())[0];
  return { name, initial: first ? first.toLocaleUpperCase() : "?" };
}

/** Newest change first; equal to the millisecond, by the database's own finer stamp, then by id, so every reader ranks alike. */
export function byNewestChange(a: { updated_at: string; id: string }, b: { updated_at: string; id: string }): number {
  return Date.parse(b.updated_at) - Date.parse(a.updated_at) || (a.updated_at < b.updated_at ? 1 : a.updated_at > b.updated_at ? -1 : 0) || (a.id < b.id ? 1 : a.id > b.id ? -1 : 0);
}

/** Oldest first, for deciding which of two saves made at once was the fourth. */
const byCreation = (a: OwnKey, b: OwnKey) => Date.parse(a.created_at) - Date.parse(b.created_at) || (a.created_at < b.created_at ? -1 : a.created_at > b.created_at ? 1 : 0) || (a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

/**
 * Which of an owner's rows stay editable without a membership: the FREE_SAVED_DATES most recently
 * changed. Nothing is ever deleted when a membership ends; the rest are read-only until the owner
 * deletes some or joins again.
 */
export function editableWhenFree(rows: { id: string; updated_at: string }[], limit = FREE_SAVED_DATES): Set<string> {
  return new Set([...rows].sort(byNewestChange).slice(0, limit).map((r) => r.id));
}

/** A whole row as a list row; `reminded_for` comes along unread, as summarise() never looks at it. */
export function listShape({ data, ...rest }: SavedRow): SavedListRow {
  const fields = isFields(data) ? data : {};
  return {
    ...rest,
    idea: typeof fields.idea === "string" ? fields.idea : null,
    trip_id: typeof fields.tripId === "string" ? fields.tripId : null,
    first_stops: Array.isArray(fields.stops) ? fields.stops.slice(0, 3) : [],
  };
}

/** A date's photo comes from its first named stop; a trip's from its preset's first stop. */
function coverOf(row: SavedListRow): SavedDateSummary["cover"] {
  if (row.kind === "trip") {
    const stop = row.trip_id ? getTrip(row.trip_id)?.stops[0] : undefined;
    return stop ? { name: stop.name, lat: stop.lat, lng: stop.lng, kind: "landmark" } : null;
  }
  for (const stop of row.first_stops) {
    if (!isFields(stop) || stop.named === false) continue;
    const { name, lat, lng, kind } = stop;
    if (typeof name === "string" && typeof lat === "number" && typeof lng === "number" && typeof kind === "string" && (KIND_IDS as readonly string[]).includes(kind)) return { name, lat, lng, kind: kind as PlaceKind };
  }
  return null;
}

type Ctx = { viewerId: string; member: boolean; partnerId: string | null; recent: Set<string>; people: Map<string, SavedPerson> };

const visibleTo = (row: { owner_user_id: string }, ctx: Ctx) => row.owner_user_id === ctx.viewerId || (ctx.partnerId !== null && row.owner_user_id === ctx.partnerId);

/** Mine: a member edits all of theirs, anyone else their most recent few. The partner's: while it's shared, the membership runs, so always. */
const editableFor = (row: { id: string; owner_user_id: string }, ctx: Ctx) => (row.owner_user_id === ctx.viewerId ? ctx.member || ctx.recent.has(row.id) : row.owner_user_id === ctx.partnerId);

export function summarise(row: SavedListRow, ctx: Ctx): SavedDateSummary {
  const mine = row.owner_user_id === ctx.viewerId;
  const unknown: SavedPerson = { name: null, initial: "?" };
  // Only the two people sharing it are ever named: a former partner's edit isn't signed with their name.
  const editor = row.last_edited_by && (row.last_edited_by === ctx.viewerId || row.last_edited_by === ctx.partnerId) ? (ctx.people.get(row.last_edited_by) ?? null) : null;
  return {
    id: row.id,
    kind: row.kind,
    title: row.title,
    city: row.city,
    day: row.day,
    stopsCount: row.stops_count,
    cover: coverOf(row),
    ideaId: row.kind === "date" ? row.idea : null,
    tripId: row.kind === "trip" ? row.trip_id : null,
    mine,
    owner: ctx.people.get(row.owner_user_id) ?? unknown,
    lastEditedBy: editor,
    editable: editableFor(row, ctx),
    remind: row.remind,
    version: row.version,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/** A stored row's plan, read again on the way out: it was checked on the way in, but a reader never trusts a column. */
function dataOf(row: SavedRow): SavedDate["data"] {
  if (row.kind === "date") return readPlan(row.data) ?? EMPTY_PLAN;
  const trip = readTripData(row.data);
  return trip && trip !== "unknown_trip" ? trip : { v: 1, tripId: isFields(row.data) && typeof row.data.tripId === "string" ? row.data.tripId : "" };
}

const full = (row: SavedRow, ctx: Ctx): SavedDate => ({ ...summarise(listShape(row), ctx), data: dataOf(row) });

async function peopleFor(deps: SavedDeps, ids: (string | null)[]): Promise<Map<string, SavedPerson>> {
  const wanted = [...new Set(ids.filter((id): id is string => Boolean(id)))];
  const profiles = await deps.store.profiles(wanted);
  return new Map(wanted.map((id) => [id, personOf(profiles.get(id))]));
}

/** Who the viewer is to this row, and what they may do with their own. */
async function contextFor(deps: SavedDeps, row?: { owner_user_id: string }): Promise<Ctx> {
  const [member, partnerId] = await Promise.all([deps.couple.isMember(deps.viewerId), deps.couple.partnerOf(deps.viewerId)]);
  const needsRanking = !member && (!row || row.owner_user_id === deps.viewerId);
  const recent = needsRanking ? editableWhenFree(await deps.store.ownKeys(deps.viewerId)) : new Set<string>();
  const people = await peopleFor(deps, [deps.viewerId, partnerId]);
  return { viewerId: deps.viewerId, member, partnerId, recent, people };
}

// ---------------------------------------------------------------------------------------------
// The API's operations
// ---------------------------------------------------------------------------------------------

export type Answer<T> = { status: number; body: T };
type Refusal<E extends string> = Answer<{ error: E }>;
const refuse = <E extends string>(status: number, error: E): Refusal<E> => ({ status, body: { error } });

/** GET /api/saved-dates: own and the partner's, newest change first, with the quota. */
export async function listSavedDates(deps: SavedDeps, kind?: SavedKind): Promise<SavedDatesList> {
  const [member, partnerId, rows] = await Promise.all([deps.couple.isMember(deps.viewerId), deps.couple.partnerOf(deps.viewerId), deps.store.listVisible()]);
  const people = await peopleFor(deps, [deps.viewerId, partnerId]);
  const ctx: Ctx = { viewerId: deps.viewerId, member, partnerId, recent: new Set(), people };
  // The policy and couple_partner() agree, but a membership ending between the two reads must not
  // show the other person's rows as shared.
  const visible = rows.filter((row) => visibleTo(row, ctx)).sort(byNewestChange);
  const own = visible.filter((row) => row.owner_user_id === deps.viewerId);
  if (!member) ctx.recent = editableWhenFree(own);
  return {
    items: visible.filter((row) => !kind || row.kind === kind).map((row) => summarise(row, ctx)),
    quota: { used: own.length, limit: member ? null : FREE_SAVED_DATES },
    member,
    partner: partnerId ? (people.get(partnerId) ?? null) : null,
  };
}

/** GET /api/saved-dates/[id]. A row the viewer can't see is answered exactly like one that doesn't exist. */
export async function readSavedDate(deps: SavedDeps, id: string): Promise<Answer<{ savedDate: SavedDate }> | Refusal<"not_found">> {
  const row = await deps.store.getVisible(id);
  if (!row) return refuse(404, "not_found");
  const ctx = await contextFor(deps, row);
  if (!visibleTo(row, ctx)) return refuse(404, "not_found");
  return { status: 200, body: { savedDate: full(row, ctx) } };
}

export type LimitReached = Answer<{ error: "limit_reached"; limit: number; used: number }>;

/**
 * POST /api/saved-dates. Saving a trip that is saved already answers with the row that exists (the
 * button is a toggle, and a double tap is not two trips). The free limit is checked before the
 * insert and again after it: two saves at once that both passed the first check are ranked by when
 * the database made them (its `created_at`, never this server's clock: two requests can land on two
 * servers whose clocks disagree), and the one past the limit is deleted and refused, so a double
 * tap can't make a fourth.
 */
export async function createSavedDate(deps: SavedDeps, input: SaveInput): Promise<Answer<{ savedDate: SavedDate; existing?: true }> | LimitReached | Refusal<"invalid_input">> {
  const viewer = deps.viewerId;
  const existing = async () => {
    const found = input.kind === "trip" ? await deps.store.findOwnTrip(viewer, input.data.tripId) : null;
    return found ? ({ status: 200, body: { savedDate: full(found, await contextFor(deps, found)), existing: true } } as const) : null;
  };
  const already = await existing();
  if (already) return already;

  const [member, keys] = await Promise.all([deps.couple.isMember(viewer), deps.store.ownKeys(viewer)]);
  const limit = member ? MAX_SAVED_DATES : FREE_SAVED_DATES;
  if (keys.length >= limit) return { status: 403, body: { error: "limit_reached", limit, used: keys.length } };

  const inserted = await deps.store.insert({
    owner_user_id: viewer,
    kind: input.kind,
    title: input.title ?? "",
    ...deriveColumns(input),
    data: input.data as unknown as Json,
    last_edited_by: viewer,
  });
  if ("refused" in inserted) {
    if (inserted.refused === "duplicate") {
      const again = await existing();
      if (again) return again;
      throw new SavedStoreError("insert refused as a duplicate, and no saved trip found");
    }
    if (inserted.refused === "cap") return { status: 403, body: { error: "limit_reached", limit: MAX_SAVED_DATES, used: keys.length } };
    // Validation let through something the table's checks refuse: the input's fault, and ours to fix.
    console.warn(`[saved-dates] insert refused by a check: ${inserted.detail ?? "unknown"}`);
    return refuse(400, "invalid_input");
  }

  if (!member) {
    const ranked = (await deps.store.ownKeys(viewer)).sort(byCreation);
    if (ranked.findIndex((key) => key.id === inserted.row.id) >= FREE_SAVED_DATES) {
      await deps.store.remove(inserted.row.id, viewer);
      return { status: 403, body: { error: "limit_reached", limit: FREE_SAVED_DATES, used: ranked.length - 1 } };
    }
  }
  return { status: 201, body: { savedDate: full(inserted.row, await contextFor(deps, inserted.row)) } };
}

/**
 * PATCH /api/saved-dates/[id]. An edit names the version it was made on and is written only while
 * the row is still at it; if someone saved first, the answer is 409 with the row as it is now, and
 * the editor shows that. The partner edits the owner's rows (and the owner the partner's) while
 * they share; without a membership only the most recent few of one's own stay editable.
 */
export async function updateSavedDate(deps: SavedDeps, id: string, patch: PatchInput): Promise<Answer<{ savedDate: SavedDate }> | Answer<{ error: "conflict"; savedDate: SavedDate }> | Refusal<"not_found" | "read_only" | InputError>> {
  const row = await deps.store.getVisible(id);
  if (!row) return refuse(404, "not_found");
  const ctx = await contextFor(deps, row);
  if (!visibleTo(row, ctx)) return refuse(404, "not_found");
  if (!editableFor(row, ctx)) return refuse(403, "read_only");

  let saved: ReturnType<typeof readSavedData> | null = null;
  if (patch.data !== undefined) {
    saved = readSavedData(row.kind, patch.data);
    if (typeof saved === "string") return refuse(400, saved);
    // A saved trip stays the trip it was saved as: the one-row-per-trip index is keyed on it.
    if (saved.kind === "trip" && saved.data.tripId !== (isFields(row.data) ? row.data.tripId : undefined)) return refuse(400, "invalid_input");
  }
  const edits = saved !== null || patch.title !== undefined;
  const conflict = (current: SavedRow) => ({ status: 409, body: { error: "conflict" as const, savedDate: full(current, ctx) } });
  if (edits && patch.baseVersion !== row.version) return conflict(row);

  const update: Updates<"saved_dates"> = {
    ...(saved && { data: saved.data as unknown as Json, ...deriveColumns(saved) }),
    ...(patch.title !== undefined && { title: patch.title }),
    ...(patch.remind !== undefined && { remind: patch.remind }),
    // A reminder switched on or off is not a change to the date: it keeps its version and its place in
    // the list. A new version is stamped by the database (saved_dates_touch), as an insert is.
    ...(edits && { version: row.version + 1, last_edited_by: deps.viewerId }),
  };
  const written = await deps.store.update(id, update, edits ? row.version : null);
  if (written && "refused" in written) {
    console.warn(`[saved-dates] edit refused by a check: ${written.detail ?? "unknown"}`);
    return refuse(400, "invalid_input");
  }
  if (!written) {
    const current = await deps.store.getVisible(id);
    return current ? conflict(current) : refuse(404, "not_found");
  }
  // An edit only ever moves a row up the list, so what was editable a moment ago still is.
  if (row.owner_user_id === deps.viewerId && !ctx.member) ctx.recent.add(written.id);
  return { status: 200, body: { savedDate: full(written, ctx) } };
}

/** DELETE /api/saved-dates/[id]: only the row's owner deletes it, member or not. */
export async function deleteSavedDate(deps: SavedDeps, id: string): Promise<Answer<{ ok: true }> | Refusal<"not_found" | "not_owner">> {
  const row = await deps.store.getVisible(id);
  if (!row) return refuse(404, "not_found");
  if (row.owner_user_id !== deps.viewerId) return refuse(403, "not_owner");
  if (!(await deps.store.remove(id, deps.viewerId))) return refuse(404, "not_found");
  return { status: 200, body: { ok: true } };
}

// ---------------------------------------------------------------------------------------------
// Supabase
// ---------------------------------------------------------------------------------------------

const LIST_COLUMNS = "id, owner_user_id, kind, title, city, day, stops_count, remind, version, last_edited_by, created_at, updated_at, idea:data->>idea, trip_id:data->>tripId, s0:data->stops->0, s1:data->stops->1, s2:data->stops->2";
type ListedRow = Omit<SavedListRow, "first_stops"> & { s0: unknown; s1: unknown; s2: unknown };

const fail = (what: string, error: { message: string }): never => {
  throw new SavedStoreError(`${what}: ${error.message}`);
};

/** saved_dates_cap's words (0015): the one 23514 that is the 500 backstop rather than a CHECK. */
const CAP_MESSAGE = "too many saved dates";

/** A write the database refused for a reason of its own (not an outage), or null. */
export function refusalOf(error: { code?: string; message: string }): Refused | null {
  if (error.code === "23505") return { refused: "duplicate" };
  if (error.code === "23514") return error.message.includes(CAP_MESSAGE) ? { refused: "cap" } : { refused: "check", detail: error.message };
  return null;
}

/** `reader` is the signed-in user's own client (RLS); `writer` the service role. */
export function supabaseStore(reader: Client, writer: Client): SavedStore {
  const table = () => writer.from("saved_dates");
  return {
    async listVisible() {
      const { data, error } = await reader.from("saved_dates").select(LIST_COLUMNS).order("updated_at", { ascending: false }).limit(2 * MAX_SAVED_DATES);
      if (error) fail("list", error);
      return ((data ?? []) as unknown as ListedRow[]).map(({ s0, s1, s2, ...row }) => ({ ...row, first_stops: [s0, s1, s2].filter((s) => s !== null && s !== undefined) }));
    },
    async getVisible(id) {
      const { data, error } = await reader.from("saved_dates").select("*").eq("id", id).maybeSingle();
      if (error) fail("read", error);
      return data;
    },
    async ownKeys(ownerId) {
      const { data, error } = await table().select("id, created_at, updated_at").eq("owner_user_id", ownerId).limit(MAX_SAVED_DATES + 50);
      if (error) fail("count", error);
      return data ?? [];
    },
    async findOwnTrip(ownerId, tripId) {
      const { data, error } = await table().select("*").eq("owner_user_id", ownerId).eq("kind", "trip").eq("data->>tripId", tripId).limit(1).maybeSingle();
      if (error) fail("find trip", error);
      return data;
    },
    async insert(row) {
      const { data, error } = await table().insert(row).select("*").single();
      if (error) return refusalOf(error) ?? fail("insert", error);
      return { row: data };
    },
    async update(id, patch, version) {
      let query = table().update(patch).eq("id", id);
      if (version !== null) query = query.eq("version", version);
      const { data, error } = await query.select("*").maybeSingle();
      if (error) {
        const refused = refusalOf(error);
        return refused?.refused === "check" ? refused : fail("update", error);
      }
      return data;
    },
    async remove(id, ownerId) {
      const { data, error } = await table().delete().eq("id", id).eq("owner_user_id", ownerId).select("id");
      if (error) fail("delete", error);
      return (data ?? []).length > 0;
    },
    async profiles(ids) {
      if (ids.length === 0) return new Map();
      // Profiles are own-row only under RLS: the partner's name is read with the service role, and only the name leaves.
      const { data, error } = await writer.from("profiles").select("id, name, email").in("id", ids);
      if (error) fail("profiles", error);
      return new Map((data ?? []).map((p) => [p.id, { name: p.name, email: p.email }]));
    },
  };
}

/** The request's user and the stores, or why there are none (401 signed out, 503 without Supabase). */
export async function savedDatesSession(): Promise<{ deps: SavedDeps } | { status: 401 | 503; error: "unauthenticated" | "not_configured" }> {
  const [reader, user] = await Promise.all([getSupabaseServerClient(), getCurrentUser()]);
  const writer = getSupabaseAdminClient();
  if (!reader || !writer) return { status: 503, error: "not_configured" };
  if (!user) return { status: 401, error: "unauthenticated" };
  return { deps: { viewerId: user.id, store: supabaseStore(reader, writer), couple: supabaseCouple(writer) } };
}

