import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { PicnicFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "picnic",
  recipientName: "Lola",
  senderName: "Teo",
  messageStyle: "typewriter" as const,
  accentColor: "#D9577E",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", artist: "for the two of us", startAt: 0 },
  video: undefined,
  countdown: undefined,
  surprise: undefined,
};

export const demoData: Record<"en" | "es", GiftData<PicnicFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "no reason, just a picnic",
    message:
      "There's no occasion. I just noticed it's been ages since we did nothing together. Properly, on purpose, for a whole afternoon.\n\nSo: **Saturday, the big park, the spot under the tree that drops blossom in your hair.** I'll carry the basket. You bring the blanket and that terrible playlist.\n\n*Everything in here is something I already love about you. The rest of the list didn't fit in the basket.*",
    photos: demoPhotos(["p4", "p7", "p2"], { p4: "the day nube chose us", p7: "july, when everything was slow", p2: "lisbon, lost on purpose" }),
    // The date the picnic is for, wrapped up in the basket. "This Saturday", never a day that goes stale.
    unwrap: {
      kind: "date",
      title: "A picnic in the park",
      when: "This Saturday",
      city: "Lisbon",
      stops: [
        { name: "Jardim da Estrela, by the pond", time: "12:30", kind: "park", note: "bring the terrible playlist" },
        { name: "The cherry tree on the hill", time: "13:30", kind: "picnic", note: "blanket, basket, you" },
        { name: "Ice cream on the way home", time: "18:00", kind: "dessert" },
      ],
    },
    fields: {
      blanket: "pink",
      labels: [
        "the way you eat the strawberries first",
        "how you tie cherry stems in knots to show off",
        "your terrible playlist. i know it by heart",
        "you still bring me flowers on a tuesday",
        "you always save me the window seat",
        "you cut my crusts off and pretend you didn't",
      ],
    },
  },
  es: {
    ...shared,
    locale: "es",
    music: { ...shared.music, artist: "para nosotros dos" },
    title: "sin motivo, solo un pícnic",
    message:
      "No hay ningún motivo. Solo me he dado cuenta de que hace mucho que no hacemos nada juntos. Nada de verdad, a propósito, una tarde entera.\n\nAsí que: **el sábado, al parque grande, al sitio del árbol que te llena el pelo de flores.** Yo llevo la cesta. Tú, la manta y esa lista de canciones horrorosa.\n\n*Todo lo que hay aquí dentro es algo que ya me encanta de ti. El resto de la lista no cabía en la cesta.*",
    photos: demoPhotos(["p4", "p7", "p2"], { p4: "el día que nube nos eligió", p7: "julio, cuando todo iba despacio", p2: "lisboa, perdidos a propósito" }),
    unwrap: {
      kind: "date",
      title: "Un pícnic en el parque",
      when: "Este sábado",
      city: "Lisboa",
      stops: [
        { name: "Jardim da Estrela, junto al estanque", time: "12:30", kind: "park", note: "trae la lista horrorosa" },
        { name: "El cerezo de la colina", time: "13:30", kind: "picnic", note: "manta, cesta y tú" },
        { name: "Un helado de vuelta a casa", time: "18:00", kind: "dessert" },
      ],
    },
    fields: {
      blanket: "pink",
      labels: [
        "cómo te comes las fresas antes que nada",
        "que hagas nudos con los rabitos de las cerezas",
        "tu lista de canciones horrible. me la sé entera",
        "que me sigas trayendo flores un martes",
        "que siempre me guardes la ventanilla",
        "que me quites la corteza del pan y lo niegues",
      ],
    },
  },
};
