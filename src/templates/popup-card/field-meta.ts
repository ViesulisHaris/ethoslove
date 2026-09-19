import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    theme: { label: "Paper", options: { vanilla: "Vanilla", midnight: "Midnight", kraft: "Kraft", cherry: "Cherry" } },
    age: { label: "Their age", help: "Goes on the cake's topper, and sets the candles, up to five. Leave it empty for five candles and no topper." },
    banner: { label: "Pennants", help: "One letter per pennant, over the cake. Defaults to “happy birthday”." },
    flames: { label: "Blowing out the candles", options: { auto: "Microphone, swipe as backup", swipe: "Swipe only" } },
  },
  es: {
    theme: { label: "Papel", options: { vanilla: "Vainilla", midnight: "Medianoche", kraft: "Kraft", cherry: "Cereza" } },
    age: { label: "Su edad", help: "Va en el topper de la tarta y marca las velas, hasta cinco. Déjalo vacío para cinco velas y sin topper." },
    banner: { label: "Banderines", help: "Una letra por banderín, sobre la tarta. Por defecto: «feliz cumple»." },
    flames: { label: "Apagar las velas", options: { auto: "Micrófono, deslizar como alternativa", swipe: "Solo deslizar" } },
  },
};
