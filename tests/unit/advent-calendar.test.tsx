/**
 * The Advent Calendar, the first template made for group cards (docs/GROUP.md).
 *
 * Four things are held here. What is behind each door, worked out the same everywhere. The contract
 * a group template keeps, on this template's own pieces: other people's words are plain text in
 * their own direction, a photo's box is its own shape, and nothing in it is a form or a link. That
 * it is in no list a visitor's page is made from while it is held back, and in all of them the
 * moment ADVENT_CALENDAR_LIVE says so. And that the words written for its page fit that page.
 */
import { existsSync, readFileSync } from "node:fs";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";
import { CONTRIBUTION_LIMITS, createGiftSchema, type GiftContribution, type GiftData } from "@/lib/gift/schema";
import { readinessProblems } from "@/lib/gift/publish";
import { planCheckout } from "@/lib/commerce/plan";
import { HATCH, RENDER_LAG_S } from "@/templates/_shared/night/sound-math";
import { edgeCase } from "@/templates/_shared/e2e/edge-cases";
import { ANCHORS, DOORS, LEAVES, NICHE, SPRITES } from "@/templates/advent-calendar/art-map";
import { DOOR_COUNT, SWEETS, doorsFor, previewDoors, progressOf, seedOf } from "@/templates/advent-calendar/doors";
import { demoData } from "@/templates/advent-calendar/demo-data";
import { fieldMeta } from "@/templates/advent-calendar/field-meta";
import { LOOKS, SWATCHES } from "@/templates/advent-calendar/looks";
import { manifest } from "@/templates/advent-calendar/manifest";
import { PAGE_IDEAS, PAGE_STEPS, PAGE_THEME } from "@/templates/advent-calendar/page-content";
import { fieldsSchema, type AdventCalendarFields } from "@/templates/advent-calendar/schema";
import { COPY, NoteCard, Opening, Template, artFor } from "@/templates/advent-calendar/Template";
import { template } from "@/templates/advent-calendar";

const SLUG = "advent-calendar";
const LOCALES = ["en", "es"] as const;
const words = (line: string) => line.trim().split(/\s+/).length;
const escaped = (text: string) => text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#x27;");
const noteDoors = (seed: number, notes: number) => doorsFor(seed, notes).filter((d) => d.kind === "note");

afterEach(() => {
  vi.doUnmock("@/templates/held");
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("what is behind the twenty-four doors", () => {
  const seed = seedOf("Nora", "Tom");

  it("is the same every time it is asked, and another house for other names", () => {
    expect(doorsFor(seed, 8)).toEqual(doorsFor(seed, 8));
    expect(doorsFor(seed, 8).map((d) => d.number)).toEqual(Array.from({ length: 24 }, (_, i) => i + 1));
    expect(noteDoors(seedOf("Nora", "Tom"), 8).map((d) => d.number)).not.toEqual(noteDoors(seedOf("Zoë", "A"), 8).map((d) => d.number));
  });

  it("gives every note a door of its own, from none to twenty-four, and never more doors than there are", () => {
    for (let n = 0; n <= 25; n++) {
      const notes = noteDoors(seed, n);
      expect(notes).toHaveLength(Math.min(n, DOOR_COUNT));
      expect(new Set(notes.map((d) => d.number)).size).toBe(notes.length);
      expect(doorsFor(seed, n)).toHaveLength(DOOR_COUNT);
    }
    expect(doorsFor(seed, 24).every((d) => d.kind === "note")).toBe(true);
    expect(doorsFor(seed, 0).every((d) => d.kind === "sweet")).toBe(true);
    expect(noteDoors(seed, -3)).toHaveLength(0);
    expect(noteDoors(seed, Number.NaN)).toHaveLength(0);
  });

  it("puts the notes in the order they were left in: the first has the lowest of the chosen numbers", () => {
    const notes = noteDoors(seed, 8);
    expect(notes.map((d) => (d.kind === "note" ? d.index : -1))).toEqual([0, 1, 2, 3, 4, 5, 6, 7]);
    expect(notes.map((d) => d.number)).toEqual([...notes.map((d) => d.number)].sort((a, b) => a - b));
  });

  it("spreads them over the house, not down its first doors", () => {
    for (const names of [["Nora", "Tom"], ["Zoë", "A"], ["Lena", "Ben"], ["Sam", "Iris"]] as const) {
      const numbers = noteDoors(seedOf(names[0], names[1]), 8).map((d) => d.number);
      expect(numbers).not.toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
      expect(Math.max(...numbers) - Math.min(...numbers), names.join()).toBeGreaterThan(8);
    }
  });

  it("a note added later opens one more door to a note and shuts none", () => {
    for (let n = 0; n < 24; n++) {
      const before = new Set(noteDoors(seed, n).map((d) => d.number));
      const after = new Set(noteDoors(seed, n + 1).map((d) => d.number));
      expect(after.size).toBe(before.size + 1);
      for (const number of before) expect(after.has(number)).toBe(true);
    }
  });

  it("puts a sweet behind every other door, every kind having its turn, never the same behind two doors running", () => {
    for (const n of [0, 3, 8, 20]) {
      const sweets = doorsFor(seed, n).flatMap((d) => (d.kind === "sweet" ? [d.sweet] : []));
      expect(sweets).toHaveLength(24 - n);
      for (const sweet of sweets) expect(SWEETS).toContain(sweet);
      for (let i = 1; i < sweets.length; i++) expect(sweets[i], `door after door, ${n} notes`).not.toBe(sweets[i - 1]);
      if (sweets.length >= SWEETS.length) expect(new Set(sweets).size).toBe(SWEETS.length);
    }
  });

  it("the editor's still frame has two or three doors open: a sealed note, a read one and a sweet where the card has them", () => {
    const none = previewDoors(doorsFor(seed, 0));
    expect(none.open).toHaveLength(2);
    expect(none.read).toEqual([]);
    const one = previewDoors(doorsFor(seed, 1));
    expect(one.open.length).toBeGreaterThanOrEqual(2);
    expect(one.read).toEqual([]);
    for (const n of [2, 3, 8, 23]) {
      const doors = doorsFor(seed, n);
      const still = previewDoors(doors);
      expect(still.open, `${n} notes`).toHaveLength(3);
      expect(new Set(still.open).size).toBe(3);
      expect(still.read).toHaveLength(1);
      expect(still.open).toContain(still.read[0]);
      expect(still.open.filter((number) => doors[number - 1].kind === "note")).toHaveLength(2);
    }
    const full = previewDoors(doorsFor(seed, 24));
    expect(full.open).toHaveLength(2);
    expect(full.read).toHaveLength(1);
  });

  it("counts how far through someone is: never done before the sender's letter has been read", () => {
    expect(progressOf(0, 0, 8)).toBeLessThan(10);
    expect(progressOf(24, 8, 8)).toBe(90);
    expect(progressOf(24, 0, 0)).toBe(90);
    expect(progressOf(12, 4, 8)).toBeGreaterThan(progressOf(11, 4, 8));
    expect(progressOf(12, 5, 8)).toBeGreaterThan(progressOf(12, 4, 8));
    expect(progressOf(99, 99, 8)).toBe(90);
  });
});

describe("the picture the doors are found in", () => {
  const anchors = ANCHORS as unknown as Record<string, { x: number; y: number }>;
  const places = DOORS as unknown as Record<string, { col: number; row: number }>;

  it("has an opening, a floor and a leaf for every door from 1 to 24, each in a place of its own", () => {
    const seen = new Set<string>();
    for (let n = 1; n <= DOOR_COUNT; n++) {
      const tl = anchors[`d${n}TL`];
      const br = anchors[`d${n}BR`];
      const floor = anchors[`d${n}C`];
      expect(tl && br && floor, `door ${n}`).toBeTruthy();
      expect(br.x).toBeGreaterThan(tl.x);
      expect(br.y).toBeGreaterThan(tl.y);
      // the floor's middle is inside the opening, near its foot
      expect(floor.x).toBeGreaterThan(tl.x);
      expect(floor.x).toBeLessThan(br.x);
      expect(floor.y).toBeGreaterThan((tl.y + br.y) / 2);
      expect(LEAVES[String(n)]?.length, `leaf ${n}`).toBeGreaterThanOrEqual(4);
      seen.add(`${places[String(n)].col},${places[String(n)].row}`);
    }
    expect(seen.size).toBe(DOOR_COUNT);
  });

  it("a door is at least 44 px to tap on a 360 px phone", () => {
    // The stage is 100 units across the phone's width; a door is tapped anywhere in its opening and half the frame round it.
    const perUnit = 360 / 100;
    for (let n = 1; n <= DOOR_COUNT; n++) {
      const w = anchors[`d${n}BR`].x - anchors[`d${n}TL`].x;
      const h = anchors[`d${n}BR`].y - anchors[`d${n}TL`].y;
      const frame = (NICHE.frame / NICHE.w) * w;
      expect((w + frame) * perUnit, `door ${n} across`).toBeGreaterThanOrEqual(44);
      expect((h + frame) * perUnit, `door ${n} down`).toBeGreaterThanOrEqual(44);
    }
    const star = anchors.starR.x - anchors.starC.x;
    expect(star * 2 * perUnit).toBeGreaterThanOrEqual(44);
  });

  it("neighbouring doors' tap areas meet and do not overlap", () => {
    const cell = (n: number) => {
      const tl = anchors[`d${n}TL`];
      const br = anchors[`d${n}BR`];
      const half = ((NICHE.frame / NICHE.w) * (br.x - tl.x)) / 2;
      return { x0: tl.x - half, x1: br.x + half, y0: tl.y - half, y1: br.y + half };
    };
    const at = (col: number, row: number) => Number(Object.keys(places).find((n) => places[n].col === col && places[n].row === row));
    for (let row = 0; row < 6; row++)
      for (let col = 0; col < 3; col++) {
        const gap = cell(at(col + 1, row)).x0 - cell(at(col, row)).x1;
        expect(Math.abs(gap), `row ${row}, between columns ${col} and ${col + 1}`).toBeLessThan(0.25);
      }
  });

  it("has a sprite for the envelope, the tag and every sweet, each smaller than a niche", () => {
    const sprites = SPRITES as unknown as Record<string, { w: number; h: number }>;
    const niche = { w: anchors.nicheBR.x - anchors.nicheTL.x, h: anchors.nicheBR.y - anchors.nicheTL.y };
    for (const name of ["envelope", "tag", ...SWEETS]) {
      expect(sprites[name], name).toBeDefined();
      expect(existsSync(`public/art/advent-calendar/${name}.webp`), name).toBe(true);
      // its picture carries its shadow, so it may be as wide as the niche, never wider or taller
      expect(sprites[name].w, `${name} across`).toBeLessThanOrEqual(niche.w + 0.2);
      expect(sprites[name].h, `${name} down`).toBeLessThan(niche.h + 0.6);
    }
    // the name is written on the tag's face, inside the tag
    expect(anchors.tagBR.x - anchors.tagTL.x).toBeGreaterThan(3);
    expect(anchors.tagTL.x).toBeGreaterThan((SPRITES as unknown as Record<string, { x: number }>).tag.x);
  });

  it("every look has both pictures of the room, for a phone and for a wide screen, and the editor's names for it", () => {
    for (const look of Object.keys(LOOKS)) {
      for (const state of ["closed", "open"]) for (const size of ["phone", "wide"]) expect(existsSync(`public/art/advent-calendar/plate-${look}-${state}-${size}.webp`), `${look} ${state} ${size}`).toBe(true);
      expect(SWATCHES[look as keyof typeof SWATCHES]).toBeDefined();
      for (const locale of LOCALES) expect(fieldMeta[locale].look.options?.[look], `${locale} ${look}`).toBeTruthy();
    }
    expect(Object.keys(LOOKS)).toEqual(fieldsSchema.shape.look.unwrap().options);
    for (const url of artFor("nordic")) expect(existsSync(`public${url}`), url).toBe(true);
    for (const piece of ["top", "mid", "bottom"]) expect(existsSync(`public/art/advent-calendar/sheet-letter-${piece}.webp`)).toBe(true);
  });
});

describe("the door's sound and its swing are one thing", () => {
  it("the hinge is heard inside the swing, and the leaf taps to a stop as the swing ends", () => {
    expect(HATCH.creakAt + HATCH.creak).toBeLessThanOrEqual(HATCH.swing);
    expect(HATCH.creakAt).toBeGreaterThan(0);
    // what the door is drawn by is what the sound is timed by
    const source = readFileSync("src/templates/advent-calendar/Template.tsx", "utf8");
    expect(source).toContain("const SWING_S = HATCH.swing;");
    expect(source).toContain("animation:ac-swing ${SWING_S}s");
    expect(readFileSync("src/templates/_shared/night/sfx.ts", "utf8")).toContain("t + RENDER_LAG_S + HATCH.swing");
    expect(RENDER_LAG_S).toBeLessThan(0.1);
  });

  it("every door, note and sweet is played quietly, because they repeat", () => {
    const source = readFileSync("src/templates/advent-calendar/Template.tsx", "utf8");
    const levels = [...source.matchAll(/play(?:Hatch|Envelope|Ting)\(mutedRef\.current(?:, step)?, (0\.\d+)\)/g)].map((m) => Number(m[1]));
    expect(levels).toHaveLength(3);
    for (const level of levels) {
      expect(level).toBeGreaterThanOrEqual(0.3);
      expect(level).toBeLessThanOrEqual(0.35);
    }
  });
});

describe("the template's own files", () => {
  it("declares a group card of three to twenty-four notes of 140, with photos, and is premium", () => {
    expect(manifest.slug).toBe(SLUG);
    expect(manifest.tier).toBe("premium");
    expect(manifest.features.group).toEqual({ min: 3, max: 24, noteMax: 140, photos: true });
    expect(manifest.features.group!.max).toBe(DOOR_COUNT);
    expect(manifest.features.group!.max).toBeLessThanOrEqual(CONTRIBUTION_LIMITS.max);
    expect(manifest.features.group!.noteMax).toBeLessThanOrEqual(CONTRIBUTION_LIMITS.note);
    expect(manifest.occasions[0]).toBe("christmas");
    expect(manifest.occasions.length).toBeLessThanOrEqual(2);
    expect(template.manifest).toBe(manifest);
    expect(template.opening).toBe(Opening);
    expect(fieldsSchema.parse({})).toEqual({ look: "evergreen" });
  });

  it("its poster and its preview film are where the manifest says", () => {
    expect(existsSync(`public${manifest.thumbnail.poster}`)).toBe(true);
    expect(existsSync(`public${manifest.thumbnail.webm}`)).toBe(true);
  });

  it("says nothing of itself that its features do not bear out", () => {
    for (const locale of LOCALES) {
      const text = `${manifest.tagline[locale]} ${manifest.description[locale]}`;
      expect(text).toMatch(locale === "en" ? /twenty-four/ : /veinticuatro/);
      expect(text).not.toMatch(/!|—/);
    }
    // what the description names as sweets are sweets the house holds
    expect(SWEETS).toEqual(expect.arrayContaining(["gingerbread", "cane", "bell"]));
    expect(manifest.features.music && manifest.features.photos.max > 0).toBe(true);
  });

  for (const locale of LOCALES) {
    const data = demoData[locale];
    const notes = data.contributions ?? [];

    it(`${locale}: eight notes, two with a photo, one of the full 140 and one signed with the full 24`, () => {
      expect(notes).toHaveLength(8);
      expect(notes.filter((item) => item.photo)).toHaveLength(2);
      expect(Math.max(...notes.map((item) => Array.from(item.note).length))).toBe(140);
      expect(Math.max(...notes.map((item) => Array.from(item.name).length))).toBe(24);
      expect(new Set(notes.map((item) => item.key)).size).toBe(8);
    });

    it(`${locale}: is a gift its own schema takes and that is ready to send`, () => {
      expect(createGiftSchema(fieldsSchema).safeParse(data).success).toBe(true);
      // (its own photos are the demo's sample files, which no real gift may point at: a sent card's are uploads)
      expect(readinessProblems(manifest, { ...data, photos: [] } as GiftData, fieldsSchema)).toEqual([]);
      expect(readinessProblems(manifest, data as GiftData, fieldsSchema)).toEqual(["uploadsPending"]);
      expect(data.photos.length).toBeLessThanOrEqual(manifest.features.photos.max);
    });

    it(`${locale}: cannot be sent with two notes, or with a note longer than a card`, () => {
      const two = { ...data, photos: [], contributions: notes.slice(0, 2) } as GiftData;
      expect(readinessProblems(manifest, two, fieldsSchema)).toContain("contributionsMin");
      const long = { ...data, photos: [], contributions: [{ ...notes[0], note: "m".repeat(141) }, ...notes.slice(1)] } as GiftData;
      expect(readinessProblems(manifest, long, fieldsSchema)).toContain("contributionNote");
    });
  }

  it("the test cases a sweep plays hold what a real card can: three plain notes, twenty-four at their limits", () => {
    const min = edgeCase(template as never, "en", "min")!;
    expect(min.contributions).toHaveLength(3);
    expect(min.contributions!.every((item) => !item.photo)).toBe(true);
    const max = edgeCase(template as never, "en", "max")!;
    expect(max.contributions).toHaveLength(24);
    expect(max.contributions!.every((item) => item.photo)).toBe(true);
    expect(Math.max(...max.contributions!.map((item) => Array.from(item.note).length))).toBe(140);
    expect(Math.max(...max.contributions!.map((item) => Array.from(item.name).length))).toBe(24);
    expect(new Set(max.contributions!.map((item) => item.key)).size).toBe(24);
    for (const data of [min, max]) expect(createGiftSchema(fieldsSchema).safeParse({ ...data, recipientName: "Nora", senderName: "Tom", title: "", message: "" }).success).toBe(true);
    expect(edgeCase(template as never, "es", "notes-8")!.contributions).toHaveLength(8);
    expect(edgeCase(template as never, "en", "notes-24-plain")!.contributions!.some((item) => item.photo)).toBe(false);
    expect((edgeCase(template as never, "en", "notes-3-long-look-2")!.fields as AdventCalendarFields).look).toBe("midnight");
    expect(edgeCase(template as never, "en", "notes-26")).toBeNull();
    expect(edgeCase(template as never, "en", "notes-3-look-9")).toBeNull();
  });
});

describe("the contract a group template keeps", () => {
  const card = (note: GiftContribution, locale: "en" | "es" = "en") => renderToStaticMarkup(<NoteCard lookId="evergreen" s={COPY[locale]} note={note} door={6} from={{ x: 0, y: 0 }} seed={1} found={2} total={8} reduce low={false} onClose={() => {}} />);
  const still = (data: GiftData<AdventCalendarFields>) => renderToStaticMarkup(<Template data={data} mode="preview" />);

  for (const locale of LOCALES) {
    it(`${locale}: a note's card holds its words and its name whole, and nothing else of anyone's`, () => {
      for (const note of demoData[locale].contributions ?? []) {
        const html = card(note, locale);
        expect(html).toContain(`>${escaped(note.note)}</blockquote>`);
        expect(html).toContain(`>${escaped(note.name)}</p>`);
        expect(html.match(/<img [^>]*\/demo\/photos\//g)?.length ?? 0).toBe(note.photo ? 1 : 0);
      }
    });
  }

  it("a name and a note each start from the side their own script starts from, with nothing else in their element", () => {
    const html = card({ key: "rtl0000001", name: "عبد الرحمن", note: "كل عام وأنتِ بخير." });
    expect(html).toMatch(/<blockquote[^>]* dir="auto"[^>]*>كل عام وأنتِ بخير\.<\/blockquote>/);
    expect(html).toMatch(/<p[^>]* dir="auto"[^>]*>عبد الرحمن<\/p>/);
    // both wrap anywhere: a word longer than the card stays on the card
    expect(html.match(/overflow-wrap:anywhere/g)?.length).toBeGreaterThanOrEqual(2);
  });

  it("their words are plain text: no markup, no rich text, no link", () => {
    const hostile = { key: "hostile001", name: "<b>Mallory</b>", note: '<img src=x onerror="alert(1)"> **bold** *em* https://evil.example [x](https://evil.example)' };
    const html = card(hostile);
    expect(html).not.toContain("<b>Mallory</b>");
    expect(html).toContain("&lt;b&gt;Mallory&lt;/b&gt;");
    expect(html).not.toContain("<img src=x");
    expect(html).not.toContain('onerror="alert');
    // The sender's own letter is rich text; a note is not: its asterisks stay asterisks.
    expect(html).toContain("**bold** *em*");
    expect(html).not.toMatch(/<a /);
    expect(html).not.toMatch(/<form|<input|<textarea/);
    // and on the tag a read note leaves in its niche
    const tagged = still({ ...demoData.en, contributions: [hostile, { ...hostile, key: "hostile002" }, { ...hostile, key: "hostile003" }] });
    expect(tagged).toContain("&lt;b&gt;Mallory&lt;/b&gt;");
    expect(tagged).not.toContain("<b>Mallory</b>");
    expect(tagged).toMatch(/<span dir="auto" data-tag-name="true"[^>]*>&lt;b&gt;Mallory&lt;\/b&gt;<\/span>/);
  });

  it("the source never parses a note or a name as rich text or sets it as HTML", () => {
    const source = readFileSync("src/templates/advent-calendar/Template.tsx", "utf8");
    expect(source).not.toMatch(/parseRichText|dangerouslySetInnerHTML|<a\s/);
    expect(source).not.toMatch(/<form|<input|<textarea/);
  });

  it("a photo's box is its own shape before the photo has come, and it is fetched when it is wanted", () => {
    const wide = card({ key: "photo00001", name: "Sam", note: "Look.", photo: { url: "/demo/photos/p4.webp", width: 1200, height: 896 } });
    expect(wide).toMatch(/<img [^>]*src="\/demo\/photos\/p4\.webp"[^>]*width="1200"[^>]*height="896"/);
    expect(wide).toMatch(/loading="lazy"/);
    expect(wide).toMatch(/aspect-ratio:1\.33/);
    // a photo taller or wider than a card can hold keeps a box the card can: never a jump, never off the screen
    const tall = card({ key: "photo00002", name: "Sam", note: "Look.", photo: { url: "/demo/photos/p1.webp", width: 400, height: 4000 } });
    expect(tall).toMatch(/aspect-ratio:0\.8/);
    expect(card({ key: "photo00003", name: "Sam", note: "Look." })).not.toMatch(/<img [^>]*\/demo\//);
  });

  it("the editor's still frame stands as the list changes under it, from none to more than a house holds", () => {
    const one = (demoData.en.contributions ?? [])[0];
    for (const count of [0, 1, 2, 3, 8, 24, 25]) {
      const contributions = Array.from({ length: count }, (_, i) => ({ ...one, key: `count${String(i).padStart(5, "0")}`, name: `Name ${i + 1}` }));
      const html = still({ ...demoData.en, contributions: count ? contributions : undefined });
      // no button in the still frame: it is something to look at
      expect(html, `${count} notes`).not.toMatch(/<button/);
      expect(html.match(/data-niche=/g)?.length, `${count} notes`).toBeGreaterThanOrEqual(2);
      expect(html.match(/data-niche=/g)?.length).toBeLessThanOrEqual(3);
      if (count >= 2) expect(html).toMatch(/data-holds="tag"/);
      if (count >= 1 && count < 24) expect(html).toMatch(/data-holds="envelope"/);
      expect(html).not.toMatch(/undefined|NaN|\[object Object\]/);
    }
    expect(still({ ...demoData.en, fields: { look: "no-such-look" } as unknown as AdventCalendarFields })).toContain("plate-evergreen-closed");
    expect(still({ ...demoData.en, fields: {} as AdventCalendarFields })).toContain("plate-evergreen-closed");
  });

  it("a name set inside a sentence of the template's own is kept to itself when it runs right to left", () => {
    const html = still({ ...demoData.en, senderName: "عبد", recipientName: "נועה", title: "" });
    expect(html).toContain("for ⁨נועה⁩ · from ⁨عبد⁩ and 8 more");
    // a name in Latin letters is left exactly as it was
    expect(still(demoData.en)).toContain("for Nora · from Tom and 8 more");
  });

  it("no line of its own would be mistaken by the sweep for a way out, or pressed as a way on when it is one back", () => {
    for (const locale of LOCALES) {
      expect(COPY[locale].putBack).toMatch(/back|volver/i);
      expect(COPY[locale].backToDoors).toMatch(/back|volver/i);
      expect(COPY[locale].openDoor).toMatch(/open|abr/i);
      expect(COPY[locale].readNote).toMatch(/read|leer/i);
      for (const line of Object.values(COPY[locale]).flatMap((v) => (typeof v === "string" ? [v] : Object.values(v)))) expect(line, line).not.toMatch(/!|—/);
    }
    expect(Object.keys(COPY.es)).toEqual(Object.keys(COPY.en));
  });
});

describe("held back until group cards are on sale", () => {
  const ctx = { signedIn: true, ownedForever: [], purchases: [], creatorCode: null, giftCardsOnSale: false };

  async function found(nodeEnv: string, live: boolean) {
    vi.stubEnv("NODE_ENV", nodeEnv);
    vi.resetModules();
    vi.doMock("@/templates/held", () => ({ ADVENT_CALENDAR_LIVE: live }));
    const manifests = await import("@/templates/manifests");
    const registry = await import("@/templates/registry");
    const schemas = await import("@/templates/schemas");
    const flag = await import("@/lib/group/flag");
    const seo = await import("@/content/template-seo");
    const dates = await import("@/content/page-dates");
    const sitemap = (await import("@/app/sitemap")).default;
    return {
      manifest: manifests.getManifest(SLUG),
      isSlug: manifests.isTemplateSlug(SLUG),
      lists: [manifests.TEMPLATE_SLUGS, manifests.TEMPLATE_MANIFESTS.map((m) => m.slug), registry.LOADER_SLUGS, schemas.SCHEMA_SLUGS, manifests.listManifests().map((m) => m.slug), manifests.listManifests({ occasion: "christmas" }).map((m) => m.slug)],
      agree: [[...manifests.TEMPLATE_SLUGS].sort(), [...registry.LOADER_SLUGS].sort(), [...schemas.SCHEMA_SLUGS].sort()],
      template: await registry.loadTemplate(SLUG),
      schema: await schemas.loadFieldsSchema(SLUG),
      groupOn: flag.groupGiftsEnabled({ GROUP_GIFTS_ENABLED: "true" }, manifests.TEMPLATE_MANIFESTS),
      seo: seo.templateSeo(SLUG, "en"),
      seoEs: seo.templateSeo(SLUG, "es"),
      date: dates.PAGE_UPDATED[`/templates/${SLUG}`],
      inSitemap: sitemap().some((page) => page.url.includes(`/templates/${SLUG}`)),
    };
  }

  it("the switch itself is off", async () => {
    expect((await vi.importActual<typeof import("@/templates/held")>("@/templates/held")).ADVENT_CALENDAR_LIVE).toBe(false);
  });

  it("held, a production build has no trace of it: no list, no page, no search entry, and group cards cannot be turned on", async () => {
    const it = await found("production", false);
    expect(it.manifest).toBeNull();
    expect(it.template).toBeNull();
    expect(it.schema).toBeNull();
    expect(it.isSlug).toBe(false);
    for (const list of it.lists) expect(list).not.toContain(SLUG);
    expect(it.groupOn).toBe(false);
    expect(it.seo).toBeNull();
    expect(it.date).toBeUndefined();
    expect(it.inSitemap).toBe(false);
  }, 30_000);

  it("held, it is found by its slug under `next dev`, and is still in no list", async () => {
    const it = await found("development", false);
    expect(it.manifest?.slug).toBe(SLUG);
    expect(it.template?.manifest.slug).toBe(SLUG);
    expect(it.schema).not.toBeNull();
    expect(it.isSlug).toBe(false);
    for (const list of it.lists) expect(list).not.toContain(SLUG);
    expect(it.groupOn).toBe(false);
    expect(it.inSitemap).toBe(false);
  }, 30_000);

  it("held, checkout refuses it: nobody can be sold it", () => {
    expect(planCheckout({ product: "single", templateSlugs: [SLUG], currency: "eur" }, ctx)).toMatchObject({ ok: false });
    expect(planCheckout({ product: "group", templateSlugs: [SLUG], currency: "eur" } as never, ctx)).toMatchObject({ ok: false });
  });

  it("live, one switch puts it in every list at once, with its page, its search entry and its date, and lets group cards be turned on", async () => {
    const it = await found("production", true);
    expect(it.manifest?.slug).toBe(SLUG);
    expect(it.template?.manifest.slug).toBe(SLUG);
    expect(it.schema).not.toBeNull();
    expect(it.isSlug).toBe(true);
    for (const list of it.lists) expect(list).toContain(SLUG);
    expect(it.agree[1]).toEqual(it.agree[0]);
    expect(it.agree[2]).toEqual(it.agree[0]);
    expect(it.groupOn).toBe(true);
    expect(it.date).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(it.inSitemap).toBe(true);
    for (const entry of [it.seo, it.seoEs]) {
      expect(entry).not.toBeNull();
      expect(entry!.title.length).toBeLessThanOrEqual(60);
      expect(entry!.description.length).toBeLessThanOrEqual(170);
      expect(`${entry!.title} ${entry!.description}`).not.toMatch(/digital gift card|!|—/i);
    }
  }, 30_000);
});

describe("the words waiting for its page", () => {
  const lum = (hex: string) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const contrast = (a: string, b: string) => (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);

  it("a palette that reads: every pair of type and ground at WCAG AA", () => {
    const t = PAGE_THEME;
    for (const ground of [t.ground, t.raised, t.band]) {
      expect(contrast(t.ink, ground)).toBeGreaterThanOrEqual(7);
      expect(contrast(t.body, ground)).toBeGreaterThanOrEqual(4.5);
      expect(contrast(t.accent, ground)).toBeGreaterThanOrEqual(4.5);
    }
    expect(contrast("#fffaf5", t.accent)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.ink, t.badge)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(t.footerText, t.footer)).toBeGreaterThanOrEqual(4.5);
  });

  it("three steps of two to four words (five in Spanish), a line of at most twelve, and the last is sending it", () => {
    expect(words(PAGE_STEPS.line.en)).toBeLessThanOrEqual(12);
    expect(words(PAGE_STEPS.line.es)).toBeLessThanOrEqual(12);
    expect(PAGE_STEPS.steps).toHaveLength(3);
    for (const step of PAGE_STEPS.steps) {
      expect(words(step.en)).toBeGreaterThanOrEqual(2);
      expect(words(step.en)).toBeLessThanOrEqual(4);
      expect(words(step.es)).toBeLessThanOrEqual(5);
    }
    expect(PAGE_STEPS.steps[2].picture).toBe("phone");
    for (const sample of Object.values(PAGE_STEPS.steps[0].sample)) expect(sample.length).toBeLessThanOrEqual(30);
  });

  it("six idea cards in each language: a title of six words, one line of sixteen, and a line that fits the field it is for", () => {
    const limits = { title: 80, message: 4000, caption: 140, "countdown.label": 80 } as const;
    for (const locale of LOCALES) {
      const { items } = PAGE_IDEAS[locale];
      expect(items).toHaveLength(6);
      expect(new Set(items.map((item) => item.heading)).size).toBe(6);
      for (const item of items) {
        expect(words(item.heading), item.heading).toBeLessThanOrEqual(6);
        expect(words(item.how), item.how).toBeLessThanOrEqual(16);
        expect(item.borrow.line.length, item.borrow.line).toBeLessThanOrEqual(limits[item.borrow.field]);
        expect(`${item.heading} ${item.how} ${item.borrow.line}`).not.toMatch(/!|—|perfect for|unforgettable|elevate|whether you/i);
      }
    }
    expect(PAGE_IDEAS.es.items.map((item) => item.borrow.field)).toEqual(PAGE_IDEAS.en.items.map((item) => item.borrow.field));
  });

  it("claims only what the template does", () => {
    const all = JSON.stringify(PAGE_IDEAS);
    // "up to twenty-four", "140 characters", a countdown, a caption: each is the manifest's own
    expect(all).toContain("twenty-four");
    expect(manifest.features.group!.max).toBe(24);
    expect(all).toContain("140");
    expect(manifest.features.group!.noteMax).toBe(140);
    expect(manifest.features.countdown).toBe(true);
    expect(manifest.features.captions).toBe(true);
    expect(manifest.features.group!.photos).toBe(true);
  });
});
