import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Plan } from "@/lib/dates/plan";
import { isSavingUnavailable, markSavingUnavailable, resetAvailability, subscribeAvailability, UNAVAILABLE_MS } from "@/lib/saved-dates/availability";
import { getSavedDate, listSavedDates, patchSavedDate } from "@/lib/saved-dates/client";
import { parseDetached, parseLink, type SavedLink } from "@/lib/saved-dates/link";
import { afterRefresh, afterSave, editorName, isDirty, linkFor, planKey, saveLinkedPlan, type SaveAnswer, type SaveEnv } from "@/lib/saved-dates/sync";
import { QUIET_HEADER, type SavedDate } from "@/lib/saved-dates/types";

/**
 * Keeping the plan on this device and the saved date in the account the same (docs/MEMBERSHIP.md
 * 3.3): what counts as a change, one autosave from start to answer, and what each answer does to
 * the link and the plan: a conflict shows the other phone's version, offline keeps the change for
 * later, a read-only date unlinks and leaves a banner rather than a toast.
 */

const ID = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const stop = (i: number): Plan["stops"][number] => ({ id: `s${i}`, name: `Stop ${i}`, kind: "cafe", lat: 38.7 + i / 100, lng: -9.1 });
const plan = (stops: number, over: Partial<Plan> = {}): Plan => ({ v: 1, where: "Lisbon", stops: Array.from({ length: stops }, (_, i) => stop(i + 1)), ...over });
const linkOf = (p: Plan, over: Partial<SavedLink> = {}): SavedLink => ({ id: ID, version: 3, synced: planKey(p), mine: true, ownerName: null, ...over });

const person = (name: string | null) => ({ name, initial: (name ?? "?")[0] });
const saved = (p: Plan, over: Partial<SavedDate> = {}): SavedDate => ({
  id: ID,
  kind: "date",
  title: "Our evening",
  city: "Lisbon",
  day: null,
  stopsCount: p.stops.length,
  cover: null,
  ideaId: null,
  tripId: null,
  mine: true,
  owner: person("Ana"),
  lastEditedBy: person("Ana"),
  editable: true,
  remind: true,
  version: 4,
  createdAt: "2026-09-20T10:00:00.000Z",
  updatedAt: "2026-09-25T10:00:00.000Z",
  data: p,
  ...over,
});
const failure = (error: Extract<SaveAnswer, { ok: false }>["error"], extra: Partial<Extract<SaveAnswer, { ok: false }>> = {}): SaveAnswer => ({ ok: false, status: 0, error, ...extra });
/** A save's answer came back with the plan as it was sent, or (`now`) moved on since. */
const keys = (sent: Plan, now: Plan = sent) => ({ sent: planKey(sent), current: planKey(now) });

/** One device: its link, its plan, whether it's signed in, and what the server answers a PATCH. */
function device(start: { plan: Plan; link: SavedLink | null; session?: boolean }, answer: (body: { baseVersion: number; data: Plan }) => SaveAnswer | Promise<SaveAnswer>) {
  const state = { plan: start.plan, link: start.link, session: start.session ?? true };
  const sent: { id: string; body: { baseVersion: number; data: Plan } }[] = [];
  const env: SaveEnv = {
    readLink: () => state.link,
    currentPlan: () => state.plan,
    hasSession: () => state.session,
    patch: async (id, body) => {
      sent.push({ id, body });
      return answer(body);
    },
  };
  return { state, sent, env };
}

describe("what counts as a change", () => {
  it("compares plans as readPlan reads them, so spacing and field order are not changes", () => {
    const p = plan(2);
    expect(planKey({ ...p, where: "  Lisbon " })).toBe(planKey(p));
    expect(planKey({ stops: p.stops, where: "Lisbon", v: 1 } as Plan)).toBe(planKey(p));
    expect(planKey(plan(3))).not.toBe(planKey(p));
  });

  it("is only a change for a plan linked to a saved date", () => {
    const p = plan(2);
    expect(isDirty(p, null)).toBe(false);
    expect(isDirty(p, linkOf(p))).toBe(false);
    expect(isDirty(plan(3), linkOf(p))).toBe(true);
  });

  it("reads a stored link or banner only when it is one", () => {
    expect(parseLink(JSON.stringify(linkOf(plan(1))))).toEqual(linkOf(plan(1)));
    expect(parseLink(JSON.stringify({ ...linkOf(plan(1)), id: "not-an-id" }))).toBeNull();
    expect(parseLink(JSON.stringify({ ...linkOf(plan(1)), version: 0 }))).toBeNull();
    expect(parseLink("{broken")).toBeNull();
    expect(parseDetached(JSON.stringify({ id: ID, reason: "read_only" }))).toEqual({ id: ID, reason: "read_only" });
    expect(parseDetached(JSON.stringify({ id: ID, reason: "other" }))).toBeNull();
    expect(parseDetached(null)).toBeNull();
  });
});

describe("autosave", () => {
  it("sends nothing while the plan isn't linked, or hasn't changed since the last save", async () => {
    const p = plan(2);
    const unlinked = device({ plan: p, link: null }, () => failure("network"));
    expect(await saveLinkedPlan(unlinked.env)).toBeNull();
    const unchanged = device({ plan: p, link: linkOf(p) }, () => failure("network"));
    expect(await saveLinkedPlan(unchanged.env)).toBeNull();
    expect([...unlinked.sent, ...unchanged.sent]).toEqual([]);
  });

  it("sends the plan with the version it was made on, and records what the server now holds", async () => {
    const before = plan(2);
    const d = device({ plan: plan(3), link: linkOf(before) }, (body) => ({ ok: true, savedDate: saved(body.data, { version: 4 }) }));
    const result = await saveLinkedPlan(d.env);
    expect(d.sent).toEqual([{ id: ID, body: { baseVersion: 3, data: plan(3) } }]);
    expect(result?.step).toEqual({ link: linkOf(plan(3), { version: 4 }), plan: null, notice: null, retry: false, detached: null });
    expect(isDirty(d.state.plan, result!.step.link)).toBe(false);
  });

  it("keeps a change made while the save was on its way, to send next", async () => {
    const d = device({ plan: plan(3), link: linkOf(plan(2)) }, (body) => {
      d.state.plan = plan(4);
      return { ok: true, savedDate: saved(body.data, { version: 4 }) };
    });
    const result = await saveLinkedPlan(d.env);
    expect(result?.step.link?.synced).toBe(planKey(plan(3)));
    expect(isDirty(d.state.plan, result!.step.link)).toBe(true);
  });

  it("offline, keeps the change here, unsaved, to try again on the next change or when the page is back", async () => {
    const link = linkOf(plan(2));
    const d = device({ plan: plan(3), link }, () => failure("network"));
    const result = await saveLinkedPlan(d.env);
    expect(result).toEqual({ step: { link, plan: null, notice: null, retry: true, detached: null }, sentKey: planKey(plan(3)) });
    // The server down, a limit, a session gone: the same.
    for (const error of ["not_configured", "rate_limited", "unauthenticated", "invalid_input"] as const) expect(afterSave(link, keys(plan(3)), failure(error)).retry).toBe(true);
  });

  it("signed out, sends nothing and waits", async () => {
    const d = device({ plan: plan(3), link: linkOf(plan(2)), session: false }, () => failure("network"));
    const result = await saveLinkedPlan(d.env);
    expect(d.sent).toEqual([]);
    expect(result?.step.retry).toBe(true);
  });

  it("drops an answer about a date that is no longer the one on this device", async () => {
    const d = device({ plan: plan(3), link: linkOf(plan(2)) }, (body) => {
      d.state.link = linkOf(plan(1), { id: OTHER });
      return { ok: true, savedDate: saved(body.data) };
    });
    expect(await saveLinkedPlan(d.env)).toBeNull();
    const closed = device({ plan: plan(3), link: linkOf(plan(2)) }, (body) => {
      closed.state.link = null;
      return { ok: true, savedDate: saved(body.data) };
    });
    expect(await saveLinkedPlan(closed.env)).toBeNull();
  });
});

describe("conflicts: two phones, one date", () => {
  it("shows the version saved first, and says who changed it", () => {
    const mine = plan(3);
    const theirs = plan(5);
    const step = afterSave(linkOf(plan(2)), keys(mine), failure("conflict", { status: 409, savedDate: saved(theirs, { version: 6, lastEditedBy: person("Ben") }) }));
    expect(step).toEqual({ link: linkOf(theirs, { version: 6 }), plan: theirs, notice: { kind: "conflict", name: "Ben" }, retry: false, detached: null });
  });

  it("never wipes what was typed while the losing save was out: that goes next, and the copy its answer carries is the one shown", async () => {
    // Both phones on v2. Ana's "bring a jacket" is v3; Ben's first line, sent on v2, is answered 409
    // (slowly), while Ben types a second line and Ana saves v4.
    const v2 = plan(2, { note: "" });
    const server = { version: 3, plan: plan(2, { note: "Ana: bring a jacket" }) };
    const answer = (body: { baseVersion: number; data: Plan }): SaveAnswer =>
      body.baseVersion === server.version ? { ok: true, savedDate: saved(body.data, { version: ++server.version, mine: false, lastEditedBy: person("Ben") }) } : failure("conflict", { status: 409, savedDate: saved(server.plan, { version: server.version, mine: false, owner: person("Ana"), lastEditedBy: person("Ana") }) });
    const ben = device({ plan: plan(2, { note: "Ben: book a table" }), link: linkOf(v2, { version: 2, mine: false, ownerName: "Ana" }) }, (body) => {
      const reply = answer(body);
      ben.state.plan = plan(2, { note: "Ben again: dessert first" });
      Object.assign(server, { version: 4, plan: plan(2, { note: "Ana again: 7pm not 6pm" }) });
      return reply;
    });
    const first = await saveLinkedPlan(ben.env);
    // Nothing replaced, nothing said: the link stays on v2, so the new line is still a change to send.
    expect(first?.step).toEqual({ link: ben.state.link, plan: null, notice: null, retry: false, detached: null });
    expect(ben.state.plan.note).toBe("Ben again: dessert first");
    expect(isDirty(ben.state.plan, first!.step.link)).toBe(true);

    const again = device({ plan: ben.state.plan, link: first!.step.link }, answer);
    const second = await saveLinkedPlan(again.env);
    expect(again.sent).toEqual([{ id: ID, body: { baseVersion: 2, data: plan(2, { note: "Ben again: dessert first" }) } }]);
    // The first save wins and stays; Ben is told, and what he now sees is what the server holds.
    expect(second?.step).toMatchObject({ plan: server.plan, link: { version: 4, synced: planKey(server.plan) }, notice: { kind: "conflict", name: "Ana" } });
    expect(isDirty(server.plan, second!.step.link)).toBe(false);
  });

  it("takes the other copy at once when what changed here meanwhile was only undone back to the last save", () => {
    const base = plan(2);
    const theirs = plan(4);
    const step = afterSave(linkOf(base), keys(plan(3), base), failure("conflict", { status: 409, savedDate: saved(theirs, { version: 6, lastEditedBy: person("Ben") }) }));
    expect(step).toMatchObject({ plan: theirs, link: { version: 6 }, notice: { kind: "conflict", name: "Ben" } });
  });

  it("says nothing when the other phone saved the very same plan", () => {
    const same = plan(3);
    const step = afterSave(linkOf(plan(2)), keys(same), failure("conflict", { status: 409, savedDate: saved(same, { version: 6 }) }));
    expect(step).toMatchObject({ plan: null, notice: null, link: { version: 6 } });
  });

  it("names nobody when it was this person on another of their phones, and the owner when a partner sees the owner's edit", () => {
    expect(editorName({ mine: true, owner: person("Ana"), lastEditedBy: person("Ana") })).toBeNull();
    expect(editorName({ mine: true, owner: person("Ana"), lastEditedBy: person("Ben") })).toBe("Ben");
    expect(editorName({ mine: false, owner: person("Ana"), lastEditedBy: person("Ana") })).toBe("Ana");
    expect(editorName({ mine: false, owner: person("Ana"), lastEditedBy: person("Ben") })).toBeNull();
  });

  it("takes the other phone's newer version when the page comes back, only with nothing waiting here", () => {
    const here = plan(2);
    const link = linkOf(here);
    const newer = saved(plan(4), { version: 5, lastEditedBy: person("Ben") });
    expect(afterRefresh(link, planKey(here), { ok: true, savedDate: newer })).toMatchObject({ plan: plan(4), link: { version: 5 }, notice: { kind: "conflict", name: "Ben" } });
    // A change of this phone's is waiting: the next save meets the newer version as a conflict, which says so.
    expect(afterRefresh(link, planKey(plan(3)), { ok: true, savedDate: newer })).toEqual({ link, plan: null, notice: null, retry: false, detached: null });
    expect(afterRefresh(link, planKey(here), { ok: true, savedDate: saved(here, { version: 3 }) })).toMatchObject({ link, plan: null });
    expect(afterRefresh(link, planKey(here), failure("network"))).toMatchObject({ link, plan: null, notice: null });
  });

  it("links an opened date at the version it was opened at", () => {
    expect(linkFor(saved(plan(2), { version: 9, mine: false, owner: person("Ben") }))).toEqual({ id: ID, version: 9, synced: planKey(plan(2)), mine: false, ownerName: "Ben" });
  });
});

describe("a date that can't be saved to any more", () => {
  it("read-only while editing: unlinks, keeps the plan here, and leaves a banner (not only a toast)", () => {
    const link = linkOf(plan(2));
    const step = afterSave(link, keys(plan(3)), failure("read_only", { status: 403 }));
    expect(step).toEqual({ link: null, plan: null, notice: { kind: "readOnly" }, retry: false, detached: ID });
  });

  it("read-only found on coming back to the page: the same", () => {
    const link = linkOf(plan(2));
    expect(afterRefresh(link, planKey(plan(2)), { ok: true, savedDate: saved(plan(2), { editable: false }) })).toEqual({ link: null, plan: null, notice: { kind: "readOnly" }, retry: false, detached: ID });
  });

  it("deleted (or no longer shared): unlinks and says so, with no banner to close", () => {
    const link = linkOf(plan(2));
    expect(afterSave(link, keys(plan(3)), failure("not_found", { status: 404 }))).toEqual({ link: null, plan: null, notice: { kind: "gone" }, retry: false, detached: null });
    expect(afterRefresh(link, planKey(plan(2)), failure("not_found", { status: 404 }))).toMatchObject({ link: null, notice: { kind: "gone" }, detached: null });
    // A conflict whose server copy is a trip, or unreadable, can't be shown in the plan.
    expect(afterSave(link, keys(plan(3)), failure("conflict", { savedDate: { ...saved(plan(2)), kind: "trip", data: { v: 1, tripId: "amalfi-coast" } } }))).toMatchObject({ link: null, notice: { kind: "gone" } });
  });
});

describe("the website's requests, and saving being off", () => {
  const calls: { url: string; headers: Record<string, string> }[] = [];
  let reply: () => Response | Promise<Response>;
  beforeEach(() => {
    calls.length = 0;
    vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
      calls.push({ url, headers: init.headers as Record<string, string> });
      return reply();
    });
  });
  afterEach(() => {
    vi.unstubAllGlobals();
    resetAvailability();
  });
  const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

  it("asks quietly, and reads a quiet { unavailable } as not_configured", async () => {
    reply = () => json({ unavailable: true });
    expect(await listSavedDates()).toEqual({ ok: false, status: 503, error: "not_configured" });
    expect(calls[0].headers[QUIET_HEADER]).toBe("1");
    expect(await getSavedDate(ID)).toEqual({ ok: false, status: 503, error: "not_configured" });
  });

  it("passes a conflict's current row and a limit's numbers through, and a request that never arrived as network", async () => {
    reply = () => json({ error: "conflict", savedDate: saved(plan(2)) }, 409);
    expect(await patchSavedDate(ID, { baseVersion: 1, data: plan(2) })).toMatchObject({ ok: false, status: 409, error: "conflict", savedDate: { id: ID } });
    expect(calls[0].headers["content-type"]).toBe("application/json");
    reply = () => json({ error: "limit_reached", limit: 3, used: 3 }, 403);
    expect(await listSavedDates()).toEqual({ ok: false, status: 403, error: "limit_reached", limit: 3, used: 3 });
    reply = () => Promise.reject(new TypeError("Failed to fetch"));
    expect(await listSavedDates()).toEqual({ ok: false, status: 0, error: "network" });
    reply = () => new Response("<html>bad gateway</html>", { status: 502 });
    expect(await listSavedDates()).toEqual({ ok: false, status: 502, error: "network" });
  });

  it("remembers that saving is off for a while, tells every listener, and asks again later", () => {
    const now = Date.UTC(2026, 8, 25, 9);
    const heard = vi.fn();
    const stop = subscribeAvailability(heard);
    expect(isSavingUnavailable(now)).toBe(false);
    markSavingUnavailable(now);
    expect(heard).toHaveBeenCalledTimes(1);
    expect(isSavingUnavailable(now + UNAVAILABLE_MS - 1)).toBe(true);
    expect(isSavingUnavailable(now + UNAVAILABLE_MS)).toBe(false);
    stop();
  });
});
