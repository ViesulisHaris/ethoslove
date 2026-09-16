import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { PaperCraneFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "paper-crane",
  recipientName: "Max",
  senderName: "Inés",
  messageStyle: "typewriter" as const,
  accentColor: "#A8755F",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  music: {
    source: "library" as const,
    url: "/audio/library/quiet-hours.mp3",
    trackId: "quiet-hours",
    title: "Quiet Hours",
    startAt: 0,
  },
  video: undefined,
};

export const demoData: Record<"en" | "es", GiftData<PaperCraneFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "I folded this a hundred times",
    message:
      "I have started this six times. The other five are in the bin by the door, and one of them was four pages long, which tells you how badly I was avoiding the short version.\n\n**Here is the short version. I'm sorry.** Not the quick one I say to end a conversation — the one that means I have thought about your face on Thursday every day since.\n\nYou don't owe me an answer tonight. Read it, put it down, feed the cat. *I'll still be here on Sunday, with the good coffee.*",
    photos: demoPhotos(["p1", "p8"], {
      p1: "the café where we are usually fine",
      p8: "you leave notes. I kept every one",
    }),
    countdown: {
      targetAt: "2027-06-12T09:30:00+02:00",
      timezone: "Europe/Madrid",
      label: "Until the trip we still have booked",
    },
    surprise: {
      text: "The tickets are still in my inbox. I haven't touched them. They're yours — cancel them or keep them, and I'll be fine either way.",
      reveal: "tap" as const,
    },
    fields: {
      paper: "ivory",
      lines: [
        "I was wrong about Thursday, and I knew it in the car.",
        "I wanted to win the argument more than I wanted to be kind.",
        "You went quiet, and I let you.",
        "You don't have to be over it yet.",
        "I'll be here on Sunday either way.",
      ],
      closing: "Whenever you're ready. Not a day before.",
    },
  },
  es: {
    ...shared,
    locale: "es",
    title: "La he doblado cien veces",
    message:
      "He empezado esta carta seis veces. Las otras cinco están en la papelera de la entrada, y una tenía cuatro páginas, que ya te dice lo que estaba evitando la versión corta.\n\n**Esta es la versión corta. Lo siento.** No el «lo siento» rápido que digo para terminar una conversación: el que quiere decir que llevo desde el jueves viendo tu cara.\n\nNo me debes una respuesta esta noche. Léela, déjala, dale de comer al gato. *El domingo seguiré aquí, con el café bueno.*",
    photos: demoPhotos(["p1", "p8"], {
      p1: "el café donde solemos estar bien",
      p8: "tú dejas notas. yo las guardé todas",
    }),
    countdown: {
      targetAt: "2027-06-12T09:30:00+02:00",
      timezone: "Europe/Madrid",
      label: "Hasta el viaje que sigue reservado",
    },
    surprise: {
      text: "Los billetes siguen en mi correo. No los he tocado. Son tuyos: cancélalos o quédatelos, y a mí me parecerá bien igual.",
      reveal: "tap" as const,
    },
    fields: {
      paper: "ivory",
      lines: [
        "Me equivoqué el jueves, y lo supe ya en el coche.",
        "Quise ganar la discusión más que ser bueno contigo.",
        "Te quedaste callado, y yo te dejé.",
        "No tienes que haberlo superado ya.",
        "El domingo estaré aquí igual.",
      ],
      closing: "Cuando estés listo. Ni un día antes.",
    },
  },
};
