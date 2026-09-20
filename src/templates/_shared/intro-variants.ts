import type { TemplateManifest } from "../types";

/**
 * The opening screen is the first frame of every gift, and the first frame of every video
 * someone records of one. Each variant is a different room to walk into; the template picks
 * the one that matches the world it is about to show.
 */
export type IntroVariant = "starlight" | "paper" | "curtain" | "petals";

export type IntroLook = {
  /** Behind everything. Uses the gift accent so it inherits the sender's colour. */
  background: string;
  /** Colour of the type and the hairline. */
  ink: string;
  /** Faint drifting shapes: how many, and how they are drawn. */
  motes: { count: number; kind: "star" | "dust" | "petal" | "ember" };
};

const LOOKS: Record<IntroVariant, IntroLook> = {
  // Deep night, slow stars. For skies, journeys and anything that happens after dark.
  starlight: {
    background:
      "radial-gradient(90% 55% at 50% 8%, rgba(var(--gift-accent-rgb), 0.16), transparent 62%), radial-gradient(120% 80% at 50% 42%, #16224a 0%, #0b1230 45%, #050815 100%)",
    ink: "#F4EFE7",
    motes: { count: 34, kind: "star" },
  },
  // Warm paper under a low lamp. For letters, handwriting and anything on a table.
  paper: {
    background:
      "radial-gradient(95% 60% at 50% 12%, rgba(var(--gift-accent-rgb), 0.24), transparent 60%), radial-gradient(120% 85% at 50% 40%, #3a2617 0%, #22160d 48%, #100a06 100%)",
    ink: "#F6EFE3",
    motes: { count: 22, kind: "dust" },
  },
  // Velvet and a single spotlight. For shows, reveals and anything with a curtain.
  curtain: {
    background:
      "radial-gradient(70% 45% at 50% 0%, rgba(var(--gift-accent-rgb), 0.38), transparent 68%), radial-gradient(130% 90% at 50% 45%, #4a1116 0%, #2a0a0e 45%, #0e0405 100%)",
    ink: "#F7EDE9",
    motes: { count: 18, kind: "ember" },
  },
  // Soft light, drifting petals. For the playful and the sweet.
  petals: {
    background:
      "radial-gradient(100% 60% at 50% 10%, rgba(var(--gift-accent-rgb), 0.34), transparent 62%), radial-gradient(125% 85% at 50% 42%, #48212e 0%, #2a1119 46%, #120709 100%)",
    ink: "#F9EFF0",
    motes: { count: 24, kind: "petal" },
  },
};

/** Slugs whose world is unmistakable, before we fall back to the manifest's styles. */
const BY_SLUG: Record<string, IntroVariant> = {
  constellations: "starlight",
  "midnight-countdown": "starlight",
  passport: "starlight",
  "the-letter": "paper",
  "jar-of-reasons": "paper",
  "our-timeline": "paper",
  "front-page": "paper",
  "birthday-cinema": "curtain",
  vinyl: "curtain",
  museum: "curtain",
  bloom: "petals",
  garden: "petals",
  bouquet: "petals",
  kawaii: "petals",
  "fortune-cookie": "petals",
  "scratch-card": "petals",
  arcade: "petals",
  "text-thread": "petals",
  halfway: "petals",
  "snow-globe": "starlight",
  "recipe-box": "paper",
  "cap-toss": "curtain",
  "paper-crane": "paper",
  "the-toast": "curtain",
  fireside: "paper",
  "trick-or-treat": "starlight",
  scrapbook: "paper",
  balloons: "petals",
  "party-animals": "paper",
  "the-council": "curtain",
  "sticker-bomb": "paper",
  coquette: "petals",
  xoxo: "paper",
  keepsake: "paper",
  "popup-card": "paper",
  sketchbook: "paper",
};

export function introVariantFor(slug: string, manifest?: TemplateManifest): IntroVariant {
  const known = BY_SLUG[slug];
  if (known) return known;
  const styles = manifest?.styles ?? [];
  if (styles.includes("retro")) return "curtain";
  if (styles.includes("playful")) return "petals";
  if (styles.includes("romantic")) return "paper";
  if (styles.includes("cinematic") || styles.includes("3d")) return "starlight";
  return "starlight";
}

export function introLook(variant: IntroVariant): IntroLook {
  return LOOKS[variant];
}
