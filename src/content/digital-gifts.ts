import type { GiftLocale } from "@/lib/gift/schema";

/**
 * What /gifts says about digital gifts as a thing: the definition, ideas grouped the way people
 * shop for them, and the questions people bring. /gifts is the page meant to be found for "digital
 * gift" and "regalo digital"; the pages that win that search (Oct 2026) are a "free digital gift,
 * create it online" page, a "send free virtual gifts" homepage and "best digital gift ideas" lists.
 * This answers both halves: what to give, and where to make it.
 *
 * Facts (what is free, photo counts, links not expiring) match the pricing FAQ; change both.
 */
export type DigitalGiftGuide = {
  eyebrow: string;
  title: string;
  definition: string;
  notACard: string;
  ideasTitle: string;
  ideasLead: string;
  groups: { title: string; templates: string[] }[];
  byWho: string;
  faq: { q: string; a: string }[];
};

const GROUPS: { key: "romantic" | "funny" | "memories" | "far" | "days"; templates: string[] }[] = [
  { key: "romantic", templates: ["the-letter", "bouquet", "jar-of-reasons", "music-box", "constellations", "xoxo", "vinyl", "keepsake"] },
  { key: "funny", templates: ["the-council", "sticker-bomb", "party-animals", "fortune-cookie", "arcade"] },
  { key: "memories", templates: ["scrapbook", "our-timeline", "museum", "photo-booth", "digicam", "front-page", "on-repeat"] },
  { key: "far", templates: ["passport", "halfway", "midnight-countdown", "text-thread", "pack-your-bags"] },
  { key: "days", templates: ["birthday-cinema", "balloons", "cap-toss", "the-toast", "snow-globe"] },
];

const GROUP_TITLES: Record<GiftLocale, Record<(typeof GROUPS)[number]["key"], string>> = {
  en: { romantic: "Romantic", funny: "Funny", memories: "Made of your photos", far: "For someone far away", days: "For a big day" },
  es: { romantic: "Románticos", funny: "Divertidos", memories: "Hechos con vuestras fotos", far: "Para alguien lejos", days: "Para un gran día" },
};

export const DIGITAL_GIFT_IDEAS = GROUPS.flatMap((g) => g.templates);

export const DIGITAL_GIFT_GUIDE: Record<GiftLocale, DigitalGiftGuide> = {
  en: {
    eyebrow: "Digital gifts",
    title: "What is a digital gift?",
    definition:
      "A digital gift is a present you send as a link instead of in a box: a love letter, a bouquet, a scrapbook or a small game, made from your photos, your words and a song, and opened on their phone. It arrives the second you send it, nothing ships, and it's still there next year.",
    notACard:
      "It isn't a gift card. A gift card is money with a design on it; a digital gift is the thing itself, made by you for one person. Ethos has 54 of them to start from, every one with a live demo, and two are free.",
    ideasTitle: `${DIGITAL_GIFT_IDEAS.length} digital gift ideas`,
    ideasLead: "Each one is a template you can open, try and make in about ten minutes.",
    groups: GROUPS.map((g) => ({ title: GROUP_TITLES.en[g.key], templates: g.templates })),
    byWho: "Digital gift ideas by who it's for",
    faq: [
      {
        q: "What is a good digital gift?",
        a: "One made for one person: their name, your photos, your words and a song that means something to you both. A love letter or a jar of reasons says the most; a bouquet or a music box looks the part; a little game or a meme card is for someone who'd rather laugh.",
      },
      {
        q: "Can you send a digital gift for free?",
        a: "Yes. The Letter and Constellations are free, with up to ten photos, music, a countdown and a hidden surprise. You make it, publish it and send the link: nobody pays and there's nothing to install.",
      },
      {
        q: "How do you send a digital gift?",
        a: "Make it, press publish and send the link anywhere a link goes: WhatsApp, iMessage, Instagram or an email. Or print its QR code and put it in a real card. It opens in the browser on their phone.",
      },
      {
        q: "Is a digital gift the same as an e-gift card?",
        a: "No. An e-gift card is store credit sent by email. A digital gift is the present itself, something you made that they open, watch and keep. If they'd really rather have money, send a gift card; if you want them to feel something, make one of these.",
      },
      {
        q: "Do digital gifts expire?",
        a: "Not here. Links are meant to be permanent, so it opens again next year, and if you spot a typo after sending you can fix it at the same link.",
      },
    ],
  },
  es: {
    eyebrow: "Regalos digitales",
    title: "¿Qué es un regalo digital?",
    definition:
      "Un regalo digital es un regalo que envías en un enlace en vez de en una caja: una carta de amor, un ramo, un álbum o un pequeño juego, hecho con tus fotos, tus palabras y una canción, que se abre en su móvil. Llega en el segundo en que lo envías, no hay envío y sigue ahí el año que viene.",
    notACard:
      "No es una tarjeta regalo. Una tarjeta regalo es dinero con un diseño; un regalo digital es el regalo en sí, hecho por ti para una persona. Ethos tiene 54 para empezar, todos con demo en vivo, y dos son gratis.",
    ideasTitle: `${DIGITAL_GIFT_IDEAS.length} ideas de regalos digitales`,
    ideasLead: "Cada una es una plantilla que puedes abrir, probar y hacer en unos diez minutos.",
    groups: GROUPS.map((g) => ({ title: GROUP_TITLES.es[g.key], templates: g.templates })),
    byWho: "Ideas de regalos digitales según para quién",
    faq: [
      {
        q: "¿Cuál es un buen regalo digital?",
        a: "Uno hecho para una sola persona: su nombre, vuestras fotos, tus palabras y una canción que signifique algo para los dos. Una carta de amor o un frasco de razones es lo que más dice; un ramo o una caja de música, lo que más luce; un pequeño juego o una tarjeta de memes, para quien prefiere reír.",
      },
      {
        q: "¿Se puede enviar un regalo digital gratis?",
        a: "Sí. La carta y Constelaciones son gratis, con hasta diez fotos, música, una cuenta atrás y una sorpresa final. Lo haces, lo publicas y envías el enlace: nadie paga y no hay nada que instalar.",
      },
      {
        q: "¿Cómo se envía un regalo digital?",
        a: "Hazlo, pulsa publicar y envía el enlace por donde quieras: WhatsApp, iMessage, Instagram o email. O imprime su código QR y mételo en una tarjeta de papel. Se abre en el navegador de su móvil.",
      },
      {
        q: "¿Un regalo digital es lo mismo que una tarjeta regalo?",
        a: "No. Una tarjeta regalo es saldo para una tienda que llega por email. Un regalo digital es el regalo en sí, algo que has hecho y que abre, mira y guarda. Si de verdad prefiere dinero, envía una tarjeta regalo; si quieres que sienta algo, haz uno de estos.",
      },
      {
        q: "¿Los regalos digitales caducan?",
        a: "Aquí no. Los enlaces están pensados para durar, así que se vuelve a abrir el año que viene, y si ves una errata después de enviarlo puedes corregirla en el mismo enlace.",
      },
    ],
  },
};
