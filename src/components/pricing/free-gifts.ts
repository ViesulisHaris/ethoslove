import { noteForEveryone, noteShare, sendsFree } from "@/lib/gift/free-tier";
import type { TemplateManifest } from "@/templates/types";

type Sendable = Pick<TemplateManifest, "slug" | "tier" | "features">;

/**
 * What /pricing says is free and what it says is paid, from one place (PLAN-pricing.md, addendum of
 * 24 Nov 2026): the gifts `sendsFree` lets go out free, and every other one. The gallery reads the
 * same rule, so a count or a name on this page cannot disagree with it, whichever way the free-note
 * setting is. `note`: the free version is The Letter's short note, and the words about what is free
 * are the ones written for it.
 */
export function pricingGifts<T extends Sendable>(manifests: readonly T[], share: number = noteShare()): { free: T[]; paid: T[]; note: boolean } {
  return {
    free: manifests.filter((m) => sendsFree(m, share)),
    paid: manifests.filter((m) => !sendsFree(m, share)),
    note: noteForEveryone(share),
  };
}

/**
 * The questions with the free tier's answer as the setting has it: with the note for everyone, the
 * answer written for the note (`pricing.faqFreeNote`) stands in for the one that lists two full free
 * templates. The page and its structured data read the same list.
 */
export function withFreeAnswer<T extends { id?: string; a: string }>(faq: readonly T[], note: boolean, noteAnswer: string): T[] {
  return faq.map((item) => (note && item.id === "free" ? { ...item, a: noteAnswer } : item));
}

/** The keys of messages `pricing.page` the head's italic line can be. */
export type HeadLineKey = "lineOne" | "lineTwo" | "lineNone" | "lineOneSubs" | "lineTwoSubs";

/**
 * The head's italic line: which gifts are free, said from the list itself, so it never names a gift that
 * is sold. "No subscription." leads it only while there is none on the page: with subscriptions on, the
 * band below sells a renewing plan, and the line says only what is free (or nothing, if nothing is).
 */
export function headLine<T>(free: readonly T[], subscriptions: boolean): { key: HeadLineKey; name?: T } | null {
  const subs = subscriptions ? "Subs" : "";
  if (free.length === 1) return { key: `lineOne${subs}` as HeadLineKey, name: free[0] };
  if (free.length === 2) return { key: `lineTwo${subs}` as HeadLineKey };
  return subscriptions ? null : { key: "lineNone" };
}
