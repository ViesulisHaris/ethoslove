import type { CoverId } from "@/lib/gift/schema";
import { LOOKS as COQUETTE, type LookId as CoquetteLookId } from "../../coquette/looks";
import { LOOKS as XOXO, type LookId as XoxoLookId } from "../../xoxo/looks";
import { COVER_LOOKS, gingham, lining, type CoverLook, type Cut } from "./looks";

/** The colour a gift's fields name, or the template's first when they name none it has. */
function lookOf<L extends string>(looks: Record<L, unknown>, fields: unknown, fallback: L): L {
  const look = (fields as { look?: unknown } | null | undefined)?.look;
  return typeof look === "string" && look in looks ? (look as L) : fallback;
}

const toned = (cut: Cut, tone: string | undefined): Cut => (tone ? { ...cut, tone } : cut);

/**
 * Lilies, the cover made in Coquette's image, in one of Coquette's colours: the page's gingham, the
 * satin for the envelope, and the pink flowers, the bow and the wax turned that colour with the
 * filters Coquette's own page uses.
 */
function liliesIn(id: CoquetteLookId): CoverLook {
  const lilies = COVER_LOOKS.lilies;
  const { piece } = lilies;
  if (id === "blush" || piece.kind !== "envelope") return lilies;
  // Something blue is the same cover made with real blue flowers, which no filter can match.
  if (id === "blue") return { ...COVER_LOOKS.bluebell, id: "lilies" };
  const look = COQUETTE[id];
  const { sealArt } = piece.colors;
  return {
    ...lilies,
    background: gingham(look.check, look.wall),
    script: look.satin.deep,
    hint: look.card.soft,
    piece: {
      kind: "envelope",
      colors: { ...piece.colors, body: look.tape, flap: look.card.card, inner: look.satin.mid, seal: look.card.bar, letter: look.paper, liner: lining(look.frameCheck, look.paper), sealArt: sealArt && { ...sealArt, cut: toned(sealArt.cut, look.tint) } },
    },
    stickers: lilies.stickers.map((s) => (s.cut ? { ...s, cut: toned(s.cut, look.bloom) } : s)),
    attach: lilies.attach?.map((a) => ({ ...a, cut: toned(a.cut, look.tint) })),
    ambience: { ...look.ambience[0], count: lilies.ambience?.count ?? look.ambience[0].count },
    confetti: look.confetti,
  };
}

/**
 * Kisses, the cover made in XOXO's image, on one of XOXO's pages: the wall and the envelope change,
 * and the lace and the lipstick stay red, as they do on every XOXO page.
 */
function kissesIn(id: XoxoLookId): CoverLook {
  const kisses = COVER_LOOKS.kisses;
  const { piece } = kisses;
  if (id === "cream" || piece.kind !== "envelope") return kisses;
  const look = XOXO[id];
  return {
    ...kisses,
    tone: look.dark ? "dark" : "light",
    background: `radial-gradient(90% 55% at 50% 0%, color-mix(in srgb, ${look.red} ${look.dark ? 24 : 10}%, transparent), transparent 70%), ${look.wall}`,
    script: look.red,
    hint: `color-mix(in srgb, ${look.red} 70%, ${look.ink})`,
    piece: {
      kind: "envelope",
      colors: {
        ...piece.colors,
        body: look.envelope.body,
        flap: look.envelope.flap,
        inner: look.envelope.lining,
        seal: look.red,
        letter: look.paper,
        liner: `radial-gradient(rgba(255,255,255,.3) calc(.35*var(--u)), transparent calc(.45*var(--u))) 0 0/calc(3*var(--u)) calc(3*var(--u)), ${look.envelope.lining}`,
      },
    },
    ambience: { kind: "hearts", colors: [look.red, look.confetti[2], "#ffffff"], count: kisses.ambience?.count ?? 8 },
    confetti: look.confetti,
  };
}

/**
 * The cover a gift opens on, in the gift's own colours where it has some. XOXO and Coquette come in
 * several colours, and each has a cover made in its image, Kisses and Lilies: those follow the
 * colour the sender picked, so a lilac XOXO opens on a lilac Kisses. Every other cover is a theme of
 * its own (a night sky, a birthday, a picnic) and stays as it is.
 */
export function coverFor(id: Exclude<CoverId, "classic">, slug: string, fields: unknown): CoverLook {
  if (slug === "xoxo" && id === "kisses") return kissesIn(lookOf(XOXO, fields, "cream"));
  if (slug === "coquette" && id === "lilies") return liliesIn(lookOf(COQUETTE, fields, "blush"));
  return COVER_LOOKS[id];
}
