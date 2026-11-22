import type { GiftLocale } from "@/lib/gift/schema";

/**
 * The sentence under a gift's name for the gifts whose description cannot give one.
 *
 * A gift's page shows the opening of its description beside the phone, in whole sentences of at
 * most forty words (components/templates/page/lead.ts). Eleven descriptions in each language open
 * on one sentence longer than that (a collage, listed down to its last sticker), and their heroes
 * had a name, an italic line and two buttons, with nothing saying what the gift is (the test of
 * 21 Nov 2026; XOXO, the second best seller, was one). Each row here is that sentence, written
 * from the gift's own description and nothing else, in 12 to 30 words: what they open, and what
 * is inside. The whole description stays in the page's closed block and in its meta description.
 * Be My Boo and Party Animals had a row each until 22 Nov 2026: their taglines are two sentences
 * of 16 to 18 words, and the second now stands under the first as the hero's sentence (lead.ts).
 *
 * A row is only for a language whose description gives no lead: tests/unit/text-budget.test.ts
 * fails a row that is not needed, a hero left without a sentence, and a row out of its length.
 */
export const TEMPLATE_LEADS: Record<string, Partial<Record<GiftLocale, string>>> = {
  coquette: {
    en: "They untie a satin bow and a collage unrolls under their thumb: polaroids between real lilies, your song on a little player, and your letter waiting at the bottom.",
    es: "Desatan un lazo de raso y un collage se despliega bajo su pulgar: polaroids entre lirios de verdad, vuestra canción en un pequeño reproductor y tu carta al final.",
  },
  garden: {
    en: "They push open a gate with their name on it and walk down a page that grows as they scroll, to a greenhouse where your letter is waiting.",
    es: "Abren una verja con su nombre y bajan por una página que crece a su paso, hasta un invernadero donde tu carta espera sobre la mesa.",
  },
  passport: {
    en: "A passport with their name on the cover. Open it and a route draws itself from your city to theirs, and the pages fill with stamps, one per photo.",
    es: "Un pasaporte con su nombre en la portada. Al abrirlo, una ruta se dibuja desde tu ciudad hasta la suya y las páginas se llenan de sellos, uno por foto.",
  },
  picnic: {
    en: "They tap the basket and the lid creaks open. Out come strawberries, pink lemonade, tulips and your photos, and last a folded note with your letter inside.",
  },
  "popup-card": {
    en: "A cut-paper card with their name on the front. It opens like a real one, and a three-tier paper cake rises out of the fold with their age on top.",
    es: "Una tarjeta de papel recortado con su nombre en la portada. Se abre como una de verdad y una tarta de tres pisos se levanta del pliegue con su edad.",
  },
  "recipe-box": {
    en: "The recipe for her, on a card on the kitchen counter. She tilts the phone to pour in each ingredient you wrote, and the card becomes your letter.",
    es: "La receta de ella, en una ficha sobre la encimera. Inclina el móvil para echar cada ingrediente que escribiste, y la ficha se convierte en tu carta.",
  },
  scrapbook: {
    es: "Un álbum que se abre como uno de verdad. Letras recortadas forman el título y tus fotos caen en la página como polaroids que se revelan.",
  },
  sketchbook: {
    en: "A coil-bound sketchbook with their name on the cover. Every page draws itself in ink as they turn to it, and the last page is your letter.",
    es: "Un cuaderno de espiral con su nombre en la portada. Cada página se dibuja sola a tinta cuando la pasan, y la última es tu carta.",
  },
  "sticker-bomb": {
    en: "A blank cutting mat and one instruction: tap anywhere. Stickers land exactly where their finger does, some of them your own photos, some with a label you wrote.",
    es: "Una base de corte vacía y una instrucción: toca donde quieras. Los stickers caen justo donde pone el dedo; algunos son tus fotos, otros llevan una tira escrita por ti.",
  },
  xoxo: {
    en: "An envelope sealed with a lipstick kiss. They open it and scroll down a collage in red, with your photos as polaroids and cut-out letters spelling what you call them.",
    es: "Un sobre sellado con un beso de pintalabios. Lo abren y bajan por un collage en rojo, con tus fotos como polaroids y letras recortadas que deletrean cómo le llamas.",
  },
};

/** The sentence written for a gift's hero in a language, or null where its description gives its own. */
export function templateLead(slug: string, locale: GiftLocale): string | null {
  return (Object.hasOwn(TEMPLATE_LEADS, slug) ? TEMPLATE_LEADS[slug][locale] : null) ?? null;
}
