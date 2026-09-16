import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { CapTossFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "cap-toss",
  messageStyle: "typewriter" as const,
  accentColor: "#D4A853",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  music: {
    source: "library" as const,
    url: "/audio/library/golden-hour.mp3",
    trackId: "golden-hour",
    title: "Golden Hour",
    startAt: 0,
  },
  video: undefined,
};

export const demoData: Record<"en" | "es", GiftData<CapTossFields>> = {
  en: {
    ...shared,
    locale: "en",
    recipientName: "Nina",
    senderName: "Dad",
    title: "",
    message:
      "Four years ago you cried in the car outside the halls and told me you were coming home at Christmas and not going back.\n\nYou went back. You went back the February you had shingles, and the week the laptop died and you rewrote eleven thousand words on your phone on the 06:12.\n\n**Nobody hands that bit out.** They only hand you the paper afterwards, and the paper is the easy part.\n\n*So throw the thing as high as you like. You've earned the whole sky.*",
    photos: demoPhotos(["p8", "p6", "p7", "p5"], {
      p8: "your handwriting, first year. still illegible.",
      p6: "the 06:12. three years of it.",
      p7: "field week — you cried about a crab",
      p5: "the summer you nearly quit",
    }),
    countdown: {
      targetAt: "2027-09-06T08:30:00+01:00",
      timezone: "Europe/London",
      label: "Until your first day",
    },
    surprise: {
      text: "Look in the boot of the car. The frame is already bought, and it is exactly the right size for that bit of paper.",
      reveal: "tap" as const,
    },
    fields: {
      year: "2027",
      school: "BSc Marine Biology · Plymouth",
      awardedFor: "four years of going back, and one very good dissertation about crabs",
      tassel: "gold",
      gown: "navy",
    },
  },
  es: {
    ...shared,
    locale: "es",
    recipientName: "Lucía",
    senderName: "Papá",
    title: "",
    message:
      "Hace cuatro años lloraste en el coche, en la puerta de la residencia, y me dijiste que en Navidad te volvías a casa y no regresabas.\n\nRegresaste. Regresaste aquel febrero de la mononucleosis, y la semana que se murió el portátil y reescribiste once mil palabras en el móvil, en el cercanías de las 6:12.\n\n**Eso no te lo dan con el título.** El papel te lo dan después, y el papel es la parte fácil.\n\n*Así que lanza el birrete todo lo alto que quieras. Te has ganado el cielo entero.*",
    photos: demoPhotos(["p8", "p6", "p7", "p5"], {
      p8: "tu letra, primero de carrera. ilegible ya entonces.",
      p6: "el de las 6:12. tres años seguidos.",
      p7: "semana de prácticas: lloraste por un cangrejo",
      p5: "el verano que casi lo dejas",
    }),
    countdown: {
      targetAt: "2027-09-06T08:30:00+02:00",
      timezone: "Europe/Madrid",
      label: "Hasta tu primer día",
    },
    surprise: {
      text: "Mira en el maletero del coche. El marco ya está comprado y es justo del tamaño de ese papel.",
      reveal: "tap" as const,
    },
    fields: {
      year: "2027",
      school: "Biología Marina · Universidad de Vigo",
      awardedFor: "cuatro años volviendo siempre y un trabajo de fin de grado buenísimo sobre cangrejos",
      tassel: "gold",
      gown: "navy",
    },
  },
};
