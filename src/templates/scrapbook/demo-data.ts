import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { ScrapbookFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "scrapbook",
  recipientName: "Elena",
  senderName: "Sam",
  messageStyle: "typewriter" as const,
  accentColor: "#E07A8C",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/golden-hour.mp3",
    trackId: "golden-hour",
    title: "Golden Hour",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
  surprise: {
    text: "Saturday. The photo booth at the fair. I'm buying every strip it prints.",
    reveal: "tap" as const,
  },
};

export const demoData: Record<"en" | "es", GiftData<ScrapbookFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "for elena",
    message:
      "elena,\n\nthis is every little thing i didn't want to forget. the sugar you stole, the last train home, the dog who chose us.\n\ni kept the ticket stubs, the photo-booth strips and the napkin from the first night. **i keep everything that has you in it.**\n\n*happy one year. here's to the next page.*",
    photos: demoPhotos(["p1", "p7", "p2", "p4", "p5", "p6", "p8", "p3"], {
      p1: "you + me",
      p7: "july",
      p2: "lost on purpose",
      p4: "nube",
      p5: "no signal",
      p6: "the 23:40",
      p8: "your notes",
      p3: "30 candles",
    }),
    fields: { theme: "blossom", headline: undefined, quote: undefined, tag: undefined },
  },
  es: {
    ...shared,
    locale: "es",
    title: "para elena",
    message:
      "elena,\n\nesto es cada pequeña cosa que no quería olvidar. el azúcar que me robaste, el último tren a casa, el perro que nos eligió.\n\nguardé las entradas, las tiras del fotomatón y la servilleta de la primera noche. **guardo todo lo que te tiene dentro.**\n\n*feliz primer año. por la próxima página.*",
    photos: demoPhotos(["p1", "p7", "p2", "p4", "p5", "p6", "p8", "p3"], {
      p1: "tú + yo",
      p7: "julio",
      p2: "perdidos a propósito",
      p4: "nube",
      p5: "sin cobertura",
      p6: "el de las 23:40",
      p8: "tus notas",
      p3: "30 velas",
    }),
    fields: { theme: "blossom", headline: undefined, quote: undefined, tag: undefined },
  },
};
