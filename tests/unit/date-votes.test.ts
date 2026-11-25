import { describe, expect, it } from "vitest";
import { applyChange, likedCount, MAX_TARGETS, readKeptVotes, readVoteChanges, TARGET, voteChanges, voteTargets } from "@/lib/dates/votes";

const T = ["place:node/1", "place:way/2", "idea:golden-hour-picnic"];

describe("the counters of “Was this a good date?” (dates2)", () => {
  it("V1 a first yes is +1 yes for every target", () => {
    expect(voteChanges(T, {}, "yes")).toEqual(T.map((target) => ({ target, yes: 1, no: 0 })));
  });

  it("V2 yes then no is -1 yes and +1 no", () => {
    const kept = Object.fromEntries(T.map((t) => [t, "yes" as const]));
    expect(voteChanges(T, kept, "no")).toEqual(T.map((target) => ({ target, yes: -1, no: 1 })));
  });

  it("V3 the same answer again changes nothing", () => {
    const kept = Object.fromEntries(T.map((t) => [t, "no" as const]));
    expect(voteChanges(T, kept, "no")).toEqual([]);
  });

  it("V4 taken back is -1 on what was kept", () => {
    expect(voteChanges(T, { [T[0]]: "yes", [T[1]]: "no" }, null)).toEqual([
      { target: T[0], yes: -1, no: 0 },
      { target: T[1], yes: 0, no: -1 },
    ]);
  });

  it("V5 a counter never goes under zero", () => {
    expect(applyChange({ yes: 0, no: 0 }, { target: T[0], yes: -1, no: 1 })).toEqual({ yes: 0, no: 1 });
    expect(applyChange({ yes: 3, no: 0 }, { target: T[0], yes: 1, no: -1 })).toEqual({ yes: 4, no: 0 });
  });

  it("V6 nothing is shown before five yes votes", () => {
    for (let n = 0; n < 5; n++) expect(likedCount(n), String(n)).toBeNull();
    expect(likedCount(5)).toBe(5);
    expect(likedCount(14)).toBe(14);
  });

  it("V7 a vote's body is checked field by field", () => {
    expect(readVoteChanges({ changes: [{ target: T[0], yes: 1, no: 0 }, { target: T[2], yes: -1, no: 1 }] })).toEqual([
      { target: T[0], yes: 1, no: 0 },
      { target: T[2], yes: -1, no: 1 },
    ]);
    const bad = [
      { changes: [{ target: "place:node/x", yes: 1, no: 0 }] },
      { changes: [{ target: "user:1", yes: 1, no: 0 }] },
      { changes: Array.from({ length: 10 }, (_, i) => ({ target: `place:node/${i}`, yes: 1, no: 0 })) },
      { changes: [{ target: T[0], yes: 2, no: 0 }] },
      { changes: [{ target: T[0], yes: 1, no: 1 }] },
      { changes: [{ target: T[0], yes: 0, no: 0 }] },
      { changes: [{ target: T[0], yes: 1, no: 0 }, { target: T[0], yes: 1, no: 0 }] },
      { changes: [] },
      "yes",
      null,
      [],
    ];
    for (const body of bad) expect(readVoteChanges(body), JSON.stringify(body)).toBeNull();
  });

  it("V8 a done date is a vote on each stop once and its idea, nine at most", () => {
    expect(voteTargets({ places: ["node/1", "node/1", "way/2"], idea: "golden-hour-picnic" })).toEqual(["place:node/1", "place:way/2", "idea:golden-hour-picnic"]);
    const many = voteTargets({ places: Array.from({ length: 12 }, (_, i) => `node/${i + 1}`), idea: "spa-evening" });
    expect(many).toHaveLength(MAX_TARGETS);
    expect(many.at(-1)).toBe("idea:spa-evening");
    for (const t of many) expect(t).toMatch(TARGET);
    expect(voteTargets({ places: ["nope"], idea: "Not An Id" })).toEqual([]);
  });

  it("keeps only good answers in the browser", () => {
    expect(readKeptVotes(JSON.stringify({ "place:node/1": "yes", "place:x": "yes", "idea:spa-evening": "maybe" }))).toEqual({ "place:node/1": "yes" });
    expect(readKeptVotes("{")).toEqual({});
  });
});
