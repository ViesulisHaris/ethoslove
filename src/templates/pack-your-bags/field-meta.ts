import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    trip: {
      label: "Trip",
      help: "How you're getting there. It decides the board and the ticket.",
      options: { flight: "Plane", road: "Road trip", train: "Train" },
    },
    toCity: {
      label: "Going to",
      help: "The surprise. They only find out on the departures board.",
    },
    fromCity: {
      label: "Leaving from",
      help: "Where the trip starts, usually home.",
    },
    when: {
      label: "Date on the ticket",
      help: "What the ticket says, e.g. Fri 10 Oct. Leave it empty to use the countdown's date.",
    },
    fromCoords: {
      label: "Start coordinates (optional)",
      help: "Only for small towns: paste “lat, lng” from Google Maps, e.g. “56.95, 24.11”.",
    },
    toCoords: {
      label: "Destination coordinates (optional)",
      help: "Same, only if the place isn't found. It's just for the distance on the ticket.",
    },
    stops: {
      label: "Stops on the way",
      help: "For a road trip: the places on the way, in order.",
      addLabel: "Add a stop",
      placeholder: "Siena",
    },
    nights: {
      label: "Nights",
      help: "How long you're going for.",
    },
    clues: {
      label: "The packing list",
      help: "What should they pack? These are the clues. Leave it empty and they get a list that suits the trip.",
      addLabel: "Add a clue",
      placeholder: "sunglasses",
    },
  },
  es: {
    trip: {
      label: "Viaje",
      help: "Cómo vais a ir. De eso dependen el panel y el billete.",
      options: { flight: "Avión", road: "En coche", train: "Tren" },
    },
    toCity: {
      label: "Destino",
      help: "La sorpresa. Solo lo descubre en el panel de salidas.",
    },
    fromCity: {
      label: "Salida",
      help: "Donde empieza el viaje, normalmente en casa.",
    },
    when: {
      label: "Fecha del billete",
      help: "Lo que pone en el billete, p. ej. vie 10 oct. Si lo dejas vacío, se usa la fecha de la cuenta atrás.",
    },
    fromCoords: {
      label: "Coordenadas de salida (opcional)",
      help: "Solo para pueblos pequeños: pega «lat, lng» de Google Maps, p. ej. «56.95, 24.11».",
    },
    toCoords: {
      label: "Coordenadas del destino (opcional)",
      help: "Solo si no encuentra el sitio por su nombre. Sirve para calcular la distancia del billete.",
    },
    stops: {
      label: "Paradas por el camino",
      help: "Para un viaje en coche: los sitios por los que pasáis, en orden.",
      addLabel: "Añadir una parada",
      placeholder: "Siena",
    },
    nights: {
      label: "Noches",
      help: "Cuánto dura la escapada.",
    },
    clues: {
      label: "Qué meter en la maleta",
      help: "¿Qué tiene que llevar? Son las pistas. Si lo dejas vacío, le toca una lista que va con el viaje.",
      addLabel: "Añadir una pista",
      placeholder: "gafas de sol",
    },
  },
};
