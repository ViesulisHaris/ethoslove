import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { BatSwarmFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "bat-swarm",
  recipientName: "Nora",
  senderName: "Eli",
  messageStyle: "typewriter" as const,
  accentColor: "#CDB9FF",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: {
    source: "library" as const,
    url: "/audio/library/under-the-stars.mp3",
    trackId: "under-the-stars",
    title: "Under the Stars",
    startAt: 0,
  },
  video: undefined,
  countdown: undefined,
  surprise: {
    text: "Friday, 8pm. The roof of my building. Blanket, thermos, and as many bats as I can legally arrange. I'll bring the cocoa.",
    reveal: "tap" as const,
  },
};

export const demoData: Record<"en" | "es", GiftData<BatSwarmFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "look up",
    message:
      "every october you check the sky for bats. you say it's the one time of year nobody looks at them and they deserve better.\n\nso i got you a few hundred.\n\nthey can only spell the short version: **your name**, and a heart, because that's the part that fits on a moon.\n\nthe long version is this: with you, even a haunted house feels like home.\n\n*look up. i'll be the one underneath, looking at you.*",
    photos: demoPhotos(["p5", "p6", "p2", "p7"], {
      p5: "the night we counted bats instead of stars",
      p6: "the 23:40 to you",
      p2: "lost on purpose again",
      p7: "july. nothing flew but us",
    }),
    fields: { look: "midnight", line: "be my boo" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "mira arriba",
    message:
      "cada octubre miras el cielo buscando murciélagos. dices que es la única época del año en que nadie se fija en ellos y que merecen algo mejor.\n\nasí que te he traído unos cuantos cientos.\n\nsolo saben deletrear la versión corta: **tu nombre**, y un corazón, porque es lo que cabe en una luna.\n\nla versión larga es esta: contigo, hasta una casa encantada se siente hogar.\n\n*mira arriba. seré quien esté debajo, mirándote a ti.*",
    photos: demoPhotos(["p5", "p6", "p2", "p7"], {
      p5: "la noche que contamos murciélagos en vez de estrellas",
      p6: "el de las 23:40 hacia ti",
      p2: "perdidos a propósito otra vez",
      p7: "julio. nada volaba salvo nosotros",
    }),
    fields: { look: "midnight", line: "sé mi boo" },
  },
};
