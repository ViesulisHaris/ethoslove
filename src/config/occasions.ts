export const OCCASIONS = [
  "birthday",
  "anniversary",
  "valentines",
  "wedding",
  "graduation",
  "christmas",
  "halloween",
  "mothers-day",
  "fathers-day",
  "apology",
  "long-distance",
  "just-because",
] as const;

export type Occasion = (typeof OCCASIONS)[number];

export function isOccasion(value: string): value is Occasion {
  return (OCCASIONS as readonly string[]).includes(value);
}

/**
 * Presentation metadata that is not translatable (translations live in messages/*.json
 * under `occasions.<slug>`).
 */
export const OCCASION_META: Record<
  Occasion,
  { emoji: string; accent: string; /** Month (1-12) the occasion peaks, for seasonal ordering. */ peakMonth?: number }
> = {
  birthday: { emoji: "🎂", accent: "#E8604C" },
  anniversary: { emoji: "💍", accent: "#D4A853" },
  valentines: { emoji: "💌", accent: "#E8604C", peakMonth: 2 },
  wedding: { emoji: "🤍", accent: "#D4A853", peakMonth: 6 },
  graduation: { emoji: "🎓", accent: "#1A1614" },
  christmas: { emoji: "🎄", accent: "#2F6B4F", peakMonth: 12 },
  halloween: { emoji: "🎃", accent: "#E5772F", peakMonth: 10 },
  "mothers-day": { emoji: "🌷", accent: "#F4C7C3", peakMonth: 5 },
  "fathers-day": { emoji: "🧭", accent: "#2E4A62", peakMonth: 6 },
  apology: { emoji: "🕊️", accent: "#8C7B6B" },
  "long-distance": { emoji: "✈️", accent: "#2E4A62" },
  "just-because": { emoji: "✨", accent: "#E8604C" },
};
