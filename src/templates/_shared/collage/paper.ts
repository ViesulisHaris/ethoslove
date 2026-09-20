import { mulberry32 } from "../random";

export type TornSides = { top?: boolean; right?: boolean; bottom?: boolean; left?: boolean };

const r1 = (n: number) => Math.round(n * 10) / 10;

/**
 * A CSS polygon for a sheet torn along some of its sides: the torn ones wander inwards by up to
 * `depth` percent, the others stay ruler-straight. The same seed tears the same edge every time,
 * on the server, in the browser and on replay.
 */
export function tornPolygon(seed: number, sides: TornSides, depth = 3, steps = 16): string {
  const random = mulberry32(seed);
  const jag = () => r1(random() * depth);
  const points: string[] = [];
  for (let i = 0; i <= steps; i++) points.push(`${r1((i / steps) * 100)}% ${sides.top ? jag() : 0}%`);
  for (let i = 1; i <= steps; i++) points.push(`${sides.right ? r1(100 - jag()) : 100}% ${r1((i / steps) * 100)}%`);
  for (let i = steps - 1; i >= 0; i--) points.push(`${r1((i / steps) * 100)}% ${sides.bottom ? r1(100 - jag()) : 100}%`);
  for (let i = steps - 1; i >= 1; i--) points.push(`${sides.left ? jag() : 0}% ${r1((i / steps) * 100)}%`);
  return `polygon(${points.join(", ")})`;
}

/** The sender's own words with the markup taken out, for writing faintly across a sheet. */
export function plainWords(message: string): string[] {
  return message
    .replace(/[*_~`#>]/g, " ")
    .split(/\s+/)
    .map((w) => w.trim())
    .filter(Boolean);
}

/**
 * Lines of handwriting for the back of a letter: the sender's words, started somewhere different
 * on every line, and topped up with the house words when the message is short.
 */
export function scriptLines(message: string, house: string, count: number, seed: number, perLine = 7): string[] {
  const own = plainWords(message);
  const words = own.length >= 12 ? own : [...own, ...plainWords(house)];
  if (words.length === 0) return [];
  const random = mulberry32(seed);
  return Array.from({ length: count }, () => {
    const start = Math.floor(random() * words.length);
    return Array.from({ length: perLine }, (_, i) => words[(start + i) % words.length]).join(" ");
  });
}

/** Two crossed bands of one colour: gingham. `size` is one check, as any CSS length. */
export const gingham = (band: string, size: string) => ({
  backgroundImage: `linear-gradient(90deg, ${band} 50%, transparent 50%), linear-gradient(${band} 50%, transparent 50%)`,
  backgroundSize: `calc(2 * ${size}) calc(2 * ${size})`,
});

/** A six-figure number that looks stamped: the same for the same two people. */
export const ticketNumber = (seed: number): string => String(100000 + (seed % 900000));

/** Their first letters, for engraving: "A + M". */
export function initials(a: string, b: string): string {
  const first = (name: string) => [...name.trim()][0]?.toUpperCase() ?? "";
  return [first(a), first(b)].filter(Boolean).join(" + ");
}
