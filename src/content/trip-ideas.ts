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
    whySummary: { en: "Fitting one into a weekend", es: "Cómo encajarla en un fin de semana" },
    whyBody: {
      en: "Lisbon, Copenhagen and Amsterdam are two nights, Friday to Sunday; Paris is three, so take the Monday too. On each trip's page the flight search opens on a Friday three weeks out and comes home the day its plan ends. For winter, choose Copenhagen: its best months include December, with Tivoli lit up. The other three are at their best in spring, early summer and September.",
      es: "Lisboa, Copenhague y Ámsterdam son dos noches, de viernes a domingo; París son tres, así que pedid también el lunes. En la página de cada viaje, la búsqueda de vuelos sale un viernes dentro de tres semanas y vuelve el día que acaba el plan. Para el invierno, Copenhague: entre sus mejores meses está diciembre, con el Tivoli iluminado. Las otras tres lucen más en primavera, a principios de verano y en septiembre.",
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
    whySummary: { en: "Collecting the car", es: "Recoger el coche" },
    whyBody: {
      en: "In Naples, Edinburgh and Riga, collect the car the morning you leave the city, not the day you land. In Iceland and the Algarve it waits at the airport you land at. The Baltic coast ends in Tallinn, so its car is a one-way rental that costs a little more; in Tuscany it goes back to Florence airport. In Scotland you drive on the left.",
      es: "En Nápoles, Edimburgo y Riga, recoged el coche la mañana en que salís de la ciudad, no el día que aterrizáis. En Islandia y el Algarve os espera en el aeropuerto de llegada. La costa báltica acaba en Tallin, así que el alquiler es solo de ida y cuesta algo más; en la Toscana se devuelve en el aeropuerto de Florencia. En Escocia se conduce por la izquierda.",
    },
  },
};
