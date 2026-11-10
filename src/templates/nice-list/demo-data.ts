import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { NiceListFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "nice-list",
  recipientName: "Ava",
  senderName: "Sam",
  messageStyle: "typewriter" as const,
  accentColor: "#D8342C",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/merry-christmas.mp3",
    trackId: "merry-christmas",
    title: "We Wish You a Merry Christmas",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<NiceListFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "the results are in",
    message:
      "After a long and fair review, the elves and I have reached a verdict.\n\nThe blanket situation was discussed at length. So was the dumpling. There were raised voices. Then somebody read out the soup, and the whole room went quiet.\n\nYou're on both lists, which I'm told almost never happens. I'm keeping you anyway.\n\n**Merry Christmas, Ava.** *Your presents are under the tree. All of them. Even the naughty ones.*",
    photos: demoPhotos(["p1", "p3", "p4", "p8"], {
      p1: "exhibit a: the stolen sugar",
      p3: "exhibit b: candles nobody was allowed to blow out",
      p4: "exhibit c: an accomplice",
      p8: "exhibit d: the notes. all of them.",
    }),
    surprise: {
      text: "The present you've been hinting about since October? It's real, it's wrapped, and it's hidden somewhere in the flat. Warm or cold, I'll tell you.",
      reveal: "tap" as const,
    },
    fields: {
      verdict: "both",
      look: "red",
      nice: ["made me soup when I was ill (it was mostly salt)", "remembered what my mum calls the dog", "warms my side of the bed first", "laughed at the penguin joke. twice."],
      naughty: ["stole the blanket, 41 nights out of 41", "ate the last dumpling and blamed the cat", "said 'five more minutes' 300 times", "skips the intro of every song I play"],
    },
  },
  es: {
    ...shared,
    locale: "es",
    title: "ya hay veredicto",
    message:
      "Tras una revisión larga y justa, los elfos y yo hemos llegado a un veredicto.\n\nLo de la manta se habló mucho. Lo de la croqueta, también. Hubo voces. Luego alguien leyó lo de la sopa y se hizo el silencio.\n\nSales en las dos listas, cosa que, según me dicen, casi nunca pasa. Me quedo contigo igualmente.\n\n**Feliz Navidad, Ava.** *Los regalos están bajo el árbol. Todos. Hasta los del carbón.*",
    photos: demoPhotos(["p1", "p3", "p4", "p8"], {
      p1: "prueba a: el azúcar robado",
      p3: "prueba b: las velas que nadie podía soplar",
      p4: "prueba c: un cómplice",
      p8: "prueba d: las notas. todas.",
    }),
    surprise: {
      text: "¿El regalo del que llevas hablando desde octubre? Existe, está envuelto y está escondido en casa. Frío o caliente, te voy diciendo.",
      reveal: "tap" as const,
    },
    fields: {
      verdict: "both",
      look: "red",
      nice: ["me hizo sopa con gripe (casi toda sal)", "se aprendió cómo llama mi madre al perro", "me calienta mi lado de la cama", "se rio del chiste del pingüino. dos veces."],
      naughty: ["me robó la manta 41 noches de 41", "se comió la última croqueta y culpó al gato", "dijo «cinco minutos más» 300 veces", "se salta la intro de todas mis canciones"],
    },
  },
};
