import type { GiftData } from "@/lib/gift/schema";
import { demoPhotos } from "../_shared/demo-photos";
import type { KeepsakeFields } from "./schema";

const shared = {
  version: 1 as const,
  templateSlug: "keepsake",
  recipientName: "Elena",
  senderName: "Sam",
  messageStyle: "typewriter" as const,
  accentColor: "#8E2B2B",
  fontPairing: "editorial" as const,
  showReactionCta: true,
  watermark: false,
  cover: "classic" as const,
  music: { source: "library" as const, url: "/audio/library/golden-hour.mp3", trackId: "golden-hour", title: "Golden Hour", startAt: 0 },
  video: undefined,
  countdown: undefined,
};

export const demoData: Record<"en" | "es", GiftData<KeepsakeFields>> = {
  en: {
    ...shared,
    locale: "en",
    title: "things i kept",
    message: "I'm the kind of person who keeps things. You've seen the drawer. So you won't be surprised that I kept all of this too.\n\n**Four years, two flats, one dog, nine hundred and something mornings.** I don't remember the big days half as well as the small ones: you reading on the floor because the sofa was \"too far\", the song you hum when you think I can't hear.\n\n*If the flat was on fire I'd take the dog, then you, then this. In that order, because you can run.*",
    photos: demoPhotos(["p2", "p1", "p8", "p7", "p4"], { p2: "lisbon, the first trip", p1: "where it started", p8: "you leave notes. i keep them.", p7: "july, when everything was slow", p4: "the day nube chose us" }),
    surprise: { text: "There's a real one of these. Bottom drawer, under the jumpers. Go and look.", reveal: "tap" },
    fields: { look: "kraft", engraving: "since 2021" },
  },
  es: {
    ...shared,
    locale: "es",
    title: "cosas que guardé",
    message: "Soy de esas personas que lo guardan todo. Ya has visto el cajón. Así que no te sorprenderá que también haya guardado todo esto.\n\n**Cuatro años, dos pisos, una perra, novecientas y pico mañanas.** No recuerdo los días grandes ni la mitad de bien que los pequeños: tú leyendo en el suelo porque el sofá estaba «demasiado lejos», la canción que tarareas cuando crees que no te oigo.\n\n*Si el piso ardiera me llevaría a la perra, luego a ti, luego esto. En ese orden, porque tú sabes correr.*",
    photos: demoPhotos(["p2", "p1", "p8", "p7", "p4"], { p2: "lisboa, el primer viaje", p1: "donde empezó todo", p8: "dejas notas. yo las guardo.", p7: "julio, cuando todo iba despacio", p4: "el día que nube nos eligió" }),
    surprise: { text: "Hay una de verdad. Último cajón, debajo de los jerséis. Ve a mirar.", reveal: "tap" },
    fields: { look: "kraft", engraving: "desde 2021" },
  },
};
