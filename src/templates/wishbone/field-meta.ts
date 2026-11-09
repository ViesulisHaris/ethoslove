import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    wish: { label: "Your wish", help: "Up to 120 characters. It comes out with the big half, whoever gets it.", placeholder: "another year at the same table, you stealing the crispy bits" },
    winner: { label: "Who gets the big half", options: { them: "They do (you let them)", me: "You do (sorry)" } },
    look: { label: "The table", options: { gingham: "Red gingham", harvest: "Harvest orange", sage: "Sage linen", candlelit: "Candlelit" } },
  },
  es: {
    wish: { label: "Tu deseo", help: "Hasta 120 caracteres. Sale con la mitad grande, se la lleve quien se la lleve.", placeholder: "otro año en la misma mesa, tú robándome lo más crujiente" },
    winner: { label: "Quién se lleva la mitad grande", options: { them: "La otra persona (la dejas ganar)", me: "Tú (lo siento)" } },
    look: { label: "La mesa", options: { gingham: "Cuadros rojos", harvest: "Naranja otoño", sage: "Lino salvia", candlelit: "A la luz de las velas" } },
  },
};
