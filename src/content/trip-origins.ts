/**
 * The words of the pages by where you leave from (`/trips/from-<city>`, lib/trips/origins.ts).
 * `TRIP_ORIGIN_UI` is what every such page says, with `{city}`, `{count}` (the trips, twelve) and
 * `{rest}` (the trips folded under the first six) filled in. `TRIP_ORIGIN_COPY` is the two sentences
 * true of leaving from one city: `line` the first (the hero's italic line), `sentence` the rest,
 * `hero`, the trip in the hero's photograph: the one that starts there, or else a trip that is
 * not among the six cards; and `description`, the search result's line, written from the same city's
 * numbers (no two cities share one, nor its opening). No sentence is shared between two cities, nor its first three words.
 * Each was written from the matcher's own minutes; tests/unit/trip-origins.test.ts (O6) holds the
 * numbers, so a sentence that drifts from the data fails. Fix the sentence, never the test.
 * Hours, never a fare. Spanish adapted, Spain Spanish, the two of them spoken to as vosotros.
 */
type L = { en: string; es: string };

export type TripOriginUi = {
  title: { weekend: string; "city-breaks": string };
  heading: string;
  button: string;
  listLabel: string;
  listHeading: string;
  listLine: string;
  rest: string;
  air: string;
  train: string;
  home: string;
  footLabel: string;
  footHeading: string;
  all: string;
  dates: string;
  byKind: string;
  from: string;
  hoursSummary: string;
  hoursBody: string;
};

export const TRIP_ORIGIN_UI: Record<"en" | "es", TripOriginUi> = {
  en: {
    title: { weekend: "Weekend trips from {city} for two: 3 days to a week", "city-breaks": "City breaks from {city} for two: 3 days to a week" },
    heading: "{count} trips from {city}, nearest first",
    button: "See the trips",
    listLabel: "Nearest first",
    listHeading: "The six closest",
    listLine: "Hours are an estimate; a train is named where a direct one runs.",
    rest: "The other {rest} trips",
    air: "About {time} in the air",
    train: "A train works",
    home: "Starts where you are",
    footLabel: "More trips",
    footHeading: "Leaving from somewhere else?",
    all: "All {count} trips",
    dates: "Date ideas in {city}",
    byKind: "By kind",
    from: "Leaving from",
    hoursSummary: "How we count the hours",
    hoursBody:
      "The time is the straight line between the two airports at a jet’s cruising speed, plus about 35 minutes for taking off and landing, rounded to five minutes. It is flying time only: a change of planes adds to it. We name a train only where a direct one runs in about five hours or less. There are no fares here because we sell no flights; each trip’s page opens the search on the sites you already use.",
  },
  es: {
    title: { weekend: "Escapadas desde {city} en pareja, de 3 a 7 días", "city-breaks": "Escapadas urbanas desde {city} y viajes más largos" },
    heading: "{count} viajes desde {city}, por cercanía",
    button: "Ver los viajes",
    listLabel: "Por cercanía",
    listHeading: "Los seis más cercanos",
    listLine: "Las horas son aproximadas; solo nombramos el tren si hay uno directo.",
    rest: "Los otros {rest} viajes",
    air: "{time} de vuelo, aprox.",
    train: "Se llega en tren",
    home: "Empieza donde estáis",
    footLabel: "Más viajes",
    footHeading: "¿Salís de otra ciudad?",
    all: "Los {count} viajes",
    dates: "Ideas para una cita en {city}",
    byKind: "Por tipo",
    from: "Desde",
    hoursSummary: "Cómo contamos las horas",
    hoursBody:
      "El tiempo es la línea recta entre los dos aeropuertos a la velocidad de crucero de un avión, más unos 35 minutos de despegue y aterrizaje, redondeado a cinco minutos. Es solo tiempo de vuelo: una escala lo alarga. Nombramos el tren solo donde hay uno directo de unas cinco horas o menos. Aquí no hay precios porque no vendemos vuelos; la página de cada viaje abre la búsqueda en las webs que ya usáis.",
  },
};

export const TRIP_ORIGIN_COPY: Record<string, { hero: string; line: L; sentence: L; description: L }> = {
  london: {
    description: {
      en: "From London, three of the twelve trips for two start with a train: Paris, Amsterdam and the Highlands. Iceland and Santorini are 3 and 4 hours away by air.",
      es: "Desde Londres, tres de los doce viajes en pareja empiezan en tren: París, Ámsterdam y las Highlands. Islandia y Santorini quedan a 3 y 4 horas de vuelo.",
    },
    hero: "iceland-south-coast",
    line: { en: "Three of the twelve start at a London station, not an airport.", es: "Tres de los doce empiezan en una estación de Londres, no en un aeropuerto." },
    sentence: {
      en: "Paris and Amsterdam fit a long weekend by Eurostar, and the Highlands trip begins off a train to Edinburgh. Iceland and Santorini are the long flights, three and four hours.",
      es: "París y Ámsterdam, en Eurostar, caben en un puente; las Highlands empiezan al bajar del tren en Edimburgo. Islandia y Santorini son los vuelos largos: tres y cuatro horas.",
    },
  },
  edinburgh: {
    description: {
      en: "The Highlands road trip starts in Edinburgh. Amsterdam is the nearest city break, 1 h 25 in the air; Santorini, at 4 h 30, is the farthest of twelve trips.",
      es: "Las Highlands en coche empiezan en Edimburgo. Ámsterdam es la escapada urbana más cercana, a 1 h 25 de vuelo; Santorini, a 4 h 30, la más lejana de doce.",
    },
    hero: "scottish-highlands",
    line: { en: "The Highlands trip starts here: a night in the Old Town, then the car north.", es: "Aquí empiezan las Highlands: una noche en la ciudad vieja y luego, en coche, al norte." },
    sentence: {
      en: "Amsterdam, an hour and twenty-five away, is the nearest city break. Lisbon is a three-day trip too, but over three hours in the air, so give it a longer weekend.",
      es: "Ámsterdam, a una hora y veinticinco, es la escapada urbana más cercana. Lisboa también son tres días, pero a más de tres horas de vuelo: mejor con un puente.",
    },
  },
  dublin: {
    description: {
      en: "No train leaves the island, so every trip from Dublin starts with a flight: the Highlands in an hour, Lisbon in 2 h 40, and ten more planned day by day.",
      es: "Ningún tren sale de la isla: desde Dublín, cada viaje empieza con un vuelo. Las Highlands a una hora, Lisboa a 2 h 40 y diez más, planeados día a día.",
    },
    hero: "lisbon-slow-weekend",
    line: { en: "The nearest trip is no city break: the Highlands road trip, an hour’s flight.", es: "El viaje más cercano no es urbano: las Highlands en coche, a una hora de vuelo." },
    sentence: {
      en: "With no train off the island, all twelve begin at the airport. Of the four city breaks, Lisbon is the farthest, at two hours forty.",
      es: "Sin tren que salga de la isla, los doce empiezan en el aeropuerto. De las cuatro escapadas urbanas, Lisboa es la más lejana: dos horas y cuarenta.",
    },
  },
  paris: {
    description: {
      en: "Four days in the east of Paris need no ticket, and Amsterdam is a direct train away. The ten other trips for two are 3 h 35 in the air at most.",
      es: "Cuatro días por el este de París sin billete, y Ámsterdam a un tren directo. Los otros diez viajes en pareja quedan, como mucho, a 3 h 35 de vuelo.",
    },
    hero: "paris-without-cliches",
    line: { en: "One of the twelve needs no ticket at all: four days in the east of Paris.", es: "Para uno de los doce no hace falta billete: cuatro días por el este de París." },
    sentence: {
      en: "A direct train reaches Amsterdam, so its trip needs no airport either. Even Santorini, the farthest of the twelve, is three hours thirty-five in the air.",
      es: "A Ámsterdam se llega en tren directo, así que tampoco hace falta aeropuerto. Hasta Santorini, el más lejano de los doce, está a tres horas y 35 minutos de vuelo.",
    },
  },
  amsterdam: {
    description: {
      en: "Amsterdam by bike starts at your door, and Paris is a direct train away. Copenhagen and Edinburgh are 1 h 25 in the air; Santorini, the farthest, 3 h 40.",
      es: "Ámsterdam en bici empieza en vuestra puerta y París queda a un tren directo. Copenhague y Edimburgo, a 1 h 25 de vuelo; Santorini, la más lejana, a 3 h 40.",
    },
    hero: "amsterdam-by-bike",
    line: { en: "Your own city is one of the twelve: three days on two bikes, out to Durgerdam.", es: "Vuestra ciudad es uno de los doce: tres días en bici, hasta Durgerdam." },
    sentence: {
      en: "Paris needs only a direct train: four days by the Canal Saint-Martin. Both Copenhagen and Edinburgh are an hour twenty-five in the air, and Santorini three hours forty.",
      es: "París está a un tren directo: cuatro días junto al Canal Saint-Martin. En avión, Copenhague y Edimburgo quedan a una hora y veinticinco, y Santorini a tres horas y cuarenta.",
    },
  },
  berlin: {
    description: {
      en: "Prague to Vienna starts on a direct train from Berlin, and Copenhagen is an hour's flight. Santorini, at 3 h 10, is nearer than Lisbon or the Algarve.",
      es: "De Praga a Viena se empieza con un tren directo desde Berlín, y Copenhague queda a una hora de vuelo. Santorini, a 3 h 10, está más cerca que Lisboa.",
    },
    hero: "santorini-naxos",
    line: { en: "The trip by rail, Prague to Vienna, begins on a direct train from Berlin.", es: "El viaje en tren, de Praga a Viena, empieza en un tren directo desde Berlín." },
    sentence: {
      en: "Copenhagen is an hour in the air, near enough for three days. Santorini, at three hours ten, is nearer than Lisbon or the Algarve.",
      es: "Copenhague queda a una hora de vuelo, lo bastante cerca para tres días. Santorini, a tres horas y diez, está más cerca que Lisboa o el Algarve.",
    },
  },
  riga: {
    description: {
      en: "The Baltic coast road trip starts in Riga's old town. Copenhagen is 1 h 30 away and Prague under two; Lisbon and the Algarve take over 4 h 30 each way.",
      es: "La costa báltica en coche empieza en el casco antiguo de Riga. Copenhague queda a 1 h 30 y Praga a menos de dos; Lisboa y el Algarve, a más de 4 h 30.",
    },
    hero: "baltic-coast",
    line: { en: "The Baltic coast trip begins in Riga’s old town, and no trip costs less a day.", es: "La costa báltica sale del casco antiguo de Riga: los días más baratos de los doce." },
    sentence: {
      en: "The shortest flights are to Copenhagen, an hour and a half, and Prague, under two. Lisbon and the Algarve take more than four and a half hours each way.",
      es: "Los vuelos más cortos son a Copenhague, hora y media, y a Praga, menos de dos. Lisboa y el Algarve pasan de cuatro horas y media por trayecto.",
    },
  },
};

/** Fills `{name}` in a line of these pages. */
export const fill = (text: string, values: Record<string, string | number>): string => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
