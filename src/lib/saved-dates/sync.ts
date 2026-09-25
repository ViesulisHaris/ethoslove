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
  /**
   * The saved date the plan was unlinked from because it is read-only now: the plan page shows a
   * banner about it (link.ts writeDetached) rather than a toast that is gone in five seconds.
   */
  detached: string | null;
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
const step = (link: SavedLink | null, rest: Partial<Omit<SyncStep, "link">> = {}): SyncStep => ({ link, plan: null, notice: null, retry: false, detached: null, ...rest });

/** The date can't be saved to any more (read-only): unlinked, and the page shows the banner. */
const readOnlyStep = (link: SavedLink) => step(null, { notice: { kind: "readOnly" }, detached: link.id });

export function afterSave(link: SavedLink, currentKey: string, answer: SaveAnswer): SyncStep {
  if (answer.ok) return step({ ...link, version: answer.savedDate.version, synced: planKey(answer.savedDate.data as Plan) });
  if (answer.error === "conflict" && answer.savedDate) {
    const server = planOf(answer.savedDate);
    if (!server) return step(null, { notice: { kind: "gone" } });
    const synced = planKey(server);
    // The other phone saved the very same plan: nothing to show, nothing lost.
    const same = synced === currentKey;
    return step({ ...link, version: answer.savedDate.version, synced }, { plan: same ? null : server, notice: same ? null : { kind: "conflict", name: editorName(answer.savedDate) } });
  }
  if (answer.error === "read_only") return readOnlyStep(link);
  if (answer.error === "not_found") return step(null, { notice: { kind: "gone" } });
  // Offline, signed out, rate limited, the server down, a plan it refuses: the change stays here, unsaved.
  return step(link, { retry: true });
}

/**
 * After re-reading the row (the tab came back into view). A newer version is taken only when there
 * is nothing waiting to be saved here; otherwise the next save meets it as a conflict, which says so.
 */
export function afterRefresh(link: SavedLink, currentKey: string, answer: SaveAnswer): SyncStep {
  const unchanged = step(link);
  if (!answer.ok) {
    if (answer.error === "not_found") return step(null, { notice: { kind: "gone" } });
    return unchanged;
  }
  const saved = answer.savedDate;
  if (!saved.editable) return readOnlyStep(link);
  if (saved.version <= link.version || currentKey !== link.synced) return unchanged;
  const server = planOf(saved);
  if (!server) return unchanged;
  const synced = planKey(server);
  return step({ ...link, version: saved.version, synced }, { plan: synced === currentKey ? null : server, notice: synced === currentKey ? null : { kind: "conflict", name: editorName(saved) } });
}

/**
 * One autosave, as the hook runs it after the pause: what is linked now, the plan now, whether there
 * is a session, and the PATCH. Null when there was nothing to send (unlinked, unchanged, or the
 * answer came back about a date no longer linked here); otherwise the step to apply and the key of
 * the plan that was sent, so a failed save waits for a reason to try again rather than looping.
 */
export type SaveEnv = {
  readLink: () => SavedLink | null;
  currentPlan: () => Plan;
  hasSession: () => boolean;
  patch: (id: string, body: { baseVersion: number; data: Plan }) => Promise<SaveAnswer>;
};

export async function saveLinkedPlan(env: SaveEnv): Promise<{ step: SyncStep; sentKey: string } | null> {
  const linked = env.readLink();
  if (!linked) return null;
  const sending = env.currentPlan();
  const sentKey = planKey(sending);
  if (sentKey === linked.synced) return null;
  // Signed out (or the session gone): nothing to send it with. It stays here, "not saved yet".
  if (!env.hasSession()) return { step: step(linked, { retry: true }), sentKey };
  const answer = await env.patch(linked.id, { baseVersion: linked.version, data: sending });
  // Unlinked, or another date opened, while it was on its way: the answer is about a plan no longer here.
  const latest = env.readLink();
  if (!latest || latest.id !== linked.id) return null;
  return { step: afterSave(latest, planKey(env.currentPlan()), answer), sentKey };
}
