import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { BalloonsFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "balloons",
  recipientName: "Ana",
  senderName: "Marco",
  messageStyle: "typewriter" as const,
  accentColor: "#D9667C",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "birthday" as const,
  music: { source: "library" as const, url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<BalloonsFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "Ana turns 30",
    message: "I couldn't fit thirty balloons in the flat, so here are thirty in your phone, and you're allowed to pop every single one.\n\nYou said thirty would feel like a door closing. **It's the opposite.** Every room you walk into gets louder and better, and I still catch myself looking at you like the first week.\n\n*Happy birthday. Now go and find the one with the note.*",
    photos: demoPhotos(["p3", "p1", "p2", "p4", "p7", "p8"], { p3: "Last year's cake, before you fixed it", p1: "The coffee that started it", p2: "Lisbon, lost on purpose", p4: "Nube's first birthday party", p7: "July, on two wheels", p8: "The notes you leave" }),
    surprise: { text: "Dinner is booked. 8pm, the place with the lemon tree. Wear the green thing.", reveal: "tap" },
    fields: { age: 30, palette: "pastel" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "Ana cumple 30",
    message: "No me cabían treinta globos en el piso, así que aquí tienes treinta en el móvil, y puedes explotarlos todos.\n\nDijiste que los treinta se sentirían como una puerta que se cierra. **Es justo lo contrario.** Cada habitación en la que entras se vuelve más ruidosa y mejor, y todavía me sorprendo mirándote como la primera semana.\n\n*Feliz cumpleaños. Ahora ve a buscar el que lleva la nota.*",
    photos: demoPhotos(["p3", "p1", "p2", "p4", "p7", "p8"], { p3: "La tarta del año pasado, antes de que la arreglaras", p1: "El café con el que empezó todo", p2: "Lisboa, perdidos a propósito", p4: "El primer cumple de Nube", p7: "Julio, sobre dos ruedas", p8: "Las notas que dejas" }),
    surprise: { text: "La cena está reservada. A las 8, el sitio del limonero. Ponte lo verde.", reveal: "tap" },
    fields: { age: 30, palette: "pastel" },
  },
};
