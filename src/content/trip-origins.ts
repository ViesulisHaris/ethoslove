/**
 * The words of the pages by where you leave from (`/trips/from-<city>`, lib/trips/origins.ts).
 * `TRIP_ORIGIN_UI` is what every such page says, with `{city}`, `{count}` (the trips, twelve) and
 * `{rest}` (the trips folded under the first six) filled in. `TRIP_ORIGIN_COPY` is the two sentences
 * true of leaving from one city: `line` the first (the hero's italic line), `sentence` the rest.
 * Each was written from the matcher's own minutes; tests/unit/trip-origins.test.ts (O6) holds the
 * numbers, so a sentence that drifts from the data fails. Fix the sentence, never the test.
 * Hours, never a fare. Spanish adapted, Spain Spanish, the two of them spoken to as vosotros.
 */
type L = { en: string; es: string };

export type TripOriginUi = {
  title: { weekend: string; "city-breaks": string };
  description: string;
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
    title: { weekend: "Weekend trips from {city}, and longer ones, for two", "city-breaks": "City breaks from {city}, and longer trips, for two" },
    description: "{count} trips for two leaving from {city}, nearest first: hours in the air, where a train works and the best months. Each planned day by day.",
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
    description: "{count} viajes para dos saliendo de {city}, del más cercano al más lejano: horas de vuelo, dónde sirve el tren y los mejores meses. Día a día.",
    heading: "{count} viajes desde {city}, por cercanía",
    button: "Ver los viajes",
    listLabel: "Por cercanía",
    listHeading: "Los seis más cercanos",
    listLine: "Las horas son una estimación; el tren sale donde hay uno directo.",
    rest: "Los otros {rest} viajes",
    air: "{time} de vuelo, aprox.",
    train: "Se llega en tren",
    home: "Empieza donde estáis",
    footLabel: "Más viajes",
    footHeading: "¿Salís de otra ciudad?",
    all: "Los {count} viajes",
    dates: "Ideas para una cita en {city}",
    byKind: "Por tipo",
    from: "Salimos de",
    hoursSummary: "Cómo contamos las horas",
    hoursBody:
      "El tiempo es la línea recta entre los dos aeropuertos a la velocidad de crucero de un avión, más unos 35 minutos de despegue y aterrizaje, redondeado a cinco minutos. Es solo tiempo de vuelo: una escala lo alarga. Nombramos el tren solo donde hay uno directo de unas cinco horas o menos. Aquí no hay precios porque no vendemos vuelos; la página de cada viaje abre la búsqueda en las webs que ya usáis.",
  },
};

export const TRIP_ORIGIN_COPY: Record<string, { line: L; sentence: L }> = {
  london: {
    line: { en: "Three of the twelve start with a train from London.", es: "Tres de los doce empiezan con un tren desde Londres." },
    sentence: {
      en: "Paris, Amsterdam and Edinburgh need no airport. Santorini is the long one, about four hours in the air; the rest are three hours or less.",
      es: "París, Ámsterdam y Edimburgo no piden aeropuerto. Santorini es el más lejano, unas cuatro horas de vuelo; el resto, tres horas o menos.",
    },
  },
  edinburgh: {
    line: { en: "The Highlands trip starts in Edinburgh itself, with no flight to find.", es: "El viaje por las Highlands empieza en el propio Edimburgo, sin vuelo que buscar." },
    sentence: {
      en: "Amsterdam, Paris and Copenhagen are under two hours in the air. Lisbon, the Amalfi Coast and the Algarve are just over three, and Santorini four and a half.",
      es: "Ámsterdam, París y Copenhague quedan a menos de dos horas de vuelo. Lisboa, la costa amalfitana y el Algarve, a poco más de tres, y Santorini a cuatro y media.",
    },
  },
  glasgow: {
    line: { en: "The Highlands trip starts in Edinburgh, under an hour away by train.", es: "El viaje por las Highlands empieza en Edimburgo, a menos de una hora en tren." },
    sentence: {
      en: "Amsterdam, Paris and Copenhagen are under two hours in the air. Iceland, at about two hours twenty, is closer than Tuscany or the Baltic coast.",
      es: "Ámsterdam, París y Copenhague quedan a menos de dos horas de vuelo. Islandia, a unas dos horas y veinte, está más cerca que la Toscana o la costa báltica.",
    },
  },
  manchester: {
    line: { en: "Edinburgh, where the Highlands trip starts, is a direct train from Manchester.", es: "A Edimburgo, donde empieza el viaje por las Highlands, hay tren directo desde Mánchester." },
    sentence: {
      en: "Amsterdam and Paris are about an hour and a quarter in the air. Only Santorini is over three hours, at a little more than four.",
      es: "Ámsterdam y París quedan a una hora y cuarto de vuelo, más o menos. Solo Santorini pasa de tres horas: algo más de cuatro.",
    },
  },
  birmingham: {
    line: { en: "Amsterdam and Paris are an hour and a quarter in the air, or less.", es: "Ámsterdam y París quedan a una hora y cuarto de vuelo, o menos." },
    sentence: {
      en: "A direct train reaches Edinburgh, where the Highlands trip starts. Every trip but Santorini is under three hours in the air.",
      es: "A Edimburgo, donde empieza el viaje por las Highlands, hay tren directo. Todos los viajes menos Santorini quedan a menos de tres horas de vuelo.",
    },
  },
  dublin: {
    line: { en: "Edinburgh is an hour in the air, and the Highlands trip starts there.", es: "Edimburgo está a una hora de vuelo, y allí empieza el viaje por las Highlands." },
    sentence: {
      en: "Amsterdam and Paris are about an hour and a half away. No train leaves the island, so none of the twelve starts by rail.",
      es: "Ámsterdam y París quedan a una hora y media, más o menos. De la isla no sale ningún tren, así que ninguno de los doce empieza en tren.",
    },
  },
  paris: {
    line: { en: "One of the twelve is Paris itself, with no travel at all.", es: "Uno de los doce es el propio París, sin viaje ninguno." },
    sentence: {
      en: "Amsterdam is a direct train. Edinburgh, Prague and Florence are about an hour and three quarters in the air, and nothing is over three hours forty.",
      es: "A Ámsterdam hay tren directo. Edimburgo, Praga y Florencia quedan a una hora y tres cuartos de vuelo, y nada pasa de tres horas y cuarenta.",
    },
  },
  amsterdam: {
    line: { en: "One of the twelve is Amsterdam itself, on two bikes.", es: "Uno de los doce es el propio Ámsterdam, en dos bicis." },
    sentence: {
      en: "Paris is a direct train. Copenhagen, Edinburgh and Prague are about an hour and a half in the air; Santorini is the furthest, at three hours forty.",
      es: "A París hay tren directo. Copenhague, Edimburgo y Praga quedan a una hora y media de vuelo; Santorini es el más lejano, a tres horas y cuarenta.",
    },
  },
  berlin: {
    line: { en: "The Prague to Vienna trip starts with a direct train from Berlin.", es: "El viaje de Praga a Viena empieza con un tren directo desde Berlín." },
    sentence: {
      en: "Copenhagen is an hour in the air; Riga, where the Baltic coast trip starts, an hour and forty. Lisbon, the Algarve and Iceland are over three and a half hours.",
      es: "Copenhague queda a una hora de vuelo; Riga, donde empieza la costa báltica, a una hora y cuarenta. Lisboa, el Algarve e Islandia pasan de tres horas y media.",
    },
  },
  riga: {
    line: { en: "The Baltic coast trip starts in Riga, with no flight to find.", es: "El viaje por la costa báltica empieza en Riga, sin vuelo que buscar." },
    sentence: {
      en: "Copenhagen is an hour and a half in the air and Prague under two. Lisbon and the Algarve are the long ones, over four and a half hours.",
      es: "Copenhague queda a hora y media de vuelo y Praga a menos de dos. Lisboa y el Algarve son los lejanos: más de cuatro horas y media.",
    },
  },
};

/** Fills `{name}` in a line of these pages. */
export const fill = (text: string, values: Record<string, string | number>): string => text.replace(/\{(\w+)\}/g, (m, k: string) => (k in values ? String(values[k]) : m));
