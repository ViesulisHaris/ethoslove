import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { BeMyBooFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "be-my-boo",
  recipientName: "Maya",
  senderName: "Leo",
  messageStyle: "fade" as const,
  accentColor: "#E8742A",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/all-hallows.mp3", trackId: "all-hallows", title: "All Hallows", artist: "our october", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<BeMyBooFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "be my boo",
    message: "You pick the scariest film every year and then watch it through your fingers, holding my hand so hard I lose feeling in it. I wouldn't change a single second.\n\n**You're my favourite thing about October.** And November, and every month after it.\n\n*So, this is me asking properly: will you be my boo?*",
    photos: demoPhotos(["p1", "p2", "p6", "p5", "p3", "p8", "p7"], { p1: "our first coffee", p2: "lost in lisbon", p6: "the 23:40 to you", p5: "no signal, just stars", p3: "one candle short", p8: "you leave notes. i keep them.", p7: "the last warm day" }),
    surprise: { text: "Friday at 7: pumpkin carving, then the scariest film we can find. I'll hold your hand at the scary bits. You'll hold mine at all of them.", reveal: "tap" },
    fields: { look: "pumpkin" },
  },
  es: {
    ...shared,
    locale: "es",
    music: { ...shared.music, artist: "nuestro octubre" },
    title: "be my boo",
    message: "Cada año eliges la peli más terrorífica y luego la ves entre los dedos, apretándome la mano tan fuerte que dejo de sentirla. No cambiaría ni un segundo.\n\n**Eres lo que más me gusta de octubre.** Y de noviembre, y de todos los meses que vienen después.\n\n*Así que te lo pregunto como toca: ¿serás mi boo?*",
    photos: demoPhotos(["p1", "p2", "p6", "p5", "p3", "p8", "p7"], { p1: "nuestro primer café", p2: "perdidos en lisboa", p6: "el de las 23:40 hacia ti", p5: "sin cobertura, solo estrellas", p3: "faltaba una vela", p8: "dejas notas. yo las guardo.", p7: "el último día de calor" }),
    surprise: { text: "El viernes a las 7: vaciamos calabazas y después la peli más terrorífica que encontremos. Yo te daré la mano en las partes de miedo. Tú me la darás en todas.", reveal: "tap" },
    fields: { look: "pumpkin" },
  },
};
