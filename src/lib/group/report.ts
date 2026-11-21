import { BRAND } from "@/config/brand";

/**
 * Reporting a group card's page, or one note sent to it: an email to a person, written in the
 * reader's own language, quoting a reference that names the page or the note and opens nothing (as
 * on the dates' reviews, and as the card's own "Report a note" does in templates/_shared/EndScreen).
 * The page at a card's link speaks the card's language and the sender's panel the site's, so both
 * pass theirs.
 */
const WORDS = {
  en: {
    page: { subject: "Report group card {ref}", first: "Group card: {ref}" },
    note: { subject: "Report a note on a group card ({ref})", first: "Note: {ref}" },
    rest: ["", "What is wrong with it, and why (for example: offensive, someone's personal details, illegal):", "", "", "Your name:", "", "I believe the information in this report is accurate and complete."],
  },
  es: {
    page: { subject: "Denunciar la tarjeta en grupo {ref}", first: "Tarjeta en grupo: {ref}" },
    note: { subject: "Denunciar una nota de una tarjeta en grupo ({ref})", first: "Nota: {ref}" },
    rest: ["", "Qué tiene de malo y por qué (por ejemplo: es ofensiva, incluye datos personales de alguien, es ilegal):", "", "", "Tu nombre:", "", "Creo que la información de esta denuncia es exacta y completa."],
  },
} as const;

export function groupReportLink(kind: "page" | "note", ref: string, locale: string): string {
  const words = WORDS[locale === "es" ? "es" : "en"];
  const subject = words[kind].subject.replace("{ref}", ref);
  const body = [words[kind].first.replace("{ref}", ref), ...words.rest].join("\n");
  return `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
