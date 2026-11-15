import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { GingerbreadHouseFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "gingerbread-house",
  recipientName: "Lena",
  senderName: "Ben",
  messageStyle: "typewriter" as const,
  accentColor: "#C4202A",
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

export const demoData: Record<"en" | "es", GiftData<GingerbreadHouseFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "home sweet home",
    message:
      "Last year ours collapsed before the icing set. You held the roof up with both hands for ten minutes and then ate the chimney. I have never laughed that hard at a building.\n\nThat's the thing about you. Anything can fall down and you make it the best part of the day.\n\nThis one won't collapse. I checked. You can decorate it however you like, and nobody will eat the chimney this time. Probably.\n\n**Merry Christmas, Lena.** *The gumdrops are all yours.*",
    photos: demoPhotos(["p3", "p1", "p4", "p7"], {
      p3: "last year's house, minutes before",
      p1: "icing sugar, everywhere, for days",
      p4: "Nube, who got the chimney crumbs",
      p7: "the summer we baked nothing at all",
    }),
    surprise: {
      text: "A proper gingerbread kit, the big one, and Saturday cleared to build it. Aprons are in the drawer.",
      reveal: "tap" as const,
    },
    fields: { look: "cosy" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "hogar, dulce hogar",
    message:
      "El año pasado la nuestra se vino abajo antes de que cuajara el glaseado. Sujetaste el tejado con las dos manos diez minutos y luego te comiste la chimenea. Nunca me he reído tanto con un edificio.\n\nEso es lo que tienes. Cualquier cosa se puede caer y tú la conviertes en lo mejor del día.\n\nEsta no se va a caer. Lo he comprobado. Decórala como quieras, y esta vez nadie se comerá la chimenea. Probablemente.\n\n**Feliz Navidad, Lena.** *Las gominolas son todas tuyas.*",
    photos: demoPhotos(["p3", "p1", "p4", "p7"], {
      p3: "la casita del año pasado, minutos antes",
      p1: "azúcar glas por todas partes, durante días",
      p4: "Nube, que se llevó las migas de la chimenea",
      p7: "el verano que no horneamos nada",
    }),
    surprise: {
      text: "Un kit de casita de jengibre de verdad, el grande, y el sábado libre para montarlo. Los delantales están en el cajón.",
      reveal: "tap" as const,
    },
    fields: { look: "cosy" },
  },
};
