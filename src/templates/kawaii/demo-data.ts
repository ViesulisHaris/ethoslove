import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { KawaiiFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "kawaii",
  recipientName: "Mia",
  senderName: "Leo",
  messageStyle: "typewriter" as const,
  accentColor: "#F06292",
  fontPairing: "modern" as const,
  showReactionCta: true,
  watermark: false,
  cover: "gingham" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/paper-boats.mp3",
    trackId: "paper-boats",
    title: "Paper Boats",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
  surprise: {
    text: "Saturday. I'm picking you up at 6. Wear the shoes you can't walk in, we're not walking.",
    reveal: "tap" as const,
  },
};

export const demoData: Record<"en" | "es", GiftData<KawaiiFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "for mia",
    message:
      "hi. it's me. well, it's the bunny, but the bunny is me.\n\ni made you this because you said nobody ever makes you anything, and that is a **crime**.\n\nso: here are the photos i look at when you're not here, one plushie who is very happy to see you, and one very small surprise at the bottom.\n\n*love you. eat something.*",
    photos: demoPhotos(["p1", "p7", "p4", "p8"], {
      p1: "the first coffee. u stole my sugar",
      p7: "july, when everything was slow",
      p4: "the day nube chose us",
      p8: "u leave notes. i keep every one",
    }),
    fields: { theme: "pink", character: "bunny", banner: undefined, greeting: undefined },
  },
  es: {
    ...shared,
    locale: "es",
    title: "para mia",
    message:
      "hola. soy yo. bueno, es el conejito, pero el conejito soy yo.\n\nte he hecho esto porque dijiste que nadie te hace nunca nada, y eso es un **crimen**.\n\nasí que: aquí están las fotos que miro cuando no estás, un peluche que se alegra muchísimo de verte, y una sorpresa muy pequeña al final.\n\n*te quiero. come algo.*",
    photos: demoPhotos(["p1", "p7", "p4", "p8"], {
      p1: "el primer café. me robaste el azúcar",
      p7: "julio, cuando todo iba despacio",
      p4: "el día que nube nos eligió",
      p8: "dejas notas. yo las guardo todas",
    }),
    fields: { theme: "pink", character: "bunny", banner: undefined, greeting: undefined },
  },
};
