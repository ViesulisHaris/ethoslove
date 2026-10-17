import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { OnRepeatFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "on-repeat",
  recipientName: "Maya",
  senderName: "Leo",
  messageStyle: "fade" as const,
  accentColor: "#E2557F",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/first-light.mp3", trackId: "first-light", title: "First Light", artist: "for maya", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<OnRepeatFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "for maya",
    message: "Every song I like now is secretly about you. I don't skip anything that reminds me of you, which means I don't skip anything anymore.\n\n**You're the one I'd put on repeat.**\n\n*Press play on the rest of it with me.*",
    photos: demoPhotos(["p1", "p6", "p2", "p5", "p7", "p3", "p8"], { p1: "our first coffee", p6: "the 23:40 to you", p2: "lost in lisbon", p5: "no signal", p7: "slow july", p3: "thirty candles", p8: "your notes" }),
    surprise: { text: "Friday night: the concert you didn't think I'd get tickets for.", reveal: "tap" },
    fields: { look: "sunset" },
  },
  es: {
    ...shared,
    locale: "es",
    music: { ...shared.music, artist: "para maya" },
    title: "para maya",
    message: "Ahora todas las canciones que me gustan hablan de ti en secreto. No salto ninguna que me recuerde a ti, o sea que ya no salto ninguna.\n\n**Eres lo que pondría en bucle.**\n\n*Dale play a todo lo que queda conmigo.*",
    photos: demoPhotos(["p1", "p6", "p2", "p5", "p7", "p3", "p8"], { p1: "nuestro primer café", p6: "el de las 23:40", p2: "perdidos en lisboa", p5: "sin cobertura", p7: "julio lento", p3: "treinta velas", p8: "tus notas" }),
    surprise: { text: "El viernes por la noche: el concierto para el que no creías que conseguiría entradas.", reveal: "tap" },
    fields: { look: "sunset" },
  },
};
