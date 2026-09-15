import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { TrickOrTreatFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "trick-or-treat",
  recipientName: "Ivy",
  senderName: "Theo",
  messageStyle: "typewriter" as const,
  accentColor: "#F28C28",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "spooky" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/all-hallows.mp3",
    trackId: "all-hallows",
    title: "All Hallows",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
  surprise: {
    text: "Saturday, 7pm. Matching costumes. I've already bought the fangs, you're getting the cape. No arguments.",
    reveal: "tap" as const,
  },
};

export const demoData: Record<"en" | "es", GiftData<TrickOrTreatFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "for ivy",
    message:
      "you said halloween is your favourite and nobody ever does anything for it. so.\n\nthis is the haunted house version of me knocking on your door with a bag of sweets, except the sweets are photos and the ghost is nervous.\n\n**you're the treat.** the trick is that i'm keeping you.\n\n*boo. love you.*",
    photos: demoPhotos(["p3", "p5", "p6", "p2"], {
      p3: "the candles you refused to blow out",
      p5: "no signal. perfect night for ghosts",
      p6: "the last train home, october",
      p2: "lost on purpose again",
    }),
    fields: { palette: "midnight", host: "ghost", doorLine: undefined, sign: undefined },
  },
  es: {
    ...shared,
    locale: "es",
    title: "para ivy",
    message:
      "dijiste que halloween es tu favorito y que nadie hace nunca nada por él. pues.\n\nesta es la versión casa encantada de mí llamando a tu puerta con una bolsa de caramelos, solo que los caramelos son fotos y el fantasma está nervioso.\n\n**tú eres el trato.** el truco es que me quedo contigo.\n\n*buu. te quiero.*",
    photos: demoPhotos(["p3", "p5", "p6", "p2"], {
      p3: "las velas que no quisiste soplar",
      p5: "sin cobertura. noche perfecta para fantasmas",
      p6: "el último tren a casa, octubre",
      p2: "perdidos a propósito otra vez",
    }),
    fields: { palette: "midnight", host: "ghost", doorLine: undefined, sign: undefined },
  },
};
