import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { SpookySeasonFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "spooky-season",
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

export const demoData: Record<"en" | "es", GiftData<SpookySeasonFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "for maya",
    message: "It's officially spooky season, which means you're going to steal my hoodie, pick the scariest film and then watch it through your fingers.\n\n**I wouldn't want to be scared with anyone else.** You make cold nights feel like a blanket, a candle and nowhere to be.\n\n*Keep scrolling. I'm at the bottom with the popcorn, pretending I'm not scared either.*",
    photos: demoPhotos(["p1", "p6", "p2", "p8", "p5", "p3", "p7"], { p1: "our first coffee", p6: "the 23:40 to you", p2: "lisbon in october", p8: "you leave notes. i keep them.", p5: "no signal, just stars", p3: "one candle short", p7: "the last warm day" }),
    surprise: { text: "Friday, 8pm. The pumpkin patch, then the scariest film we can find. Wear my hoodie.", reveal: "tap" },
    fields: { look: "pumpkin" },
  },
  es: {
    ...shared,
    locale: "es",
    music: { ...shared.music, artist: "nuestro octubre" },
    title: "para maya",
    message: "Ya es oficialmente temporada spooky, o sea que me vas a robar la sudadera, vas a elegir la peli más terrorífica y la vas a ver entre los dedos.\n\n**No querría pasar miedo con nadie más.** Contigo las noches frías son una manta, una vela y ningún sitio al que ir.\n\n*Sigue bajando. Estoy al final con las palomitas, haciendo como que yo tampoco tengo miedo.*",
    photos: demoPhotos(["p1", "p6", "p2", "p8", "p5", "p3", "p7"], { p1: "nuestro primer café", p6: "el de las 23:40 hacia ti", p2: "lisboa en octubre", p8: "dejas notas. yo las guardo.", p5: "sin cobertura, solo estrellas", p3: "faltaba una vela", p7: "el último día de calor" }),
    surprise: { text: "Viernes, a las 8. El huerto de calabazas y después la peli más terrorífica que encontremos. Ponte mi sudadera.", reveal: "tap" },
    fields: { look: "pumpkin" },
  },
};
