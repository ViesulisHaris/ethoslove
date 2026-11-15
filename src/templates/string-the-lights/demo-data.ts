import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { StringTheLightsFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "string-the-lights",
  recipientName: "Mia",
  senderName: "Jack",
  messageStyle: "typewriter" as const,
  accentColor: "#C21E1E",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/o-christmas-tree.mp3",
    trackId: "o-christmas-tree",
    title: "O Christmas Tree",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<StringTheLightsFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "merry christmas",
    message:
      "Every December you stand in the garden and tell me the lights are crooked, and every December I say they're fine, and they are crooked. You're always right about the lights.\n\nI love that you care about a thing nobody else will ever notice. I love that our house is the one the neighbours' kids point at.\n\nThis year I'll hold the ladder and keep quiet.\n\n**Merry Christmas, Mia.** *Left a bit. No, your left.*",
    photos: demoPhotos(["p3", "p1", "p4", "p7"], {
      p3: "the lights, the year the fuse blew",
      p1: "hot coffee on the cold step",
      p4: "Nube, supervising from the window",
      p7: "summer, for when December is too long",
    }),
    surprise: {
      text: "The big star for the roof, the one you circled in the catalogue. It's in the shed behind the paint.",
      reveal: "tap" as const,
    },
    fields: { sign: "MERRY CHRISTMAS MIA", look: "red" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "feliz navidad",
    message:
      "Cada diciembre te plantas en el jardín y me dices que las luces están torcidas, y cada diciembre yo digo que están bien, y están torcidas. Siempre tienes razón con las luces.\n\nMe encanta que te importe algo en lo que nadie más se va a fijar. Me encanta que nuestra casa sea la que señalan los niños del barrio.\n\nEste año sujeto la escalera y me callo.\n\n**Feliz Navidad, Mia.** *Un poco a la izquierda. No, a tu izquierda.*",
    photos: demoPhotos(["p3", "p1", "p4", "p7"], {
      p3: "las luces, el año que saltó el fusible",
      p1: "café caliente en el escalón frío",
      p4: "Nube, vigilando desde la ventana",
      p7: "el verano, para cuando diciembre se hace largo",
    }),
    surprise: {
      text: "La estrella grande para el tejado, la que rodeaste en el catálogo. Está en el cobertizo, detrás de la pintura.",
      reveal: "tap" as const,
    },
    fields: { sign: "FELIZ NAVIDAD MIA", look: "red" },
  },
};
