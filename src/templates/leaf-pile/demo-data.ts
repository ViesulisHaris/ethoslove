import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { LeafPileFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "leaf-pile",
  recipientName: "Mara",
  senderName: "Jonah",
  messageStyle: "typewriter" as const,
  accentColor: "#C8561A",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/simple-gifts.mp3",
    trackId: "simple-gifts",
    title: "Simple Gifts",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<LeafPileFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "thankful for you",
    message:
      "You rake the leaves into one pile every October, and every October you jump in it before you bag it. You're thirty-one. I love that about you more than I can say properly.\n\nThis year had some cold weeks. You made them warmer without trying: soup on the stove, your hand in my coat pocket, the bad playlist on the drive up north.\n\nI'm thankful for you. Not in a card-aisle way. In a way I notice every single day.\n\n**Happy Thanksgiving, Mara.** *I'll hold the bag this year.*",
    photos: demoPhotos(["p7", "p1", "p4", "p3"], {
      p7: "the drive up north, the bad playlist",
      p1: "Sunday coffee, the cold porch",
      p4: "Nube, who also jumps in the pile",
      p3: "your birthday, the cake we both burned",
    }),
    surprise: {
      text: "A cabin with a fireplace, the second weekend of December. I already packed your thick socks.",
      reveal: "tap" as const,
    },
    fields: { line: "for every cold hand in my pocket, and every pile of leaves you jumped in", look: "deck" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "doy gracias por ti",
    message:
      "Cada octubre juntas las hojas en un montón y cada octubre saltas encima antes de meterlas en la bolsa. Tienes treinta y un años. Me encanta eso de ti más de lo que sé decir.\n\nEste año hubo semanas frías. Tú las hiciste más cálidas sin proponértelo: sopa al fuego, tu mano en el bolsillo de mi abrigo, la lista de canciones mala en el viaje al norte.\n\nDoy gracias por ti. No como en las tarjetas. Como algo que noto cada día.\n\n**Feliz Acción de Gracias, Mara.** *Este año sujeto yo la bolsa.*",
    photos: demoPhotos(["p7", "p1", "p4", "p3"], {
      p7: "el viaje al norte, la lista mala",
      p1: "café de domingo, el porche frío",
      p4: "Nube, que también salta en el montón",
      p3: "tu cumpleaños, la tarta que quemamos los dos",
    }),
    surprise: {
      text: "Una cabaña con chimenea, el segundo fin de semana de diciembre. Ya te he metido los calcetines gordos.",
      reveal: "tap" as const,
    },
    fields: { line: "por cada mano fría en mi bolsillo y cada montón de hojas en el que saltaste", look: "deck" },
  },
};
