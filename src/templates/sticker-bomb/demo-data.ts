import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { StickerBombFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "sticker-bomb",
  recipientName: "Ana",
  senderName: "Marco",
  messageStyle: "fade" as const,
  accentColor: "#FF5C8A",
  fontPairing: "modern" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<StickerBombFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "for ana. no reason.",
    message: "No occasion. I just had eleven cat pictures saved that all look like you at different points of a normal Tuesday, and it felt wrong to keep them to myself.\n\n**The one in the shark hat is you before coffee.** The one crying at the phone is you watching that advert for the bank. The one in sunglasses is you after I say you were right.\n\n*You were right, by the way. About the thing. Don't make it weird.*",
    photos: demoPhotos(["p4", "p1", "p7"], { p4: "nube, who is also you", p1: "you, stealing sugar", p7: "you said “one more hill”" }),
    surprise: { text: "Check your bag. Inside pocket. It's the good chocolate.", reveal: "tap" },
    fields: { pack: "chaos", surface: "mat", labels: ["ana before coffee", "certified menace", "was right (once)", "emotional support human"] },
  },
  es: {
    ...shared,
    locale: "es",
    title: "para ana. porque sí.",
    message: "No hay ocasión. Solo tenía once fotos de gatos guardadas que se parecen a ti en distintos momentos de un martes normal, y me parecía mal quedármelas.\n\n**La del gorro de tiburón eres tú antes del café.** El que llora con el móvil eres tú viendo aquel anuncio del banco. El de las gafas de sol eres tú cuando digo que tenías razón.\n\n*Tenías razón, por cierto. En lo de aquello. No lo hagas raro.*",
    photos: demoPhotos(["p4", "p1", "p7"], { p4: "nube, que también eres tú", p1: "tú, robando azúcar", p7: "dijiste «una cuesta más»" }),
    surprise: { text: "Mira en tu bolso. Bolsillo interior. Es el chocolate bueno.", reveal: "tap" },
    fields: { pack: "chaos", surface: "mat", labels: ["ana antes del café", "amenaza certificada", "tuvo razón (una vez)", "humana de apoyo emocional"] },
  },
};
