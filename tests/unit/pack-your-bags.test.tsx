import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { createGiftSchema } from "@/lib/gift/schema";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";
import { template } from "@/templates/pack-your-bags";
import { S } from "@/templates/pack-your-bags/copy";
import { APPROACH, DRUM, approach, boardPlans, drumIndex, flapText, planFlips, settledAt, tileFlips, tileWidth, wrapLines, type Flip } from "@/templates/pack-your-bags/flaps";
import { LID_CLOSED, PACKED_SCALE, STRING_REACH, TAG, slotLayout, tossPath, trayLayout } from "@/templates/pack-your-bags/packing";
import { MAX_CLUES, MAX_STOPS, TRIP_KINDS, fieldsSchema } from "@/templates/pack-your-bags/schema";
import { DECOYS, DEFAULT_CLUES, barcode, cluesFor, codeGrid, decoyRows, formatDuration, locate, placeCode, tearEdge, ticketDate, ticketDetails, travelMinutes, tripKm, tripSeed } from "@/templates/pack-your-bags/trip";
import { distanceAt, driveLegs, labelRoom, legsEnd, pointAt, quadPoints, roadPins, roadThrough, track, twoLineChars } from "@/templates/pack-your-bags/winding";
import { mulberry32 } from "@/templates/_shared/random";

const { Template, demoData, fieldMeta, manifest } = template;

/** The owner's rule: the site is made in Riga, and nothing on it mentions Spain. */
const SPAIN = /\b(spain|españa|espana|madrid|barcelona|sevilla|seville|valencia|bilbao|málaga|malaga|granada|palma|ibiza|mallorca|canarias|tenerife|zaragoza|toledo|san sebasti[aá]n)\b/i;

describe("the settings", () => {
  it("start a new gift as the contract says, every key with a default", () => {
    expect(fieldsSchema.parse({})).toEqual({ trip: "flight", fromCity: "Riga", toCity: "Lisbon", stops: [], when: "", nights: 3, clues: [] });
    expect(TRIP_KINDS).toEqual(["flight", "road", "train"]);
  });

  it("refuse what the gift can't show", () => {
    expect(fieldsSchema.safeParse({ trip: "boat" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ nights: 0 }).success).toBe(false);
    expect(fieldsSchema.safeParse({ nights: 31 }).success).toBe(false);
    expect(fieldsSchema.safeParse({ nights: 2.5 }).success).toBe(false);
    expect(fieldsSchema.safeParse({ toCity: "" }).success).toBe(false);
    expect(fieldsSchema.safeParse({ stops: Array.from({ length: MAX_STOPS + 1 }, () => "Siena") }).success).toBe(false);
    expect(fieldsSchema.safeParse({ clues: Array.from({ length: MAX_CLUES + 1 }, () => "socks") }).success).toBe(false);
    expect(fieldsSchema.safeParse({ clues: ["   "] }).success).toBe(false);
    expect(fieldsSchema.safeParse({ fromCoords: "56.95, 24.11", toCoords: "38.72, -9.14" }).success).toBe(true);
  });

  it("render in the editor as buttons, lists and a number, labelled in both languages", () => {
    const fields = describeObjectSchema(fieldsSchema);
    const byKey = Object.fromEntries(fields.map((f) => [f.key, f]));
    expect(byKey.trip.widget).toBe("select");
    expect(byKey.trip.options).toEqual(["flight", "road", "train"]);
    expect(byKey.stops).toMatchObject({ widget: "list", maxItems: MAX_STOPS, itemMaxLength: 40 });
    expect(byKey.clues).toMatchObject({ widget: "list", maxItems: MAX_CLUES, itemMaxLength: 40 });
    expect(byKey.nights.widget).toBe("number");
    expect(byKey.when.widget).toBe("text");
    for (const locale of ["en", "es"] as const) {
      const meta = fieldMeta?.[locale] ?? {};
      for (const field of fields) expect(meta[field.key]?.label, `${locale}.${field.key}`).toBeTruthy();
      expect(Object.keys(meta.trip?.options ?? {}).sort()).toEqual([...TRIP_KINDS].sort());
      expect(meta.stops?.addLabel && meta.clues?.addLabel).toBeTruthy();
    }
    expect(fieldMeta?.en.trip.options).toEqual({ flight: "Plane", road: "Road trip", train: "Train" });
  });

  it("ask for the trip first, right under the names", () => {
    expect(template.leadFields?.keys).toEqual(["trip", "toCity", "fromCity", "when"]);
    for (const key of template.leadFields?.keys ?? []) expect(Object.keys(fieldsSchema.shape)).toContain(key);
  });
});

describe("the manifest", () => {
  it("is a premium template near the front, honest about what it needs", () => {
    expect(manifest.slug).toBe("pack-your-bags");
    expect(manifest.tier).toBe("premium");
    expect(manifest.occasions.length).toBeLessThanOrEqual(4);
    expect(manifest.features).toMatchObject({ music: true, video: false, countdown: true, surprise: false, photos: { min: 0, max: 6 } });
    expect(manifest.features.needs).toBeUndefined();
    expect(manifest.heavy).toBe(false);
    // With the newest templates, ahead of The Letter.
    expect(TEMPLATE_MANIFESTS.every((m) => m.sortOrder >= manifest.sortOrder)).toBe(true);
  });
});

describe("the ticket's details", () => {
  it("prints the airport's own code when it knows the place, else the first three letters", () => {
    expect(placeCode("London")).toBe("LHR");
    expect(placeCode("Londres")).toBe("LHR");
    expect(placeCode("Santorini")).toBe("JTR");
    expect(placeCode("Crete")).toBe("HER");
    expect(placeCode("Montepulciano")).toBe("MON");
    expect(placeCode("Ys")).toBe("YSX");
    expect(placeCode("!!")).toBe("XXX");
  });

  it("finds places in the city table, the airports, or from coordinates", () => {
    expect(locate("Santorini")).not.toBeNull();
    expect(locate("Nowhere-on-sea")).toBeNull();
    expect(locate("Nowhere-on-sea", "43.1, 11.8")).toMatchObject({ lat: 43.1, lng: 11.8 });
  });

  it("gives a distance only when both ends are known, through every stop it can place", () => {
    const london = locate("London");
    const santorini = locate("Santorini");
    const oslo = locate("Oslo");
    const direct = tripKm(london, [], santorini)!;
    // London to Santorini is about 2,600 km as the crow flies.
    expect(direct).toBeGreaterThan(2500);
    expect(direct).toBeLessThan(2700);
    expect(tripKm(london, [oslo], santorini)).toBeGreaterThan(direct + 1000);
    expect(tripKm(london, [null], santorini)).toBe(direct);
    expect(tripKm(null, [], santorini)).toBeNull();
    expect(tripKm(london, [], null)).toBeNull();
  });

  it("estimates the time for each way of travelling, rounded to five minutes", () => {
    expect(travelMinutes(2480, "flight")).toBe(215);
    expect(travelMinutes(344, "train")).toBe(170);
    expect(travelMinutes(0, "road")).toBe(5);
    for (const kind of TRIP_KINDS) expect(travelMinutes(1234, kind) % 5).toBe(0);
    expect(formatDuration(215)).toBe("3 h 35 min");
    expect(formatDuration(45)).toBe("45 min");
    expect(formatDuration(360)).toBe("6 h");
  });

  it("seeds the same gate, seats and times every time, from the names", () => {
    const seed = tripSeed("Hannah", "Rory", "London", "Santorini");
    const a = ticketDetails(seed, { recipient: "Hannah", sender: "Rory" });
    expect(ticketDetails(seed, { recipient: "Hannah", sender: "Rory" })).toEqual(a);
    expect(a.flightNo).toMatch(/^HR \d{3}$/);
    expect(a.gate).toMatch(/^[A-H]\d{1,2}$/);
    expect(a.seats[0]).toMatch(/^\d{1,2}A$/);
    expect(a.seats[1]).toBe(a.seats[0].replace("A", "B"));
    expect(Number(a.trainSeats[1])).toBe(Number(a.trainSeats[0]) + 1);
    expect(a.departs).toMatch(/^\d\d:[0-5][05]$/);
    expect(ticketDetails(seed, { recipient: "Élodie", sender: "!" }).flightNo).toMatch(/^XO \d{3}$/);
  });

  it("leaves when the countdown says, and boards half an hour before, even across midnight", () => {
    const seed = 42;
    const names = { recipient: "A", sender: "B" };
    const at = ticketDetails(seed, names, { targetAt: "2026-10-16T07:40:00+01:00", timezone: "Europe/London" });
    expect(at).toMatchObject({ departs: "07:40", boards: "07:10" });
    const late = ticketDetails(seed, names, { targetAt: "2026-10-16T00:10:00+00:00", timezone: "UTC" });
    expect(late).toMatchObject({ departs: "00:10", boards: "23:40" });
    const odd = ticketDetails(seed, names, { targetAt: "2026-10-16T07:40:00+01:00", timezone: "Not/AZone" });
    expect(odd.departs).toBe("06:40");
  });

  it("prints the date the sender typed, else the countdown's day in the gift's language, else 'soon'", () => {
    const countdown = { targetAt: "2026-10-16T07:40:00+01:00", timezone: "Europe/London" };
    expect(ticketDate("  Fri 10 Oct ", countdown, "en", "Soon")).toBe("Fri 10 Oct");
    expect(ticketDate("", countdown, "en", "Soon")).toBe("Fri 16 Oct");
    expect(ticketDate("", countdown, "es", "Muy pronto")).toMatch(/^vie 16 oct$/);
    expect(ticketDate("", undefined, "en", "Soon")).toBe("Soon");
    expect(ticketDate("", { ...countdown, timezone: "Not/AZone" }, "en", "Soon")).toBe("Fri 16 Oct");
  });

  it("packs a list that fits the trip when the sender didn't write one", () => {
    for (const kind of TRIP_KINDS)
      for (const locale of ["en", "es"] as const) {
        const list = DEFAULT_CLUES[kind][locale];
        expect(list.length).toBeGreaterThanOrEqual(3);
        expect(list.length).toBeLessThanOrEqual(MAX_CLUES);
        for (const clue of list) expect(fieldsSchema.shape.clues.safeParse([clue]).success, clue).toBe(true);
      }
    expect(cluesFor("train", [], "es")).toEqual(DEFAULT_CLUES.train.es);
    expect(cluesFor("road", [" snacks "], "en")).toEqual(["snacks"]);
  });

  it("draws the same barcode, ticket code and torn edge every time", () => {
    expect(barcode(7)).toEqual(barcode(7));
    expect(barcode(7)).not.toEqual(barcode(8));
    expect(barcode(7).every((w) => w >= 1 && w <= 4)).toBe(true);
    const grid = codeGrid(7, 19);
    expect(grid).toHaveLength(19 * 19);
    // The bullseye: dark centre, light ring, dark ring.
    expect(grid[9 * 19 + 9]).toBe(true);
    expect(grid[9 * 19 + 10]).toBe(false);
    expect(grid[9 * 19 + 11]).toBe(true);
    const edge = tearEdge(7, 22);
    expect(edge).toHaveLength(23);
    edge.forEach((d, i) => (i % 2 ? expect(d).toBeLessThan(0.5) : expect(d).toBeGreaterThan(0.5)));
  });
});

describe("the departures board", () => {
  const rng = () => mulberry32(99);

  it("prints what it has leaves for, accents and all", () => {
    expect(flapText("Ponta  Delgada")).toBe("PONTA DELGADA");
    expect(flapText("Reykjavík")).toBe("REYKJAVÍK");
    expect(flapText("Tromsø")).toBe("TROMSØ");
    expect(flapText("Rock & Roll")).toBe("ROCK ROLL");
    expect(drumIndex("Í")).toBe(DRUM.indexOf("I"));
    expect(drumIndex("Ø")).toBe(DRUM.indexOf("O"));
    expect(drumIndex("&")).toBe(-1);
  });

  it("turns only forwards, through the leaves just before each letter", () => {
    expect(approach("E")).toEqual(["A", "B", "C", "D", "E"]);
    expect(approach("A")).toEqual([":", ".", "-", " ", "A"]);
    expect(approach("Í")).toEqual(["E", "F", "G", "H", "I", "Í"]);
    expect(approach(" ")).toEqual(["9", ":", ".", "-", " "]);
  });

  it("clatters until it's time, then lands on its letter, one leaf per beat", () => {
    const flips = tileFlips("S", 100, 1500, 76, rng());
    expect(flips[0].at).toBe(100);
    expect(flips.at(-1)!.char).toBe("S");
    expect(flips.at(-1)!.at).toBeGreaterThanOrEqual(1500 - 76);
    for (let i = 1; i < flips.length; i++) expect(flips[i].at - flips[i - 1].at).toBe(76);
    // No time to clatter: it still approaches rather than jumping.
    expect(tileFlips("S", 0, 0, 76, rng()).map((f) => f.char)).toEqual(approach("S"));
    expect(tileFlips("S", 0, 0, 76, rng())).toHaveLength(APPROACH + 1);
  });

  it("wraps a long destination onto lines that keep words whole", () => {
    expect(wrapLines("SANTORINI", 12)).toEqual(["SANTORINI"]);
    expect(wrapLines("PONTA DELGADA", 12)).toEqual(["PONTA", "DELGADA"]);
    expect(wrapLines("SAINT-REMY-DE-PROVENCE", 12)).toEqual(["SAINT-REMY-DE-PROVENCE"]);
    expect(wrapLines("A B C D E F G H", 1)).toHaveLength(3);
    expect(wrapLines("", 12)).toEqual([""]);
  });

  it("sizes tiles so the longest line fits, never past the cap", () => {
    expect(tileWidth(10, 86, 9.4)).toBeCloseTo(8.6);
    expect(tileWidth(4, 86, 9.4)).toBe(9.4);
  });

  const texts = { hero: ["PONTA", "DELGADA"], info: ["09:40", "B7 "], rows: [["10:05", "AMSTERDAM ", "C4 "], ["10:20", "OSLO      ", "A12"], ["10:45", "VIENNA    ", "D3 "]] };

  const finals = (flips: Flip[]) => {
    const last = new Map<number, Flip>();
    for (const f of flips) last.set(f.tile, f);
    return last;
  };

  it("lands every tile on its own letter, in time order, one tile per character", () => {
    const plans = boardPlans(texts, false);
    const flips = planFlips(plans, rng(), 76);
    const targets = plans.flatMap((p) => Array.from(p.text));
    const last = finals(flips);
    expect(last.size).toBe(targets.length);
    targets.forEach((ch, tile) => expect(last.get(tile)?.char, `tile ${tile}`).toBe(ch));
    for (let i = 1; i < flips.length; i++) expect(flips[i].at).toBeGreaterThanOrEqual(flips[i - 1].at);
    expect(settledAt(flips, 76)).toBe(flips.at(-1)!.at + 76);
  });

  it("settles the other departures first, then resolves the destination letter by letter", () => {
    const plans = boardPlans(texts, false);
    const last = finals(planFlips(plans, rng(), 76));
    const heroTiles = texts.hero.join("").length;
    const infoTiles = texts.info.join("").length;
    const heroLands = Array.from({ length: heroTiles }, (_, i) => last.get(i)!.at);
    const rowLands = [...last.entries()].filter(([tile]) => tile >= heroTiles + infoTiles).map(([, f]) => f.at);
    for (let i = 1; i < heroLands.length; i++) expect(heroLands[i]).toBeGreaterThan(heroLands[i - 1]);
    expect(heroLands[0]).toBeGreaterThan(Math.max(...rowLands));
    // Then the time and the gate.
    for (let i = heroTiles; i < heroTiles + infoTiles; i++) expect(last.get(i)!.at).toBeGreaterThan(heroLands.at(-1)!);
  });

  it("on a road trip, brings the stops in one after another, then the destination", () => {
    const road = { hero: ["MONTEPULCIANO"], info: ["03"], rows: [["01", "GREVE IN CHIANTI"], ["02", "SIENA           "], ["03", "PIENZA          "]] };
    const plans = boardPlans(road, true);
    const last = finals(planFlips(plans, rng(), 76));
    let tile = road.hero[0].length + road.info[0].length;
    const rows = road.rows.map((cells) => {
      const n = cells.join("").length;
      const lands = Array.from({ length: n }, (_, i) => last.get(tile + i)!.at);
      tile += n;
      return { first: Math.min(...lands), last: Math.max(...lands) };
    });
    for (let r = 1; r < rows.length; r++) expect(rows[r].first).toBeGreaterThan(rows[r - 1].last);
    expect(last.get(0)!.at).toBeGreaterThan(rows.at(-1)!.last);
  });

  it("fills in three real-looking later departures, never the trip's own places, and nowhere in Spain", () => {
    const rows = decoyRows("flight", "en", 5, "09:40", ["Amsterdam", "Oslo"]);
    expect(rows).toHaveLength(3);
    const minutes = rows.map(([time]) => Number(time.slice(0, 2)) * 60 + Number(time.slice(3)));
    expect(minutes[0]).toBeGreaterThan(9 * 60 + 40);
    for (let i = 1; i < 3; i++) expect(minutes[i]).toBeGreaterThan(minutes[i - 1]);
    for (const [, place, gate] of rows) {
      expect(["AMSTERDAM", "OSLO"]).not.toContain(place.trim());
      expect(place.length).toBe(rows[0][1].length);
      expect(gate).toHaveLength(3);
    }
    expect(decoyRows("train", "es", 5, "23:50", [])[0][2]).toMatch(/^[ \d]\d$/);
    for (const group of Object.values(DECOYS))
      for (const list of Object.values(group))
        for (const place of list) {
          expect(place.length, place).toBeLessThanOrEqual(10);
          expect(place, place).not.toMatch(SPAIN);
        }
  });
});

describe("packing the case", () => {
  it("lays the tags out under the case, on the stage, for one to five of them", () => {
    for (let n = 1; n <= MAX_CLUES; n++)
      for (const seed of [3, 11, 97, 1234, 99991]) {
        const tray = trayLayout(n, seed);
        expect(tray).toHaveLength(n);
        for (const tag of tray) {
          // The case sits 4.5 in from the stage's left edge; the stage is 100 wide, and on a phone
          // held upright it is the whole screen, so the string's loop has to fit on it too.
          expect(tag.x - STRING_REACH + 4.5).toBeGreaterThanOrEqual(0);
          expect(tag.x + TAG.w + 4.5).toBeLessThanOrEqual(100);
          expect(tag.y).toBeGreaterThanOrEqual(LID_CLOSED.h + 8);
        }
      }
    expect(trayLayout(4, 3)).toEqual(trayLayout(4, 3));
  });

  it("lands every tag where the shut lid will cover it", () => {
    const halfDiagonal = (Math.hypot(TAG.w, TAG.h) * PACKED_SCALE) / 2;
    for (let n = 1; n <= MAX_CLUES; n++)
      for (const slot of slotLayout(n, 11)) {
        const angle = (((slot.rot % 360) + 360) % 360) * (Math.PI / 180);
        const halfW = ((TAG.w * Math.abs(Math.cos(angle)) + TAG.h * Math.abs(Math.sin(angle))) * PACKED_SCALE) / 2;
        const halfH = ((TAG.w * Math.abs(Math.sin(angle)) + TAG.h * Math.abs(Math.cos(angle))) * PACKED_SCALE) / 2;
        expect(halfW).toBeLessThanOrEqual(halfDiagonal);
        expect(slot.x - halfW).toBeGreaterThanOrEqual(LID_CLOSED.x);
        expect(slot.x + halfW).toBeLessThanOrEqual(LID_CLOSED.x + LID_CLOSED.w);
        expect(slot.y - halfH).toBeGreaterThanOrEqual(LID_CLOSED.y);
        expect(slot.y + halfH).toBeLessThanOrEqual(LID_CLOSED.y + LID_CLOSED.h);
        // A full turn in the air, and a bit.
        expect(Math.abs(slot.rot)).toBeGreaterThan(340);
      }
  });

  it("throws each tag up and over, centre to centre", () => {
    const from = { x: 10, y: 70, tilt: 0 };
    const to = { x: 64, y: 13, rot: 360 };
    const path = tossPath(from, to);
    expect(path.dx).toBeCloseTo(64 - 25);
    expect(path.dy).toBeCloseTo(13 - 77.5);
    expect(path.peak).toBeLessThan(path.dy);
  });
});

describe("the roads on the tickets", () => {
  it("measures and walks a track, clamped at both ends", () => {
    const trk = track([
      { x: 0, y: 0 },
      { x: 3, y: 4 },
      { x: 3, y: 10 },
    ]);
    expect(trk.total).toBe(11);
    expect(pointAt(trk, 5)).toMatchObject({ x: 3, y: 4 });
    expect(pointAt(trk, -3)).toMatchObject({ x: 0, y: 0 });
    expect(pointAt(trk, 99)).toMatchObject({ x: 3, y: 10, angle: 90 });
    const arc = quadPoints({ x: 0, y: 10 }, { x: 50, y: -10 }, { x: 100, y: 10 }, 20);
    expect(arc[0]).toEqual({ x: 0, y: 10 });
    expect(arc.at(-1)).toEqual({ x: 100, y: 10 });
    expect(arc[10].y).toBeLessThan(10);
  });

  it("winds through every pin, left to right, in order", () => {
    for (let n = 2; n <= MAX_STOPS + 2; n++) {
      const pins = roadPins(n);
      expect(pins).toHaveLength(n);
      for (let i = 1; i < n; i++) expect(pins[i].x).toBeGreaterThan(pins[i - 1].x);
      const road = roadThrough(pins);
      expect(road.pinAt).toHaveLength(n);
      road.pinAt.forEach((d, i) => {
        const p = pointAt(road.track, d);
        expect(p.x).toBeCloseTo(pins[i].x, 5);
        expect(p.y).toBeCloseTo(pins[i].y, 5);
        if (i) expect(d).toBeGreaterThan(road.pinAt[i - 1]);
      });
    }
  });

  it("drives stop to stop, waits at each, and ends at the destination", () => {
    const road = roadThrough(roadPins(5));
    const legs = driveLegs(road.pinAt, { delay: 0.6, pause: 0.45 });
    expect(legs).toHaveLength(4);
    expect(distanceAt(legs, 0)).toBe(road.pinAt[0]);
    for (let i = 1; i < legs.length; i++) {
      expect(legs[i].t0).toBeCloseTo(legs[i - 1].t1 + 0.45);
      // Parked at the stop in between.
      expect(distanceAt(legs, legs[i - 1].t1 + 0.2)).toBe(road.pinAt[i]);
    }
    let prev = -1;
    for (let t = 0; t <= legsEnd(legs) + 1; t += 0.05) {
      const d = distanceAt(legs, t);
      expect(d).toBeGreaterThanOrEqual(prev);
      prev = d;
    }
    expect(distanceAt(legs, legsEnd(legs) + 5)).toBe(road.pinAt.at(-1));
  });

  it("keeps names on the same side of the road from running into each other", () => {
    const pins = roadPins(MAX_STOPS + 2);
    const above = pins.map((p) => p.y < 30);
    const lean = pins.map((_, i) => (i === 0 ? 0.18 : i === pins.length - 1 ? 0.82 : 0.5));
    // Short names keep all the room they asked for.
    expect(labelRoom(pins, above, pins.map(() => 8), pins.map(() => 5), lean)).toEqual(pins.map(() => 8));
    // Long ones go onto two lines before they give up letters...
    const want = pins.map(() => 35);
    const wrapped = labelRoom(pins, above, want, pins.map(() => 15), lean, 2);
    wrapped.forEach((w) => expect(w).toBeGreaterThanOrEqual(15));
    // ...and past that share the gap to their neighbour on the same side; never overlapping it.
    const room = labelRoom(pins, above, want, pins.map(() => 30), lean, 2);
    for (let i = 0; i < pins.length; i++) {
      expect(room[i]).toBeLessThanOrEqual(want[i]);
      const j = pins.findIndex((_, k) => k > i && above[k] === above[i]);
      if (j < 0) continue;
      const right = pins[i].x + (1 - lean[i]) * room[i];
      const left = pins[j].x - lean[j] * room[j];
      expect(right).toBeLessThanOrEqual(left - 2 + 1e-9);
    }
    expect(twoLineChars("Greve in Chianti")).toBe(8);
    expect(twoLineChars("Castellina in Chianti")).toBe(10);
    expect(twoLineChars("Montepulciano")).toBe(13);
  });
});

describe("the demo", () => {
  it("is a flight to Santorini in English and a road trip through Tuscany in Spanish", () => {
    const schema = createGiftSchema(fieldsSchema);
    expect(schema.safeParse(demoData.en).success).toBe(true);
    expect(schema.safeParse(demoData.es).success).toBe(true);
    expect(demoData.en.fields).toMatchObject({ trip: "flight", fromCity: "London", toCity: "Santorini" });
    expect(demoData.en.fields.clues).toHaveLength(3);
    expect(demoData.es.fields).toMatchObject({ trip: "road", fromCity: "Florencia", toCity: "Montepulciano", stops: ["Greve in Chianti", "Siena", "Pienza"] });
    expect(demoData.es.fields.clues.length).toBeGreaterThan(0);
  });

  it("never mentions Spain, in the demo or anything the template says", () => {
    const words = JSON.stringify({ demoData, S, fieldMeta, name: manifest.name, tagline: manifest.tagline, description: manifest.description, DEFAULT_CLUES });
    expect(words).not.toMatch(SPAIN);
  });
});

describe("rendering", () => {
  const render = (data: typeof demoData.en, mode: "preview" | "demo" | "live") => renderToStaticMarkup(<Template data={data} mode={mode} />);

  it("shows the editor the finished ticket straight away", () => {
    const html = render(demoData.en, "preview");
    for (const text of ["LHR", "JTR", "Hannah", "Rory", "Fri 16 Oct", "Boarding pass", "07:10", "tear here"]) expect(html).toContain(text);
    expect(html).toContain('data-testid="pyb-pass"');
    expect(html).not.toContain('data-testid="pyb-clue"');
  });

  it("shows a road trip its itinerary, stops and all, in Spanish", () => {
    const html = render(demoData.es, "preview");
    for (const text of ["Hoja de ruta", "Florencia", "Greve in Chianti", "Siena", "Pienza", "Montepulciano", "Lucía", "Andrés", "vie 23 oct", "Válido para dos"]) expect(html).toContain(text);
  });

  it("opens a real gift on the suitcase, one button per clue", () => {
    const html = render(demoData.en, "demo");
    expect(html).toContain("Pack your bags, Hannah.");
    expect(html.match(/data-testid="pyb-clue"/g)).toHaveLength(3);
    expect(html).toContain('aria-label="Pack the white linen shirt"');
    expect(render(demoData.es, "live")).toContain("Haz la maleta, Lucía.");
  });

  it("still opens a draft whose fields no longer fit, on the defaults", () => {
    const broken = { ...demoData.en, fields: { trip: "boat", nights: "four" } as unknown as typeof demoData.en.fields };
    expect(() => render(broken, "preview")).not.toThrow();
    expect(render(broken, "preview")).toContain("LIS");
    // An empty packing list gets the built-in one for the trip.
    const empty = { ...demoData.en, fields: { ...demoData.en.fields, trip: "train" as const, clues: [] } };
    expect(render(empty, "demo")).toContain('aria-label="Pack a good book"');
  });
});
