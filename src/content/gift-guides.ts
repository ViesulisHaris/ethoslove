import type { Occasion } from "@/config/occasions";
import { noteForEveryone, sendsFree } from "@/lib/gift/free-tier";
import type { GiftLocale } from "@/lib/gift/schema";
import { DEMO_PHOTOS, type DemoPhotoId } from "@/templates/_shared/demo-photos";
import { listManifests } from "@/templates/manifests";
import type { BorrowedLine } from "@/components/marketing/gift-idea-list";

/**
 * The gift pages by kind: /gifts/last-minute, /gifts/photo-album and the rest. They sit beside the
 * /gifts/for-* pages (content/recipients.ts) and answer searches no other page does: a format
 * ("interactive birthday card", "anniversary website") or a situation ("last-minute"). The occasion
 * pages keep the ideas for a day, the template pages keep each template's own search, and these
 * never repeat either: docs/blog/TOPIC-GROUPS.md, rule 5, one search, one page.
 *
 * Every idea is a template, and carries a line to borrow that fits the field it names: the page
 * prints that field's limit from the template's schema (lib/gift/field-limit.ts) and
 * tests/unit/gift-guides.test.ts fails a line that is too long for it. What a template does was
 * checked against its schema.ts and Template.tsx on 20 Nov 2026 (the five pages added on 24 Nov 2026 were
 * checked that day, and the care package's printed card against components/dashboard/print-card.tsx); what is free matches
 * lib/gift/free-tier.ts in both states of its switch (NOTE below: a short note on The Letter and
 * nothing more with the note for everyone, The Letter and Constellations whole without it). No price is written here: the
 * pages that need one read it from PRODUCTS.
 */
export const GIFT_GUIDE_SLUGS = [
  "last-minute",
  "video-message",
  "interactive-birthday-card",
  "virtual-birthday-cake",
  "photo-album",
  "anniversary-website",
  "apology-for-him",
  "apology-for-her",
  "long-distance-care-package",
  "surprise",
  "memory-book",
  "christmas-ecards",
] as const;
export type GiftGuideSlug = (typeof GIFT_GUIDE_SLUGS)[number];

/**
 * The pages by kind that the closing rows of /digital-cards and the pages by person show: the first six. The five
 * added on 24 Nov 2026 (apology, care package, surprise, memory book) are linked from /gifts, their occasions and
 * each other; named in these rows too, they pushed /digital-cards past 300 words and the last section's lily onto
 * the questions' heading on the pages by person.
 */
export const GUIDES_IN_CLOSING_ROWS: readonly GiftGuideSlug[] = GIFT_GUIDE_SLUGS.slice(0, 6);

export function isGiftGuide(slug: string): slug is GiftGuideSlug {
  return (GIFT_GUIDE_SLUGS as readonly string[]).includes(slug);
}

/**
 * The photo in the polaroid that lies on the phone of each page's band. Every page had the first
 * sample photo of its lead gift there, which is the same two photos on seven pages: a pair of hands
 * and a coffee cup beside "So the candles go out" (the test of 23 Nov 2026). They are the samples
 * every demo shares (templates/_shared/demo-photos.ts), one to a page, chosen for what the page is
 * about: the night train for a gift made late, the tent under the stars for a place worth filming,
 * the puppy on the picnic rug for the card with animals in it, the cake for the cake, the dated
 * print of two bicycles for an album, the two of them walking for an anniversary. /digital-cards has
 * the eighth (content/digital-cards.ts).
 *
 * There are eight sample photos and, since the growth build's second round of gift pages (24 Nov
 * 2026), twelve pages with a band: so a band is told apart by its photo and the cover in its phone
 * together (GUIDE_BAND_COVERS). The first six pages and /digital-cards keep a photo each, and no two
 * bands show the same photo beside the same cover: tests/unit/spread-budget.test.ts holds both.
 */
export const GUIDE_BAND_PHOTOS: Record<GiftGuideSlug, DemoPhotoId> = {
  "last-minute": "p6",
  "video-message": "p5",
  "interactive-birthday-card": "p4",
  "virtual-birthday-cake": "p3",
  "photo-album": "p7",
  "anniversary-website": "p2",
  "apology-for-him": "p6",
  "apology-for-her": "p8",
  "long-distance-care-package": "p5",
  surprise: "p3",
  "memory-book": "p7",
  "christmas-ecards": "p4",
};

/**
 * The gift whose cover lies in the screen of the band's phone, where it is not The Letter's (the
 * default of ExperienceFlatlay): with a photo, the pair that tells one band from another.
 */
export const GUIDE_BAND_COVERS: Partial<Record<GiftGuideSlug, string>> = {
  "apology-for-him": "the-council",
  "apology-for-her": "bouquet",
  "long-distance-care-package": "passport",
  surprise: "midnight-countdown",
  "memory-book": "text-thread",
  "christmas-ecards": "frosted-window",
};

/** That photo, as a picture on the page takes it. */
export function guideBandPhoto(slug: GiftGuideSlug): { src: string; width: number; height: number } {
  const photo = DEMO_PHOTOS[GUIDE_BAND_PHOTOS[slug]];
  return { src: photo.url, width: photo.width, height: photo.height };
}

/**
 * The pages by kind an occasion page points to: the format pages that sit next to that day's ideas
 * (a birthday's cards and cakes, an anniversary's page and album). Each of those pages links back.
 */
export const GUIDES_FOR_OCCASION: Partial<Record<Occasion, GiftGuideSlug[]>> = {
  birthday: ["interactive-birthday-card", "virtual-birthday-cake", "last-minute", "surprise"],
  anniversary: ["anniversary-website", "photo-album", "memory-book"],
  "long-distance": ["video-message", "long-distance-care-package"],
  apology: ["apology-for-him", "apology-for-her"],
  christmas: ["christmas-ecards"],
};

/**
 * One idea: a template, what it is on this page, and a line to borrow. On the page it is a picture
 * card (components/marketing/spread): the template's poster and `heading`, which is the card's
 * title and so at most nine words. Opened, the card shows one line (`brief`, or where there is
 * none the opening sentence of `body`) and the line to borrow in handwriting. `body` is the idea
 * in full, with every fact that was checked against the template; the card's line is drawn from it.
 */
export type GiftGuideIdea = { template: string; heading: string; brief?: string; body: string; line: BorrowedLine };

export type GiftGuide = {
  /** The search result's headline, before " · Ethos". */
  title: string;
  description: string;
  /** The page's h1: the words people type. */
  h1: string;
  /** What the link to this page says elsewhere on the site. */
  label: string;
  /** The hero, beside the phone: one italic line, and one sentence of at most thirty words. */
  hero: { line: string; sentence: string };
  /** The heading over the cards. */
  ideasTitle: string;
  /** The heading of the deeper band, over the page's three how-tos: what those three are about on this page. */
  craft: string;
  /** The gift whose film plays in the hero's phone, where it is not the first idea's. */
  film?: string;
  /** The opening, in two paragraphs: what this is, then what it honestly isn't or costs. On the page it is the closed block under the questions. */
  lead: [string, string];
  ideas: GiftGuideIdea[];
  sections: { heading: string; body: string }[];
  faq: { q: string; a: string }[];
  /** The pages that answer the narrower searches, and the neighbours, with what each link says. */
  related: { href: string; label: string }[];
};

/** Whether the free Letter is the short note (the live site) or, without the switch, the whole letter with ten photos. Fixed at build time. */
const NOTE = noteForEveryone();

/** The templates that go out free, by name and read from the manifests: "The Letter and Constellations" while the note is not for everyone. */
function freeNames(locale: GiftLocale): string {
  const names = listManifests()
    .filter((m) => sendsFree(m))
    .map((m) => m.name[locale]);
  return names.length > 1 ? `${names.slice(0, -1).join(", ")} ${locale === "es" ? "y" : "and"} ${names.at(-1)}` : names.join("");
}

const freeEn = {
  q: "Is any of this free?",
  a: NOTE
    ? "One thing is: The Letter as a short note, up to 500 characters with a song, a countdown and a hidden surprise. Photos, a longer letter, video, voice and every other template are a one-time payment for that template, with no subscription. The editor is free until you publish, so you can build the whole gift and watch it play first."
    : `Yes: ${freeNames("en")}, with up to ten photos, a song, a countdown and a hidden surprise. Video, voice, more photos and every other template are a one-time payment for that template, with no subscription. The editor is free until you publish, so you can build the whole gift and watch it play first.`,
};
const freeEs = {
  q: "¿Hay algo gratis?",
  a: NOTE
    ? "Una cosa: La carta como nota corta, hasta 500 caracteres con una canción, una cuenta atrás y una sorpresa final. Las fotos, una carta más larga, el vídeo, la voz y las demás plantillas son un solo pago por esa plantilla, sin suscripción. El editor es gratis hasta que publicas, así que puedes montar el regalo entero y verlo funcionar antes."
    : `Sí: ${freeNames("es")}, con hasta diez fotos, una canción, una cuenta atrás y una sorpresa final. El vídeo, la voz, más fotos y las demás plantillas son un solo pago por esa plantilla, sin suscripción. El editor es gratis hasta que publicas, así que puedes montar el regalo entero y verlo funcionar antes.`,
};
const keepEn = {
  q: "Will the link stop working?",
  a: "No. Links are meant to be permanent, so it opens again next year. If you spot a typo after sending, edit it from My gifts and the change appears at the same link.",
};
const keepEs = {
  q: "¿El enlace deja de funcionar?",
  a: "No. Los enlaces están pensados para durar, así que se vuelve a abrir el año que viene. Si ves una errata después de enviarlo, edítalo desde Mis regalos y el cambio sale en el mismo enlace.",
};

export const GIFT_GUIDES: Record<GiftGuideSlug, Record<GiftLocale, GiftGuide>> = {
  "last-minute": {
    en: {
      title: "Last-Minute Gifts You Can Make and Send Today",
      description: "Left it until today? Eight digital gifts you can make in about ten minutes and send as a link, each with a line to borrow and the quickest way to fill it in.",
      h1: "Last-minute gifts you can send today",
      label: "Last-minute gifts",
      hero: {
        line: "Nothing ships. The only deadline is how fast you type.",
        sentence: "Each of these digital gifts is made on your phone, published the moment you finish and sent as a link.",
      },
      ideasTitle: "Eight that look planned",
      craft: "Late, without looking late",
      film: "bouquet",
      lead: [
        "Nothing ships, so the only deadline is how fast you type. Every gift here is made on your phone, published the moment you finish and sent as a link in the chat you already have open. Ten minutes is a fair estimate for most of them, and the quickest takes five.",
        `The risk with a late gift is that it looks late. So each idea below is the one that looks most planned for the least typing, with a line you can use as it stands. ${NOTE ? "One is free: The Letter, as a short note of up to 500 characters." : "One is free: The Letter."} The rest are paid once, when you publish, and you can build the whole thing first to see whether it is worth it.`,
      ],
      ideas: [
        {
          template: "the-letter",
          heading: "The five-minute one: a note under a wax seal",
          body: `Two names and ${NOTE ? "up to 500 characters" : "a few lines"}: that is all the free version asks for. They break the seal with a tap and your words write themselves out in handwriting, with a song if you add one. No photos to hunt for. ${NOTE ? "Five hundred characters is" : "A few lines are"} room for one specific memory and one promise. A late note needs both.`,
          line: { field: "freeNote", where: "The whole note", text: "My plan for today fell apart, so here is the part that mattered. You make ordinary days better than I make plans. Dinner is on me and you pick the place." },
        },
        {
          template: "midnight-countdown",
          heading: "Late becomes early: set it for midnight",
          body: "If the day is tomorrow, you are ahead of schedule. Send the link tonight: it shows a clock running down under a darkening sky and opens by itself at the moment you set, in their time zone, with fireworks. Beyond the names and your message it needs only one photo and the moment to open. Nobody who gets a gift at 00:00 thinks it was made at 21:40.",
          line: { field: "zeroLine", where: "The line that appears with the fireworks", text: "It’s officially your day. I got here first." },
        },
        {
          template: "bouquet",
          heading: "Flowers, without the delivery slot",
          body: "Same-day flower delivery has a cut-off, and you have probably passed it. This bouquet has none: choose the flowers and their colors, up to 24 stems, shuffle the arrangement until it looks right, and write the little card. They watch it come together one flower at a time. Photos are optional: you can finish it without leaving the editor.",
          line: { field: "cardNote", where: "On the card in the bouquet", text: "Late, but I picked every one." },
        },
        {
          template: "scratch-card",
          heading: "Turn an IOU into a reveal",
          brief: "Tell them what is coming, and make finding out the fun part.",
          body: "The honest fix for a present that won’t arrive in time: tell them what is coming, and make finding out the fun part. Each card hides a photo and its caption under foil they rub off with a finger; the last one carries the news in big letters. One photo is enough and three is better. Name the day and the hour on that last card: a late present with a date on it reads as a plan.",
          line: { field: "finalTitle", where: "The headline on the last card", text: "Saturday, 8pm. Wear the green one. It’s booked." },
        },
        {
          template: "fortune-cookie",
          heading: "Three fortunes and you are done",
          body: "It asks for three fortunes of up to 140 characters and no photos at all. They crack each cookie with a tap and a slip slides out with what you wrote and their lucky numbers. Make the numbers a date that matters to you both. If you have twenty minutes instead of ten, it holds up to twenty fortunes.",
          line: { field: "fortunes", where: "One of the fortunes", text: "You will forgive someone who left this to the last minute." },
        },
        {
          template: "text-thread",
          heading: "Send it the way you meant to: as texts",
          brief: "Your messages arrive one bubble at a time, ending on the paragraph you would never send cold.",
          body: "You were going to text them anyway. This is that, staged: your messages arrive one bubble at a time with the typing dots, and the last one is the paragraph you would never send cold. Two bubbles is the minimum and forty the limit. Being late can be the opening joke, as long as the last bubbles mean it.",
          line: { field: "lines", where: "The first bubble", text: "ok confession: I started this an hour ago" },
        },
        {
          template: "the-council",
          heading: "A hearing, a gavel and a rubber stamp",
          body: "Funny covers for rushed better than sweet does. A bench of cats holds a hearing about the person you are giving it to: you set the charge, write a finding for each cat to read out, and choose the stamp that comes down at the end: guilty, approved, certified or pardoned. Photos go in as exhibits and are optional. Your letter is the full ruling.",
          line: { field: "charge", where: "The charge", text: "being impossible to shop for, again" },
        },
        {
          template: "birthday-cinema",
          heading: "For a birthday: a cake they can blow out",
          body: "For the birthday you remembered at lunch. Their name goes up in lights, a cake waits with one candle per year up to twelve, and they put them out by blowing into the phone or swiping. It needs the two names, one photo and your message, and their age if you want the candles to match. Add a second photo if you have ten more seconds.",
          line: { field: "marquee", where: "On the marquee", text: "SAM AT 30: THE DIRECTOR’S CUT" },
        },
      ],
      sections: [
        {
          heading: "Make it look planned",
          body: "Three things give a rushed gift away: a message that could be for anyone, no photo, and an excuse in the first line. Fix them in that order. Write one thing only you would know. Use one photo with a story over five without. And if you mention the hour you made it, do it as a joke near the end, never as the opening.",
        },
        {
          heading: "The ten-minute order",
          body: "Names first, then the message, then one photo, then the song. Skip everything optional on the first pass and publish. A gift can be edited after it is sent, and the changes appear at the same link: the typo you find in the taxi is fixable. Sending it is one paste.",
        },
        {
          heading: "If the day has already gone",
          body: "Belated works when you say so plainly, once, with no excuse attached. “A day late, and I know it” as the first line of a short note does more than a paragraph of reasons. Then send it at a normal hour: a gift that lands at 02:00 the night after reads as panic.",
        },
      ],
      faq: [
        {
          q: "What is the fastest digital gift to make?",
          a: `${NOTE ? "The Letter as a short note: two names and up to 500 characters" : "The Letter: two names and a few lines"}, with a song if you want one. It is free and takes about five minutes. Of the paid ones, Fortune Cookie asks for three fortunes and Bouquet needs no photos at all.`,
        },
        {
          q: "Can I send it today?",
          a: "Yes. It is published the moment you finish and you get a link straight away: paste it into WhatsApp, iMessage or an email. Nothing is posted and there is no delivery window.",
        },
        {
          q: "Can I make it open at a set time?",
          a: "On a paid template, yes. In the editor, under Extras, switch on “Schedule the reveal” and choose the date, the hour and their time zone. Then send the link early: until that moment it shows a countdown.",
        },
        freeEn,
      ],
      related: [
        { href: "/blog/last-minute-birthday-gift-for-boyfriend", label: "Last-minute birthday gifts for a boyfriend" },
        { href: "/blog/last-minute-christmas-gift-for-girlfriend", label: "Last-minute Christmas gifts for a girlfriend" },
        { href: "/occasions/birthday", label: "Birthday gift ideas" },
        { href: "/occasions/apology", label: "Saying sorry properly" },
      ],
    },
    es: {
      title: "Regalos de última hora para hacer y enviar hoy",
      description: "¿Se te ha echado el día encima? Ocho regalos digitales que se hacen en unos diez minutos y se envían en un enlace, cada uno con una frase lista para usar.",
      h1: "Regalos de última hora para enviar hoy",
      label: "De última hora",
      hero: {
        line: "Aquí no hay envío. El único plazo es lo rápido que escribas.",
        sentence: "Cada uno de estos regalos digitales se hace desde el móvil, se publica en cuanto terminas y se manda en un enlace.",
      },
      ideasTitle: "Ocho que parecen preparados",
      craft: "Tarde, sin que se note",
      film: "bouquet",
      lead: [
        "Aquí no hay envío, así que el único plazo es lo rápido que escribas. Todos estos regalos se hacen desde el móvil, se publican en cuanto terminas y se mandan en un enlace por el chat que ya tienes abierto. Cuenta unos diez minutos para casi todos; el más rápido sale en cinco.",
        `El riesgo de un regalo tardío es que se note. Por eso cada idea es la que más preparada parece con menos texto, con una frase que puedes usar tal cual. ${NOTE ? "Una es gratis: La carta, como nota corta de hasta 500 caracteres." : "Una es gratis: La carta."} Las demás se pagan una sola vez, al publicar, y antes puedes montarlo entero para ver si te convence.`,
      ],
      ideas: [
        {
          template: "the-letter",
          heading: "La de cinco minutos: una nota con lacre",
          body: `Dos nombres y ${NOTE ? "hasta 500 caracteres" : "unas líneas"}: eso es todo lo que pide la versión gratis. Rompen el sello con un toque y tus palabras se escriben a mano sobre el papel, con una canción si quieres. Sin fotos que buscar. ${NOTE ? "Quinientos caracteres dan" : "Unas líneas dan"} para un recuerdo concreto y una promesa. A una nota tardía le hacen falta las dos cosas.`,
          line: { field: "freeNote", where: "La nota entera", text: "Mi plan para hoy se ha torcido, así que aquí va la parte que importaba. Haces mejores los días normales que yo los planes. La cena la pago yo y el sitio lo eliges tú." },
        },
        {
          template: "midnight-countdown",
          heading: "Llega el primero: prográmalo para medianoche",
          body: "Si el día es mañana, vas con tiempo de sobra. Manda el enlace esta noche: muestra una cuenta atrás bajo un cielo que oscurece y se abre solo en el momento que elijas, en su zona horaria, con fuegos artificiales. Aparte de los nombres y tu mensaje, solo pide una foto y el momento de abrirse. Nadie que reciba un regalo a las 00:00 piensa que se hizo a las 21:40.",
          line: { field: "zeroLine", where: "La frase que sale con los fuegos", text: "Ya es tu día, oficialmente. He llegado antes que nadie." },
        },
        {
          template: "bouquet",
          heading: "Flores, sin franja de reparto",
          body: "El reparto de flores en el mismo día tiene hora límite, y seguramente ya ha pasado. Este ramo no la tiene: eliges las flores y sus colores, hasta 24 tallos, mezclas la composición hasta que quede bien y escribes la tarjetita. Lo ven formarse flor a flor. Las fotos son opcionales: lo terminas sin salir del editor.",
          line: { field: "cardNote", where: "En la tarjeta del ramo", text: "Tarde, pero elegidas una a una" },
        },
        {
          template: "scratch-card",
          heading: "Convierte un «te debo una» en una sorpresa",
          brief: "Cuenta lo que viene y haz que descubrirlo sea lo divertido.",
          body: "El arreglo sincero para un regalo que no llega a tiempo: cuenta lo que viene y haz que descubrirlo sea lo divertido. Cada tarjeta esconde una foto y su pie bajo una capa metalizada que se rasca con el dedo; la última lleva la noticia en letras grandes. Con una foto basta y con tres queda mejor. Pon el día y la hora en esa última tarjeta: un regalo que llega tarde, pero con fecha, se lee como un plan.",
          line: { field: "finalTitle", where: "El titular de la última tarjeta", text: "Sábado, 21:00. Ponte el verde. Ya está reservado." },
        },
        {
          template: "fortune-cookie",
          heading: "Tres fortunas y listo",
          body: "Pide tres fortunas de hasta 140 caracteres y ninguna foto. Cada galleta se parte con un toque y sale una tira de papel con lo que escribiste y sus números de la suerte. Que los números sean una fecha que os importe a los dos. Si tienes veinte minutos en vez de diez, caben hasta veinte fortunas.",
          line: { field: "fortunes", where: "Una de las fortunas", text: "Perdonarás a quien dejó esto para el último minuto." },
        },
        {
          template: "text-thread",
          heading: "Mándalo como ibas a mandarlo: por mensajes",
          brief: "Tus mensajes llegan burbuja a burbuja, y el último es el párrafo que nunca mandarías en frío.",
          body: "Ibas a escribirle de todas formas. Esto es lo mismo, con puesta en escena: tus mensajes llegan burbuja a burbuja con los puntitos de «escribiendo», y el último es el párrafo que nunca mandarías en frío. El mínimo son dos burbujas y el máximo, cuarenta. Llegar tarde puede ser la broma del principio, siempre que las últimas burbujas vayan en serio.",
          line: { field: "lines", where: "La primera burbuja", text: "vale, confieso: he empezado esto hace una hora" },
        },
        {
          template: "the-council",
          heading: "Una vista, un mazo y un sello de goma",
          body: "Lo gracioso disimula la prisa mejor que lo tierno. Un tribunal de gatos celebra una vista sobre la persona a la que se lo regalas: tú pones la acusación, escribes una conclusión para que la lea cada gato y eliges el sello que cae al final: culpable, visto bueno, certificado o indulto. Las fotos entran como pruebas y son opcionales. Tu carta es la sentencia completa.",
          line: { field: "charge", where: "El cargo", text: "ser imposible de regalar, un año más" },
        },
        {
          template: "birthday-cinema",
          heading: "Si es un cumpleaños: una tarta que se sopla",
          body: "Para el cumpleaños del que te has acordado a la hora de comer. Su nombre sale en luces, espera una tarta con una vela por año hasta doce, y las apaga soplando al móvil o deslizando el dedo. Pide los dos nombres, una foto y tu mensaje, y su edad si quieres que las velas coincidan. Añade una segunda foto si te sobran diez segundos.",
          line: { field: "marquee", where: "En la marquesina", text: "ÁLEX A LOS 30: VERSIÓN DEL DIRECTOR" },
        },
      ],
      sections: [
        {
          heading: "Que parezca preparado",
          body: "Tres cosas delatan un regalo hecho con prisa: un mensaje que valdría para cualquiera, ninguna foto y una excusa en la primera línea. Arréglalas en ese orden. Escribe algo que solo tú sepas. Mejor una foto con historia que cinco sin ella. Y si mencionas a qué hora lo hiciste, que sea como broma hacia el final, nunca al abrir.",
        },
        {
          heading: "El orden de los diez minutos",
          body: "Primero los nombres, luego el mensaje, después una foto y al final la canción. En la primera pasada sáltate todo lo opcional y publica. Un regalo se puede editar cuando ya está enviado y los cambios salen en el mismo enlace: la errata que veas en el taxi tiene arreglo. Enviarlo es pegar una vez.",
        },
        {
          heading: "Si el día ya ha pasado",
          body: "Felicitar con retraso funciona cuando lo dices claro, una vez y sin excusa. «Un día tarde, y lo sé» como primera línea de una nota corta hace más que un párrafo de motivos. Y mándalo a una hora normal: un regalo que llega a las dos de la madrugada de la noche siguiente suena a pánico.",
        },
      ],
      faq: [
        {
          q: "¿Cuál es el regalo digital más rápido de hacer?",
          a: `${NOTE ? "La carta como nota corta: dos nombres y hasta 500 caracteres" : "La carta: dos nombres y unas líneas"}, con una canción si quieres. Es gratis y lleva unos cinco minutos. De los de pago, Galleta de la fortuna pide tres fortunas y Ramo no necesita ninguna foto.`,
        },
        {
          q: "¿Puedo enviarlo hoy mismo?",
          a: "Sí. Se publica en cuanto terminas y te da un enlace al momento: pégalo en WhatsApp, iMessage o un correo. No viaja ningún paquete y no hay franja de entrega.",
        },
        {
          q: "¿Puedo hacer que se abra a una hora concreta?",
          a: "En una plantilla de pago, sí. En el editor, en Extras, activa «Programar la apertura» y elige el día, la hora y su zona horaria. Luego manda el enlace antes: hasta ese momento muestra una cuenta atrás.",
        },
        freeEs,
      ],
      related: [
        { href: "/blog/last-minute-birthday-gift-for-boyfriend", label: "Regalo de cumpleaños de última hora para tu novio" },
        { href: "/blog/last-minute-christmas-gift-for-girlfriend", label: "Regalo de Navidad de última hora para tu novia" },
        { href: "/occasions/birthday", label: "Ideas de regalo de cumpleaños" },
        { href: "/occasions/apology", label: "Pedir perdón como es debido" },
      ],
    },
  },

  "video-message": {
    en: {
      title: "Video Birthday Cards and Video Gifts: Your Clip in a Card",
      description: "Put a birthday video message inside a card: five digital gifts that take a video clip and two that take your voice, the 50 MB limit, and what to film.",
      h1: "Video message gifts",
      label: "Video message gifts",
      hero: {
        line: "Your clip, with an opening and a place of its own.",
        sentence: "Five gifts on Ethos take a video clip, one clip per gift: an MP4 or MOV file of up to 50 MB.",
      },
      ideasTitle: "Five for a clip, two for your voice",
      craft: "A clip worth keeping",
      film: "birthday-cinema",
      lead: [
        "A video sent in a chat is watched once, between two other messages. Put the same clip inside a gift and it has an opening, a place of its own and a letter beside it. Five templates on Ethos take a video clip, one clip per gift: an MP4 or MOV file of up to 50 MB. The editor’s own advice is to keep it under a minute.",
        "Two things to know before you film. The clip starts muted when they scroll to it and one tap turns the sound on, so don’t put the important sentence in the first second. And video is a paid feature: it comes with any premium template, and on The Letter with “Make it special”. The last two ideas use a voice message, which every template takes once it is unlocked, and which is easier if you hate being on camera.",
      ],
      ideas: [
        {
          template: "birthday-cinema",
          heading: "The people who couldn’t be there, after the candles",
          brief: "Once the candles are out, the clip is the first thing on the screen.",
          body: "Once the candles are out and the confetti has fired, the clip is the first thing on the screen, framed above a film strip of your photos. It suits a group: ask five people for five seconds of “happy birthday” each and join them in your phone’s video editor. Five seconds each keeps the file far under the limit, and nobody rambles.",
          line: { field: "marquee", where: "On the marquee", text: "ONE NIGHT ONLY: MAYA TURNS 25" },
        },
        {
          template: "museum",
          heading: "A dark screening room after the last photo",
          brief: "The clip gets a dark room to itself after the last photo, just before your message.",
          body: "Each photo hangs framed in a room of its own with a plaque, and the clip gets a room to itself after the last photo, just before your message: dark walls and the video on the far one, like the film room in an exhibition. Use it for what a photo can’t hold: the dog greeting them, the street you grew up on, a table of people shouting the same thing. It takes two to twenty photos.",
          line: { field: "exhibition", where: "The exhibition title", text: "The Ana Retrospective: ten years, mostly laughing" },
        },
        {
          template: "our-timeline",
          heading: "The newest stop on the road, moving",
          brief: "The clip comes after the closing line, so it reads as the latest entry.",
          body: "A road draws itself down the page and pins a dated photo at every milestone, two at least and twenty at most. The clip comes after the closing line, so it reads as the latest entry: the years in photographs, then the two of you moving and talking. Film it this week, on purpose, and say the date out loud.",
          line: { field: "ending", where: "The closing line, just above the clip", text: "And this is us last week. Still ridiculous." },
        },
        {
          template: "garden",
          heading: "Under the letter, in the greenhouse",
          brief: "The clip waits at the far end of the walk, in the greenhouse, under your letter.",
          body: "The page is a garden walk, and the clip is at the far end of it: past the seedlings, the meadow and the trellis with your photos, inside the greenhouse, in a frame right under your letter. A slow pan works better here than a talking head: their real garden, the pots on the balcony, the walk you take together.",
          line: { field: "tag", where: "The tag tied to the bouquet at the end", text: "Cut from the garden you taught me to keep" },
        },
        {
          template: "the-letter",
          heading: "A letter with you in it",
          brief: "The letter writes itself out, and the clip arrives last on a postcard of its own.",
          body: "The envelope opens, the letter writes itself out, the photos drop as polaroids, and the clip arrives last on a postcard of its own. Write the letter as the reasons and keep the video for the part that is better heard: a promise, an apology, the song you can’t sing. On The Letter, video comes with “Make it special”.",
          line: { field: "signOff", where: "The sign-off", text: "Now play the video. I practiced." },
        },
        {
          template: "vinyl",
          heading: "No camera: your voice after the last track",
          body: "The needle goes down and the record plays while your photos flip past as album covers. When it is over, your voice message is waiting on the last screen: up to a minute, recorded in the editor on your own phone. Say where you first heard the song and why it is theirs. Twenty seconds of that is enough.",
          line: { field: "album", where: "The album title on the record label", text: "Songs I Can’t Hear Without You" },
        },
        {
          template: "halfway",
          heading: "For long distance: the plane lands, then you speak",
          body: "When someone is far away, hearing you is what they are short of. One breath into the phone sends a paper plane across a map from your town to theirs, the kilometres counting down, until the postcard flips to your letter. On the last screen: up to a minute of you talking. Record it somewhere quiet, in one take.",
          line: { field: "halfwayNote", where: "The line that pops up at the middle", text: "Halfway is somewhere over the sea. I checked. Still too far." },
        },
      ],
      sections: [
        {
          heading: "What to film",
          body: "Choose one of three: a message to camera, several people saying one line each, or a place. One idea per clip. Stand facing a window, and say their name in the first sentence but the important thing a little later, after they have tapped for sound. Thirty seconds feels long while you film it and short while they watch it.",
        },
        {
          heading: "Film it sideways",
          body: "In Museum, Birthday Cinema, Our Timeline and The Letter the clip plays in a wide frame, the shape of a television, and a video shot upright is cropped to fit it. Turn the phone on its side before you record. The still they see before it plays is taken about half a second into the clip, so be in the frame and looking up by then.",
        },
        {
          heading: "Voice, if video is too much",
          body: "A voice message is a minute at most and plays on the last screen of the gift, after everything else. You record it in the editor, on any template you have unlocked, and can re-record until it is right. Don’t read it out from a script, because it always sounds read. Jot down three words, press record and talk to one person.",
        },
      ],
      faq: [
        {
          q: "How long can the video be?",
          a: "There is no time limit, only a size limit: one clip of up to 50 MB, as an MP4 or MOV. The editor suggests keeping it under a minute. If your clip is too big, trim it, or film it again at a lower resolution.",
        },
        {
          q: "Does the video play with sound?",
          a: "It starts muted when they scroll to it, because that is the only way a browser lets a video start by itself. One tap turns the sound on. It loops until they move on.",
        },
        {
          q: "Which gifts can take a video?",
          a: "Five: The Letter, Birthday Cinema, The Garden, Our Timeline and Museum, one clip each. Every template takes a voice message of up to a minute once it is unlocked, and these five can carry both.",
        },
        {
          q: "What else does the gift need besides the clip?",
          a: "Their name, yours and a message, plus at least one photo: two for Our Timeline and Museum. The clip is an addition to the gift: a video can’t be sent with nothing around it.",
        },
        freeEn,
      ],
      related: [
        { href: "/occasions/birthday", label: "Birthday gift ideas" },
        { href: "/occasions/long-distance", label: "Gifts for long distance" },
        { href: "/gifts/photo-album", label: "Interactive photo albums" },
        { href: "/digital-cards", label: "What a digital card is" },
      ],
    },
    es: {
      title: "Regalos con vídeo: tu clip dentro de una tarjeta",
      description: "Mete un mensaje de vídeo de cumpleaños en una tarjeta: cinco regalos digitales que llevan un vídeo y dos que llevan tu voz, el límite de 50 MB y qué grabar.",
      h1: "Regalos con mensaje en vídeo",
      label: "Con mensaje en vídeo",
      hero: {
        line: "Tu clip, con una apertura y un sitio propio.",
        sentence: "En Ethos hay cinco regalos que llevan vídeo, un clip por regalo: un archivo MP4 o MOV de hasta 50 MB.",
      },
      ideasTitle: "Cinco para un clip, dos para tu voz",
      craft: "Un clip que merezca guardarse",
      film: "birthday-cinema",
      lead: [
        "Un vídeo mandado por el chat se ve una vez, entre otros dos mensajes. Mete ese mismo clip en un regalo y tiene una apertura, un sitio propio y una carta al lado. En Ethos hay cinco plantillas que llevan vídeo, un clip por regalo: un archivo MP4 o MOV de hasta 50 MB. El propio editor aconseja que no pase de un minuto.",
        "Dos cosas antes de grabar. El clip empieza sin sonido cuando llegan a él y el sonido se activa con un toque, así que no pongas la frase importante en el primer segundo. Y el vídeo es de pago: viene con cualquier plantilla premium, y en La carta con «Hazlo especial». Las dos últimas ideas usan un mensaje de voz, que admite cualquier plantilla una vez desbloqueada y que es más fácil si no soportas verte en cámara.",
      ],
      ideas: [
        {
          template: "birthday-cinema",
          heading: "Los que no pudieron ir, después de las velas",
          brief: "Cuando se apagan las velas, el clip es lo primero que aparece.",
          body: "Cuando se apagan las velas y salta el confeti, el clip es lo primero que aparece, enmarcado sobre una tira de película con tus fotos. Va muy bien en grupo: pide a cinco personas cinco segundos de «feliz cumpleaños» cada una y únelos en el editor de vídeo del móvil. Con cinco segundos por cabeza el archivo queda muy por debajo del límite, y nadie se enrolla.",
          line: { field: "marquee", where: "En la marquesina", text: "ÚNICA FUNCIÓN: MAYA CUMPLE 25" },
        },
        {
          template: "museum",
          heading: "Una sala de proyección tras la última foto",
          brief: "El clip tiene una sala oscura para él solo tras la última foto, justo antes de tu mensaje.",
          body: "Cada foto cuelga enmarcada en su propia sala, con su cartela, y el clip tiene una para él solo después de la última foto, justo antes de tu mensaje: paredes oscuras y el vídeo en la del fondo, como la sala de proyección de una exposición. Úsalo para lo que una foto no puede guardar: el perro saliendo a recibirle, la calle donde creciste, una mesa entera gritando lo mismo. Admite de dos a veinte fotos.",
          line: { field: "exhibition", where: "El título de la exposición", text: "Retrospectiva Ana: diez años, casi todos riéndonos" },
        },
        {
          template: "our-timeline",
          heading: "La última parada del camino, en movimiento",
          brief: "El clip va después de la frase final, así que se lee como la entrada más reciente.",
          body: "Un camino se dibuja página abajo y clava una foto con su fecha en cada hito, dos como mínimo y veinte como máximo. El clip va después de la frase final, así que se lee como la entrada más reciente: los años en fotos y, luego, vosotros moviéndoos y hablando. Grábalo esta semana, a propósito, y di la fecha en voz alta.",
          line: { field: "ending", where: "La frase final, justo encima del clip", text: "Y esto somos nosotros la semana pasada. Igual de ridículos." },
        },
        {
          template: "garden",
          heading: "Bajo la carta, en el invernadero",
          brief: "El clip espera al fondo del paseo, en el invernadero, justo debajo de tu carta.",
          body: "La página es un paseo por un jardín, y el clip está al fondo: pasados los brotes, el prado y la celosía con tus fotos, dentro del invernadero, en un marco justo debajo de tu carta. Aquí funciona mejor un plano lento que una cara hablando: su jardín de verdad, las macetas del balcón, el paseo que dais siempre.",
          line: { field: "tag", where: "La etiqueta atada al ramo del final", text: "Cortado del jardín que me enseñaste a cuidar" },
        },
        {
          template: "the-letter",
          heading: "Una carta contigo dentro",
          brief: "La carta se va escribiendo y el clip llega al final, en una postal propia.",
          body: "El sobre se abre, la carta se va escribiendo, las fotos caen como polaroids y el clip llega al final, en una postal propia. Escribe en la carta los motivos y guarda el vídeo para lo que se entiende mejor oído: una promesa, una disculpa, la canción que no sabes cantar. En La carta, el vídeo viene con «Hazlo especial».",
          line: { field: "signOff", where: "La despedida", text: "Ahora dale al vídeo. He ensayado." },
        },
        {
          template: "vinyl",
          heading: "Sin cámara: tu voz después de la última canción",
          body: "Bajan la aguja y el disco suena mientras tus fotos pasan como portadas. Cuando termina, tu mensaje de voz espera en la última pantalla: hasta un minuto, grabado en el editor con tu propio móvil. Cuenta dónde oíste la canción por primera vez y por qué es suya. Con veinte segundos de eso basta.",
          line: { field: "album", where: "El título del disco, en su etiqueta", text: "Canciones que no puedo oír sin ti" },
        },
        {
          template: "halfway",
          heading: "Para la distancia: aterriza el avión y hablas tú",
          body: "Cuando alguien está lejos, lo que le falta es oírte. Sopla al móvil y un avión de papel cruza con su aliento un mapa desde tu ciudad hasta la suya, con los kilómetros bajando, hasta que la postal se da la vuelta y aparece tu carta. En la última pantalla, hasta un minuto de ti hablando. Grábalo en un sitio tranquilo y de una sola toma.",
          line: { field: "halfwayNote", where: "La frase que aparece al pasar la mitad", text: "La mitad cae en medio del mar. Lo he mirado. Sigue estando lejos." },
        },
      ],
      sections: [
        {
          heading: "Qué grabar",
          body: "Elige una de tres: un mensaje a cámara, varias personas diciendo una frase cada una, o un lugar. Una idea por clip. Ponte de cara a una ventana y di su nombre en la primera frase, pero lo importante un poco después, cuando ya haya tocado para oírlo. Treinta segundos parecen muchos mientras grabas y pocos mientras se ven.",
        },
        {
          heading: "Grábalo en horizontal",
          body: "En Museo, Cine de cumpleaños, Nuestra línea del tiempo y La carta el clip se ve en un marco ancho, con forma de televisor, y un vídeo grabado en vertical se recorta para caber. Gira el móvil antes de grabar. La imagen fija que se ve antes de que empiece se toma a medio segundo del principio, así que para entonces ya tienes que estar en el plano y mirando.",
        },
        {
          heading: "La voz, si el vídeo te supera",
          body: "Un mensaje de voz dura un minuto como mucho y suena en la última pantalla del regalo, después de todo lo demás. Se graba en el editor, en cualquier plantilla que tengas desbloqueada, y puedes repetirlo hasta que salga. No lo leas de un guion, porque se nota. Apunta tres palabras, dale a grabar y háblale a una sola persona.",
        },
      ],
      faq: [
        {
          q: "¿Cuánto puede durar el vídeo?",
          a: "No hay límite de tiempo, solo de tamaño: un clip de hasta 50 MB, en MP4 o MOV. El editor aconseja que no pase de un minuto. Si el tuyo pesa demasiado, recórtalo o vuelve a grabarlo con menos resolución.",
        },
        {
          q: "¿El vídeo se reproduce con sonido?",
          a: "Empieza sin sonido cuando llegan a él, porque es la única forma en que un navegador deja que un vídeo arranque solo. Con un toque suena. Se repite en bucle hasta que siguen bajando.",
        },
        {
          q: "¿Qué regalos admiten vídeo?",
          a: "Cinco: La carta, Cine de cumpleaños, El jardín, Nuestra línea del tiempo y Museo, con un clip cada uno. Todas las plantillas admiten un mensaje de voz de hasta un minuto una vez desbloqueadas, y estas cinco pueden llevar las dos cosas.",
        },
        {
          q: "¿Qué más necesita el regalo, además del clip?",
          a: "Su nombre, el tuyo y un mensaje, y al menos una foto: dos en Nuestra línea del tiempo y en Museo. El clip es un añadido al regalo: no se puede mandar un vídeo sin nada alrededor.",
        },
        freeEs,
      ],
      related: [
        { href: "/occasions/birthday", label: "Ideas de regalo de cumpleaños" },
        { href: "/occasions/long-distance", label: "Regalos para una relación a distancia" },
        { href: "/gifts/photo-album", label: "Álbumes de fotos interactivos" },
        { href: "/digital-cards", label: "Qué es una tarjeta digital" },
      ],
    },
  },

  "interactive-birthday-card": {
    en: {
      title: "Interactive Birthday Cards They Tap, Pop and Blow Out",
      description: "Eight interactive birthday cards that answer back: candles that go out when they blow, balloons that drop photos, a card that folds open. With a line for each.",
      h1: "Interactive birthday cards",
      label: "Interactive birthday cards",
      hero: {
        line: "They tap, blow or pop, and the card answers.",
        sentence: "An interactive birthday card waits for them to do something: a tap folds a paper card open, a breath puts the candles out.",
      },
      ideasTitle: "Eight cards, by what they do",
      craft: "Choosing between the eight",
      film: "party-animals",
      lead: [
        "An interactive birthday card is one that waits for them to do something. They tap, and a paper card folds open. They blow into the phone, and the candles go out. They pop a balloon, and a photo falls out of it. What they do to the card is the reason they show it to whoever is sitting next to them.",
        "These are the eight on Ethos made for a birthday, sorted by what the person does. Every one takes your photos and a message of your own, and all but Arcade take a song. Each is paid once, when you publish. This page is about the cards themselves. What to write in one, and when to send it, is on the birthday ideas page linked at the foot.",
      ],
      ideas: [
        {
          template: "popup-card",
          heading: "They open it: a paper card with a cake",
          body: "The closest thing to a card from a shop, until it moves. One tap and it folds open on a table: a three-tier paper cake rises out of the crease with their age on the topper, and balloons and pennants stand up behind it. They tap each candle to light it, up to five, then blow into the phone or swipe up. Your letter is inside the lid, in handwriting.",
          line: { field: "banner", where: "On the pennants over the cake", text: "older, still louder" },
        },
        {
          template: "birthday-cinema",
          heading: "They blow: a few candles go out each time",
          brief: "A real breath puts the candles out a few at a time. A swipe works too.",
          body: "Curtains part on a marquee with their name in lights, then a cake with one candle for each year up to twelve. Past twelve it is six candles and the age as a number on top. A tap on “Use microphone” and a real breath puts them out a few at a time, the way breath does. Anyone who would rather not allow the microphone swipes up instead. Then confetti, and a film strip of your photos.",
          line: { field: "marquee", where: "On the marquee", text: "A LIFE IN PICTURES, STARRING NORA" },
        },
        {
          template: "balloons",
          heading: "They pop: every balloon drops a photo",
          body: "A ceiling of balloons with their age floating in gold foil numbers. Each balloon they pop drops one of your photos to the floor as a polaroid with its caption, up to eight, and the biggest, popped last, is holding your letter. Mix the years: one from school, one from last weekend, and the one they once begged you to delete.",
          line: { field: "wall", where: "In handwriting on the wall, under the numbers", text: "the best one in any room" },
        },
        {
          template: "party-animals",
          heading: "They tap: ten guests who heckle on cue",
          brief: "Ten animals in party hats each jump and yell a line of yours when tapped.",
          body: "An invitation that opens into a long birthday collage: their age in foil balloons, your photos in polaroids, and ten animals in party hats who each jump and yell a line of yours when tapped. A tap anywhere else pops confetti under the finger. Further down there is a cake with their age in number candles, to tap or to blow out.",
          line: { field: "shouts", where: "One of the ten lines the animals yell", text: "you don’t look a day over the last one" },
        },
        {
          template: "sketchbook",
          heading: "They turn the page: a card that draws itself",
          body: "A coil-bound sketchbook with their name on the cover. Each page inks itself in as they turn to it: a cake with candles, their age circled twice, a party hat, arrows and hearts, with watercolor bleeding in behind the lines. Your photos are taped between the doodles, up to twelve, and the last page is your letter. It is the quiet one of the eight.",
          line: { field: "title", where: "The hand-lettered line over the cake", text: "another lap, well done" },
        },
        {
          template: "digicam",
          heading: "They press the shutter: a camera from 2006",
          body: "A pocket camera lies on a collage with happy birthday cut out of magazines above it. They press power, the lens whirs out, and your photos are on the roll with an orange date stamp in the corner and your captions in pixel type. Every press of the shutter fires the flash and moves to the next photo; after the last, the camera prints the whole roll as a strip.",
          line: { field: "caption", where: "A photo caption, on the camera’s screen", text: "IMG_0412: you, pretending not to pose" },
        },
        {
          template: "midnight-countdown",
          heading: "They wait: a card that opens at midnight",
          brief: "Send it early: it shows a clock counting down, and opens with fireworks at zero.",
          body: "The only one that makes them wait. Send it early and it shows a clock counting down under a sky going from dusk to night. At zero, in the time zone you chose, fireworks go off and it opens on your photos and your message. Of the eight it does the least when touched and the most when timed right.",
          line: { field: "headline", where: "Headline above the timer", text: "Until you’re officially older than me again" },
        },
        {
          template: "arcade",
          heading: "They play: a tiny game that rains cake",
          body: "A retro arcade game where the things that fall can be slices of cake. They drag a basket to catch them; every level cleared reveals one of your photos, up to eight, and the last one reveals your message. Eight catches a level is the default, and you can lower it to three for someone who would rather get to the photos.",
          line: { field: "title", where: "The game’s title", text: "NORA VS. THE BIG 3-0" },
        },
      ],
      sections: [
        {
          heading: "How the blowing works",
          body: "Three of these listen for breath: Birthday Cinema, Pop-up Card and Party Animals. The card asks for the microphone with a button, only when the cake is on screen, and listens for about half a second of steady rushing air. Nothing is recorded or sent anywhere. If they say no, or the phone can’t, a swipe or a tap puts the candles out, and on the first two you can switch the microphone off altogether in the editor.",
        },
        {
          heading: "Pick by the person",
          body: "Someone who cries at cards: Pop-up Card or Sketchbook. Someone who would be mortified by that: Party Animals. A birthday you will miss in person: Birthday Cinema, because blowing out candles alone on a phone is sweeter than it sounds. A partner in another time zone: Midnight Countdown, set to their midnight and sent the evening before.",
        },
        {
          heading: "Paper and screen together",
          body: "Every card comes with a QR code you can print. Put it inside a paper card, on the cake box or with the present, and the phone camera opens it with nothing to install. At a dinner, hand over your own phone with the card open and let the table watch them blow.",
        },
      ],
      faq: [
        {
          q: "What is an interactive birthday card?",
          a: "A birthday card that opens on a phone and answers the person holding it: it folds open on a tap, the candles go out when they blow, a balloon pops and drops a photo. On Ethos you add their name, your photos and your message, plus a song on all but Arcade, and send it as a link or a printed QR code.",
        },
        {
          q: "Do they need an app to open it?",
          a: "No. It opens in the browser from a link or a QR code, on iPhone and Android. The microphone is asked for with a button, only for the candles, and saying no still works with a swipe.",
        },
        {
          q: "Can the card arrive at midnight?",
          a: "Yes, on any of these eight. In the editor, under Extras, switch on “Schedule the reveal” and set the date, the hour and their time zone. Send the link whenever you like: until then it shows a countdown, and at 00:00 it opens.",
        },
        {
          q: "Is one of these birthday cards free?",
          a: `Not these eight. Each is a one-time payment for that card, with no subscription, and the editor is free until you publish: build it and watch it first. ${NOTE ? "The free gift on Ethos is The Letter, as a short note of up to 500 characters with a song. It works for a birthday. It has no candles." : `The free gifts on Ethos are ${freeNames("en")}, with up to ten photos and a song. They work for a birthday. They have no candles.`}`,
        },
        keepEn,
      ],
      related: [
        { href: "/occasions/birthday", label: "Birthday gift ideas: what to write and when to send" },
        { href: "/gifts/virtual-birthday-cake", label: "Virtual birthday cakes" },
        { href: "/blog/what-to-write-in-boyfriends-birthday-card", label: "What to write in a boyfriend’s birthday card" },
        { href: "/gifts/last-minute", label: "Last-minute gifts" },
      ],
    },
    es: {
      title: "Tarjetas de cumpleaños interactivas: toca y sopla",
      description: "Ocho tarjetas de cumpleaños interactivas: velas que se apagan al soplar, globos que sueltan fotos, una tarjeta que se despliega. Con una frase para cada una.",
      h1: "Tarjetas de cumpleaños interactivas",
      label: "Tarjetas de cumpleaños interactivas",
      hero: {
        line: "Tocan, soplan o explotan un globo, y la tarjeta responde.",
        sentence: "Una tarjeta de cumpleaños interactiva espera a que hagan algo: un toque despliega una tarjeta de papel, un soplido apaga las velas.",
      },
      ideasTitle: "Ocho tarjetas, según lo que hacen",
      craft: "Cómo elegir entre las ocho",
      film: "party-animals",
      lead: [
        "Una tarjeta de cumpleaños interactiva es la que espera a que hagan algo. Tocan, y una tarjeta de papel se despliega. Soplan al móvil, y las velas se apagan. Explotan un globo, y cae una foto. Lo que le hacen a la tarjeta es el motivo por el que se la enseñan a quien tengan al lado.",
        "Estas son las ocho de Ethos hechas para un cumpleaños, ordenadas por lo que hace quien la recibe. Todas llevan tus fotos y un mensaje tuyo, y todas menos Arcade, una canción. Cada una se paga una sola vez, al publicar. Esta página va de las tarjetas. Qué escribir en ellas y cuándo enviarlas está en la página de ideas de cumpleaños, enlazada al final.",
      ],
      ideas: [
        {
          template: "popup-card",
          heading: "La abren: una tarjeta de papel con su tarta",
          body: "Lo más parecido a una tarjeta de papelería, hasta que se mueve. Un toque y se despliega sobre una mesa: una tarta de papel de tres pisos se levanta del pliegue con su edad en lo alto, y detrás se alzan globos y banderines. Tocan cada vela para encenderla, hasta cinco, y luego soplan al móvil o deslizan hacia arriba. Tu carta está dentro de la tapa, escrita a mano.",
          line: { field: "banner", where: "En los banderines, sobre la tarta", text: "un año más de ruido" },
        },
        {
          template: "birthday-cinema",
          heading: "Soplan: velas que se apagan unas pocas cada vez",
          brief: "Un soplido de verdad apaga unas pocas velas cada vez. Deslizar también vale.",
          body: "El telón se abre sobre una marquesina con su nombre en luces y, después, una tarta con una vela por año hasta doce. A partir de ahí son seis velas y la edad en número encima. Un toque en «Usar el micrófono» y un soplido de verdad apaga unas pocas cada vez, como pasa al soplar. Quien prefiera no dar permiso al micrófono desliza hacia arriba. Luego, confeti y una tira de película con tus fotos.",
          line: { field: "marquee", where: "En la marquesina", text: "UNA VIDA EN IMÁGENES, CON NORA" },
        },
        {
          template: "balloons",
          heading: "Explotan: cada globo suelta una foto",
          body: "Un techo de globos con su edad flotando en números dorados. Cada globo que explotan deja caer al suelo una de tus fotos como polaroid con su pie, hasta ocho, y el más grande, que se explota el último, guarda tu carta. Mezcla los años: una del colegio, una del fin de semana pasado y esa que una vez te suplicó que borraras.",
          line: { field: "wall", where: "A mano en la pared, bajo los números", text: "lo mejor de cualquier sala" },
        },
        {
          template: "party-animals",
          heading: "Tocan: diez invitados que gritan cuando les toca",
          brief: "Diez animales con gorrito saltan y gritan una frase tuya al tocarlos.",
          body: "Una invitación que se abre en un collage largo de cumpleaños: su edad en globos metalizados, tus fotos en polaroids y diez animales con gorrito que saltan y gritan una frase tuya al tocarlos. Un toque en cualquier otro sitio hace saltar confeti bajo el dedo. Más abajo hay una tarta con su edad en velas de número, para tocarla o soplarla.",
          line: { field: "shouts", where: "Una de las diez frases que gritan los animales", text: "no aparentas ni un día más que ayer" },
        },
        {
          template: "sketchbook",
          heading: "Pasan la página: una tarjeta que se dibuja sola",
          body: "Un cuaderno de espiral con su nombre en la portada. Cada página se entinta sola al llegar a ella: una tarta con velas, su edad rodeada dos veces, un gorro de fiesta, flechas y corazones, con acuarela colándose detrás de las líneas. Tus fotos van pegadas con cinta entre los garabatos, hasta doce, y la última página es tu carta. De las ocho, es la tranquila.",
          line: { field: "title", where: "La frase rotulada sobre la tarta", text: "otra vuelta al sol, bien" },
        },
        {
          template: "digicam",
          heading: "Pulsan el disparador: una cámara de 2006",
          body: "Una cámara de bolsillo sobre un collage, con feliz cumple recortado de revistas encima. Pulsan el botón, el objetivo sale zumbando y tus fotos están en el carrete, con la fecha naranja en la esquina y tus pies de foto en letra de píxeles. Cada disparo lanza el flash y pasa a la siguiente; después de la última, la cámara imprime el carrete entero en una tira.",
          line: { field: "caption", where: "Un pie de foto, en la pantalla", text: "IMG_0412: tú, fingiendo que no posas" },
        },
        {
          template: "midnight-countdown",
          heading: "Esperan: una tarjeta que se abre a medianoche",
          brief: "Mándala antes: muestra un reloj que baja y, a cero, se abre con fuegos artificiales.",
          body: "La única que hace esperar. Mándala antes y muestra una cuenta atrás bajo un cielo que pasa del atardecer a la noche. A cero, en la zona horaria que elegiste, estallan los fuegos artificiales y se abre con tus fotos y tu mensaje. De las ocho es la que menos hace al tocarla y la que más hace si aciertas con la hora.",
          line: { field: "headline", where: "Titular sobre el reloj", text: "Hasta que vuelvas a ser mayor que yo, oficialmente" },
        },
        {
          template: "arcade",
          heading: "Juegan: un minijuego en el que llueve tarta",
          body: "Un juego de recreativa en el que lo que cae pueden ser trozos de tarta. Arrastran una cesta para atraparlos; cada nivel superado descubre una de tus fotos, hasta ocho, y el último descubre tu mensaje. Lo normal son ocho capturas por nivel, y puedes bajarlo a tres para alguien que prefiera llegar pronto a las fotos.",
          line: { field: "title", where: "El título del juego", text: "NORA CONTRA LOS 30" },
        },
      ],
      sections: [
        {
          heading: "Cómo funciona lo de soplar",
          body: "Tres de ellas escuchan el soplido: Cine de cumpleaños, Tarjeta pop-up y Fiesta Animal. La tarjeta pide el micrófono con un botón, solo cuando la tarta está en pantalla, y espera medio segundo de aire constante. No se graba ni se envía nada. Si dicen que no, o el móvil no puede, las velas se apagan deslizando o con un toque, y en las dos primeras puedes quitar el micrófono del todo desde el editor.",
        },
        {
          heading: "Elige según la persona",
          body: "Alguien que llora con las tarjetas: Tarjeta pop-up o Cuaderno. Alguien a quien eso le daría una vergüenza horrible: Fiesta Animal. Un cumpleaños al que no vas a poder ir: Cine de cumpleaños, porque soplar velas a solas delante del móvil es más bonito de lo que suena. Una pareja en otra zona horaria: Cuenta atrás de medianoche, puesta a su medianoche y enviada la tarde anterior.",
        },
        {
          heading: "Papel y pantalla juntos",
          body: "Cada tarjeta trae un código QR que puedes imprimir. Mételo en una tarjeta de papel, pégalo en la caja de la tarta o déjalo con el regalo, y la cámara del móvil la abre sin instalar nada. En una cena, pásale tu propio móvil con la tarjeta abierta y que toda la mesa vea cómo sopla.",
        },
      ],
      faq: [
        {
          q: "¿Qué es una tarjeta de cumpleaños interactiva?",
          a: "Una tarjeta de cumpleaños que se abre en el móvil y responde a quien la tiene en la mano: se despliega con un toque, las velas se apagan al soplar, un globo explota y suelta una foto. En Ethos añades su nombre, tus fotos y tu mensaje, más una canción en todas menos Arcade, y la envías en un enlace o en un código QR impreso.",
        },
        {
          q: "¿Hace falta una app para abrirla?",
          a: "No. Se abre en el navegador desde un enlace o un código QR, en iPhone y en Android. El micrófono se pide con un botón, solo para las velas, y si dicen que no funciona igual deslizando el dedo.",
        },
        {
          q: "¿Puede llegar a medianoche?",
          a: "Sí, con cualquiera de las ocho. En el editor, en Extras, activa «Programar la apertura» y elige el día, la hora y su zona horaria. Manda el enlace cuando quieras: hasta entonces muestra una cuenta atrás, y a las 00:00 se abre.",
        },
        {
          q: "¿Alguna de estas tarjetas es gratis?",
          a: `Estas ocho, no. Cada una es un solo pago por esa tarjeta, sin suscripción, y el editor es gratis hasta que publicas: móntala y mírala antes. ${NOTE ? "El regalo gratis de Ethos es La carta, como nota corta de hasta 500 caracteres con una canción. Sirve para un cumpleaños. No tiene velas." : `Los regalos gratis de Ethos son ${freeNames("es")}, con hasta diez fotos y una canción. Sirven para un cumpleaños. No tienen velas.`}`,
        },
        keepEs,
      ],
      related: [
        { href: "/occasions/birthday", label: "Ideas de cumpleaños: qué escribir y cuándo enviarlo" },
        { href: "/gifts/virtual-birthday-cake", label: "Tartas de cumpleaños virtuales" },
        { href: "/blog/what-to-write-in-boyfriends-birthday-card", label: "Qué escribir en la tarjeta de cumpleaños de tu novio" },
        { href: "/gifts/last-minute", label: "Regalos de última hora" },
      ],
    },
  },

  "virtual-birthday-cake": {
    en: {
      title: "Virtual Birthday Cake: Blow Out the Candles Online",
      description: "Three virtual birthday cakes whose candles go out when they blow into the phone, and two that work another way. How the blowing works, and the fallback.",
      h1: "A virtual birthday cake they can blow out",
      label: "Virtual birthday cakes",
      hero: {
        line: "A wish on a cake, when you can’t be in the room.",
        sentence: "Three cards on Ethos have a cake whose candles go out when they blow into the phone, and two more work another way.",
      },
      ideasTitle: "Five cakes, three to blow out",
      craft: "So the candles go out",
      film: "popup-card",
      lead: [
        "Three cards on Ethos have a cake with candles that go out when the person blows into their phone. The microphone does it: the card listens for about half a second of breath and puts the flames out, with smoke. Nobody can cut these cakes or eat them. They can make a wish on one, and when you can’t be in the room the wish is the part that counts.",
        "Below are those three, then two more with a cake in them that works differently: one that draws itself and one you catch. Five is all there are, so five is the list. Each takes your photos and your message, and all but Arcade take their age and a song. Each is paid once when you publish.",
      ],
      ideas: [
        {
          template: "birthday-cinema",
          heading: "A candle for every year, up to twelve",
          brief: "One breath takes a few candles at a time, so a full cake needs two or three goes.",
          body: "A cake on a stage between red curtains, with flames that flicker and lean when they breathe near the phone. A child turning eight gets eight candles. Anyone past twelve gets six, and their age as a number on top, which is kinder to everybody. One breath takes a few candles at a time, so a full cake needs two or three goes, the way a real one does.",
          line: { field: "marquee", where: "On the marquee above the cake", text: "MAKE A WISH, LENA. WE’RE ALL WATCHING." },
        },
        {
          template: "popup-card",
          heading: "They light the candles before they blow",
          brief: "They tap each candle to light it, up to five, before the card asks for a breath.",
          body: "A three-tier paper cake that stands up out of a card as it opens, their age on the topper. The candles start unlit. They tap each one to light it, up to five, and only then does the card ask for a wish and a breath. Lighting them first slows the moment down. Send it to someone who will open it alone on the morning of their birthday.",
          line: { field: "banner", where: "On the pennants over the cake", text: "make a wish, Jo" },
        },
        {
          template: "party-animals",
          heading: "The whole party cheers when the flames go out",
          brief: "They tap the cake or blow, and every animal around it cheers at once.",
          body: "Partway down a collage full of animals in party hats sits a cake with their age in number candles. They tap it or blow into the phone, the flames go out, and every animal around the cake cheers at once. The guests yell lines you wrote when tapped, so give one of them an opinion about the wish.",
          line: { field: "shouts", where: "One of the lines the animals yell", text: "BLOW. we can’t hold these hats forever" },
        },
        {
          template: "sketchbook",
          heading: "Drawn in ink, with nothing to blow out",
          body: "No blowing here, to be plain about it: this cake is a drawing. The first page of the sketchbook inks it in line by line while they watch, with one candle per year up to eight and their age circled twice beside it. Choose it for someone who would feel silly blowing at a phone on the bus. Up to twelve photos are taped onto the pages after it.",
          line: { field: "title", where: "The hand-lettered line over the cake", text: "make a wish in ink" },
        },
        {
          template: "arcade",
          heading: "Slices of cake to catch in a basket",
          body: "Set what falls to cake slices and the birthday cake becomes a game. They drag a basket along the bottom of the screen to catch them, and each level cleared reveals a photo. It is the only cake here with a score. Send it to a brother, a best friend, or anyone whose reply to a soppy card would be one emoji.",
          line: { field: "title", where: "The game’s title", text: "CAKE QUEST: LEVEL 30" },
        },
      ],
      sections: [
        {
          heading: "Before they open it",
          body: "Tell them to turn the sound on and hold the phone the way they would lean over a cake, a hand’s width from their mouth. The card shows a “Use microphone” button when the cake appears, and the phone asks permission once. In a loud room the candles may go out early, because any steady rush of noise can count as breath. At a party, nobody minds.",
        },
        {
          heading: "If the microphone says no",
          body: "Some people refuse every permission on principle, and some phones won’t offer the microphone at all. Nothing breaks. Birthday Cinema and Pop-up Card go out on a swipe up, and Party Animals on a tap. In the editor those first two have a setting called “Blowing out the candles”, and choosing “Swipe only” there means the microphone is never asked for.",
        },
        {
          heading: "A cake for someone far away",
          body: "The usual way is a video call with a cake held up to the camera, which someone else then eats. Send this the same evening instead, or schedule it for midnight where they are. Get on the call afterwards and ask what they wished for. They won’t tell you, which is correct.",
        },
      ],
      faq: [
        {
          q: "Can you really blow out candles on a phone?",
          a: "Yes. The card uses the phone’s microphone to hear breath: about half a second of steady rushing air puts the flames out. It asks for the microphone with a button, only when the cake is on screen, and nothing is recorded.",
        },
        {
          q: "How many candles can the cake have?",
          a: "Birthday Cinema shows one per year up to twelve; past that, six candles and the age as a number on top. Pop-up Card has up to five, with the age on the topper. Party Animals puts the age on the cake in number candles. Sketchbook draws up to eight.",
        },
        {
          q: "Can they cut the cake?",
          a: "No. None of these cakes can be cut or shared out: they are for the candles and the wish. If cutting a cake together matters, do that on a video call and send the card for the wish.",
        },
        {
          q: "Does it work without a microphone?",
          a: "Yes. If the microphone isn’t available, or they say no, a swipe or a tap puts the candles out instead. Nothing has to be set up for that to happen.",
        },
        {
          q: "Is a virtual birthday cake free?",
          a: `No. Each of these five is a one-time payment for that card, with no subscription. The editor is free until you publish: build the cake and blow it out yourself first. ${NOTE ? "The free gift on Ethos is The Letter as a short note, which has no cake." : `The free gifts on Ethos are ${freeNames("en")}, which have no cake.`}`,
        },
      ],
      related: [
        { href: "/gifts/interactive-birthday-card", label: "All eight interactive birthday cards" },
        { href: "/occasions/birthday", label: "Birthday gift ideas" },
        { href: "/templates/birthday-cinema", label: "Birthday Cinema, in detail" },
        { href: "/occasions/long-distance", label: "Gifts for long distance" },
      ],
    },
    es: {
      title: "Tarta de cumpleaños virtual: sopla las velas online",
      description: "Tres tartas de cumpleaños virtuales con velas que se apagan al soplar al móvil, y dos que funcionan de otra manera. Cómo va lo de soplar, y qué pasa si falla.",
      h1: "Una tarta de cumpleaños virtual para soplar desde su móvil",
      label: "Tartas de cumpleaños virtuales",
      hero: {
        line: "Un deseo ante una tarta, cuando no puedes estar allí.",
        sentence: "En Ethos hay tres tarjetas con una tarta cuyas velas se apagan al soplar al móvil, y dos más que funcionan de otra manera.",
      },
      ideasTitle: "Cinco tartas, tres que se soplan",
      craft: "Para que las velas se apaguen",
      film: "popup-card",
      lead: [
        "En Ethos hay tres tarjetas con una tarta cuyas velas se apagan cuando alguien sopla al móvil. Lo hace el micrófono: la tarjeta espera medio segundo de soplido y apaga las llamas, con su humo. Estas tartas no se pueden cortar ni comer. Sí se puede pedir un deseo, que es lo que cuenta cuando no puedes estar allí.",
        "Abajo están esas tres y dos más con una tarta que funciona de otra forma: una que se dibuja sola y otra que se atrapa. No hay más que cinco, así que la lista tiene cinco. Cada una lleva tus fotos y tu mensaje, y todas menos Arcade, su edad y una canción. Cada una se paga una sola vez al publicar.",
      ],
      ideas: [
        {
          template: "birthday-cinema",
          heading: "Una vela por cada año, hasta doce",
          brief: "Cada soplido apaga unas pocas, así que una tarta llena pide dos o tres intentos.",
          body: "Una tarta en un escenario, entre telones rojos, con llamas que tiemblan y se inclinan cuando respiran cerca del móvil. Quien cumple ocho tiene ocho velas. Quien pasa de doce tiene seis, y la edad en número encima, que es más amable para todo el mundo. Cada soplido apaga unas pocas, así que una tarta llena pide dos o tres intentos, como una de verdad.",
          line: { field: "marquee", where: "En la marquesina, sobre la tarta", text: "PIDE UN DESEO, LENA. TE ESTAMOS MIRANDO." },
        },
        {
          template: "popup-card",
          heading: "Primero se encienden, luego se soplan",
          brief: "Tocan cada vela para encenderla, hasta cinco, y solo entonces la tarjeta pide un soplido.",
          body: "Una tarta de papel de tres pisos que se levanta de la tarjeta al abrirla, con su edad en lo alto. Las velas empiezan apagadas. Tocan cada una para encenderla, hasta cinco, y solo entonces la tarjeta pide un deseo y un soplido. Encenderlas antes alarga el momento. Mándasela a quien vaya a abrirla a solas la mañana de su cumpleaños.",
          line: { field: "banner", where: "En los banderines, sobre la tarta", text: "pide un deseo, Jo" },
        },
        {
          template: "party-animals",
          heading: "Toda la fiesta celebra cuando se apagan",
          brief: "La tocan o soplan al móvil, y todos los animales de alrededor lo celebran a la vez.",
          body: "A mitad de un collage lleno de animales con gorrito espera la tarta, con su edad puesta en velas de número. La tocan o soplan al móvil, las llamas se apagan y todos los animales de alrededor lo celebran a la vez. Los invitados gritan frases tuyas al tocarlos, así que dale a uno una opinión sobre el deseo.",
          line: { field: "shouts", where: "Una de las frases que gritan los animales", text: "SOPLA. el gorro no se aguanta solo" },
        },
        {
          template: "sketchbook",
          heading: "Dibujada a tinta, sin nada que soplar",
          body: "Aquí no se sopla, para que quede claro: esta tarta es un dibujo. La primera página del cuaderno la va entintando línea a línea mientras miran, con una vela por año hasta ocho y su edad rodeada dos veces al lado. Elígela para alguien a quien le daría apuro soplarle al móvil en el autobús. En las páginas siguientes van pegadas tus fotos, hasta doce.",
          line: { field: "title", where: "La frase rotulada sobre la tarta", text: "pide un deseo a tinta" },
        },
        {
          template: "arcade",
          heading: "Trozos de tarta que se atrapan con una cesta",
          body: "Elige que caigan trozos de tarta y la tarta de cumpleaños se convierte en un juego. Arrastran una cesta por la parte de abajo de la pantalla para atraparlos, y cada nivel superado descubre una foto. Es la única tarta de aquí con marcador. Mándasela a un hermano, a tu mejor amiga o a cualquiera que contestara a una tarjeta cursi con un solo emoji.",
          line: { field: "title", where: "El título del juego", text: "MISIÓN TARTA: NIVEL 30" },
        },
      ],
      sections: [
        {
          heading: "Antes de que la abran",
          body: "Diles que activen el sonido y que sujeten el móvil como si se inclinaran sobre una tarta, a un palmo de la boca. La tarjeta muestra el botón «Usar el micrófono» cuando aparece la tarta, y el móvil pide permiso una vez. En un sitio con mucho ruido las velas pueden apagarse antes de tiempo, porque cualquier ruido fuerte y seguido puede contar como un soplido. En una fiesta, a nadie le importa.",
        },
        {
          heading: "Si el micrófono dice que no",
          body: "Hay quien rechaza todos los permisos por principio, y hay móviles que ni ofrecen el micrófono. No se rompe nada. En Cine de cumpleaños y en Tarjeta pop-up las velas se apagan deslizando hacia arriba, y en Fiesta Animal con un toque. En el editor, esas dos primeras tienen un ajuste llamado «Apagar las velas», y con «Solo deslizar» el micrófono no se pide nunca.",
        },
        {
          heading: "Una tarta para alguien que está lejos",
          body: "Lo habitual es una videollamada con una tarta delante de la cámara, que luego se come otra persona. Manda esto esa misma tarde, o prográmalo para la medianoche de donde esté. Llama después y pregunta qué deseo ha pedido. No te lo va a decir, y hace bien.",
        },
      ],
      faq: [
        {
          q: "¿De verdad se pueden soplar velas en un móvil?",
          a: "Sí. La tarjeta usa el micrófono del móvil para oír el soplido: con medio segundo de aire constante se apagan las llamas. Pide el micrófono con un botón, solo cuando la tarta está en pantalla, y no se graba nada.",
        },
        {
          q: "¿Cuántas velas puede tener la tarta?",
          a: "Cine de cumpleaños pone una por año hasta doce; a partir de ahí, seis velas y la edad en número encima. Tarjeta pop-up tiene hasta cinco, con la edad en lo alto de la tarta. Fiesta Animal pone la edad en la tarta con velas de número. Cuaderno dibuja hasta ocho.",
        },
        {
          q: "¿Se puede cortar la tarta?",
          a: "No. Ninguna de estas tartas se corta ni se reparte: son para las velas y el deseo. Si cortar una tarta a la vez es importante, cortadla juntos por videollamada y manda tú la tarjeta para el deseo.",
        },
        {
          q: "¿Funciona sin micrófono?",
          a: "Sí. Si no hay micrófono, o dicen que no, las velas se apagan deslizando el dedo o con un toque. No hay que configurar nada para que pase.",
        },
        {
          q: "¿Una tarta de cumpleaños virtual es gratis?",
          a: `No. Cada una de estas cinco es un solo pago por esa tarjeta, sin suscripción. El editor es gratis hasta que publicas: monta la tarta y sóplala tú antes. ${NOTE ? "El regalo gratis de Ethos es La carta como nota corta, que no tiene tarta." : `Los regalos gratis de Ethos son ${freeNames("es")}, que no tienen tarta.`}`,
        },
      ],
      related: [
        { href: "/gifts/interactive-birthday-card", label: "Las ocho tarjetas de cumpleaños interactivas" },
        { href: "/occasions/birthday", label: "Ideas de regalo de cumpleaños" },
        { href: "/templates/birthday-cinema", label: "Cine de cumpleaños, al detalle" },
        { href: "/occasions/long-distance", label: "Regalos para una relación a distancia" },
      ],
    },
  },

  "photo-album": {
    en: {
      title: "Digital Photo Album: Interactive Albums You Send as a Link",
      description: "A digital photo album you send as a link: a gallery, a road of dates, a camera roll, a sky of stars. How many photos each one holds, and what to caption.",
      h1: "Interactive photo albums",
      label: "Interactive photo albums",
      hero: {
        line: "Your photos, with an order, captions and a way through.",
        sentence: "These eight albums differ in how they are looked through: a gallery room for each photo, a road of dates, a camera from 2006.",
      },
      ideasTitle: "Eight ways to look through them",
      craft: "Photos first, then the words",
      film: "scrapbook",
      lead: [
        "A photo album you send as a link is a set of photos with an order, captions and a way of being looked through. That last part is where these eight differ. One hangs each photo in a gallery room. One pins them along a road with dates. One hides them on a camera from 2006.",
        `The real limits, so you can choose before you start: most of these hold 8 to 12 photos and two hold 20, and a caption can be 140 characters. ${NOTE ? "Photos are a paid feature on Ethos, so every album here is paid once" : "Constellations is free with up to ten photos, and every other album here is paid once"}, when you publish, and the editor is free until then. Pick by how many photos you have and how much you want to say about each.`,
      ],
      ideas: [
        {
          template: "museum",
          heading: "A gallery, one photo to a room",
          brief: "Up to twenty photos, each hung alone in a room of its own with a plaque.",
          body: "Up to twenty photos, each hung alone on a wall in a room of its own with a plaque underneath: your caption as the title, then the years you set for the show. They swipe from room to room, and the last wall is your message, set like the text at the end of an exhibition. Write the captions the way museums do, deadpan, and it gets funnier with every room.",
          line: { field: "caption", where: "A photo caption, on its plaque", text: "Untitled (You, Asleep on the Train), 2022. On loan from my camera roll." },
        },
        {
          template: "our-timeline",
          heading: "A road with a date at every photo",
          brief: "A road draws itself down the page and pins each photo at a milestone.",
          body: "For photos that have an order. A road draws itself down the page and pins each photo at a milestone with a label of its own, twenty stops at most. Say what happened, not only when. Under the last photo are your closing line, then a countdown if you add one, then the letter. Point the countdown at the next thing: the trip, the move, the wedding.",
          line: { field: "dates", where: "The label at one milestone", text: "March 2021: the flat with loud pipes" },
        },
        {
          template: "scrapbook",
          heading: "A scrapbook page, taped and pinned",
          brief: "Up to twelve photos land on a page as polaroids, a photo-booth strip and a roll of film.",
          body: "The one that looks handmade. Cut-out letters spell the title, and up to twelve photos land on the page as polaroids that develop, a photo-booth strip, a stamp and a roll of film, taped and pinned between flowers. There is a torn note for one handwritten line, and a typed letter from you. Five page styles, from Blossom to Seaside.",
          line: { field: "quote", where: "The handwritten line on the torn note", text: "Proof that we do, occasionally, leave the house." },
        },
        {
          template: "digicam",
          heading: "A camera roll from 2006",
          brief: "Twelve photos at most, on a pocket camera’s small screen with an orange date stamp.",
          body: "Twelve photos at most, shown on the small screen of a pocket camera with an orange date stamp in the corner. They flick through with the arrows or a swipe, and at the end the camera prints the whole roll as one strip. Set the stamp to the real date of the trip and it reads like a roll you found in a drawer. Switch off “It’s their birthday” and the title becomes their name.",
          line: { field: "caption", where: "A photo caption, on the camera’s screen", text: "DSC_0031: the night the car broke down and we didn’t mind" },
        },
        {
          template: "constellations",
          heading: "A night sky with a photo in every star",
          body: "Three to twelve photos, each one a star. They tap a star to fly to it and see the photo; when every star has been visited, lines join them into a heart, an infinity sign or a star, and your closing line appears under it. It asks for patience, in a good way: nobody skims an album they have to find.",
          line: { field: "finalLine", where: "The line that appears when the constellation completes", text: "Twelve nights I’d live again, in the order they happened." },
        },
        {
          template: "vinyl",
          heading: "A crate of records, your photos as sleeves",
          brief: "Your photos sit in a crate as album covers to flip through, up to twelve.",
          body: "They drop the needle, the record turns with the music, and your photos sit in a crate as album covers to flip through, up to twelve. Your message is printed as the liner notes, and you name the album and the artist yourself. The song matters most here: choose it first, then pick the photos that belong to it.",
          line: { field: "album", where: "The album title", text: "Greatest Hits of a Very Long Summer" },
        },
        {
          template: "keepsake",
          heading: "A box of kept things, with a locket",
          body: "Nine photos, and each one’s place is decided by where it comes in the order. The first lies on deckle-edged paper under dried flowers. The second is inside a gold locket that opens on a tap, opposite the few characters you had engraved, and its caption shows while the locket is open. The other seven are pressed in below, like pages. Choose the first two before anything else, because those places are fixed.",
          line: { field: "engraving", where: "Engraved inside the locket", text: "14.06 · the pier" },
        },
        {
          template: "music-box",
          heading: "A mirror with a new photo at every turn",
          brief: "They wind a key three turns, and a photo comes up in the mirror, then the next.",
          body: "An album that can’t be hurried. They wind a key three turns and the box starts to play; a photo comes up in the oval mirror inside the lid, then the next, eight at most, each with its caption on a slip of paper. A tap on the mirror brings one close. When the spring runs down, a folded letter lifts out, with all the photos laid out after it.",
          line: { field: "message", where: "The first line of the letter", text: "Wind it again whenever you miss this." },
        },
      ],
      sections: [
        {
          heading: "Choosing the photos",
          body: "Start with how many the album holds and cut down to it: the cutting is where an album gets good. Keep one photo per moment, never three of the same evening. Include one where nobody looks their best. And think about which comes last, because the photo they see just before your message is the one they are still thinking about when they read it.",
        },
        {
          heading: "Writing the captions",
          body: "A caption has 140 characters, which is one good sentence. Don’t describe what the photo already shows. Say what happened just before it or just after, or what somebody said. “Ten minutes before the rain” does more than “Us at the beach”, and “You had just lost the keys” does more than both.",
        },
        {
          heading: "Old photos and odd files",
          body: "Photos come straight from your camera roll, and the editor makes them smaller before they upload, so a screenshot from 2016 and a photo from this morning sit together without trouble. You can crop in the editor when a face is at the edge. For a printed photo, lay it flat in daylight and photograph it without flash.",
        },
      ],
      faq: [
        {
          q: "How many photos can a digital photo album hold?",
          a: "It depends on the album. Museum and Our Timeline take 20; Scrapbook, Digicam, Constellations and Vinyl take 12; Keepsake takes 9 and Music Box 8. Twenty is the most any gift on Ethos holds.",
        },
        {
          q: "Can I write a caption for each photo?",
          a: "Yes, up to 140 characters per photo. It shows as the plaque in Museum, under the polaroid in Scrapbook and in pixel type on the Digicam’s screen.",
        },
        {
          q: "Can I change the photos after I have sent it?",
          a: "Yes. Open the gift from My gifts, change the photos and publish again. The change appears at the same link, so there is nothing to resend.",
        },
        {
          q: "Is a photo album free?",
          a: NOTE
            ? "No. Photos are a paid feature, so each album is a one-time payment for that template, with no subscription. You can build it in the editor and watch it play before you pay. The free gift on Ethos is The Letter as a short note, without photos."
            : "One is: Constellations, with up to ten photos. Each of the others is a one-time payment for that template, with no subscription. You can build it in the editor and watch it play before you pay. The Letter is free too, with up to ten photos.",
        },
        keepEn,
      ],
      related: [
        { href: "/blog/how-to-make-a-digital-scrapbook", label: "How to make a digital scrapbook" },
        { href: "/blog/photo-gift-ideas-for-boyfriend", label: "Photo gift ideas for a boyfriend" },
        { href: "/gifts/anniversary-website", label: "Anniversary websites" },
        { href: "/occasions/anniversary", label: "Anniversary gift ideas" },
      ],
    },
    es: {
      title: "Álbum de fotos digital: interactivo y en un enlace",
      description: "Un álbum de fotos digital que se envía en un enlace: una galería, un camino con fechas, un carrete, un cielo. Cuántas fotos caben en cada uno.",
      h1: "Álbumes de fotos interactivos",
      label: "Álbumes de fotos interactivos",
      hero: {
        line: "Tus fotos, con un orden, sus pies y una manera de recorrerlas.",
        sentence: "Estos ocho álbumes se diferencian en cómo se recorren: una sala de galería para cada foto, un camino con fechas, una cámara de 2006.",
      },
      ideasTitle: "Ocho maneras de recorrerlas",
      craft: "Primero las fotos, luego las palabras",
      film: "scrapbook",
      lead: [
        "Un álbum de fotos que se manda en un enlace es un conjunto de fotos con un orden, unos pies de foto y una manera de recorrerlo. En eso último se diferencian estos ocho. Uno cuelga cada foto en la sala de una galería. Otro las clava a lo largo de un camino con fechas. Otro las esconde en una cámara de 2006.",
        `Los límites reales, para elegir antes de empezar: en casi todos caben de 8 a 12 fotos y en dos caben 20, y un pie de foto puede tener 140 caracteres. ${NOTE ? "En Ethos las fotos son de pago, así que cada álbum se paga una sola vez" : "Constelaciones es gratis con hasta diez fotos, y los demás álbumes se pagan una sola vez"}, al publicar, y el editor es gratis hasta entonces. Elige según cuántas fotos tengas y cuánto quieras contar de cada una.`,
      ],
      ideas: [
        {
          template: "museum",
          heading: "Una galería, con una foto por sala",
          brief: "Hasta veinte fotos, cada una sola en su propia sala, con una cartela debajo.",
          body: "Hasta veinte fotos, cada una sola en una pared de su propia sala, con una cartela debajo: tu pie de foto como título y los años que le pongas a la exposición. Pasan de sala en sala deslizando, y la última pared es tu mensaje, compuesto como el texto que cierra una exposición. Escribe los pies como los escriben los museos, con toda la seriedad, y cada sala hace más gracia.",
          line: { field: "caption", where: "Un pie de foto, en su cartela", text: "Sin título (Tú, durmiendo en el tren), 2022. Cedida por mi carrete." },
        },
        {
          template: "our-timeline",
          heading: "Un camino con una fecha en cada foto",
          brief: "Un camino se dibuja página abajo y clava cada foto en un hito, con su etiqueta.",
          body: "Para fotos que tienen un orden. Un camino se dibuja página abajo y clava cada foto en un hito con su propia etiqueta, veinte paradas como máximo. Cuenta qué pasó, no solo cuándo. Bajo la última foto quedan tu frase final, luego una cuenta atrás si la añades, y al final la carta. Apunta la cuenta atrás a lo siguiente: el viaje, la mudanza, la boda.",
          line: { field: "dates", where: "La etiqueta de un hito", text: "Marzo de 2021: el piso de las tuberías" },
        },
        {
          template: "scrapbook",
          heading: "Una página de álbum, con cinta y chinchetas",
          brief: "Hasta doce fotos caen en la página como polaroids, una tira de fotomatón y un carrete.",
          body: "El que parece hecho a mano. Unas letras recortadas forman el título, y hasta doce fotos caen en la página como polaroids que se revelan, una tira de fotomatón, un sello y un carrete, pegadas con cinta y chinchetas entre flores. Hay una nota rasgada para una frase a mano y una carta tuya a máquina. Cinco estilos de página, de Flores a Playa.",
          line: { field: "quote", where: "La frase a mano de la nota rasgada", text: "Pruebas de que, a veces, salimos de casa." },
        },
        {
          template: "digicam",
          heading: "Un carrete de 2006",
          brief: "Doce fotos como máximo, en la pantallita de una cámara de bolsillo, con la fecha naranja.",
          body: "Doce fotos como máximo, en la pantallita de una cámara de bolsillo, con la fecha naranja en la esquina. Las pasan con las flechas o deslizando, y al final la cámara imprime el carrete entero en una tira. Pon en el sello la fecha real del viaje y parecerá un carrete encontrado en un cajón. Desactiva «Es su cumpleaños» y el título pasa a ser su nombre.",
          line: { field: "caption", where: "Un pie de foto, en la pantalla", text: "DSC_0031: la noche que se averió el coche y nos dio igual" },
        },
        {
          template: "constellations",
          heading: "Un cielo nocturno con una foto en cada estrella",
          body: "De tres a doce fotos, cada una en una estrella. Tocan una estrella para volar hasta ella y ver la foto; cuando las han visitado todas, unas líneas las unen en un corazón, un infinito o una estrella, y debajo aparece tu frase final. Pide paciencia, en el buen sentido: nadie pasa deprisa un álbum que hay que ir encontrando.",
          line: { field: "finalLine", where: "La frase que aparece al completar la constelación", text: "Doce noches que repetiría, en el orden en que pasaron." },
        },
        {
          template: "vinyl",
          heading: "Una caja de discos con tus fotos de portada",
          brief: "Tus fotos esperan en una caja como portadas de discos para ir pasando, hasta doce.",
          body: "Ponen la aguja, el disco gira con la música y tus fotos esperan en una caja como portadas de discos para ir pasando, hasta doce. Tu mensaje va impreso en las notas del libreto, y el nombre del disco y el del artista los pones tú. Aquí manda la canción: elígela primero y busca después las fotos que le pertenecen.",
          line: { field: "album", where: "El título del disco", text: "Grandes éxitos de un verano muy largo" },
        },
        {
          template: "keepsake",
          heading: "Una caja de cosas guardadas, con un relicario",
          body: "Nueve fotos, y el sitio de cada una lo decide su puesto en el orden. La primera queda sobre papel de borde irregular, bajo flores secas. La segunda está en el relicario de oro, que se abre al tocarlo, frente a los pocos caracteres que hayas grabado, y su pie se lee mientras sigue abierto. Las otras siete van debajo, prensadas como páginas. Elige las dos primeras antes que nada, porque esos sitios son fijos.",
          line: { field: "engraving", where: "Grabado dentro del relicario", text: "14.06 · el muelle" },
        },
        {
          template: "music-box",
          heading: "Un espejo con una foto nueva en cada vuelta",
          brief: "Dan tres vueltas a una llave y en el espejo aparece una foto, luego la siguiente.",
          body: "Un álbum que no se puede pasar deprisa. Dan tres vueltas a una llave y la caja empieza a sonar; en el espejo ovalado de la tapa aparece una foto, luego la siguiente, ocho como máximo, cada una con su pie en una tira de papel. Con un toque en el espejo se ve de cerca. Cuando se acaba la cuerda sale una carta doblada y, después de ella, todas las fotos juntas.",
          line: { field: "message", where: "La primera línea de la carta", text: "Dale cuerda otra vez cuando eches esto de menos." },
        },
      ],
      sections: [
        {
          heading: "Cómo elegir las fotos",
          body: "Empieza por cuántas caben en el álbum y recorta hasta ese número: en el recorte es donde un álbum mejora. Una foto por momento, nunca tres de la misma noche. Mete una en la que nadie salga favorecido. Y piensa cuál va la última, porque la foto que ven justo antes de tu mensaje es la que siguen teniendo en la cabeza cuando lo leen.",
        },
        {
          heading: "Cómo escribir los pies de foto",
          body: "Un pie de foto tiene 140 caracteres, que es una buena frase. No describas lo que la foto ya enseña. Cuenta qué pasó justo antes o justo después, o qué dijo alguien. «Diez minutos antes de la tormenta» hace más que «Nosotros en la playa», y «Acababas de perder las llaves» hace más que las dos.",
        },
        {
          heading: "Fotos antiguas y archivos raros",
          body: "Las fotos salen directamente de tu carrete, y el editor las hace más pequeñas antes de subirlas, así que una captura de 2016 y una foto de esta mañana conviven sin problema. Puedes recortar en el editor cuando una cara queda en el borde. Para una foto en papel, ponla plana a la luz del día y hazle una foto sin flash.",
        },
      ],
      faq: [
        {
          q: "¿Cuántas fotos caben en un álbum de fotos digital?",
          a: "Depende del álbum. En Museo y en Nuestra línea del tiempo caben 20; en Álbum de recortes, Digicam, Constelaciones y Vinilo, 12; en Recuerdo, 9, y en Caja de música, 8. Veinte es lo máximo que admite un regalo de Ethos.",
        },
        {
          q: "¿Puedo escribir un pie para cada foto?",
          a: "Sí, hasta 140 caracteres por foto. Sale como la placa en Museo, bajo la polaroid en Álbum de recortes y en letra de píxeles en la pantalla de la Digicam.",
        },
        {
          q: "¿Puedo cambiar las fotos después de enviarlo?",
          a: "Sí. Abre el regalo desde Mis regalos, cambia las fotos y vuelve a publicar. El cambio sale en el mismo enlace, así que no hay nada que reenviar.",
        },
        {
          q: "¿Un álbum de fotos es gratis?",
          a: NOTE
            ? "No. Las fotos son de pago, así que cada álbum es un solo pago por esa plantilla, sin suscripción. Puedes montarlo en el editor y verlo funcionar antes de pagar. El regalo gratis de Ethos es La carta como nota corta, sin fotos."
            : "Uno sí: Constelaciones, con hasta diez fotos. Cada uno de los demás es un solo pago por esa plantilla, sin suscripción. Puedes montarlo en el editor y verlo funcionar antes de pagar. La carta también es gratis, con hasta diez fotos.",
        },
        keepEs,
      ],
      related: [
        { href: "/blog/how-to-make-a-digital-scrapbook", label: "Cómo hacer un scrapbook digital" },
        { href: "/blog/photo-gift-ideas-for-boyfriend", label: "Regalos con fotos para tu novio" },
        { href: "/gifts/anniversary-website", label: "Páginas web de aniversario" },
        { href: "/occasions/anniversary", label: "Ideas de regalo de aniversario" },
      ],
    },
  },

  "anniversary-website": {
    en: {
      title: "Anniversary Website for Your Girlfriend or Boyfriend",
      description: "Make a website for your girlfriend or boyfriend from your photos, dates and song, with no code: for an anniversary or a birthday. Seven formats to fill in.",
      h1: "An anniversary website for your girlfriend or boyfriend",
      label: "Anniversary websites",
      hero: {
        line: "One page with a link of its own, made tonight.",
        sentence: "No code and no hosting: you fill in a single page with your photos, your dates and your song, and it opens in their browser.",
      },
      ideasTitle: "Seven pages, and what goes in each",
      craft: "Ready before the day",
      lead: [
        "People who search for an anniversary website usually want one of two things: a page that tells the story of the two of them, or a surprise their partner opens on the day. You can code one over a weekend, host it, and hope it works on their phone. Or you can fill one in tonight. These are single pages with a link of their own, made from your photos, your dates and your song. The same seven make a birthday website for a girlfriend or boyfriend.",
        "To be plain about what you get: one page at a tryethos.io link, opened in a browser, with nothing to install. It is not a site with its own domain name or several pages. In return it does things a hand-built page rarely does, like staying shut until midnight or asking for a password. Each format is paid once, when you publish, and one of them has a free version.",
      ],
      ideas: [
        {
          template: "our-timeline",
          heading: "Your story as a road, one stop a year",
          body: "The closest thing to the “our story” site people picture. A road draws itself as they scroll and stops at each photo, labeled in your words: the first message, the first trip, the keys. Two to twenty stops. After the last one comes a closing line, a countdown if you set one, and your letter. Aim the countdown at tonight’s dinner or at next year’s date.",
          line: { field: "ending", where: "The closing line, above the countdown", text: "Year four starts here. Same seats?" },
        },
        {
          template: "museum",
          heading: "An exhibition of you two, room by room",
          brief: "Up to twenty photos, one to a wall, and they swipe from room to room like visitors.",
          body: "A site with rooms. Give the exhibition a title, put the years on every plaque, and hang up to twenty photos, one to a wall, each with a caption. They swipe from room to room like visitors, and the last wall carries your message as the curator’s text. A video clip can have a room of its own.",
          line: { field: "exhibition", where: "The exhibition title", text: "Three Years of Us: A Retrospective" },
        },
        {
          template: "the-letter",
          heading: "A sealed letter, when one page is enough",
          body: `If the website you have in mind is really a letter, send a letter. An envelope with your initial pressed into the wax opens on a tap, and the page writes itself out in handwriting. ${NOTE ? "As a short note of up to 500 characters it is free. With “Make it special” it holds the full letter, your photos as polaroids, a video and a voice message." : "It is free with the whole letter and up to ten photos as polaroids. With “Make it special” it also holds a video and a voice message."}`,
          line: { field: "greeting", where: "The greeting, in place of “Dear…”", text: "To the person who answered at 1 a.m.," },
        },
        {
          template: "scratch-card",
          heading: "News under foil, for an anniversary with a secret",
          brief: "Each card hides a photo under foil, and the last one carries the announcement.",
          body: "They rub the foil off a stack of cards with a finger; each hides a photo and its caption, and the last one carries the announcement in big letters: the trip, the ring, the reservation. You choose the words printed on the foil, so the cover gives nothing away.",
          line: { field: "finalTitle", where: "The headline on the last card", text: "We’re going back to where we met. Friday." },
        },
        {
          template: "unwrapped",
          heading: "The year in numbers, counted up as they unwrap",
          body: "The page a developer would build to show off, already built. A row of presents, each hiding a number from your year that counts up when the paper comes off: voice notes, flights, arguments about the thermostat. Up to eight, written by you, number first. The last present prints the whole year as a receipt with both your names on it.",
          line: { field: "stats", where: "One of the eight numbers", text: "58 trains missed for one more coffee" },
        },
        {
          template: "passport",
          heading: "Two cities and the route between them",
          body: "For an anniversary spent in two places. A passport with their name on the cover opens, a globe turns, and a route draws itself between your two cities by way of the places you have met, six at most. The pages fill with stamps, one for each photo up to ten, and your message is on the visa page.",
          line: { field: "nationality", where: "The nationality line", text: "Resident of the 22:10 call" },
        },
        {
          template: "midnight-countdown",
          heading: "The page that isn’t there until midnight",
          body: "A surprise page needs a reveal, and this one is built around it. Send the link days before and all they see is a clock running down over a skyline at dusk. At the second you chose, in their time zone, fireworks go off and the page opens on your photos and your words. It holds up to twenty photos.",
          line: { field: "headline", where: "Headline above the timer", text: "Three years ago today you said yes to a second coffee" },
        },
      ],
      sections: [
        {
          heading: "How to keep it a surprise",
          body: "Nobody can see the page until you publish it, and nobody is told it exists until you send the link yourself. There are three ways to hand it over. Schedule it and send the link early, so it opens by itself at midnight. Set a password and say the word over dinner. Or print the QR card and leave it where it will be found: a coat pocket, under a plate, inside the book on their side of the bed.",
        },
        {
          heading: "What to have ready",
          body: "Their name and yours, six to twelve photos in order, the dates that matter (the first message, the first trip, the day you got the keys), one song, and a message. The message is the only part that takes time. Write it first, in your notes app, before you open the editor, and paste it in.",
        },
        {
          heading: "Should you build one yourself?",
          body: "If you write code and want the practice, yes. A hand-built page is a gift in itself, and they will know the hours it took. Give it a link they can keep, test it on their phone and not only on your laptop, and check that it still loads next year. If what matters is that it works on the day, use one of the formats above and spend the saved weekend on the letter.",
        },
      ],
      faq: [
        {
          q: "How do I make an anniversary website for my girlfriend or boyfriend?",
          a: "Pick a format, add both names, your photos, the dates, a song and a message, and publish. You get a link and a QR code to print. There is no code to write and nothing to host: it opens in the browser on their phone.",
        },
        {
          q: "Can I use my own domain name?",
          a: "No. The page lives at a tryethos.io link. If a domain with your two names matters to you, buy one from any registrar and set it to forward to that link.",
        },
        {
          q: "Can I put a password on it?",
          a: "Yes, on any paid format. Set the password in the editor, under Extras, and they type it before the page opens.",
        },
        {
          q: "Will the page stay online?",
          a: "Yes. Links are meant to be permanent, so it opens again on the next anniversary. You can add this year’s photos to it then: edits go live at the same link.",
        },
        freeEn,
      ],
      related: [
        { href: "/occasions/anniversary", label: "Anniversary gift ideas" },
        { href: "/blog/long-distance-anniversary-ideas", label: "Long-distance anniversary ideas" },
        { href: "/blog/first-anniversary-ideas-for-boyfriend", label: "First anniversary ideas for a boyfriend" },
        { href: "/gifts/photo-album", label: "Interactive photo albums" },
      ],
    },
    es: {
      title: "Página web de aniversario para tu novia o tu novio",
      description: "Haz una página web para tu novia o tu novio con vuestras fotos, fechas y canción, sin programar: de aniversario o de cumpleaños. Siete formatos.",
      h1: "Una página web de aniversario para tu novia o tu novio",
      label: "Páginas web de aniversario",
      hero: {
        line: "Una página con su propio enlace, hecha esta noche.",
        sentence: "Sin programar y sin alojarla: rellenas una sola página con vuestras fotos, vuestras fechas y vuestra canción, y se abre en su navegador.",
      },
      ideasTitle: "Siete páginas, y qué lleva cada una",
      craft: "Todo listo antes del día",
      lead: [
        "Quien busca una página web de aniversario suele querer una de dos cosas: una página que cuente la historia de los dos, o una sorpresa que su pareja abra ese día. Puedes programarla en un fin de semana, alojarla y cruzar los dedos para que funcione en su móvil. O puedes rellenar una esta noche. Estas son páginas únicas con su propio enlace, hechas con vuestras fotos, vuestras fechas y vuestra canción. Las mismas siete sirven de página web de cumpleaños para tu novia o tu novio.",
        "Para que quede claro lo que es: una página en un enlace de tryethos.io, que se abre en el navegador, sin instalar nada. No es un sitio con dominio propio ni con varias páginas. A cambio hace cosas que una página hecha a mano casi nunca hace, como quedarse cerrada hasta medianoche o pedir una contraseña. Cada formato se paga una sola vez, al publicar, y uno de ellos tiene versión gratis.",
      ],
      ideas: [
        {
          template: "our-timeline",
          heading: "Vuestra historia en un camino, una parada por año",
          body: "Lo más parecido a la web de «nuestra historia» que todo el mundo se imagina. Un camino se dibuja al deslizar y se detiene en cada foto, con una etiqueta en tus palabras: el primer mensaje, el primer viaje, las llaves. De dos a veinte paradas. Después de la última vienen una frase final, una cuenta atrás si la pones, y tu carta. Apunta la cuenta atrás a la cena de esta noche o a la fecha del año que viene.",
          line: { field: "ending", where: "La frase final, sobre la cuenta atrás", text: "Aquí empieza el cuarto año. ¿Mismos asientos?" },
        },
        {
          template: "museum",
          heading: "Una exposición de los dos, sala a sala",
          brief: "Hasta veinte fotos, una por pared, y pasan de sala en sala como visitantes.",
          body: "Una web con salas. Ponle título a la exposición, escribe los años en cada cartela y cuelga hasta veinte fotos, una por pared, cada una con su pie. Pasan de sala en sala como visitantes, y la última pared lleva tu mensaje como texto del comisario. Un clip de vídeo puede tener una sala para él solo.",
          line: { field: "exhibition", where: "El título de la exposición", text: "Tres años de nosotros: una retrospectiva" },
        },
        {
          template: "the-letter",
          heading: "Una carta con lacre, cuando basta una página",
          body: `Si la web que tienes en la cabeza es en realidad una carta, manda una carta. Un sobre con tu inicial en el lacre se abre con un toque, y la página se va escribiendo a mano. ${NOTE ? "Como nota corta de hasta 500 caracteres es gratis. Con «Hazlo especial» lleva la carta completa, tus fotos como polaroids, un vídeo y un mensaje de voz." : "Es gratis con la carta entera y hasta diez fotos como polaroids. Con «Hazlo especial» lleva además un vídeo y un mensaje de voz."}`,
          line: { field: "greeting", where: "El saludo, en vez de «Querido…»", text: "A quien contestó a la una de la madrugada:" },
        },
        {
          template: "scratch-card",
          heading: "Una noticia para rascar, si hay un secreto",
          brief: "Cada tarjeta esconde una foto bajo una capa que se rasca, y la última lleva el anuncio.",
          body: "Rascan con el dedo un montón de tarjetas; cada una esconde una foto y su pie, y la última lleva el anuncio en letras grandes: el viaje, el anillo, la reserva. Las palabras impresas sobre la capa metalizada las eliges tú, para que la portada no cuente nada.",
          line: { field: "finalTitle", where: "El titular de la última tarjeta", text: "Volvemos a donde nos conocimos. El viernes." },
        },
        {
          template: "unwrapped",
          heading: "Vuestro año en números, que suben al desenvolver",
          body: "La página que haría un programador para lucirse, ya hecha. Una fila de regalos, cada uno con un número de vuestro año que sube al quitar el papel: audios, vuelos, discusiones por el termostato. Hasta ocho, escritos por ti, con el número delante. El último regalo imprime el año entero como un tique con vuestros dos nombres.",
          line: { field: "stats", where: "Uno de los ocho números", text: "58 trenes perdidos por un café más" },
        },
        {
          template: "passport",
          heading: "Dos ciudades y la ruta que las une",
          body: "Para un aniversario vivido en dos sitios. Un pasaporte con su nombre en la portada se abre, gira un globo y se dibuja una ruta desde tu ciudad hasta la suya, con hasta seis escalas para los lugares donde os habéis visto. Las páginas se llenan de sellos, uno por foto hasta diez, y la página del visado guarda tu mensaje.",
          line: { field: "nationality", where: "La línea de la nacionalidad", text: "Residente de la llamada de las 22:10" },
        },
        {
          template: "midnight-countdown",
          heading: "La página que no existe hasta medianoche",
          body: "Una página sorpresa necesita su golpe de efecto, y esta está hecha alrededor de él. Manda el enlace días antes y solo se ve un reloj que baja sobre una ciudad al atardecer. En el segundo que elegiste, en su zona horaria, estallan los fuegos artificiales y la página se abre con tus fotos y tus palabras. Caben hasta veinte fotos.",
          line: { field: "headline", where: "Titular sobre el reloj", text: "Hoy hace tres años dijiste que sí a un segundo café" },
        },
      ],
      sections: [
        {
          heading: "Cómo mantener la sorpresa",
          body: "Nadie puede ver la página hasta que la publicas, y nadie sabe que existe hasta que mandas el enlace. Hay tres formas de entregarla. Prográmala y manda el enlace antes, para que se abra sola a medianoche. Ponle una contraseña y di la palabra en la cena. O imprime la tarjeta con el código QR y déjala donde la vaya a encontrar: en un bolsillo del abrigo, bajo un plato, dentro del libro de su lado de la cama.",
        },
        {
          heading: "Qué tener preparado",
          body: "Su nombre y el tuyo, de seis a doce fotos en orden, las fechas que importan (el primer mensaje, el primer viaje, el día de las llaves), una canción y un mensaje. El mensaje es lo único que lleva tiempo. Escríbelo primero, en las notas del móvil, antes de abrir el editor, y pégalo.",
        },
        {
          heading: "¿Merece la pena programarla tú?",
          body: "Si sabes programar y te apetece practicar, sí. Una página hecha a mano es un regalo en sí misma, y se van a notar las horas que te llevó. Dale un enlace que pueda conservar, pruébala en su móvil y no solo en tu portátil, y comprueba que sigue cargando dentro de un año. Si lo que importa es que funcione ese día, usa uno de los formatos de arriba y dedica el fin de semana que te ahorras a la carta.",
        },
      ],
      faq: [
        {
          q: "¿Cómo hago una página web de aniversario para mi novia o mi novio?",
          a: "Elige un formato, añade los dos nombres, vuestras fotos, las fechas, una canción y un mensaje, y publica. Te da un enlace y un código QR para imprimir. No hay nada que programar ni que alojar: se abre en el navegador de su móvil.",
        },
        {
          q: "¿Puedo usar mi propio dominio?",
          a: "No. La página vive en un enlace de tryethos.io. Si te importa tener un dominio con vuestros nombres, cómpralo en cualquier registrador y haz que redirija a ese enlace.",
        },
        {
          q: "¿Puedo ponerle contraseña?",
          a: "Sí, en cualquier formato de pago. La pones en el editor, en Extras, y hay que escribirla antes de que la página se abra.",
        },
        {
          q: "¿La página seguirá online?",
          a: "Sí. Los enlaces están pensados para durar, así que se vuelve a abrir en el próximo aniversario. Entonces puedes añadirle las fotos de este año: los cambios salen en el mismo enlace.",
        },
        freeEs,
      ],
      related: [
        { href: "/occasions/anniversary", label: "Ideas de regalo de aniversario" },
        { href: "/blog/long-distance-anniversary-ideas", label: "Ideas de aniversario a distancia" },
        { href: "/blog/first-anniversary-ideas-for-boyfriend", label: "Ideas para el primer aniversario con tu novio" },
        { href: "/gifts/photo-album", label: "Álbumes de fotos interactivos" },
      ],
    },
  },
  "apology-for-him": {
    en: {
      title: "Apology Gifts for Him That Say What You Did",
      description: "Apology gifts for him that name what happened instead of covering it. Six digital gifts, each with a line to borrow, made tonight and sent as a link.",
      h1: "Apology gifts for him",
      label: "Apology gifts for him",
      hero: {
        line: "There is no default sorry present for him. Make the gift the specific part.",
        sentence: "Each of these carries the details a vague apology skips: the texts you owe, the thing you did, and a plan with a day and an hour on it.",
      },
      ideasTitle: "Six that name it plainly",
      craft: "Sorry, with the details in",
      film: "text-thread",
      lead: [
        "For him there is no default sorry present, and that helps. It leaves room for a gift about what actually happened: the texts you sent at midnight, the evening you missed, the thing you said in the car. Each idea below keeps one of those details in a field of its own, with a line you can borrow.",
        NOTE
          ? "Five of the six cost something: each is a one-time payment for that template, and you can build any of them before deciding. The Letter goes free as a short note of up to 500 characters, which is room for what you did, what changes, and the plan for Friday."
          : "Five of the six cost something: each is a one-time payment for that template, and you can build any of them before deciding. The Letter goes free with the whole letter and up to ten photos, which is room for what you did, what changes, and the plan for Friday.",
      ],
      ideas: [
        {
          template: "text-thread",
          heading: "The messages you owe, sent in order",
          body: "If the fight happened over text, answer it in the same place. Text Thread plays your messages back one after another with the typing dots in between, two to forty of them, photos dropping in as attachments. Start where it went wrong, say plainly what you got wrong, and let the last bubble be the plan for tonight.",
          line: { field: "lines", where: "The first bubble", text: "I reread what I sent you. You were right to go quiet." },
        },
        {
          template: "the-letter",
          heading: "Five sentences under a wax seal",
          brief: NOTE
            ? "Five honest sentences in a free note under a wax seal."
            : "Five honest sentences in a free letter under a wax seal.",
          body: NOTE
            ? "The free note on The Letter is 500 characters, which is about five honest sentences: what you did, what it cost him, what you understand now, what changes, and one line that is just warm. He breaks the seal and it writes itself out. No song is needed, though one can play under it."
            : "The Letter is free with the whole letter, and five honest sentences are about right: what you did, what it cost him, what you understand now, what changes, and one line that is just warm. He breaks the seal and it writes itself out. No song is needed, though one can play under it.",
          line: { field: "freeNote", where: "The whole note", text: "I said it was a joke and it wasn’t funny, least of all to you. I should have stopped the first time you went quiet. I’m sorry. From now on, if you go quiet, I stop and ask. Dinner Friday, your pick, and I’m not bringing it up as a joke ever again." },
        },
        {
          template: "the-council",
          heading: "A hearing that clears his name",
          body: "The Council always tries him, so let the cats acquit him. Charge him with something that is plainly your fault, write findings that all point back at you, and end on the stamp that says pardoned. It owns up with a joke he is allowed to laugh at, and the letter after the verdict is where the real apology goes.",
          line: { field: "charge", where: "The charge", text: "putting up with me on Saturday night" },
        },
        {
          template: "xoxo",
          heading: "Make it up, with the plan in the P.S.",
          brief: "A few plain sentences, already underlined, and the make-up evening in the P.S.",
          body: "An apology goes further with a plan in it. XOXO has room for 220 characters of plain sentences below a nickname spelled in newsprint, and marks some of them with underlines and circles, the way a pen would. Write what you did there, plainly. The P.S. keeps the plan until he taps: give the day, the hour and the place you missed.",
          line: { field: "lines", where: "The lines you’d underline", text: "I said I’d be there at eight and I wasn’t. That one’s on me, not on traffic." },
        },
        {
          template: "on-repeat",
          heading: "The song from before it went wrong",
          brief: "Your song on a player, and a handwritten note asking for what you had before.",
          body: "On Repeat opens on a player with your photo as the album cover and your song on it, then fills into a collage when he presses play. A handwritten note of sixty characters sits under the player. Choose the song you both played before the argument, and use the note to say you would like that back.",
          line: { field: "note", where: "The note under the player", text: "Can we go back to this one? I miss it." },
        },
        {
          template: "fortune-cookie",
          heading: "Three fortunes that promise something specific",
          brief: "Fortunes that are promises he can hold you to, one cookie at a time.",
          body: "An apology can turn every fortune into a promise with a date on it, and Fortune Cookie asks for three or more. He taps each cookie open and the slip slides out. Keep them small and checkable, the kind he can hold you to, and let the last cookie carry your message.",
          line: { field: "fortunes", where: "One of the fortunes", text: "You will get the window seat on every trip until March." },
        },
      ],
      sections: [
        {
          heading: "What to say first, and what to leave out",
          body: "Say what you did in the first line, in plain words, without “if” and without “but”. Leave out what he did; that is a different conversation for a different day. Then one sentence about how it felt on his side, which shows you understood, and one about what you will do differently. Four lines are enough; a page reads as a defense.",
        },
        {
          heading: "When to send it",
          body: "Not in the middle of the argument and not the next morning before you have talked. Send it once you have said sorry out loud, or when he has asked for space and you want him to know you are thinking without asking for an answer. A gift sent too early reads as a way of skipping the conversation.",
        },
        {
          heading: "If he is not ready to open it",
          body: NOTE
            ? "A link waits. He can open it tonight, tomorrow or after a long walk, and it plays from the start every time. Say in the message you send with it that there is no rush and no reply needed. If you want it to open at a set hour, a paid template can be scheduled in the editor; on the free note, scheduling is one of the paid extras."
            : "A link waits. He can open it tonight, tomorrow or after a long walk, and it plays from the start every time. Say in the message you send with it that there is no rush and no reply needed. If you want it to open at a set hour, a paid template can be scheduled in the editor; on the free Letter, scheduling is one of the paid extras.",
        },
      ],
      faq: [
        { q: "What is a good apology gift for a boyfriend?", a: "One that names what happened. A short note that says what you did, a chat that replays the conversation properly, or a plan for making it up with a day and a time on it, rather than an object standing in for the words." },
        { q: "Should an apology gift be expensive?", a: "No. An expensive gift after a fight can read as paying it off. A small gift that is plainly about what happened, and a changed habit after it, do more." },
        { q: "What do I write in an apology note to him?", a: "What you did, why it hurt, what changes. Four or five sentences, no “if you were hurt”, nothing about what he did. End with something warm and small, like a plan for Friday." },
        {
          q: "Can I say sorry with something free?",
          a: NOTE
            ? "The Letter, as a short note of up to 500 characters with a song, costs nothing. Every other gift on this page is a one-time payment for that template, and the editor lets you build the whole thing first."
            : "The Letter, with the whole letter, up to ten photos and a song, costs nothing. Every other gift on this page is a one-time payment for that template, and the editor lets you build the whole thing first.",
        },
      ],
      related: [
        { href: "/occasions/apology", label: "Saying sorry properly" },
        { href: "/blog/how-to-apologize-to-your-boyfriend", label: "How to apologize to your boyfriend" },
        { href: "/blog/sorry-message-for-girlfriend", label: "Sorry messages for a girlfriend" },
        { href: "/gifts/apology-for-her", label: "Apology gifts for her" },
      ],
    },
    es: {
      title: "Regalos para pedirle perdón a tu novio",
      description: "Regalos para pedir perdón a tu novio que nombran lo que pasó en vez de taparlo. Seis regalos digitales con una frase lista, hechos esta noche.",
      h1: "Regalos para pedirle perdón a tu novio",
      label: "Pedir perdón a tu novio",
      hero: {
        line: "No hay un regalo de perdón que sirva para todo. Que el regalo sea lo concreto.",
        sentence: "Cada uno lleva los detalles que una disculpa vaga se salta: los mensajes que debes, lo que hiciste y un plan con día y hora.",
      },
      ideasTitle: "Seis que lo dicen claro",
      craft: "Perdón, con los detalles dentro",
      film: "text-thread",
      lead: [
        "En este caso no hay un regalo de perdón de costumbre, y eso ayuda: deja sitio para uno que trate de lo que pasó de verdad, los mensajes de medianoche, la cena a la que faltaste, lo que dijiste en el coche. Cada idea de abajo guarda uno de esos detalles en un campo propio, con una frase lista.",
        NOTE
          ? "Cinco de los seis cuestan algo: cada uno es un solo pago por esa plantilla, y puedes montar cualquiera antes de decidir. La carta sale gratis como nota corta de hasta 500 caracteres, sitio de sobra para lo que hiciste, lo que va a cambiar y el plan del viernes."
          : "Cinco de los seis cuestan algo: cada uno es un solo pago por esa plantilla, y puedes montar cualquiera antes de decidir. La carta sale gratis completa y con hasta diez fotos, sitio de sobra para lo que hiciste, lo que va a cambiar y el plan del viernes.",
      ],
      ideas: [
        {
          template: "text-thread",
          heading: "Los mensajes que debes, en orden",
          body: "Si la discusión fue por mensajes, contesta en el mismo sitio. Hilo de mensajes reproduce tus mensajes uno tras otro con los puntitos de escribir entre medias, de dos a cuarenta, y las fotos caen como adjuntos. Empieza donde se torció, di claramente en qué te equivocaste y deja que la última burbuja sea el plan de esta noche.",
          line: { field: "lines", where: "La primera burbuja", text: "He releído lo que te mandé. Hiciste bien en callarte." },
        },
        {
          template: "the-letter",
          heading: "Cinco frases bajo un sello de lacre",
          brief: NOTE
            ? "Cinco frases sinceras en una nota gratis bajo un sello de lacre."
            : "Cinco frases sinceras en una carta gratis bajo un sello de lacre.",
          body: NOTE
            ? "La nota gratis de La carta tiene sitio para 500 caracteres, que son unas cinco frases sinceras: lo que hiciste, lo que le costó, lo que entiendes ahora, lo que cambia y una línea que sea solo cariño. Rompe el sello y se escribe sola. No hace falta canción, aunque puede sonar una debajo."
            : "La carta es gratis completa, y con unas cinco frases sinceras basta: lo que hiciste, lo que le costó, lo que entiendes ahora, lo que cambia y una línea que sea solo cariño. Rompe el sello y se escribe sola. No hace falta canción, aunque puede sonar una debajo.",
          line: { field: "freeNote", where: "La nota entera", text: "Dije que era broma y no tuvo gracia, y a ti menos que a nadie. Tenía que haber parado la primera vez que te quedaste en silencio. Lo siento. A partir de ahora, si te callas, paro y te pregunto. Cena el viernes, eliges tú, y no vuelvo a sacarlo en broma." },
        },
        {
          template: "the-council",
          heading: "Un juicio que limpia su nombre",
          body: "El Consejo siempre juzga a quien recibe el regalo, así que deja que los gatos le absuelvan. Acúsale de algo que a todas luces fue culpa tuya, escribe conclusiones que apunten a ti y acaba con el sello de «Indulto». Reconoce la culpa con una broma de la que puede reírse, y la carta de después del veredicto es donde va la disculpa de verdad.",
          line: { field: "charge", where: "El cargo", text: "aguantarme el sábado por la noche" },
        },
        {
          template: "xoxo",
          heading: "Compénsalo, con el plan en la posdata",
          brief: "Unas frases claras, ya subrayadas, y la noche para compensarlo en la posdata.",
          body: "Una disculpa llega más lejos con un plan dentro. XOXO tiene sitio para 220 caracteres de frases claras debajo de un mote en letras de periódico, y marca algunas con subrayados y círculos, como haría un boli. Escribe ahí lo que hiciste, sin rodeos. La posdata guarda el plan hasta que toque la pantalla: pon el día, la hora y el sitio al que faltaste.",
          line: { field: "lines", where: "Las frases que subrayarías", text: "Dije que estaría a las ocho y no estuve. Eso es cosa mía, no del tráfico." },
        },
        {
          template: "on-repeat",
          heading: "La canción de antes de que se torciera",
          brief: "Vuestra canción en un reproductor y una nota a mano que pide lo de antes.",
          body: "En bucle se abre en un reproductor con tu foto de portada y vuestra canción, y al darle al play se llena de collage. Debajo del reproductor cabe una nota a mano de sesenta caracteres. Elige la canción que poníais antes de la discusión y usa la nota para decir que te gustaría recuperar eso.",
          line: { field: "note", where: "La nota bajo el reproductor", text: "¿Volvemos a esta? La echo de menos." },
        },
        {
          template: "fortune-cookie",
          heading: "Tres fortunas que prometen algo concreto",
          brief: "Fortunas que son promesas que puede reclamarte, galleta a galleta.",
          body: "Una disculpa puede convertir cada fortuna en una promesa con fecha, y Galleta de la fortuna pide tres o más. Abre cada galleta con un toque y sale la tira. Que sean pequeñas y comprobables, de las que se pueden reclamar, y que la última galleta lleve tu mensaje.",
          line: { field: "fortunes", where: "Una de las fortunas", text: "Tendrás la ventanilla en todos los viajes hasta marzo." },
        },
      ],
      sections: [
        {
          heading: "Qué decir primero y qué dejar fuera",
          body: "Di lo que hiciste en la primera línea, con palabras sencillas, sin «si» y sin «pero». Deja fuera lo que hizo; eso es otra conversación para otro día. Luego una frase sobre lo que le costó, que demuestra que lo has entendido, y otra sobre lo que vas a hacer distinto. Cuatro líneas bastan; una página se lee como una defensa.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Ni en mitad de la discusión ni a la mañana siguiente antes de haber hablado. Envíalo cuando ya hayas pedido perdón en voz alta, o cuando te haya pedido espacio y quieras que sepa que piensas en ello sin pedirle respuesta. Un regalo enviado demasiado pronto se lee como una forma de saltarse la conversación.",
        },
        {
          heading: "Si todavía no quiere abrirlo",
          body: NOTE
            ? "Un enlace espera. Puede abrirlo esta noche, mañana o después de un paseo largo, y se reproduce desde el principio cada vez. Di en el mensaje con el que lo mandas que no hay prisa ni hace falta contestar. Si quieres que se abra a una hora concreta, una plantilla de pago se programa en el editor; en la nota gratis, programar es uno de los extras de pago."
            : "Un enlace espera. Puede abrirlo esta noche, mañana o después de un paseo largo, y se reproduce desde el principio cada vez. Di en el mensaje con el que lo mandas que no hay prisa ni hace falta contestar. Si quieres que se abra a una hora concreta, una plantilla de pago se programa en el editor; en La carta gratis, programar es uno de los extras de pago.",
        },
      ],
      faq: [
        { q: "¿Qué regalo sirve para pedir perdón de verdad?", a: "Uno que nombre lo que pasó. Una nota corta que diga lo que hiciste, un chat que repita la conversación como debió ser o un plan para compensarlo con día y hora, en vez de un objeto que sustituya a las palabras." },
        { q: "¿Un regalo para pedir perdón tiene que ser caro?", a: "No. Un regalo caro después de una discusión puede leerse como pagar la deuda. Un regalo pequeño que trate claramente de lo que pasó, y una costumbre cambiada después, hacen más." },
        { q: "¿Qué escribo en una nota para pedirle perdón?", a: "Lo que hiciste, lo que le costó y lo que cambia. Cuatro o cinco frases, sin «si te ha molestado» y sin hablar de su parte. Acaba con algo cálido y pequeño, como un plan para el viernes." },
        {
          q: "¿Hay algo gratis para pedir perdón?",
          a: NOTE
            ? "La carta, como nota corta de hasta 500 caracteres con una canción, no cuesta nada. Los demás regalos de esta página son un solo pago por esa plantilla, y el editor te deja montarlo entero antes."
            : "La carta, completa y con hasta diez fotos y una canción, no cuesta nada. Los demás regalos de esta página son un solo pago por esa plantilla, y el editor te deja montarlo entero antes.",
        },
      ],
      related: [
        { href: "/occasions/apology", label: "Pedir perdón como es debido" },
        { href: "/blog/how-to-apologize-to-your-boyfriend", label: "Cómo pedirle perdón a tu novio" },
        { href: "/blog/sorry-message-for-girlfriend", label: "Mensajes para pedirle perdón a tu novia" },
        { href: "/gifts/apology-for-her", label: "Pedir perdón a tu novia" },
      ],
    },
  },
  "apology-for-her": {
    en: {
      title: "Apology Gifts for Her: Flowers That Carry the Sorry",
      description: "Apology gifts for her start with flowers for most people. Six digital gifts that make the default carry a real apology, with lines that fit each field.",
      h1: "Apology gifts for her",
      label: "Apology gifts for her",
      hero: {
        line: "Flowers are what most people think of. Make them carry the sorry.",
        sentence: "The card in a bouquet holds thirty characters, so these gifts give the apology more room: a folded crane, a letter, a garden that ends in a bouquet.",
      },
      ideasTitle: "Six that give the flowers words",
      craft: "Past the card in the bouquet",
      film: "paper-crane",
      lead: [
        "Flowers are fine, and most people start there. The trouble is the card: a few words tucked into the stems, rarely enough for what happened. The ideas below keep the flowers and give them room, inside the bouquet or beside it: a crane with an admission in every fold, a letter, a garden walk to a bouquet.",
        NOTE
          ? "One costs nothing: a short note on The Letter, 500 characters at most. Each of the other five is a single payment for its template, kept for good, and the editor lets you finish one completely before deciding. Pick her colors, not the dozen red roses a florist sells after every fight."
          : "One costs nothing: The Letter, with the whole letter and up to ten photos. Each of the other five is a single payment for its template, kept for good, and the editor lets you finish one completely before deciding. Pick her colors, not the dozen red roses a florist sells after every fight.",
      ],
      ideas: [
        {
          template: "paper-crane",
          heading: "Fold the apology, one crease at a time",
          body: "Paper Crane is slow on purpose: she holds each crease until the paper folds, and if she lets go too soon it springs open. Every fold that lands shows one line of seventy-two characters, six at most. An apology suits that pace. Put one admission on each fold and keep the promise for the line left behind.",
          line: { field: "lines", where: "The line on one fold", text: "I talked over you at dinner, and then again on the way home." },
        },
        {
          template: "bouquet",
          heading: "Thirty characters on the card, used well",
          brief: "The flowers in her colors, plain words on the card, and the full letter behind it.",
          body: "Bouquet builds the default properly: up to 24 stems of her colors, whites and blush if red would feel like too much, gathered on her screen one at a time. The card tucked in holds thirty characters, enough for the plain words and no more, and your full letter opens from it with the rest.",
          line: { field: "cardNote", where: "On the card in the bouquet", text: "I was wrong. Letter inside." },
        },
        {
          template: "the-letter",
          heading: "A letter that starts by naming it",
          body: "Most apology letters open softly and get to the point late; open this one on the point. The Letter has a greeting of sixty characters before the words underneath appear by hand. The wax seal and the handwriting do the gentle part. Add a photo of the two of you if the letter needs a reason to smile.",
          line: { field: "greeting", where: "The greeting", text: "About Saturday, and what I said in the car," },
        },
        {
          template: "garden",
          heading: "A garden walk that ends on a tagged bouquet",
          brief: "A walk past the beds to a bouquet, its tag sixty characters long.",
          body: "The Garden lets the flowers take their time: she walks through a gate, past roses, peonies, wildflowers or sunflowers and a trellis of photos, to your letter on the potting table, and at the end comes a bouquet with a tag of sixty characters. The tag is the last thing she reads, so put the promise there and the admission in the letter.",
          line: { field: "tag", where: "The tag on the bouquet", text: "I’m listening now. All the way to the end." },
        },
        {
          template: "vinyl",
          heading: "Her favorite record, with an honest title",
          brief: "Your song on a turntable, and an album title of forty characters that says it.",
          body: "If there is a song you both know, put it on a record. Vinyl sets it turning on a turntable and keeps up to twelve photos in a crate beside it as album covers. The sleeve’s title holds forty characters: title the album with the apology, or with the joke only she will get, and print your longer words in the liner notes.",
          line: { field: "album", where: "The album’s title", text: "Things I Should Have Said Sooner" },
        },
        {
          template: "sticker-bomb",
          heading: "Label strips that take the blame",
          brief: "Label-maker strips under the stickers, small admissions from silly to real.",
          body: "Small admissions add up. Sticker Bomb lets her slap stickers onto an empty page, and under every other one a label-maker strip appears, twenty-eight characters each, six of them if you add one photo or none. For an apology, make the strips small admissions in order, from the silly to the real, and pick the pack called “The soft ones” so the stickers stay gentle.",
          line: { field: "labels", where: "One label-maker strip", text: "official over-reactor: me" },
        },
      ],
      sections: [
        {
          heading: "What goes on a card of thirty characters",
          body: "Thirty characters is a short sentence, so it cannot hold the apology and should not try. Use it to point: “I was wrong. Letter inside.” or her name and “I’m sorry.” The flowers are the gesture; the card says there is more; the letter, opened from the card, is where you name what happened.",
        },
        {
          heading: "Flowers that do not look like an excuse",
          body: "Red roses after a fight can read as a script. Pick what she would pick: her colors, the flower she points at in stores, whites and blush when you want it quiet. A smaller bunch with the right flowers looks more considered than two dozen of the wrong ones.",
        },
        {
          heading: "After she opens it",
          body: "Do not ask whether she liked it. The gift has said its part; the rest is a conversation, and she sets its pace. If she replies, answer the reply, not the gift. If she does not reply tonight, the link still works tomorrow, and the plan you wrote in it still stands.",
        },
      ],
      faq: [
        { q: "What is a good apology gift for a girlfriend?", a: "Flowers with enough words to carry the apology: a bouquet whose card points to a letter, a paper crane that folds an admission into each crease, a garden walk that ends on a bouquet with your promise on its tag." },
        { q: "Are flowers enough to say sorry?", a: "Only with words. Flowers say you are sorry about something; the card and the letter have to say what. Without that, they can read as a way of avoiding the conversation." },
        { q: "What should I write on an apology card?", a: "On a card of thirty characters, point to the longer message: “I was wrong. Letter inside.” In the letter, name what you did, what it cost her and what you will change." },
        {
          q: "Can I send a free apology?",
          a: NOTE
            ? "Yes. The Letter goes out free as a note with a song, up to 500 characters long. Each of the other gifts here is a single payment for that template, built in full in the editor before you pay."
            : "Yes. The Letter goes out free with a song, the whole letter and up to ten photos. Each of the other gifts here is a single payment for that template, built in full in the editor before you pay.",
        },
      ],
      related: [
        { href: "/occasions/apology", label: "Saying sorry properly" },
        { href: "/blog/sorry-message-for-girlfriend", label: "Sorry messages for a girlfriend" },
        { href: "/blog/how-to-apologize-to-your-boyfriend", label: "How to apologize to your boyfriend" },
        { href: "/gifts/apology-for-him", label: "Apology gifts for him" },
      ],
    },
    es: {
      title: "Regalos para pedirle perdón a tu novia",
      description: "Para pedir perdón a tu novia casi todo el mundo piensa en flores. Seis regalos digitales que hacen que las flores lleven una disculpa de verdad, con frases.",
      h1: "Regalos para pedirle perdón a tu novia",
      label: "Pedir perdón a tu novia",
      hero: {
        line: "Casi todo el mundo piensa en flores. Haz que lleven el perdón.",
        sentence: "La tarjeta de un ramo da para treinta caracteres, así que estos regalos dan más sitio a la disculpa: una grulla doblada, una carta, un jardín con ramo.",
      },
      ideasTitle: "Seis que les ponen palabras a las flores",
      craft: "Más allá de la tarjeta",
      film: "paper-crane",
      lead: [
        "Casi todo el mundo empieza por las flores, y las flores están bien. El problema es la tarjeta: unas pocas palabras entre los tallos, que casi nunca bastan para lo que pasó. Las ideas de abajo se quedan con el ramo y le dan sitio, dentro o al lado: una grulla con algo que reconoces en cada pliegue, una carta, un paseo por un jardín hasta un ramo.",
        NOTE
          ? "Uno no cuesta nada: una nota corta en La carta, de 500 caracteres como mucho. Los otros cinco se pagan una sola vez y lo que compras es la plantilla, para siempre; el editor te deja terminar uno entero antes de decidir. Elige sus colores, no las rosas rojas de después de cada discusión."
          : "Uno no cuesta nada: La carta, completa y con hasta diez fotos. Los otros cinco se pagan una sola vez y lo que compras es la plantilla, para siempre; el editor te deja terminar uno entero antes de decidir. Elige sus colores, no las rosas rojas de después de cada discusión.",
      ],
      ideas: [
        {
          template: "paper-crane",
          heading: "Dobla la disculpa, pliegue a pliegue",
          body: "Grulla de papel va despacio a propósito: cada pliegue se mantiene pulsado hasta que el papel se dobla, y si se suelta antes de tiempo se abre. Cada pliegue que sale muestra una frase de setenta y dos caracteres, seis como mucho. A una disculpa le va ese ritmo. Pon en cada pliegue algo que reconoces y guarda la promesa para la frase que se queda.",
          line: { field: "lines", where: "La frase de un pliegue", text: "Te interrumpí en la cena, y otra vez de vuelta a casa." },
        },
        {
          template: "bouquet",
          heading: "Treinta caracteres en la tarjeta, bien usados",
          brief: "Las flores en sus colores, palabras sencillas en la tarjeta y la carta entera detrás.",
          body: "Ramo hace bien lo de siempre: hasta 24 tallos en sus colores, blancos y rosa palo si el rojo fuera demasiado, que se juntan en su pantalla de uno en uno. La tarjeta de entre los tallos llega a treinta caracteres, lo justo para las palabras sencillas, y tu carta entera se abre desde ella con lo demás.",
          line: { field: "cardNote", where: "En la tarjeta del ramo", text: "Me equivoqué. Dentro, la carta" },
        },
        {
          template: "the-letter",
          heading: "Una carta que empieza nombrándolo",
          body: "Casi todas las cartas de disculpa empiezan con suavidad y llegan tarde al asunto; empieza esta por el asunto. La carta tiene un saludo de sesenta caracteres antes de que las palabras de debajo aparezcan a mano. El sello de lacre y la letra a mano ya ponen la parte suave. Añade una foto de los dos si la carta necesita un motivo para sonreír.",
          line: { field: "greeting", where: "El saludo", text: "Sobre el sábado, y lo que dije en el coche:" },
        },
        {
          template: "garden",
          heading: "Un jardín que acaba en un ramo",
          brief: "Un paseo entre parterres hasta un ramo con una etiqueta de sesenta caracteres.",
          body: "El jardín deja que las flores se tomen su tiempo: se entra por una verja, se pasa entre rosas, peonías, flores silvestres o girasoles y un enrejado de fotos hasta tu carta en la mesa del invernadero, y al final hay un ramo con una etiqueta de sesenta caracteres. La etiqueta es lo último que se lee, así que pon ahí la promesa y en la carta lo que reconoces.",
          line: { field: "tag", where: "La etiqueta del ramo", text: "Ahora te escucho. Hasta el final." },
        },
        {
          template: "vinyl",
          heading: "Su disco favorito, con un título sincero",
          brief: "Vuestra canción en un tocadiscos y un título de álbum de cuarenta caracteres que lo dice.",
          body: "Si hay una canción que conocéis los dos, ponla en un disco. Vinilo la hace girar en un tocadiscos y guarda hasta doce fotos en una caja al lado como portadas. El título de la funda admite cuarenta caracteres: titula el álbum con la disculpa, o con la broma que solo pilláis vosotros, e imprime tus palabras largas en el libreto.",
          line: { field: "album", where: "El título del álbum", text: "Cosas que tenía que haber dicho antes" },
        },
        {
          template: "sticker-bomb",
          heading: "Tiras de rotuladora que se echan la culpa",
          brief: "Tiras de rotuladora bajo los stickers, cosas pequeñas que reconoces, de la tonta a la de verdad.",
          body: "Lo pequeño que reconoces también suma. Bomba de Stickers le deja pegar stickers en una página vacía, y bajo uno de cada dos aparece una tira de rotuladora de veintiocho caracteres, seis si añades una foto o ninguna. Para pedir perdón, que las tiras sean pequeñas cosas que reconoces, en orden, de la tonta a la de verdad, y elige el pack Los tiernos para que los stickers sean suaves.",
          line: { field: "labels", where: "Una tira de rotuladora", text: "exagero, lo reconozco" },
        },
      ],
      sections: [
        {
          heading: "Qué cabe en una tarjeta de treinta caracteres",
          body: "Treinta caracteres son una frase corta, así que no caben en ellos la disculpa ni deberían intentarlo. Úsalos para señalar: «Me equivoqué. Dentro, la carta», o su nombre y «Lo siento». Las flores son el gesto; la tarjeta dice que hay más; la carta, que se abre desde la tarjeta, es donde nombras lo que pasó.",
        },
        {
          heading: "Flores que no parezcan una excusa",
          body: "Rosas rojas después de una discusión pueden parecer un guion. Elige lo que escogería sin pensarlo: sus colores, la flor que señala en las floristerías, blancos y rosa palo si lo quieres tranquilo. Un ramo más pequeño con las flores justas parece más pensado que dos docenas de las equivocadas.",
        },
        {
          heading: "Cuando lo abra",
          body: "No preguntes si le ha gustado. El regalo ya ha dicho su parte; lo demás es una conversación, y el ritmo no lo marcas tú. Si contesta, responde a la respuesta, no al regalo. Si esta noche no contesta, el enlace sigue funcionando mañana, y el plan que escribiste sigue en pie.",
        },
      ],
      faq: [
        { q: "¿Qué regalo sirve para pedir perdón con flores?", a: "Flores con palabras suficientes para llevar la disculpa: un ramo cuya tarjeta lleva a una carta, una grulla de papel con algo que reconoces en cada pliegue, un paseo por un jardín que acaba en un ramo con tu promesa en la etiqueta." },
        { q: "¿Bastan unas flores para pedir perdón?", a: "Solo con palabras. Las flores dicen que lo sientes por algo; la tarjeta y la carta tienen que decir por qué. Sin eso, pueden leerse como una forma de evitar la conversación." },
        { q: "¿Qué pongo en una tarjeta para pedir perdón?", a: "En una tarjeta de treinta caracteres, señala el mensaje largo: «Me equivoqué. Dentro, la carta». En la carta, di qué hiciste, qué le costó y qué vas a cambiar." },
        {
          q: "¿Puedo pedir perdón con algo gratis?",
          a: NOTE
            ? "Sí. La carta sale gratis como nota con canción, de hasta 500 caracteres. Cada uno de los demás regalos de aquí es un solo pago por su plantilla, y se monta entero en el editor antes de pagar."
            : "Sí. La carta sale gratis con canción, completa y con hasta diez fotos. Cada uno de los demás regalos de aquí es un solo pago por su plantilla, y se monta entero en el editor antes de pagar.",
        },
      ],
      related: [
        { href: "/occasions/apology", label: "Pedir perdón como es debido" },
        { href: "/blog/sorry-message-for-girlfriend", label: "Mensajes para pedirle perdón a tu novia" },
        { href: "/blog/how-to-apologize-to-your-boyfriend", label: "Cómo pedirle perdón a tu novio" },
        { href: "/gifts/apology-for-him", label: "Pedir perdón a tu novio" },
      ],
    },
  },
  "long-distance-care-package": {
    en: {
      title: "Long-Distance Care Package Ideas, and the Gift Inside",
      description: "What to put in a long-distance care package, what mailing does to it, and a digital gift they open by scanning the QR card on top of the box.",
      h1: "Long-distance care package ideas",
      label: "Long-distance care packages",
      hero: {
        line: "Fill the box with things to touch. Put the words in the link.",
        sentence: "Ethos mails nothing: you send the box yourself, and the gift inside is a link on a printed QR card, the first thing they scan.",
      },
      ideasTitle: "Six gifts to lay on top of the box",
      craft: "Packing, mailing and timing it",
      film: "halfway",
      lead: [
        "A care package is the part of a long-distance relationship you can hold: snacks from your side, a T-shirt that smells like home, a candle, a book with notes in the margin. What Ethos adds is the part a box cannot carry, a gift on their phone, which you print as a small card with a QR code and lay on top.",
        NOTE
          ? "The card comes from the gift itself: once it is published, its QR code can be printed as a Print-ready card, and the same card is under QR card in My gifts. It prints two postcard-size cards to a page, on cream, white, blush or sage, with two lines of your own. One gift here is free, The Letter as a short note; each of the others is a one-time payment for that template."
          : `The card comes from the gift itself: once it is published, its QR code can be printed as a Print-ready card, and the same card is under QR card in My gifts. It prints two postcard-size cards to a page, on cream, white, blush or sage, with two lines of your own. Free here: ${freeNames("en")}; each of the others is a one-time payment for that template.`,
      ],
      ideas: [
        {
          template: "halfway",
          heading: "The distance in big numbers, with a note",
          brief: "The real distance in big numbers, a note on what is halfway, and a countdown if you like.",
          body: "Halfway shows the real distance between your two cities in big numbers, with a note of 120 characters about what is halfway, and you can switch on a countdown to the second you arrive. In a care package it answers the question the box cannot: when. Put the date of the next visit on it, and photos taped beside the letter.",
          line: { field: "halfwayNote", where: "The halfway note", text: "Halfway is a train station I have never seen. In 19 days I will be past it." },
        },
        {
          template: "the-letter",
          heading: "A note for when the box is empty",
          body: NOTE
            ? "Some things in a care package run out in a day. The free note on The Letter does not: 500 characters under a wax seal, written out by hand on their screen, with a song if you like. Write it for the moment the box is empty and the room is quiet, and tell them what is in it they might miss."
            : "Some things in a care package run out in a day. The free Letter does not: the whole letter under a wax seal, written out by hand on their screen, with a song if you like. Write it for the moment the box is empty and the room is quiet, and tell them what is in it they might miss.",
          line: { field: "freeNote", where: "The whole note", text: "The box is empty now, I know. The tea is the one from the café on the corner, the socks are the ugly ones you like, and the photo is from the night of the storm. I packed it on Sunday and missed you the whole time. Eat the chocolate first. Call me when you’ve read this." },
        },
        {
          template: "jar-of-reasons",
          heading: "A jar of notes to open after the snacks",
          brief: "Folded notes shaken out one at a time, for the weeks after the box.",
          body: "Jar of Reasons is a glass jar of folded notes that come out one at a time when they shake the phone or tap the glass, a hundred at most. It pairs well with a box: the physical things for the first evening, the jar for the weeks after, one note on each bad day.",
          line: { field: "reasons", where: "One note in the jar", text: "For a bad Monday: you are better at this than you think." },
        },
        {
          template: "passport",
          heading: "Stamp the route the box will take",
          brief: "A passport of photos whose route is the box’s own journey to their door.",
          body: "The box travels too, so give it a passport: Passport stamps one photo per page, up to ten, and draws a route of up to six stopovers. Make the route the box’s own journey, town by town from yours to theirs, since each stopover has to be a real place the map can find, and the visa page at the end opens on your message.",
          line: { field: "stops", where: "One stopover", text: "Berlin" },
        },
        {
          template: "constellations",
          heading: "Stars for the visits, a clock for the box",
          brief: "A star for each visit so far, and a countdown to the evening the box lands.",
          body: "Tracking numbers are vague; a countdown is not. Constellations makes a star of each photo, three to twelve, one for every visit, and draws lines between them until a heart, an infinity sign or a star is whole, when your last line appears. Add a countdown in the editor, set to the evening the parcel is due, or to the last day of the courier’s window.",
          line: { field: "finalLine", where: "The line when it completes", text: "Nine visits, one sky. The box is the tenth thing I’ve sent you this year." },
        },
        {
          template: "vinyl",
          heading: "Music for unpacking, on a record",
          brief: "Your song on a turntable, with a side label naming it unpacking music.",
          body: "Something has to play while they unpack. Vinyl puts your song on a turntable that turns while it plays, with up to twelve photos in a crate and your message in the liner notes. The side label takes twelve characters: name it for the job, unpacking music, and choose the song you would put on if you were there to open it with them.",
          line: { field: "side", where: "The side label", text: "Unpack to me" },
        },
      ],
      sections: [
        {
          heading: "What to pack",
          body: "Pack things for three senses: something to eat from your side, something to wear that has been worn, something to smell, a candle or your soap. Add one thing that only makes sense to the two of you, a ticket stub or a takeout menu. Keep it light enough to mail cheaply, and put the card with the QR code on top.",
        },
        {
          heading: "What mailing and customs do to a box",
          body: "Across a border, food is the risk: fresh food, anything homemade and meat are often stopped, and sealed packaged snacks usually pass. Fill out the customs form honestly as a gift and list everything. Parcels take days to weeks, so nothing should melt, spill or expire, and the gift on the phone does not depend on when the box arrives.",
        },
        {
          heading: "When to send the link",
          body: "Either lay the printed card on top, so scanning it is the first thing they do, or keep the link back and send it the minute they tell you the box has come. If you know the delivery day, a paid gift can be set to open at an hour in their evening, so the box and the gift arrive together.",
        },
      ],
      faq: [
        { q: "Does Ethos mail the care package?", a: "No. You pack and mail the box yourself; Ethos makes the digital gift that goes with it, as a link and as a printed card with its QR code." },
        { q: "How do I put a digital gift inside a physical box?", a: "Publish the gift, then print its QR code as a Print-ready card from the share screen, or later under QR card in My gifts. It prints two postcard-size cards to a page; lay one on top of the box." },
        { q: "Can the gift open when the box arrives?", a: "Yes, on a paid gift: in the editor, under Extras, switch on “Schedule the reveal” and set the date, the hour and their time zone. Until then the card’s link shows a countdown." },
        { q: "What should I put in a long-distance care package?", a: "Something to eat from your side, something worn, something that smells of you, and one thing that only the two of you understand. Pack what weighs little and survives a week in transit." },
      ],
      related: [
        { href: "/occasions/long-distance", label: "Long-distance gift ideas" },
        { href: "/blog/long-distance-relationship-gifts", label: "Long-distance relationship gifts" },
        { href: "/gifts/video-message", label: "Video message gifts" },
        { href: "/long-distance", label: "Long distance, the room" },
      ],
    },
    es: {
      title: "Ideas para una caja sorpresa a distancia",
      description: "Qué meter en una caja para tu pareja a distancia, qué le hace el envío y un regalo digital que se abre escaneando la tarjeta QR de encima de la caja.",
      h1: "Ideas para una caja sorpresa a distancia",
      label: "Cajas sorpresa a distancia",
      hero: {
        line: "Llena la caja de cosas que tocar. Las palabras, en el enlace.",
        sentence: "Ethos no envía nada por correo: el paquete lo mandas tú, y el regalo es un enlace en una tarjeta QR impresa, lo primero que se escanea.",
      },
      ideasTitle: "Seis regalos para poner encima de la caja",
      craft: "Preparar, enviar y elegir el momento",
      film: "halfway",
      lead: [
        "Una caja sorpresa es la parte de una relación a distancia que se puede tocar: algo de picar de tu lado, una camiseta que huele a casa, una vela, un libro con notas en los márgenes. Lo que añade Ethos es lo que una caja no puede llevar, un regalo en su móvil, que imprimes como tarjetita con un código QR y pones encima.",
        NOTE
          ? "La tarjeta sale del propio regalo: una vez publicado, su código QR se imprime como Tarjeta lista para imprimir, y la misma tarjeta está en Tarjeta QR, en Mis regalos. Imprime dos tarjetas A6 por página, en papel crema, blanco, rosa o salvia, con dos líneas tuyas. Un regalo de aquí es gratis, La carta como nota corta; cada uno de los demás es un solo pago por esa plantilla."
          : `La tarjeta sale del propio regalo: una vez publicado, su código QR se imprime como Tarjeta lista para imprimir, y la misma tarjeta está en Tarjeta QR, en Mis regalos. Imprime dos tarjetas A6 por página, en papel crema, blanco, rosa o salvia, con dos líneas tuyas. Gratis aquí: ${freeNames("es")}; cada uno de los demás es un solo pago por esa plantilla.`,
      ],
      ideas: [
        {
          template: "halfway",
          heading: "La distancia, en números grandes, con una nota",
          brief: "La distancia real en números grandes, una nota sobre el punto medio y, si quieres, una cuenta atrás.",
          body: "A medio camino enseña la distancia real entre vuestras dos ciudades en números grandes, con una nota de 120 caracteres sobre lo que queda a mitad, y puedes activar una cuenta atrás hasta el segundo en que llegas. En una caja sorpresa responde a lo que la caja no puede: cuándo. Pon ahí la fecha de la próxima visita, y fotos pegadas junto a la carta.",
          line: { field: "halfwayNote", where: "La nota del punto medio", text: "A mitad hay una estación de tren que nunca he visto. En 19 días la habré pasado." },
        },
        {
          template: "the-letter",
          heading: "Una nota para cuando la caja esté vacía",
          body: NOTE
            ? "Algunas cosas de una caja se acaban en un día. La nota gratis de La carta no: 500 caracteres bajo un sello de lacre, escritos a mano en su pantalla, con una canción si quieres. Escríbela para el momento en que la caja está vacía y la habitación en silencio, y cuéntale qué hay dentro que quizá no vea."
            : "Algunas cosas de una caja se acaban en un día. La carta gratis no: la carta entera bajo un sello de lacre, escrita a mano en su pantalla, con una canción si quieres. Escríbela para el momento en que la caja está vacía y la habitación en silencio, y cuéntale qué hay dentro que quizá no vea.",
          line: { field: "freeNote", where: "La nota entera", text: "Ya está vacía, lo sé. El té es el del café de la esquina, los calcetines son los feos que te gustan y la foto es de la noche de la tormenta. La preparé el domingo y te eché de menos todo el rato. Cómete el chocolate primero. Llámame cuando leas esto." },
        },
        {
          template: "jar-of-reasons",
          heading: "Un frasco de notas para después de picar",
          brief: "Notas dobladas que salen de una en una, para las semanas después de la caja.",
          body: "En Frasco de razones las notas dobladas esperan en un tarro de cristal y caen de una en una al agitar el móvil o tocar el tarro, cien como mucho. Combina bien con una caja: las cosas de verdad para la primera noche, el frasco para las semanas siguientes, una nota cada día malo.",
          line: { field: "reasons", where: "Una nota del frasco", text: "Para un lunes malo: lo haces mejor de lo que crees." },
        },
        {
          template: "passport",
          heading: "Sella la ruta que hará la caja",
          brief: "Un pasaporte de fotos cuya ruta es el propio viaje de la caja hasta su puerta.",
          body: "La caja también viaja, así que dale un pasaporte: Pasaporte sella una foto por página, hasta diez, y traza una ruta de hasta seis escalas. Haz que la ruta sea el viaje de la propia caja, ciudad a ciudad de la tuya a la suya, porque cada escala tiene que ser un sitio real que el mapa encuentre, y la página del visado del final se abre con tu mensaje.",
          line: { field: "stops", where: "Una escala", text: "Berlín" },
        },
        {
          template: "constellations",
          heading: "Estrellas por las visitas, un reloj para la caja",
          brief: "Una estrella por cada visita y una cuenta atrás hasta la tarde en que llega la caja.",
          body: "Los números de seguimiento son vagos; una cuenta atrás, no. Constelaciones hace una estrella de cada foto, de tres a doce, una por visita, y traza líneas entre ellas hasta completar un corazón, un infinito o una estrella, y entonces aparece tu última frase. Añade una cuenta atrás en el editor, puesta en la tarde en que llega el paquete o en el último día de la franja de entrega.",
          line: { field: "finalLine", where: "La frase al completarse", text: "Nueve visitas, un cielo. La caja es lo décimo que te mando este año." },
        },
        {
          template: "vinyl",
          heading: "Música para desempaquetar, en un disco",
          brief: "Vuestra canción en un tocadiscos, con una etiqueta que la llama música para abrir cajas.",
          body: "Algo tiene que sonar mientras se abre la caja. Vinilo pone tu canción en un tocadiscos que gira mientras suena, con hasta doce fotos en una caja y tu mensaje en el libreto. La etiqueta de la cara da para doce caracteres: nómbrala por su función y elige la canción que pondrías si estuvieras ahí cuando se abra.",
          line: { field: "side", where: "La etiqueta de la cara", text: "Para abrirla" },
        },
      ],
      sections: [
        {
          heading: "Qué meter",
          body: "Mete cosas para tres sentidos: algo de comer de tu lado, una camiseta que hayas llevado puesta, algo que huela, una vela o tu jabón. Añade una cosa que solo tenga sentido para vosotros, una entrada o la carta de un sitio de comida para llevar. Que pese poco para que el envío sea barato, y pon encima la tarjeta con el código QR.",
        },
        {
          heading: "Qué pasa con la caja en el envío y en la aduana",
          body: "Si cruza una frontera, el riesgo es la comida: lo fresco, lo casero o la carne a menudo se retienen, y los dulces envasados y cerrados suelen pasar. Rellena la declaración de aduana con sinceridad, como regalo, y enumera todo. Un paquete tarda días o semanas, así que nada debe derretirse, derramarse ni caducar, y el regalo del móvil no depende de cuándo llegue la caja.",
        },
        {
          heading: "Cuándo mandar el enlace",
          body: "O pones la tarjeta impresa encima, para que escanearla sea lo primero que haga, o te guardas el enlace y lo mandas en cuanto te diga que ha llegado la caja. Si sabes el día de entrega, un regalo de pago puede programarse para abrirse a una hora de su tarde, y la caja y el regalo llegan juntos.",
        },
      ],
      faq: [
        { q: "¿Ethos envía la caja?", a: "No. La caja la preparas y la mandas tú; Ethos hace el regalo digital que va con ella, como enlace y como tarjeta impresa con su código QR." },
        { q: "¿Cómo meto un regalo digital en una caja de verdad?", a: "Publica el regalo y luego imprime su código QR como Tarjeta lista para imprimir desde la pantalla de compartir, o más tarde en Tarjeta QR, en Mis regalos. Imprime dos tarjetas A6 por página; pon una encima de la caja." },
        { q: "¿Puede abrirse el regalo cuando llegue la caja?", a: "Sí, en un regalo de pago: en el editor, en Extras, activa «Programar la apertura» y pon la fecha, la hora y su zona horaria. Hasta entonces el enlace de la tarjeta muestra una cuenta atrás." },
        { q: "¿Qué meto en una caja sorpresa a distancia?", a: "Algo de comer de tu lado, algo de ropa usada, algo que huela a ti y una cosa que solo entendáis vosotros. Elige lo que pese poco y aguante una semana de viaje en su envase." },
      ],
      related: [
        { href: "/occasions/long-distance", label: "Regalos a distancia" },
        { href: "/blog/long-distance-relationship-gifts", label: "Regalos para una relación a distancia" },
        { href: "/gifts/video-message", label: "Regalos con vídeo" },
        { href: "/long-distance", label: "A distancia, la sala" },
      ],
    },
  },
  surprise: {
    en: {
      title: "Surprise Gifts You Can Send Online, Each With a Reveal",
      description: "Surprise gifts to send online for a boyfriend or girlfriend, each with a real reveal: foil to scratch, a clock that opens it, clues, a cookie to crack.",
      h1: "Surprise gifts you can send online",
      label: "Surprise gifts",
      hero: {
        line: "A surprise needs a reveal. Each gift here gives you somewhere to hide one.",
        sentence: "Foil rubbed off, a clock that runs out, clues before a destination, a cookie cracked, a globe shaken: each gift hides its news until they do something.",
      },
      ideasTitle: "Seven reveals, each a different kind",
      craft: "Keeping the surprise a surprise",
      film: "scratch-card",
      lead: [
        "A surprise sent online works when there is something to uncover. Each gift on this page has its own reveal, and they are different on purpose: one is scratched, one waits for a clock, one is a trail of clues, one is shaken loose. Pick the one that matches the news, and the news goes in the part that is revealed last.",
        NOTE
          ? "A gift can also be sent early and open by itself on a set day and hour, which turns any of these into a surprise that arrives at midnight. Every gift here but the free short note on The Letter is a one-time payment for that template, and the schedule comes with it; you can build and watch the whole thing in the editor first."
          : "A gift can also be sent early and open by itself on a set day and hour, which turns any of these into a surprise that arrives at midnight. Every gift here but The Letter, which is free, is a one-time payment for that template, and the schedule comes with it; you can build and watch the whole thing in the editor first.",
      ],
      ideas: [
        {
          template: "scratch-card",
          heading: "Foil to rub off, with a hint on it",
          brief: "Photos under foil that a fingertip rubs away, with a hint written on the foil.",
          body: "Scratch Card is the plainest reveal there is: a photo under foil that comes away under a fingertip, card after card, and a headline on the last one for the news. The foil itself carries thirty characters, so write the hint there, where they read it before they scratch. Up to twelve photos, at least one.",
          line: { field: "foilText", where: "The words on the foil", text: "the news is on the last card" },
        },
        {
          template: "midnight-countdown",
          heading: "A clock that opens it on the second",
          body: "With Midnight Countdown the reveal is time. A live clock runs down under a sky that darkens; nothing is shown until zero, and then the fireworks go and the photos and your words open together. Set it for midnight on their birthday, or for the minute you land. The line at zero takes sixty characters.",
          line: { field: "zeroLine", where: "The line at zero", text: "Look outside. I’m early." },
        },
        {
          template: "pack-your-bags",
          heading: "Clues on luggage tags, then the destination",
          brief: "Up to five clues on luggage tags, then a departures board names the place.",
          body: "A trip comes out by degrees in Pack Your Bags: up to five clues on luggage tags, read one at a time, before a departures board names the place. Choose plane, train or road trip and put the date on the ticket; when they tear its stub, your letter is underneath, the place to say why there.",
          line: { field: "clues", where: "One luggage tag", text: "Pack something you can swim in" },
        },
        {
          template: "the-letter",
          heading: "A sealed letter with a last message to tap",
          brief: "A wax seal, then a last message that opens with a tap, a hold or a shake.",
          body: "The Letter has two reveals: a wax seal they break to read, and after your words a last message that opens with a tap, a hold or a shake, up to 600 characters. Put the surprise there and keep the letter itself calm, so it comes out of nowhere. The sign-off sits just above your name.",
          line: { field: "signOff", where: "The sign-off", text: "Read to the end. There’s one more thing" },
        },
        {
          template: "fortune-cookie",
          heading: "Cookies that tease, and one that tells",
          brief: "Cookies cracked with a tap: fortunes that tease, and the news in the last one.",
          body: "Three to twenty cookies sit on the plate in Fortune Cookie, and each cracks with a tap to a slip with one of your fortunes. The last one on the plate holds your message, so the news goes there: the date of the trip, the flight number, the table. The lucky numbers print the same on every slip, so leave them out of it, and let the fortunes tease.",
          line: { field: "fortunes", where: "One of the fortunes", text: "Something is booked. Keep the 14th free." },
        },
        {
          template: "snow-globe",
          heading: "Shake the globe, a line when snow settles",
          brief: "Shake the phone and a line appears each time the snow settles, four at most.",
          body: "Shake the phone and the snow flies; on a phone that cannot feel a shake, a button in Snow Globe does it. Each time the snow settles a new line appears, four at most, with a photo in the snow between them. The brass plaque on the base holds forty-four characters. Keep the surprise for the last line and name it on the plaque.",
          line: { field: "plaque", where: "The brass plaque", text: "The winter we finally met in person" },
        },
        {
          template: "jar-of-reasons",
          heading: "A jar shaken until the last note falls",
          brief: "Notes shaken out one at a time, the news saved for the last one.",
          body: "Here a shake, or a tap, lets one folded note fall out of Jar of Reasons at a time until the jar is empty and your letter is underneath. For a surprise, number the notes on the jar’s label, forty characters, so they know a last one is coming, and save the news for it.",
          line: { field: "label", where: "The jar’s label", text: "12 notes. Save the last one." },
        },
      ],
      sections: [
        {
          heading: "Hide the news in the last thing they see",
          body: "Every gift here has an order, and the news goes at the end of it: the last card, the last note, the line at zero, the letter under the ticket’s stub. Anything said earlier is a hint, not a spoiler. Read the whole gift through once in the preview and check nothing before the end gives it away.",
        },
        {
          heading: "Midnight, or the minute it matters",
          body: "A surprise works best at a time that means something: midnight on the day, the minute your train gets in, the hour you met. Midnight Countdown is built around that moment; for the other gifts, the schedule in the editor, which comes with a paid template, holds the whole gift back until the hour you choose, in their time zone.",
        },
        {
          heading: "What a surprise should not be",
          body: "Not a test, not a public stunt, not news that needs a conversation first. A surprise gift is for good news: a trip, a visit, tickets, a plan already made. If the news could upset them, tell them in person and send the gift after.",
        },
      ],
      faq: [
        { q: "What is a good online surprise for a boyfriend or girlfriend?", a: "A gift with a reveal built in: photos under foil, a clock that opens at midnight, clues to a trip, a last message that appears with a shake. Put the news in what they see last." },
        { q: "Can I send it now and have it open on the day?", a: "Yes, as part of a paid gift. In the editor, under Extras, switch on “Schedule the reveal” and pick the date, the hour and their time zone. Until then the link shows a running countdown, and at the moment it opens by itself." },
        { q: "Does any of these need a motion sensor?", a: "No. Snow Globe and Jar of Reasons are best shaken, and both work on a phone that cannot feel it: the globe has a button, the jar a tap. The rest are tapped, scratched or simply watched." },
        { q: "How do I keep it a surprise until they open it?", a: "Send the link with a plain message, nothing about what is inside. If the gift is scheduled, the page they land on before the hour says only that something is waiting and when it opens." },
      ],
      related: [
        { href: "/blog/how-to-surprise-your-girlfriend", label: "How to surprise your girlfriend" },
        { href: "/blog/midnight-birthday-surprise-ideas", label: "Midnight birthday surprise ideas" },
        { href: "/blog/surprise-trip-reveal-ideas", label: "Surprise trip reveal ideas" },
        { href: "/gifts/last-minute", label: "Last-minute gifts" },
        { href: "/occasions/birthday", label: "Birthday gift ideas" },
      ],
    },
    es: {
      title: "Regalos sorpresa para enviar online",
      description: "Regalos sorpresa para enviar online a tu pareja, cada uno con algo que destapar: una capa que rascar, un reloj que lo abre, pistas, una galleta que partir.",
      h1: "Regalos sorpresa para enviar online",
      label: "Regalos sorpresa",
      hero: {
        line: "Una sorpresa necesita dónde esconderse. Cada regalo de aquí le guarda un sitio.",
        sentence: "Una capa que se rasca, un reloj que llega a cero, una galleta partida: cada regalo guarda la noticia hasta que hace algo.",
      },
      ideasTitle: "Siete formas de destapar una sorpresa",
      craft: "Que la sorpresa siga siéndolo",
      film: "scratch-card",
      lead: [
        "Una sorpresa enviada por internet funciona cuando hay algo que destapar. Cada regalo de esta página destapa la sorpresa a su manera, y son distintas a propósito: uno se rasca, otro espera a un reloj, otro es un rastro de pistas, otro se suelta agitando. Elige el que encaje con la noticia, y la noticia va en lo último que se descubre.",
        NOTE
          ? "Un regalo también puede enviarse antes y abrirse solo un día y a una hora fijados, lo que convierte cualquiera de estos en una sorpresa que llega a medianoche. Todos los regalos de aquí salvo la nota corta gratis de La carta son un solo pago por esa plantilla, y la programación va incluida; antes puedes montarlo y verlo entero en el editor."
          : "Un regalo también puede enviarse antes y abrirse solo un día y a una hora fijados, lo que convierte cualquiera de estos en una sorpresa que llega a medianoche. Todos los regalos de aquí salvo La carta, que es gratis, son un solo pago por esa plantilla, y la programación va incluida; antes puedes montarlo y verlo entero en el editor.",
      ],
      ideas: [
        {
          template: "scratch-card",
          heading: "Una capa que rascar, con una pista escrita",
          brief: "Fotos bajo una capa que se quita con la yema del dedo, con una pista escrita en ella.",
          body: "Rasca y gana es la sorpresa más sencilla de destapar: una foto bajo una capa que se va con la yema del dedo, tarjeta tras tarjeta, y un titular en la última para la noticia. La propia capa lleva treinta caracteres, así que escribe ahí la pista, que se lee antes de rascar. Hasta doce fotos, una como mínimo.",
          line: { field: "foilText", where: "Las palabras de la capa", text: "la noticia, en la última" },
        },
        {
          template: "midnight-countdown",
          heading: "Un reloj que lo abre al segundo que elijas",
          body: "Con Cuenta atrás de medianoche, lo que destapa la sorpresa es el tiempo. Un reloj en marcha baja bajo un cielo que se oscurece; no se ve nada hasta el cero, y entonces salen los fuegos y se abren a la vez las fotos y tus palabras. Ponla a medianoche de su cumpleaños o al minuto en que aterrizas. La frase del cero llega a sesenta caracteres.",
          line: { field: "zeroLine", where: "La frase del cero", text: "Asómate. He llegado antes." },
        },
        {
          template: "pack-your-bags",
          heading: "Pistas en etiquetas de maleta, y luego el destino",
          brief: "Hasta cinco pistas en etiquetas de maleta, y un panel de salidas dice el sitio.",
          body: "En Haz la maleta, el viaje se desvela poco a poco: hasta cinco pistas en etiquetas de equipaje, leídas de una en una, antes de que un panel de salidas diga el sitio. Elige avión, tren o coche y pon la fecha en el billete; al arrancar la matriz, tu carta está debajo, el sitio para decir por qué allí.",
          line: { field: "clues", where: "Una etiqueta de maleta", text: "No olvides el bañador" },
        },
        {
          template: "the-letter",
          heading: "Una carta sellada con un último mensaje que tocar",
          brief: "Un sello de lacre y luego un último mensaje que se abre con un toque, pulsando o agitando.",
          body: "La carta guarda dos sorpresas: un sello de lacre que se rompe para leer y, después de tus palabras, un último mensaje que se abre con un toque, pulsando o agitando, de hasta 600 caracteres. Pon ahí la sorpresa y deja tranquila la carta, para que llegue sin avisar. La despedida va justo encima de tu nombre.",
          line: { field: "signOff", where: "La despedida", text: "Lee hasta el final. Queda una cosa más" },
        },
        {
          template: "fortune-cookie",
          heading: "Galletas que insinúan, y una que lo cuenta",
          brief: "Galletas que se parten con un toque: fortunas que insinúan y la noticia en la última.",
          body: "En el plato de Galleta de la fortuna hay de tres a veinte galletas, y cada una se parte con un toque y suelta una tira con una de tus fortunas. La última del plato guarda tu mensaje, así que la noticia va ahí: la fecha del viaje, el número de vuelo, la mesa. Los números de la suerte salen iguales en todas las tiras; déjalos al margen, y que las fortunas solo insinúen.",
          line: { field: "fortunes", where: "Una de las fortunas", text: "Hay algo reservado. Deja libre el día 14." },
        },
        {
          template: "snow-globe",
          heading: "Agita la bola y sale una frase",
          brief: "Al agitar el móvil aparece una frase cada vez que se posa la nieve, cuatro como mucho.",
          body: "Al agitar el móvil, la nieve vuela; en un móvil que no lo nota, lo hace un botón de Bola de nieve. Cada vez que se posa la nieve aparece una frase nueva, cuatro como mucho, con una foto entre la nieve. La placa de latón de la base admite cuarenta y cuatro caracteres. Guarda la sorpresa para la última frase y ponle nombre en la placa.",
          line: { field: "plaque", where: "La placa de latón", text: "El invierno en que por fin nos vimos" },
        },
        {
          template: "jar-of-reasons",
          heading: "Un frasco que se agita hasta la última nota",
          brief: "Notas que salen de una en una al agitar, con la noticia guardada para la última.",
          body: "Aquí basta agitar o tocar para que caiga de Frasco de razones una nota doblada cada vez hasta que el frasco queda vacío y tu carta está debajo. Para una sorpresa, numera las notas en la etiqueta del frasco, cuarenta caracteres, para que se sepa que llega una última, y guarda la noticia para ella.",
          line: { field: "label", where: "La etiqueta del frasco", text: "12 notas. Guarda la última." },
        },
      ],
      sections: [
        {
          heading: "Esconde la noticia al final",
          body: "Cada regalo de aquí tiene un orden, y la noticia va al final: la última tarjeta, la última nota, la frase del cero, la carta bajo la matriz del billete. Lo que se diga antes es una pista, no un destripe. Míralo entero una vez en la vista previa y comprueba que nada antes del final lo desvela.",
        },
        {
          heading: "A medianoche, o en el minuto que importa",
          body: "Una sorpresa llega mejor a una hora que signifique algo: medianoche del día, el minuto en que llega tu tren, la hora en que os conocisteis. Cuenta atrás de medianoche está hecha para ese momento; para los demás regalos, la programación del editor, incluida en una plantilla de pago, retiene el regalo entero hasta la hora que elijas, en su zona horaria.",
        },
        {
          heading: "Lo que una sorpresa no debe ser",
          body: "Ni una prueba, ni un número en público, ni una noticia que pida antes una conversación. Un regalo sorpresa es para buenas noticias: un viaje, una visita, unas entradas, un plan ya hecho. Si la noticia puede sentar mal, díselo en persona y manda el regalo después.",
        },
      ],
      faq: [
        { q: "¿Qué sorpresa online puedo darle a mi pareja?", a: "Un regalo que trae su propia sorpresa: fotos bajo una capa, un reloj que se abre a medianoche, pistas hacia un viaje, un último mensaje que aparece al agitar. Pon la noticia al final del todo." },
        { q: "¿Puedo enviarlo ya y que se abra ese día?", a: "Sí, como parte de un regalo de pago. En el editor, en Extras, activa «Programar la apertura» y elige la fecha, la hora y su zona horaria. Hasta entonces el enlace muestra una cuenta atrás en marcha, y en ese momento se abre solo." },
        { q: "¿Alguno necesita sensor de movimiento?", a: "No. Bola de nieve y Frasco de razones se disfrutan más agitando, y los dos funcionan en un móvil que no lo nota: la bola tiene un botón y el frasco se toca. Los demás se tocan, se rascan o simplemente se miran." },
        { q: "¿Cómo mantengo la sorpresa hasta que lo abra?", a: "Manda el enlace con un mensaje sencillo, sin nada sobre lo que hay dentro. Si el regalo está programado, la página a la que llega antes de la hora solo dice que algo le espera y cuándo se abre." },
      ],
      related: [
        { href: "/blog/how-to-surprise-your-girlfriend", label: "Cómo sorprender a tu novia" },
        { href: "/blog/midnight-birthday-surprise-ideas", label: "Sorpresas de cumpleaños a medianoche" },
        { href: "/blog/surprise-trip-reveal-ideas", label: "Cómo desvelar un viaje sorpresa" },
        { href: "/gifts/last-minute", label: "De última hora" },
        { href: "/occasions/birthday", label: "Ideas de regalo de cumpleaños" },
      ],
    },
  },
  "memory-book": {
    en: {
      title: "Digital Memory Book for a Couple, Written in Your Words",
      description: "A digital memory book for the two of you, led by what you write: the first time, the day it changed, the small things. Six gifts with lines to borrow.",
      h1: "A digital memory book for the two of you",
      label: "Memory books",
      hero: {
        line: "A memory book is mostly words. The photos only hold them in place.",
        sentence: "These gifts are built around your words: a note in a jar, a chat you script, a page of newspaper letters, with the pictures following the story.",
      },
      ideasTitle: "Six that tell it in words",
      craft: "What to write, chapter by chapter",
      film: "jar-of-reasons",
      lead: [
        "An album is about the pictures; a memory book is about the story, and the story is in the words beside them. Each gift on this page puts writing first: notes in a jar, a chat you script, newspaper letters, a parcel of kept things, a postcard, and further down a road for when the photos have earned it. Photos help, and some of these need none at all.",
        NOTE
          ? "If what you want is a place for many photos, the photo album page is the better start. Here, a dozen good lines beat a hundred pictures. The Letter’s short note is the only free gift to start from, and it is not on this page; each gift here is a one-time payment for that template, built and previewed in full first."
          : `If what you want is a place for many photos, the photo album page is the better start. Here, a dozen good lines beat a hundred pictures. The free gifts to start from are ${freeNames("en")}, and neither is on this page; each gift here is a one-time payment for that template, built and previewed in full first.`,
      ],
      ideas: [
        {
          template: "jar-of-reasons",
          heading: "The small ordinary things, one note each",
          body: "The ordinary things go in the jar, the ones a photo never caught: how they hum when they cook, the way they say goodnight. Each note in Jar of Reasons takes 160 characters and falls out when they shake the phone or tap it. Write what a photo album leaves out.",
          line: { field: "reasons", where: "One note in the jar", text: "You hum the same three notes every time you open the fridge." },
        },
        {
          template: "text-thread",
          heading: "The chat, under the name you saved them as",
          brief: "Your own messages replayed, under the name you saved them as the night you met.",
          body: "One chapter can be told in your own messages: Text Thread replays a conversation bubble by bubble. The name at the top of the chat holds forty characters: put the name you saved them under the night you met, which is a story in itself, and replay the first exchange that mattered.",
          line: { field: "contactName", where: "The name on the chat", text: "Ana (bookstore, do not text first)" },
        },
        {
          template: "xoxo",
          heading: "The day it changed, in newspaper letters",
          brief: "A nickname cut from newspaper letters, and the sentences that matter underlined.",
          body: "Give one chapter the newsprint treatment. XOXO cuts what you call them out of a newspaper, sixteen characters, and takes up to 220 characters of your sentences, underlining, circling and highlighting some of them for you. Write the day things changed between you there, and let the underlines fall on the detail you both remember.",
          line: { field: "lines", where: "The lines you’d underline", text: "The night bus broke down and we talked for seven hours. I missed my stop on purpose after that." },
        },
        {
          template: "keepsake",
          heading: "The things you kept, in one parcel",
          brief: "A parcel of kept things: a ticket, a torn-out word, a locket, dried flowers.",
          body: "Some chapters are objects. Keepsake is a parcel tied with twine under a wax seal, and inside are the kept things: the first photo under dried flowers, a ticket of twenty-six characters, one word torn from a book, a gold locket that opens on a tap. Write the ticket from a night only you two remember; the letter inside is typed on aged paper.",
          line: { field: "ticket", where: "The ticket", text: "NIGHT BUS N4 · 02:10" },
        },
        {
          template: "coquette",
          heading: "A postcard for the small ordinary things",
          brief: "A handwritten postcard under the first photo, then polaroids down to your letter.",
          body: "The small ordinary chapter needs a page that runs on. Coquette scrolls down through as many as ten polaroids; under the first sits a postcard in handwriting, ninety characters, beside it a few torn-out words, and at the end your letter on a torn sheet. Put a habit on the postcard, and let the polaroids show it.",
          line: { field: "note", where: "The postcard", text: "Sunday soup, the version we argue about, every week since the first winter." },
        },
        {
          template: "our-timeline",
          heading: "Chapters dated on a road",
          brief: "A road of dated stops, each date written like a chapter title.",
          body: "Our Timeline is a road that draws itself as they scroll, and each stop pins a photo and a date of forty characters. Write the dates as chapter titles rather than numbers: the rainy one, the one with the broken heater. The ending line, eighty characters, is where the book closes for now.",
          line: { field: "dates", where: "The date on a stop", text: "The winter of the broken heater" },
        },
      ],
      sections: [
        {
          heading: "The first time",
          body: "Begin where it began, but not with the date: with a detail. What they were wearing, the joke that made you look twice, the wrong name you called them. A memory book opens on something only the two of you know, and the first page earns the rest.",
        },
        {
          heading: "The day it changed",
          body: "Every couple has a day when it became something else: a trip, a missed last train, a phone call at three in the morning. Give that day its own chapter, in newspaper letters or on a ticket kept in a parcel, and say plainly what changed. It is the page they will come back to.",
        },
        {
          heading: "The small ordinary thing",
          body: "The things that make a relationship rarely get photographed: how they take their tea, the song they hum, the way they leave notes on the fridge. Write those down. A memory book with three ordinary details in it is more theirs than one with thirty photos from vacations.",
        },
      ],
      faq: [
        { q: "What is a digital memory book?", a: "A gift that tells the story of the two of you mostly in words, with photos in support: a parcel of kept things, a road of dated chapters, a chat you script. It opens as a link on their phone." },
        { q: "How is a memory book different from a photo album?", a: "An album leads with pictures and needs many of them. A memory book leads with what you write and can work with a few photos or none, like Jar of Reasons, which needs none." },
        { q: "What should I write in a memory book for my partner?", a: "Three kinds of page: the first time, the day it changed, and the small ordinary things. Give each page one detail that only the two of you would recognize." },
        { q: "Can I add to it later?", a: "You can edit a gift from My gifts after sending it, and the changes appear at the same link, so a memory book can gain a chapter after the next trip." },
      ],
      related: [
        { href: "/gifts/photo-album", label: "Interactive photo albums" },
        { href: "/occasions/anniversary", label: "Anniversary gift ideas" },
        { href: "/gifts/anniversary-website", label: "Anniversary websites" },
        { href: "/gifts/12-month-anniversary", label: "12 month anniversary gifts" },
      ],
    },
    es: {
      title: "Libro de recuerdos digital para los dos",
      description: "Un libro de recuerdos digital para los dos, llevado por lo que escribes: la primera vez, el día que cambió, las cosas pequeñas. Seis regalos con frases.",
      h1: "Un libro de recuerdos digital para los dos",
      label: "Libros de recuerdos",
      hero: {
        line: "Un libro de recuerdos es sobre todo palabras. Las fotos solo las sujetan.",
        sentence: "Estos regalos giran en torno a tus palabras: una nota en un frasco, un chat con guion propio, letras de periódico, y las fotos detrás de la historia.",
      },
      ideasTitle: "Seis que lo cuentan con palabras",
      craft: "Qué escribir, capítulo a capítulo",
      film: "jar-of-reasons",
      lead: [
        "Un álbum va de fotos; un libro de recuerdos va de la historia, y la historia está en las palabras de al lado. Cada regalo de esta página pone primero lo escrito: notas en un frasco, un chat que escribes tú, letras de periódico, un paquete de cosas guardadas, una postal y, más abajo, un camino para cuando las fotos se lo hayan ganado. Las fotos ayudan, y algunos no necesitan ninguna.",
        NOTE
          ? "Si lo que buscas es un sitio para muchas fotos, mejor empieza por la página del álbum de fotos. Aquí, una docena de frases buenas valen más que cien imágenes. La nota corta de La carta es el único regalo gratis para empezar, y no está en esta página; cada regalo de aquí es un solo pago por esa plantilla, montado y visto entero antes."
          : `Si lo que buscas es un sitio para muchas fotos, mejor empieza por la página del álbum de fotos. Aquí, una docena de frases buenas valen más que cien imágenes. Los regalos gratis para empezar son ${freeNames("es")}, y ninguno está en esta página; cada regalo de aquí es un solo pago por esa plantilla, montado y visto entero antes.`,
      ],
      ideas: [
        {
          template: "jar-of-reasons",
          heading: "Las cosas pequeñas, una nota cada una",
          body: "En el frasco van las cosas de cada día, las que ninguna foto pilló: cómo tararea cuando cocina, su forma de dar las buenas noches. Cada nota de Frasco de razones admite 160 caracteres y sale al agitar el móvil o tocarlo. Escribe lo que un álbum de fotos deja fuera.",
          line: { field: "reasons", where: "Una nota del frasco", text: "Tarareas las mismas tres notas cada vez que abres la nevera." },
        },
        {
          template: "text-thread",
          heading: "El chat, con el nombre de su contacto",
          brief: "Vuestros mensajes repetidos, con el nombre que pusiste a su contacto la noche que os conocisteis.",
          body: "Un capítulo puede contarse con vuestros propios mensajes: Hilo de mensajes repite una conversación burbuja a burbuja. El nombre de arriba del chat tiene sitio para cuarenta caracteres: pon el que diste a su contacto la noche que os conocisteis, que ya es una historia, y repite el primer intercambio que importó.",
          line: { field: "contactName", where: "El nombre del chat", text: "Ana (librería, no escribir primero)" },
        },
        {
          template: "xoxo",
          heading: "El día que cambió, en letras de periódico",
          brief: "Un mote recortado de un periódico y las frases que importan, ya subrayadas.",
          body: "Dale a un capítulo el tratamiento de periódico. XOXO recorta de un diario cómo le llamas, dieciséis caracteres, y coge hasta 220 caracteres de tus frases, subrayando, rodeando y resaltando algunas por ti. Escribe ahí el día en que las cosas cambiaron entre los dos, y deja que los subrayados caigan en el detalle que recordáis.",
          line: { field: "lines", where: "Las frases que subrayarías", text: "El búho se averió y hablamos siete horas. Después me pasé la parada a propósito." },
        },
        {
          template: "keepsake",
          heading: "Lo que guardaste, en un paquete",
          brief: "Un paquete de cosas guardadas: un billete, una palabra arrancada, un relicario, flores secas.",
          body: "Hay capítulos que son objetos. Recuerdo llega como un paquete con cordel y lacre, y dentro van las cosas guardadas: la primera foto bajo flores secas, un billete de veintiséis caracteres, una palabra arrancada de un libro, un relicario dorado que se abre al tocarlo. Escribe el billete de una noche que solo recordáis los dos; la carta de dentro va a máquina en papel envejecido.",
          line: { field: "ticket", where: "El billete", text: "BÚHO N4 · 02:10" },
        },
        {
          template: "coquette",
          heading: "Una postal para las cosas pequeñas de siempre",
          brief: "Una postal escrita a mano bajo la primera foto y polaroids hasta tu carta.",
          body: "El capítulo de lo pequeño y normal necesita una página que siga. Coquette baja por hasta diez polaroids; bajo la primera hay una postal escrita a mano, de noventa caracteres, a su lado unas palabras recortadas, y al final tu carta en una hoja rasgada. Pon una costumbre en la postal, y que las polaroids la enseñen.",
          line: { field: "note", where: "La postal", text: "La sopa del domingo, la versión que discutimos, cada semana desde el primer invierno." },
        },
        {
          template: "our-timeline",
          heading: "Capítulos con fecha en un camino",
          brief: "Un camino de paradas con fecha, cada fecha escrita como el título de un capítulo.",
          body: "Nuestra línea del tiempo es un camino que se dibuja mientras se desliza, y cada parada clava una foto y una fecha de cuarenta caracteres. Escribe las fechas como títulos de capítulo y no como números: la de la lluvia, la de la calefacción rota. La frase final, de ochenta caracteres, es donde el libro se cierra por ahora.",
          line: { field: "dates", where: "La fecha de una parada", text: "El invierno de la calefacción rota" },
        },
      ],
      sections: [
        {
          heading: "La primera vez",
          body: "Empieza donde empezó, pero no por la fecha: por un detalle. Qué llevaba puesto, la broma que te hizo mirar dos veces, cómo te equivocaste con su nombre. Un libro de recuerdos se abre con algo que solo sabéis vosotros, y la primera página se gana el resto.",
        },
        {
          heading: "El día que cambió",
          body: "Toda pareja tiene un día en que la cosa se volvió otra: un viaje, un último tren perdido, una llamada a las tres de la mañana. Dale a ese día su propio capítulo, en letras de periódico o en un billete guardado en un paquete, y di claramente qué cambió. Es la página a la que volverá.",
        },
        {
          heading: "Lo de todos los días",
          body: "Lo que hace una relación casi nunca sale en fotos: cómo toma el té, la canción que tararea, las notas que deja en la nevera. Escríbelo. Un libro de recuerdos con tres detalles normales es más suyo que uno con treinta fotos de vacaciones.",
        },
      ],
      faq: [
        { q: "¿Qué es un libro de recuerdos digital?", a: "Un regalo que cuenta vuestra historia sobre todo con palabras, con fotos de apoyo: un paquete de cosas guardadas, un camino de capítulos con fecha, un chat que escribes tú. Se abre como enlace en su móvil." },
        { q: "¿En qué se diferencia de un álbum de fotos?", a: "Un álbum se apoya en las imágenes y necesita muchas. Un libro de recuerdos se apoya en lo que escribes y funciona con pocas fotos o ninguna, como Frasco de razones, que no necesita ninguna." },
        { q: "¿Qué escribo en un libro de recuerdos para mi pareja?", a: "Tres tipos de página: la primera vez, el día que cambió y las cosas pequeñas y normales. Dale a cada página un detalle que solo reconoceríais vosotros." },
        { q: "¿Puedo añadirle cosas más adelante?", a: "Puedes editar un regalo desde Mis regalos después de enviarlo, y los cambios salen en el mismo enlace, así que un libro de recuerdos puede ganar un capítulo después del próximo viaje." },
      ],
      related: [
        { href: "/gifts/photo-album", label: "Álbumes de fotos interactivos" },
        { href: "/occasions/anniversary", label: "Ideas de regalo de aniversario" },
        { href: "/gifts/anniversary-website", label: "Webs de aniversario" },
        { href: "/gifts/12-month-anniversary", label: "Regalos para 12 meses de novios" },
      ],
    },
  },
  /**
   * "Christmas ecards" (the owner, 26 Nov 2026: the words people search are "ecards", 33,100 a month
   * in the US and 40,500 for "christmas ecards" in December, against 880 for "digital gift"). The
   * product is the same; this page says it in their word. Nearly every such search adds "free", so the
   * page says plainly which one is and that the scenes are paid.
   */
  "christmas-ecards": {
    en: {
      title: "Christmas Ecards: Animated, With One Free",
      description: "Animated Christmas ecards you send as a link: a frosted window to wipe, lights to hang, a list to unroll. One is free, and each idea has a line to borrow.",
      h1: "Christmas ecards they open with a finger",
      label: "Christmas ecards",
      hero: {
        line: "A card they don’t just read. They wipe it, light it and unwrap it.",
        sentence: "Each of these Christmas ecards is made on your phone in about ten minutes, sent as a link, and can wait until Christmas morning to open.",
      },
      ideasTitle: "Seven that move",
      craft: "A card that lands on time",
      film: "frosted-window",
      lead: [
        "An ecard used to be a picture in an email. These are small animated scenes with your words inside: a window they wipe the frost from, a roof they hang lights on, a scroll that unrolls with their name on it. You write the message, add photos and a song if you want them, and send one link by text or email. Nothing is posted, so no last posting date applies.",
        `${NOTE ? "One is free: The Letter, as a short note of up to 500 characters with a song." : "One is free: The Letter."} Each of the six Christmas scenes is a one-time payment, made when you publish, and the design is then yours for good. You can build the whole card first to see whether it is worth it. A paid card can be set to open on Christmas morning.`,
      ],
      ideas: [
        {
          template: "the-letter",
          heading: "The free one: a Christmas note under wax",
          body: `An envelope closed with a wax seal. One tap breaks the seal, and ${NOTE ? "your note, up to 500 characters," : "your note"} is written out across the page in handwriting while your song plays. The free version takes two names and no photos. Skip the round-up of the year. Write about one evening from it and why you would keep that one.`,
          line: { field: "freeNote", where: "The whole note", text: "Merry Christmas. The evening the power went out and we played cards by candle was my favorite of the year. Same again in January?" },
        },
        {
          template: "frosted-window",
          heading: "Frost they wipe away to find your words",
          body: "A window on Christmas Eve, frosted over. They wipe the frost away with a finger, and out in the snow a snowman is holding up a little blackboard with your words on it, up to 36 characters. Then your letter, your photos and your song. The room comes as a cream cottage, a log cabin or in midnight blue.",
          line: { field: "sign", where: "The snowman’s blackboard", text: "merry christmas, Ava" },
        },
        {
          template: "string-the-lights",
          heading: "Lights they hang, then the switch",
          body: "A dark little house in the snow. They run a finger along the roof and the bulbs go up one by one behind it. Then they throw the switch: the string lights from end to end, every window warms, and your words come on in bulbs on the board in the garden, up to 28 characters. The house is barn red, navy blue or sage green.",
          line: { field: "sign", where: "The board in the garden", text: "HOME BY THE 23RD" },
        },
        {
          template: "nice-list",
          heading: "The funny one: a verdict from the North Pole",
          body: "A scroll tied with a ribbon and tagged with their name. They pull it down and each line gets ticked in pen: good deeds in one column, crimes in the other, up to four of each and 50 characters a line, all written by you. At the bottom a rubber stamp comes down: nice, naughty, or naughty and nice.",
          line: { field: "naughty", where: "One of the crimes", text: "stole the blanket, 41 nights of 41" },
        },
        {
          template: "unwrapped",
          heading: "Your year, unwrapped one number at a time",
          body: "A row of presents with a gold one at the end. They tear the paper off with a tap or a swipe, and inside each is a number from your year that counts up as it appears. Up to eight, written by you, 48 characters each. The gold present prints the whole year as a receipt with your names on it.",
          line: { field: "stats", where: "One of the eight numbers", text: "3 cities we got lost in" },
        },
        {
          template: "gingerbread-house",
          heading: "A house a child decorates",
          body: "A plain gingerbread house on the kitchen counter with bowls of sweets either side. They press on gumdrops, peppermints, stars and hearts wherever they like, or drag a finger to pipe a line of icing. No two come out the same. When it is dressed, the little door opens and your letter, your photos and your song are inside.",
          line: { field: "message", where: "The letter behind the door", text: "You decorate. I’ll bring the icing." },
        },
        {
          template: "snow-globe",
          heading: "A globe they shake, if you’re apart",
          body: "A snow globe on a shelf with the two of you inside it. They shake the phone and the snow flies, and each time it settles something new has appeared: one of your lines, or a photo hanging like an ornament. After the last one the brass plaque is engraved, in up to 44 characters, and your letter opens. A button does the shaking on a phone that can’t.",
          line: { field: "plaque", where: "The brass plaque", text: "our first winter, 2026" },
        },
      ],
      sections: [
        {
          heading: "Why a card with something to do",
          body: "A card that only shows something gets a glance. One that asks for a finger gets half a minute. Pick the scene by the person: the window for someone sentimental, the list for someone who can take a joke, the house for a child. Then write one line only you could have written.",
        },
        {
          heading: "Send it so it lands on the day",
          body: "Text the link rather than emailing it: a text is opened within minutes, an email whenever. A paid card can be set to open on Christmas morning, so you can send it a week early and it waits. There is a printable code as well, to tuck inside a paper card.",
        },
        {
          heading: "One card for the whole family",
          body: "One link works for everyone, so the same card can go into the family chat. Sign it from all of you on the blackboard or in the bulbs, and keep the letter to what you would say out loud at the table.",
        },
      ],
      faq: [
        {
          q: "Are these Christmas ecards free?",
          a: `${NOTE ? "One is: The Letter as a short note, up to 500 characters with a song." : `Yes, ${freeNames("en")}.`} Each of the six Christmas scenes is a one-time payment with no subscription: the design is yours for good, and you can build a card before you pay.`,
        },
        { q: "How do I send a Christmas ecard?", a: "You get one link when you publish. Paste it into a text, an email or a group chat. There is also a code you can print and put inside a paper card, which opens the same link when scanned." },
        { q: "Can it open on Christmas morning?", a: "Yes, with a paid card: set the day and the hour when you publish, and the link opens then." },
        { q: "Does the person need an app or an account?", a: "No. It opens in the browser on a phone or a computer, and nobody signs in to anything to see it." },
      ],
      related: [
        { href: "/occasions/christmas", label: "Christmas gift ideas" },
        { href: "/digital-cards", label: "Digital cards" },
        { href: "/gifts/last-minute", label: "Last-minute gifts" },
      ],
    },
    es: {
      title: "Tarjetas de Navidad virtuales, animadas y una gratis",
      description: "Tarjetas de Navidad animadas que mandas en un enlace: una ventana helada, luces que colgar, una lista que desenrollar. Una es gratis y cada idea trae su frase.",
      h1: "Tarjetas de Navidad virtuales que se abren con un dedo",
      label: "Tarjetas de Navidad virtuales",
      hero: {
        line: "Una tarjeta que no solo se lee: se limpia, se enciende y se desenvuelve.",
        sentence: "Cada tarjeta se hace en el móvil en unos diez minutos, se manda en un enlace y puede esperar a la mañana de Navidad para abrirse.",
      },
      ideasTitle: "Siete que se mueven",
      craft: "Una tarjeta que llega el día",
      film: "frosted-window",
      lead: [
        "Una tarjeta virtual solía ser una imagen en un correo. Estas son pequeñas escenas animadas con tus palabras dentro: una ventana a la que se le quita la escarcha, un tejado donde se cuelgan luces, un pergamino que se desenrolla con su nombre. Escribes el mensaje, añades fotos y una canción si quieres, y mandas un enlace por mensaje o por correo. Nada viaja por correo postal, así que no hay fecha límite de envío.",
        `${NOTE ? "Una es gratis: La carta, como nota corta de hasta 500 caracteres con una canción." : "Una es gratis: La carta."} Cada una de las seis escenas de Navidad es un pago único, al publicar, y el diseño queda tuyo para siempre. Puedes montar la tarjeta entera antes para ver si merece la pena. Una tarjeta de pago puede programarse para que se abra la mañana de Navidad.`,
      ],
      ideas: [
        {
          template: "the-letter",
          heading: "La gratis: una nota de Navidad bajo lacre",
          body: `Un sobre cerrado con un sello de lacre. Un toque rompe el sello y ${NOTE ? "tu nota, de hasta 500 caracteres," : "tu nota"} se va escribiendo a mano por la página mientras suena tu canción. La versión gratis pide dos nombres y ninguna foto. Sáltate el resumen del año. Escribe sobre una sola tarde y por qué te quedarías con esa.`,
          line: { field: "freeNote", where: "La nota entera", text: "Feliz Navidad. La tarde en que se fue la luz y jugamos a las cartas con velas fue la mejor del año. ¿Repetimos en enero?" },
        },
        {
          template: "frosted-window",
          heading: "Escarcha que se quita para leer tus palabras",
          body: "Una ventana en Nochebuena, cubierta de escarcha. La escarcha se quita con el dedo y fuera, en la nieve, un muñeco sostiene una pizarrita con tus palabras, hasta 36 caracteres. Después llegan tu carta, tus fotos y tu canción. La habitación es una casita crema, una cabaña de troncos o azul medianoche.",
          line: { field: "sign", where: "La pizarra del muñeco de nieve", text: "feliz navidad, Ava" },
        },
        {
          template: "string-the-lights",
          heading: "Luces que se cuelgan, y luego el interruptor",
          body: "Una casita a oscuras en la nieve. Se pasa un dedo por el tejado y las bombillas van subiendo una a una. Luego se acciona el interruptor: la guirnalda se enciende de punta a punta, las ventanas se calientan y tus palabras se iluminan en bombillas en el cartel del jardín, hasta 28 caracteres. La casa es rojo granero, azul marino o verde salvia.",
          line: { field: "sign", where: "El cartel del jardín", text: "EN CASA EL 23" },
        },
        {
          template: "nice-list",
          heading: "La divertida: un veredicto del Polo Norte",
          body: "Un pergamino atado con una cinta y con su nombre en la etiqueta. Se tira de él y cada línea se marca a boli: las buenas acciones en una columna y los delitos en la otra, hasta cuatro de cada y 50 caracteres por línea, todas escritas por ti. Abajo cae un sello de caucho con el veredicto.",
          line: { field: "naughty", where: "Uno de los delitos", text: "robó la manta, 41 noches de 41" },
        },
        {
          template: "unwrapped",
          heading: "Vuestro año, desenvuelto número a número",
          body: "Una fila de regalos con uno dorado al final. El papel se rasga con un toque o deslizando, y dentro de cada uno hay un número de vuestro año que va subiendo al aparecer. Hasta ocho, escritos por ti, de 48 caracteres cada uno. El regalo dorado imprime el año entero como un tique con vuestros nombres.",
          line: { field: "stats", where: "Uno de los ocho números", text: "3 ciudades en las que nos perdimos" },
        },
        {
          template: "gingerbread-house",
          heading: "Una casita que decoran los peques",
          body: "Una casita de jengibre sin adornar en la encimera, con cuencos de dulces a los lados. Se pegan gominolas, caramelos de menta, estrellas y corazones donde apetezca, o se arrastra un dedo para trazar una línea de glaseado. No salen dos iguales. Cuando está lista, la puertecita se abre y dentro están tu carta, tus fotos y tu canción.",
          line: { field: "message", where: "La carta tras la puerta", text: "Tú decoras. Yo llevo el glaseado." },
        },
        {
          template: "snow-globe",
          heading: "Una bola que se agita, si estáis lejos",
          body: "Una bola de nieve en una estantería, con vosotros dentro. Se agita el móvil y la nieve vuela, y cada vez que se posa ha aparecido algo nuevo: una de tus frases o una foto colgada como un adorno. Tras la última se graba la placa de latón, con hasta 44 caracteres, y se abre tu carta. Un botón hace de sacudida en un móvil que no puede.",
          line: { field: "plaque", where: "La placa de latón", text: "nuestro primer invierno, 2026" },
        },
      ],
      sections: [
        {
          heading: "Por qué una tarjeta con algo que hacer",
          body: "Una tarjeta que solo enseña algo recibe un vistazo. Una que pide un dedo recibe medio minuto. Elige la escena por la persona: la ventana para alguien sentimental, la lista para alguien con sentido del humor, la casita para peques. Y escribe una frase que solo tú podrías haber escrito.",
        },
        {
          heading: "Mándala para que llegue el día",
          body: "Envía el enlace por mensaje mejor que por correo: un mensaje se abre en minutos y un correo, cuando toque. Una tarjeta de pago puede programarse para la mañana de Navidad, así que puedes mandarla una semana antes y espera. También hay un código para imprimir y meter dentro de una tarjeta de papel.",
        },
        {
          heading: "Una tarjeta para toda la familia",
          body: "Un enlace sirve para todo el mundo, así que la misma tarjeta puede ir al chat de la familia. Fírmala de parte de toda la casa en la pizarra o en las bombillas, y deja la carta en lo que dirías en voz alta en la mesa.",
        },
      ],
      faq: [
        {
          q: "¿Estas tarjetas de Navidad son gratis?",
          a: `${NOTE ? "Una sí: La carta como nota corta, de hasta 500 caracteres y con una canción." : `Sí, ${freeNames("es")}.`} Cada una de las seis escenas de Navidad es un pago único y sin suscripción: el diseño queda tuyo para siempre y puedes montar una tarjeta antes de pagar.`,
        },
        { q: "¿Cómo se manda una tarjeta de Navidad virtual?", a: "Al publicar recibes un enlace. Pégalo en un mensaje, un correo o un chat de grupo. También hay un código que puedes imprimir y meter en una tarjeta de papel: al escanearlo se abre el mismo enlace." },
        { q: "¿Puede abrirse la mañana de Navidad?", a: "Sí, con una tarjeta de pago: eliges el día y la hora al publicar y el enlace se abre entonces." },
        { q: "¿Hace falta una app o una cuenta para verla?", a: "No. Se abre en el navegador del móvil o del ordenador, y nadie tiene que iniciar sesión para verla." },
      ],
      related: [
        { href: "/occasions/christmas", label: "Ideas de regalo de Navidad" },
        { href: "/digital-cards", label: "Tarjetas digitales" },
        { href: "/gifts/last-minute", label: "Regalos de última hora" },
      ],
    },
  },
};
