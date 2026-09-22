import { z } from "zod";
import type { WentAs } from "@/lib/supabase/types";

/** What a review looks like on the way in. Short on purpose: it is a line for the next couple, not an essay. */
export const reviewInput = z.object({
  placeId: z.string().regex(/^(node|way|relation)\/\d{1,15}$/),
  stars: z.number().int().min(1).max(5),
  cost: z.number().int().min(0).max(3).nullable().optional(),
  wentAs: z.enum(["first", "date", "anniversary", "birthday", "friends"]).nullable().optional(),
  body: z.string().trim().max(400).optional(),
  placeName: z.string().trim().min(1).max(120),
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  locale: z.enum(["en", "es"]).optional(),
});
export type ReviewInput = z.infer<typeof reviewInput>;

/** A review as the page shows it: no user ids, a first name only, and only the fields anyone should see. */
export type PublicReview = { id: string; stars: number; cost: number | null; wentAs: WentAs | null; body: string | null; name: string; createdAt: string; mine: boolean };

/** Links, phone numbers and shouting are not a review of a café. */
export function cleanBody(body: string | undefined): string | null {
  if (!body) return null;
  const text = body.replace(/https?:\/\/\S+|www\.\S+/gi, "").replace(/\+?\d[\d\s().-]{7,}\d/g, "").replace(/\s+/g, " ").trim();
  if (!text) return null;
  const letters = text.replace(/[^a-zà-ÿ]/gi, "");
  const upper = letters.replace(/[^A-ZÀ-Ý]/g, "").length;
  return letters.length > 12 && upper / letters.length > 0.7 ? text.toLowerCase() : text;
}

/** The name on a review: a first name, and "Somebody" when the profile has none. */
export const firstName = (name: string | null | undefined, fallback: string): string => {
  const first = (name ?? "").trim().split(/\s+/)[0];
  return first ? first.slice(0, 24) : fallback;
};

export const WENT_AS_LABELS: Record<WentAs, { en: string; es: string }> = {
  first: { en: "First date", es: "Primera cita" },
  date: { en: "Date night", es: "Cita" },
  anniversary: { en: "Anniversary", es: "Aniversario" },
  birthday: { en: "Birthday", es: "Cumpleaños" },
  friends: { en: "With friends", es: "Con amigos" },
};
export const WENT_AS_IDS = Object.keys(WENT_AS_LABELS) as WentAs[];
