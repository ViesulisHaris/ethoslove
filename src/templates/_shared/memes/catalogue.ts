/**
 * The meme stickers: photographs cut out as die-cut stickers with a white edge, one WebP each in
 * /public/memes. Every file is replaceable on its own — swap `public/memes/<id>.webp` for another
 * picture of the same shape and nothing else changes. The list deliberately holds no film, game
 * or brand characters.
 */
export type MemeTag = "cat" | "party" | "soft" | "mood" | "rodent" | "dog";
export type MemeId = "angry" | "balloon-cat" | "blush" | "bow-kitten" | "crying-phone" | "crying-tulips" | "ferrets" | "giggle" | "glasses-tulips" | "green-hat-kitten" | "hamster-cake" | "hamster-slice" | "lawyer" | "matcha" | "party-kitten" | "party-yell" | "puppies" | "puppy" | "rat" | "round" | "sad-hamster" | "scream" | "shades" | "shark" | "shark-baby" | "tulips" | "whiskers" | "wink";
export type Meme = { id: MemeId; w: number; h: number; tags: MemeTag[]; name: { en: string; es: string } };

export const MEMES: Record<MemeId, Meme> = {
  "angry": { id: "angry", w: 604, h: 686, tags: ["cat", "mood", "soft"], name: { en: "the furious cat with a bow", es: "la gata furiosa con lazo" } },
  "balloon-cat": { id: "balloon-cat", w: 336, h: 380, tags: ["party", "cat"], name: { en: "the cat with the heart balloon", es: "el gato del globo corazón" } },
  "blush": { id: "blush", w: 658, h: 662, tags: ["cat", "soft"], name: { en: "the blushing kitten", es: "la gatita sonrojada" } },
  "bow-kitten": { id: "bow-kitten", w: 302, h: 526, tags: ["cat", "soft"], name: { en: "the kitten standing up", es: "el gatito de pie" } },
  "crying-phone": { id: "crying-phone", w: 504, h: 356, tags: ["cat", "mood"], name: { en: "the cat crying at its phone", es: "el gato que llora con el móvil" } },
  "crying-tulips": { id: "crying-tulips", w: 342, h: 644, tags: ["cat", "soft", "mood"], name: { en: "the crying kitten with tulips", es: "el gatito que llora con tulipanes" } },
  "ferrets": { id: "ferrets", w: 548, h: 670, tags: ["party"], name: { en: "the ferrets with the cake", es: "los hurones de la tarta" } },
  "giggle": { id: "giggle", w: 548, h: 470, tags: ["cat", "soft", "mood"], name: { en: "the giggling cat", es: "la gata de la risita" } },
  "glasses-tulips": { id: "glasses-tulips", w: 508, h: 472, tags: ["cat", "soft"], name: { en: "the cat with glasses and tulips", es: "la gata de las gafas y los tulipanes" } },
  "green-hat-kitten": { id: "green-hat-kitten", w: 276, h: 698, tags: ["party", "cat"], name: { en: "the kitten in the green hat", es: "el gatito del gorro verde" } },
  "hamster-cake": { id: "hamster-cake", w: 222, h: 364, tags: ["party", "rodent"], name: { en: "the hamster holding a cake", es: "el hámster con la tarta" } },
  "hamster-slice": { id: "hamster-slice", w: 458, h: 380, tags: ["party", "rodent"], name: { en: "the hamster with a slice", es: "el hámster con su trozo" } },
  "lawyer": { id: "lawyer", w: 462, h: 434, tags: ["cat", "mood"], name: { en: "the cat reading the paperwork", es: "el gato que lee el papeleo" } },
  "matcha": { id: "matcha", w: 574, h: 452, tags: ["cat", "soft"], name: { en: "the cat with the matcha", es: "la gata del matcha" } },
  "party-kitten": { id: "party-kitten", w: 476, h: 714, tags: ["party", "cat"], name: { en: "the kitten with cake and flowers", es: "el gatito con tarta y flores" } },
  "party-yell": { id: "party-yell", w: 396, h: 420, tags: ["party", "cat", "mood"], name: { en: "the cat yelling in a party hat", es: "el gato que grita con gorrito" } },
  "puppies": { id: "puppies", w: 434, h: 466, tags: ["party", "dog"], name: { en: "the two puppies", es: "los dos cachorros" } },
  "puppy": { id: "puppy", w: 398, h: 526, tags: ["party", "dog"], name: { en: "the puppy in the blue hat", es: "el cachorro del gorro azul" } },
  "rat": { id: "rat", w: 548, h: 388, tags: ["party", "rodent"], name: { en: "the rat with the party blower", es: "la rata del matasuegras" } },
  "round": { id: "round", w: 430, h: 502, tags: ["cat", "soft"], name: { en: "the very round cat", es: "la gata muy redonda" } },
  "sad-hamster": { id: "sad-hamster", w: 318, h: 472, tags: ["party", "rodent", "mood"], name: { en: "the sad hamster in a party hat", es: "el hámster triste con gorrito" } },
  "scream": { id: "scream", w: 474, h: 550, tags: ["cat", "mood"], name: { en: "the cat screaming in headphones", es: "el gato que grita con cascos" } },
  "shades": { id: "shades", w: 434, h: 390, tags: ["cat", "mood"], name: { en: "the cat in sunglasses", es: "el gato de las gafas de sol" } },
  "shark": { id: "shark", w: 508, h: 662, tags: ["cat", "mood"], name: { en: "the shark cat", es: "el gato tiburón" } },
  "shark-baby": { id: "shark-baby", w: 416, h: 502, tags: ["cat"], name: { en: "the baby shark cat", es: "el gato tiburón bebé" } },
  "tulips": { id: "tulips", w: 674, h: 1324, tags: ["cat", "soft"], name: { en: "the kitten with the bouquet", es: "el gatito del ramo" } },
  "whiskers": { id: "whiskers", w: 598, h: 488, tags: ["cat", "soft"], name: { en: "the cat with pink whiskers", es: "la gata de los bigotes rosas" } },
  "wink": { id: "wink", w: 379, h: 460, tags: ["cat", "soft"], name: { en: "the winking cat", es: "la gata que guiña" } },
};

export const MEME_IDS = Object.keys(MEMES) as MemeId[];
export const memeSrc = (id: MemeId): string => `/memes/${id}.webp`;
export const withTag = (tag: MemeTag): MemeId[] => MEME_IDS.filter((id) => MEMES[id].tags.includes(tag));
