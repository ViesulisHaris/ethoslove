import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { DarkRomanceFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "dark-romance",
  recipientName: "Maya",
  senderName: "Leo",
  messageStyle: "fade" as const,
  accentColor: "#9B1B30",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/slow-dance.mp3", trackId: "slow-dance", title: "Slow Dance", artist: "our song", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<DarkRomanceFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "for maya",
    message: "I don't believe in fate, but I believe in the way you look at me across a room full of people.\n\n**I'd choose you in every life, even the ones where it ends badly.** Especially those.\n\n*I kept the rest of it here, where only you would think to look.*",
    photos: demoPhotos(["p6", "p1", "p2", "p8", "p5", "p3", "p7"], { p6: "the 23:40 to you", p1: "our first coffee", p2: "lisbon after midnight", p8: "your handwriting, kept", p5: "just us and the dark", p3: "one more year of you", p7: "the slow days" }),
    surprise: { text: "Saturday, 9pm. Candles, red wine and the record you hate that I love.", reveal: "tap" },
    fields: { look: "bordeaux" },
  },
  es: {
    ...shared,
    locale: "es",
    music: { ...shared.music, artist: "nuestra canción" },
    title: "para maya",
    message: "No creo en el destino, pero creo en cómo me miras desde el otro lado de una habitación llena de gente.\n\n**Te elegiría en cada vida, incluso en las que acaban mal.** Sobre todo en esas.\n\n*Guardé el resto aquí, donde solo tú pensarías en buscar.*",
    photos: demoPhotos(["p6", "p1", "p2", "p8", "p5", "p3", "p7"], { p6: "el de las 23:40 hacia ti", p1: "nuestro primer café", p2: "lisboa pasada la medianoche", p8: "tu letra, guardada", p5: "solo nosotros y la oscuridad", p3: "un año más de ti", p7: "los días lentos" }),
    surprise: { text: "Sábado, a las 9. Velas, vino tinto y ese disco que odias y a mí me encanta.", reveal: "tap" },
    fields: { look: "bordeaux" },
  },
};
