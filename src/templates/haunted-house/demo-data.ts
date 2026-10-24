import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { HauntedHouseFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "haunted-house",
  recipientName: "Ruby",
  senderName: "Alex",
  messageStyle: "typewriter" as const,
  accentColor: "#FFA83A",
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
    text: "Saturday, 8pm, my place. Dress as whatever you are afraid of. There will be soup. Park out front, the gate sticks.",
    reveal: "tap" as const,
  },
};

export const demoData: Record<"en" | "es", GiftData<HauntedHouseFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "you're invited",
    message:
      "i found a house on the hill with every light on and one empty chair, and it turned out to be mine.\n\nhalloween night, my place. there will be soup, terrible music and a very sincere ghost who has asked, specifically, for you.\n\neveryone else is already inside. the gate sticks, so push.\n\n**come in out of the rain.** *i kept the best window for last.*",
    photos: demoPhotos(["p2", "p5", "p6", "p7", "p4"], {
      p2: "lost on purpose again",
      p5: "no signal. perfect for ghosts",
      p6: "the 23:40 to you",
      p7: "july. nothing haunted us then",
      p4: "the day nube chose us",
    }),
    fields: { look: "storm", tag: undefined },
  },
  es: {
    ...shared,
    locale: "es",
    title: "tienes invitación",
    message:
      "encontré una casa en la colina con todas las luces encendidas y una silla vacía, y resultó ser la mía.\n\nnoche de halloween, en mi casa. habrá sopa, música horrible y un fantasma muy sincero que ha preguntado, en concreto, por ti.\n\ntodos los demás ya están dentro. la verja se atasca, así que empuja.\n\n**entra, que llueve.** *me guardé la mejor ventana para el final.*",
    photos: demoPhotos(["p2", "p5", "p6", "p7", "p4"], {
      p2: "perdidos a propósito otra vez",
      p5: "sin cobertura. perfecto para fantasmas",
      p6: "el de las 23:40 hacia ti",
      p7: "julio. entonces nada nos rondaba",
      p4: "el día que nube nos eligió",
    }),
    fields: { look: "storm", tag: undefined },
  },
};
