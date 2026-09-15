import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    mood: { label: "The room, once lit", options: { amber: "Amber", maple: "Maple", moss: "Moss" } },
    outside: { label: "Outside the window", options: { leaves: "Falling leaves", snow: "Snow" } },
    drink: { label: "In the mug", options: { cocoa: "Cocoa with marshmallows", tea: "Tea", coffee: "Coffee with a foam heart" } },
    tag: { label: "The candle's tag", help: "Defaults to “for {name}”. Keep it short." },
  },
  es: {
    mood: { label: "La habitación, ya encendida", options: { amber: "Ámbar", maple: "Arce", moss: "Musgo" } },
    outside: { label: "Tras la ventana", options: { leaves: "Hojas cayendo", snow: "Nieve" } },
    drink: { label: "En la taza", options: { cocoa: "Cacao con nubes", tea: "Té", coffee: "Café con un corazón de espuma" } },
    tag: { label: "La etiqueta de la vela", help: "Por defecto: «para {nombre}». Que sea corta." },
  },
};
