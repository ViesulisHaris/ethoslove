import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { FavoritePersonFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "favorite-person",
  recipientName: "Maya",
  senderName: "Leo",
  messageStyle: "fade" as const,
  accentColor: "#E07A98",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/sunday-slowly.mp3", trackId: "sunday-slowly", title: "Sunday Slowly", artist: "you and me", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<FavoritePersonFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "for maya",
    message: "I keep every little thing. The ticket from our first film, the napkin you drew on, the photo where you're laughing too hard to look at the camera.\n\n**You're my favorite person and it isn't close.**\n\n*Thank you for all of it, the big days and the quiet ones.*",
    photos: demoPhotos(["p1", "p2", "p8", "p5", "p3", "p7", "p6"], { p1: "our first coffee", p2: "lisbon, lost on purpose", p8: "you leave notes, i keep them", p5: "no signal, just stars", p3: "thirty candles", p7: "slow july", p6: "the 23:40 to you" }),
    surprise: { text: "Saturday: the flower market, then the bakery you love, then wherever you want.", reveal: "tap" },
    fields: { look: "blush" },
  },
  es: {
    ...shared,
    locale: "es",
    music: { ...shared.music, artist: "tú y yo" },
    title: "para maya",
    message: "Guardo cada cosita. La entrada de nuestra primera peli, la servilleta que dibujaste, la foto en la que te ríes tanto que no miras a la cámara.\n\n**Eres mi persona favorita y no hay comparación.**\n\n*Gracias por todo, por los días grandes y por los tranquilos.*",
    photos: demoPhotos(["p1", "p2", "p8", "p5", "p3", "p7", "p6"], { p1: "nuestro primer café", p2: "lisboa, perdidos a propósito", p8: "tú dejas notas, yo las guardo", p5: "sin cobertura, solo estrellas", p3: "treinta velas", p7: "julio lento", p6: "el de las 23:40 hacia ti" }),
    surprise: { text: "Sábado: el mercado de flores, luego tu panadería favorita y luego donde tú quieras.", reveal: "tap" },
    fields: { look: "blush" },
  },
};
