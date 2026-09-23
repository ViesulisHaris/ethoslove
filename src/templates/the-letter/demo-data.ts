import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { LetterFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "the-letter",
  recipientName: "Ana",
  senderName: "Marco",
  messageStyle: "typewriter" as const,
  accentColor: "#B23A2E",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: true,
  music: { source: "library" as const, url: "/demo/audio/quiet-hours.wav", trackId: "quiet-hours", title: "Quiet Hours", startAt: 0 },
  video: undefined,
  countdown: {
    targetAt: "2027-06-14T00:00:00+03:00",
    timezone: "Europe/Riga",
  },
};

export const demoData: Record<"en" | "es", GiftData<LetterFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "Three years of you",
    message:
      "Three years ago you asked if the seat next to me was taken. It wasn't. It still isn't.\n\nI keep trying to write down what you are to me and it keeps coming out as a list: the way you hum when you cook, the notes you leave in my books, how you always know when I need the window seat. **None of it is small.**\n\nSo here is the whole thing, folded up the way you like: *I would choose you again in every version of this.*\n\nHappy anniversary, Ana.",
    photos: demoPhotos(["p1", "p2", "p7", "p8", "p3"]),
    countdown: { ...shared.countdown, label: "Until our next June 14th" },
    surprise: {
      text: "Check the inside pocket of your blue coat. I left something there in March and you never found it.",
      reveal: "hold",
    },
    fields: {
      paper: "cream",
      desk: "walnut",
      inkColor: "#2B2A4C",
      signOff: "All of it, always,",
    },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Tres años de ti",
    message:
      "Hace tres años me preguntaste si el asiento de al lado estaba ocupado. No lo estaba. Sigue sin estarlo.\n\nIntento escribir lo que eres para mí y siempre me sale una lista: cómo tarareas mientras cocinas, las notas que dejas en mis libros, cómo sabes cuándo necesito el asiento de la ventana. **Nada de eso es pequeño.**\n\nAsí que aquí va todo, doblado como a ti te gusta: *te elegiría otra vez en cada versión de esto.*\n\nFeliz aniversario, Ana.",
    photos: demoPhotos(["p1", "p2", "p7", "p8", "p3"], {
      p1: "Nuestro primer café. Me robaste el azúcar.",
      p2: "Lisboa, la noche que nos perdimos a propósito",
      p7: "Julio, y todo iba despacio",
      p8: "Dejas notas. Yo las guardo todas.",
      p3: "Treinta velas, un deseo",
    }),
    countdown: { ...shared.countdown, label: "Hasta nuestro próximo 14 de junio" },
    surprise: {
      text: "Mira en el bolsillo interior de tu abrigo azul. Dejé algo ahí en marzo y nunca lo encontraste.",
      reveal: "hold",
    },
    fields: {
      paper: "cream",
      desk: "walnut",
      inkColor: "#2B2A4C",
      signOff: "Todo, siempre,",
    },
  },
};
