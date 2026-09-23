import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { PackYourBagsFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "pack-your-bags",
  messageStyle: "typewriter" as const,
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  video: undefined,
  surprise: undefined,
};

export const demoData: Record<"en" | "es", GiftData<PackYourBagsFields>> = {
  en: {
    ...shared,
    locale: "en",
    recipientName: "Hannah",
    senderName: "Rory",
    accentColor: "#2E6BB0",
    title: "",
    music: {
      source: "library" as const,
      url: "/audio/library/golden-hour.mp3",
      trackId: "golden-hour",
      title: "Golden Hour",
      startAt: 0,
    },
    countdown: {
      targetAt: "2026-10-16T07:40:00+01:00",
      timezone: "Europe/London",
      label: "Until we fly",
    },
    message:
      "In March you told me you'd never seen a sunset worth clapping for. I've been planning this ever since.\n\n**Four nights. A small white room with a blue door, and a view you're going to be unbearable about.** I've booked the table you'd have said was too much, and I've checked: the steps up from the harbour are fine if I carry the big bag.\n\nAll you have to do is pack. And clap, when it's time. *Everyone does.*",
    photos: demoPhotos(["p7", "p2", "p5"], {
      p7: "the sea in july. next one's warmer",
      p2: "lisbon. you navigated. we don't talk about it",
      p5: "no signal, no plans. again soon",
    }),
    fields: {
      trip: "flight",
      fromCity: "London",
      toCity: "Santorini",
      stops: [],
      when: "Fri 16 Oct",
      nights: 4,
      clues: ["your passport (it's in the drawer)", "the white linen shirt", "sun cream, the strong one"],
    },
  },
  es: {
    ...shared,
    locale: "es",
    recipientName: "Lucía",
    senderName: "Andrés",
    accentColor: "#C8553D",
    title: "",
    music: {
      source: "library" as const,
      url: "/audio/library/home.mp3",
      trackId: "home",
      title: "Ventanilla bajada",
      startAt: 0,
    },
    countdown: {
      targetAt: "2026-10-23T09:00:00+02:00",
      timezone: "Europe/Rome",
      label: "Hasta que arranquemos",
    },
    message:
      "Llevas meses diciendo que un día nos perdemos por la Toscana sin mirar el reloj. Pues ese día ya tiene fecha.\n\n**Tres noches, un coche pequeño y ningún plan más allá de comer bien y parar donde nos dé la gana.** Ya he mirado desde dónde se ve mejor el atardecer y dónde hacen esos pici que tanto te gustan.\n\nTú solo haz la maleta. Yo conduzco y tú pones la música, *aunque sea lo de siempre.*",
    photos: demoPhotos(["p1", "p7", "p8"], {
      p1: "el primer café. me robaste el azúcar",
      p7: "julio, cuando todo iba despacio",
      p8: "tú dejas notas. yo las guardo todas",
    }),
    fields: {
      trip: "road",
      fromCity: "Florencia",
      toCity: "Montepulciano",
      stops: ["Greve in Chianti", "Siena", "Pienza"],
      when: "vie 23 oct",
      nights: 3,
      clues: ["gafas de sol", "tu chaqueta vaquera", "hambre de pasta"],
    },
  },
};
