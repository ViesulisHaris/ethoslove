/**
 * The halfway finder's own page (/tools/halfway-between-two-cities): the words around the tool. The
 * tool's own words (the town boxes, the answer) are the long-distance room's, in messages (`ldr`).
 * Each answer below is true of src/lib/dates/geo.ts, src/lib/ldr/halfway.ts (TABLE_NAME_KM) and
 * src/lib/places/photon-reverse.ts (LAND_KM): change the tool, change the answer.
 */

export const HALFWAY_TOOL_PATH = "/tools/halfway-between-two-cities";

export type HalfwayToolCopy = {
  title: string;
  description: string;
  label: string;
  h1: string;
  line: string;
  questionsLabel: string;
  questionsHeading: string;
  questionsLine: string;
  faq: { q: string; a: string }[];
  moreLabel: string;
  links: { href: string; text: string }[];
};

export const HALFWAY_TOOL: Record<"en" | "es", HalfwayToolCopy> = {
  en: {
    title: "Halfway Between Two Cities: Meet in the Middle",
    description: "Type two towns and get the city halfway between them, how far each of you travels, and a link to send. Measured along the earth's curve, not a flat map.",
    label: "Halfway finder",
    h1: "Halfway between two cities",
    line: "Two towns in, the city in the middle out, by the earth's curve.",
    questionsLabel: "Questions",
    questionsHeading: "How halfway is worked out",
    questionsLine: "Why it isn't the middle of the map, and what changes by road.",
    faq: [
      {
        q: "How do you find the halfway point between two cities?",
        a: "We take the two towns' coordinates and find the midpoint along the great circle, the shortest path over the earth's surface. Then we name a place there: a big city if one lies close to the middle and about as far from each of you, otherwise the nearest town on OpenStreetMap that is, and tell you how far it is from each of you.",
      },
      {
        q: "Why isn't it the middle of the map?",
        a: "A flat map stretches the north. Between London and Tokyo the flat middle falls in Central Asia, but the shortest route runs over Siberia, so that is where halfway is. Over a short hop the two answers are nearly the same.",
      },
      {
        q: "Is this the halfway point for driving?",
        a: "No. It is the straight-line middle, as a plane flies. By road the fair meeting point can be somewhere else, because roads bend and a motorway is faster than a lane. Use the city we name as a start, then check each drive on a map.",
      },
      {
        q: "What if halfway is in the sea?",
        a: "If nothing on the map lies within 40 km of the middle, we call it open water and tell you how far each of you would travel. On land with no town nearby we say that instead, with a link to the spot on a map.",
      },
    ],
    moreLabel: "More for the distance",
    links: [
      { href: "/long-distance", text: "Long distance: clocks and flights" },
      { href: "/occasions/long-distance", text: "Long-distance gifts" },
      { href: "/tools/how-long-have-we-been-together", text: "Days together counter" },
      { href: "/trips", text: "Trips for two" },
    ],
  },
  es: {
    title: "A medio camino entre dos ciudades: dónde quedar",
    description: "Escribid dos ciudades y sale la que queda a medio camino, cuánto viaja cada uno y un enlace para enviar. Medido sobre la curva de la Tierra, no sobre un mapa plano.",
    label: "Punto medio",
    h1: "A medio camino entre dos ciudades",
    line: "Entran dos ciudades y sale la del medio, siguiendo la curva de la Tierra.",
    questionsLabel: "Preguntas",
    questionsHeading: "Cómo se calcula el punto medio",
    questionsLine: "Por qué no es el centro del mapa y qué cambia por carretera.",
    faq: [
      {
        q: "¿Cómo se calcula el punto medio entre dos ciudades?",
        a: "Tomamos las coordenadas de las dos ciudades y buscamos el punto medio a lo largo del círculo máximo, el camino más corto sobre la superficie de la Tierra. Después nombramos un sitio allí: una gran ciudad si hay una cerca del punto medio y a una distancia parecida de los dos o, si no, el pueblo más cercano en OpenStreetMap que lo cumpla, y os decimos a qué distancia queda de cada uno.",
      },
      {
        q: "¿Por qué no es el centro del mapa?",
        a: "Un mapa plano estira el norte. Entre Londres y Tokio el centro del mapa cae en Asia Central, pero la ruta más corta pasa por Siberia, y ahí está la mitad del camino. En un trayecto corto las dos respuestas casi coinciden.",
      },
      {
        q: "¿Es el punto medio para ir en coche?",
        a: "No. Es la mitad en línea recta, como vuela un avión. Por carretera el punto justo puede estar en otro sitio, porque las carreteras dan vueltas y una autopista corre más que una comarcal. Usad la ciudad que os damos como punto de partida y comprobad cada trayecto en un mapa.",
      },
      {
        q: "¿Y si el punto medio cae en el mar?",
        a: "Si en el mapa no hay nada a menos de 40 km del punto medio, decimos que es mar abierto y lo que recorre cada uno. Si es tierra sin ninguna ciudad cerca, os lo decimos así, con un enlace al punto en un mapa.",
      },
    ],
    moreLabel: "Más para la distancia",
    links: [
      { href: "/long-distance", text: "A distancia: relojes y vuelos" },
      { href: "/occasions/long-distance", text: "Regalos a distancia" },
      { href: "/tools/how-long-have-we-been-together", text: "Contador de días juntos" },
      { href: "/trips", text: "Viajes para dos" },
    ],
  },
};
