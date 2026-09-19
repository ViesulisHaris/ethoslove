import type { FieldMeta } from "../types";

export const fieldMeta: Record<"en" | "es", Record<string, FieldMeta>> = {
  en: {
    charge: { label: "The charge", help: "What they stand accused of. It follows “charged with”, so write it like: stealing every hoodie I own." },
    findings: { label: "The findings", help: "One per cat, read out in order. Specific beats sweet: the thing only you know about them. Leave it empty for ours.", addLabel: "Add a finding", placeholder: "you said “five minutes away” from your bed" },
    verdict: { label: "The verdict", options: { guilty: "Guilty", approved: "Approved", certified: "Certified icon", pardoned: "Pardoned" } },
    bench: { label: "The courtroom", options: { oak: "Oak", rose: "Rose", night: "Night court" } },
  },
  es: {
    charge: { label: "El cargo", help: "De qué se le acusa. Va después de «acusada de», así que escríbelo así: robarme todas las sudaderas." },
    findings: { label: "Las conclusiones", help: "Una por gato, leídas en orden. Lo concreto gana a lo cursi: eso que solo tú sabes. Déjalo vacío para usar las nuestras.", addLabel: "Añadir una conclusión", placeholder: "dijiste «llego en cinco minutos» desde la cama" },
    verdict: { label: "El veredicto", options: { guilty: "Culpable", approved: "Visto bueno", certified: "Icono certificado", pardoned: "Indulto" } },
    bench: { label: "La sala", options: { oak: "Roble", rose: "Rosa", night: "Sesión nocturna" } },
  },
};
