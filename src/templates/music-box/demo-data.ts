import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { MusicBoxFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "music-box",
  recipientName: "Clara",
  senderName: "Leo",
  messageStyle: "fade" as const,
  accentColor: "#C0506E",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  // The box plays its own tune; a song chosen as well would wait for the letter.
  music: undefined,
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<MusicBoxFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "five years of us",
    message:
      "Five years ago today you made me dance in your kitchen to a song neither of us knew the words to. I stepped on your foot twice and you said it was the best night of your year. I've been trying to beat it ever since.\n\n**You still hum when you're concentrating.** Over the crossword, choosing a wine, when you think I'm asleep. I've never told you, because I don't want you to stop.\n\n*So here's something that plays by itself, for the nights I'm away. Wind it up and I'm there.*",
    photos: demoPhotos(["p1", "p2", "p7", "p6", "p4", "p8"], { p1: "the café where it started", p2: "lisbon, lost on purpose", p7: "the summer of the bikes", p6: "the 23:40 to you", p4: "the day nube chose us", p8: "you leave notes. i keep them." }),
    surprise: { text: "Saturday, 8pm. Wear the shoes you can't dance in. I've booked the place with the piano.", reveal: "tap" },
    fields: { figurine: "ballerina", tune: "swan-lake", box: "blush" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "cinco años de nosotros",
    message:
      "Hace cinco años me hiciste bailar en tu cocina una canción de la que ninguno se sabía la letra. Te pisé dos veces y dijiste que era la mejor noche de tu año. Desde entonces intento superarla.\n\n**Sigues tarareando cuando te concentras.** Con el crucigrama del domingo, eligiendo el vino, cuando crees que ya me he dormido. Nunca te lo he dicho, porque no quiero que dejes de hacerlo.\n\n*Así que aquí tienes algo que suena solo, para las noches en que no estoy. Dale cuerda y estoy ahí.*",
    photos: demoPhotos(["p1", "p2", "p7", "p6", "p4", "p8"], { p1: "el café donde empezó todo", p2: "lisboa, perdidos a propósito", p7: "el verano de las bicis", p6: "el de las 23:40 hacia ti", p4: "el día que nube nos eligió", p8: "dejas notas. yo las guardo." }),
    surprise: { text: "El sábado a las 8. Ponte los zapatos con los que no sabes bailar: he reservado en el sitio del piano.", reveal: "tap" },
    fields: { figurine: "ballerina", tune: "swan-lake", box: "blush" },
  },
};
