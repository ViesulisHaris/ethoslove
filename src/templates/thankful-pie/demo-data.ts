import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { ThankfulPieFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "thankful-pie",
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

export const demoData: Record<"en" | "es", GiftData<ThankfulPieFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "us",
    message:
      "Your grandma's recipe says \"bake until it smells like home.\" I asked her how long that is and she said \"you'll know.\" I didn't. You did.\n\nThis is the year I learned that most of the good things are small and happen in a kitchen. You burning the first batch. You eating the burnt one so nobody else had to.\n\nI'm thankful for every one of those.\n\n**Happy Thanksgiving, June.** *Save me the corner piece.*",
    photos: demoPhotos(["p1", "p4", "p7", "p3"], {
      p1: "first coffee of the morning, before anyone was up",
      p4: "Nube, supervising the pie",
      p7: "the long table in August",
      p3: "your birthday, the cake we both burned",
    }),
    surprise: {
      text: "Your grandma's recipe, framed, with her handwriting. It's at my mum's. We pick it up on Sunday.",
      reveal: "tap" as const,
    },
    fields: {
      ingredients: [
        "two cups of you humming while you cook",
        "a pinch of you stealing the blanket",
        "the way you save me the corner piece",
        "a spoonful of your terrible puns",
        "every 7am coffee run in the rain",
        "a whole lot of patience (yours)",
      ],
      look: "linen",
    },
  },
  es: {
    ...shared,
    locale: "es",
    title: "nosotros",
    message:
      "La receta de tu abuela dice \"hornear hasta que huela a casa\". Le pregunté cuánto tiempo es eso y me dijo \"ya lo sabrás\". Yo no lo supe. Tú sí.\n\nEste año he aprendido que casi todo lo bueno es pequeño y pasa en una cocina. Tú quemando la primera tanda. Tú comiéndote la quemada para que no le tocara a nadie.\n\nDoy gracias por cada una de esas cosas.\n\n**Feliz Acción de Gracias, June.** *Guárdame la esquina.*",
    photos: demoPhotos(["p1", "p4", "p7", "p3"], {
      p1: "el primer café, antes de que se levantara nadie",
      p4: "Nube, vigilando la tarta",
      p7: "la mesa larga de agosto",
      p3: "tu cumpleaños, la tarta que quemamos los dos",
    }),
    surprise: {
      text: "La receta de tu abuela, enmarcada, con su letra. Está en casa de mi madre. La recogemos el domingo.",
      reveal: "tap" as const,
    },
    fields: {
      ingredients: [
        "dos tazas de ti tarareando al cocinar",
        "una pizca de ti robándome la manta",
        "que me guardes siempre la esquina",
        "una cucharada de tus chistes malos",
        "cada café a las 7 bajo la lluvia",
        "mucha paciencia (la tuya)",
      ],
      look: "linen",
    },
  },
};
