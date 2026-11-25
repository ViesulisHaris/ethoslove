/*
 * The short page for venues (/dates/for-venues, BRIEF-dates2.md 5): what a featured date is, that it
 * is marked, and who to write to. No price: the owner sets one. Every claim here is true of
 * src/lib/dates/featured.ts (the label changes nothing else) and src/content/legal.ts ("No one pays
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
  whatLabel: string;
  whatHeading: string;
  whatLine: string;
  /** Before the real "Featured" label, as it is drawn on a place. */
  looks: string;
  cards: [string, string, string];
  contactLabel: string;
  contactHeading: string;
  contactLine: string;
};

export const FOR_VENUES: Record<"en" | "es", ForVenuesCopy> = {
  en: {
    title: "A featured date, for venues",
    description: "What a featured date on Ethos is, how it is marked, and who to write to.",
    label: "For venues",
    heading: "A featured date at your place",
    line: "Marked “Featured”, in words, wherever it is listed.",
    sentence: "Couples plan dates on Ethos from real places on the map. A featured date puts your venue’s name on one, with a label that says so.",
    write: "Write to us",
    whatLabel: "What it is",
    whatHeading: "Three things that hold",
    whatLine: "A label, and nothing bought beyond it.",
    looks: "It looks like this:",
    cards: ["It is always marked “Featured”.", "It never jumps a filter or buys a rank.", "Reviews and votes stay the couples’ own."],
    contactLabel: "Write to us",
    contactHeading: "Ask about a featured date",
    contactLine: "Tell us the venue and the city. We answer by email.",
  },
  es: {
    title: "Una cita destacada, para locales",
    description: "Qué es una cita destacada en Ethos, cómo se marca y a quién escribir.",
    label: "Para locales",
    heading: "Una cita destacada en vuestro local",
    line: "Marcada como «Destacado», con todas las letras, allí donde aparezca.",
    sentence: "Las parejas planean citas en Ethos con sitios reales del mapa. Una cita destacada pone el nombre de vuestro local en una, con una etiqueta que lo dice.",
    write: "Escribidnos",
    whatLabel: "Qué es",
    whatHeading: "Tres cosas que se cumplen",
    whatLine: "Una etiqueta, y nada comprado más allá de ella.",
    looks: "Se ve así:",
    cards: ["Siempre lleva la marca «Destacado».", "No se salta ningún filtro ni compra un puesto.", "Reseñas y votos siguen siendo de las parejas."],
    contactLabel: "Escribidnos",
    contactHeading: "Preguntad por una cita destacada",
    contactLine: "Decidnos el local y la ciudad. Contestamos por correo.",
  },
};
