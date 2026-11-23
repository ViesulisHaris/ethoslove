import { aboutCopy } from "@/content/about";
import type { PressFigureId, PressLocale, ReminderOccasion } from "@/lib/press/figures";

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
    reminder: { labels: Record<ReminderOccasion, string>; counts: string };
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
    metaTitle: "Ethos in numbers: facts, figures and pictures for the press",
    metaDescription:
      "How many cards people have made with Ethos, how often they are opened and which templates lead, counted from our own database. With pictures to use and an address to write to.",
    h1: "Ethos in numbers",
    sentence:
      "Ethos is a website for making a personal card that opens on a phone: your photos, your words and a song, sent as a link or a printed QR code.",
    write: "Write to us",
    mailSubject: "Press",
    sample: "Sample figures, not real ones",
    numbers: {
      label: "The numbers",
      heading: "Counted from our own database",
      line: "Every figure is a count, rounded down.",
      asOf: "Counted on {date}.",
      figures: {
        cardsMade: {
          label: "cards made",
          counts: "Finished and published. Drafts and our own tests are left out.",
        },
        cardsOpened: {
          label: "cards opened",
          counts: "Opened ten minutes or more after they were sent.",
        },
        opensEach: {
          label: "opens per opened card",
          counts: "The same visitor within a day counts once.",
        },
        openedAgain: {
          label: "opened more than once",
          counts: "By a second person, or on another day.",
        },
        onPhone: {
          label: "of opens are on a phone",
          counts: "On an iPhone or an Android device.",
        },
        countries: {
          label: "countries",
          counts: "Where a card has been paid for.",
        },
      },
      reminder: {
        labels: {
          birthday: "of reminders are for a birthday",
          anniversary: "of reminders are for an anniversary",
          valentines: "of reminders are for Valentine's Day",
        },
        counts: "Of the dates people set a reminder for.",
      },
    },
    made: {
      label: "Most made",
      heading: "The five cards people make most",
      line: "Each opens its own page, with a demo.",
    },
    article: {
      label: "For your article",
      heading: "The name, the makers, the pictures",
      checks: [
        "Written {name}. The address is {domain}.",
        "Made in Riga by {company}, registered in Latvia in March 2026.",
        "{count} templates, each with a live demo, in two languages.",
      ],
      logo: "Download the logo",
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
          a: "Each time a card's link is opened; the same visitor within 24 hours counts once. An open in the first ten minutes after a card is sent is left out, because most of those are the sender checking it. A signed-in sender's own look is not recorded at all.",
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
      heading: "Write to the people who make it",
      line: "Questions, a quote, a card to try: one address.",
      about: "About Ethos",
    },
  },
  es: {
    nav: "Prensa",
    metaTitle: "Ethos en cifras: datos, números e imágenes para la prensa",
    metaDescription:
      "Cuántas tarjetas se han hecho con Ethos, cuántas veces se abren y qué plantillas van primero, contado en nuestra propia base de datos. Con imágenes para usar y una dirección a la que escribir.",
    h1: "Ethos en cifras",
    sentence:
      "Ethos es una web para hacer una tarjeta personal que se abre en el móvil: tus fotos, tus palabras y una canción, enviadas como enlace o como código QR impreso.",
    write: "Escríbenos",
    mailSubject: "Prensa",
    sample: "Cifras de muestra, no reales",
    numbers: {
      label: "Las cifras",
      heading: "Contadas en nuestra propia base de datos",
      line: "Cada cifra es un recuento, redondeado a la baja.",
      asOf: "Contado el {date}.",
      figures: {
        cardsMade: {
          label: "tarjetas hechas",
          counts: "Terminadas y publicadas. Sin borradores ni nuestras propias pruebas.",
        },
        cardsOpened: {
          label: "tarjetas abiertas",
          counts: "Abiertas diez minutos o más después de enviarse.",
        },
        opensEach: {
          label: "aperturas por tarjeta abierta",
          counts: "La misma visita en un día cuenta una vez.",
        },
        openedAgain: {
          label: "abiertas más de una vez",
          counts: "Por una segunda persona, o en otro día.",
        },
        onPhone: {
          label: "de las aperturas, en un móvil",
          counts: "En un iPhone o un dispositivo Android.",
        },
        countries: {
          label: "países",
          counts: "Donde se ha pagado una tarjeta.",
        },
      },
      reminder: {
        labels: {
          birthday: "de los recordatorios, de cumpleaños",
          anniversary: "de los recordatorios, de aniversario",
          valentines: "de los recordatorios, de San Valentín",
        },
        counts: "Entre las fechas con un recordatorio puesto.",
      },
    },
    made: {
      label: "Las más hechas",
      heading: "Las cinco tarjetas que más se hacen",
      line: "Cada una abre su página, con una demo.",
    },
    article: {
      label: "Para tu artículo",
      heading: "El nombre, quién lo hace, las imágenes",
      checks: [
        "Se escribe {name}. La dirección es {domain}.",
        "Hecho en Riga por {company}, registrada en Letonia en marzo de 2026.",
        "{count} plantillas, cada una con su demo, en dos idiomas.",
      ],
      logo: "Descargar el logo",
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
          a: "Cada vez que se abre el enlace de una tarjeta; la misma visita en 24 horas cuenta una vez. Una apertura en los diez primeros minutos tras el envío no se cuenta, porque casi siempre es quien la envía comprobándola. Cuando quien la envía la mira con su sesión iniciada, no se registra.",
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
      heading: "Escribe a quienes lo hacen",
      line: "Preguntas, una declaración, una tarjeta de prueba: una dirección.",
      about: "Sobre Ethos",
    },
  },
};

/** Who makes Ethos, in the About page's own words: the first sentence of its subtitle. */
export function pressFounderLine(locale: PressLocale): string {
  const subtitle = aboutCopy(locale, { templates: 0, single: "" }).subtitle;
  return subtitle.slice(0, subtitle.indexOf(".") + 1);
}
