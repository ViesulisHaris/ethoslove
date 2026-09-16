import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { RecipeBoxFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "recipe-box",
  messageStyle: "typewriter" as const,
  accentColor: "#C8743A",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  music: {
    source: "library" as const,
    url: "/audio/library/first-light.mp3",
    trackId: "first-light",
    title: "Still Light",
    startAt: 0,
  },
};

export const demoData: Record<"en" | "es", GiftData<RecipeBoxFields>> = {
  en: {
    ...shared,
    locale: "en",
    recipientName: "Mum",
    senderName: "Nora",
    title: "For the one who never sat down",
    message:
      "You never wrote any of it down. Twenty years of Sunday lunch and the only recipe is *whatever's in the fridge*, and somehow it was always the same, and always right.\n\n**Start the night before.** Use the pan with the burnt handle — no, the other one. Don't measure anything. Taste it, say it needs salt, add none.\n\nFeed whoever walks through the door. Sit down last, when it's cold.\n\nI've written it down now. It still isn't as good.",
    photos: demoPhotos(["p8", "p3", "p4"], {
      p8: "Your handwriting, in the back of the blue book",
      p3: "Same cake, every year, on purpose",
      p4: "You fed him too. Of course you did.",
    }),
    countdown: {
      targetAt: "2027-05-09T13:00:00+01:00",
      timezone: "Europe/London",
      label: "Until Sunday lunch",
    },
    surprise: {
      text: "Sunday, one o'clock, your kitchen — but I'm cooking and you're sitting down. Bring nothing. I mean it.",
      reveal: "hold" as const,
    },
    fields: {
      recipeName: "Mum, from scratch",
      ingredients: [
        "two cups of patience",
        "a whole Sunday of her time",
        'one pinch of "eat something"',
        "everything she never said she gave up",
      ],
      makes: "Makes one house that always smelled like something.",
      counter: "oak",
      cloth: "tomato",
    },
  },
  es: {
    ...shared,
    locale: "es",
    recipientName: "Mamá",
    senderName: "Lucía",
    title: "Para la que nunca se sentaba",
    message:
      "Nunca lo apuntaste. Veinte años de comidas de domingo y la receta era *lo que haya en la nevera*, y salía igual siempre, y siempre bien.\n\n**Se empieza la noche antes.** Con la sartén del mango quemado, no, la otra. Sin pesar nada. Lo pruebas, dices que le falta sal y no le echas.\n\nDe comer a quien entre por la puerta. Sentarse la última, cuando ya está frío.\n\nYa lo he apuntado yo. Sigue sin salirme igual.",
    photos: demoPhotos(["p8", "p3", "p4"], {
      p8: "Tu letra, al final del cuaderno azul",
      p3: "La misma tarta cada año, a propósito",
      p4: "A él también le dabas de comer, claro",
    }),
    countdown: {
      targetAt: "2027-05-02T14:00:00+02:00",
      timezone: "Europe/Madrid",
      label: "Para la comida del domingo",
    },
    surprise: {
      text: "El domingo a las dos, en tu cocina, pero cocino yo y tú te sientas. No traigas nada. Que no.",
      reveal: "hold" as const,
    },
    fields: {
      recipeName: "Mamá, desde cero",
      ingredients: [
        "dos tazas de paciencia",
        "un domingo entero de su tiempo",
        "una pizca de «come algo»",
        "todo lo que dejó sin decir que dejaba",
      ],
      makes: "Sale una casa que siempre olía a algo.",
      counter: "oak",
      cloth: "tomato",
    },
  },
};
