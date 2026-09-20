import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { PartyAnimalsFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "party-animals",
  recipientName: "Ana",
  senderName: "Marco",
  messageStyle: "fade" as const,
  accentColor: "#F0588C",
  fontPairing: "modern" as const,
  showReactionCta: true,
  watermark: false,
  cover: "party" as const,
  music: { source: "library" as const, url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<PartyAnimalsFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "Ana's party (the hamsters insisted)",
    message: "I couldn't get everyone in one room, so I got everyone in one phone. The hamsters RSVP'd first. The ferrets were not invited and came anyway, which is also how you and I became friends.\n\n**Thirty.** You're the person who remembers everyone's birthday and acts surprised when anyone remembers yours. We remembered. All eleven of us.\n\n*Eat the cake. The good bit, the corner with all the icing.*",
    photos: demoPhotos(["p3", "p4", "p1", "p2", "p7", "p8"], { p3: "last year's cake, moments before the incident", p4: "nube, head of security", p1: "the coffee that started it", p2: "lisbon, lost on purpose", p7: "july, on two wheels", p8: "the notes you leave" }),
    surprise: { text: "Look under your pillow. No, the other pillow.", reveal: "tap" },
    fields: { look: "linen", age: 30, shouts: ["ANA!! ur 30!!", "i was told there'd be cake", "marco cried making this", "who invited the ferrets"] },
  },
  es: {
    ...shared,
    locale: "es",
    title: "La fiesta de Ana (insistieron los hámsters)",
    message: "No pude meter a todo el mundo en una habitación, así que metí a todo el mundo en un móvil. Los hámsters confirmaron primero. A los hurones no los invitó nadie y vinieron igual, que es también como tú y yo nos hicimos amigos.\n\n**Treinta.** Eres la persona que se acuerda del cumple de todo el mundo y se sorprende cuando alguien se acuerda del suyo. Nos hemos acordado. Los once.\n\n*Cómete la tarta. El trozo bueno, la esquina con todo el glaseado.*",
    photos: demoPhotos(["p3", "p4", "p1", "p2", "p7", "p8"], { p3: "la tarta del año pasado, antes del incidente", p4: "nube, jefa de seguridad", p1: "el café que lo empezó todo", p2: "lisboa, perdidos a propósito", p7: "julio, en dos ruedas", p8: "las notas que dejas" }),
    surprise: { text: "Mira debajo de tu almohada. No, la otra almohada.", reveal: "tap" },
    fields: { look: "linen", age: 30, shouts: ["¡¡ANA!! ¡¡30!!", "me dijeron que había tarta", "marco lloró haciendo esto", "quién invitó a los hurones"] },
  },
};
