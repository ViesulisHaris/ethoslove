import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { FallForYouFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "fall-for-you",
  recipientName: "Maya",
  senderName: "Leo",
  messageStyle: "fade" as const,
  accentColor: "#C8602A",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/fireside.mp3", trackId: "fireside", title: "Fireside", artist: "our autumn", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<FallForYouFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "fall for you",
    message: "Every year the leaves turn and I think, this is the season I fell for you. Then the next one comes round and I fall all over again.\n\n**You're the warmest thing about autumn.** The blanket, the candle, the cup of something sweet, and you stealing the end of the sofa.\n\n*Let's never miss an October.*",
    photos: demoPhotos(["p1", "p2", "p6", "p8", "p3", "p5", "p7"], { p1: "our first coffee", p2: "lisbon in october", p6: "the 23:40 to you", p8: "you leave notes. i keep them.", p3: "one candle short", p5: "no signal, just stars", p7: "the last warm day" }),
    surprise: { text: "Saturday: the apple orchard, then cider by the fire. Bring your big scarf. I'm bringing the blanket.", reveal: "tap" },
    fields: { look: "gingham" },
  },
  es: {
    ...shared,
    locale: "es",
    music: { ...shared.music, artist: "nuestro otoño" },
    title: "otoño contigo",
    message: "Cada año cambian las hojas y pienso: esta es la estación en la que me enamoré de ti. Luego llega la siguiente y vuelvo a enamorarme otra vez.\n\n**Eres lo más cálido del otoño.** La manta, la vela, la taza de algo dulce, y tú robándome la punta del sofá.\n\n*Que no se nos escape ningún octubre.*",
    photos: demoPhotos(["p1", "p2", "p6", "p8", "p3", "p5", "p7"], { p1: "nuestro primer café", p2: "lisboa en octubre", p6: "el de las 23:40 hacia ti", p8: "dejas notas. yo las guardo.", p3: "faltaba una vela", p5: "sin cobertura, solo estrellas", p7: "el último día de calor" }),
    surprise: { text: "El sábado: el huerto de manzanas y después sidra junto al fuego. Trae tu bufanda grande. Yo llevo la manta.", reveal: "tap" },
    fields: { look: "gingham" },
  },
};
