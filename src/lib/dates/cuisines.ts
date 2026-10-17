/**
 * What a place serves, in the reader's language. OpenStreetMap's `cuisine` tag is a list of English
 * words ("coffee_shop", "spanish;fine_dining"), and the raw words stay in the data because the cost
 * guess and the date-night score match on them. This is only for showing them: a known value gets
 * its words in each language, and an unknown one is shown as it is in English and left out in
 * Spanish, where "Cafetería · coffee shop" read as a page half translated.
 *
 * Spanish national cuisines are feminine because "cocina" is understood: "Restaurante · italiana".
 */
const CUISINES: Record<string, { en: string; es: string }> = {
  "coffee shop": { en: "coffee", es: "café" },
  coffee: { en: "coffee", es: "café" },
  tea: { en: "tea", es: "té" },
  "bubble tea": { en: "bubble tea", es: "bubble tea" },
  juice: { en: "juice", es: "zumos" },
  cake: { en: "cake", es: "tartas" },
  "ice cream": { en: "ice cream", es: "helados" },
  "frozen yogurt": { en: "frozen yoghurt", es: "yogur helado" },
  dessert: { en: "desserts", es: "postres" },
  crepe: { en: "crêpes", es: "crepes" },
  waffle: { en: "waffles", es: "gofres" },
  donut: { en: "doughnuts", es: "dónuts" },
  pastry: { en: "pastries", es: "bollería" },
  chocolate: { en: "chocolate", es: "chocolate" },
  breakfast: { en: "breakfast", es: "desayunos" },
  brunch: { en: "brunch", es: "brunch" },
  sandwich: { en: "sandwiches", es: "bocadillos" },
  bagel: { en: "bagels", es: "bagels" },
  pizza: { en: "pizza", es: "pizza" },
  pasta: { en: "pasta", es: "pasta" },
  burger: { en: "burgers", es: "hamburguesas" },
  kebab: { en: "kebab", es: "kebab" },
  chicken: { en: "chicken", es: "pollo" },
  "fish and chips": { en: "fish and chips", es: "fish and chips" },
  seafood: { en: "seafood", es: "marisco" },
  fish: { en: "fish", es: "pescado" },
  "steak house": { en: "steakhouse", es: "asador" },
  grill: { en: "grill", es: "parrilla" },
  barbecue: { en: "barbecue", es: "barbacoa" },
  sushi: { en: "sushi", es: "sushi" },
  ramen: { en: "ramen", es: "ramen" },
  noodle: { en: "noodles", es: "fideos" },
  dumpling: { en: "dumplings", es: "dumplings" },
  tapas: { en: "tapas", es: "tapas" },
  taco: { en: "tacos", es: "tacos" },
  arepa: { en: "arepas", es: "arepas" },
  empanada: { en: "empanadas", es: "empanadas" },
  wine: { en: "wine", es: "vino" },
  fondue: { en: "fondue", es: "fondue" },
  "fine dining": { en: "fine dining", es: "alta cocina" },
  "street food": { en: "street food", es: "comida callejera" },
  regional: { en: "regional", es: "cocina regional" },
  local: { en: "local", es: "cocina local" },
  international: { en: "international", es: "internacional" },
  vegetarian: { en: "vegetarian", es: "vegetariana" },
  vegan: { en: "vegan", es: "vegana" },
  italian: { en: "Italian", es: "italiana" },
  french: { en: "French", es: "francesa" },
  spanish: { en: "Spanish", es: "española" },
  portuguese: { en: "Portuguese", es: "portuguesa" },
  greek: { en: "Greek", es: "griega" },
  mediterranean: { en: "Mediterranean", es: "mediterránea" },
  british: { en: "British", es: "británica" },
  irish: { en: "Irish", es: "irlandesa" },
  german: { en: "German", es: "alemana" },
  austrian: { en: "Austrian", es: "austriaca" },
  belgian: { en: "Belgian", es: "belga" },
  czech: { en: "Czech", es: "checa" },
  polish: { en: "Polish", es: "polaca" },
  hungarian: { en: "Hungarian", es: "húngara" },
  russian: { en: "Russian", es: "rusa" },
  georgian: { en: "Georgian", es: "georgiana" },
  latvian: { en: "Latvian", es: "letona" },
  scandinavian: { en: "Scandinavian", es: "escandinava" },
  basque: { en: "Basque", es: "vasca" },
  catalan: { en: "Catalan", es: "catalana" },
  galician: { en: "Galician", es: "gallega" },
  turkish: { en: "Turkish", es: "turca" },
  lebanese: { en: "Lebanese", es: "libanesa" },
  syrian: { en: "Syrian", es: "siria" },
  israeli: { en: "Israeli", es: "israelí" },
  persian: { en: "Persian", es: "persa" },
  "middle eastern": { en: "Middle Eastern", es: "de Oriente Medio" },
  moroccan: { en: "Moroccan", es: "marroquí" },
  egyptian: { en: "Egyptian", es: "egipcia" },
  ethiopian: { en: "Ethiopian", es: "etíope" },
  african: { en: "African", es: "africana" },
  indian: { en: "Indian", es: "india" },
  pakistani: { en: "Pakistani", es: "pakistaní" },
  nepalese: { en: "Nepalese", es: "nepalí" },
  asian: { en: "Asian", es: "asiática" },
  chinese: { en: "Chinese", es: "china" },
  japanese: { en: "Japanese", es: "japonesa" },
  korean: { en: "Korean", es: "coreana" },
  thai: { en: "Thai", es: "tailandesa" },
  vietnamese: { en: "Vietnamese", es: "vietnamita" },
  malaysian: { en: "Malaysian", es: "malaya" },
  indonesian: { en: "Indonesian", es: "indonesia" },
  filipino: { en: "Filipino", es: "filipina" },
  american: { en: "American", es: "americana" },
  mexican: { en: "Mexican", es: "mexicana" },
  caribbean: { en: "Caribbean", es: "caribeña" },
  cuban: { en: "Cuban", es: "cubana" },
  "latin american": { en: "Latin American", es: "latinoamericana" },
  peruvian: { en: "Peruvian", es: "peruana" },
  colombian: { en: "Colombian", es: "colombiana" },
  venezuelan: { en: "Venezuelan", es: "venezolana" },
  brazilian: { en: "Brazilian", es: "brasileña" },
  argentinian: { en: "Argentinian", es: "argentina" },
  argentine: { en: "Argentinian", es: "argentina" },
};

/** One cuisine value, or null when there is nothing to show in this language. */
export function cuisineLabel(raw: string, locale: "en" | "es"): string | null {
  const key = raw.trim().toLowerCase().replace(/_/g, " ");
  if (!key) return null;
  return CUISINES[key]?.[locale] ?? (locale === "en" ? key : null);
}

/**
 * The words to put after a place's kind: translated, without repeats, and without one that only
 * says the kind again ("Ice cream · ice cream").
 */
export function cuisineWords(cuisine: readonly string[], locale: "en" | "es", kindLabel: string, max = 2): string[] {
  const out: string[] = [];
  const kind = kindLabel.toLowerCase();
  for (const raw of cuisine) {
    const word = cuisineLabel(raw, locale);
    if (!word || word.toLowerCase() === kind || out.some((w) => w.toLowerCase() === word.toLowerCase())) continue;
    out.push(word);
    if (out.length >= max) break;
  }
  return out;
}
