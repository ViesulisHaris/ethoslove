import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { HalfwayFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "halfway",
  recipientName: "Clara",
  senderName: "Iván",
  messageStyle: "typewriter" as const,
  accentColor: "#E2587C",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  music: {
    source: "library" as const,
    url: "/audio/library/under-the-stars.mp3",
    trackId: "under-the-stars",
    title: "The Long Way Home",
    startAt: 0,
  },
  video: undefined,
};

export const demoData: Record<"en" | "es", GiftData<HalfwayFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "",
    message:
      "I worked it out once, properly, on a night I couldn't sleep: the kilometres, the flying hours, how many of my Sundays the distance actually eats. It was not a good night.\n\n**Here is what I've decided since.** The distance is only geography, and geography can be fixed with a booking reference.\n\nSo fly it shut. Watch it go down to nothing. *That is what March is going to feel like.*",
    photos: demoPhotos(["p6", "p2", "p5", "p8"], {
      p6: "the 23:40, the wrong way again",
      p2: "lisbon, lost on purpose",
      p5: "no signal, no plans",
      p8: "you leave notes. I keep every one",
    }),
    countdown: {
      targetAt: "2027-03-14T18:40:00+00:00",
      timezone: "Europe/Lisbon",
      label: "Until I land",
    },
    surprise: {
      text: "Look at the date on that countdown. Then check your inbox. It's already booked.",
      reveal: "tap" as const,
    },
    fields: {
      from: { name: "Lisbon", lat: 38.7223, lng: -9.1393 },
      to: { name: "Boston", lat: 42.3601, lng: -71.0589 },
      stops: [{ name: "Reykjavík", lat: 64.1466, lng: -21.9426 }],
      halfwayNote: "Reykjavík! Neither of us had to fly further than the other.",
      vehicle: "plane",
      yourIsland: "pink",
      theirIsland: "peach",
      palette: "blush",
    },
  },
  es: {
    ...shared,
    locale: "es",
    title: "",
    message:
      "Lo calculé una vez, bien calculado, una noche que no podía dormir: los kilómetros, las horas de vuelo, cuántos domingos míos se come la distancia. No fue una buena noche.\n\n**Esto es lo que he decidido desde entonces.** La distancia es solo geografía, y la geografía se arregla con un localizador de reserva.\n\nAsí que ciérrala volando. Mírala bajar hasta nada. *Así se va a sentir marzo.*",
    photos: demoPhotos(["p6", "p2", "p5", "p8"], {
      p6: "el de las 23:40, otra vez al revés",
      p2: "lisboa, perdidos a propósito",
      p5: "sin cobertura, sin planes",
      p8: "tú dejas notas. yo las guardo todas",
    }),
    countdown: {
      targetAt: "2027-03-14T18:40:00+01:00",
      timezone: "Europe/Madrid",
      label: "Hasta que aterrice",
    },
    surprise: {
      text: "Mira la fecha de esa cuenta atrás. Ahora mira tu correo: ya está reservado.",
      reveal: "tap" as const,
    },
    fields: {
      from: { name: "Madrid", lat: 40.4168, lng: -3.7038 },
      to: { name: "Buenos Aires", lat: -34.6037, lng: -58.3816 },
      stops: [{ name: "Las Palmas", lat: 28.1235, lng: -15.4363 }],
      halfwayNote: "¡Las Palmas! Ninguno de los dos voló más que el otro.",
      vehicle: "plane",
      yourIsland: "pink",
      theirIsland: "peach",
      palette: "blush",
    },
  },
};
