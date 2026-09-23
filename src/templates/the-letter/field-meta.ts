import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    sealInitial: { label: "Letter on the wax seal", help: "Defaults to your initial." },
    paper: { label: "Paper", options: { cream: "Cream", white: "White", kraft: "Kraft" } },
    desk: { label: "Desk", options: { walnut: "Walnut wood", linen: "Linen", slate: "Slate" } },
    inkColor: { label: "Ink colour" },
    greeting: { label: "Greeting", help: "Leave empty for “Dear Name,”." },
    signOff: { label: "Sign-off", help: "e.g. “All of it, always,”" },
  },
  es: {
    sealInitial: { label: "Letra del sello de lacre", help: "Por defecto, tu inicial." },
    paper: { label: "Papel", options: { cream: "Crema", white: "Blanco", kraft: "Kraft" } },
    desk: { label: "Escritorio", options: { walnut: "Madera de nogal", linen: "Lino", slate: "Pizarra" } },
    inkColor: { label: "Color de la tinta" },
    greeting: { label: "Saludo", help: "Déjalo vacío para «Hola, Nombre:», o escribe «Querida Clara,» o «Querido Leo,»." },
    signOff: { label: "Despedida", help: "p. ej. «Todo, siempre,»" },
  },
};
