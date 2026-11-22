import type { GiftLocale } from "@/lib/gift/schema";
import { PAGE_UPDATED } from "./page-dates";

/**
 * /digital-cards: the page that says what a digital card is. The owner's category line is "Digital
 * cards by Tryethos" (20 Nov 2026), and until this page nothing on the site defined the thing. It is
 * aimed at "digital cards" and "digital greeting cards" ("tarjetas digitales", "tarjeta de
 * felicitación digital"); /gifts keeps "digital gift" and the two link to each other.
 *
 * The category line appears once, as the eyebrow over the heading, and nowhere else: the breadcrumb
 * search engines read has a plain name of its own.
 *
 * Every price comes in from PRODUCTS for the page's currency and the template count from the
 * manifests: nothing here is typed that the code knows better. What is free matches
 * lib/gift/free-tier.ts (The Letter as a short note); the steps match the editor
 * (components/editor) and the limits match config/site.ts LIMITS.
 */
export const DIGITAL_CARDS_PATH = "/digital-cards";
/** The page's `?ref=` on the way into the editor (lib/attribution/ref.ts). */
export const DIGITAL_CARDS_REF = "digital-cards";

/** The gift finder's address. The finder is another part of the growth build, so a build may not have it. */
export const FINDER_LINK = "/gifts/finder";

/**
 * Whether the finder's page is in this build. A new page arrives with a date of its own in
 * content/page-dates.ts, so the link to the finder appears with the page and never before it: a
 * build without the finder shows no dead link. tests/unit/gift-guides.test.ts holds this answer to
 * the page's file being there, and tests/e2e/gift-pages.spec.ts opens every link in the list.
 */
export function finderIsBuilt(): boolean {
  return Object.hasOwn(PAGE_UPDATED, FINDER_LINK);
}

/**
 * What the page needs from the code: prices as the visitor's currency writes them, two counts
 * (`count` is how many templates there are, `ideas` how many ideas /gifts lists), and whether the
 * finder's page exists to be linked to.
 */
export type DigitalCardsFacts = { single: string; pick3: string; everything: string; extras: string; count: number; ideas: number; finder: boolean };

export type CardKind = {
  /** The card's title: nine words at most. */
  title: string;
  /** The one line the card opens to. */
  brief: string;
  /** The kind in full, with every fact checked against its templates; the card's line is drawn from it. */
  body: string;
  /** The one template shown for this kind, with its poster and its demo. */
  template: string;
  /** Others of the same kind, linked by name. */
  also: string[];
};

export type DigitalCardsCopy = {
  title: string;
  description: string;
  /** The owner's category line, exactly. */
  eyebrow: string;
  /** The page's name in the breadcrumb search engines read: the plain words, without the maker's mark. */
  breadcrumb: string;
  h1: string;
  /** The hero, beside the phone: one italic line, one sentence of at most thirty words, and under the button what the phone is showing. */
  hero: { line: string; sentence: string };
  /** What a digital card is, in full: the closed block under the questions, with the kinds' opening (`kinds.lead`) and `compare` after it. */
  definition: string;
  browse: string;
  /** The three things people confuse, told apart in full, in that closed block. `about` is its summary. */
  compare: { heading: string; rows: { term: string; is: string }[]; about: string };
  /** The deeper band: a card is not an e-card and not a voucher, in a heading, one line and three checks. */
  band: { label: string; heading: string; line: string; checks: [string, string, string] };
  kinds: { label: string; heading: string; lead: string; also: string; watch: string; make: string; items: CardKind[] };
  /** `more` is the summary of the closed block that holds the steps in full. */
  steps: { heading: string; more: string; items: { title: string; body: string }[] };
  /** Three prices are shown as cards (`shown`: their rows); every row is in the closed block `includes`. */
  cost: { label: string; heading: string; line: string; lead: string; rows: { label: string; price: string; note: string }[]; shown: [number, number, number]; includes: string; more: string };
  faq: { label: string; heading: string; items: { q: string; a: string }[] };
  /** Where to go next. Every card is one tap from the hero ("See all 61 cards"), so /templates is not listed again. */
  onward: { label: string; heading: string; links: { href: string; label: string }[] };
};

/** The five kinds, by what a card does when it is opened: the same templates in both languages. */
const KINDS: { template: string; also: string[] }[] = [
  { template: "the-letter", also: ["keepsake", "fireside", "paper-crane"] },
  { template: "scrapbook", also: ["museum", "digicam", "our-timeline", "photo-booth"] },
  { template: "arcade", also: ["scratch-card", "fortune-cookie", "wishbone"] },
  { template: "birthday-cinema", also: ["cap-toss", "the-toast", "string-the-lights"] },
  { template: "halfway", also: ["passport", "midnight-countdown"] },
];

/** Every template the page shows or names, for the tests. */
export const DIGITAL_CARD_TEMPLATES = KINDS.flatMap((k) => [k.template, ...k.also]);

const kinds = (texts: { title: string; brief: string; body: string }[]): CardKind[] => KINDS.map((k, i) => ({ ...k, ...texts[i] }));

export function digitalCardsCopy(locale: GiftLocale, f: DigitalCardsFacts): DigitalCardsCopy {
  if (locale === "es")
    return {
      title: "Tarjetas digitales: felicitaciones que se abren en el móvil",
      description: "Una tarjeta digital es una felicitación que se abre en el móvil, con tus fotos, una canción y tus palabras. En qué se distingue de una e-card y cuánto cuesta.",
      eyebrow: "Tarjetas digitales de Tryethos",
      breadcrumb: "Tarjetas digitales",
      h1: "Una tarjeta que se abre en su móvil",
      hero: {
        line: "Con tus fotos, una canción y tus palabras dentro.",
        sentence: "La haces con una plantilla y la mandas en un enlace o en un código QR impreso.",
      },
      definition:
        "Una tarjeta digital es una tarjeta que se abre y cobra vida en el móvil. Tiene una portada que se toca, algo que ocurre al tocarla y, dentro, tus fotos, una canción y un mensaje con tus palabras. La mandas en un enlace, o imprimes su código QR y lo metes en un sobre. No se instala nada y no hay nada que llevar a correos.",
      browse: `Ver las ${f.count} tarjetas`,
      band: {
        label: "Qué es",
        heading: "Más que una e-card",
        line: "Una e-card es una imagen en un email. Esta responde.",
        checks: ["Se abre en el navegador y hace algo", "La haces tú, para una persona", "No es un vale: no hay saldo que gastar"],
      },
      compare: {
        about: "Más sobre las tarjetas digitales",
        heading: "Tres cosas con casi el mismo nombre",
        rows: [
          { term: "Una tarjeta digital", is: "Se abre en el navegador y hace algo: se despliega, se enciende, cuenta atrás. La haces tú para una persona, a partir de una plantilla." },
          { term: "Una tarjeta electrónica o e-card", is: "Una imagen o una animación corta que llega por email, elegida de un catálogo y firmada con tu nombre." },
          { term: "Una tarjeta regalo", is: "Un vale: saldo para gastar en una tienda, enviado como un código. Útil, y otra cosa distinta. En esta página no hay ninguna." },
        ],
      },
      kinds: {
        label: "Los tipos",
        heading: "Los cinco tipos de tarjeta",
        lead: `Hay ${f.count} tarjetas, ordenadas aquí por lo que hacen al abrirse. De cada tipo se enseña una, y todas tienen una demo completa: mírala antes de hacer la tuya.`,
        also: "Del mismo tipo:",
        watch: "Verla",
        make: "Hacer esta",
        items: kinds([
          {
            title: "Tarjetas que se abren como una carta",
            brief: "Rompen el lacre con un toque y tus palabras se van escribiendo a mano.",
            body: "Un sobre, un sello, papel. Rompen el lacre con un toque y tus palabras se van escribiendo a mano. Elige este tipo cuando el mensaje es el regalo y lo demás no debe estorbar. La que ves es La carta, la única tarjeta con versión gratis: una nota corta de hasta 500 caracteres.",
          },
          {
            title: "Tarjetas hechas con tus fotos",
            brief: "Álbum de recortes pega hasta doce fotos en una página: polaroids, una tira de fotomatón, un carrete.",
            body: "Estas tarjetas son maneras de colocar tus fotos. Álbum de recortes, la que ves, pega hasta doce en una página como polaroids, una tira de fotomatón y un carrete, con una nota rasgada para una frase a mano. Otras las cuelgan en una galería o las cargan en una cámara de 2006. Cada pie de foto puede tener 140 caracteres.",
          },
          {
            title: "Tarjetas con un juego dentro",
            brief: "En Arcade atrapan corazones que caen, y cada nivel superado descubre una de tus fotos.",
            body: "Hay que hacer algo para llegar a tu mensaje. En Arcade, la que ves, atrapan corazones que caen y cada nivel superado descubre una de tus fotos. Otras esconden la noticia bajo una capa que se rasca, o dentro de una galleta de la fortuna que se parte. Es el tipo para quien se moriría de vergüenza con una página de sentimientos, pero juega con gusto para llegar a ellos.",
          },
          {
            title: "Tarjetas para una fecha del calendario",
            brief: "Cine de cumpleaños tiene una tarta con velas que se apagan al soplar al móvil.",
            body: "Hechas para un día concreto y para lo que se hace ese día. Cine de cumpleaños, la que ves, tiene una tarta con velas que se apagan al soplar al móvil. Hay un birrete que lanzar en una graduación, una copa con la que brindar en una boda y unas luces que colgar en Navidad. En una tarjeta de pago eliges el minuto en que se abre, en su zona horaria.",
          },
          {
            title: "Tarjetas para alguien que está lejos",
            brief: "En A medio camino, un avión de papel cruza un mapa desde tu ciudad hasta la suya.",
            body: "Aquí el tema es la distancia. En A medio camino, la que ves, un avión de papel cruza un mapa desde tu ciudad hasta la suya cuando soplan al móvil, y los kilómetros reales bajan mientras vuela. Pasaporte dibuja la ruta en un globo y sella una página por cada foto. Cuenta atrás de medianoche no se abre hasta que es medianoche allí.",
          },
        ]),
      },
      steps: {
        more: "Los cuatro pasos, enteros",
        heading: "Cómo se hace y cómo se envía",
        items: [
          {
            title: "Elige una tarjeta y abre el editor",
            body: "El editor se abre sin cuenta, funciona en el móvil y te enseña la tarjeta cambiando mientras escribes.",
          },
          {
            title: "Mete dentro lo vuestro",
            body: "Su nombre y el tuyo, y un mensaje de hasta 4.000 caracteres. Las fotos salen de tu carrete: hasta veinte, según la tarjeta. Para la música, elige de la biblioteca, sube un archivo o busca una canción de verdad: al final esperan treinta segundos de ella, a un toque.",
          },
          {
            title: "Publica y entra con tu email",
            body: "Para publicar entras con tu email, sin contraseña: te llega un enlace y un código de seis cifras. Si la tarjeta es de pago puedes pagar primero, una sola vez, y entras después. Hasta este paso todo ha sido gratis, el editor entero incluido.",
          },
          {
            title: "Manda el enlace, o imprímelo",
            body: "Copia el enlace en WhatsApp, iMessage, Instagram o un correo. O imprime la tarjeta con el código QR y métela en una de papel: la cámara del móvil la abre.",
          },
        ],
      },
      cost: {
        label: "Precios",
        line: "Un solo pago, sin suscripción. La carta es gratis como nota corta.",
        shown: [1, 2, 3],
        includes: "Qué incluye cada precio",
        heading: "Cuánto cuesta una tarjeta digital",
        lead: "Todos los precios son pagos únicos. Para las tarjetas no hay suscripción.",
        rows: [
          { label: "La carta, como nota corta", price: "Gratis", note: "Hasta 500 caracteres y una canción, con un pequeño pie que dice «Hecho con Ethos»." },
          { label: "Una tarjeta", price: f.single, note: "Una plantilla, para siempre: haz con ella todas las tarjetas que quieras." },
          { label: "Tres tarjetas", price: f.pick3, note: "Tres plantillas, las que tú elijas." },
          { label: "Todas las tarjetas", price: f.everything, note: "Todas, y las que vayan llegando." },
          { label: "La carta completa", price: f.extras, note: "«Hazlo especial»: tus fotos, la carta entera, vídeo y voz en La carta." },
        ],
        more: "Ver todos los precios",
      },
      faq: {
        label: "Preguntas",
        heading: "Preguntas frecuentes",
        items: [
          {
            q: "¿Qué es una tarjeta digital?",
            a: "Una tarjeta que se abre y funciona en el móvil en vez de llegar en un sobre. En Ethos se hace a partir de una plantilla, con tus fotos, una canción y tu mensaje, y se envía en un enlace o en un código QR. Se abre en el navegador, así que no hay nada que instalar.",
          },
          {
            q: "¿Una tarjeta digital es lo mismo que una e-card?",
            a: "No del todo. Una e-card suele ser una imagen o una animación corta que llega por email. Una tarjeta digital de las de aquí es una pequeña página interactiva: se toca, se le sopla o se recorre, y lleva tus propias fotos, tu música y tus palabras.",
          },
          {
            q: "¿Una tarjeta digital es una tarjeta regalo?",
            a: "No. Una tarjeta regalo es un vale por dinero. Una tarjeta digital es la tarjeta en sí, la que de otro modo habrías comprado en una papelería para escribir dentro.",
          },
          {
            q: "¿Se puede enviar una tarjeta de felicitación digital gratis?",
            a: `Sí, de un tipo: La carta como nota corta, hasta 500 caracteres con una canción. Las fotos, una carta más larga y las demás tarjetas son un pago único: ${f.single} por una tarjeta, o ${f.extras} por La carta completa.`,
          },
          {
            q: "¿Cómo se envía una tarjeta digital?",
            a: "Publícala y copia el enlace en cualquier chat o correo, o imprime su código QR. Una tarjeta de pago también se puede programar para que se abra a la hora que elijas, en su zona horaria.",
          },
          {
            q: "¿Puedo hacer una tarjeta digital desde el móvil?",
            a: "Sí. El editor funciona en el navegador del móvil y las fotos salen directamente del carrete. Cuenta unos diez minutos, más si te da por reescribir el mensaje.",
          },
          {
            q: "¿Las tarjetas digitales caducan?",
            a: "No. Los enlaces están pensados para durar, así que la tarjeta se vuelve a abrir el año que viene. Si ves una errata después de enviarla, la corriges y el cambio sale en el mismo enlace.",
          },
        ],
      },
      onward: {
        label: "Y después",
        heading: "Por dónde seguir",
        links: [
          { href: "/gifts", label: "Regalos digitales" },
          ...(f.finder ? [{ href: FINDER_LINK, label: "El buscador de regalos" }] : []),
          { href: "/occasions", label: "Tarjetas por ocasión" },
        ],
      },
    };

  return {
    title: "Digital Cards: Greeting Cards That Open on a Phone",
    description: "A digital card is a greeting card that opens and plays on a phone, with your photos, a song and your words. How it differs from ecards, and what it costs.",
    eyebrow: "Digital cards by Tryethos",
    breadcrumb: "Digital cards",
    h1: "A card that opens on their phone",
    hero: {
      line: "With your photos, a song and your own words inside.",
      sentence: "You make it from a template and send it as a link or a printed QR code.",
    },
    definition:
      "A digital card is a card that opens and plays on a phone. It has a front they tap, something that happens when they do, and inside it your photos, a song and a message in your own words. You send it as a link, or print its QR code and put it in an envelope. Nothing is installed and nothing goes in the post.",
    browse: `See all ${f.count} cards`,
    band: {
      label: "What it is",
      heading: "More than an ecard",
      line: "An ecard is a picture in an email. This one answers back.",
      checks: ["Opens in the browser and does something", "Made by you, for one person", "Not a voucher: no credit to spend in a shop"],
    },
    compare: {
      about: "More about digital cards",
      heading: "Three things with nearly the same name",
      rows: [
        { term: "A digital card", is: "Opens in the browser and does something: unfolds, lights up, counts down. You make it for one person, from a template." },
        { term: "An e-card", is: "A picture or a short animation that arrives by email, chosen from a catalogue and signed with your name." },
        { term: "A digital gift card", is: "A voucher: credit to spend in one shop, sent as a code. Useful, and a different thing. Nothing on this page is one." },
      ],
    },
    kinds: {
      label: "The kinds",
      heading: "The five kinds of card",
      lead: `There are ${f.count} cards, sorted here by what they do when opened. One of each kind is shown, and every card has a full demo: watch it before you make yours.`,
      also: "The same kind:",
      watch: "Watch it",
      make: "Make this one",
      items: kinds([
        {
          title: "Cards that open like a letter",
          brief: "They break the wax with a tap and your words write themselves out by hand.",
          body: "An envelope, a seal, paper. They break the wax with a tap and your words write themselves out by hand. Choose this kind when the message is the gift and everything else should stay out of its way. The Letter is the one shown, and the only card with a free version: a short note of up to 500 characters.",
        },
        {
          title: "Cards built from your photos",
          brief: "Scrapbook tapes up to twelve photos onto a page: polaroids, a photo-booth strip, a roll of film.",
          body: "These cards are layouts for your photos. Scrapbook, shown here, tapes up to twelve onto a page as polaroids, a photo-booth strip and a roll of film, with a torn note for one handwritten line. Others hang them in a gallery or load them onto a camera from 2006. Each caption can be 140 characters.",
        },
        {
          title: "Cards with a game in them",
          brief: "In Arcade they catch falling hearts, and every level cleared reveals one of your photos.",
          body: "They have to do something to reach your message. In Arcade, shown here, they catch falling hearts and every level cleared reveals one of your photos. Others hide the news under foil to scratch off, or inside a fortune cookie to crack. It is the kind for someone who would squirm at a page of feelings and will happily play to get to them.",
        },
        {
          title: "Cards for a date on the calendar",
          brief: "Birthday Cinema has a cake whose candles go out when they blow into the phone.",
          body: "Made for one day and for what people do on it. Birthday Cinema, shown here, has a cake whose candles go out when they blow into the phone. There is a cap to throw at a graduation, a glass to clink at a wedding and a string of lights to hang at Christmas. On a paid card you choose the minute it opens, in their time zone.",
        },
        {
          title: "Cards for someone far away",
          brief: "In Halfway a paper plane crosses a map from your town to theirs.",
          body: "Here the distance is the subject. In Halfway, shown here, a paper plane crosses a map from your town to theirs when they blow into the phone, and the real kilometres count down as it flies. Passport draws the route on a globe and stamps a page for every photo. Midnight Countdown stays shut until it is midnight where they are.",
        },
      ]),
    },
    steps: {
      more: "The four steps, in full",
      heading: "How one gets made and sent",
      items: [
        {
          title: "Pick a card and open the editor",
          body: "The editor opens without an account, works on a phone, and shows the card changing as you type.",
        },
        {
          title: "Put the two of you in it",
          body: "Their name and yours, then a message of up to 4,000 characters. Photos come from your camera roll: up to twenty, depending on the card. For music, choose from the library, upload a file, or search for a real song, which waits at the end as thirty seconds they tap to hear.",
        },
        {
          title: "Publish, and sign in with your email",
          body: "To publish you sign in with your email and no password: you are sent a link and a six-digit code. For a paid card you can pay first, once, and are signed in afterwards. Up to this step everything has been free, the whole editor included.",
        },
        {
          title: "Send the link, or print it",
          body: "Copy the link into WhatsApp, iMessage, Instagram or an email. Or print the QR card and put it inside a paper one: a phone camera opens it.",
        },
      ],
    },
    cost: {
      label: "Prices",
      line: "Paid once, never a subscription. The Letter is free as a short note.",
      shown: [1, 2, 3],
      includes: "What each price includes",
      heading: "What a digital card costs",
      lead: "Every price is a one-time payment. There is no subscription for cards.",
      rows: [
        { label: "The Letter, as a short note", price: "Free", note: "Up to 500 characters and a song, with a small “Made with Ethos” footer." },
        { label: "One card", price: f.single, note: "One template, for good: make as many cards from it as you like." },
        { label: "Three cards", price: f.pick3, note: "Three templates of your choosing." },
        { label: "Every card", price: f.everything, note: "All of them, and the ones still to come." },
        { label: "The full Letter", price: f.extras, note: "“Make it special”: your photos, the whole letter, video and voice on The Letter." },
      ],
      more: "See full pricing",
    },
    faq: {
      label: "Questions",
      heading: "Questions people ask",
      items: [
        {
          q: "What is a digital card?",
          a: "A card that opens and plays on a phone instead of arriving in an envelope. On Ethos it is made from a template, with your photos, a song and your message, and sent as a link or a QR code. It opens in the browser, so there is nothing to install.",
        },
        {
          q: "Is a digital card the same as an e-card?",
          a: "Not quite. An e-card is usually a picture or a short animation delivered by email. A digital card here is a small interactive page: they tap it, blow on it or scroll through it, and it holds your own photos, music and words.",
        },
        {
          q: "Is a digital card a gift card?",
          a: "No. A gift card is a voucher for money. A digital card is the card itself, the one you would otherwise have bought in a shop and written inside.",
        },
        {
          q: "Can I send a digital greeting card for free?",
          a: `Yes, one kind: The Letter as a short note, up to 500 characters with a song. Photos, a longer letter and every other card are a one-time payment: ${f.single} for one card, or ${f.extras} for the full Letter.`,
        },
        {
          q: "How do I send a digital card?",
          a: "Publish it and copy the link into any chat or email, or print its QR code. A paid card can also be set to open at a time you choose, in their time zone.",
        },
        {
          q: "Can I make a digital card on my phone?",
          a: "Yes. The editor runs in the phone's browser and photos come straight from the camera roll. Ten minutes is a fair estimate, longer if you keep rewriting the message.",
        },
        {
          q: "Do digital cards expire?",
          a: "No. Links are meant to be permanent, so a card opens again next year. If you spot a typo after sending, fix it and the change appears at the same link.",
        },
      ],
    },
    onward: {
      label: "Next",
      heading: "Where to go from here",
      links: [
        { href: "/gifts", label: "Digital gifts" },
        ...(f.finder ? [{ href: FINDER_LINK, label: "The gift finder" }] : []),
        { href: "/occasions", label: "Cards by occasion" },
      ],
    },
  };
}
