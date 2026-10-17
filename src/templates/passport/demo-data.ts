import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { PassportFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "passport",
  recipientName: "Sofía",
  senderName: "Lucas",
  messageStyle: "typewriter" as const,
  accentColor: "#D4A853",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  music: {
    source: "library" as const,
    url: "/audio/library/under-the-stars.mp3",
    trackId: "under-the-stars",
    title: "Night Train",
    startAt: 0,
  },
  video: undefined,
  countdown: {
    targetAt: "2026-12-20T18:30:00+02:00",
    timezone: "Europe/Riga",
    label: "Until I land",
  },
  surprise: {
    text: "Check the side pocket of your suitcase. The blue one.",
    reveal: "tap" as const,
  },
};

export const demoData: Record<"en" | "es", GiftData<PassportFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "Valid for one person, indefinitely",
    message:
      "Two thousand three hundred kilometres. I've done the maths so many times it stopped being a number and started being a shape — the shape of the gap between your Sunday and mine.\n\n**Here is what the gap has never managed to do:** make you less funny, less warm, less exactly you at 7am with the bad coffee.\n\nFourteen more days. Then no more stamps for a while. *Just the same city, the same door, the same terrible coffee.*",
    photos: demoPhotos(["p6", "p5", "p2", "p8"], {
      p6: "Tent night · no signal, no regrets",
      p5: "Berlin, the balcony we didn't deserve",
      p2: "Lisbon, halfway",
      p8: "Your kitchen, my favourite country",
    }),
    fields: {
      fromCity: "Berlin",
      toCity: "Riga",
      stops: ["Lisbon"],
      nationality: "Citizen of wherever you are",
      cover: "navy",
    },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Válido para una persona, sin caducidad",
    message:
      "Dos mil trescientos kilómetros. He hecho la cuenta tantas veces que dejó de ser un número y empezó a ser una forma: la forma del hueco entre tu domingo y el mío.\n\n**Esto es lo que el hueco nunca ha conseguido:** hacerte menos graciosa, menos cálida, menos exactamente tú a las 7 de la mañana con el café malo.\n\nCatorce días más. Y luego, una temporada sin sellos. *La misma ciudad, la misma puerta, el mismo café horrible.*",
    photos: demoPhotos(["p6", "p5", "p2", "p8"], {
      p6: "Noche de tienda · sin cobertura, sin arrepentimientos",
      p5: "Berlín, el balcón que no merecíamos",
      p2: "Lisboa, a medio camino",
      p8: "Tu cocina, mi país favorito",
    }),
    fields: {
      fromCity: "Berlín",
      toCity: "Riga",
      stops: ["Lisboa"],
      nationality: "Ciudadana de donde estés tú",
      cover: "navy",
    },
  },
};
