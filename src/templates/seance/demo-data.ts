import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { SeanceFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "seance",
  recipientName: "Ivy",
  senderName: "Theo",
  messageStyle: "typewriter" as const,
  accentColor: "#FFAE3D",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/quiet-hours.mp3",
    trackId: "quiet-hours",
    title: "Quiet Hours",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
  surprise: {
    text: "Saturday, 9pm, mine. Bring the cold feet. I've already lit the candles and hidden the board from my cousin.",
    reveal: "tap" as const,
  },
};

export const demoData: Record<"en" | "es", GiftData<SeanceFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "someone is trying to reach you",
    message:
      "i asked the board one question: what should i tell her?\n\nit spelled out three words and then said goodbye, which is rude, but at least it was clear.\n\nso here they are, from me and from a ghost with excellent taste: **stay with me.**\n\nevery halloween, the candles lit and your cold feet on mine.\n\n*yours, in this life and the next.*",
    photos: demoPhotos(["p3", "p6", "p5", "p2"], {
      p3: "the candles you refused to blow out",
      p6: "the 23:40 to you",
      p5: "no signal. perfect for ghosts",
      p2: "lost on purpose again",
    }),
    fields: { look: "candle", spell: "stay with me" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "alguien intenta contactar contigo",
    message:
      "le hice una sola pregunta al tablero: ¿qué le digo?\n\ndeletreó tres palabras y luego se despidió, que es de mala educación, pero al menos fue claro.\n\nasí que aquí están, de mi parte y de un fantasma con muy buen gusto: **quédate conmigo.**\n\ncada halloween, con las velas encendidas y tus pies fríos sobre los míos.\n\n*contigo, en esta vida y en la otra.*",
    photos: demoPhotos(["p3", "p6", "p5", "p2"], {
      p3: "las velas que no quisiste soplar",
      p6: "el de las 23:40 hacia ti",
      p5: "sin cobertura. perfecto para fantasmas",
      p2: "perdidos a propósito otra vez",
    }),
    fields: { look: "candle", spell: "quedate conmigo" },
  },
};
