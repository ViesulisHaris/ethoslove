import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { PhotoBoothFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "photo-booth",
  recipientName: "Maya",
  senderName: "Leo",
  messageStyle: "typewriter" as const,
  accentColor: "#B8142C",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/slow-dance.mp3", trackId: "slow-dance", title: "Slow Dance", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<PhotoBoothFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "for maya",
    message:
      "The booth at the back of Kelly's ate two of my coins before it worked, and you laughed so hard in the second picture that you came out as a blur. It's still my favourite photo of you.\n\nFour years of you pulling me into every photo booth we walk past. **I've kept every strip.** They're in the drawer by the bed, in order, and this one goes on top.\n\n*Happy Valentine's. Same booth on Saturday? I'll bring the coins.*",
    photos: demoPhotos(["p2", "p1", "p7", "p4", "p6", "p5", "p8"], {
      p2: "lisbon, lost on purpose",
      p1: "our first coffee",
      p7: "the bikes, in july",
      p4: "the day nube chose us",
      p6: "the 23:40 to you",
      p5: "no signal, no plans",
      p8: "you leave notes. i keep them.",
    }),
    surprise: { text: "Saturday, 8pm, Kelly's. Bring the blur.", reveal: "tap" },
    fields: { booth: "cherry", filter: "color", line: "my favourite blur" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "para maya",
    message:
      "El fotomatón del fondo del bar de Rosi se tragó dos monedas antes de funcionar, y en la segunda foto te reías tanto que saliste movida. Sigue siendo mi foto favorita tuya.\n\nCuatro años arrastrándome a cada fotomatón que nos cruzamos. **Guardo todas las tiras.** Están en el cajón de la mesilla, por orden, y esta va encima de todas.\n\n*Feliz San Valentín. ¿El sábado, al de siempre? Las monedas las pongo yo.*",
    photos: demoPhotos(["p2", "p1", "p7", "p4", "p6", "p5", "p8"], {
      p2: "lisboa, perdidos a propósito",
      p1: "nuestro primer café",
      p7: "las bicis, en julio",
      p4: "el día que nube nos eligió",
      p6: "el de las 23:40 hacia ti",
      p5: "sin cobertura, sin planes",
      p8: "dejas notas. yo las guardo.",
    }),
    surprise: { text: "El sábado a las 8, en el bar de Rosi. Trae tu mejor borrón.", reveal: "tap" },
    fields: { booth: "cherry", filter: "color", line: "mi borrón favorito" },
  },
};
