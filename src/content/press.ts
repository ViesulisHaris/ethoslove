import { aboutCopy } from "@/content/about";
import type { PressFigureId, PressLocale } from "@/lib/press/figures";

/**
 * The press page (/press, "Ethos in numbers"): the words round the figures of
 * content/press-numbers.ts. Written for someone writing about Ethos: what each figure counts,
 * the name, the makers and an address. Every claim is one another page already makes (About,
 * the Terms) or one the query's own comments make (scripts/press-numbers.sql).
 * The eyebrow is the brand's category line and is read from config/brand.ts by the page: it is
 * never typed here (tests/unit/category-line.test.ts allows it in that one file).
 * {date}, {name}, {domain}, {company} and {count} are filled in by the page.
 */
export const PRESS_PATH = "/press";
/** The day these words last changed, for the sitemap (content/page-dates.ts, once the page is on). */
export const PRESS_UPDATED = "2026-11-23";

/**
 * What the owner has not decided yet, each a promise or a choice the page makes on the owner's
 * behalf (growth-build review, 23 Nov 2026). While any is listed the snapshot may not be switched
 * on: tests/unit/press.test.ts G7 fails if press-numbers.ts says `ready: true`. Empty the list as
 * each is decided; if a question is refused, delete it in both languages and fix the FAQ count in C1.
 */
export const PRESS_OWNER_PENDING: readonly string[] = [
  "method.faq[2]: may an article use the posters of the template pages?",
  "method.faq[3]: does every writer who asks get a free code for a paid template (each one made by hand)?",
  "contact: is the press address support@secuora.xyz, or one on the brand's own domain?",
];

type Figure = { label: string; counts: string };
export type PressCopy = {
  nav: string;
  metaTitle: string;
  metaDescription: string;
  h1: string;
  sentence: string;
  write: string;
  mailSubject: string;
  sample: string;
  numbers: {
    label: string;
    heading: string;
    line: string;
    asOf: string;
    figures: Record<PressFigureId, Figure>;
  };
  made: { label: string; heading: string; line: string };
  article: {
    label: string;
    heading: string;
    checks: [string, string, string];
    logo: string;
    templates: string;
  };
  method: { label: string; heading: string; faq: { q: string; a: string }[] };
  contact: { label: string; heading: string; line: string; about: string };
};

export const PRESS_COPY: Record<PressLocale, PressCopy> = {
  en: {
    nav: "Press",
    metaTitle: "Ethos in numbers: figures and pictures for the press",
    metaDescription:
      "How many cards people have made with Ethos, how often they are opened and which templates lead, counted from our own database. With pictures to use and an address to write to.",
    h1: "Ethos in numbers",
    sentence:
      "Ethos is a website for making a personal card that opens on a phone, with photos, words and music, sent as a link or a printed QR code.",
    write: "Write to us",
    mailSubject: "Press",
    sample: "Sample figures, not real ones",
    numbers: {
      label: "The numbers",
      heading: "Counted from our own database",
      line: "Worked out from counts, and always rounded down.",
      asOf: "Counted on {date}.",
      figures: {
        cardsMade: {
          label: "cards made",
          counts: "Finished and published. Drafts and our own tests are left out.",
        },
        cardsOpened: {
          label: "cards opened",
          counts: "Not counting the ten minutes after it was sent or last edited.",
        },
        opensEach: {
          label: "opens per opened card",
          counts: "The same visitor within a day counts once.",
        },
        openedAgain: {
          label: "opened more than once",
          counts: "From another device, browser or network, or on another day.",
        },
        onPhone: {
          label: "of opens are on a phone",
          counts: "Of opens whose device we know; iPhones, older iPads and Android.",
        },
        countries: {
          label: "countries",
          counts: "Where a card has been paid for.",
        },
      },
    },
    made: {
      label: "Most made",
      heading: "The five cards people make most",
      line: "Under each, its share of every card made.",
    },
    article: {
      label: "For your article",
      heading: "How to write the name, and pictures to use",
      checks: [
        "The name is {name}; {domain} is its address.",
        "Made in Riga by {company}, registered in Latvia in March 2026.",
        "{count} templates, each with a live demo, in two languages.",
      ],
      logo: "Download the app icon",
      templates: "See every template",
    },
    method: {
      label: "Questions",
      heading: "How we count",
      faq: [
        {
          q: "What counts as a card made?",
          a: "A card someone finished and published, so it has a link that opens. Drafts are not counted, and neither are the cards we make ourselves to test the site. A card its maker has deleted is gone from our database, and so from the count.",
        },
        {
          q: "What counts as an open?",
          a: "Each time a card's link is opened; the same visitor within 24 hours counts once. We leave out the ten minutes after a card is sent or last edited, when it is mostly the sender checking it, and for a card edited after its first open, the ten minutes after that open too. So the figures err low. A signed-in sender's own look is not recorded at all.",
        },
        {
          q: "May I use the numbers and the pictures?",
          a: "Yes. Quote any figure with its date. The poster on each template's page may illustrate an article about Ethos; write to us for larger files. No figure here names or describes a customer.",
        },
        {
          q: "Can I try a paid template?",
          a: "Write to us and we will send a code that opens one.",
        },
      ],
    },
    contact: {
      label: "Contact",
      heading: "Your questions reach the team in Riga",
      line: "Questions, a quote, a card to try: one address.",
      about: "About Ethos",
    },
  },
  es: {
    nav: "Prensa",
    metaTitle: "Ethos en cifras: números e imágenes para la prensa",
    metaDescription:
      "Cuántas tarjetas se han hecho con Ethos, cuántas veces se abren y qué plantillas van primero, contado en nuestra propia base de datos. Con imágenes para usar y una dirección a la que escribir.",
    h1: "Ethos en cifras",
    sentence:
      "Ethos es una web para hacer una tarjeta personal que se abre en el móvil, con fotos, palabras y música, enviada como enlace o código QR impreso.",
    write: "Escríbenos",
    mailSubject: "Prensa",
    sample: "Cifras de muestra, no reales",
    numbers: {
      label: "Las cifras",
      heading: "Contadas en nuestra base de datos",
      line: "Salen de recuentos, siempre redondeados a la baja.",
      asOf: "Contado el {date}.",
      figures: {
        cardsMade: {
          label: "tarjetas hechas",
          counts: "Terminadas y publicadas. Sin borradores ni nuestras pruebas.",
        },
        cardsOpened: {
          label: "tarjetas abiertas",
          counts: "Sin contar los diez minutos tras enviarla o editarla por última vez.",
        },
        opensEach: {
          label: "aperturas por tarjeta abierta",
          counts: "Una misma persona cuenta una vez al día.",
        },
        openedAgain: {
          label: "abiertas más de una vez",
          counts: "Desde otro dispositivo, navegador o red, u otro día.",
        },
        onPhone: {
          label: "de las aperturas son desde el móvil",
          counts: "De las aperturas con dispositivo conocido; iPad antiguos incluidos.",
        },
        countries: {
          label: "países",
          counts: "Donde se ha pagado una tarjeta.",
        },
      },
    },
    made: {
      label: "Las favoritas",
      heading: "Las cinco tarjetas que más se hacen",
      line: "Debajo, su parte de todas las tarjetas hechas.",
    },
    article: {
      label: "Para tu artículo",
      heading: "Cómo se escribe el nombre y qué imágenes usar",
      checks: [
        "El nombre es {name}; {domain} es su dirección.",
        "Hecho en Riga por {company}, registrada en Letonia en marzo de 2026.",
        "{count} plantillas con demo, en dos idiomas.",
      ],
      logo: "Descargar el icono",
      templates: "Ver todas las plantillas",
    },
    method: {
      label: "Preguntas",
      heading: "Cómo contamos",
      faq: [
        {
          q: "¿Qué cuenta como una tarjeta hecha?",
          a: "Una tarjeta que alguien terminó y publicó, de modo que tiene un enlace que se abre. No se cuentan los borradores ni las tarjetas que hacemos para probar la web. Una tarjeta que su autor ha borrado ya no está en nuestra base de datos, ni en la cuenta.",
        },
        {
          q: "¿Qué cuenta como una apertura?",
          a: "Cada vez que se abre el enlace de una tarjeta; la misma persona en 24 horas cuenta una vez. No contamos los diez minutos tras enviarla o editarla por última vez, cuando casi siempre es quien la envía comprobándola, ni, si se editó después de abrirse, los diez minutos tras esa primera apertura. Así que las cifras se quedan cortas. Cuando quien la envía la mira con su sesión iniciada, no se registra.",
        },
        {
          q: "¿Puedo usar las cifras y las imágenes?",
          a: "Sí. Cita cualquier cifra con su fecha. El póster de la página de cada plantilla puede ilustrar un artículo sobre Ethos; escríbenos si necesitas archivos más grandes. Ninguna cifra nombra ni describe a un cliente.",
        },
        {
          q: "¿Puedo probar una plantilla de pago?",
          a: "Escríbenos y te enviamos un código que abre una.",
        },
      ],
    },
    contact: {
      label: "Contacto",
      heading: "Te responde el equipo de Riga",
      line: "Preguntas, declaraciones o una tarjeta de prueba: una dirección.",
      about: "Sobre Ethos",
    },
  },
};

/** Who makes Ethos, in the About page's own words: the first sentence of its subtitle. */
export function pressFounderLine(locale: PressLocale): string {
  const subtitle = aboutCopy(locale, { templates: 0, single: "" }).subtitle;
  return subtitle.slice(0, subtitle.indexOf(".") + 1);
}

/** The company's name with its quotation marks set as type, not typed: SIA “MIGLAI”, and in Spanish SIA «MIGLAI». */
export function pressCompany(name: string, locale: PressLocale): string {
  return name.replace(/"([^"]*)"/g, locale === "es" ? "«$1»" : "“$1”");
}
