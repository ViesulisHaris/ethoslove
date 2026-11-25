/*
 * The short page for venues (/dates/for-venues, BRIEF-dates2.md 5): what a featured date is, that it
 * is marked, and who to write to. No price: the owner sets one. Every claim here is true of
 * src/lib/dates/featured.ts (the label only marks a place already listed, and changes nothing else) and src/content/legal.ts ("No one pays
 * for a place's position."). Noindex until the owner says otherwise.
 */

export const FOR_VENUES_PATH = "/dates/for-venues";

export type ForVenuesCopy = {
  title: string;
  description: string;
  label: string;
  heading: string;
  line: string;
  sentence: string;
  /** The hero's mail button. */
  write: string;
  /** The subject line the mail opens with. */
  subject: string;
  whatLabel: string;
  whatHeading: string;
  whatLine: string;
  /** The name on the sample card, which is the reader's own venue, not a real place. */
  sample: string;
  /** What stays true, one short row each beside the sample card. */
  rules: [string, string, string];
  contactLabel: string;
  contactHeading: string;
  contactLine: string;
};

export const FOR_VENUES: Record<"en" | "es", ForVenuesCopy> = {
  en: {
    title: "A featured date, for venues",
    description: "What a featured date on Ethos is, how it is marked, and who to write to.",
    label: "For venues",
    heading: "A label on your venue, in words",
    line: "Marked “Featured” on the Dates pages and the map.",
    sentence: "Where your venue already appears on Ethos, a “Featured” label can mark it. It is never added to a plan, moved up or kept past a filter.",
    write: "Write to us",
    subject: "Featured date",
    whatLabel: "What it is",
    whatHeading: "How it looks in a list",
    whatLine: "The same card in the same place, with one word added.",
    sample: "Your venue",
    rules: ["It is always marked “Featured”.", "It never jumps a filter or buys a rank.", "Reviews and votes stay the couples’ own."],
    contactLabel: "Write to us",
    contactHeading: "Ask about a featured date",
    contactLine: "Tell us the venue and the city. We answer by email.",
  },
  es: {
    title: "Una cita destacada, para locales",
    description: "Qué es una cita destacada en Ethos, cómo se marca y a quién escribir.",
    label: "Para locales",
    heading: "Una etiqueta en vuestro local, con todas las letras",
    line: "Marcado como «Destacado» en las páginas de citas y en el mapa.",
    sentence: "Donde vuestro local ya aparece en Ethos, puede llevar la etiqueta «Destacado». Nunca se añade a un plan, no sube de puesto ni se salta un filtro.",
    write: "Escribidnos",
    subject: "Cita destacada",
    whatLabel: "Qué es",
    whatHeading: "Así se ve en una lista",
    whatLine: "La misma tarjeta en el mismo puesto, con una palabra más.",
    sample: "Vuestro local",
    rules: ["Siempre lleva la marca «Destacado».", "No se salta ningún filtro ni compra un puesto.", "Reseñas y votos siguen siendo de las parejas."],
    contactLabel: "Escribidnos",
    contactHeading: "Preguntad por una cita destacada",
    contactLine: "Decidnos el local y la ciudad. Contestamos por correo.",
  },
};
