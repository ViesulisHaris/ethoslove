import type { GiftContribution, GiftData } from "@/lib/gift/schema";
import { DEMO_PHOTOS, demoPhotos } from "../_shared/demo-photos";
import type { AdventCalendarFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "advent-calendar",
  recipientName: "Nora",
  messageStyle: "fade" as const,
  accentColor: "#A8281F",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/o-christmas-tree.mp3",
    trackId: "o-christmas-tree",
    title: "O Christmas Tree",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
  fields: { look: "evergreen" as const },
};

const photo = (id: "p3" | "p4") => ({ url: DEMO_PHOTOS[id].url, width: DEMO_PHOTOS[id].width, height: DEMO_PHOTOS[id].height });

/**
 * A first Christmas away from home, and eight people with a door each. Between them the notes hold
 * what a real card can: two photos, a name of the full 24 characters, and one note that runs to the
 * template's 140.
 */
const en: GiftContribution[] = [
  { key: "advent00a1", name: "Mum", note: "I lit the candles on your cake anyway and Dad blew them out for you. Ring me when you wake up, whatever time it is here.", photo: photo("p3") },
  { key: "advent00a2", name: "Iris", note: "The Boxing Day walk is postponed until you land. We are not doing the hill without you." },
  { key: "advent00a3", name: "Dad", note: "I put the lights up on my own this year. Two bulbs out, one fuse gone. Come home and tell me which ones are crooked." },
  { key: "advent00a4", name: "The whole Okonkwo family", note: "Biscuit, last summer, before he ate the picnic. He sleeps on your side of the sofa now.", photo: photo("p4") },
  { key: "advent00a5", name: "Sam", note: "I still owe you a Secret Santa from 2019. This year I am paying up." },
  { key: "advent00a6", name: "Gran", note: "Wrap up warm. I have knitted you something and no, you can't guess what it is." },
  { key: "advent00a7", name: "Leo", note: "I ate the chocolate out of your real calendar. Only up to the 6th. Sorry." },
  { key: "advent00a8", name: "Auntie Jo", note: "Your chair is staying where it is. Nobody sits in it, not even the cat. We set your place on the 25th and Dad pours you a sherry. Come home." },
];

const es: GiftContribution[] = [
  { key: "advent00a1", name: "Mamá", note: "Encendí las velas de tu tarta igualmente y las sopló papá por ti. Llámame cuando te despiertes, sea la hora que sea aquí.", photo: photo("p3") },
  { key: "advent00a2", name: "Iris", note: "El paseo del día 26 se aplaza hasta que aterrices. No subimos la cuesta sin ti." },
  { key: "advent00a3", name: "Papá", note: "Este año he puesto las luces yo solo. Dos bombillas fundidas y un fusible menos. Ven y dime cuáles están torcidas." },
  { key: "advent00a4", name: "Los Okonkwo, al completo", note: "Galleta, el verano pasado, antes de zamparse el pícnic. Ahora duerme en tu lado del sofá.", photo: photo("p4") },
  { key: "advent00a5", name: "Sam", note: "Te debo un amigo invisible desde 2019. Este año pago." },
  { key: "advent00a6", name: "La abuela", note: "Abrígate. Te he tejido una cosa y no, no vas a adivinar qué es." },
  { key: "advent00a7", name: "Leo", note: "Me comí el chocolate de tu calendario de verdad. Solo hasta el día 6. Perdón." },
  { key: "advent00a8", name: "La tía Jo", note: "Tu silla se queda donde está. No se sienta nadie, ni el gato. Ese día ponemos tu plato y papá te sirve una copa. Vuelve pronto a casa, anda." },
];

export const demoData: Record<"en" | "es", GiftData<AdventCalendarFields>> = {
  en: {
    ...shared,
    locale: "en",
    senderName: "Tom",
    title: "Merry Christmas, Nora",
    message:
      "You told us not to make a fuss about you being away this year. So I asked everyone for one line instead, and nobody could keep to one.\n\nThere is a door for each of them. **Open them in any order.** The other doors have sweets behind them, because Mum says an advent house with an empty door is bad luck.\n\n*We are keeping your chair.*",
    photos: demoPhotos(["p6", "p7", "p8"], {
      p6: "the train you left on, in October",
      p7: "the bikes, in the shed until you are back",
      p8: "your book, exactly where you left it",
    }),
    surprise: { text: "Your real present is in the post. It rattles. Do not shake it.", reveal: "tap" as const },
    contributions: en,
  },
  es: {
    ...shared,
    locale: "es",
    senderName: "Tomás",
    title: "Feliz Navidad, Nora",
    message:
      "Nos pediste que no montáramos un número por pasar estas fiestas fuera. Así que le pedí a cada uno una sola línea, y nadie supo quedarse en una.\n\nHay una puerta para cada persona. **Ábrelas en el orden que quieras.** Detrás de las demás hay dulces, porque mamá dice que una casita de Adviento con una puerta vacía trae mala suerte.\n\n*Te guardamos la silla.*",
    photos: demoPhotos(["p6", "p7", "p8"], {
      p6: "el tren en el que te fuiste, en octubre",
      p7: "las bicis, en el trastero hasta que vuelvas",
      p8: "tu libro, justo donde lo dejaste",
    }),
    surprise: { text: "Tu regalo de verdad va por correo. Suena al moverlo. No lo agites.", reveal: "tap" as const },
    contributions: es,
  },
};
