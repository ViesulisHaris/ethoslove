import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { AutumnReelFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "autumn-reel",
  recipientName: "Maya",
  senderName: "Leo",
  messageStyle: "fade" as const,
  accentColor: "#B5481C",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", artist: "an autumn film", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<AutumnReelFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "autumn reel",
    message: "If our year were a film, I'd keep rewinding to October: the cold coming in, the light going gold at four, you in my jumper pretending it's yours.\n\n**You're the best part of every reel I've got.** The blurry ones, the ones with your thumb in the corner, the ones where you're laughing too hard to look at the camera.\n\n*Here's to a hundred more autumns on film.*",
    photos: demoPhotos(["p1", "p2", "p6", "p8", "p3", "p5", "p7"], { p1: "our first coffee", p2: "lisbon in october", p6: "the 23:40 to you", p8: "you leave notes. i keep them.", p3: "one candle short", p5: "no signal, just stars", p7: "the last warm day" }),
    surprise: { text: "Sunday: the old cinema on the corner, the matinee, the back row. I've already bought the popcorn.", reveal: "tap" },
    fields: { look: "rust" },
  },
  es: {
    ...shared,
    locale: "es",
    music: { ...shared.music, artist: "una película de otoño" },
    title: "carrete de otoño",
    message: "Si nuestro año fuera una película, rebobinaría siempre hasta octubre: el frío entrando, la luz dorada a las cuatro, tú con mi jersey haciendo como que es tuyo.\n\n**Eres lo mejor de cada carrete que tengo.** Las fotos movidas, las del dedo en la esquina, las que te ríes tanto que no miras a la cámara.\n\n*Por cien otoños más en película.*",
    photos: demoPhotos(["p1", "p2", "p6", "p8", "p3", "p5", "p7"], { p1: "nuestro primer café", p2: "lisboa en octubre", p6: "el de las 23:40 hacia ti", p8: "dejas notas. yo las guardo.", p3: "faltaba una vela", p5: "sin cobertura, solo estrellas", p7: "el último día de calor" }),
    surprise: { text: "El domingo: el cine antiguo de la esquina, la sesión de tarde, la última fila. Ya he comprado las palomitas.", reveal: "tap" },
    fields: { look: "rust" },
  },
};
