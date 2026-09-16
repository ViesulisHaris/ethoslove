import type { TemplateManifest } from "../types";

export const manifest: TemplateManifest = {
  slug: "jar-of-reasons",
  name: { en: "Jar of Reasons", es: "Frasco de razones" },
  tagline: { en: "A jar of folded notes. Shake one out.", es: "Un frasco de notas dobladas. Agita para sacar una." },
  description: {
    en: "A glass jar stuffed with folded notes, one reason each. They shake the phone (or tap the jar) and a note tumbles out and unfolds. Some notes carry a photo. Keep going until the jar is empty, then your letter waits underneath.",
    es: "Un frasco de cristal lleno de notas dobladas, una razón en cada una. Agitan el teléfono (o tocan el frasco) y una nota sale y se despliega. Algunas llevan una foto. Siguen hasta vaciar el frasco, y debajo espera tu carta.",
  },
  occasions: ["valentines", "anniversary", "mothers-day", "fathers-day"],
  styles: ["playful", "romantic"],
  tier: "premium",
  features: { music: true, video: false, countdown: true, surprise: true, captions: true, photos: { min: 0, max: 20 }, needs: ["deviceMotion"] },
  thumbnail: { poster: "/templates/jar-of-reasons/poster.jpg", webm: "/templates/jar-of-reasons/preview.webm" },
  defaultAccent: "#2F6B4F",
  heavy: false,
  sortOrder: 40,
};
