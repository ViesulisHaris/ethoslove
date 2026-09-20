import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { XoxoFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "xoxo",
  recipientName: "Dani",
  senderName: "Sam",
  messageStyle: "typewriter" as const,
  accentColor: "#B3122A",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", artist: "the one from the car", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<XoxoFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "xoxo, sam",
    message: "I'm not good at saying it out loud, which you know, because you've watched me try. So here it is in writing, where I can't mumble.\n\n**You're my favourite notification.** You're who I look for when something funny happens. You're the reason I now own a second pillow, a better kettle, and an opinion about candles.\n\n*Every kiss on this page is from me. Leave a few of your own. I'll count them later.*",
    photos: demoPhotos(["p1", "p2", "p6", "p7", "p4"], { p1: "us, 4pm, no plans", p2: "lisbon", p6: "the last train to you", p7: "july", p4: "our first joint decision" }),
    surprise: { text: "Saturday. Your favourite place. I booked the table by the window.", reveal: "tap" },
    fields: { look: "cream", headline: "my person" },
  },
  es: {
    ...shared,
    locale: "es",
    music: { ...shared.music, artist: "la del coche" },
    title: "xoxo, sam",
    message: "No se me da bien decirlo en voz alta, y lo sabes, porque me has visto intentarlo. Así que aquí va por escrito, donde no puedo murmurar.\n\n**Eres mi notificación favorita.** Eres a quien busco cuando pasa algo gracioso. Eres la razón por la que ahora tengo una segunda almohada, un hervidor mejor y una opinión sobre las velas.\n\n*Todos los besos de esta página son míos. Deja unos cuantos tuyos. Luego los cuento.*",
    photos: demoPhotos(["p1", "p2", "p6", "p7", "p4"], { p1: "nosotros, las 4, sin planes", p2: "lisboa", p6: "el último tren hacia ti", p7: "julio", p4: "nuestra primera decisión conjunta" }),
    surprise: { text: "El sábado. Tu sitio favorito. He reservado la mesa de la ventana.", reveal: "tap" },
    fields: { look: "cream", headline: "mi persona" },
  },
};
