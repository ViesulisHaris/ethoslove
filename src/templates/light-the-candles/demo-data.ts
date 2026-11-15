import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { LightTheCandlesFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "light-the-candles",
  recipientName: "June",
  senderName: "Theo",
  messageStyle: "typewriter" as const,
  accentColor: "#C8692A",
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

export const demoData: Record<"en" | "es", GiftData<LightTheCandlesFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "thankful for you",
    message:
      "My mother lights the candles before anyone sits down. She says a table isn't set until something on it is burning. I used to think that was just her.\n\nThen you started doing it at ours. A Tuesday, leftovers, and you lighting one candle like it was an occasion. It turns out it always is, with you.\n\nSo this year I'm not thankful for the big things. I'm thankful for the Tuesdays.\n\n**Happy Thanksgiving, June.** *Don't blow them out yet.*",
    photos: demoPhotos(["p1", "p4", "p7", "p3"], {
      p1: "first coffee of the morning, before anyone was up",
      p4: "Nube, under the table, hoping",
      p7: "the long table in August",
      p3: "your birthday, the cake we both burned",
    }),
    surprise: {
      text: "The brass candlesticks from the market, the ones you put back. They're in the hall cupboard, wrapped badly.",
      reveal: "tap" as const,
    },
    fields: {
      thanks: ["the coffee you bring me before I ask", "your hand finding mine in the cinema", "how you laugh at your own jokes first", "every Tuesday you made an occasion", "you, coming home"],
      look: "harvest",
    },
  },
  es: {
    ...shared,
    locale: "es",
    title: "doy gracias por ti",
    message:
      "Mi madre enciende las velas antes de que nadie se siente. Dice que una mesa no está puesta hasta que algo arde en ella. Yo creía que eran cosas suyas.\n\nLuego empezaste a hacerlo tú en casa. Un martes, sobras, y tú encendiendo una vela como si fuera una ocasión. Resulta que contigo siempre lo es.\n\nAsí que este año no doy gracias por las cosas grandes. Doy gracias por los martes.\n\n**Feliz Acción de Gracias, June.** *No las apagues todavía.*",
    photos: demoPhotos(["p1", "p4", "p7", "p3"], {
      p1: "el primer café, antes de que se levantara nadie",
      p4: "Nube, debajo de la mesa, con esperanza",
      p7: "la mesa larga de agosto",
      p3: "tu cumpleaños, la tarta que quemamos los dos",
    }),
    surprise: {
      text: "Los candelabros de latón del mercadillo, los que dejaste. Están en el armario del pasillo, mal envueltos.",
      reveal: "tap" as const,
    },
    fields: {
      thanks: ["el café que me traes antes de pedirlo", "tu mano buscando la mía en el cine", "que te rías tú primero de tus chistes", "cada martes que hiciste una ocasión", "tú, volviendo a casa"],
      look: "harvest",
    },
  },
};
