import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { ThreadFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "text-thread",
  recipientName: "Sofía",
  senderName: "Lucas",
  messageStyle: "typewriter" as const,
  accentColor: "#2E4A62",
  fontPairing: "modern" as const,
  showReactionCta: true,
  watermark: false,
  music: undefined,
  video: undefined,
  countdown: { targetAt: "2026-12-20T18:30:00+02:00", timezone: "Europe/Riga", label: "Until I land" },
  surprise: undefined,
};

export const demoData: Record<"en" | "es", GiftData<ThreadFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "Read this when you land",
    message: "OK. The real one.\n\nI don't say it enough over text because text makes it small. So: **I miss you in a way that has changed how I walk into rooms.** I check for you. I've stopped noticing that I do it.\n\nFourteen days. Then I'll say it out loud, badly, in an arrivals hall. *Look for the idiot with the sign.*",
    photos: demoPhotos(["p6", "p5", "p2"], { p6: "", p5: "", p2: "" }),
    fields: {
      bubble: "ink",
      showTyping: true,
      lines: [
        "hey",
        "you up?",
        "stupid question. it's 8am there",
        "I'm on the 23:40 again. the rain one",
        "[photo]",
        "remember when we had no signal for three days and it was the best three days",
        "[photo]",
        "I found the Lisbon photo",
        "[photo]",
        "we look so lost. we were so lost",
        "ok I'm going to say something and you're not allowed to reply with a gif",
        "…",
        "typing for a while, sorry",
      ],
    },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Léelo cuando aterrices",
    message: "Vale. El de verdad.\n\nNo lo digo lo suficiente por mensaje porque el mensaje lo hace pequeño. Así que: **te echo de menos de una forma que ha cambiado cómo entro en las habitaciones.** Te busco. Ya ni me doy cuenta de que lo hago.\n\nCatorce días. Entonces lo diré en voz alta, mal, en una sala de llegadas. *Busca al idiota del cartel.*",
    photos: demoPhotos(["p6", "p5", "p2"], { p6: "", p5: "", p2: "" }),
    fields: {
      bubble: "ink",
      showTyping: true,
      lines: [
        "ey",
        "¿estás despierta?",
        "pregunta tonta. ahí son las 8",
        "voy otra vez en el de las 23:40. el de la lluvia",
        "[photo]",
        "¿te acuerdas de cuando no tuvimos cobertura tres días y fueron los mejores tres días?",
        "[photo]",
        "encontré la foto de Lisboa",
        "[photo]",
        "qué perdidos parecemos. qué perdidos estábamos",
        "vale voy a decir una cosa y no puedes responder con un gif",
        "…",
        "escribiendo un rato, perdón",
      ],
    },
  },
};
