import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { CouncilFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "the-council",
  recipientName: "Ana",
  senderName: "Marco",
  messageStyle: "typewriter" as const,
  accentColor: "#C0392B",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<CouncilFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "The Council v. Ana",
    message: "The council sat for six hours. Most of that was the shark refusing to take his hood off, but the rest was about you.\n\n**The evidence was overwhelming.** You show up. You remember the small things, the order, the song, the name of my boss's dog. You have never once let me walk home alone.\n\n*The sentence stands. One hug, served immediately. There is no appeal.*",
    photos: demoPhotos(["p1", "p4", "p2", "p8"], { p1: "the accused, stealing my sugar", p4: "accomplice. answers to nube.", p2: "lisbon. “i know a shortcut”", p8: "leaves notes. repeatedly." }),
    surprise: { text: "The council has also approved dinner on Friday. You're not paying.", reveal: "tap" },
    fields: { bench: "oak", verdict: "guilty", charge: "stealing every hoodie I own", findings: ["you said “five minutes away” from your bed", "you cried at an advert for a bank", "you steal chips and claim you “weren't hungry”", "you are, regrettably, his favourite person"] },
  },
  es: {
    ...shared,
    locale: "es",
    title: "El Consejo contra Ana",
    message: "El consejo deliberó seis horas. Casi todo fue el tiburón negándose a quitarse la capucha, pero el resto fue sobre ti.\n\n**Las pruebas eran abrumadoras.** Apareces. Te acuerdas de lo pequeño: el pedido, la canción, el nombre del perro de mi jefe. Nunca me has dejado volver a casa a solas.\n\n*La sentencia es firme. Un abrazo, de cumplimiento inmediato. No cabe recurso.*",
    photos: demoPhotos(["p1", "p4", "p2", "p8"], { p1: "la acusada, robándome el azúcar", p4: "cómplice. responde a nube.", p2: "lisboa. «conozco un atajo»", p8: "deja notas. reincidente." }),
    surprise: { text: "El consejo también ha aprobado una cena el viernes. No pagas tú.", reveal: "tap" },
    fields: { bench: "oak", verdict: "guilty", charge: "robarme todas las sudaderas", findings: ["dijiste «llego en cinco minutos» desde la cama", "lloraste con el anuncio de un banco", "robas patatas y dices que «no tenías hambre»", "eres, lamentablemente, su persona favorita"] },
  },
};
