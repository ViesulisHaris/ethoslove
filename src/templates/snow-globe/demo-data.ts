import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { SnowGlobeFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "snow-globe",
  messageStyle: "typewriter" as const,
  accentColor: "#2F6B4F",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  music: {
    source: "library" as const,
    url: "/audio/library/paper-boats.mp3",
    trackId: "paper-boats",
    title: "Music Box",
    startAt: 0,
  },
  video: undefined,
};

export const demoData: Record<"en" | "es", GiftData<SnowGlobeFields>> = {
  en: {
    ...shared,
    locale: "en",
    recipientName: "Nora",
    senderName: "Théo",
    title: "Our winter, in a globe",
    message:
      "Every December your mother asks whether we're coming, and every December I say I'll check the trains, and then I don't, because I already know the answer is yes.\n\n**This one is different.** I'm not going back after. I handed in the flat on Tuesday. The boxes are in my brother's garage and the kettle is in my rucksack, which is the only thing I actually cared about bringing.\n\nSo shake it. Keep shaking it. *I want you to see what's in there before I say the rest of it.*",
    photos: demoPhotos(["p1", "p6", "p8"], {
      p1: "the café with the broken heater",
      p6: "the 23:40, coming to you for once",
      p8: "your list of everything we'd do in the snow",
    }),
    countdown: {
      targetAt: "2026-12-23T18:20:00+01:00",
      timezone: "Europe/Paris",
      label: "Until I'm at your door",
    },
    surprise: {
      text: "The kettle isn't the only thing I brought. Look under the tree on the 24th — the small box, not the big one.",
      reveal: "shake" as const,
    },
    fields: {
      scene: "homes",
      mood: "lamplit",
      shakes: "three",
      plaque: "the winter we stopped counting trains",
      lines: ["The heating broke and neither of us said a word about it.", "You hang the same crooked star every single year."],
    },
  },
  es: {
    ...shared,
    locale: "es",
    recipientName: "Marta",
    senderName: "Rubén",
    title: "Nuestro invierno, en una bola",
    message:
      "Cada diciembre tu madre pregunta si vamos, y cada diciembre digo que miro los trenes, y luego no los miro, porque ya sé que la respuesta es que sí.\n\n**Este año es distinto.** No vuelvo después. Entregué el piso el martes. Las cajas están en el garaje de mi hermano y el hervidor va en la mochila, que era lo único que me importaba traer.\n\nAsí que agítala. Sigue agitándola. *Quiero que veas lo que hay dentro antes de que te cuente el resto.*",
    photos: demoPhotos(["p1", "p6", "p8"], {
      p1: "el café de la estufa rota",
      p6: "el de las 23:40, esta vez hacia ti",
      p8: "tu lista de todo lo que haríamos con nieve",
    }),
    countdown: {
      targetAt: "2026-12-23T19:20:00+01:00",
      timezone: "Europe/Madrid",
      label: "Hasta que llame a tu puerta",
    },
    surprise: {
      text: "El hervidor no es lo único que traigo. Mira debajo del árbol el día 24: la caja pequeña, no la grande.",
      reveal: "shake" as const,
    },
    fields: {
      scene: "homes",
      mood: "lamplit",
      shakes: "three",
      plaque: "el invierno que dejamos de mirar trenes",
      lines: ["Se rompió la calefacción y ninguno dijo nada.", "Cada año cuelgas la misma estrella torcida."],
    },
  },
};
