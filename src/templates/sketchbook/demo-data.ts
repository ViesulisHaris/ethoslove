import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { SketchbookFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "sketchbook",
  recipientName: "Ana",
  senderName: "Marco",
  messageStyle: "typewriter" as const,
  accentColor: "#D9667C",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<SketchbookFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "Ana turns 30",
    message: "You keep a notebook for everything, so here's one for you, and I drew in it, badly, which you will love more than if I'd drawn well.\n\n**Thirty.** You said it out loud in the kitchen like it was a diagnosis. It's not. It's the year you stopped asking permission, and I've had the best seat for it.\n\n*Every page after this one is something I didn't want to forget. Turn them slowly.*",
    photos: demoPhotos(["p3", "p1", "p2", "p4", "p7", "p8"], { p3: "last year's candles (you relit them)", p1: "the first coffee. you took my sugar.", p2: "lisbon, lost on purpose", p4: "the day nube chose us", p7: "july, when everything was slow", p8: "the notes you leave" }),
    surprise: { text: "The last page of the real notebook, the paper one on your desk, has something taped in it. Go and look.", reveal: "tap" },
    fields: { theme: "white", age: 30 },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Ana cumple 30",
    message: "Tienes un cuaderno para todo, así que aquí tienes uno para ti, y he dibujado en él, mal, lo cual te va a gustar más que si hubiera dibujado bien.\n\n**Treinta.** Lo dijiste en voz alta en la cocina como si fuera un diagnóstico. No lo es. Es el año en que dejaste de pedir permiso, y yo he tenido el mejor asiento.\n\n*Cada página después de esta es algo que no quería olvidar. Pásalas despacio.*",
    photos: demoPhotos(["p3", "p1", "p2", "p4", "p7", "p8"], { p3: "las velas del año pasado (las volviste a encender)", p1: "el primer café. te llevaste mi azúcar.", p2: "lisboa, perdidos a propósito", p4: "el día que nube nos eligió", p7: "julio, cuando todo iba despacio", p8: "las notas que dejas" }),
    surprise: { text: "La última página del cuaderno de verdad, el de papel de tu escritorio, tiene algo pegado. Ve a mirar.", reveal: "tap" },
    fields: { theme: "white", age: 30 },
  },
};
