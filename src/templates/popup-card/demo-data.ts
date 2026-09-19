import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { PopupCardFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "popup-card",
  recipientName: "Ana",
  senderName: "Marco",
  messageStyle: "typewriter" as const,
  accentColor: "#D9667C",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<PopupCardFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "Ana turns 30",
    message: "I wanted to make you a card with my hands, and my hands can't draw, so I made this one with the other thing they can do.\n\nThirty suits you. **You got braver every year and never once got louder about it.** I watch you fix the thing everyone else is talking about fixing.\n\n*Blow the candles out. I already know what I'd wish for.*",
    photos: demoPhotos(["p3", "p1", "p2", "p4", "p8"], { p3: "Last year, one candle short", p1: "The café where it started", p2: "Lisbon, lost on purpose", p4: "Nube, who came to every party", p8: "The notes you leave" }),
    surprise: { text: "Look under the plant pot by the door when you get home. It's small. It's not nothing.", reveal: "tap" },
    fields: { theme: "vanilla", age: 30, flames: "auto" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Ana cumple 30",
    message: "Quería hacerte una tarjeta con las manos, y mis manos no saben dibujar, así que hice esta con lo otro que sí saben hacer.\n\nLos treinta te quedan bien. **Cada año te has vuelto más valiente y nunca has hecho más ruido por ello.** Te veo arreglar lo que todos los demás solo hablan de arreglar.\n\n*Apaga las velas. Yo ya sé lo que pediría.*",
    photos: demoPhotos(["p3", "p1", "p2", "p4", "p8"], { p3: "El año pasado, a una vela", p1: "El café donde empezó", p2: "Lisboa, perdidos a propósito", p4: "Nube, que vino a todas las fiestas", p8: "Las notas que dejas" }),
    surprise: { text: "Mira debajo de la maceta de la puerta cuando llegues a casa. Es pequeño. No es nada... pero es algo.", reveal: "tap" },
    fields: { theme: "vanilla", age: 30, flames: "auto" },
  },
};
