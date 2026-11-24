import type { Occasion } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";

/**
 * The words of /occasions, laid out as the gallery is (fix round 5, 24 Nov 2026): the gallery's head,
 * then the thirteen occasions as picture tiles. Each tile says one short line about the day and how
 * many gifts its page holds. The page's description, which stood under the heading, is in a closed
 * row under the tiles (`more`), so a search engine still reads it.
 */
export const OCCASIONS_INDEX: Record<
  GiftLocale,
  { line: string; allLine: string; more: string; count: (n: number) => string; lines: Record<Occasion, string> }
> = {
  en: {
    line: "Pick the day, then the gift. Each one has a live demo.",
    allLine: "Every gift, for any day at all.",
    more: "About these gifts",
    count: (n) => (n === 1 ? "1 gift" : `${n} gifts`),
    lines: {
      birthday: "Candles, their song and a midnight opening.",
      anniversary: "Your years together, told in photos.",
      valentines: "A love letter that opens like a story.",
      wedding: "For the couple, or for each other.",
      graduation: "For the one who finally made it.",
      christmas: "Something to open on the morning itself.",
      halloween: "Sweet, spooky and a little silly.",
      thanksgiving: "Thanks to the people at your table.",
      "mothers-day": "Words she will keep for years.",
      "fathers-day": "For the dad who says he wants nothing.",
      apology: "When sorry needs more than a text.",
      "long-distance": "Closer, until the next visit.",
      "just-because": "No date needed, and that is the point.",
    },
  },
  es: {
    line: "Elige el día y después el regalo. Cada uno tiene su demo.",
    allLine: "Todos los regalos, para cualquier día.",
    more: "Sobre estos regalos",
    count: (n) => (n === 1 ? "1 regalo" : `${n} regalos`),
    lines: {
      birthday: "Velas, su canción y una sorpresa a medianoche.",
      anniversary: "Vuestros años juntos, contados en fotos.",
      valentines: "Una carta de amor que se abre como un cuento.",
      wedding: "Para los novios, o para vosotros dos.",
      graduation: "Para quien por fin lo ha conseguido.",
      christmas: "Algo que abrir esa misma mañana.",
      halloween: "Dulce, de miedo y un poco absurdo.",
      thanksgiving: "Gracias a quienes se sientan a tu mesa.",
      "mothers-day": "Palabras que guardará durante años.",
      "fathers-day": "Para el padre que dice que no quiere nada.",
      apology: "Cuando un perdón necesita más que un mensaje.",
      "long-distance": "Más cerca, hasta la próxima visita.",
      "just-because": "Sin fecha, y justo por eso.",
    },
  },
};
