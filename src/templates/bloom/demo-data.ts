import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { BloomFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "bloom",
  recipientName: "Mamá",
  senderName: "Dani",
  messageStyle: "typewriter" as const,
  accentColor: "#E07A8C",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  music: {
    source: "library" as const,
    url: "/audio/library/first-light.mp3",
    trackId: "first-light",
    title: "Still Light",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
  surprise: {
    text: "Sunday. 1pm. Your place. I'm cooking, you're sitting down for once.",
    reveal: "hold" as const,
  },
};

export const demoData: Record<"en" | "es", GiftData<BloomFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "One that doesn't wilt",
    message:
      'You grew a lot of things. Tomatoes on a balcony that faced the wrong way. Three kids with the same nose. A habit of saying *"eat something"* before *"hello"*.\n\n**This one is for you, and it opens as slowly as you deserve.**\n\nHappy Mother\'s Day. Eat something.',
    photos: demoPhotos(["p8", "p3", "p7"], {
      p8: "The kitchen, obviously",
      p3: "Every birthday, the same cake, on purpose",
      p7: "Summer, before we knew about sunscreen",
    }),
    fields: { flower: "peony", sky: "dawn", pollen: true, stickers: true, pot: true },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Una que no se marchita",
    message:
      "Has hecho crecer muchas cosas. Tomates en un balcón orientado al revés. Tres hijos con la misma nariz. La costumbre de decir *«come algo»* antes que *«hola»*.\n\n**Esta es para ti, y se abre tan despacio como te mereces.**\n\nFeliz Día de la Madre. Come algo.",
    photos: demoPhotos(["p8", "p3", "p7"], {
      p8: "La cocina, obviamente",
      p3: "Cada cumpleaños, la misma tarta, a propósito",
      p7: "Verano, antes de saber lo que era la crema solar",
    }),
    fields: { flower: "peony", sky: "dawn", pollen: true, stickers: true, pot: true },
  },
};
