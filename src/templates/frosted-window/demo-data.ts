import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { FrostedWindowFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "frosted-window",
  recipientName: "Ava",
  senderName: "Sam",
  messageStyle: "typewriter" as const,
  accentColor: "#B3241E",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/bleak-midwinter.mp3",
    trackId: "bleak-midwinter",
    title: "In the Bleak Midwinter",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<FrostedWindowFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "look outside",
    message:
      "Remember the first winter, when the heating broke and we slept in our coats and you said it was romantic? It was not romantic. It was minus four.\n\nEvery winter since has been warmer, and not because we fixed the heating (we didn't, for two years). It's you. You make every room the warm one.\n\nI built him in the dark, by the way. Please appreciate the carrot.\n\n**Merry Christmas, Ava.** *Come inside, it's cold.*",
    photos: demoPhotos(["p3", "p1", "p4", "p7"], {
      p3: "your birthday, the cake we both burned",
      p1: "the first coffee in the new flat",
      p4: "Nube, who does not like snow",
      p7: "the summer, for when you miss it",
    }),
    surprise: {
      text: "Two tickets to the ice rink on the 27th, then hot chocolate at the place with the marshmallows.",
      reveal: "tap" as const,
    },
    fields: { sign: "merry christmas, Ava", look: "cottage" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "mira fuera",
    message:
      "¿Te acuerdas del primer invierno, cuando se rompió la calefacción, dormimos con el abrigo puesto y dijiste que era romántico? No era romántico. Hacía cuatro bajo cero.\n\nCada invierno desde entonces ha sido más cálido, y no porque arregláramos la calefacción (no lo hicimos en dos años). Eres tú. Tú haces que cualquier habitación sea la cálida.\n\nLo hice a oscuras, por cierto. Valora la zanahoria.\n\n**Feliz Navidad, Ava.** *Entra, que hace frío.*",
    photos: demoPhotos(["p3", "p1", "p4", "p7"], {
      p3: "tu cumpleaños, la tarta que quemamos los dos",
      p1: "el primer café en el piso nuevo",
      p4: "Nube, a la que no le gusta la nieve",
      p7: "el verano, para cuando lo eches de menos",
    }),
    surprise: {
      text: "Dos entradas para la pista de hielo el día 27 y luego chocolate caliente en el sitio de las nubes.",
      reveal: "tap" as const,
    },
    fields: { sign: "feliz navidad, Ava", look: "cottage" },
  },
};
