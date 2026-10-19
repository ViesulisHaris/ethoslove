import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { JackOLanternFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "jack-o-lantern",
  recipientName: "Maya",
  senderName: "Dan",
  messageStyle: "typewriter" as const,
  accentColor: "#FFC23D",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
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
    text: "Saturday, 7pm. Pumpkin patch first, then my place for the actual carving. Wear something you don't mind getting seeds on.",
    reveal: "tap" as const,
  },
};

export const demoData: Record<"en" | "es", GiftData<JackOLanternFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "carved just for you",
    message:
      "every year we buy a pumpkin, put it on the counter, name it, and never carve it. this year i did.\n\nthe eyes are crooked. the grin is crookeder. your name took three tries, because the first two looked like a ransom note.\n\nit's lit. the room's dark. you can't see my face, but it's doing the grin too.\n\n**happy halloween.** *i'd carve you a thousand more.*",
    photos: demoPhotos(["p1", "p3", "p4", "p8"], {
      p1: "our first coffee. you stole my sugar.",
      p3: "the candles you refused to blow out",
      p4: "the day nube chose us",
      p8: "you leave notes. i keep every one.",
    }),
    fields: { look: "orange", face: "classic", carving: undefined },
  },
  es: {
    ...shared,
    locale: "es",
    title: "tallada solo para ti",
    message:
      "todos los años compramos una calabaza, la ponemos en la encimera, le ponemos nombre y nunca la tallamos. este año sí.\n\nlos ojos están torcidos. la sonrisa, más. tu nombre me llevó tres intentos, porque los dos primeros parecían una nota de secuestro.\n\nestá encendida. la habitación está a oscuras. no ves mi cara, pero también está sonriendo así.\n\n**feliz halloween.** *te tallaría mil más.*",
    photos: demoPhotos(["p1", "p3", "p4", "p8"], {
      p1: "nuestro primer café. me robaste el azúcar.",
      p3: "las velas que no quisiste soplar",
      p4: "el día que nube nos eligió",
      p8: "dejas notas. guardo todas.",
    }),
    fields: { look: "orange", face: "classic", carving: undefined },
  },
};
