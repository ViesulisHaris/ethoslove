import { describe, expect, it } from "vitest";
import { addDone, doneCount, doneFromPlan, doneFromSaved, GIFT_FROM, MAX_DONE, mergeDone, readDone, timelineLabels, type DoneDate } from "@/lib/dates/done";
import { addDays } from "@/lib/dates/calendar";
import type { Plan } from "@/lib/dates/plan";
import type { SavedDateSummary } from "@/lib/saved-dates/types";

const stop = (i: number, over: Partial<Plan["stops"][number]> = {}): Plan["stops"][number] => ({ id: `node/${i}`, name: `Stop ${i}`, kind: "cafe", lat: 38.71, lng: -9.14, ...over });
const entry = (day: string, title = "A walk", over: Partial<DoneDate> = {}): DoneDate => ({ id: `${day}:${title}`, day, title, places: [], ...over });

describe("the dates you have done (dates2)", () => {
  it("D2 a plan marked done keeps its day, the idea's title as planned, and every stop", () => {
    const plan: Plan = { v: 1, date: "2026-11-20", where: "Lisbon", idea: "golden-hour-picnic", stops: [stop(1, { kind: "dessert" }), stop(2, { kind: "viewpoint" })] };
    const done = doneFromPlan(plan, "2026-11-25", "en");
    expect(done).toMatchObject({ day: "2026-11-20", title: "Golden hour picnic", where: "Lisbon", idea: "golden-hour-picnic", places: ["node/1", "node/2"] });
    expect(doneFromPlan({ ...plan, date: undefined }, "2026-11-25", "en").day).toBe("2026-11-25");
    // A day still to come is not the day it was done.
    expect(doneFromPlan({ ...plan, date: "2026-12-01" }, "2026-11-25", "en").day).toBe("2026-11-25");
    // No idea: the first named stop's name.
    expect(doneFromPlan({ v: 1, stops: [stop(3, { name: "Café Luna" })] }, "2026-11-25", "es").title).toBe("Café Luna");
    expect(doneFromPlan(plan, "2026-11-25", "es", "abc").saved).toBe("abc");
  });

  it("D3 the same date replaces itself, newest first, at most two hundred", () => {
    const a = entry("2026-11-01");
    let list = addDone([], a);
    list = addDone(list, entry("2026-11-10", "B"));
    list = addDone(list, { ...a, title: "A walk again" });
    expect(list.map((d) => d.day)).toEqual(["2026-11-10", "2026-11-01"]);
    expect(list[1].title).toBe("A walk again");
    let many: DoneDate[] = [];
    for (let i = 0; i < MAX_DONE + 5; i++) many = addDone(many, entry(`2026-01-01`, `T${i}`));
    expect(many).toHaveLength(MAX_DONE);
  });

  it("D4 a malformed entry is dropped and the rest kept", () => {
    const good = entry("2026-11-01", "Good", { places: ["node/1"] });
    const raw = JSON.stringify([good, { ...good, id: "x", day: "2026-13-40" }, { ...good, id: "y", places: ["https://evil"] }, "nope", { ...good, id: "z", title: 7 }]);
    expect(readDone(raw)).toEqual([good]);
    expect(readDone("{")).toEqual([]);
    expect(readDone(null)).toEqual([]);
  });

  it("D5 a week's edge: Sunday then Monday is two weeks in a row; Monday and Sunday of one week are one", () => {
    expect(doneCount([entry("2026-11-29"), entry("2026-11-30")], "2026-11-30")).toEqual({ kind: "weeks", n: 2 });
    expect(doneCount([entry("2026-11-23"), entry("2026-11-29")], "2026-11-29")).toEqual({ kind: "year", n: 2 });
  });

  it("D6 a streak whose last week is two weeks back is over", () => {
    expect(doneCount([entry("2026-11-02"), entry("2026-11-09")], "2026-11-25")).toEqual({ kind: "year", n: 2 });
  });

  it("D7 around midnight: the day is all it reads, never a clock", () => {
    const list = [entry("2026-11-21"), entry("2026-11-28")];
    // Saturday 21 and Saturday 28: two weeks in a row, still live on Sunday 29 and on Monday 30 (a new week, none yet).
    expect(doneCount(list, "2026-11-29")).toEqual({ kind: "weeks", n: 2 });
    expect(doneCount(list, "2026-11-30")).toEqual({ kind: "weeks", n: 2 });
    expect(doneCount(list, "2026-12-07")).toEqual({ kind: "year", n: 2 });
  });

  it("D8 a year's edge: 30 Dec and 2 Jan are one week, and this year counts only January", () => {
    const list = [entry("2026-12-30"), entry("2027-01-02")];
    expect(doneCount(list, "2027-01-02")).toEqual({ kind: "year", n: 1 });
    expect(doneCount([...list, entry("2026-12-23")], "2027-01-02")).toEqual({ kind: "weeks", n: 2 });
  });

  it("D9 the count shown: weeks from two in a row, else dates this year from one, else nothing", () => {
    expect(doneCount([entry("2026-11-12"), entry("2026-11-19"), entry("2026-11-25")], "2026-11-25")).toEqual({ kind: "weeks", n: 3 });
    expect(doneCount([entry("2026-03-01")], "2026-11-25")).toEqual({ kind: "year", n: 1 });
    expect(doneCount([entry("2025-06-01")], "2026-11-25")).toBeNull();
    expect(doneCount([], "2026-11-25")).toBeNull();
  });

  it("D10 an account's row stands for the local date saved as it; the same day and title is one date", () => {
    const local = [entry("2026-11-01", "Picnic", { saved: "row-1", places: ["node/1"] }), entry("2026-11-05", "Cinema", { places: ["node/2"] })];
    const account = [entry("2026-11-02", "Picnic", { id: "saved:row-1", saved: "row-1" }), entry("2026-11-05", "Cinema", { id: "saved:row-2", saved: "row-2" }), entry("2026-10-01", "Karaoke", { id: "saved:row-3", saved: "row-3" })];
    const merged = mergeDone(local, account);
    expect(merged.map((d) => `${d.day} ${d.title}`)).toEqual(["2026-11-05 Cinema", "2026-11-02 Picnic", "2026-10-01 Karaoke"]);
    expect(merged.find((d) => d.title === "Picnic")!.places).toEqual(["node/1"]);
    expect(merged.find((d) => d.title === "Cinema")!.places).toEqual(["node/2"]);
  });

  it("D11 the timeline's labels: oldest first, twenty at most, forty characters, never mid-word", () => {
    const list = Array.from({ length: 25 }, (_, i) => entry(addDays("2026-01-01", i * 7), "Dinner, then dessert somewhere dry and a very long walk home"));
    const labels = timelineLabels(list, "en");
    expect(labels).toHaveLength(20);
    for (const l of labels) {
      expect(l.length, l).toBeLessThanOrEqual(40);
      expect("Dinner, then dessert somewhere dry and a very long walk home".split(" ").some((w) => l.endsWith(` ${w}`)), l).toBe(true);
    }
    const two = timelineLabels([entry("2026-11-20", "Bowling"), entry("2026-11-01", "Gallery hop")], "es");
    expect(two[0]).toMatch(/^1 nov 2026 · Gallery hop$/);
    expect(two[1]).toMatch(/^20 nov 2026 · Bowling$/);
  });

  it("D12 the hand-over is from three: two done dates give none", () => {
    expect(GIFT_FROM).toBe(3);
    expect([entry("2026-11-01"), entry("2026-11-02", "B")].length >= GIFT_FROM).toBe(false);
  });

  it("reads an account's done dates from its saved dates, never a trip's", () => {
    const base = { kind: "date", title: "", city: "Lisbon", day: "2026-11-20", stopsCount: 2, cover: null, ideaId: "spa-evening", tripId: null, mine: true, owner: { name: null, initial: "?" }, lastEditedBy: null, editable: true, remind: false, version: 1, createdAt: "", updatedAt: "" } as const;
    const items: SavedDateSummary[] = [
      { ...base, id: "a", done: "2026-11-20" },
      { ...base, id: "b", done: null },
      { ...base, id: "c", kind: "trip", done: "2026-11-21" },
    ];
    expect(doneFromSaved(items, "en")).toEqual([{ id: "saved:a", day: "2026-11-20", title: "Do nothing, properly", where: "Lisbon", idea: "spa-evening", places: [], saved: "a" }]);
  });
});
