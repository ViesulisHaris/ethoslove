import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { CauldronFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "cauldron",
  recipientName: "Luna",
  senderName: "Sam",
  messageStyle: "typewriter" as const,
  accentColor: "#2F9E57",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
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
    text: "Saturday night, my kitchen. I'm making the real batch. Bring a cape, I'll provide the cauldron and an alarming amount of garlic bread.",
    reveal: "tap" as const,
  },
};

export const demoData: Record<"en" | "es", GiftData<CauldronFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "something is brewing",
    message:
      "i've been working on this recipe since july. the first batch tasted like nothing. the second one exploded. the third one smelled like you, so i stopped experimenting.\n\nevery ingredient is real. i checked with a witch.\n\nit won't turn you into a toad. it will, however, put you under my spell tonight and every night after.\n\n**drink up.** *stir clockwise. i'm already in.*",
    photos: demoPhotos(["p3", "p6", "p4", "p2"], {
      p3: "the candles you refused to blow out",
      p6: "the 23:40 to you",
      p4: "the day nube chose us",
      p2: "lost on purpose again",
    }),
    fields: { look: "witch", ingredients: ["a pinch of your laugh", "two cold hands in my pockets", "every 3am \"you awake?\""], potion: "Love Potion No. 31" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "algo se está cociendo",
    message:
      "llevo desde julio con esta receta. la primera tanda no sabía a nada. la segunda explotó. la tercera olía a ti, así que dejé de experimentar.\n\nlos ingredientes son todos de verdad. lo consulté con una bruja.\n\nno te convertirá en sapo. eso sí, esta noche y todas las siguientes caerás bajo mi hechizo.\n\n**bébetela.** *remueve hacia la derecha. yo ya estoy dentro.*",
    photos: demoPhotos(["p3", "p6", "p4", "p2"], {
      p3: "las velas que no quisiste soplar",
      p6: "el de las 23:40 hacia ti",
      p4: "el día que nube nos eligió",
      p2: "perdidos a propósito otra vez",
    }),
    fields: { look: "witch", ingredients: ["una pizca de tu risa", "dos manos frías en mi bolsillo", "cada «¿sigues ahí?» de las 3am"], potion: "Poción de amor nº 31" },
  },
};
