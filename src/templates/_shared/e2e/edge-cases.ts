import type { GiftData, GiftLocale, GiftPhoto } from "@/lib/gift/schema";
import { describeObjectSchema, type FieldDescriptor } from "@/lib/editor/zod-describe";
import type { TemplateModule } from "../../types";
import { loadTemplate } from "../../registry";
import { DEMO_PHOTOS } from "../demo-photos";

/**
 * Edge cases of a template's demo gift, for the template sweep (tests/e2e/template-sweep.spec.ts)
 * and nothing else: the demo page reads `?e2e=<case>` only in builds made with NEXT_PUBLIC_E2E=1,
 * never on the site. Each case is something a real gift can hold:
 *
 * - `demo`: the demo itself, played as a recipient plays a gift.
 * - `empty`: no settings saved at all (an old gift, or one whose settings went missing).
 * - `quiet`: no message, set to fade in (an empty message used to leave some gifts without an end).
 * - `later`: a countdown a month away.
 * - `min`: the fewest photos the template takes, no extras, one-letter names, no message.
 * - `max`: the most photos, every text at its limit, a surprise and a countdown, the message faded in.
 * - `odd`: settings a live edit or an older schema can leave: numbers past their limits, empty
 *   lists, blank texts, an option that no longer exists.
 * - `options-<k>`: every choice field on its k-th option, so each option is seen once.
 */
export type EdgeCase = { data: GiftData; options: number };

const pool = Object.values(DEMO_PHOTOS) as GiftPhoto[];

const fill = (length: number, seed: string) => (seed.repeat(Math.ceil(length / seed.length)) || "x").slice(0, length).trimEnd().padEnd(length, "x");

const LONG_MESSAGE = fill(
  4000,
  "**Every year** I try to find words big enough, and every year *you* make them look small. Thank you for the coffee, the patience, the playlists and the bad jokes. 💛\n\n",
);

function photosOf(demo: GiftData, count: number, captions: boolean): GiftPhoto[] {
  const source = demo.photos.length ? demo.photos : pool;
  return Array.from({ length: count }, (_, i) => {
    const base = source[i % source.length];
    return { ...base, id: `${base.id}-${i}`, caption: captions ? fill(140, `Photo ${i + 1}: the day we said yes to everything. `) : undefined };
  });
}

/** A field this sweep may rewrite: plain values the editor's own widgets make, not a custom editor's. */
function plain(mod: TemplateModule, fields: Record<string, unknown>, d: FieldDescriptor): boolean {
  if (mod.fieldEditors?.[d.key]) return false;
  const value = fields[d.key];
  if (d.widget === "number") return value === undefined || typeof value === "number";
  if (d.widget === "list") return value === undefined || (Array.isArray(value) && value.every((v) => typeof v === "string"));
  if (d.widget === "text" || d.widget === "textarea") return value === undefined || typeof value === "string";
  return d.widget === "select" || d.widget === "boolean";
}

function mapFields(mod: TemplateModule, fields: Record<string, unknown>, change: (d: FieldDescriptor, value: unknown) => unknown): Record<string, unknown> {
  const out: Record<string, unknown> = { ...fields };
  for (const d of describeObjectSchema(mod.fieldsSchema as never)) {
    if (!plain(mod, fields, d)) continue;
    const next = change(d, fields[d.key]);
    if (next === undefined) delete out[d.key];
    else out[d.key] = next;
  }
  return out;
}

function optionCount(mod: TemplateModule): number {
  return Math.max(1, ...describeObjectSchema(mod.fieldsSchema as never).map((d) => (d.widget === "select" ? (d.options?.length ?? 1) : 1)));
}

export function edgeCase(mod: TemplateModule, locale: GiftLocale, name: string): GiftData | null {
  const demo = mod.demoData[locale] ?? mod.demoData.en;
  const fields = (demo.fields ?? {}) as Record<string, unknown>;
  const { min, max } = mod.manifest.features.photos;
  const features = mod.manifest.features;

  if (name === "demo") return demo;
  if (name === "empty") return { ...demo, fields: {} };
  // No message at all, faded in rather than typed: nothing to finish, and the gift still ends.
  // (No countdown either: a gift that waits for its moment waits, and this case is about the message.)
  if (name === "quiet") return { ...demo, message: "", messageStyle: "fade", countdown: undefined };
  if (name === "later")
    return { ...demo, countdown: features.countdown ? { targetAt: new Date(Date.now() + 30 * 86_400_000).toISOString(), timezone: "Europe/London", label: "Until our trip" } : demo.countdown };
  if (name === "min")
    return {
      ...demo,
      recipientName: "Zoë",
      senderName: "A",
      title: "",
      message: "",
      photos: photosOf(demo, min, false),
      music: undefined,
      voiceNote: undefined,
      video: undefined,
      countdown: undefined,
      surprise: undefined,
      dedication: undefined,
      unwrap: undefined,
      fields: mapFields(mod, fields, (d, value) => {
        if (d.widget === "list") return (Array.isArray(value) ? value : []).slice(0, d.minItems ?? 0);
        if (d.optional && d.defaultValue === undefined && (d.widget === "text" || d.widget === "textarea" || d.widget === "number")) return undefined;
        return value;
      }),
    };
  if (name === "max")
    return {
      ...demo,
      recipientName: fill(40, "Maximiliana Bartholomew-Kowalczyk-Ostrow "),
      senderName: fill(40, "Alexandros Konstantinopoulos-Whitfield "),
      title: fill(80, "For the one who makes every ordinary Tuesday feel like a holiday "),
      message: LONG_MESSAGE,
      // Typed out, 4000 letters take minutes; `min` plays the typed message (an empty one) instead.
      messageStyle: "fade",
      photos: photosOf(demo, max, features.captions),
      surprise: features.surprise ? { text: fill(600, "One more thing: pack a bag, we leave on Friday at six. "), reveal: "tap" } : demo.surprise,
      // Seconds away, so a gift that waits for its moment (Midnight Countdown) reaches it while played.
      countdown: features.countdown ? { targetAt: new Date(Date.now() + 8_000).toISOString(), timezone: "Europe/London", label: fill(80, "Until our next adventure together, wherever it takes us ") } : demo.countdown,
      fields: mapFields(mod, fields, (d, value) => {
        if (d.widget === "number") return d.max ?? value;
        if (d.widget === "text" || d.widget === "textarea") return d.maxLength ? fill(d.maxLength, "The longest line the editor allows, every letter of it ") : value;
        if (d.widget === "list") {
          const items = Array.isArray(value) && value.length ? (value as string[]) : ["One more reason"];
          const count = d.maxItems ?? items.length;
          return Array.from({ length: count }, (_, i) => (d.itemMaxLength ? fill(d.itemMaxLength, `${i + 1}. ${items[i % items.length]} `) : items[i % items.length]));
        }
        return value;
      }),
    };
  if (name === "odd")
    return {
      ...demo,
      fields: mapFields(mod, fields, (d, value) => {
        if (d.widget === "number") return (d.max ?? 100) + 7;
        if (d.widget === "list") return [];
        if (d.widget === "text" || d.widget === "textarea") return "";
        if (d.widget === "select") return "no-such-option";
        return value;
      }),
    };
  const k = /^options-(\d+)$/.exec(name);
  if (k) {
    const n = Number(k[1]);
    if (n >= optionCount(mod)) return null;
    return { ...demo, fields: mapFields(mod, fields, (d, value) => (d.widget === "select" && d.options?.length ? d.options[n % d.options.length] : value)) };
  }
  return null;
}

/** The case and how many `options-<k>` cases the template has, or null for one that doesn't exist. */
export async function loadEdgeCase(slug: string, locale: GiftLocale, name: string): Promise<EdgeCase | null> {
  const mod = await loadTemplate(slug);
  if (!mod) return null;
  const data = edgeCase(mod, locale, name);
  return data ? { data, options: optionCount(mod) } : null;
}
