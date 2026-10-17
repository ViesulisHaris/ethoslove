import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { DigicamFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "digicam",
  recipientName: "Nora",
  senderName: "Leo",
  messageStyle: "typewriter" as const,
  accentColor: "#E0558A",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/home.mp3", trackId: "home", title: "Home", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

const ROLL = ["p3", "p2", "p6", "p4", "p5", "p8"] as const;

export const demoData: Record<"en" | "es", GiftData<DigicamFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "happy birthday, nora",
    message:
      "I bought this camera at the flea market for eleven euros because the man swore it still worked. It does. So I put our year on it, the way we'd have kept it in 2006.\n\nYour cake last year, Lisbon when we missed the last tram on purpose, the night train, Nube's first day home, the night with no signal. **Every photo on this card has you in it, or was taken for you.**\n\nHappy birthday. *Keep the prints. I've already ordered a second set for the fridge.*",
    photos: demoPhotos([...ROLL], { p3: "your cake, last year", p2: "lisbon, missed the tram", p6: "the 23:40 to you", p4: "nube's first day home", p5: "no signal, just us", p8: "you left this in my book" }),
    surprise: { text: "Saturday, 11am. Bring the camera: we're filling a new card at the flea market.", reveal: "tap" },
    fields: { birthday: true, body: "pink", stamp: true, stampDate: "2026-09-25" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "feliz cumple, nora",
    message:
      "Compré esta cámara en el rastro por once euros porque el señor juraba que funcionaba. Funciona. Así que he metido nuestro año dentro, como lo habríamos guardado en 2006.\n\nTu tarta del año pasado, Lisboa cuando perdimos el último tranvía a propósito, el tren nocturno, el primer día de Nube en casa, la noche sin cobertura. **Todas las fotos de esta tarjeta te tienen dentro, o las hice pensando en ti.**\n\nFeliz cumple. *Quédate las copias. Yo ya he encargado otras para la nevera.*",
    photos: demoPhotos([...ROLL], { p3: "tu tarta, el año pasado", p2: "lisboa, adiós tranvía", p6: "el de las 23:40 hacia ti", p4: "el primer día de nube", p5: "sin cobertura, solo tú", p8: "lo dejaste en mi libro" }),
    surprise: { text: "El sábado a las 11. Trae la cámara: vamos a llenar otra tarjeta en el rastro.", reveal: "tap" },
    fields: { birthday: true, body: "pink", stamp: true, stampDate: "2026-09-25" },
  },
};
