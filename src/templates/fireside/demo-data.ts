import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { FiresideFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "fireside",
  recipientName: "Nora",
  senderName: "Sam",
  messageStyle: "typewriter" as const,
  accentColor: "#D9822B",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "harvest" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/fireside.mp3",
    trackId: "fireside",
    title: "Fireside",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
  surprise: {
    text: "Friday. I've booked the cabin with the wood burner. Bring the big jumper, I'm bringing the good biscuits.",
    reveal: "tap" as const,
  },
};

export const demoData: Record<"en" | "es", GiftData<FiresideFields>> = {
  en: {
    ...shared,
    locale: "en",
    // Their name is already on the bunting and on the blanket's tag; the title says something else.
    title: "more evening with you",
    message:
      "the clocks went back and it got dark at five and i thought: good. more evening with you.\n\ni made you this instead of a scarf. it's warmer, and you can't lose it on a train.\n\nevery photo on the line is a night i didn't want to end. **there are a lot of them.**\n\n*put the kettle on. i'm on my way.*",
    photos: demoPhotos(["p6", "p8", "p2", "p4"], {
      p6: "the 23:40. worth it every time",
      p8: "you leave notes. i keep every one",
      p2: "lost on purpose, october",
      p4: "the day nube chose the blanket",
    }),
    fields: { mood: "amber", outside: "leaves", drink: "cocoa", tag: undefined },
  },
  es: {
    ...shared,
    locale: "es",
    title: "más tarde contigo",
    message:
      "cambiaron la hora y se hizo de noche a las cinco y pensé: bien. más tarde contigo.\n\nte he hecho esto en vez de una bufanda. abriga más, y no lo puedes olvidar en un tren.\n\ncada foto del hilo es una noche que no quería que acabara. **hay muchas.**\n\n*pon el agua a hervir. ya voy.*",
    photos: demoPhotos(["p6", "p8", "p2", "p4"], {
      p6: "el de las 23:40. siempre vale la pena",
      p8: "dejas notas. yo las guardo todas",
      p2: "perdidos a propósito, octubre",
      p4: "el día que nube eligió la manta",
    }),
    fields: { mood: "amber", outside: "leaves", drink: "cocoa", tag: undefined },
  },
};
