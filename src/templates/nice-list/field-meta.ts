import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    verdict: { label: "The verdict", help: "What the stamp says at the bottom of the list.", options: { nice: "Nice", naughty: "Naughty", both: "Naughty and nice" } },
    nice: { label: "The good deeds", help: "Up to four, 50 characters each. Each gets a tick in the nice column.", addLabel: "Add a good deed", placeholder: "warmed my side of the bed first" },
    naughty: { label: "The crimes", help: "Up to four, 50 characters each. Each gets a tick in the naughty column.", addLabel: "Add a crime", placeholder: "stole the blanket, every single night" },
    look: { label: "The room", options: { red: "Candy red", pink: "Sugar pink", blue: "Frost blue", green: "Pine green" } },
  },
  es: {
    verdict: { label: "El veredicto", help: "Lo que dice el sello al final de la lista.", options: { nice: "Sin carbón", naughty: "Carbón", both: "Carbón dulce" } },
    nice: { label: "Las buenas obras", help: "Hasta cuatro, de 50 caracteres. Cada una lleva una marca en la columna buena.", addLabel: "Añadir una buena obra", placeholder: "me calienta su lado de la cama primero" },
    naughty: { label: "Las fechorías", help: "Hasta cuatro, de 50 caracteres. Cada una lleva una marca en la columna mala.", addLabel: "Añadir una fechoría", placeholder: "me roba la manta todas las noches" },
    look: { label: "La habitación", options: { red: "Rojo caramelo", pink: "Rosa azúcar", blue: "Azul escarcha", green: "Verde pino" } },
  },
};
