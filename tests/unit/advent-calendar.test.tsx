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
import { INK, LOOKS, SWATCHES } from "@/templates/advent-calendar/looks";
import { manifest } from "@/templates/advent-calendar/manifest";
import { PAGE_IDEAS, PAGE_STEPS, PAGE_THEME } from "@/templates/advent-calendar/page-content";
import { fieldsSchema, type AdventCalendarFields } from "@/templates/advent-calendar/schema";
import { COPY, LOW_UNITS, NoteCard, Opening, TAG_SMALLEST, Template, VEIL_WAIT_MS, artFor, fitTag, isShortName, settleMs } from "@/templates/advent-calendar/Template";
import { keep, keptKey, recall } from "@/templates/advent-calendar/kept";
import { soldAsGroup } from "@/lib/gift/free-tier";
import { templateProductNode } from "@/lib/seo";
import { PRODUCTS } from "@/lib/pricing/products";
import { GROUP_WORDS } from "@/i18n/client-namespaces";
import { template } from "@/templates/advent-calendar";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";
import { fillerIn } from "./filler";

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

  it("a note added later takes its place in the order: everyone whose door is above the new one moves up to the next", () => {
    // Said plainly, because it was once said that a later note "moves nobody". It shuts no door (above); it does move names.
    let moved = 0;
    for (let n = 1; n < 24; n++) {
      const before = noteDoors(seed, n).map((d) => d.number);
      const after = noteDoors(seed, n + 1).map((d) => d.number);
      const added = after.find((number) => !before.includes(number))!;
      // the people before it keep their doors; each one after it has the next chosen door up
      for (let i = 0; i < n; i++) expect(after[before[i] < added ? i : i + 1], `${n} notes, person ${i}`).toBe(before[i]);
      if (before.some((number) => number > added)) moved++;
    }
    expect(moved).toBeGreaterThan(10);
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

describe("where the pictures come from", () => {
  it("the map names the scene it was packed from, and the scene is there", () => {
    const head = readFileSync("src/templates/advent-calendar/art-map.ts", "utf8").split("\n")[0];
    const script = /scripts\/art\/holiday\/[a-z_]+\.py/.exec(head)?.[0];
    expect(script).toBe("scripts/art/holiday/advent.py");
    expect(existsSync(script!)).toBe(true);
  });

  it("the numerals' font is in the repo with its licence, and is the first the scene looks for after one named by hand", () => {
    expect(existsSync("scripts/art/holiday/fonts/LibreBaskerville-Bold.ttf")).toBe(true);
    expect(readFileSync("scripts/art/holiday/fonts/OFL.txt", "utf8")).toMatch(/SIL OPEN FONT LICENSE Version 1\.1/);
    const scene = readFileSync("scripts/art/holiday/advent.py", "utf8");
    const fonts = /^FONTS = \[(.+)\]$/m.exec(scene)?.[1] ?? "";
    expect(fonts.indexOf("ADVENT_FONT")).toBeGreaterThanOrEqual(0);
    expect(fonts.indexOf('"fonts", "LibreBaskerville-Bold.ttf"')).toBeGreaterThan(fonts.indexOf("ADVENT_FONT"));
    expect(fonts.indexOf('"fonts", "LibreBaskerville-Bold.ttf"')).toBeLessThan(fonts.indexOf("georgiab"));
    expect(fonts).not.toMatch(/Windows\/Fonts\/LibreBaskerville/);
  });

  it("every look lines its niches with a deep, quiet colour: open, they are most of the house", () => {
    // The pale look's lining was a bright tomato and turned "white and sage" red (the check of 22 Nov 2026).
    const scene = readFileSync("scripts/art/holiday/advent.py", "utf8");
    const linings = [...scene.matchAll(/^    "(\w+)": dict\(.*lining="(#[0-9a-f]{6})"/gm)].map((m) => [m[1], m[2]] as const);
    expect(linings.map(([look]) => look).sort()).toEqual(Object.keys(LOOKS).sort());
    for (const [look, hex] of linings) {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
      const max = Math.max(r, g, b);
      // value under a half: nothing brighter than the doors' own paint
      expect(max, `${look} ${hex}`).toBeLessThan(0.5);
    }
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
    // The star window holds the letter and the photos. The song is not in it: it starts at the first tap anywhere (begin() in Template.tsx).
    expect(manifest.description.en).toMatch(/is yours: your letter and your photos\. Your song starts at the first tap\./);
    expect(manifest.description.es).toMatch(/es la tuya: tu carta y tus fotos\. Tu canción empieza con el primer toque\./);
    expect(readFileSync("src/templates/advent-calendar/Template.tsx", "utf8")).toMatch(/const begin = \(\) => \{[^}]*void audio\.start\(\);/);
    // people sign the card, not the house; a name is written by hand; a tree's ball is not a fortune-teller's
    expect(manifest.description.es).toContain("firman la tarjeta desde un mismo enlace");
    expect(manifest.description.es).toContain("su nombre escrito a mano");
    expect(COPY.es.sweets.bauble).toBe("una bola de Navidad");
    expect(COPY.en.sweets.starcookie).toBe("a star cookie");
  });

  it("no line of the held template is filler: its manifest, its own lines and its page's are read here, since the site's copy test cannot see them yet", () => {
    // tests/unit/site-copy.test.ts reads listManifests(), which does not return a template that is held back.
    const strings = (value: unknown): string[] => (typeof value === "string" ? [value] : value && typeof value === "object" ? Object.values(value).flatMap(strings) : []);
    for (const locale of LOCALES) {
      const lines = [manifest.name[locale], manifest.tagline[locale], manifest.description[locale], ...strings(COPY[locale]), ...strings(PAGE_IDEAS[locale]), PAGE_STEPS.line[locale], ...PAGE_STEPS.steps.map((step) => step[locale]), ...strings(fieldMeta[locale]), demoData[locale].message, ...(demoData[locale].contributions ?? []).map((item) => item.note)];
      expect(lines.length).toBeGreaterThan(60);
      for (const line of lines) {
        expect(fillerIn(line, locale), line).toEqual([]);
        expect(line, line).not.toMatch(/—| – |perfect for|perfecto para|digital gift card/i);
        expect(line, line).not.toMatch(/\b(spain|españa|spanish|madrid|barcelona|sevilla|valencia|málaga|bilbao|mallorca|ibiza)\b/i);
      }
    }
  });

  it("stands among the newest gifts in a list, not ahead of every one of them", () => {
    // 8 was below every other template's: the day the switch went on, a card that needs three other people led every list.
    expect(manifest.sortOrder).toBe(Math.min(...TEMPLATE_MANIFESTS.map((m) => m.sortOrder)));
    expect(TEMPLATE_MANIFESTS.filter((m) => m.sortOrder === manifest.sortOrder).length).toBeGreaterThan(5);
  });

  for (const locale of LOCALES) {
    const data = demoData[locale];
    const notes = data.contributions ?? [];

    it(`${locale}: eight notes, two with a photo, one of the full 140, and no name longer than a tag shows whole`, () => {
      expect(notes).toHaveLength(8);
      expect(notes.filter((item) => item.photo)).toHaveLength(2);
      expect(Math.max(...notes.map((item) => Array.from(item.note).length))).toBe(140);
      // The showcase is not where the limits are tried (that is `notes-<n>-long`): a name of the full 24 was 7 px on its tag.
      const longest = Math.max(...notes.map((item) => Array.from(item.name).length));
      expect(longest).toBeLessThanOrEqual(12);
      // and one of them is signed for more than one person, on two lines of a tag
      expect(longest).toBeGreaterThanOrEqual(9);
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
  const card = (note: GiftContribution, locale: "en" | "es" = "en") => renderToStaticMarkup(<NoteCard lookId="evergreen" s={COPY[locale]} note={note} door={6} from={{ x: 0, y: 0 }} seed={1} read={2} total={8} reduce low={false} onClose={() => {}} />);
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
    // A photo from a phone held upright is printed whole: the print is the photo's shape, and what bounds it is its height
    // (a third of the screen), so a tall photo is a narrower print. It used to be cut to 4 by 5 and then to that height.
    const upright = card({ key: "photo00004", name: "Sam", note: "Look.", photo: { url: "/demo/photos/p3.webp", width: 896, height: 1200 } });
    expect(upright).toMatch(/aspect-ratio:0\.746/);
    expect(upright).toMatch(/width:min\(86%, calc\(32cqh \* 0\.7467 \+ 3\.8\*var\(--n\)\)\)/);
    expect(upright).not.toMatch(/max-height/);
    const phone = card({ key: "photo00005", name: "Sam", note: "Look.", photo: { url: "/demo/photos/p3.webp", width: 1080, height: 1920 } });
    expect(phone).toMatch(/aspect-ratio:0\.5625/);
    // past a phone's own shape either way it keeps a box the card can hold: never a jump, never off the screen
    const tall = card({ key: "photo00002", name: "Sam", note: "Look.", photo: { url: "/demo/photos/p1.webp", width: 400, height: 4000 } });
    expect(tall).toMatch(/aspect-ratio:0\.5625/);
    const long = card({ key: "photo00006", name: "Sam", note: "Look.", photo: { url: "/demo/photos/p1.webp", width: 4000, height: 400 } });
    expect(long).toMatch(/aspect-ratio:2[;"]/);
    expect(card({ key: "photo00003", name: "Sam", note: "Look." })).not.toMatch(/<img [^>]*\/demo\//);
  });

  it("the line under a note in hand counts notes read, this one among them, and says how to put it back", () => {
    // It said "8 of 8 notes" under the first note anyone read: the number of envelopes in sight, which is nothing about this note.
    const one = (demoData.en.contributions ?? [])[0];
    expect(card(one)).toContain(">2 of 8 notes read · tap to put it back</p>");
    expect(card(one, "es")).toContain(">2 de 8 notas leídas · toca para guardarla</p>");
    const source = readFileSync("src/templates/advent-calendar/Template.tsx", "utf8");
    expect(source).toContain("read={readCount + (readKeys.includes(inHand.key) ? 0 : 1)}");
  });

  it("the small label on a card reads: its ink is 4.5 to 1 on the card's stock", () => {
    const lum = (hex: string) => {
      const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
      return 0.2126 * r + 0.7152 * g + 0.0722 * b;
    };
    // the stock at its darkest, where the light falls off towards a corner
    for (const paper of ["#efe9dc", "#e4dccb"]) expect((lum(paper) + 0.05) / (lum(INK.soft) + 0.05), paper).toBeGreaterThanOrEqual(4.5);
  });

  it("a name on a tag is never written smaller than reads, and one too long for two lines ends in an ellipsis", () => {
    // 2.6 stage units are 10 px on a phone 390 wide. "Auntie Jo" was 9.4 px there and a name of 24 characters 7.4 px on three lines.
    expect(TAG_SMALLEST * 3.9).toBeGreaterThanOrEqual(10);
    const one = (demoData.en.contributions ?? [])[0];
    for (const name of ["Jo", "Gran", "Auntie Jo", "Grandma and Grandpa", "W".repeat(24), "عبد الرحمن بن عبد الله"]) {
      const html = still({ ...demoData.en, contributions: Array.from({ length: 3 }, (_, i) => ({ ...one, key: `tag${String(i).padStart(7, "0")}`, name })) });
      const tag = /<span dir="auto" data-tag-name="true" class="([^"]*)" style="([^"]*)"/.exec(html);
      expect(tag, name).not.toBeNull();
      const size = Number(/font-size:max\(8\.5px, calc\(([\d.]+)\*var\(--k\)\)\)/.exec(tag![2])?.[1]);
      expect(size, name).toBeGreaterThanOrEqual(TAG_SMALLEST);
      // before it has been measured (this is the server's HTML) it is cut to two lines, never three
      expect(tag![1], name).toContain("line-clamp-2");
      expect(tag![1], name).not.toContain("line-clamp-3");
    }
  });

  it("a name is written as large as leaves every word whole: one line of a large hand, two of a small one, a word broken only when no size holds it", () => {
    // Widths in ems as the handwriting face draws them (measured in the browser at 390 px: "Okonkwos" is 8.47 stage units at 2.6).
    const em = { Mum: 1.642, Gran: 1.6, Auntie: 2.154, Jo: 0.75, The: 1.2, Okonkwos: 3.258, Grandma: 3.081, Charlotte: 3.242, Christopher: 4.023 } as const;
    const space = 0.25;
    // a tag's face behind a door of the right-hand column, where the open leaf leaves least of it, and behind one of the others
    const faces = [{ w: 8.35, h: 5.98 }, { w: 8.79, h: 6 }];
    const fit = (words: (keyof typeof em)[], face: (typeof faces)[number]) => fitTag(words.map((word) => em[word]), words.map((word) => word.length), space, face);
    for (const face of faces) {
      // a short name: one line, large
      expect(fit(["Mum"], face)).toEqual({ size: 3.9, track: 0, whole: true });
      expect(fit(["Gran"], face)).toEqual({ size: 3.9, track: 0, whole: true });
      // two words that do not share a line at any size: two lines of a size two lines fit in, each word whole
      expect(fit(["Auntie", "Jo"], face)).toEqual({ size: 2.8, track: 0, whole: true });
      // A word of seven to nine letters is as wide as the face at the smallest size. It used to be broken ("Grandm / a") or
      // written at 7 px; it is whole, at the smallest size that reads, its letters a hair closer.
      for (const word of ["Grandma", "Okonkwos", "Charlotte"] as const) expect(fit([word], face), word).toEqual({ size: TAG_SMALLEST, track: -0.04, whole: true });
      expect(fit(["The", "Okonkwos"], face)).toEqual({ size: TAG_SMALLEST, track: -0.04, whole: true });
      // a word no tag can hold is written at the smallest size and broken, never smaller
      expect(fit(["Christopher"], face)).toEqual({ size: TAG_SMALLEST, track: 0, whole: false });
      // whatever the name, never under the smallest size, and never more than two lines' worth claimed whole
      for (const words of [["Mum"], ["Auntie", "Jo"], ["The", "Okonkwos"], ["Christopher"], ["Charlotte", "Grandma", "Okonkwos"]] as (keyof typeof em)[][]) expect(fit(words, face).size).toBeGreaterThanOrEqual(TAG_SMALLEST);
      expect(fit(["Charlotte", "Grandma", "Okonkwos"], face).whole).toBe(false);
    }
    // A phone on its side draws the house small, and no writing under 8.5 px: there a stage unit is about 2.7 px, so the
    // smallest sizes are drawn at 3.2 units and take that much room. A short name and two short words are still whole; a
    // long word no longer is, and is cut rather than written too small to read.
    const side = (words: (keyof typeof em)[]) => fitTag(words.map((word) => em[word]), words.map((word) => word.length), space, faces[1], 8.5 / 2.67);
    expect(side(["Mum"])).toEqual({ size: 3.9, track: 0, whole: true });
    expect(side(["Auntie", "Jo"])).toEqual({ size: 2.8, track: 0, whole: true });
    expect(side(["The", "Okonkwos"]).whole).toBe(false);
  });

  it("the line at the foot says an envelope can be opened while one is in sight and none has been, and never calls unread notes done", () => {
    const one = (demoData.en.contributions ?? [])[0];
    // the still frame of a card with one note: its envelope in sight, nothing read
    const sealed = still({ ...demoData.en, contributions: [one] });
    expect(sealed).toContain(">tap an envelope to read it</p>");
    expect(still({ ...demoData.es, contributions: [one] })).toContain(">toca un sobre para leerlo</p>");
    // with a note read (the still frame of eight shows one as a tag) the line is not needed any more
    expect(still(demoData.en)).not.toContain("tap an envelope to read it");
    expect(still(demoData.en)).toContain(">2 of 8 notes found · 21 doors left</p>");
    // every door open: what is counted is what has been read
    for (const locale of LOCALES) {
      expect(COPY[locale].read).toMatch(locale === "en" ? /^\{read\} of \{total\} notes read$/ : /^\{read\} de \{total\} notas leídas$/);
      expect(COPY[locale].envelopeHint).toMatch(/envelope|sobre/);
    }
    const source = readFileSync("src/templates/advent-calendar/Template.tsx", "utf8");
    expect(source).toContain("left ? fill(others === 1 ? s.foundOne : s.found, { found, total: others }) : fill(others === 1 ? s.readOne : s.read, { read, total: others })");
  });

  it("an open door with a sweet behind it stays a button, switched off and named for what it holds", () => {
    // It became a picture, and the keyboard's focus went with the button that was taken away.
    const source = readFileSync("src/templates/advent-calendar/Template.tsx", "utf8");
    expect(source).not.toMatch(/role="img" aria-label=\{fill\(s\.sweetAt/);
    expect(source).toContain("aria-disabled={sweet || undefined}");
    expect(source).toContain("if (sweet) return onStray();");
    for (const locale of LOCALES) {
      expect(COPY[locale].sweetAt).toMatch(/\{n\}: \{sweet\}$/);
      expect(COPY[locale].noteAt).toMatch(/\{n\}/);
    }
  });

  it("the room cannot be scrolled inside its own box, and the star's ring rests while something is read in front of it", () => {
    const source = readFileSync("src/templates/advent-calendar/Template.tsx", "utf8");
    // clip where the browser has it (it makes no scroll container), hidden where it has not
    expect(source).toContain(".ac-root{overflow:hidden;overflow:clip}");
    expect(source.match(/className="ac-root /g)).toHaveLength(2);
    expect(source).toContain('lit && !reduce && !away ? "ac-ring ');
  });

  it("the cover picker's tile is the house and the title: no button, no door opened, none of the small lines", () => {
    const html = renderToStaticMarkup(<Opening fields={{ look: "midnight" }} recipientName="Nora" senderName="Tom" locale="en" />);
    expect(html).toContain("plate-midnight-closed");
    expect(html).toContain(">Merry Christmas, Nora</h1>");
    expect(html).not.toMatch(/<button|data-niche=|data-foot/);
    // the byline and the foot's line have a smallest size, which on a tile is a third of its width
    expect(html).not.toContain("tap a door to open it");
    expect(html).not.toMatch(/for Nora/i);
    // the editor's still frame, a phone wide, keeps them
    expect(still(demoData.en)).toContain("for Nora · from Tom and 8 more");
    expect(still(demoData.en)).toMatch(/data-foot=/);
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
    // a step's title is said once, and none is longer than its card shows (the guides' own limits)
    for (const locale of LOCALES) {
      expect(new Set(PAGE_STEPS.steps.map((step) => step[locale].toLowerCase())).size).toBe(3);
      for (const step of PAGE_STEPS.steps) expect(step[locale].length, step[locale]).toBeLessThanOrEqual(28);
    }
  });

  it("each note step shows a value of what it is about, short enough for its card, and needs no sample", () => {
    // The guides' cards show a real value of the field a step quotes (2 to 30 characters), and their test
    // fails a sample the field does not need. The letter's step has the line the idea cards lend for it.
    const fits = (line: string) => line.length >= 2 && line.length <= 30;
    const [letter, sign, send] = PAGE_STEPS.steps;
    expect(letter).toMatchObject({ picture: "note", quote: "message" });
    expect(sign).toMatchObject({ picture: "note", quote: "contributions" });
    expect("sample" in letter || "sample" in sign).toBe(false);
    for (const locale of LOCALES) {
      const lent = PAGE_IDEAS[locale].items.find((item) => item.borrow.field === "message" && fits(item.borrow.line));
      expect(lent?.borrow.line).toBe(locale === "en" ? "We are keeping your chair." : "Te guardamos la silla.");
      // "Invite people to sign" is not about photos (it showed a polaroid): its card shows the first signer's name
      const first = (demoData[locale].contributions ?? [])[0].name;
      expect(fits(first), first).toBe(true);
    }
    // the last step sends the card, which is another link than the one people sign at
    expect(send.en).toBe("Send the card");
    expect(send.es).toBe("Envía la tarjeta");
  });

  it("wait here only until the growth build's tables are on this branch: then they are moved", () => {
    // docs/GROUP.md, "The first template", step 4. Nothing reads page-content.ts; on the day the three tables are in this
    // tree its rows go into them (behind ADVENT_CALENDAR_LIVE), the file goes, and these checks go with it onto the tables.
    // (template-guides.ts is on this branch already, in its older shape: the two files that are new on that branch are the sign)
    const here = ["template-page-themes", "template-steps"].filter((name) => existsSync(`src/content/${name}.ts`));
    expect(here, "the tables are here now: move PAGE_THEME, PAGE_STEPS and PAGE_IDEAS into them and delete src/templates/advent-calendar/page-content.ts (docs/GROUP.md, the first template, step 4)").toEqual([]);
    const doc = readFileSync("docs/GROUP.md", "utf8");
    expect(doc).toMatch(/^4\. Its page's own words\./m);
    expect(doc).toContain('do the four things listed under "The first template"');
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

  it("the six cards do not share one sentence: at most two are a pair of clipped ones, and no two open on the same word", () => {
    // Five of six were "an instruction. A fact.", and three opened on "Each" (the check of 22 Nov 2026).
    for (const locale of LOCALES) {
      const hows = PAGE_IDEAS[locale].items.map((item) => item.how);
      expect(hows.filter((how) => how.split(/[.?] /).length > 1).length, locale).toBeLessThanOrEqual(2);
      const first = hows.map((how) => how.split(" ")[0].toLowerCase());
      expect(new Set(first).size, first.join()).toBe(6);
    }
  });

  it("says where the countdown is, with photos or without: after the letter, not under it", () => {
    // _shared/holiday/page.tsx draws the letter, then the photos, then the countdown.
    const page = readFileSync("src/templates/_shared/holiday/page.tsx", "utf8");
    expect(page.indexOf("data.photos.length ?")).toBeGreaterThan(page.indexOf('on("letter"'));
    expect(page.indexOf("data.countdown ?")).toBeGreaterThan(page.indexOf("data.photos.length ?"));
    expect(PAGE_IDEAS.en.items[5].how).toMatch(/shows after your letter/);
    expect(PAGE_IDEAS.es.items[5].how).toMatch(/sale después de tu carta/);
    expect(JSON.stringify(PAGE_IDEAS)).not.toMatch(/under your letter|bajo tu carta/);
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

/* ------------------------------------------------------------------------------------------------
 * What the hands-on test found (reports/prior-advent.json, T1 to T12), each held where a unit can.
 * The rest is played in tests/e2e/advent-calendar.spec.ts.
 * ---------------------------------------------------------------------------------------------- */

describe("after the hands-on test", () => {
  const source = () => readFileSync("src/templates/advent-calendar/Template.tsx", "utf8");

  it("a free gift's badge keeps to its band: the foot's lines and the house go up out of it, and only when there is a badge", () => {
    const s = source();
    expect(s).toContain("clear={chrome.watermarked && !preview}");
    expect(s).toContain(".ac-clear .ac-foot{top:min(var(--ac-foot-top),var(--ac-limit))");
    // the band is where Watermark.tsx floats the badge: max(.75rem, the safe area) from the foot, about 1.8rem high
    expect(readFileSync("src/templates/_shared/Watermark.tsx", "utf8")).toContain("bottom-[max(0.75rem,env(safe-area-inset-bottom))]");
    expect(s).toContain('const BADGE_BAND = "(max(.75rem, env(safe-area-inset-bottom)) + 2.3rem)"');
    // the house is lifted with them, never by more than leaves the title over the roof on the screen
    expect(s).toContain("translate(-50%, calc(-50% - var(--ac-lift, 0px)))");
  });

  it("says the star can be tapped once it is lit, or once every door is open and a note has been read", () => {
    const s = source();
    expect(s).toContain("const next = lit || (!left && read > 0) ? starLine : found > 0 && read === 0 ? s.envelopeHint : null;");
    expect(COPY.en.starHint).toBe("tap the star for {from}’s letter");
    expect(COPY.es.starHint).toBe("toca la estrella: la carta de {from}");
    for (const locale of LOCALES) {
      expect(COPY[locale].starHintPlain).toMatch(locale === "en" ? /^tap the star/ : /^toca la estrella/);
      // the lit line no longer runs onto two lines on a small phone in Spanish
      expect([...COPY[locale].allFound].length, locale).toBeLessThanOrEqual(45);
      expect(fillerIn(`${COPY[locale].starHint} ${COPY[locale].starHintPlain}`, locale)).toEqual([]);
    }
  });

  it("a finger's second tap on a door still swinging is not a tap on its envelope, and the veil waits for the card", () => {
    // longer than a double tap, shorter than the swing, so a tap the moment the door rests is answered
    expect(settleMs(false)).toBeGreaterThan(350);
    expect(settleMs(false)).toBeLessThan(HATCH.swing * 1000);
    expect(settleMs(true)).toBeGreaterThanOrEqual(300);
    expect(VEIL_WAIT_MS).toBeGreaterThanOrEqual(300);
    expect(VEIL_WAIT_MS).toBeLessThanOrEqual(600);
    const s = source();
    // a key pressed again is meant: only a pointer's click (detail above 0) is held back
    expect(s).toContain("if (pointer && clock() - (openedAt.current.get(number) ?? -Infinity) < settleMs(reduce)) return;");
    expect(s).toContain("e.detail > 0);");
    expect(s).toContain("if (e.detail > 0 && clock() - shownAt.current < VEIL_WAIT_MS) return;");
  });

  it("on a phone on its side the house is fitted to the screen with four units to spare, and the star is 44 px on a phone 375 high", () => {
    const anchors = ANCHORS as unknown as Record<string, { x: number; y: number }>;
    expect(LOW_UNITS - (150 - 31)).toBe(4);
    // a door's tap area on a phone 375 high, under the browser's bar (327 px of gift): six rows and a gable in that height
    const k = 327 / LOW_UNITS;
    const tall = Math.min(
      ...Array.from({ length: DOOR_COUNT }, (_, i) => {
        const n = i + 1;
        const h = anchors[`d${n}BR`].y - anchors[`d${n}TL`].y;
        return h + (NICHE.frame / NICHE.w) * (anchors[`d${n}BR`].x - anchors[`d${n}TL`].x);
      }),
    );
    expect(tall * k).toBeGreaterThanOrEqual(37.5);
    // 44 px a row would need the house 44 / tall pixels to a stage unit: more height than the screen has
    expect((150 - 31) * (44 / tall)).toBeGreaterThan(327);
    expect((anchors.starR.x - anchors.starC.x) * 2 * 1.1 * k).toBeGreaterThanOrEqual(44);
  });

  it("remembers, for the tab, the doors opened and the notes read on a real gift's page only, with nothing in it that says whose", () => {
    expect(source()).toContain('const remembers = mode === "live" && !!chrome.keepHref;');
    const keys = ["advent00a1", "advent00a2", "advent00a3"];
    const seed = seedOf("Nora", "Tom");
    const key = keptKey(seed, keys);
    expect(key).not.toMatch(/Nora|Tom|advent00/);
    expect(keptKey(seed, [...keys, "advent00a4"])).not.toBe(key);
    expect(keptKey(seedOf("Nora", "Sam"), keys)).not.toBe(key);
    const map = new Map<string, string>();
    const store = { getItem: (k: string) => map.get(k) ?? null, setItem: (k: string, v: string) => void map.set(k, v), removeItem: (k: string) => void map.delete(k) } as unknown as Storage;
    keep(store, key, { opened: [3, 19, 6], read: ["advent00a2"] });
    expect(recall(store, key, keys)).toEqual({ opened: [3, 19, 6], read: ["advent00a2"] });
    // only what still fits the house: a door that is a door, a note still in it
    map.set(key, JSON.stringify({ opened: [0, 3, 3, 25, 2.5, "7", 24], read: ["gone", "advent00a1", 4] }));
    expect(recall(store, key, keys)).toEqual({ opened: [3, 24], read: ["advent00a1"] });
    map.set(key, "{not json");
    expect(recall(store, key, keys)).toBeNull();
    // every door shut is forgotten
    keep(store, key, { opened: [], read: [] });
    expect(map.has(key)).toBe(false);
    // storage switched off, full or missing: nothing kept, nothing thrown
    const fail = () => {
      throw new Error("blocked");
    };
    const broken = { getItem: fail, setItem: fail, removeItem: fail } as unknown as Storage;
    expect(recall(broken, key, keys)).toBeNull();
    expect(() => keep(broken, key, { opened: [1], read: [] })).not.toThrow();
    expect(recall(null, key, keys)).toBeNull();
  });

  it("the demo's photos are the pool's unframed ones: no border or film edge of their own inside the print", () => {
    for (const locale of LOCALES) {
      const used = [...demoData[locale].photos.map((p) => p.url), ...(demoData[locale].contributions ?? []).flatMap((c) => (c.photo ? [c.photo.url] : []))].join();
      for (const framed of ["p1", "p4", "p7"]) expect(used, `${locale} ${framed}`).not.toContain(`/demo/photos/${framed}.webp`);
    }
  });

  it("short names on tags are written at one size, the smallest any of them needs", () => {
    for (const name of ["Mum", "Gran", "Mamá", "Papá", "Iris", "Leo"]) expect(isShortName(name), name).toBe(true);
    for (const name of ["Auntie Jo", "La tía Jo", "The Okonkwos", "Grandma"]) expect(isShortName(name), name).toBe(false);
    expect(source()).toContain("const fit = short && own.whole && cap !== undefined && cap < own.size ? { ...own, size: cap } : own;");
  });

  it("a note taller than the screen starts clear of the sound button in the corner", () => {
    expect(source()).toContain('const CARD_TOP = "max(calc(9*var(--u)), calc(max(.75rem, var(--gift-safe-top, env(safe-area-inset-top))) + 2.5rem + 8px))";');
    expect(readFileSync("src/templates/_shared/SoundToggle.tsx", "utf8")).toContain("top-[max(0.75rem,var(--gift-safe-top,env(safe-area-inset-top)))] right-3 z-40 grid size-10");
  });
});

describe("its page prices it as what it is sold as: a group card", () => {
  it("a template that needs notes to be sent is sold only as a group card; one that stands without them is not", () => {
    expect(soldAsGroup(manifest)).toBe(true);
    expect(soldAsGroup({ features: { ...manifest.features, group: { ...manifest.features.group!, min: 0 } } })).toBe(false);
    expect(soldAsGroup({ features: { ...manifest.features, group: undefined } })).toBe(false);
  });

  it("its search entry offers it at a group card's price, in every currency", () => {
    for (const currency of ["eur", "usd", "gbp"] as const) {
      const node = templateProductNode(manifest, "en", currency, "Digital card") as { offers: { price: string } };
      expect(Number(node.offers.price), currency).toBe(PRODUCTS.group.amounts[currency] / 100);
    }
  });

  it("its page says collecting notes is free and inviting takes a sign-in, and no browser is sent those lines", () => {
    for (const locale of LOCALES) {
      const all = JSON.parse(readFileSync(`messages/${locale}.json`, "utf8"));
      const lines = all.templates.group as Record<string, string>;
      expect(Object.keys(lines).sort()).toEqual(["detailPrice", "faqA", "featureNotes"]);
      expect(lines.detailPrice).toContain("{price}");
      expect(lines.detailPrice).not.toMatch(/no account|sin cuenta/i);
      expect(lines.detailPrice).toMatch(locale === "en" ? /free/ : /gratis/);
      expect(lines.featureNotes).toContain("{max}");
      expect(lines.faqA).toMatch(/\{price\}[\s\S]*\{name\}/);
      expect(fillerIn(Object.values(lines).join(" "), locale)).toEqual([]);
    }
    expect(GROUP_WORDS.server).toContain("templates.group");
    const page = readFileSync("src/app/[currency]/[locale]/(marketing)/templates/[slug]/page.tsx", "utf8");
    expect(page).toContain('PRODUCTS[manifest.tier === "free" ? "extras" : group ? "group" : "single"]');
    expect(page).toContain('t("templates.group.detailPrice", { price })');
    expect(readFileSync("src/components/templates/template-guide.tsx", "utf8")).toContain('soldAsGroup(manifest) ? group("faqA", { name, price })');
  });
});
