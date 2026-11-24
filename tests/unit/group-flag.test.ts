/**
 * The switch for group cards: off unless GROUP_GIFTS_ENABLED is "true" and a template in the gallery
 * was made for them. Today none was, so the variable alone turns nothing on.
 */
import { describe, expect, it } from "vitest";
import { groupGiftsEnabled } from "@/lib/group/flag";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";
import { ADVENT_CALENDAR_LIVE } from "@/templates/held";
import { manifest as letter } from "@/templates/the-letter/manifest";

const reference = { ...letter, slug: "made-for-groups", features: { ...letter.features, group: { min: 0, max: 25, noteMax: 140, photos: true } } };

describe("the group card switch", () => {
  it("is off by default", () => {
    expect(groupGiftsEnabled({})).toBe(false);
    expect(groupGiftsEnabled({ GROUP_GIFTS_ENABLED: "false" })).toBe(false);
    expect(groupGiftsEnabled({ GROUP_GIFTS_ENABLED: "1" })).toBe(false);
  });

  it("stays off with the variable set while no template in the gallery takes contributions", () => {
    const none = TEMPLATE_MANIFESTS.filter((manifest) => !manifest.features.group);
    expect(none.length).toBeGreaterThan(50);
    expect(groupGiftsEnabled({ GROUP_GIFTS_ENABLED: "true" }, none)).toBe(false);
    // The gallery itself has one exactly while the Advent Calendar is in it (src/templates/held.ts): until
    // then the variable alone turns nothing on, and from then it is the variable that decides.
    expect(groupGiftsEnabled({ GROUP_GIFTS_ENABLED: "true" })).toBe(ADVENT_CALENDAR_LIVE);
    expect(groupGiftsEnabled({ GROUP_GIFTS_ENABLED: "true" }, TEMPLATE_MANIFESTS)).toBe(ADVENT_CALENDAR_LIVE);
    expect(groupGiftsEnabled({}, TEMPLATE_MANIFESTS)).toBe(false);
  });

  it("is on once both hold, and never from a template alone", () => {
    const withOne = [...TEMPLATE_MANIFESTS, reference];
    expect(groupGiftsEnabled({ GROUP_GIFTS_ENABLED: "true" }, withOne)).toBe(true);
    expect(groupGiftsEnabled({}, withOne)).toBe(false);
  });
});
