import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { ToastFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "the-toast",
  recipientName: "Ana & Marco",
  senderName: "Elena",
  messageStyle: "typewriter" as const,
  accentColor: "#D4A853",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "lovecore" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/first-light.mp3",
    trackId: "first-light",
    title: "Still Light",
    startAt: 0,
  },
  video: undefined,
};

export const demoData: Record<"en" | "es", GiftData<ToastFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "A few words, before the food goes cold",
    message:
      "I've known Ana since we were nineteen and sharing one umbrella badly. I met Marco four years ago, in a kitchen, at two in the morning, and he was doing the washing up in someone else's house.\n\nThat's the whole speech, really. **She looks after people. He does the washing up.** Between the two of you there is nothing left for the rest of us to worry about.\n\nAna — you have never once needed anyone's permission to be happy, and it's been a joy watching you not ask for it. Marco, you got here late and you got here right.\n\n*To the two of you, and to the washing up, for ever.*",
    photos: demoPhotos(["p2", "p1", "p7"], {
      p2: "Lisbon, the night they got lost on purpose",
      p1: "Their table, their sugar, their argument about it",
      p7: "The July the three of us did nothing at all",
    }),
    countdown: {
      targetAt: "2027-06-14T20:00:00+01:00",
      timezone: "Europe/Lisbon",
      label: "Until the first anniversary",
    },
    surprise: {
      text: "The room upstairs is booked in your names until Sunday. Nobody expects you at breakfast.",
      reveal: "tap" as const,
    },
    fields: {
      pour: "champagne",
      glasses: "flute",
      opening: "To Ana and Marco",
      venue: "Quinta da Boa Vista",
      dateLine: "14 June 2026",
      light: "candlelit",
    },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Dos palabras, antes de que se enfríe la comida",
    message:
      "A Ana la conozco desde los diecinueve, cuando compartíamos un paraguas fatal. A Marco lo conocí hace cuatro años, en una cocina, a las dos de la mañana, fregando los platos en casa ajena.\n\nY ese es el discurso entero, en realidad. **Ella cuida de la gente. Él friega los platos.** Entre los dos no os dejáis nada de lo que los demás tengamos que preocuparnos.\n\nAna: nunca has pedido permiso a nadie para ser feliz, y da gusto verte no pedirlo. Marco: llegaste tarde, pero llegaste bien.\n\n*Por vosotros dos, y por los platos, para siempre.*",
    photos: demoPhotos(["p2", "p1", "p7"], {
      p2: "Lisboa, la noche que se perdieron a propósito",
      p1: "Su mesa, su azúcar y la discusión de siempre",
      p7: "El julio en que los tres no hicimos nada",
    }),
    countdown: {
      targetAt: "2027-06-14T20:00:00+01:00",
      timezone: "Europe/Lisbon",
      label: "Para el primer aniversario",
    },
    surprise: {
      text: "La habitación de arriba está a vuestro nombre hasta el domingo. Nadie os espera a desayunar.",
      reveal: "tap" as const,
    },
    fields: {
      pour: "champagne",
      glasses: "flute",
      opening: "Por Ana y Marco",
      venue: "Quinta da Boa Vista",
      dateLine: "14 de junio de 2026",
      light: "candlelit",
    },
  },
};
