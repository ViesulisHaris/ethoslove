import { distanceKm } from "./geo";
import type { PlaceKind } from "./kinds";
import type { Place } from "./places";
import { isWet, type DayWeather } from "./weather";
import type { StickerId } from "@/templates/_shared/covers/stickers";

type L = { en: string; es: string };
export type Vibe = "cozy" | "playful" | "outdoorsy" | "foodie" | "artsy" | "fancy" | "free" | "rainy";
export type Moment = "morning" | "day" | "sunset" | "evening" | "night";

/**
 * A date idea is a small recipe: one to three kinds of place in an order, and a twist, which is
 * the part that makes it a date and not an errand. The site finds real places for each stop near
 * wherever they are looking; the idea is what gives an evening a shape.
 */
export type DateIdea = {
  id: string;
  title: L;
  blurb: L;
  twist: L;
  /** Each stop lists the kinds that would do, best first. */
  stops: PlaceKind[][];
  /** Spoilt by rain: hidden when the forecast for their day is wet. */
  needsDry: boolean;
  /** Better for rain: moved to the front when it is wet. */
  goodInRain: boolean;
  moment: Moment;
  /** 0 free, 1 a coffee each, 2 dinner, 3 a treat. */
  budget: 0 | 1 | 2 | 3;
  minutes: number;
  vibes: Vibe[];
  /** The drawn sticker on the card, and the two papers behind it. */
  art: { sticker: StickerId; from: string; to: string };
};

export const IDEAS: DateIdea[] = [
  {
    id: "golden-hour-picnic",
    title: { en: "Golden hour picnic", es: "Pícnic a la hora dorada" },
    blurb: { en: "Something sweet from a bakery, a blanket, and the best view in town as the light goes.", es: "Algo dulce de una pastelería, una manta y la mejor vista de la ciudad mientras cae la luz." },
    twist: { en: "Each of you brings one thing the other has never tried.", es: "Cada uno lleva algo que el otro nunca ha probado." },
    stops: [["dessert", "cafe"], ["viewpoint", "park", "garden", "beach"]],
    needsDry: true,
    goodInRain: false,
    moment: "sunset",
    budget: 1,
    minutes: 120,
    vibes: ["outdoorsy", "cozy", "free"],
    art: { sticker: "strawberry", from: "#FFE3D3", to: "#F9C6D0" },
  },
  {
    id: "pasta-and-a-slow-walk",
    title: { en: "Dinner, then the long way home", es: "Cena, y a casa por el camino largo" },
    blurb: { en: "A table for two, then a walk with no destination until somebody's feet hurt.", es: "Una mesa para dos y luego un paseo sin destino hasta que a alguien le duelan los pies." },
    twist: { en: "Order for each other. No vetoes.", es: "Pedid el uno por el otro. Sin vetos." },
    stops: [["restaurant"], ["viewpoint", "park", "garden"]],
    needsDry: false,
    goodInRain: false,
    moment: "evening",
    budget: 2,
    minutes: 180,
    vibes: ["foodie", "cozy"],
    art: { sticker: "heart", from: "#FBD9E1", to: "#F3B9C4" },
  },
  {
    id: "bookshop-and-coffee",
    title: { en: "Pick a book for each other", es: "Elegid un libro el uno para el otro" },
    blurb: { en: "Twenty minutes apart in a bookshop, then coffee while you explain yourselves.", es: "Veinte minutos por separado en una librería y luego un café para dar explicaciones." },
    twist: { en: "Write the first page a note before you hand it over.", es: "Escribid una nota en la primera página antes de entregarlo." },
    stops: [["bookshop"], ["cafe", "dessert"]],
    needsDry: false,
    goodInRain: true,
    moment: "day",
    budget: 1,
    minutes: 120,
    vibes: ["cozy", "artsy", "rainy"],
    art: { sticker: "mug", from: "#F8E6CF", to: "#EED2B2" },
  },
  {
    id: "museum-then-wine",
    title: { en: "Museum, then a glass of something", es: "Museo y luego una copa" },
    blurb: { en: "One hour, not the whole building. Then a bar to argue about what you saw.", es: "Una hora, no el edificio entero. Y después un bar para discutir lo que habéis visto." },
    twist: { en: "Each choose the piece you'd steal. Defend it.", es: "Elegid la obra que robaríais. Defendedla." },
    stops: [["museum", "gallery"], ["bar", "restaurant"]],
    needsDry: false,
    goodInRain: true,
    moment: "day",
    budget: 2,
    minutes: 180,
    vibes: ["artsy", "rainy", "fancy"],
    art: { sticker: "sparkle", from: "#E4E0F6", to: "#CFC7EE" },
  },
  {
    id: "mini-golf-and-milkshakes",
    title: { en: "Mini golf, loser buys dessert", es: "Minigolf: quien pierda paga el postre" },
    blurb: { en: "Eighteen holes of trash talk and a very serious scorecard.", es: "Dieciocho hoyos de piques y una tarjeta de puntos muy seria." },
    twist: { en: "Winner picks the dessert. Loser pays and takes the photo.", es: "Quien gane elige el postre. Quien pierda paga y hace la foto." },
    stops: [["minigolf"], ["dessert", "cafe"]],
    needsDry: true,
    goodInRain: false,
    moment: "day",
    budget: 1,
    minutes: 150,
    vibes: ["playful", "outdoorsy"],
    art: { sticker: "candy", from: "#D8EAF3", to: "#BFDDEB" },
  },
  {
    id: "bowling-night",
    title: { en: "Bowling, bumpers optional", es: "Bolos, con o sin barreras" },
    blurb: { en: "Bad shoes, worse technique, a plate of chips in the middle.", es: "Zapatos feos, técnica peor y un plato de patatas en medio." },
    twist: { en: "Every gutter ball is a truth. Every strike is a dare.", es: "Cada bola fuera, una verdad. Cada pleno, un reto." },
    stops: [["bowling"], ["bar", "restaurant"]],
    needsDry: false,
    goodInRain: true,
    moment: "evening",
    budget: 2,
    minutes: 150,
    vibes: ["playful", "rainy"],
    art: { sticker: "star", from: "#DDEBFA", to: "#C3D8F3" },
  },
  {
    id: "escape-room-debrief",
    title: { en: "Escape room, then the debrief", es: "Escape room y luego el análisis" },
    blurb: { en: "Sixty minutes to find out how the two of you work under pressure. Drinks after to recover.", es: "Sesenta minutos para descubrir cómo funcionáis bajo presión. Después, algo de beber para recuperaros." },
    twist: { en: "No blaming until the first drink arrives.", es: "Nada de echarse la culpa hasta que llegue la primera copa." },
    stops: [["escape"], ["bar", "cafe"]],
    needsDry: false,
    goodInRain: true,
    moment: "evening",
    budget: 3,
    minutes: 150,
    vibes: ["playful", "rainy"],
    art: { sticker: "planet", from: "#E6E0F8", to: "#D2C8F0" },
  },
  {
    id: "sunrise-and-breakfast",
    title: { en: "Up before the city", es: "Despertar antes que la ciudad" },
    blurb: { en: "An alarm neither of you wanted, a view with nobody in it, and the first coffee of the day.", es: "Una alarma que ninguno quería, una vista sin nadie y el primer café del día." },
    twist: { en: "Phones stay in pockets until the sun is fully up.", es: "Los móviles, en el bolsillo hasta que el sol haya salido del todo." },
    stops: [["viewpoint", "beach", "park"], ["cafe"]],
    needsDry: true,
    goodInRain: false,
    moment: "morning",
    budget: 1,
    minutes: 120,
    vibes: ["outdoorsy", "cozy", "free"],
    art: { sticker: "cloud", from: "#FFE9CC", to: "#FBD3A8" },
  },
  {
    id: "gallery-hop",
    title: { en: "Gallery hop", es: "Ruta de galerías" },
    blurb: { en: "Small rooms, free to walk into, and nobody minds if you whisper.", es: "Salas pequeñas, entrada libre y a nadie le importa si susurráis." },
    twist: { en: "Title every piece yourselves before you read the label.", es: "Ponedle título a cada obra antes de leer la cartela." },
    stops: [["gallery", "museum"], ["cafe", "dessert"]],
    needsDry: false,
    goodInRain: true,
    moment: "day",
    budget: 0,
    minutes: 120,
    vibes: ["artsy", "free", "rainy"],
    art: { sticker: "butterfly", from: "#EADFF6", to: "#DCCBF0" },
  },
  {
    id: "cinema-and-late-dessert",
    title: { en: "A film and a late dessert", es: "Una peli y un postre tardío" },
    blurb: { en: "The back row, shared popcorn, and somewhere still open after the credits.", es: "La última fila, palomitas a medias y un sitio que siga abierto al salir." },
    twist: { en: "One of you picks the film, the other picks the seats and the snacks.", es: "Uno elige la película; el otro, los asientos y lo de picar." },
    stops: [["cinema"], ["dessert", "cafe", "bar"]],
    needsDry: false,
    goodInRain: true,
    moment: "evening",
    budget: 2,
    minutes: 210,
    vibes: ["cozy", "rainy"],
    art: { sticker: "moon", from: "#DADDF5", to: "#BFC5EE" },
  },
  {
    id: "ice-cream-walk",
    title: { en: "Ice cream and nowhere to be", es: "Helado y ningún sitio al que ir" },
    blurb: { en: "Two scoops each and a park to get lost in.", es: "Dos bolas cada uno y un parque en el que perderse." },
    twist: { en: "Order the flavour you think the other one will pick. Swap if you're wrong.", es: "Pedid el sabor que creéis que elegirá el otro. Si falláis, se cambia." },
    stops: [["dessert"], ["park", "garden", "viewpoint"]],
    needsDry: true,
    goodInRain: false,
    moment: "day",
    budget: 1,
    minutes: 90,
    vibes: ["cozy", "outdoorsy"],
    art: { sticker: "cherries", from: "#FFE0E6", to: "#FBC4D0" },
  },
  {
    id: "arcade-night",
    title: { en: "Arcade night", es: "Noche de recreativos" },
    blurb: { en: "A pocket of coins, air hockey grudges, and a prize nobody needs.", es: "Un puñado de monedas, rencores de air hockey y un premio que nadie necesita." },
    twist: { en: "Pool your tickets. Whatever they buy lives on the shelf forever.", es: "Juntad los tickets. Lo que compréis se queda en la estantería para siempre." },
    stops: [["arcade", "bowling"], ["restaurant", "bar"]],
    needsDry: false,
    goodInRain: true,
    moment: "evening",
    budget: 2,
    minutes: 150,
    vibes: ["playful", "rainy"],
    art: { sticker: "balloons", from: "#FDE2F0", to: "#F7C3DE" },
  },
  {
    id: "garden-afternoon",
    title: { en: "An afternoon in a garden", es: "Una tarde en un jardín" },
    blurb: { en: "Slow paths, a bench with a view of nothing in particular, and tea after.", es: "Caminos lentos, un banco con vistas a nada en concreto y un té después." },
    twist: { en: "Find the plant that looks most like each of you.", es: "Encontrad la planta que más se parezca a cada uno." },
    stops: [["garden", "park"], ["cafe", "dessert"]],
    needsDry: true,
    goodInRain: false,
    moment: "day",
    budget: 1,
    minutes: 150,
    vibes: ["outdoorsy", "cozy", "free"],
    art: { sticker: "tulip", from: "#DCEBDF", to: "#C6DFCB" },
  },
  {
    id: "beach-until-sunset",
    title: { en: "Beach until the sun's gone", es: "Playa hasta que se vaya el sol" },
    blurb: { en: "Salt, a towel big enough for two, and dinner with sand still on your feet.", es: "Sal, una toalla para dos y cenar con arena todavía en los pies." },
    twist: { en: "Write something in the sand and let the tide take it.", es: "Escribid algo en la arena y que se lo lleve la marea." },
    stops: [["beach"], ["restaurant", "bar"]],
    needsDry: true,
    goodInRain: false,
    moment: "sunset",
    budget: 2,
    minutes: 240,
    vibes: ["outdoorsy", "foodie"],
    art: { sticker: "daisy", from: "#D9EEF3", to: "#FCE3C6" },
  },
  {
    id: "climbing-first-timers",
    title: { en: "Climb something together", es: "Escalad algo juntos" },
    blurb: { en: "A beginner's wall, chalky hands, and one of you holding the other's rope.", es: "Una pared para principiantes, manos con magnesio y uno sujetando la cuerda del otro." },
    twist: { en: "Dinner's on whoever says 'I can't' first.", es: "Paga la cena quien diga primero «no puedo»." },
    stops: [["climbing"], ["restaurant", "cafe"]],
    needsDry: false,
    goodInRain: true,
    moment: "day",
    budget: 2,
    minutes: 180,
    vibes: ["playful", "rainy"],
    art: { sticker: "leaf", from: "#E1EFD9", to: "#CBE3BE" },
  },
  {
    id: "spa-evening",
    title: { en: "Do nothing, properly", es: "No hacer nada, pero bien" },
    blurb: { en: "Warm water, no phones, and the slowest two hours of the month.", es: "Agua caliente, sin móviles y las dos horas más lentas del mes." },
    twist: { en: "Not one word about work. Not one.", es: "Ni una palabra de trabajo. Ni una." },
    stops: [["spa"], ["restaurant", "bar"]],
    needsDry: false,
    goodInRain: true,
    moment: "evening",
    budget: 3,
    minutes: 180,
    vibes: ["cozy", "fancy", "rainy"],
    art: { sticker: "bow", from: "#EFDFEC", to: "#E2C9DD" },
  },
  {
    id: "theatre-night",
    title: { en: "Dress up for the theatre", es: "Vestíos para el teatro" },
    blurb: { en: "A reason to wear the good outfit, and a drink at the interval.", es: "Una excusa para ponerse lo bueno y una copa en el descanso." },
    twist: { en: "Guess the ending at the interval. Write it down. Loser buys the nightcap.", es: "Apostad el final en el descanso. Por escrito. Quien falle paga la última copa." },
    stops: [["theatre"], ["bar", "restaurant"]],
    needsDry: false,
    goodInRain: true,
    moment: "evening",
    budget: 3,
    minutes: 210,
    vibes: ["fancy", "artsy"],
    art: { sticker: "kiss", from: "#F6D6DC", to: "#EDB4C0" },
  },
  {
    id: "stars-and-planets",
    title: { en: "Look up", es: "Mirad hacia arriba" },
    blurb: { en: "A planetarium if the sky's against you, the darkest viewpoint in town if it isn't.", es: "Un planetario si el cielo no acompaña; el mirador más oscuro de la ciudad si sí." },
    twist: { en: "Name a star after the other. Make it official on a napkin.", es: "Ponedle a una estrella el nombre del otro. Hacedlo oficial en una servilleta." },
    stops: [["planetarium", "viewpoint"], ["cafe", "bar", "dessert"]],
    needsDry: false,
    goodInRain: false,
    moment: "night",
    budget: 1,
    minutes: 120,
    vibes: ["cozy", "artsy"],
    art: { sticker: "planet", from: "#D8DCF5", to: "#B8BFEA" },
  },
  {
    id: "karaoke-duet",
    title: { en: "One duet, no backing out", es: "Un dueto, y sin echarse atrás" },
    blurb: { en: "A private booth, a song you both pretend not to know every word of.", es: "Una sala privada y una canción de la que fingís no saberos toda la letra." },
    twist: { en: "Each of you picks the other's solo.", es: "Cada uno elige el solo del otro." },
    stops: [["karaoke", "bar"], ["restaurant", "dessert"]],
    needsDry: false,
    goodInRain: true,
    moment: "night",
    budget: 2,
    minutes: 150,
    vibes: ["playful", "rainy"],
    art: { sticker: "sparkle", from: "#FCE0EE", to: "#F5BFD9" },
  },
  {
    id: "boats-on-the-water",
    title: { en: "Hire a boat, row badly", es: "Alquilad una barca y remad fatal" },
    blurb: { en: "An hour on the water going mostly in circles.", es: "Una hora en el agua dando, sobre todo, vueltas." },
    twist: { en: "Take turns rowing. The passenger narrates like a nature documentary.", es: "Remad por turnos. Quien no reme narra como en un documental." },
    stops: [["boats"], ["cafe", "dessert", "restaurant"]],
    needsDry: true,
    goodInRain: false,
    moment: "day",
    budget: 2,
    minutes: 120,
    vibes: ["playful", "outdoorsy"],
    art: { sticker: "cloud", from: "#D6ECF2", to: "#BBDDE8" },
  },
  {
    id: "skating-and-hot-chocolate",
    title: { en: "Skate, fall, hot chocolate", es: "Patinar, caerse, chocolate caliente" },
    blurb: { en: "Holding hands is not optional; it is structural.", es: "Ir de la mano no es opcional; es estructural." },
    twist: { en: "Whoever falls first buys the hot chocolate.", es: "Quien se caiga primero paga el chocolate." },
    stops: [["skating"], ["cafe", "dessert"]],
    needsDry: false,
    goodInRain: true,
    moment: "day",
    budget: 2,
    minutes: 120,
    vibes: ["playful", "cozy"],
    art: { sticker: "snowflake", from: "#E0EEF8", to: "#C7DFF2" },
  },
];

export const ideaById = (id: string | undefined): DateIdea | undefined => IDEAS.find((i) => i.id === id);

/** Stops closer together than this make a date you can walk. */
const WALKABLE_KM = 1.6;

/**
 * The places that would do for each stop of an idea, best first: the kind the idea was written
 * for before its stand-ins, within a walk of the stop before where there are any, then by rank.
 * `skip[i]` takes the next one along for stop i, which is what "show me another" presses.
 */
export function fillStops(idea: DateIdea, places: Place[], skip: number[] = []): { place: Place | null; options: number }[] {
  const chosen: Place[] = [];
  return idea.stops.map((kinds, i) => {
    const candidates = places.filter((p) => kinds.includes(p.kind) && !chosen.some((c) => c.id === p.id));
    if (candidates.length === 0) return { place: null, options: 0 };
    const previous = chosen[chosen.length - 1];
    const near = previous ? candidates.filter((p) => distanceKm(previous, p) <= WALKABLE_KM) : candidates;
    const pool = (near.length > 0 ? near : candidates).sort((a, b) => kinds.indexOf(a.kind) - kinds.indexOf(b.kind) || b.score - a.score || a.id.localeCompare(b.id));
    const place = pool[(skip[i] ?? 0) % pool.length];
    chosen.push(place);
    return { place, options: pool.length };
  });
}

/** The same, as just the places: fewer than the idea has stops when the neighbourhood has nothing for one of them. */
export const suggestStops = (idea: DateIdea, places: Place[], skip: number[] = []): Place[] => fillStops(idea, places, skip).flatMap((s) => (s.place ? [s.place] : []));

/** True when every stop of an idea can be filled near here. */
export const isDoable = (idea: DateIdea, places: Place[]): boolean => idea.stops.every((kinds) => places.some((p) => kinds.includes(p.kind)));

/**
 * The ideas for their day, in the order worth reading: rain hides what rain would spoil and brings
 * the indoor ones forward; whatever can actually be done nearby comes before what cannot.
 */
export function ideasFor(day: DayWeather | undefined, places: Place[], vibe?: Vibe): DateIdea[] {
  const wet = day ? isWet(day) : false;
  const hasPlaces = places.length > 0;
  return IDEAS.filter((idea) => !(wet && idea.needsDry) && (!vibe || idea.vibes.includes(vibe)))
    .map((idea, index) => ({ idea, index, rank: (wet && idea.goodInRain ? 2 : 0) + (hasPlaces && isDoable(idea, places) ? 1 : 0) }))
    .sort((a, b) => b.rank - a.rank || a.index - b.index)
    .map((x) => x.idea);
}

export const VIBES: Record<Vibe, L> = {
  cozy: { en: "Cozy", es: "Acogedor" },
  playful: { en: "Playful", es: "Divertido" },
  outdoorsy: { en: "Outdoorsy", es: "Al aire libre" },
  foodie: { en: "Foodie", es: "Para comer bien" },
  artsy: { en: "Artsy", es: "Con arte" },
  fancy: { en: "Dressed up", es: "De gala" },
  free: { en: "Free", es: "Gratis" },
  rainy: { en: "Rainy day", es: "Día de lluvia" },
};
export const VIBE_IDS = Object.keys(VIBES) as Vibe[];
