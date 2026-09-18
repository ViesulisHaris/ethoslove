/** Every stem a sender can pick, with the colours it comes in. The art lives in art.tsx. */
export const FLOWER_IDS = [
  "rose",
  "peony",
  "ranunculus",
  "tulip",
  "sunflower",
  "lily",
  "hydrangea",
  "poppy",
  "cosmos",
  "daisy",
  "lavender",
  "gypsophila",
  "eucalyptus",
  "fern",
] as const;

export type FlowerId = (typeof FLOWER_IDS)[number];
/** focal: a bloom in the dome · filler: sprays between blooms · green: leaves behind everything. */
export type Role = "focal" | "filler" | "green";
export type Tone = { light: string; mid: string; deep: string };

type Flower = { role: Role; size: number; name: { en: string; es: string }; colors: Record<string, Tone> };

export const MAX_STEMS = 24;

/**
 * What a new bouquet starts with: soft, and full enough to look finished in the first preview.
 * Kept here, not in ./schema, so the homepage's hero can draw it without downloading zod.
 */
export const DEFAULT_STEMS: { flower: FlowerId; color: string; count: number }[] = [
  { flower: "peony", color: "blush", count: 2 },
  { flower: "rose", color: "blush", count: 2 },
  { flower: "ranunculus", color: "peach", count: 3 },
  { flower: "rose", color: "white", count: 2 },
  { flower: "gypsophila", color: "white", count: 2 },
  { flower: "eucalyptus", color: "sage", count: 2 },
];

export const FLOWERS: Record<FlowerId, Flower> = {
  rose: {
    role: "focal",
    size: 0.95,
    name: { en: "Rose", es: "Rosa" },
    colors: {
      red: { light: "#EE6B72", mid: "#C22D40", deep: "#7E1426" },
      blush: { light: "#FCDADA", mid: "#F2A7AE", deep: "#C96F7D" },
      white: { light: "#FFFDF8", mid: "#F3EBDD", deep: "#CDBC9E" },
      peach: { light: "#FFDCC4", mid: "#F5AE84", deep: "#C97650" },
      yellow: { light: "#FFF1B0", mid: "#F6D05A", deep: "#C99522" },
    },
  },
  peony: {
    role: "focal",
    size: 1.15,
    name: { en: "Peony", es: "Peonía" },
    colors: {
      blush: { light: "#FDE3E8", mid: "#F4AFC0", deep: "#D2718E" },
      coral: { light: "#FFD8CA", mid: "#F79B84", deep: "#D2604E" },
      white: { light: "#FFFFFF", mid: "#F5EEE8", deep: "#D6C8BC" },
      magenta: { light: "#F9C2DD", mid: "#E0609E", deep: "#9E2A66" },
    },
  },
  ranunculus: {
    role: "focal",
    size: 0.8,
    name: { en: "Ranunculus", es: "Ranúnculo" },
    colors: {
      peach: { light: "#FFE4D2", mid: "#FBBC96", deep: "#D98159" },
      pink: { light: "#FFDCE5", mid: "#F6A2B9", deep: "#CF6184" },
      cream: { light: "#FFFBF0", mid: "#F5E9CD", deep: "#D5BE92" },
      orange: { light: "#FFD5A3", mid: "#FB9C4A", deep: "#CF621C" },
    },
  },
  tulip: {
    role: "focal",
    size: 0.9,
    name: { en: "Tulip", es: "Tulipán" },
    colors: {
      red: { light: "#F57B7B", mid: "#D6333F", deep: "#951829" },
      pink: { light: "#FFC9D6", mid: "#F58CAB", deep: "#CC4F78" },
      yellow: { light: "#FFF3A8", mid: "#FBD34D", deep: "#D69A1E" },
      white: { light: "#FFFFFF", mid: "#F1EEE4", deep: "#CFC7B2" },
      purple: { light: "#D2B3F4", mid: "#8F5BD6", deep: "#552A94" },
    },
  },
  sunflower: {
    role: "focal",
    size: 1.1,
    name: { en: "Sunflower", es: "Girasol" },
    colors: { yellow: { light: "#FFE36E", mid: "#FBC02D", deep: "#CF7C16" } },
  },
  lily: {
    role: "focal",
    size: 1.05,
    name: { en: "Lily", es: "Lirio" },
    colors: {
      white: { light: "#FFFFFF", mid: "#F6F2EA", deep: "#D6CBB6" },
      pink: { light: "#FFD6E6", mid: "#F48AB5", deep: "#BE3B74" },
      orange: { light: "#FFCC91", mid: "#F7913A", deep: "#C45218" },
    },
  },
  hydrangea: {
    role: "focal",
    size: 1.15,
    name: { en: "Hydrangea", es: "Hortensia" },
    colors: {
      blue: { light: "#D2E2F8", mid: "#93B4EA", deep: "#5578C2" },
      lilac: { light: "#E8D9F6", mid: "#C2A3E6", deep: "#8663BD" },
      pink: { light: "#FFDDE8", mid: "#F3A6C0", deep: "#C9638B" },
      white: { light: "#F9FBF4", mid: "#E3ECD6", deep: "#B4C69E" },
    },
  },
  poppy: {
    role: "focal",
    size: 0.95,
    name: { en: "Poppy", es: "Amapola" },
    colors: {
      red: { light: "#FF7B6B", mid: "#E3312B", deep: "#A11518" },
      orange: { light: "#FFB978", mid: "#F7862C", deep: "#C94F16" },
      white: { light: "#FFFFFF", mid: "#F2EFEA", deep: "#CEC6BA" },
      pink: { light: "#FFC7D3", mid: "#F58AA3", deep: "#CE4E73" },
    },
  },
  cosmos: {
    role: "focal",
    size: 0.8,
    name: { en: "Cosmos", es: "Cosmos" },
    colors: {
      pink: { light: "#FFD6E6", mid: "#F59BC0", deep: "#CF5690" },
      magenta: { light: "#F7A6D1", mid: "#D84C94", deep: "#9A205F" },
      white: { light: "#FFFFFF", mid: "#F6F2F4", deep: "#D4C8CF" },
    },
  },
  daisy: {
    role: "focal",
    size: 0.7,
    name: { en: "Daisy", es: "Margarita" },
    colors: {
      white: { light: "#FFFFFF", mid: "#F4F5F8", deep: "#C9CEDA" },
      pink: { light: "#FFE6EE", mid: "#F9BBD0", deep: "#D9809F" },
    },
  },
  lavender: {
    role: "filler",
    size: 1,
    name: { en: "Lavender", es: "Lavanda" },
    colors: { purple: { light: "#C9B8EF", mid: "#9479D6", deep: "#5F45A6" } },
  },
  gypsophila: {
    role: "filler",
    size: 1,
    name: { en: "Baby's breath", es: "Paniculata" },
    colors: { white: { light: "#FFFFFF", mid: "#F4F4F0", deep: "#C9C9BD" } },
  },
  eucalyptus: {
    role: "green",
    size: 1,
    name: { en: "Eucalyptus", es: "Eucalipto" },
    colors: { sage: { light: "#CAD8C6", mid: "#9DB5A0", deep: "#62806B" } },
  },
  fern: {
    role: "green",
    size: 1,
    name: { en: "Fern", es: "Helecho" },
    colors: { green: { light: "#A6CB97", mid: "#6D9E61", deep: "#3F6B3A" } },
  },
};

export const COLOR_NAMES: Record<string, { en: string; es: string }> = {
  red: { en: "Red", es: "Rojo" },
  blush: { en: "Blush", es: "Rosa palo" },
  white: { en: "White", es: "Blanco" },
  peach: { en: "Peach", es: "Melocotón" },
  yellow: { en: "Yellow", es: "Amarillo" },
  coral: { en: "Coral", es: "Coral" },
  magenta: { en: "Magenta", es: "Magenta" },
  pink: { en: "Pink", es: "Rosa" },
  cream: { en: "Cream", es: "Crema" },
  orange: { en: "Orange", es: "Naranja" },
  purple: { en: "Purple", es: "Morado" },
  blue: { en: "Blue", es: "Azul" },
  lilac: { en: "Lilac", es: "Lila" },
  sage: { en: "Sage", es: "Salvia" },
  green: { en: "Green", es: "Verde" },
};

/** The colour a stem asked for, or the flower's first colour if it no longer exists. */
export function toneOf(id: FlowerId, color: string): { color: string; tone: Tone } {
  const colors = FLOWERS[id].colors;
  const key = color in colors ? color : Object.keys(colors)[0];
  return { color: key, tone: colors[key] };
}
