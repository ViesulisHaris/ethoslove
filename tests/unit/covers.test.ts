import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { COVER_IDS } from "@/lib/gift/schema";
import { COVER_LOOKS, defaultCoverFor, type CoverLook, type Cut } from "@/templates/_shared/covers/looks";
import { listManifests } from "@/templates/manifests";

const looks = Object.values(COVER_LOOKS);
const COLLAGE = ["lilies", "kisses", "cats", "party", "bluebell", "pressed"] as const;

/** Every photograph a look draws: on the page, fixed to the envelope, as its seal, as its bow. */
function cutsOf(look: CoverLook): Cut[] {
  const cuts: Cut[] = [];
  for (const s of look.stickers) if (s.cut) cuts.push(s.cut);
  for (const a of look.attach ?? []) cuts.push(a.cut);
  if (look.piece.kind === "envelope" && look.piece.colors.sealArt) cuts.push(look.piece.colors.sealArt.cut);
  if (look.piece.kind === "gift" && look.piece.colors.bowArt) cuts.push(look.piece.colors.bowArt.cut);
  return cuts;
}

describe("gift covers", () => {
  it("never loses an id a published gift may be stored with", () => {
    // A gift keeps the id of its cover for ever, so this list only grows.
    for (const id of ["gingham", "picnic", "polka", "birthday", "lovecore", "pearl", "garden", "mocha", "harvest", "starry", "snow", "spooky", "classic"]) {
      expect(COVER_IDS as readonly string[], id).toContain(id);
    }
    expect(new Set(COVER_IDS).size).toBe(COVER_IDS.length);
  });

  it("has a look for every cover but the classic one, and leads with the collage covers", () => {
    for (const id of COVER_IDS) {
      if (id === "classic") continue;
      expect(COVER_LOOKS[id], id).toBeDefined();
      expect(COVER_LOOKS[id].id).toBe(id);
    }
    expect(looks).toHaveLength(COVER_IDS.length - 1);
    expect(COVER_IDS.slice(0, COLLAGE.length)).toEqual([...COLLAGE]);
  });

  it("is named in both languages", () => {
    for (const locale of ["en", "es"]) {
      const names = JSON.parse(readFileSync(join(process.cwd(), "messages", `${locale}.json`), "utf8")).editor.covers.names as Record<string, string>;
      for (const id of COVER_IDS) expect(names[id], `${locale}: ${id}`).toBeTruthy();
    }
  });

  it("only draws pictures that are on disk, in their real shape", () => {
    let count = 0;
    for (const look of looks) {
      for (const cut of cutsOf(look)) {
        count += 1;
        expect(existsSync(join(process.cwd(), "public", cut.src)), `${look.id}: ${cut.src}`).toBe(true);
        expect(cut.ratio).toBeGreaterThan(0.3);
        expect(cut.ratio).toBeLessThan(4);
      }
    }
    expect(count).toBeGreaterThan(40);
  });

  it("keeps the middle of the page for the envelope, the name and the hint", () => {
    // Between 27% and 72% of the height sits the column people read and tap. Art may stand
    // beside it, never in it: its inner edge stays outside 22% to 78% of the width.
    for (const look of looks) {
      for (const s of look.stickers) {
        if (s.pin || s.y <= 27 || s.y >= 72) continue;
        const inner = s.x < 50 ? s.x + s.size / 2 : s.x - s.size / 2;
        if (s.x < 50) expect(inner, `${look.id} at ${s.x},${s.y}`).toBeLessThanOrEqual(22);
        else expect(inner, `${look.id} at ${s.x},${s.y}`).toBeGreaterThanOrEqual(78);
      }
    }
  });

  it("fixes things to the envelope within reach of it", () => {
    for (const look of looks) {
      for (const a of look.attach ?? []) {
        expect(a.x).toBeGreaterThanOrEqual(-10);
        expect(a.x).toBeLessThanOrEqual(110);
        expect(a.y).toBeGreaterThanOrEqual(-30);
        expect(a.y).toBeLessThanOrEqual(110);
        expect(a.w).toBeGreaterThan(8);
      }
    }
  });

  it("gives the collage covers something drifting past and their own paper to throw", () => {
    for (const id of COLLAGE) {
      const look = COVER_LOOKS[id];
      expect(look.confetti?.length, id).toBeGreaterThanOrEqual(4);
      expect(cutsOf(look).length, id).toBeGreaterThanOrEqual(6);
      if (id !== "party") expect(look.ambience, id).toBeDefined();
    }
  });

  it("starts every template on a cover that exists", () => {
    for (const m of listManifests()) expect(COVER_IDS as readonly string[], m.slug).toContain(defaultCoverFor(m.slug));
    expect(defaultCoverFor("party-animals")).toBe("party");
    expect(defaultCoverFor("no-such-template")).toBe("gingham");
  });
});
