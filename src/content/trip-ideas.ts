import type { TripIdeaKind } from "@/lib/trips/idea-kinds";

/**
 * The words of the pages by kind of trip (`/trips/ideas/<kind>`, lib/trips/idea-kinds.ts).
 * `TRIP_IDEAS_UI` is what both pages say; `TRIP_IDEA_COPY` is each kind's own, with `fits`, the one
 * line of why for each trip on it (by trip id), each read against the trip's stops and plan in
 * lib/trips/presets.ts; each starts its own way, since the card's label above it is the trip's best
 * months, not its kind (the page is that kind) or its days (the line says them). `hero` is the trip whose photograph is in the hero: the last card,
 * never one of the first two, so a phone never shows one photograph twice in a row. `{count}` is the
 * kind's number of trips. Spain Spanish, vosotros.
 */
type L = { en: string; es: string };

export type TripIdeasUi = { listLine: string; footLabel: string; footHeading: string; all: string; from: string };

export const TRIP_IDEAS_UI: Record<"en" | "es", TripIdeasUi> = {
  en: { listLine: "Open one for its plan, its map and its flights.", footLabel: "More trips", footHeading: "Another way to choose", all: "All {count} trips", from: "Leaving from" },
  es: { listLine: "Abrid uno para ver su plan, su mapa y sus vuelos.", footLabel: "Más viajes", footHeading: "Otra forma de elegir", all: "Los {count} viajes", from: "Salimos de" },
};

export type TripIdeaCopy = { nav: L; title: L; description: L; heading: L; line: L; sentence: L; listLabel: L; listHeading: L; whySummary: L; whyBody: L; hero: string; fits: Record<string, L> };

export const TRIP_IDEA_COPY: Record<TripIdeaKind, TripIdeaCopy> = {
  "weekend-getaways": {
    hero: "amsterdam-by-bike",
    nav: { en: "Weekend getaways", es: "Escapadas de fin de semana" },
    title: { en: "Weekend getaways for couples: {count} city breaks in Europe", es: "Escapadas de fin de semana en pareja: {count} ciudades" },
    description: {
      en: "Weekend getaways for couples in Europe: Lisbon, Paris, Copenhagen and Amsterdam in three or four days each, planned day by day, with a map and no car.",
      es: "Escapadas de fin de semana en pareja por Europa: Lisboa, París, Copenhague y Ámsterdam en tres o cuatro días, planeadas día a día, con mapa y sin coche.",
    },
    heading: { en: "Weekend getaways for two", es: "Escapadas de fin de semana para dos" },
    line: { en: "Four city breaks of three or four days each.", es: "Cuatro ciudades, de tres o cuatro días cada una." },
    sentence: { en: "Each fits between a Friday and a Monday, is planned day by day, and needs no car.", es: "Cada una cabe entre un viernes y un lunes, está planeada día a día y no pide coche." },
    listLabel: { en: "Three or four days", es: "Tres o cuatro días" },
    listHeading: { en: "The {count} that fit a weekend", es: "Los {count} que caben en un fin de semana" },
    fits: {
      "lisbon-slow-weekend": { en: "Three days on foot, sleeping in Alfama.", es: "Tres días a pie, durmiendo en Alfama." },
      "paris-without-cliches": { en: "Four days, three nights by the Canal Saint-Martin.", es: "Cuatro días, tres noches junto al Canal Saint-Martin." },
      "copenhagen-hygge": { en: "The harbor by bike, then a day out by train to Humlebæk.", es: "El puerto en bici y un día en tren hasta Humlebæk." },
      "amsterdam-by-bike": { en: "A bed in the Jordaan and two bikes for three days.", es: "Una cama en el Jordaan y dos bicis para tres días." },
    },
    whySummary: { en: "Why only these four", es: "Por qué solo estos cuatro" },
    whyBody: {
      en: "A weekend getaway here is a trip of three or four days, a Friday to a Monday at most. Four of the twelve are that short, and all four are city breaks, so city breaks have no page of their own. The other eight run six or seven days: six road trips, one by train and one across two islands.",
      es: "Aquí una escapada de fin de semana es un viaje de tres o cuatro días, de viernes a lunes como mucho. Cuatro de los doce son así de cortos, y los cuatro son ciudades, así que las escapadas urbanas no tienen página propia. Los otros ocho duran seis o siete días: seis en coche, uno en tren y uno entre dos islas.",
    },
  },
  "road-trips": {
    hero: "algarve-coast",
    nav: { en: "Road trips", es: "Viajes en coche" },
    title: { en: "Road trips for couples in Europe: {count} routes by car", es: "Viajes en coche por Europa en pareja: {count} rutas" },
    description: {
      en: "Six road trips for couples in Europe, six or seven days each: the Amalfi Coast, Tuscany, the Scottish Highlands, Iceland, the Baltic coast and the Algarve.",
      es: "Seis viajes en coche por Europa para dos, de seis o siete días: la costa amalfitana, la Toscana, las Highlands, Islandia, la costa báltica y el Algarve.",
    },
    heading: { en: "Road trips for two", es: "Viajes en coche para dos" },
    line: { en: "Six routes of six or seven days each.", es: "Seis rutas, de seis o siete días cada una." },
    sentence: { en: "Each has its route on a map and every night’s stop named. Car hire is one tap from the trip’s page.", es: "Cada una tiene su ruta en el mapa y cada noche con su parada. El alquiler del coche está a un toque, en la página del viaje." },
    listLabel: { en: "By car", es: "En coche" },
    listHeading: { en: "The {count} road trips", es: "Los {count} viajes en coche" },
    fits: {
      "amalfi-coast": { en: "Naples to Ravello in six days, with the car left in Positano.", es: "Seis días de Nápoles a Ravello, y el coche aparcado en Positano." },
      "tuscany-hill-towns": { en: "Florence, Chianti, Siena and the Val d’Orcia, over six days.", es: "Florencia, el Chianti, Siena y el Val d’Orcia, en seis días." },
      "scottish-highlands": { en: "Edinburgh to Inverness, with two of the five nights on Skye.", es: "De Edimburgo a Inverness, con dos de las cinco noches en Skye." },
      "iceland-south-coast": { en: "Along the south coast for six days, to the glacier lagoon.", es: "Por la costa sur durante seis días, hasta la laguna glaciar." },
      "baltic-coast": { en: "A week from Riga to Tallinn, on the lowest day costs here.", es: "Una semana de Riga a Tallin, con el menor gasto diario." },
      // The plan's line said "west along the coast, from Faro to Sagres": the first day goes east, to Tavira.
      "algarve-coast": { en: "The whole coast, from Tavira in the east to windy Sagres.", es: "Toda la costa, desde Tavira, al este, hasta la ventosa Sagres." },
    },
    whySummary: { en: "Why these six", es: "Por qué estos seis" },
    whyBody: {
      en: "A road trip here is one of the six trips planned around a hire car: you land, collect it, and each night’s stop is a drive from the last. The four city breaks need no car, the Prague to Vienna trip goes by train, and Santorini and Naxos by ferry.",
      es: "Aquí un viaje en coche es uno de los seis planeados con coche de alquiler: aterrizáis, lo recogéis y cada parada queda a un trayecto de la anterior. Las cuatro ciudades no piden coche, el viaje de Praga a Viena va en tren y el de Santorini y Naxos, en ferry.",
    },
  },
};
