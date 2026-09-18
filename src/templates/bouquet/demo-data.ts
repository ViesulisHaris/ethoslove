import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import { DEFAULT_STEMS } from "./catalogue";
import type { BouquetFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "bouquet",
  recipientName: "Ana",
  senderName: "Marco",
  messageStyle: "typewriter" as const,
  accentColor: "#C8475A",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  music: { source: "library" as const, url: "/audio/library/paper-boats.mp3", trackId: "paper-boats", title: "Paper Boats", startAt: 0 },
  video: undefined,
  countdown: undefined,
  surprise: undefined,
};

const fields: BouquetFields = { stems: DEFAULT_STEMS, wrap: "kraft", ribbon: "cream", backdrop: "linen", seed: 1 };

export const demoData: Record<"en" | "es", GiftData<BouquetFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "Just because",
    message:
      "I couldn't pick one, so I picked all of them.\n\nThe peonies are for how you laugh. The ranunculus look like they're blushing, which is you every time I say something nice. The roses are because some things are classic for a reason.\n\n**These ones never wilt.** Neither does this.",
    photos: demoPhotos(["p1", "p3"], { p1: "the day we met", p3: "u, with cake" }),
    fields,
  },
  es: {
    ...shared,
    locale: "es",
    title: "Porque sí",
    message:
      "No podía elegir una, así que las elegí todas.\n\nLas peonías son por cómo te ríes. Los ranúnculos parecen sonrojados, como tú cada vez que te digo algo bonito. Las rosas, porque hay cosas que son clásicas por algo.\n\n**Estas no se marchitan nunca.** Esto tampoco.",
    photos: demoPhotos(["p1", "p3"], { p1: "el día que nos conocimos", p3: "tú, con tarta" }),
    fields,
  },
};
