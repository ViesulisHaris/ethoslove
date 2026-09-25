import { readPlan, type Plan } from "@/lib/dates/plan";
import type { Failure } from "./client";
import type { SavedLink } from "./link";
import type { SavedDate, SavedDateSummary, SavedPerson } from "./types";

/**
 * Keeping the plan on this device and the saved date in the account the same, as pure steps the
 * hook (components/saved-dates/use-saved-plan-sync.ts) applies: what counts as a change, and what
 * each answer from the server does to the link and the plan. The rule when two phones edit one
 * date at once is the simplest honest one: whoever saves second is shown the first one's version,
 * and told so.
 */

/** The plan as it is compared and stored: read back through readPlan, so trimmed text or field order never counts as a change. */
export function planKey(plan: Plan): string {
  return JSON.stringify(readPlan(plan) ?? plan);
}

export const isDirty = (plan: Plan, link: SavedLink | null): boolean => link !== null && planKey(plan) !== link.synced;

/** What the plan panel says: nothing to save, a change waiting for the debounce, on its way, or not saved (offline, signed out). */
export type SyncStatus = "saved" | "pending" | "saving" | "offline";

/** Said in a toast: someone else's version is showing now, or the date can't be saved to any more. */
export type SyncNotice = { kind: "conflict"; name: string | null } | { kind: "readOnly" } | { kind: "gone" };

export type SyncStep = {
  /** The link from now on; null unlinks (the plan stays on this device). */
  link: SavedLink | null;
  /** The working plan's new contents, when the server's replace it. */
  plan: Plan | null;
  notice: SyncNotice | null;
  /** Nothing reached the server: keep the change and try again later. */
  retry: boolean;
};

const samePerson = (a: SavedPerson | null, b: SavedPerson | null) => Boolean(a && b && a.name === b.name && a.initial === b.initial);

/**
 * Who made the version now showing, for "Sam changed this date". A saved date names its owner and
 * its last editor; when the last editor is the viewer themselves (another of their phones), there is
 * no one to name.
 */
export function editorName(saved: Pick<SavedDateSummary, "lastEditedBy" | "owner" | "mine">): string | null {
  const byOwner = samePerson(saved.lastEditedBy, saved.owner);
  const byOther = saved.mine ? !byOwner : byOwner;
  return byOther ? (saved.lastEditedBy?.name ?? null) : null;
}

export const linkFor = (saved: SavedDate): SavedLink => ({ id: saved.id, version: saved.version, synced: planKey(saved.data as Plan), mine: saved.mine, ownerName: saved.mine ? null : saved.owner.name });

/** The server's copy, as the working plan takes it: a date's plan (a trip is never linked). */
const planOf = (saved: SavedDate): Plan | null => (saved.kind === "date" ? readPlan(saved.data) : null);

export type SaveAnswer = { ok: true; savedDate: SavedDate } | Failure;

/**
 * After a PATCH. `currentKey` is the plan as it is now, which may have moved on while the request
 * was out: the link records what the server holds, so any difference is saved next.
 */
export function afterSave(link: SavedLink, currentKey: string, answer: SaveAnswer): SyncStep {
  if (answer.ok) return { link: { ...link, version: answer.savedDate.version, synced: planKey(answer.savedDate.data as Plan) }, plan: null, notice: null, retry: false };
  if (answer.error === "conflict" && answer.savedDate) {
    const server = planOf(answer.savedDate);
    if (!server) return { link: null, plan: null, notice: { kind: "gone" }, retry: false };
    const synced = planKey(server);
    // The other phone saved the very same plan: nothing to show, nothing lost.
    const same = synced === currentKey;
    return { link: { ...link, version: answer.savedDate.version, synced }, plan: same ? null : server, notice: same ? null : { kind: "conflict", name: editorName(answer.savedDate) }, retry: false };
  }
  if (answer.error === "read_only") return { link: null, plan: null, notice: { kind: "readOnly" }, retry: false };
  if (answer.error === "not_found") return { link: null, plan: null, notice: { kind: "gone" }, retry: false };
  // Offline, signed out, rate limited, the server down, a plan it refuses: the change stays here, unsaved.
  return { link, plan: null, notice: null, retry: true };
}

/**
 * After re-reading the row (the tab came back into view). A newer version is taken only when there
 * is nothing waiting to be saved here; otherwise the next save meets it as a conflict, which says so.
 */
export function afterRefresh(link: SavedLink, currentKey: string, answer: SaveAnswer): SyncStep {
  const unchanged = { link, plan: null, notice: null, retry: false };
  if (!answer.ok) {
    if (answer.error === "not_found") return { link: null, plan: null, notice: { kind: "gone" }, retry: false };
    return unchanged;
  }
  const saved = answer.savedDate;
  if (!saved.editable) return { link: null, plan: null, notice: { kind: "readOnly" }, retry: false };
  if (saved.version <= link.version || currentKey !== link.synced) return unchanged;
  const server = planOf(saved);
  if (!server) return unchanged;
  const synced = planKey(server);
  return { link: { ...link, version: saved.version, synced }, plan: synced === currentKey ? null : server, notice: synced === currentKey ? null : { kind: "conflict", name: editorName(saved) }, retry: false };
}
