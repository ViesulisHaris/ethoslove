import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { DARES, KNOW_QUESTIONS, RATHER_PAIRS, TRUTHS } from "@/lib/games/content";
import { DECKS, DECK_IDS } from "@/lib/games/questions";
import { KNOW_ROUNDS, RATHER_ROUNDS, knowQuestion, knowReduce, newKnow, newRather, ratherPair, ratherReduce, seedOf } from "@/lib/games/play";
import { PACK_CARDS, type PackCards } from "@/lib/games/pack-cards";
import { ADULT_KEY, PACK_IDS, PACK_NAMES, PACKS, adultConfirmed, confirmAdult, isPackId, packAccess, packCheckoutBody, packFromSearch, packReturnPath, packUnlocked, packsFor, rowsUnlockPack } from "@/lib/games/packs";
import { PRODUCTS } from "@/lib/pricing/products";

type L = { en: string; es: string };

/** Every card in a pack, each once (the spicy truths double as its question deck). */
function cardsOf(pack: PackCards): unknown[] {
  return [...new Set<unknown>([...(pack.deck ?? []), ...(pack.know ?? []), ...(pack.rather ?? []), ...(pack.truths ?? []), ...(pack.dares ?? [])])];
}

/** Every sentence in a pack, both languages. */
function textsOf(pack: PackCards): L[] {
  return [
    ...(pack.deck ?? []),
    ...(pack.truths ?? []),
    ...(pack.dares ?? []),
    ...(pack.know ?? []).flatMap((q) => [q.prompt, ...q.options]),
    ...(pack.rather ?? []).flatMap((p) => [p.a, p.b]),
  ];
}

/** Lower case, accents off, so "pezón" and "pezon" are the same word to the filters below. */
const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const words = (list: string[]) => new RegExp(`\\b(${list.map((w) => plain(w).replace(/\s+/g, "\\s+")).join("|")})\\b`);

/**
 * "After dark" is flirty, never explicit: no sexual acts, no bodies beyond kissing and touching in
 * general terms. Anything on this list in either language fails the build rather than reaching a
 * store review, a payment processor or somebody's sofa.
 */
const EXPLICIT = words([
  // English
  "sex", "sexy", "sexual", "naked", "nude", "nudes", "orgasm", "breast", "breasts", "boob", "boobs", "nipple", "nipples", "penis", "vagina", "dick", "cock", "pussy",
  "ass", "arse", "butt", "bum", "genital", "genitals", "crotch", "strip", "stripping", "striptease", "lingerie", "underwear", "condom", "porn", "porno", "horny",
  "fuck", "oral", "thigh", "thighs", "chest", "lick", "suck", "moan", "undress", "handcuffs", "bondage", "kinky", "fetish", "erotic", "foreplay", "climax", "spank",
  "grind", "lap dance", "blowjob", "nsfw", "xxx", "hickey", "neck", "lips", "ear", "ears", "body", "skin", "waist", "hips", "legs", "bedroom",
  // Spanish
  "sexo", "sexual", "desnudo", "desnuda", "desnudos", "desnudas", "desnudarse", "desnudate", "orgasmo", "pecho", "pechos", "teta", "tetas", "pezon", "pezones",
  "pene", "vagina", "polla", "coño", "culo", "trasero", "nalgas", "genitales", "entrepierna", "lenceria", "ropa interior", "condon", "cachondo", "cachonda",
  "follar", "oral", "muslo", "muslos", "lamer", "chupar", "gemir", "desvestir", "desvistete", "esposas", "fetiche", "erotico", "erotica", "azotes", "chupeton",
  "cuello", "labios", "oreja", "orejas", "cuerpo", "piel", "cintura", "caderas", "piernas", "dormitorio",
]);

/** The site never names the country or its cities (see the brief); the games are for anywhere. */
const PLACES = words(["spain", "spanish", "espana", "espanol", "espanola", "madrid", "barcelona", "sevilla", "seville", "valencia", "bilbao", "malaga", "granada", "zaragoza", "ibiza", "mallorca", "majorca", "tenerife", "canarias", "canary", "toledo", "salamanca", "cordoba", "alicante", "san sebastian", "donostia", "cadiz", "marbella", "benidorm"]);

describe("the packs", () => {
  it("are the three the checkout sells, named in both languages", () => {
    expect(PACK_IDS).toEqual(["deep", "distance", "spicy"]);
    for (const id of PACK_IDS) {
      expect(PACK_NAMES[id].en && PACK_NAMES[id].es).toBeTruthy();
      expect(PACKS[id].id).toBe(id);
      expect(PACKS[id].name).toBe(PACK_NAMES[id]);
    }
    expect(isPackId("deep")).toBe(true);
    expect(isPackId("pack:deep")).toBe(false);
    expect(isPackId("*")).toBe(false);
    expect(isPackId(undefined)).toBe(false);
  });

  it("cost €2.99 each, from the same catalogue checkout charges from", () => {
    expect(PRODUCTS.pack.amounts.eur).toBe(299);
  });

  it("deal into the games they say, and only those", () => {
    for (const id of PACK_IDS) {
      const pack = PACK_CARDS[id];
      const dealt = [pack.deck && "deck", pack.know && "know", pack.rather && "rather", pack.truths && pack.dares && "dare"].filter(Boolean).sort();
      expect(dealt, id).toEqual([...PACKS[id].games].sort());
      // Half a truth-or-dare pack would leave one deck on the table empty.
      expect(Boolean(pack.truths), id).toBe(Boolean(pack.dares));
    }
    expect(packsFor("deck")).toEqual(["deep", "distance", "spicy"]);
    expect(packsFor("know")).toEqual(["deep"]);
    expect(packsFor("rather")).toEqual(["distance", "spicy"]);
    expect(packsFor("dare")).toEqual(["spicy"]);
    expect(packsFor("memory")).toEqual([]);
    expect(packsFor("draw")).toEqual([]);
    expect(packsFor("roulette")).toEqual([]);
  });

  it("hold about forty cards each, the number the sheet promises, and enough for a whole game", () => {
    for (const id of PACK_IDS) {
      const pack = PACK_CARDS[id];
      const count = cardsOf(pack).length;
      expect(count, id).toBe(PACKS[id].cards);
      expect(count, id).toBeGreaterThanOrEqual(36);
      expect(count, id).toBeLessThanOrEqual(48);
      if (pack.deck) expect(pack.deck.length, id).toBeGreaterThanOrEqual(12);
      if (pack.know) expect(pack.know.length, id).toBeGreaterThan(KNOW_ROUNDS);
      if (pack.rather) expect(pack.rather.length, id).toBeGreaterThan(RATHER_ROUNDS);
      if (pack.truths) expect(pack.truths.length, id).toBeGreaterThanOrEqual(12);
      if (pack.dares) expect(pack.dares.length, id).toBeGreaterThanOrEqual(12);
    }
  });

  it("are complete in both languages, and the Spanish is really Spanish", () => {
    for (const id of PACK_IDS) {
      for (const text of textsOf(PACK_CARDS[id])) {
        expect(text.en.trim(), id).toBe(text.en);
        expect(text.es.trim(), id).toBe(text.es);
        expect(text.en.length > 0 && text.es.length > 0, text.en).toBe(true);
        // A sentence left in English on the Spanish side is the usual slip.
        if (text.en.length > 12) expect(text.es, text.en).not.toBe(text.en);
      }
      for (const q of PACK_CARDS[id].know ?? []) expect(q.options, q.id).toHaveLength(4);
      const { blurb, samples } = PACKS[id];
      for (const text of [blurb, ...samples]) expect(text.en && text.es && text.es !== text.en).toBeTruthy();
    }
  });

  it("never repeat a card, within a pack, across packs, or from the free games", () => {
    const free = new Set([...TRUTHS, ...DARES, ...DECK_IDS.flatMap((d) => DECKS[d].cards), ...KNOW_QUESTIONS.map((q) => q.prompt), ...RATHER_PAIRS.flatMap((p) => [p.a, p.b])].map((c) => c.en));
    const seen = new Set<string>();
    for (const id of PACK_IDS) {
      const pack = PACK_CARDS[id];
      const own = [...new Set([...(pack.deck ?? []), ...(pack.truths ?? []), ...(pack.dares ?? []), ...(pack.know ?? []).map((q) => q.prompt), ...(pack.rather ?? []).flatMap((p) => [p.a, p.b])])];
      for (const card of own) {
        expect(free.has(card.en), card.en).toBe(false);
        expect(seen.has(card.en), card.en).toBe(false);
        seen.add(card.en);
      }
    }
  });

  it("give every question and dilemma an id of its own, clear of the free game's", () => {
    const ids = [...KNOW_QUESTIONS.map((q) => q.id), ...RATHER_PAIRS.map((p) => p.id), ...PACK_IDS.flatMap((id) => [...(PACK_CARDS[id].know ?? []).map((q) => q.id), ...(PACK_CARDS[id].rather ?? []).map((p) => p.id)])];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("show three real cards from inside before anybody pays", () => {
    for (const id of PACK_IDS) {
      const pack = PACK_CARDS[id];
      const inside = new Set([...(pack.deck ?? []), ...(pack.truths ?? []), ...(pack.dares ?? []), ...(pack.know ?? []).map((q) => q.prompt)].flatMap((c) => [c.en, c.es]));
      expect(PACKS[id].samples).toHaveLength(3);
      for (const sample of PACKS[id].samples) {
        expect(inside.has(sample.en), sample.en).toBe(true);
        expect(inside.has(sample.es), sample.es).toBe(true);
      }
    }
  });

  it("keep After dark flirty, never explicit, in both languages", () => {
    // The filter itself, so a typo in the list can't pass everything quietly.
    expect(EXPLICIT.test(plain("Take off your lingerie"))).toBe(true);
    expect(EXPLICIT.test(plain("Un beso en el cuello"))).toBe(true);
    expect(EXPLICIT.test(plain("Hold hands everywhere we go"))).toBe(false);
    expect(EXPLICIT.test(plain("A bass guitar and a class act"))).toBe(false);
    expect(PACKS.spicy.adult).toBe(true);
    expect(PACKS.deep.adult || PACKS.distance.adult).toBe(false);
    for (const id of PACK_IDS) {
      const texts = [...textsOf(PACK_CARDS[id]), PACKS[id].name, PACKS[id].blurb, ...PACKS[id].samples];
      for (const text of texts) {
        expect(plain(text.en), text.en).not.toMatch(EXPLICIT);
        expect(plain(text.es), text.es).not.toMatch(EXPLICIT);
      }
    }
  });

  it("never name the country or its cities, in the cards or on the shelf", () => {
    const strings = [
      ...PACK_IDS.flatMap((id) => [...textsOf(PACK_CARDS[id]), PACKS[id].name, PACKS[id].blurb]).flatMap((t) => [t.en, t.es]),
      ...JSON.stringify([en.packs, es.packs, en.games, es.games]).split('","'),
    ];
    for (const text of strings) expect(plain(text), text).not.toMatch(PLACES);
  });
});

describe("who may open a pack", () => {
  it("reads the entitlements list: a pack's id, or every pack", () => {
    expect(packUnlocked([], "deep")).toBe(false);
    expect(packUnlocked(["deep"], "deep")).toBe(true);
    expect(packUnlocked(["deep"], "spicy")).toBe(false);
    expect(packUnlocked(["*", "deep", "distance", "spicy"], "spicy")).toBe(true);
    expect(packUnlocked(["*"], "distance")).toBe(true);
    // The same with the rows' own prefix.
    expect(packUnlocked(["pack:deep"], "deep")).toBe(true);
    expect(packUnlocked(["pack:*"], "spicy")).toBe(true);
    expect(packUnlocked(["pack:deep"], "distance")).toBe(false);
  });

  it("reads the unlock rows on the server, where a bare * is the templates and opens no pack", () => {
    expect(rowsUnlockPack(["pack:deep"], "deep")).toBe(true);
    expect(rowsUnlockPack(["pack:*"], "spicy")).toBe(true);
    expect(rowsUnlockPack(["*"], "deep")).toBe(false);
    expect(rowsUnlockPack(["deep"], "deep")).toBe(false);
    expect(rowsUnlockPack(["pack:distance", "the-letter"], "deep")).toBe(false);
  });

  it("says a pack came with Ethos for Two only while a pass covers every pack", () => {
    const withPass = ["*", "deep", "distance", "spicy"];
    expect(packAccess([], false, "deep")).toBe("locked");
    expect(packAccess([], true, "deep")).toBe("locked");
    expect(packAccess(["deep"], false, "deep")).toBe("owned");
    expect(packAccess(["deep"], false, "spicy")).toBe("locked");
    expect(packAccess(withPass, true, "spicy")).toBe("pass");
    // A pass that ended: the "*" has gone, what was bought stays.
    expect(packAccess(["deep"], true, "deep")).toBe("owned");
    // Every pack without a pass (a bundle, one day) is simply theirs.
    expect(packAccess(["*"], false, "distance")).toBe("owned");
  });
});

describe("buying a pack", () => {
  it("asks checkout for the pack by id, never with an amount, and comes back to the same game", () => {
    expect(packCheckoutBody("deep", { pathname: "/games/deck", locale: "es" })).toEqual({ product: "pack", packId: "deep", returnTo: "/games/deck?pack=deep", locale: "es", currency: "eur" });
    const body = packCheckoutBody("spicy", { pathname: "/games/rather", locale: "en", ref: "c-maria" });
    expect(body).toEqual({ product: "pack", packId: "spicy", returnTo: "/games/rather?pack=spicy", locale: "en", currency: "eur", ref: "c-maria" });
    // A creator is credited through their link's ref only: no code field exists to send.
    expect(Object.keys(body)).not.toContain("creatorCode");
    expect(Object.keys(body)).not.toContain("amount");
  });

  it("returns to a path on this site only, without the old room", () => {
    expect(packReturnPath("/games/know?room=ABCD", "deep")).toBe("/games/know?pack=deep");
    expect(packReturnPath("/games/dare#top", "spicy")).toBe("/games/dare?pack=spicy");
    expect(packReturnPath("//evil.example/x", "deep")).toBe("/games?pack=deep");
    expect(packReturnPath("https://evil.example", "deep")).toBe("/games?pack=deep");
  });

  it("opens the pack the buyer came back with, and nothing else", () => {
    expect(packFromSearch("?pack=distance")).toBe("distance");
    expect(packFromSearch("?room=ABCD&pack=spicy")).toBe("spicy");
    expect(packFromSearch("?pack=everything")).toBeNull();
    expect(packFromSearch("")).toBeNull();
  });
});

describe("the 18+ tap", () => {
  it("is remembered for the tab, and a phone without storage is simply asked again", () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => void store.set(k, v) };
    expect(adultConfirmed(storage)).toBe(false);
    confirmAdult(storage);
    expect(store.get(ADULT_KEY)).toBe("yes");
    expect(adultConfirmed(storage)).toBe(true);
    const broken = {
      getItem: () => {
        throw new Error("blocked");
      },
      setItem: () => {
        throw new Error("blocked");
      },
    };
    expect(adultConfirmed(broken)).toBe(false);
    expect(() => confirmAdult(broken)).not.toThrow();
    expect(adultConfirmed(null)).toBe(false);
  });
});

describe("dealing a pack on two phones", () => {
  const deep = { pack: "deep" as const, cards: PACK_CARDS.deep.know! };
  const far = { pack: "distance" as const, cards: PACK_CARDS.distance.rather! };

  it("deals the same pack questions on both phones and carries them, so only the host needs the pack", () => {
    const host = newKnow(seedOf("KJQD"), 0, deep);
    expect(host.pack).toBe("deep");
    expect(host.order).toHaveLength(KNOW_ROUNDS);
    expect(host.cards).toHaveLength(KNOW_ROUNDS);
    expect(host.order).toEqual(host.cards!.map((q) => q.id));
    expect(newKnow(seedOf("KJQD"), 0, deep).order).toEqual(host.order);
    expect(newKnow(seedOf("KJQD"), 1, deep).order).not.toEqual(host.order);
    // The guest has only the state that arrived: the question comes from it, not from its own files.
    const guest = JSON.parse(JSON.stringify(host)) as typeof host;
    expect(knowQuestion(guest)?.id).toBe(host.order[0]);
    expect(deep.cards.some((q) => q.id === knowQuestion(guest)?.id)).toBe(true);
    // Moves work the same on a pack's questions.
    let s = knowReduce(host, { type: "answer", player: 0, self: 0, guess: 1 });
    s = knowReduce(s, { type: "answer", player: 1, self: 1, guess: 0 });
    s = knowReduce(s, { type: "next" });
    expect(s.round).toBe(1);
    expect(s.cards).toBe(host.cards);
  });

  it("leaves the free game as it was: no pack, no cards in the state", () => {
    const free = newKnow(seedOf("KJQD"));
    expect(free.pack).toBeUndefined();
    expect(free.cards).toBeUndefined();
    expect(KNOW_QUESTIONS.some((q) => q.id === knowQuestion(free)?.id)).toBe(true);
    expect(newRather(seedOf("KJQD")).cards).toBeUndefined();
  });

  it("does the same for would you rather", () => {
    const s = newRather(seedOf("WXYZ"), 0, far);
    expect(s.pack).toBe("distance");
    expect(s.order).toHaveLength(RATHER_ROUNDS);
    expect(ratherPair(JSON.parse(JSON.stringify(s)))?.id).toBe(s.order[0]);
    expect(far.cards.some((p) => p.id === ratherPair(s)?.id)).toBe(true);
    const picked = ratherReduce(ratherReduce(s, { type: "pick", player: 0, side: 1 }), { type: "pick", player: 1, side: 1 });
    expect(picked.picks[0][s.order[0]]).toBe(1);
  });
});

describe("where the cards live", () => {
  /** Every .ts/.tsx file under a folder. */
  const files = (dir: string): string[] =>
    readdirSync(dir).flatMap((name) => {
      const path = join(dir, name);
      return statSync(path).isDirectory() ? files(path) : /\.tsx?$/.test(name) ? [path] : [];
    });

  it("only the server reads a pack's cards: nothing a phone downloads imports them", () => {
    const root = join(__dirname, "../../src");
    const offenders = files(root).filter((path) => {
      if (path.endsWith(join("lib", "games", "pack-actions.ts")) || path.endsWith(join("lib", "games", "pack-cards.ts"))) return false;
      const source = readFileSync(path, "utf8");
      // A type is erased before anything is bundled; a value import would ship the cards.
      return /^import\s+(?!type\s)[^;]*from\s+["'](@\/lib\/games\/pack-cards|\.\/pack-cards)["']/m.test(source);
    });
    expect(offenders).toEqual([]);
  });
});
