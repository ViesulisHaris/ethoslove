import type { GiftData } from "@/lib/gift/schema";
import { DEMO_PHOTOS } from "../_shared/demo-photos";
import type { GroupReferenceFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "group-reference",
  recipientName: "Nora",
  messageStyle: "fade" as const,
  photos: [],
  accentColor: "#B4552D",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  fields: {},
};

const photo = (id: "p3" | "p4") => ({ url: DEMO_PHOTOS[id].url, width: DEMO_PHOTOS[id].width, height: DEMO_PHOTOS[id].height });

/**
 * Six notes that between them hold every edge the contract names: two with a photo, one at the
 * template's full 140 characters, and one signed with a name of the full 24.
 */
export const demoData: Record<"en" | "es", GiftData<GroupReferenceFields>> = {
  en: {
    ...shared,
    locale: "en",
    senderName: "Tom",
    title: "Forty, from all of us",
    message: "Forty looks good on you.\n\nI asked everyone for one line and nobody could keep to one. **Read them slowly.**",
    contributions: [
      { key: "demo0000a1", name: "Mum", note: "You were born at 4 a.m. and you have kept me up ever since. I would not swap one night of it.", photo: photo("p3") },
      { key: "demo0000a2", name: "Iris", note: "Same table at Lucca on the 12th. I'm buying, you're choosing the wine." },
      { key: "demo0000a3", name: "Dad", note: "I still have the card you made me in 1994. It says I am the best at fixing bikes. Come round and I will prove it again. The kettle's on now." },
      { key: "demo0000a4", name: "The whole Okonkwo family", note: "Bring the dog on Sunday. The kids have drawn him a banner.", photo: photo("p4") },
      { key: "demo0000a5", name: "Sam", note: "You taught me to drive in a car park and never once shouted." },
      { key: "demo0000a6", name: "Gran", note: "Forty is nothing. Ring me." },
    ],
  },
  es: {
    ...shared,
    locale: "es",
    senderName: "Tomás",
    title: "Cuarenta, de parte de todos",
    message: "Los cuarenta te sientan bien.\n\nPedí una línea a cada uno y nadie supo quedarse en una. **Léelas despacio.**",
    contributions: [
      { key: "demo0000a1", name: "Mamá", note: "Naciste a las cuatro de la mañana y desde entonces no me has dejado dormir. No cambiaría ni una sola noche.", photo: photo("p3") },
      { key: "demo0000a2", name: "Iris", note: "La misma mesa de siempre el día 12. Invito yo, el vino lo eliges tú." },
      { key: "demo0000a3", name: "Papá", note: "Aún guardo la tarjeta que me hiciste en 1994. Pone que arreglo bicis como nadie. Ven a casa y te lo demuestro otra vez. Ya pongo yo el café." },
      { key: "demo0000a4", name: "Los Okonkwo, al completo", note: "Trae al perro el domingo. Los niños le han pintado una pancarta.", photo: photo("p4") },
      { key: "demo0000a5", name: "Sam", note: "Me enseñaste a conducir en un aparcamiento y no gritaste ni una vez." },
      { key: "demo0000a6", name: "La abuela", note: "Cuarenta no es nada. Llámame." },
    ],
  },
};
