import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { GardenFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "garden",
  recipientName: "Ana",
  senderName: "Marco",
  messageStyle: "typewriter" as const,
  accentColor: "#C8475A",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  music: { source: "library" as const, url: "/audio/library/first-light.mp3", trackId: "first-light", title: "First Light", startAt: 0 },
  video: undefined,
  countdown: undefined,
  surprise: undefined,
};

const fields: GardenFields = { garden: "blush", blooms: "wildflowers", companion: "butterfly" };

export const demoData: Record<"en" | "es", GiftData<GardenFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "Everything I planted",
    message:
      "You said once that you'd like a garden one day, and then you changed the subject like you always do when you want something.\n\nSo I've been keeping one. It's been three years. **Every single thing in here is a day with you** — the ones you'd expect and the ones you'd have forgotten by now, like the Tuesday we ate cereal for dinner and you fell asleep mid-sentence.\n\nNone of it needed watering. It just kept going, quietly, the way you do.\n\n*Take the whole thing.*",
    photos: demoPhotos(["p1", "p2", "p4", "p7", "p8", "p5"], {
      p1: "the first coffee, and you stole my sugar",
      p2: "lost on purpose, Lisbon",
      p4: "the day Nube picked us",
      p7: "July, when everything was slow",
      p8: "you leave notes. I keep them.",
      p5: "no signal, no plans",
    }),
    fields: { ...fields, tag: "For Ana — all of it" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Todo lo que planté",
    message:
      "Una vez dijiste que algún día te gustaría tener un jardín, y enseguida cambiaste de tema, como haces siempre que quieres algo.\n\nAsí que llevo tres años cuidando uno. **Cada cosa que hay aquí es un día contigo** — los que te imaginas y los que ya habrás olvidado, como el martes que cenamos cereales y te dormiste a media frase.\n\nNo hubo que regarlo. Siguió creciendo solo, sin hacer ruido, como haces tú.\n\n*Llévatelo entero.*",
    photos: demoPhotos(["p1", "p2", "p4", "p7", "p8", "p5"], {
      p1: "el primer café, y me robaste el azúcar",
      p2: "perdidos a propósito, Lisboa",
      p4: "el día que Nube nos eligió",
      p7: "julio, cuando todo iba despacio",
      p8: "tú dejas notas. Yo las guardo.",
      p5: "sin cobertura, sin planes",
    }),
    fields: { ...fields, tag: "Para Ana — todo entero" },
  },
};
