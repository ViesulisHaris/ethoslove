import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { WishboneFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "wishbone",
  recipientName: "Rosa",
  senderName: "Kai",
  messageStyle: "typewriter" as const,
  accentColor: "#C4302A",
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

export const demoData: Record<"en" | "es", GiftData<WishboneFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "make a wish",
    message:
      "Every year your aunt hands us the wishbone like it's a legal document, and every year it looks close. It isn't really close.\n\nThis year I'm thankful for the small stuff, mostly. Your coffee in the morning. The way you warm the car up before I get in. You laughing at the parade on TV when you say you hate the parade.\n\nSave me the crispy bits.\n\n**Happy Thanksgiving, Rosa.** *Same table next year?*",
    photos: demoPhotos(["p1", "p4", "p7", "p3"], {
      p1: "the first coffee. you took my sugar.",
      p4: "Nube, waiting for anything to fall off the table",
      p7: "the summer we ate outside every night",
      p3: "your birthday, the cake we both burned",
    }),
    surprise: {
      text: "A table for two at the place with the pies, Saturday at 7. Wear the comfortable trousers.",
      reveal: "tap" as const,
    },
    fields: { winner: "them", wish: "another year at the same table, you stealing the crispy bits off my plate", look: "gingham" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "pide un deseo",
    message:
      "Cada año tu tía nos da la espoleta como si fuera un documento oficial, y cada año parece que está reñido. No lo está.\n\nEste año doy gracias por las cosas pequeñas, sobre todo. Tu café por la mañana. Que calientes el coche antes de que yo salga. Que te rías con el desfile de la tele aunque digas que lo odias.\n\nGuárdame lo más crujiente.\n\n**Feliz Acción de Gracias, Rosa.** *¿La misma mesa el año que viene?*",
    photos: demoPhotos(["p1", "p4", "p7", "p3"], {
      p1: "el primer café. me quitaste el azúcar.",
      p4: "Nube, esperando a que se caiga algo de la mesa",
      p7: "el verano que cenamos fuera cada noche",
      p3: "tu cumpleaños, la tarta que quemamos los dos",
    }),
    surprise: {
      text: "Mesa para dos en el sitio de las tartas, el sábado a las 7. Ponte el pantalón cómodo.",
      reveal: "tap" as const,
    },
    fields: { winner: "them", wish: "otro año en la misma mesa, tú robándome lo más crujiente del plato", look: "gingham" },
  },
};
