import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { UnwrappedFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "unwrapped",
  recipientName: "Nina",
  senderName: "Ollie",
  messageStyle: "typewriter" as const,
  accentColor: "#C62F2A",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/waltz-of-the-flowers.mp3",
    trackId: "waltz-of-the-flowers",
    title: "Waltz of the Flowers",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<UnwrappedFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "our year, unwrapped",
    message:
      "I tried to sum up this year and kept getting the numbers wrong, so I counted properly.\n\nSome of it was easy. The voice notes, I just scrolled. The coffees, I've kept a tally on the fridge since March. The blanket I counted out of spite.\n\nWhat I couldn't count is how often I looked across a room and was glad it was you.\n\n**Merry Christmas, Nina.** *Here's to the next 365.*",
    photos: demoPhotos(["p2", "p7", "p5", "p6"], {
      p2: "city no. 1, where we got lost first",
      p7: "the summer of saying yes",
      p5: "no signal, best night of the year",
      p6: "the train I took to get to you",
    }),
    surprise: {
      text: "One more number: 2. That's how many tickets are in the envelope under your pillow.",
      reveal: "tap" as const,
    },
    fields: {
      look: "red",
      stats: ["1,284 voice notes", "212 coffees I made you", "41 nights you stole the blanket", "3 cities we got lost in", "17 rewatches of the same film", "one very spoiled dog"],
    },
  },
  es: {
    ...shared,
    locale: "es",
    title: "nuestro año, desenvuelto",
    message:
      "Intenté resumir este año y me salían mal las cuentas, así que lo conté bien.\n\nAlgunas cosas fueron fáciles. Los audios, bastaba con hacer scroll. Los cafés, llevo la cuenta en la nevera desde marzo. Lo de la manta lo conté por despecho.\n\nLo que no he podido contar es cuántas veces he mirado al otro lado de la habitación y me ha alegrado que fueras tú.\n\n**Feliz Navidad, Nina.** *Por los próximos 365.*",
    photos: demoPhotos(["p2", "p7", "p5", "p6"], {
      p2: "ciudad n.º 1, donde nos perdimos primero",
      p7: "el verano de decir que sí",
      p5: "sin cobertura, la mejor noche del año",
      p6: "el tren que cogí para llegar a ti",
    }),
    surprise: {
      text: "Un número más: 2. Son las entradas que hay en el sobre debajo de tu almohada.",
      reveal: "tap" as const,
    },
    fields: {
      look: "red",
      stats: ["1.284 audios", "212 cafés que te he hecho", "41 noches robándome la manta", "3 ciudades donde nos perdimos", "17 veces la misma peli", "un perro muy mimado"],
    },
  },
};
