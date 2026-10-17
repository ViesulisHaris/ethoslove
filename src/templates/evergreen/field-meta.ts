import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The green", options: { sage: "Sage", olive: "Olive", mint: "Mint" } },
    title: { label: "The words across the top", help: "Written over the record and the old newspaper. Defaults to “my evergreen”." },
  },
  es: {
    look: { label: "El verde", options: { sage: "Salvia", olive: "Oliva", mint: "Menta" } },
    title: { label: "Las palabras de arriba", help: "Escritas sobre el disco y el periódico viejo. Por defecto: «siempre tú»." },
  },
};
