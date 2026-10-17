import type { StickerId } from "@/templates/_shared/covers/stickers";

type L = { en: string; es: string };

/** Dates for two screens: things to do together when together is a video call. */
export type VirtualDate = { id: string; title: L; blurb: L; twist: L; art: { sticker: StickerId; from: string; to: string } };

export const VIRTUAL_DATES: VirtualDate[] = [
  {
    id: "same-recipe",
    title: { en: "Same recipe, two kitchens", es: "La misma receta, dos cocinas" },
    blurb: { en: "Pick one dish, shop for it separately, cook it on a call and eat at the same table, sort of.", es: "Elegid un plato, comprad cada uno por su lado, cocinadlo en llamada y cenad en la misma mesa, más o menos." },
    twist: { en: "Plate it for the camera. The other one scores it out of ten, honestly.", es: "Emplatad para la cámara. El otro puntúa del uno al diez, con sinceridad." },
    art: { sticker: "strawberry", from: "#FFE3D3", to: "#F9C6D0" },
  },
  {
    id: "watch-party",
    title: { en: "Three, two, one, play", es: "Tres, dos, uno, play" },
    blurb: { en: "The same film, started on the count of three, with the call left open for commentary.", es: "La misma peli, empezada a la de tres, con la llamada abierta para comentar." },
    twist: { en: "Same snacks on both sofas. Post the shopping list the day before.", es: "Lo mismo para picar en los dos sofás. Pasaos la lista de la compra el día antes." },
    art: { sticker: "moon", from: "#DADDF5", to: "#BFC5EE" },
  },
  {
    id: "walk-me-round",
    title: { en: "Walk me round your day", es: "Enséñame tu día andando" },
    blurb: { en: "A video walk through your actual neighbourhood: the coffee place, the shortcut, the dog you always say hello to.", es: "Un paseo en vídeo por tu barrio de verdad: el sitio del café, el atajo, el perro al que siempre saludas." },
    twist: { en: "End at the spot you'll take them first when they visit.", es: "Acaba en el sitio al que le llevarás primero cuando venga." },
    art: { sticker: "leaf", from: "#E1EFD9", to: "#CBE3BE" },
  },
  {
    id: "order-for-each-other",
    title: { en: "Order each other dinner", es: "Pedíos la cena el uno al otro" },
    blurb: { en: "You choose what arrives at their door, they choose what arrives at yours. Nobody peeks.", es: "Tú eliges lo que llega a su puerta y al revés. Nadie mira antes de tiempo." },
    twist: { en: "Open the bags on camera at the same time.", es: "Abrid las bolsas delante de la cámara a la vez." },
    art: { sticker: "cherries", from: "#FFE0E6", to: "#FBC4D0" },
  },
  {
    id: "one-song-each",
    title: { en: "One song each, all evening", es: "Una canción cada uno, toda la noche" },
    blurb: { en: "Build a playlist by turns. Every song comes with the story of why.", es: "Haced una lista por turnos. Cada canción viene con la historia de por qué." },
    twist: { en: "The last song is the one for the airport arrivals hall.", es: "La última canción es la de la puerta de llegadas del aeropuerto." },
    art: { sticker: "sparkle", from: "#FCE0EE", to: "#F5BFD9" },
  },
  {
    id: "museum-from-bed",
    title: { en: "A museum, from bed", es: "Un museo, desde la cama" },
    blurb: { en: "Half the great museums have a virtual tour. Share a screen and wander in your pyjamas.", es: "Medio mundo de museos tiene visita virtual. Compartid pantalla y paseaos en pijama." },
    twist: { en: "Each choose the piece you'd hang in the flat you'll share one day.", es: "Elegid cada uno la obra que colgaríais en el piso que compartiréis algún día." },
    art: { sticker: "butterfly", from: "#EADFF6", to: "#DCCBF0" },
  },
  {
    id: "plan-the-visit",
    title: { en: "Plan the next visit, properly", es: "Planead la próxima visita, pero bien" },
    blurb: { en: "Open the map of their town and build the first day together: every stop, in order.", es: "Abrid el mapa de su ciudad y montad el primer día juntos: cada parada, en orden." },
    twist: { en: "Send the plan as an invitation and let them open it on the plane.", es: "Envía el plan como invitación y que lo abra en el avión." },
    art: { sticker: "planet", from: "#D9EEF3", to: "#BBDDE8" },
  },
  {
    id: "sunday-paper",
    title: { en: "Do nothing, together", es: "No hacer nada, juntos" },
    blurb: { en: "Call on, cameras propped up, each getting on with a quiet Sunday. Company, not conversation.", es: "Llamada abierta, cámaras apoyadas y cada uno a su domingo tranquilo. Compañía, no conversación." },
    twist: { en: "Nobody has to talk. Whoever breaks first reads the other a headline.", es: "Nadie tiene que hablar. Quien rompa el silencio le lee un titular al otro." },
    art: { sticker: "mug", from: "#F8E6CF", to: "#EED2B2" },
  },
];
