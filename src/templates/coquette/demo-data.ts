import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { CoquetteFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "coquette",
  recipientName: "Elena",
  senderName: "Sam",
  messageStyle: "fade" as const,
  accentColor: "#E0668C",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", artist: "for the two of us", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<CoquetteFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "for elena",
    message: "I kept everything. The bus ticket from the day it rained, the receipt from the café with the wobbly table, the petal you put in my coat pocket and forgot about.\n\n**You make ordinary days feel like they were planned.** I used to think I was hard to be around. Then you started saving me the window seat.\n\n*This is all of it, in one place, tied up with a bow. Keep scrolling. I'm at the bottom, like always, waiting for you to finish getting ready.*",
    photos: demoPhotos(["p1", "p2", "p7", "p4", "p8", "p3", "p6"], { p1: "our first coffee", p2: "lisbon, lost on purpose", p7: "july, when everything was slow", p4: "the day nube chose us", p8: "you leave notes. i keep them.", p3: "one candle short", p6: "the 23:40 to you" }),
    surprise: { text: "Friday, 7pm, wear the pink dress. That's all I'm saying.", reveal: "tap" },
    fields: { look: "blush" },
  },
  es: {
    ...shared,
    locale: "es",
    music: { ...shared.music, artist: "para nosotros dos" },
    title: "para elena",
    message: "Lo he guardado todo. El billete de autobús del día que llovió, el ticket del café de la mesa coja, el pétalo que metiste en el bolsillo de mi abrigo y olvidaste.\n\n**Haces que los días normales parezcan planeados.** Yo creía que era difícil estar conmigo. Y entonces empezaste a guardarme el asiento de la ventana.\n\n*Aquí está todo, en un solo sitio, atado con un lazo. Sigue bajando. Estoy al final, como siempre, esperando a que termines de arreglarte.*",
    photos: demoPhotos(["p1", "p2", "p7", "p4", "p8", "p3", "p6"], { p1: "nuestro primer café", p2: "lisboa, perdidos a propósito", p7: "julio, cuando todo iba despacio", p4: "el día que nube nos eligió", p8: "dejas notas. yo las guardo.", p3: "faltaba una vela", p6: "el de las 23:40 hacia ti" }),
    surprise: { text: "Viernes, a las 7, ponte el vestido rosa. No digo más.", reveal: "tap" },
    fields: { look: "blush" },
  },
};
