import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    palette: { label: "The night", options: { midnight: "Midnight purple", pumpkin: "Pumpkin orange", witch: "Witch green", candy: "Candy pink" } },
    host: { label: "Who answers the door", options: { ghost: "A small ghost", cat: "A black cat", pumpkin: "The jack-o'-lantern" } },
    doorLine: { label: "What they say at the door", help: "Defaults to “trick or treat?”." },
    sign: { label: "The sign on the door", help: "Defaults to “happy halloween”. Keep it short." },
  },
  es: {
    palette: { label: "La noche", options: { midnight: "Morado medianoche", pumpkin: "Naranja calabaza", witch: "Verde bruja", candy: "Rosa caramelo" } },
    host: { label: "Quién abre la puerta", options: { ghost: "Un fantasmita", cat: "Un gato negro", pumpkin: "La calabaza" } },
    doorLine: { label: "Lo que dicen en la puerta", help: "Por defecto: «¿truco o trato?»." },
    sign: { label: "El cartel de la puerta", help: "Por defecto: «feliz halloween». Que sea corto." },
  },
};
