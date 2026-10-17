import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    birthday: { label: "It's their birthday", help: "The title wishes them happy birthday, and so does the camera when it turns on." },
    headline: { label: "The cut-out title", help: "Letters cut out of magazines, above the camera. Leave it empty for “happy birthday”, or their name when it isn't their birthday." },
    body: { label: "Its colour", options: { pink: "Baby pink", silver: "Silver", lilac: "Lilac", black: "Black" } },
    stamp: { label: "Date stamp", help: "The orange date in the corner of every photo, the way cameras printed it in 2006." },
    stampDate: { label: "The date on the photos", help: "Leave it empty for the day of your countdown, or the day they open it." },
  },
  es: {
    birthday: { label: "Es su cumpleaños", help: "El título le desea feliz cumpleaños, y la cámara también al encenderse." },
    headline: { label: "El título recortado", help: "Letras recortadas de revistas, encima de la cámara. Déjalo vacío para «feliz cumple», o su nombre si no es su cumpleaños." },
    body: { label: "Su color", options: { pink: "Rosa bebé", silver: "Plata", lilac: "Lila", black: "Negra" } },
    stamp: { label: "Fecha en las fotos", help: "La fecha naranja en la esquina de cada foto, como la imprimían las cámaras en 2006." },
    stampDate: { label: "La fecha de las fotos", help: "Déjala vacía para el día de tu cuenta atrás, o el día que la abra." },
  },
};
