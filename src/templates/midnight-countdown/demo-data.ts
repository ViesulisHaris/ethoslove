import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { MidnightFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "midnight-countdown",
  recipientName: "Ana",
  senderName: "Marco",
  messageStyle: "fade" as const,
  accentColor: "#F2C879",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  music: { source: "library" as const, url: "/audio/library/under-the-stars.mp3", trackId: "under-the-stars", title: "Under the Stars", startAt: 0 },
  video: undefined,
  surprise: undefined,
  countdown: { targetAt: "2027-01-01T00:00:00+02:00", timezone: "Europe/Riga", label: "Until midnight" },
};

export const demoData: Record<"en" | "es", GiftData<MidnightFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "Thirty, at midnight",
    message: "I wanted to be the first. Not the first text, the first *thing* — before the phone fills up and the day gets loud.\n\nSo: happy birthday. Here's the year in six frames. **The next one starts now.**",
    photos: demoPhotos(["p2", "p7", "p5", "p1", "p4", "p8"]),
    fields: { skyline: "city", headline: "Until you're 30", zeroLine: "Happy birthday, Ana." },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Treinta, a medianoche",
    message: "Quería ser el primero. No el primer mensaje, la primera *cosa*: antes de que el teléfono se llene y el día se ponga ruidoso.\n\nAsí que: feliz cumpleaños. Aquí va el año en seis fotos. **El siguiente empieza ahora.**",
    photos: demoPhotos(["p2", "p7", "p5", "p1", "p4", "p8"], { p2: "Lisboa, la noche que nos perdimos a propósito", p7: "Julio, y todo iba despacio", p5: "Sin cobertura. Sin planes. Solo estrellas.", p1: "Nuestro primer café. Me robaste el azúcar.", p4: "El día que Nube nos eligió", p8: "Dejas notas. Yo las guardo todas." }),
    countdown: { ...shared.countdown, label: "Hasta medianoche" },
    fields: { skyline: "city", headline: "Hasta que cumplas 30", zeroLine: "Feliz cumpleaños, Ana." },
  },
};
