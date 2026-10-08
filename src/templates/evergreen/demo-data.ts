import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { EvergreenFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "evergreen",
  recipientName: "Maya",
  senderName: "Leo",
  messageStyle: "fade" as const,
  accentColor: "#4F6B42",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/home.mp3", trackId: "home", title: "Home", artist: "our song", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<EvergreenFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "for maya",
    message: "Some people are a season. You're the whole year, the quiet green that's still there when everything else has changed.\n\n**I'd choose you in every weather.**\n\n*Let's keep growing like this, slowly, together.*",
    photos: demoPhotos(["p7", "p2", "p1", "p5", "p8", "p3", "p6"], { p7: "slow july", p2: "lisbon, lost on purpose", p1: "our first coffee", p5: "no signal, just stars", p8: "your notes, kept", p3: "thirty candles", p6: "the 23:40 to you" }),
    surprise: { text: "Sunday: the botanical garden, then a picnic by the lake.", reveal: "tap" },
    fields: { look: "sage" },
  },
  es: {
    ...shared,
    locale: "es",
    music: { ...shared.music, artist: "nuestra canción" },
    title: "para maya",
    message: "Hay personas que son una estación. Tú eres el año entero, el verde tranquilo que sigue ahí cuando todo lo demás ha cambiado.\n\n**Te elegiría con cualquier tiempo.**\n\n*Sigamos creciendo así, despacio, juntos.*",
    photos: demoPhotos(["p7", "p2", "p1", "p5", "p8", "p3", "p6"], { p7: "julio lento", p2: "lisboa, perdidos a propósito", p1: "nuestro primer café", p5: "sin cobertura, solo estrellas", p8: "tus notas, guardadas", p3: "treinta velas", p6: "el de las 23:40 hacia ti" }),
    surprise: { text: "Domingo: el jardín botánico y después un picnic junto al lago.", reveal: "tap" },
    fields: { look: "sage" },
  },
};
