import type { GiftLocale } from "@/lib/gift/schema";

/**
 * What the Advent Calendar's own page says, written for the page the growth build gives every
 * template (branch growth/guides: a palette per gift, three steps that are that gift's own, six idea
 * cards). Those three tables are not on this branch, so the rows wait here, in their shapes, for the
 * day the two meet. Each goes into its table under "advent-calendar", behind the same
 * `...(ADVENT_CALENDAR_LIVE ? { … } : {})` spread its entry in src/content/template-seo.ts has, and
 * then this file is deleted (docs/GROUP.md, "The first template", step 4):
 *
 *   PAGE_THEME -> TEMPLATE_PAGE_THEMES  (src/content/template-page-themes.ts)
 *   PAGE_STEPS -> TEMPLATE_STEPS        (src/content/template-steps.ts)
 *   PAGE_IDEAS -> TEMPLATE_GUIDES       (src/content/template-guides.ts), with `faq: []`
 *
 * Nothing reads this file until then. tests/unit/advent-calendar.test.tsx holds it to the lengths
 * and the contrast those tables' own tests ask for, and every claim to the template's manifest, and
 * fails on the day those tables are on this branch and the rows have not been moved.
 */

/** The house's evergreen as a pale sage, its red taken down to a deep one, the mantel's brass for the step badges. */
export const PAGE_THEME = {
  ground: "#e6ede3",
  raised: "#f1f5ee",
  band: "#d4e0d0",
  ink: "#1f2c24",
  body: "#4d5d52",
  accent: "#96242a",
  badge: "#d2b67c",
  footer: "#14261d",
  footerText: "#bfd0c4",
  flowers: "ivory",
} as const;

/**
 * `line`: what the person who gets it does. Then what the sender does first, second, and last.
 *
 * A note step's card shows a real value of the field it quotes. The first quotes the letter, and shows
 * the line the idea cards lend for it ("We are keeping your chair."), so it needs no sample of its own.
 * The second is about the people who sign, and quotes `contributions`: the card shows the first of
 * them as they signed ("Mum"). That is the one thing the guides' tables do not know yet: a group
 * card's notes are no field of an ordinary gift (docs/GROUP.md says what to teach them). The last is
 * sending the card itself, which is another link than the one people sign at, so it is not called one.
 */
export const PAGE_STEPS = {
  line: { en: "They open twenty-four doors and find a note from each of you.", es: "Abren veinticuatro puertas y encuentran una nota de cada persona." },
  steps: [
    { picture: "note", quote: "message", en: "Write your letter", es: "Escribe tu carta" },
    { picture: "note", quote: "contributions", en: "Invite people to sign", es: "Invita a todos a firmar" },
    { picture: "phone", en: "Send the card", es: "Envía la tarjeta" },
  ],
} as const;

type Idea = { heading: string; how: string; borrow: { field: "title" | "message" | "caption" | "countdown.label"; line: string } };

/** Six moments someone would really make this for, the commonest first, each with a line to borrow and the field it goes in. */
export const PAGE_IDEAS: Record<GiftLocale, { title: string; items: Idea[] }> = {
  en: {
    title: "Who to make a digital advent calendar for",
    items: [
      { heading: "Someone spending Christmas away", how: "Ask everyone at home for one line and let the doors hand them over.", borrow: { field: "message", line: "We are keeping your chair." } },
      { heading: "From the whole office", how: "Share one link with the team. You choose which notes go in.", borrow: { field: "title", line: "Merry Christmas from all of floor 3" } },
      { heading: "For a teacher, from the class", how: "Up to twenty-four families can add a line and a photo of their own.", borrow: { field: "title", line: "Thank you, Miss Carter" } },
      { heading: "From all the grandchildren", how: "They get a door each, and the star window is left for your own letter.", borrow: { field: "caption", line: "All seven of them, for once in one frame" } },
      { heading: "A friend having a hard December", how: "Each note is 140 characters at most, so nobody has to write a speech.", borrow: { field: "message", line: "No advice in here. Just us." } },
      { heading: "Counting down to coming home", how: "The countdown to the day they land shows after your letter.", borrow: { field: "countdown.label", line: "Until you walk through arrivals" } },
    ],
  },
  es: {
    title: "Para quién hacer un calendario de Adviento digital",
    items: [
      { heading: "Alguien que pasa la Navidad lejos", how: "Pide una línea a cada persona de casa y deja que las puertas las vayan entregando.", borrow: { field: "message", line: "Te guardamos la silla." } },
      { heading: "De toda la oficina", how: "Comparte un enlace con el equipo. Tú decides qué notas entran.", borrow: { field: "title", line: "Feliz Navidad de toda la planta 3" } },
      { heading: "Para la profe, de la clase", how: "Hasta veinticuatro familias pueden añadir una línea y una foto.", borrow: { field: "title", line: "Gracias, profe" } },
      { heading: "De todos los nietos", how: "Cada cual tiene su puerta, y la ventana de la estrella queda para tu carta.", borrow: { field: "caption", line: "Los siete, por una vez en la misma foto" } },
      { heading: "Para quien tiene un diciembre difícil", how: "Ninguna nota pasa de 140 caracteres, así nadie tiene que escribir un discurso.", borrow: { field: "message", line: "Aquí no hay consejos. Solo estamos nosotros." } },
      { heading: "La cuenta atrás hasta la vuelta", how: "La cuenta atrás hasta el día que aterriza sale después de tu carta.", borrow: { field: "countdown.label", line: "Hasta que cruces la puerta de llegadas" } },
    ],
  },
};
