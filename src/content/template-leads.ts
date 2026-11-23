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

/**
 * The sentence under a gift's name for the gifts whose description does open on one the hero could
 * take, but that one only sets the scene the italic line over it has already walked into. Under
 * "Watch a pumpkin get carved with their name. Then light the candle." Jack-o'-Lantern's hero said
 * "A pumpkin on a table in a dark room, and a knife." and stopped there, because the sentence where
 * the gift happens is too long to follow it (the user walk of 23 Nov 2026). Each row is written
 * from the gift's own description and nothing else, in 12 to 30 words (the Spanish ones and Dark
 * Romance's nearer twenty: at thirty, "Make this gift" went through the foot of the first screen
 * of a 320 by 568 phone on seven pages), and says what the line
 * above it does not: what comes out, and what is waiting under it. The description keeps its
 * opening in the page's meta description, and the rest of it in the closed block.
 *
 * tests/unit/text-budget.test.ts fails a row for a gift whose description gives no lead (that one
 * belongs above), a row out of its length, and a row that says the description's opening again.
 */
export const SCENE_LEADS: Record<string, Partial<Record<GiftLocale, string>>> = {
  "bat-swarm": {
    en: "Hundreds of bats pour out of the moon to spell their name, a line you choose and a heart. Underneath, your letter, your photos in the moonlight and your song.",
    es: "Cientos salen de la luna y escriben su nombre. Debajo, tu carta, tus fotos y vuestra canción.",
  },
  "dark-romance": {
    en: "The cover swings open onto your photos, your words in cut-out letters and your letter under a wax seal.",
    es: "La tapa se abre sobre tus fotos, tus palabras en letras recortadas y tu carta bajo un sello de lacre.",
  },
  "favorite-person": {
    en: "Their name is written on the tissue. Under it, your photos on polaroids, your song on a player and a bouquet, down to your letter. Every tap doodles a heart.",
    // Shorter than the English: with thirty words the Spanish button began under the first screen of a 320 by 568 phone.
    es: "Debajo, tus fotos en polaroids, vuestra canción y un ramo, hasta tu carta.",
  },
  "jack-o-lantern": {
    en: "The eyes, the nose and the grin drop out piece by piece, and the face glows through the cuts. Underneath, your letter, your photos as candlelit polaroids and your song.",
    es: "Los trozos caen uno a uno y la cara brilla por los cortes. Debajo, tu carta, tus fotos y vuestra canción.",
  },
  picnic: {
    es: "Salen fresas, limonada rosa, tulipanes y vuestras fotos, y al final una nota doblada con tu carta dentro.",
  },
  "spooky-season": {
    en: "A heap of autumn leaves with their name on a kraft tag. A gust clears them, and a scrapbook runs from your photo under the moon down to your letter.",
    // Shorter than the English, for the same small phone.
    es: "Una ráfaga se lleva las hojas y debajo aparece un álbum de Halloween con tus fotos y tu carta.",
  },
};

/** The sentence written over a description's scene-setting opening, or null where the opening stands. */
export function sceneLead(slug: string, locale: GiftLocale): string | null {
  return (Object.hasOwn(SCENE_LEADS, slug) ? SCENE_LEADS[slug][locale] : null) ?? null;
}

/** The sentence written for a gift's hero in a language, or null where its description gives its own. */
export function templateLead(slug: string, locale: GiftLocale): string | null {
  return (Object.hasOwn(TEMPLATE_LEADS, slug) ? TEMPLATE_LEADS[slug][locale] : null) ?? null;
}
