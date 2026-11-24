import { CONTRIBUTION_LIMITS, type GiftContribution, type GiftData, type GiftLocale, type GiftPhoto } from "@/lib/gift/schema";
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
 * - `look-<k>`: the gift in its k-th look (looks have their own editor, so `options` skips them).
 *
 * A template made for group cards (`features.group`) also has its notes varied: `min` holds the
 * fewest it can be sent with, short and without photos; `max` the most, every name and note at its
 * limit, every one with a photo where the template takes them; and three cases of its own,
 * `notes-<n>` (n of the demo's notes, as they are), `notes-<n>-long` (n at the limits, with photos
 * of every shape, a word too long for any line, and a name and a note written right to left) and
 * `notes-<n>-plain` (n with no photo at all). `-look-<k>` on the end of any of the three plays it
 * in the template's k-th look.
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

type NoteKind = "demo" | "long" | "plain";

/**
 * `count` notes for a group template, made from its demo's own. A key is ten characters, as the
 * server makes them. The long ones are what a real card can hold at its worst: a name of the full
 * 24 characters with no space in it, a note at the template's limit that opens on a word longer
 * than a line, and every fifth one in Arabic, which starts from the right.
 */
function notesOf(mod: TemplateModule, demo: GiftData, count: number, kind: NoteKind): GiftContribution[] {
  const group = mod.manifest.features.group;
  if (!group) return [];
  const source = demo.contributions?.length ? demo.contributions : [{ key: "e2e0000000", name: "Sam", note: "Happy Christmas." }];
  return Array.from({ length: count }, (_, i): GiftContribution => {
    const base = source[i % source.length];
    const key = `e2e${String(i).padStart(7, "0")}`;
    if (kind === "demo") return { ...base, key };
    if (kind === "plain") return { key, name: base.name, note: base.note };
    const shot = pool[i % pool.length];
    const photo = group.photos ? { url: shot.url, width: shot.width ?? 1024, height: shot.height ?? 1024 } : undefined;
    if (i % 5 === 3) return { key, name: "عبد الرحمن الفلاني", note: "كل عام وأنتِ بخير. البيت ليس كما كان منذ سافرتِ، والكرسي في مكانه ينتظرك.", photo };
    return {
      key,
      name: fill(CONTRIBUTION_LIMITS.name, "Wolfeschlegelsteinhausen "),
      note: fill(group.noteMax, `${i + 1}. Donaudampfschifffahrtsgesellschaftskapitänsmütze, and then every single thing I never got round to saying while you were here. `),
      photo,
    };
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
  const group = features.group;

  // A group template's own cases: how many notes, of which kind, and optionally in which look.
  const n = /^notes-(\d+)(?:-(long|plain))?(?:-look-(\d+))?$/.exec(name);
  if (n) {
    if (!group) return null;
    const count = Number(n[1]);
    if (count > CONTRIBUTION_LIMITS.max) return null;
    const look = describeObjectSchema(mod.fieldsSchema as never).find((d) => d.key === "look" && d.widget === "select");
    if (n[3] !== undefined && (!look?.options || Number(n[3]) >= look.options.length)) return null;
    return { ...demo, contributions: notesOf(mod, demo, count, (n[2] as NoteKind | undefined) ?? "demo"), fields: n[3] !== undefined && look?.options ? { ...fields, look: look.options[Number(n[3])] } : demo.fields };
  }

  if (name === "demo") return demo;
  // The demo as a free gift is sent: with the floating "Made with Ethos" badge, which a demo never draws.
  if (name === "watermarked") return { ...demo, watermark: true };
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
      contributions: group ? notesOf(mod, demo, group.min, "plain") : demo.contributions,
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
      contributions: group ? notesOf(mod, demo, group.max, "long") : demo.contributions,
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
  // A look has an editor of its own, so the options above leave it alone; every look is a different set of pictures.
  const l = /^look-(\d+)$/.exec(name);
  if (l) {
    const look = describeObjectSchema(mod.fieldsSchema as never).find((d) => d.key === "look" && d.widget === "select");
    const n = Number(l[1]);
    if (!look?.options || n >= look.options.length) return null;
    return { ...demo, fields: { ...fields, look: look.options[n] } };
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
