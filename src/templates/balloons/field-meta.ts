import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    age: { label: "Their age", help: "Floats over the room as gold foil number balloons. Leave it empty to skip the numbers." },
    palette: { label: "Colours", options: { pastel: "Pastel", sunset: "Sunset", jewel: "Jewel tones", cream: "Cream & gold" } },
    banner: { label: "Bunting", help: "One letter per pennant. Defaults to “happy birthday”." },
    wall: { label: "On the wall", help: "A line in handwriting under the numbers. Defaults to their name." },
  },
  es: {
    age: { label: "Su edad", help: "Flota sobre la habitación en globos de foil dorado con el número. Déjalo vacío para no mostrarlos." },
    palette: { label: "Colores", options: { pastel: "Pastel", sunset: "Atardecer", jewel: "Tonos joya", cream: "Crema y oro" } },
    banner: { label: "Guirnalda", help: "Una letra por banderín. Por defecto: «feliz cumple»." },
    wall: { label: "En la pared", help: "Una línea a mano bajo los números. Por defecto, su nombre." },
  },
};
