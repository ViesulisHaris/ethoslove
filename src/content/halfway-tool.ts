/**
 * The halfway finder's own page (/tools/halfway-between-two-cities): the words around the tool. The
 * tool's own words (the town boxes, the answer) are the long-distance room's, in messages (`ldr`).
 * Each answer below is true of src/lib/dates/geo.ts, src/lib/dates/apart.ts and src/lib/ldr/halfway.ts:
 * change the tool, change the answer.
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
    title: "Halfway Between Two Cities: Find Where to Meet in the Middle",
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
        a: "We take the two towns' coordinates and find the midpoint along the great circle, the shortest path over the earth's surface. Then we name the nearest city we know to that point, as long as one lies within 400 km and it is not one of your own two towns, and tell you how far it is from each of you.",
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
        a: "Then we say so, and tell you how far each of you would travel to meet exactly halfway. For a couple an ocean apart, one of you is getting on a plane; the long-distance page has the hours you are both awake.",
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
    title: "A medio camino entre dos ciudades: calculad dónde quedar",
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
        a: "Tomamos las coordenadas de las dos ciudades y buscamos el punto medio a lo largo del círculo máximo, el camino más corto sobre la superficie de la Tierra. Después nombramos la ciudad que conocemos más cercana a ese punto, siempre que haya una a menos de 400 km y no sea una de vuestras dos ciudades, y os decimos a qué distancia queda de cada uno.",
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
        a: "Entonces os lo decimos, junto con lo que tendría que recorrer cada uno para veros justo a la mitad. Para una pareja con un océano de por medio, a uno le toca coger un avión; la página de relaciones a distancia tiene las horas en que estáis los dos despiertos.",
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
