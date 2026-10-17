import type { GameKey } from "./catalogue";

type L = { en: string; es: string };

/**
 * The paid game packs: what the shelf shows before anybody owns one. The cards themselves live in
 * pack-cards.ts, which only the server reads (pack-actions.ts), so a pack reaches a phone when its
 * owner opens it and not in every visitor's download. Nothing here may import that file.
 */
export const PACK_IDS = ["deep", "distance", "spicy"] as const;
export type PackId = (typeof PACK_IDS)[number];

export const PACK_NAMES: Record<PackId, L> = {
  deep: { en: "After a year", es: "Después de un año" },
  distance: { en: "Miles apart", es: "A kilómetros" },
  spicy: { en: "After dark", es: "A media luz" },
};

export const isPackId = (value: unknown): value is PackId => typeof value === "string" && (PACK_IDS as readonly string[]).includes(value);

export type PackInfo = {
  id: PackId;
  name: L;
  blurb: L;
  back: "gold" | "ocean" | "wine";
  /** The games it deals into; the base game stays free and a pack is a second deck beside it. */
  games: GameKey[];
  /** Every card in it, counted once (pack-cards.ts is checked against this in the tests). */
  cards: number;
  /** Opens only after an 18+ tap, remembered for the tab. */
  adult: boolean;
  /** Three real cards from the pack, shown in the sheet before anybody pays. */
  samples: [L, L, L];
};

export const PACKS: Record<PackId, PackInfo> = {
  deep: {
    id: "deep",
    name: PACK_NAMES.deep,
    blurb: { en: "The questions you only get to ask once you've shared a bathroom for a while.", es: "Las preguntas que solo se hacen cuando ya lleváis un tiempo compartiendo baño." },
    back: "gold",
    games: ["deck", "know"],
    cards: 40,
    adult: false,
    samples: [
      { en: "What's a habit of mine you've quietly adopted?", es: "¿Qué costumbre mía has adoptado sin darte cuenta?" },
      { en: "When we argue about the dishes, what are we really arguing about?", es: "Cuando discutimos por los platos, ¿por qué discutimos en realidad?" },
      { en: "What's a question you've been scared to ask me?", es: "¿Qué pregunta te ha dado miedo hacerme?" },
    ],
  },
  distance: {
    id: "distance",
    name: PACK_NAMES.distance,
    blurb: { en: "For two screens: the calls, the visits, the time zones and the day it ends.", es: "Para dos pantallas: las llamadas, las visitas, los husos horarios y el día en que se acaba." },
    back: "ocean",
    games: ["deck", "rather"],
    cards: 40,
    adult: false,
    samples: [
      { en: "What do you do in the first hour after we hang up?", es: "¿Qué haces en la primera hora después de colgar?" },
      { en: "What tradition could we start that works across two time zones?", es: "¿Qué tradición podríamos empezar que funcione con dos husos horarios?" },
      { en: "What do you miss that's so small you'd feel silly saying it?", es: "¿Qué echas de menos que es tan pequeño que te da vergüenza decirlo?" },
    ],
  },
  spicy: {
    id: "spicy",
    name: PACK_NAMES.spicy,
    blurb: { en: "Flirty and a little bold, never explicit. For two adults, later in the evening.", es: "Coquetas y un poco atrevidas, nunca explícitas. Para dos personas adultas, ya entrada la noche." },
    back: "wine",
    games: ["deck", "dare", "rather"],
    cards: 40,
    adult: true,
    samples: [
      { en: "What's the most attractive thing I do without realising?", es: "¿Qué es lo más atractivo que hago sin darme cuenta?" },
      { en: "Give me three kisses: one sweet, one silly, one that means business.", es: "Dame tres besos: uno tierno, uno tonto y uno que vaya en serio." },
      { en: "What's a compliment about me you've been saving?", es: "¿Qué piropo sobre mí te has estado guardando?" },
    ],
  },
};

/** The packs that deal into a game, in shelf order. */
export const packsFor = (game: GameKey): PackId[] => PACK_IDS.filter((id) => PACKS[id].games.includes(game));

/* ------------------------------------------------------------------ who may open what */

/**
 * Whether the `packs` of GET /api/entitlements open a pack: it lists pack ids, and "*" when every
 * pack is covered (Ethos for Two). A "pack:" prefix, as the rows themselves carry it, reads the same.
 */
export function packUnlocked(packs: readonly string[], id: PackId): boolean {
  return packs.some((entry) => {
    const slug = entry.startsWith("pack:") ? entry.slice("pack:".length) : entry;
    return slug === id || slug === "*";
  });
}

/**
 * The same question asked of template_unlocks rows, as the server reads them: "pack:<id>", or
 * "pack:*" from a pass. A bare "*" there is Everything, every gift template, and opens no pack.
 */
export function rowsUnlockPack(rows: readonly string[], id: PackId): boolean {
  return rows.includes(`pack:${id}`) || rows.includes("pack:*");
}

/** How a pack sits on the shelf: to buy, bought, or came with Ethos for Two. */
export type PackAccess = "locked" | "owned" | "pass";

export function packAccess(packs: readonly string[], hasPass: boolean, id: PackId): PackAccess {
  if (!packUnlocked(packs, id)) return "locked";
  // While a pass runs, every pack is listed (the "*" and each id), a bought one included, so the
  // two can't be told apart; "included" is true of both, and a bought pack reads "yours" again once
  // the pass ends and the "*" goes.
  const everyPack = packs.some((entry) => entry === "*" || entry === "pack:*");
  return hasPass && everyPack ? "pass" : "owned";
}

/* ------------------------------------------------------------------ the 18+ tap */

export const ADULT_KEY = "ethos.games.adult";

/** Asked once per tab: sessionStorage, so a shared or borrowed phone asks the next person again. */
export function adultConfirmed(storage: Pick<Storage, "getItem"> | null): boolean {
  try {
    return storage?.getItem(ADULT_KEY) === "yes";
  } catch {
    return false;
  }
}

export function confirmAdult(storage: Pick<Storage, "setItem"> | null): void {
  try {
    storage?.setItem(ADULT_KEY, "yes");
  } catch {
    // No storage (a private window, a blocked site): the tap is asked again next time, nothing worse.
  }
}

/* ------------------------------------------------------------------ buying one */

/**
 * The body for POST /api/stripe/checkout. No amount travels: the server prices a pack from its own
 * catalogue. The buyer comes back to the game they were on with `?pack=` set, and the pack opens.
 */
export function packCheckoutBody(id: PackId, at: { pathname: string; locale: "en" | "es"; ref?: string }) {
  return {
    product: "pack" as const,
    packId: id,
    returnTo: packReturnPath(at.pathname, id),
    locale: at.locale,
    currency: "eur" as const,
    ...(at.ref ? { ref: at.ref } : {}),
  };
}

/** Back to the same game, pack in hand. A room code is dropped: that room is long gone by then. */
export function packReturnPath(pathname: string, id: PackId): string {
  const path = pathname.startsWith("/") && !pathname.startsWith("//") ? pathname.split(/[?#]/)[0] : "/games";
  return `${path}?pack=${id}`;
}

/** The pack a returning buyer asked for, from the page's query string. */
export function packFromSearch(search: string): PackId | null {
  const id = new URLSearchParams(search).get("pack");
  return isPackId(id) ? id : null;
}
