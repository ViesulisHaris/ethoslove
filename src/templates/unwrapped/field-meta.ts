import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    stats: {
      label: "Your year in numbers",
      help: "One present each, up to eight, 48 characters. Start with the number and it counts up when they open it: “1,284 voice notes”, “3 cities”, “41 nights you stole the blanket”. A line without a number works too.",
      addLabel: "Add a present",
      placeholder: "212 coffees I made you",
    },
    look: { label: "The wrapping paper", options: { red: "Red and green", kraft: "Brown paper", plaid: "Tartan", pink: "Pink" } },
  },
  es: {
    stats: {
      label: "Vuestro año en números",
      help: "Un regalo por línea, hasta ocho, de 48 caracteres. Empieza por el número y subirá al abrirlo: «1.284 audios», «3 ciudades», «41 noches robándome la manta». Una línea sin número también vale.",
      addLabel: "Añadir un regalo",
      placeholder: "212 cafés que te he hecho",
    },
    look: { label: "El papel de regalo", options: { red: "Rojo y verde", kraft: "Papel de estraza", plaid: "Escocés", pink: "Rosa" } },
  },
};
