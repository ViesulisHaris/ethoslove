import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { TimelineFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "our-timeline",
  recipientName: "Ana",
  senderName: "Marco",
  messageStyle: "fade" as const,
  accentColor: "#2E4A62",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  music: { source: "library" as const, url: "/audio/library/first-light.mp3", trackId: "first-light", title: "First Light", startAt: 0 },
  video: undefined,
  surprise: undefined,
  countdown: { targetAt: "2027-06-14T00:00:00+03:00", timezone: "Europe/Riga", label: "Until four" },
};

export const demoData: Record<"en" | "es", GiftData<TimelineFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "Three years, in order",
    message: "Somewhere between the second coffee and the third city I stopped counting and started keeping. **This is what I kept.**\n\nThe road keeps going. I've checked.",
    photos: demoPhotos(["p1", "p2", "p7", "p5", "p4", "p8"], { p1: "The seat wasn't taken.", p2: "We got lost on purpose.", p7: "Everything slowed down.", p5: "No signal. No plans.", p4: "The day Nube chose us.", p8: "You leave notes. I keep them." }),
    fields: { road: "ink", dates: ["June 2024", "October 2024", "July 2025", "August 2025", "March 2026", "Now"], ending: "…and it's only the beginning." },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Tres años, en orden",
    message: "En algún punto entre el segundo café y la tercera ciudad dejé de contar y empecé a guardar. **Esto es lo que guardé.**\n\nEl camino sigue. Lo he comprobado.",
    photos: demoPhotos(["p1", "p2", "p7", "p5", "p4", "p8"], { p1: "El asiento no estaba ocupado.", p2: "Nos perdimos a propósito.", p7: "Todo fue más despacio.", p5: "Sin cobertura. Sin planes.", p4: "El día que Nube nos eligió.", p8: "Dejas notas. Yo las guardo." }),
    countdown: { ...shared.countdown, label: "Hasta los cuatro" },
    fields: { road: "ink", dates: ["Junio 2024", "Octubre 2024", "Julio 2025", "Agosto 2025", "Marzo 2026", "Ahora"], ending: "…y esto solo es el principio." },
  },
};
