import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    look: { label: "The sky", options: { sunset: "Sunset", lilac: "Lilac", night: "Night" } },
    note: { label: "The note under the player", help: "On grid paper, in handwriting. Defaults to “you're my favorite song”." },
    playlist: { label: "The playlist's name", help: "Your photos are its songs, and their captions are the titles. Defaults to “our playlist”." },
  },
  es: {
    look: { label: "El cielo", options: { sunset: "Atardecer", lilac: "Lila", night: "Noche" } },
    note: { label: "La nota bajo el reproductor", help: "En papel cuadriculado, a mano. Por defecto: «eres mi canción favorita»." },
    playlist: { label: "El nombre de la playlist", help: "Tus fotos son sus canciones y sus pies de foto, los títulos. Por defecto: «nuestra playlist»." },
  },
};
