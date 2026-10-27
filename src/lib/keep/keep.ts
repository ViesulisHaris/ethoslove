import { REMINDER_NAME_MAX, isRealDay, type MonthDay } from "@/lib/lifecycle/reminders";

/**
 * "Keep this gift": a recipient, who has no account, asks on the small page off a gift's end screen
 * to be emailed that gift's link, and maybe reminded before the sender's birthday, their anniversary
 * or Valentine's Day. The address is confirmed by a link first (double opt-in), so the form can't be
 * used to send a stranger anything but one confirmation; only then does the link go out and do the
 * reminders become real. Every email says why it came and has a way out. The confirmation names
 * nobody: anyone with a gift's link could type a stranger's address. Once the address has said yes,
 * the emails may name the sender by the first name on the gift (never a name typed on the page); the
 * link email carries that gift's own link and nothing else from it, and each reminder one suggested
 * template.
 */

/** The occasions a keeper can ask about: the days they share with whoever sent the gift. */
export const KEEP_OCCASIONS = ["birthday", "anniversary", "valentines"] as const;
export type KeepOccasion = (typeof KEEP_OCCASIONS)[number];

export type KeepReminderRequest = { occasion: KeepOccasion; name: string; month: number; day: number };

/**
 * An address gets at most one confirmation a day for a gift, and at most this many a day in all; one
 * gift's page sends at most CONFIRMS_PER_GIFT_PER_DAY a day, whoever asks.
 */
export const CONFIRM_RESEND_HOURS = 24;
export const CONFIRMS_PER_ADDRESS_PER_DAY = 3;
export const CONFIRMS_PER_GIFT_PER_DAY = 5;
/** A keep that was never confirmed is deleted after this long, address and all. */
export const PENDING_DAYS = 7;

const VALENTINES: MonthDay = { month: 2, day: 14 };

/**
 * What the keeper agrees to, word for word as the page shows it under its button, stored with the
 * keep: one email to confirm, then the link and the reminders they ticked, and a way out in each.
 */
export function keepConsent(locale: "en" | "es"): string {
  return locale === "es"
    ? "Te escribiremos una vez para confirmar que eres tú. Después, el enlace de este regalo y un recordatorio nueve días antes de cada fecha que marques. Cada correo trae un enlace para darte de baja."
    : "We'll email you once to confirm it's you. Then this gift's link, and a reminder nine days before each day you ticked. Every email has a link to unsubscribe.";
}

/**
 * Words a gift is signed with that aren't a name, in English and Spanish, compared in lower case:
 * pronouns, articles and prepositions ("Your babe", "Tu amor", "From Mia"), "us" and "we", kisses
 * and sign-offs ("xoxo Mia", "Besos, Ana"), and saying who without saying ("Secret admirer", "Guess who").
 */
const NOT_A_NAME = new Set([
  ...["your", "yours", "ur", "my", "me", "i", "our", "his", "her", "their", "from", "the", "a", "an", "with", "to", "for", "by", "of", "us", "we"],
  ...["xoxo", "xo", "xx", "love", "lots", "hugs", "kisses", "secret", "guess", "someone", "somebody", "anonymous", "anon"],
  ...["tu", "tus", "tú", "mi", "mis", "mí", "yo", "su", "sus", "nuestro", "nuestra", "vuestro", "vuestra", "de", "del", "el", "la", "los", "las", "un", "una", "con", "para", "por", "te"],
  ...["nosotros", "nosotras", "besos", "abrazos", "alguien", "anónimo", "anónima"],
]);
/** "Ana y Leo", "Mia & Leo": two senders, and naming one would leave the other out. */
const TOGETHER = new Set(["and", "&", "+", "y", "e"]);
const NAME = /^[\p{L}\p{M}]+(?:['’-][\p{L}\p{M}]+)*$/u;

/**
 * The sender's first name, from how the gift is signed, for the keep page and the emails after the
 * yes; "" when the signature doesn't start with one. Emoji and punctuation around the first word go
 * ("❤️ Alex" is Alex); that word must be letters (a hyphen or apostrophe inside is fine) and not one
 * of NOT_A_NAME ("Tu amor", "Your babe", "Secret admirer"); a word with a comma after it opens a
 * closing ("Love, Mia"), not a name; and two senders ("Ana y Leo") get no name rather than one. The
 * next word is never tried: "novio" reads worse than no name.
 */
export function senderFirstName(signature: string): string {
  // Emoji's joiners and presentation selectors count as marks: they go first, so "Mia❤️" is Mia.
  const plain = signature.normalize("NFC").replace(/[\u200d\ufe0e\ufe0f]/g, "");
  const words = plain.replace(/^[^\p{L}]+/u, "").split(/\s+/);
  const first = words[0] ?? "";
  if (/^[\p{L}\p{M}'’-]+,/u.test(first) || TOGETHER.has((words[1] ?? "").toLowerCase())) return "";
  const word = first.replace(/[^\p{L}\p{M}]+$/u, "");
  return NAME.test(word) && word.length <= 24 && !NOT_A_NAME.has(word.toLowerCase()) ? word : "";
}

/**
 * The reminders as stored: the name trimmed ("" when the gift's signature has no first name: the
 * reminder still comes, and says "the sender"), at most one of each occasion, Valentine's always the
 * 14th, and only real days. Anything else is dropped, not an error: the link is what was asked for.
 */
export function cleanRequests(raw: unknown): KeepReminderRequest[] {
  if (!Array.isArray(raw)) return [];
  const out: KeepReminderRequest[] = [];
  for (const item of raw.slice(0, KEEP_OCCASIONS.length)) {
    if (!item || typeof item !== "object") continue;
    const r = item as Record<string, unknown>;
    const occasion = KEEP_OCCASIONS.find((o) => o === r.occasion);
    const name = typeof r.name === "string" ? r.name.replace(/\s+/g, " ").trim().slice(0, REMINDER_NAME_MAX) : "";
    if (!occasion || out.some((o) => o.occasion === occasion)) continue;
    const date = occasion === "valentines" ? VALENTINES : { month: Number(r.month), day: Number(r.day) };
    if (!isRealDay(date)) continue;
    out.push({ occasion, name, ...date });
  }
  return out;
}

/** Where a click from a keeper's emails came from: carried to the editor, and on to any purchase. */
export const KEEP_REF = "gift-keep";

const KEPT_LABEL: Record<KeepOccasion, Record<"en" | "es", string>> = {
  birthday: { en: "the sender's birthday", es: "el cumpleaños de quien te lo regaló" },
  anniversary: { en: "your anniversary", es: "vuestro aniversario" },
  valentines: { en: "Valentine's Day", es: "San Valentín" },
};

/** The birthday by the sender's first name, as the reminders hold it (from the gift, never the page). */
const NAMED_BIRTHDAY: Record<"en" | "es", (name: string) => string> = {
  en: (name) => `${name}'s birthday`,
  es: (name) => `el cumpleaños de ${name}`,
};

/**
 * The days a keeper will hear about, in words for the gift's link email and the pages around it:
 * "the sender's birthday", "3 May". `named` once the address has said yes ("Mia's birthday"); before
 * that, on the page that asks for the yes, nobody is named.
 */
export function keptDays(reminders: KeepReminderRequest[], locale: "en" | "es", { named = false }: { named?: boolean } = {}): { label: string; date: string }[] {
  const format = new Intl.DateTimeFormat(locale === "es" ? "es" : "en-GB", { day: "numeric", month: "long", timeZone: "UTC" });
  return reminders.map((r) => ({
    label: named && r.occasion === "birthday" && r.name ? NAMED_BIRTHDAY[locale](r.name) : KEPT_LABEL[r.occasion][locale],
    date: format.format(Date.UTC(2000, r.month - 1, r.day)),
  }));
}

/**
 * Spanish joins "de" to the article after it: "antes del cumpleaños…", never "antes de el cumpleaños…".
 * Every sentence a kept day goes into puts "antes de" before it, so each one runs through this.
 */
export const joinDe = (text: string) => text.replace(/\bde el /g, "del ");
