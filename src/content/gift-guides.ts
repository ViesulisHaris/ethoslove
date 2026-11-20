import type { Occasion } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";
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
 * checked against its schema.ts and Template.tsx on 20 Nov 2026; what is free matches
 * lib/gift/free-tier.ts (a short note on The Letter, nothing more). No price is written here: the
 * pages that need one read it from PRODUCTS.
 */
export const GIFT_GUIDE_SLUGS = ["last-minute", "video-message", "interactive-birthday-card", "virtual-birthday-cake", "photo-album", "anniversary-website"] as const;
export type GiftGuideSlug = (typeof GIFT_GUIDE_SLUGS)[number];

export function isGiftGuide(slug: string): slug is GiftGuideSlug {
  return (GIFT_GUIDE_SLUGS as readonly string[]).includes(slug);
}

/**
 * The pages by kind an occasion page points to: the format pages that sit next to that day's ideas
 * (a birthday's cards and cakes, an anniversary's page and album). Each of those pages links back.
 */
export const GUIDES_FOR_OCCASION: Partial<Record<Occasion, GiftGuideSlug[]>> = {
  birthday: ["interactive-birthday-card", "virtual-birthday-cake", "last-minute"],
  anniversary: ["anniversary-website", "photo-album"],
  "long-distance": ["video-message"],
};

export type GiftGuideIdea = { template: string; heading: string; body: string; line: BorrowedLine };

export type GiftGuide = {
  /** The search result's headline, before " · Ethos". */
  title: string;
  description: string;
  /** The page's h1: the words people type. */
  h1: string;
  /** What the link to this page says elsewhere on the site. */
  label: string;
  /** The opening, in two paragraphs: what this is, then what it honestly isn't or costs. */
  lead: [string, string];
  ideas: GiftGuideIdea[];
  sections: { heading: string; body: string }[];
  faq: { q: string; a: string }[];
  /** The pages that answer the narrower searches, and the neighbours, with what each link says. */
  related: { href: string; label: string }[];
};

const freeEn = {
  q: "Is any of this free?",
  a: "One thing is: The Letter as a short note, up to 500 characters with a song, a countdown and a hidden surprise. Photos, a longer letter, video, voice and every other template are a one-time payment for that template, with no subscription. The editor is free until you publish, so you can build the whole gift and watch it play first.",
};
const freeEs = {
  q: "¿Hay algo gratis?",
  a: "Una cosa: La carta como nota corta, hasta 500 caracteres con una canción, una cuenta atrás y una sorpresa final. Las fotos, una carta más larga, el vídeo, la voz y las demás plantillas son un solo pago por esa plantilla, sin suscripción. El editor es gratis hasta que publicas, así que puedes montar el regalo entero y verlo funcionar antes.",
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
      title: "Last-Minute Digital Gifts You Can Send Today",
      description: "Left it until today? Eight digital gifts you can make in about ten minutes and send as a link, each with a line to borrow and the quickest way to fill it in.",
      h1: "Last-minute digital gifts",
      label: "Last-minute gifts",
      lead: [
        "Nothing ships, so the only deadline is how fast you type. Every gift here is made on your phone, published the moment you finish and sent as a link in the chat you already have open. Ten minutes is a fair estimate for most of them, and the quickest takes five.",
        "The risk with a late gift is that it looks late. So each idea below is the one that looks most planned for the least typing, with a line you can use as it stands. One is free: The Letter, as a short note of up to 500 characters. The rest are paid once, when you publish, and you can build the whole thing first to see whether it is worth it.",
      ],
      ideas: [
        {
          template: "the-letter",
          heading: "The five-minute one: a note under a wax seal",
          body: "Two names and up to 500 characters: that is all the free version asks for. They break the seal with a tap and your words write themselves out in handwriting, with a song if you add one. No photos to hunt for. Five hundred characters is room for one specific memory and one promise, which is what a late note should hold.",
          line: { field: "freeNote", where: "The whole note", text: "I had a plan for today and it fell apart, so here is the part that mattered. You make ordinary days better than I make plans. Dinner is on me and you pick the place." },
        },
        {
          template: "midnight-countdown",
          heading: "Late becomes early: set it for midnight",
          body: "If the day is tomorrow, you are ahead of schedule. Send the link tonight: it shows a clock running down under a darkening sky and opens by itself at the moment you set, in their time zone, with fireworks. It asks for one photo and two short lines, so it is quick. Nobody who gets a gift at 00:00 thinks it was made at 21:40.",
          line: { field: "zeroLine", where: "The line that appears with the fireworks", text: "It's officially your day. I got here first." },
        },
        {
          template: "bouquet",
          heading: "Flowers, without the delivery slot",
          body: "Same-day flower delivery has a cut-off, and you have probably passed it. This bouquet has none: choose the flowers and their colours, up to 24 stems, shuffle the arrangement until it looks right, and write the little card. They watch it come together one flower at a time. Photos are optional, so you can finish it without leaving the editor.",
          line: { field: "cardNote", where: "On the card in the bouquet", text: "Late, but I picked every one." },
        },
        {
          template: "scratch-card",
          heading: "Turn an IOU into a reveal",
          body: "The honest fix for a present that won't arrive in time: tell them what is coming, and make finding out the fun part. Each card hides a photo and its caption under foil they rub off with a finger; the last one carries the news in big letters. One photo is enough and three is better. The parcel can be late. The moment isn't.",
          line: { field: "finalTitle", where: "The headline on the last card", text: "Saturday, 8pm. Wear the green one. It's booked." },
        },
        {
          template: "fortune-cookie",
          heading: "Three fortunes and you are done",
          body: "It asks for three fortunes of up to 140 characters and no photos at all. They crack each cookie with a tap and a slip slides out with what you wrote and their lucky numbers. Make the numbers a date that matters to you both. If you have twenty minutes instead of ten, it holds up to twenty fortunes.",
          line: { field: "fortunes", where: "One of the fortunes", text: "You will forgive someone who left this to the last minute." },
        },
        {
          template: "text-thread",
          heading: "Send it the way you were going to: as texts",
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
          heading: "If it's a birthday: a cake they can blow out",
          body: "For the birthday you remembered at lunch. Their name goes up in lights, a cake waits with one candle per year up to twelve, and they put them out by blowing into the phone or swiping. It needs their name, their age, one photo and your message, which is four fields. Add a second photo if you have ten more seconds.",
          line: { field: "marquee", where: "On the marquee", text: "SAM AT 30: THE DIRECTOR'S CUT" },
        },
      ],
      sections: [
        {
          heading: "Make it look planned",
          body: "Three things give a rushed gift away: a message that could be for anyone, no photo, and an excuse in the first line. Fix them in that order. Write one thing only you would know. Use one photo with a story over five without. And if you mention the hour you made it, do it as a joke near the end, never as the opening.",
        },
        {
          heading: "The ten-minute order",
          body: "Names first, then the message, then one photo, then the song. Skip everything optional on the first pass and publish. A gift can be edited after it is sent and the changes appear at the same link, so the typo you find in the taxi is fixable. Sending it is one paste.",
        },
        {
          heading: "If the day has already gone",
          body: "Belated works when you say so plainly, once, with no excuse attached. “A day late, and I know it” as the first line of a short note does more than a paragraph of reasons. Then send it at a normal hour: a gift that lands at 02:00 the night after reads as panic.",
        },
      ],
      faq: [
        {
          q: "What is the fastest digital gift to make?",
          a: "The Letter as a short note: two names and up to 500 characters, with a song if you want one. It is free and takes about five minutes. Of the paid ones, Fortune Cookie asks for three fortunes and Bouquet needs no photos at all.",
        },
        {
          q: "Can I send it today?",
          a: "Yes. It is published the moment you finish and you get a link straight away: paste it into WhatsApp, iMessage or an email. Nothing is posted and there is no delivery window.",
        },
        {
          q: "Can I make it open at a set time?",
          a: "On a paid template, yes. Choose the date, the hour and their time zone when you publish, and send the link early. Until then the link shows a countdown.",
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
      title: "Regalos digitales de última hora para enviar hoy",
      description: "¿Se te ha echado el día encima? Ocho regalos digitales que se hacen en unos diez minutos y se envían en un enlace, cada uno con una frase lista para usar.",
      h1: "Regalos digitales de última hora",
      label: "De última hora",
      lead: [
        "Aquí no hay envío, así que el único plazo es lo rápido que escribas. Todos estos regalos se hacen desde el móvil, se publican en cuanto terminas y se mandan en un enlace por el chat que ya tienes abierto. Diez minutos es un cálculo justo para casi todos, y el más rápido sale en cinco.",
        "El riesgo de un regalo tardío es que se note. Por eso cada idea es la que más preparada parece con menos texto, con una frase que puedes usar tal cual. Una es gratis: La carta, como nota corta de hasta 500 caracteres. Las demás se pagan una sola vez, al publicar, y antes puedes montarlo entero para ver si te convence.",
      ],
      ideas: [
        {
          template: "the-letter",
          heading: "La de cinco minutos: una nota con sello de lacre",
          body: "Dos nombres y hasta 500 caracteres: eso es todo lo que pide la versión gratis. Rompe el sello con un toque y tus palabras se escriben a mano sobre el papel, con una canción si quieres. Sin fotos que buscar. Quinientos caracteres dan para un recuerdo concreto y una promesa, que es lo que debe llevar una nota tardía.",
          line: { field: "freeNote", where: "La nota entera", text: "Tenía un plan para hoy y se ha torcido, así que aquí va la parte que importaba. Haces mejores los días normales que yo los planes. La cena la pago yo y el sitio lo eliges tú." },
        },
        {
          template: "midnight-countdown",
          heading: "De llegar tarde a llegar antes: prográmalo a medianoche",
          body: "Si el día es mañana, vas con tiempo de sobra. Manda el enlace esta noche: muestra un reloj que baja bajo un cielo que oscurece y se abre solo en el momento que elijas, en su zona horaria, con fuegos artificiales. Pide una foto y dos frases cortas, así que se hace rápido. Nadie que recibe un regalo a las 00:00 piensa que se hizo a las 21:40.",
          line: { field: "zeroLine", where: "La frase que sale con los fuegos", text: "Ya es tu día, oficialmente. He llegado antes que nadie." },
        },
        {
          template: "bouquet",
          heading: "Flores, sin franja de reparto",
          body: "El reparto de flores en el mismo día tiene hora límite, y seguramente ya ha pasado. Este ramo no la tiene: eliges las flores y sus colores, hasta 24 tallos, barajas la composición hasta que quede bien y escribes la tarjetita. Lo ven formarse flor a flor. Las fotos son opcionales, así que lo terminas sin salir del editor.",
          line: { field: "cardNote", where: "En la tarjeta del ramo", text: "Tarde, pero elegidas una a una" },
        },
        {
          template: "scratch-card",
          heading: "Convierte un «te debo una» en una sorpresa",
          body: "El arreglo sincero para un regalo que no llega a tiempo: cuenta lo que viene y haz que descubrirlo sea lo divertido. Cada tarjeta esconde una foto y su pie bajo una capa metalizada que se rasca con el dedo; la última lleva la noticia en letras grandes. Con una foto basta y con tres queda mejor. El paquete puede retrasarse. El momento, no.",
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
          body: "Ibas a escribirle de todas formas. Esto es lo mismo, con puesta en escena: tus mensajes llegan burbuja a burbuja con los puntitos de «escribiendo», y el último es el párrafo que nunca mandarías en frío. El mínimo son dos burbujas y el máximo, cuarenta. Llegar tarde puede ser la broma del principio, siempre que las últimas burbujas vayan en serio.",
          line: { field: "lines", where: "La primera burbuja", text: "vale, confieso: he empezado esto hace una hora" },
        },
        {
          template: "the-council",
          heading: "Una vista, un mazo y un sello de goma",
          body: "Lo gracioso disimula la prisa mejor que lo tierno. Un tribunal de gatos celebra una vista sobre la persona a la que se lo regalas: tú pones la acusación, escribes una conclusión para que la lea cada gato y eliges el sello que cae al final: culpable, visto bueno, certificado o indulto. Las fotos entran como pruebas y son opcionales. Tu carta es la sentencia completa.",
          line: { field: "charge", where: "La acusación", text: "ser imposible de regalar, un año más" },
        },
        {
          template: "birthday-cinema",
          heading: "Si es un cumpleaños: una tarta que se sopla",
          body: "Para el cumpleaños del que te has acordado a la hora de comer. Su nombre sale en luces, espera una tarta con una vela por año hasta doce, y las apaga soplando al móvil o deslizando el dedo. Pide su nombre, su edad, una foto y tu mensaje: cuatro campos. Añade una segunda foto si te sobran diez segundos.",
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
          body: "Primero los nombres, luego el mensaje, después una foto y al final la canción. En la primera pasada sáltate todo lo opcional y publica. Un regalo se puede editar cuando ya está enviado y los cambios salen en el mismo enlace, así que la errata que veas en el taxi tiene arreglo. Enviarlo es pegar una vez.",
        },
        {
          heading: "Si el día ya ha pasado",
          body: "Felicitar con retraso funciona cuando lo dices claro, una vez y sin excusa. «Un día tarde, y lo sé» como primera línea de una nota corta hace más que un párrafo de motivos. Y mándalo a una hora normal: un regalo que llega a las dos de la madrugada de la noche siguiente suena a pánico.",
        },
      ],
      faq: [
        {
          q: "¿Cuál es el regalo digital más rápido de hacer?",
          a: "La carta como nota corta: dos nombres y hasta 500 caracteres, con una canción si quieres. Es gratis y lleva unos cinco minutos. De los de pago, Galleta de la fortuna pide tres fortunas y Ramo no necesita ninguna foto.",
        },
        {
          q: "¿Puedo enviarlo hoy mismo?",
          a: "Sí. Se publica en cuanto terminas y te da un enlace al momento: pégalo en WhatsApp, iMessage o un correo. No viaja ningún paquete y no hay franja de entrega.",
        },
        {
          q: "¿Puedo hacer que se abra a una hora concreta?",
          a: "En una plantilla de pago, sí. Eliges el día, la hora y su zona horaria al publicar, y mandas el enlace antes. Hasta entonces el enlace muestra una cuenta atrás.",
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
      title: "Video Message Gifts: Your Clip Inside a Card",
      description: "Five digital gifts that take a video clip and two that take your voice: where each one plays it, the 50 MB limit, and what to film so it lands.",
      h1: "Video message gifts",
      label: "Video message gifts",
      lead: [
        "A video sent in a chat is watched once, between two other messages. Put the same clip inside a gift and it has an opening, a place of its own and a letter beside it. Five templates on Ethos take a video clip, one clip per gift: an MP4 or MOV file of up to 50 MB. The editor's own advice is to keep it under a minute.",
        "Two things to know before you film. The clip starts muted when they scroll to it and one tap turns the sound on, so don't put the important sentence in the first second. And video is a paid feature: it comes with any premium template, and on The Letter with “Make it special”. The last two ideas use a voice message, which every template takes once it is unlocked, and which is easier if you hate being on camera.",
      ],
      ideas: [
        {
          template: "museum",
          heading: "A screening room at the end of the gallery",
          body: "Each photo hangs framed in a room of its own with a plaque, and the clip gets the last room to itself: dark walls and the video on the far one, like the film at the end of an exhibition. Use it for what a photo can't hold: the dog greeting them, the street you grew up on, a table of people shouting the same thing. It takes two to twenty photos.",
          line: { field: "exhibition", where: "The exhibition title", text: "The Ana Retrospective: ten years, mostly laughing" },
        },
        {
          template: "birthday-cinema",
          heading: "The people who couldn't be there, after the candles",
          body: "Once the candles are out and the confetti has fired, the clip is the first thing on the screen, framed above a film strip of your photos. It suits a group: ask five people for five seconds of “happy birthday” each and join them in your phone's video editor. Five seconds each keeps the file far under the limit, and nobody rambles.",
          line: { field: "marquee", where: "On the marquee", text: "ONE NIGHT ONLY: MAYA TURNS 25" },
        },
        {
          template: "our-timeline",
          heading: "The newest stop on the road, moving",
          body: "A road draws itself down the page and pins a dated photo at every milestone, two at least and twenty at most. The clip comes after the closing line, so it reads as the latest entry: the years in photographs, then the two of you moving and talking. Film it this week, on purpose, and say the date out loud.",
          line: { field: "ending", where: "The closing line, just above the clip", text: "And this is us last week. Still ridiculous." },
        },
        {
          template: "garden",
          heading: "Under the letter, in the greenhouse",
          body: "They walk down a page that grows as they scroll: seedlings, a meadow, your photos on a trellis, then a greenhouse with your letter on the potting table. The clip sits in a frame right under the letter. A slow pan works better here than a talking head: their real garden, the pots on the balcony, the walk you take together.",
          line: { field: "tag", where: "The tag tied to the bouquet at the end", text: "Cut from the garden you taught me to keep" },
        },
        {
          template: "the-letter",
          heading: "A letter with you in it",
          body: "The envelope opens, the letter writes itself out, the photos drop as polaroids, and the clip arrives last on a postcard of its own. Write the letter as the reasons and keep the video for the part that is better heard: a promise, an apology, the song you can't sing. On The Letter, video comes with “Make it special”.",
          line: { field: "signOff", where: "The sign-off", text: "Now play the video. I practised," },
        },
        {
          template: "vinyl",
          heading: "No camera: your voice after the last track",
          body: "They drop the needle, the record spins with the music and your photos flip past as album covers. When it is over, your voice message is waiting on the last screen: up to a minute, recorded in the editor on your own phone. Say what the song is about and why it is theirs. It does what a caption can't.",
          line: { field: "album", where: "The album title on the record label", text: "Songs I Can't Hear Without You" },
        },
        {
          template: "halfway",
          heading: "For long distance: the plane lands, then you speak",
          body: "When someone is far away, hearing you is what they are short of. They blow into the phone and a paper plane rides their breath across a map from your town to theirs, the kilometres counting down, until the postcard flips to your letter. On the last screen: up to a minute of you talking. Record it somewhere quiet, in one take.",
          line: { field: "halfwayNote", where: "The line that pops up as it passes the middle", text: "Halfway is somewhere over the sea. I checked. Still too far." },
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
          body: "A voice message is a minute at most and plays on the last screen of the gift, after everything else. You record it in the editor, on any template you have unlocked, and can re-record until it is right. People keep these. A text can be reread, but a voice is the only part of a gift that sounds like you.",
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
          a: "Their name, yours and a message, plus at least one photo: two for Our Timeline and Museum. The clip is an addition to the gift, so a video can't be sent with nothing around it.",
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
      title: "Regalos con mensaje en vídeo: tu clip dentro de una tarjeta",
      description: "Cinco regalos digitales que llevan un vídeo y dos que llevan tu voz: dónde lo pone cada uno, el límite de 50 MB y qué grabar para que llegue.",
      h1: "Regalos con mensaje en vídeo",
      label: "Con mensaje en vídeo",
      lead: [
        "Un vídeo mandado por el chat se ve una vez, entre otros dos mensajes. Mete ese mismo clip en un regalo y tiene una apertura, un sitio propio y una carta al lado. En Ethos hay cinco plantillas que llevan vídeo, un clip por regalo: un archivo MP4 o MOV de hasta 50 MB. El propio editor aconseja que no pase de un minuto.",
        "Dos cosas antes de grabar. El clip empieza sin sonido cuando llegan a él y el sonido se activa con un toque, así que no pongas la frase importante en el primer segundo. Y el vídeo es de pago: viene con cualquier plantilla premium, y en La carta con «Hazlo especial». Las dos últimas ideas usan un mensaje de voz, que admite cualquier plantilla una vez desbloqueada y que es más fácil si no soportas verte en cámara.",
      ],
      ideas: [
        {
          template: "museum",
          heading: "Una sala de proyección al final de la galería",
          body: "Cada foto cuelga enmarcada en su propia sala, con su placa, y el clip se queda la última para él solo: paredes oscuras y el vídeo en la del fondo, como la película al final de una exposición. Úsalo para lo que una foto no puede guardar: el perro saliendo a recibirle, la calle donde creciste, una mesa entera gritando lo mismo. Admite de dos a veinte fotos.",
          line: { field: "exhibition", where: "El título de la exposición", text: "Retrospectiva Ana: diez años, casi todos riéndonos" },
        },
        {
          template: "birthday-cinema",
          heading: "Los que no pudieron ir, después de las velas",
          body: "Cuando se apagan las velas y salta el confeti, el clip es lo primero que aparece, enmarcado sobre una tira de película con tus fotos. Va muy bien en grupo: pide a cinco personas cinco segundos de «feliz cumpleaños» cada una y únelos en el editor de vídeo del móvil. Con cinco segundos por cabeza el archivo queda muy por debajo del límite, y nadie se enrolla.",
          line: { field: "marquee", where: "En la marquesina", text: "ÚNICA FUNCIÓN: MAYA CUMPLE 25" },
        },
        {
          template: "our-timeline",
          heading: "La última parada del camino, en movimiento",
          body: "Un camino se dibuja página abajo y clava una foto con su fecha en cada hito, dos como mínimo y veinte como máximo. El clip va después de la frase final, así que se lee como la entrada más reciente: los años en fotos y, luego, vosotros moviéndoos y hablando. Grábalo esta semana, a propósito, y di la fecha en voz alta.",
          line: { field: "ending", where: "La frase final, justo encima del clip", text: "Y esto somos nosotros la semana pasada. Igual de ridículos." },
        },
        {
          template: "garden",
          heading: "Bajo la carta, en el invernadero",
          body: "Bajan por una página que crece al deslizar: brotes, un prado, tus fotos en una celosía y un invernadero con tu carta sobre la mesa. El clip va en un marco justo debajo de la carta. Aquí funciona mejor un plano lento que una cara hablando: su jardín de verdad, las macetas del balcón, el paseo que dais siempre.",
          line: { field: "tag", where: "La etiqueta atada al ramo del final", text: "Cortado del jardín que me enseñaste a cuidar" },
        },
        {
          template: "the-letter",
          heading: "Una carta contigo dentro",
          body: "El sobre se abre, la carta se va escribiendo, las fotos caen como polaroids y el clip llega al final, en una postal propia. Escribe en la carta los motivos y guarda el vídeo para lo que se entiende mejor oído: una promesa, una disculpa, la canción que no sabes cantar. En La carta, el vídeo viene con «Hazlo especial».",
          line: { field: "signOff", where: "La despedida", text: "Ahora dale al vídeo. He ensayado," },
        },
        {
          template: "vinyl",
          heading: "Sin cámara: tu voz después de la última canción",
          body: "Ponen la aguja, el disco gira con la música y tus fotos pasan como portadas de discos. Cuando termina, tu mensaje de voz espera en la última pantalla: hasta un minuto, grabado en el editor con tu propio móvil. Cuenta de qué va la canción y por qué es suya. Hace lo que un pie de foto no puede.",
          line: { field: "album", where: "El título del disco, en la galleta", text: "Canciones que no puedo oír sin ti" },
        },
        {
          template: "halfway",
          heading: "Para la distancia: aterriza el avión y hablas tú",
          body: "Cuando alguien está lejos, lo que le falta es oírte. Sopla al móvil y un avión de papel cruza con su aliento un mapa desde tu ciudad hasta la suya, con los kilómetros bajando, hasta que la postal se da la vuelta y aparece tu carta. En la última pantalla, hasta un minuto de ti hablando. Grábalo en un sitio tranquilo y de una sola toma.",
          line: { field: "halfwayNote", where: "La frase que aparece al pasar la mitad", text: "La mitad cae en medio del mar. Lo he mirado. Sigue siendo lejos." },
        },
      ],
      sections: [
        {
          heading: "Qué grabar",
          body: "Elige una de tres: un mensaje a cámara, varias personas diciendo una frase cada una, o un lugar. Una idea por clip. Ponte de cara a una ventana y di su nombre en la primera frase, pero lo importante un poco después, cuando ya haya tocado para oírlo. Treinta segundos parecen muchos mientras grabas y pocos mientras se ven.",
        },
        {
          heading: "Grábalo en horizontal",
          body: "En Museo, Cine de cumpleaños, Nuestra línea del tiempo y La carta el clip se ve en un marco ancho, con forma de televisor, y un vídeo grabado en vertical se recorta para caber. Gira el móvil antes de grabar. La imagen fija que se ve antes de que empiece sale de medio segundo después del principio, así que para entonces ya tienes que estar en el plano y mirando.",
        },
        {
          heading: "La voz, si el vídeo te supera",
          body: "Un mensaje de voz dura un minuto como mucho y suena en la última pantalla del regalo, después de todo lo demás. Se graba en el editor, en cualquier plantilla que tengas desbloqueada, y puedes repetirlo hasta que salga. Son lo que la gente guarda. Un texto se puede releer, pero la voz es la única parte de un regalo que suena a ti.",
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
          a: "Su nombre, el tuyo y un mensaje, y al menos una foto: dos en Nuestra línea del tiempo y en Museo. El clip es un añadido al regalo, así que no se puede mandar un vídeo sin nada alrededor.",
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
      lead: [
        "An interactive birthday card is one that waits for them to do something. They tap, and a paper card folds open. They blow into the phone, and the candles go out. They pop a balloon, and a photo falls out of it. What they do to the card is the reason they show it to whoever is sitting next to them.",
        "These are the eight on Ethos made for a birthday, sorted by what the person does. Every one takes your photos, a song and a message of your own, and each is paid once, when you publish. This page is about the cards themselves. What to write in one, and when to send it, is on the birthday ideas page linked at the foot.",
      ],
      ideas: [
        {
          template: "popup-card",
          heading: "They open it: a paper card with a cake in the fold",
          body: "The closest thing to a card from a shop, until it moves. One tap and it folds open on a table: a three-tier paper cake rises out of the crease with their age on the topper, and balloons and pennants stand up behind it. They tap each candle to light it, up to five, then blow into the phone or swipe up. Your letter is inside the lid, in handwriting.",
          line: { field: "banner", where: "On the pennants over the cake", text: "older, still louder" },
        },
        {
          template: "birthday-cinema",
          heading: "They blow: candles that go out a few at a time",
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
          body: "An invitation that opens into a long birthday collage: their age in foil balloons, your photos in polaroids, and ten animals in party hats who each jump and yell a line of yours when tapped. A tap anywhere else pops confetti under the finger. Further down there is a cake with their age in number candles, to tap or to blow out.",
          line: { field: "shouts", where: "One of the ten lines the animals yell", text: "you don't look a day over the last one" },
        },
        {
          template: "sketchbook",
          heading: "They turn the page: a card that draws itself",
          body: "A coil-bound sketchbook with their name on the cover. Each page inks itself in as they turn to it: a cake with candles, their age circled twice, a party hat, arrows and hearts, with watercolour bleeding in behind the lines. Your photos are taped between the doodles, up to twelve, and the last page is your letter. It is the quiet one of the eight.",
          line: { field: "title", where: "The hand-lettered line over the cake", text: "another lap, well done" },
        },
        {
          template: "digicam",
          heading: "They press the shutter: a camera from 2006",
          body: "A pocket camera lies on a collage with happy birthday cut out of magazines above it. They press power, the lens whirs out, and your photos are on the roll with an orange date stamp in the corner and your captions in pixel type. Every press of the shutter fires the flash and moves to the next photo; after the last, the camera prints the whole roll as a strip.",
          line: { field: "caption", where: "A photo caption, on the camera's screen", text: "IMG_0412: you, pretending not to pose" },
        },
        {
          template: "midnight-countdown",
          heading: "They wait: a card that opens at midnight",
          body: "The only one that makes them wait. Send it early and it shows a clock counting down under a sky going from dusk to night. At zero, in the time zone you chose, fireworks go off and it opens on your photos and your message. Of the eight it does the least when touched and the most when timed right.",
          line: { field: "headline", where: "Above the timer", text: "Until you're officially older than me again" },
        },
        {
          template: "arcade",
          heading: "They play: a tiny game that rains cake",
          body: "A retro arcade game where the things that fall can be slices of cake. They drag a basket to catch them; every level cleared reveals one of your photos, up to eight, and the last one reveals your message. Eight catches a level is the default, and you can lower it to three for someone who would rather get to the photos.",
          line: { field: "title", where: "The game's title", text: "NORA VS. THE BIG 3-0" },
        },
      ],
      sections: [
        {
          heading: "How the blowing works",
          body: "Three of these listen for breath: Birthday Cinema, Pop-up Card and Party Animals. The card asks for the microphone with a button, only when the cake is on screen, and listens for about half a second of steady rushing air. Nothing is recorded or sent anywhere. If they say no, or the phone can't, a swipe or a tap puts the candles out, and on the first two you can switch the microphone off altogether in the editor.",
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
          a: "A birthday card that opens on a phone and answers the person holding it: it folds open on a tap, the candles go out when they blow, a balloon pops and drops a photo. On Ethos you add their name, your photos, a song and your message, and send it as a link or a printed QR code.",
        },
        {
          q: "Do they need an app to open it?",
          a: "No. It opens in the browser from a link or a QR code, on iPhone and Android. The microphone is asked for with a button, only for the candles, and saying no still works with a swipe.",
        },
        {
          q: "Can the card arrive at midnight?",
          a: "Yes, on any of these eight. When you publish, set the date, the hour and their time zone, and send the link whenever you like. Until then it shows a countdown, and at 00:00 it opens.",
        },
        {
          q: "Is one of these birthday cards free?",
          a: "Not these eight. Each is a one-time payment for that card, with no subscription, and the editor is free until you publish, so you can build it and watch it first. The free gift on Ethos is The Letter, as a short note of up to 500 characters with a song. It works for a birthday. It has no candles.",
        },
        keepEn,
      ],
      related: [
        { href: "/occasions/birthday", label: "Birthday gift ideas: what to write and when to send" },
        { href: "/gifts/virtual-birthday-cake", label: "Virtual birthday cakes" },
        { href: "/blog/what-to-write-in-boyfriends-birthday-card", label: "What to write in a boyfriend's birthday card" },
        { href: "/gifts/last-minute", label: "Last-minute gifts" },
      ],
    },
    es: {
      title: "Tarjetas de cumpleaños interactivas: tocar, explotar, soplar",
      description: "Ocho tarjetas de cumpleaños interactivas: velas que se apagan al soplar, globos que sueltan fotos, una tarjeta que se despliega. Con una frase para cada una.",
      h1: "Tarjetas de cumpleaños interactivas",
      label: "Tarjetas de cumpleaños interactivas",
      lead: [
        "Una tarjeta de cumpleaños interactiva es la que espera a que hagan algo. Tocan, y una tarjeta de papel se despliega. Soplan al móvil, y las velas se apagan. Explotan un globo, y cae una foto. Lo que le hacen a la tarjeta es el motivo por el que se la enseñan a quien tengan al lado.",
        "Estas son las ocho de Ethos hechas para un cumpleaños, ordenadas por lo que hace quien la recibe. Todas llevan tus fotos, una canción y un mensaje tuyo, y cada una se paga una sola vez, al publicar. Esta página va de las tarjetas. Qué escribir en ellas y cuándo enviarlas está en la página de ideas de cumpleaños, enlazada al final.",
      ],
      ideas: [
        {
          template: "popup-card",
          heading: "La abren: una tarjeta de papel con una tarta en el pliegue",
          body: "Lo más parecido a una tarjeta de papelería, hasta que se mueve. Un toque y se despliega sobre una mesa: una tarta de papel de tres pisos se levanta del pliegue con su edad en el topper, y detrás se alzan globos y banderines. Tocan cada vela para encenderla, hasta cinco, y luego soplan al móvil o deslizan hacia arriba. Tu carta está dentro de la tapa, escrita a mano.",
          line: { field: "banner", where: "En los banderines, sobre la tarta", text: "un año más de ruido" },
        },
        {
          template: "birthday-cinema",
          heading: "Soplan: velas que se apagan de pocas en pocas",
          body: "El telón se abre sobre una marquesina con su nombre en luces y, después, una tarta con una vela por año hasta doce. A partir de ahí son seis velas y la edad en número encima. Un toque en «Usar el micrófono» y un soplido de verdad las va apagando de pocas en pocas, como pasa al soplar. Quien prefiera no dar permiso al micrófono desliza hacia arriba. Luego, confeti y una tira de película con tus fotos.",
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
          line: { field: "caption", where: "Un pie de foto, en la pantalla de la cámara", text: "IMG_0412: tú, fingiendo que no posas" },
        },
        {
          template: "midnight-countdown",
          heading: "Esperan: una tarjeta que se abre a medianoche",
          body: "La única que hace esperar. Mándala antes y muestra un reloj que baja bajo un cielo que pasa del atardecer a la noche. A cero, en la zona horaria que elegiste, estallan los fuegos artificiales y se abre con tus fotos y tu mensaje. De las ocho es la que menos hace al tocarla y la que más hace si aciertas con la hora.",
          line: { field: "headline", where: "Sobre el contador", text: "Hasta que vuelvas a ser mayor que yo, oficialmente" },
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
          a: "Una tarjeta de cumpleaños que se abre en el móvil y responde a quien la tiene en la mano: se despliega con un toque, las velas se apagan al soplar, un globo explota y suelta una foto. En Ethos añades su nombre, tus fotos, una canción y tu mensaje, y la envías en un enlace o en un código QR impreso.",
        },
        {
          q: "¿Hace falta una app para abrirla?",
          a: "No. Se abre en el navegador desde un enlace o un código QR, en iPhone y en Android. El micrófono se pide con un botón, solo para las velas, y si dicen que no funciona igual deslizando el dedo.",
        },
        {
          q: "¿Puede llegar a medianoche?",
          a: "Sí, con cualquiera de las ocho. Al publicar, elige el día, la hora y su zona horaria, y manda el enlace cuando quieras. Hasta entonces muestra una cuenta atrás, y a las 00:00 se abre.",
        },
        {
          q: "¿Alguna de estas tarjetas es gratis?",
          a: "Estas ocho, no. Cada una es un solo pago por esa tarjeta, sin suscripción, y el editor es gratis hasta que publicas, así que puedes montarla y verla antes. El regalo gratis de Ethos es La carta, como nota corta de hasta 500 caracteres con una canción. Sirve para un cumpleaños. No tiene velas.",
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
      lead: [
        "Three cards on Ethos have a cake with candles that go out when the person blows into their phone. The microphone does it: the card listens for about half a second of breath and puts the flames out, with smoke. Nobody can cut these cakes or eat them. They can make a wish on one, which is the part that counts when you can't be in the room.",
        "Below are those three, then two more with a cake in them that works differently: one that draws itself and one you catch. Five is all there are, so five is the list. Each takes their age, your photos, a song and your message, and each is paid once when you publish.",
      ],
      ideas: [
        {
          template: "birthday-cinema",
          heading: "The one with the most candles",
          body: "A cake on a stage between red curtains, with flames that flicker and lean when they breathe near the phone. A child turning eight gets eight candles. Anyone past twelve gets six, and their age as a number on top, which is kinder to everybody. One breath takes a few candles at a time, so a full cake needs two or three goes, the way a real one does.",
          line: { field: "marquee", where: "On the marquee above the cake", text: "MAKE A WISH, LENA. WE'RE ALL WATCHING." },
        },
        {
          template: "popup-card",
          heading: "The one they light first",
          body: "A three-tier paper cake that stands up out of a card as it opens, their age on the topper. The candles start unlit. They tap each one to light it, up to five, and only then does the card ask for a wish and a breath. Lighting them first slows the moment down, which suits someone opening it alone on the morning of their birthday.",
          line: { field: "banner", where: "On the pennants over the cake", text: "make a wish, Jo" },
        },
        {
          template: "party-animals",
          heading: "The one with an audience",
          body: "Partway down a collage full of animals in party hats sits a cake with their age in number candles. They tap it or blow into the phone, the flames go out, and every animal around the cake cheers at once. The guests yell lines you wrote when tapped, so give one of them an opinion about the wish.",
          line: { field: "shouts", where: "One of the lines the animals yell", text: "BLOW. we can't hold these hats forever" },
        },
        {
          template: "sketchbook",
          heading: "The one that draws itself",
          body: "No blowing here, to be plain about it: this cake is a drawing. The first page of the sketchbook inks it in line by line while they watch, with one candle per year up to eight and their age circled twice beside it. Choose it for someone who would feel silly blowing at a phone on the bus. The photos taped onto the later pages do the rest.",
          line: { field: "title", where: "The hand-lettered line over the cake", text: "make a wish in ink" },
        },
        {
          template: "arcade",
          heading: "The one they catch",
          body: "Set what falls to cake slices and the birthday cake becomes a game. They drag a basket along the bottom of the screen to catch them, and each level cleared reveals a photo. It is the only cake here with a score. Send it to a brother, a best friend, or anyone whose reply to a soppy card would be one emoji.",
          line: { field: "title", where: "The game's title", text: "CAKE QUEST: LEVEL 30" },
        },
      ],
      sections: [
        {
          heading: "Before they open it",
          body: "Tell them to turn the sound on and hold the phone the way they would lean over a cake, a hand's width from their mouth. The card shows a “Use microphone” button when the cake appears, and the phone asks permission once. In a loud room the candles may go out early, because any steady rush of noise can count as breath. At a party, nobody minds.",
        },
        {
          heading: "If the microphone says no",
          body: "Some people refuse every permission on principle, and some phones won't offer the microphone at all. Nothing breaks. Birthday Cinema and Pop-up Card go out on a swipe up, and Party Animals on a tap. In the editor those first two have a setting called “Blowing out the candles”, and choosing “Swipe only” there means the microphone is never asked for.",
        },
        {
          heading: "A cake for someone far away",
          body: "The usual way is a video call with a cake held up to the camera, which someone else then eats. Send this the same evening instead, or schedule it for midnight where they are. Get on the call afterwards and ask what they wished for. They won't tell you, which is correct.",
        },
      ],
      faq: [
        {
          q: "Can you really blow out candles on a phone?",
          a: "Yes. The card uses the phone's microphone to hear breath: about half a second of steady rushing air puts the flames out. It asks for the microphone with a button, only when the cake is on screen, and nothing is recorded.",
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
          a: "Yes. If the microphone isn't available, or they say no, a swipe or a tap puts the candles out instead. Nothing has to be set up for that to happen.",
        },
        {
          q: "Is a virtual birthday cake free?",
          a: "No. Each of these five is a one-time payment for that card, with no subscription. The editor is free until you publish, so you can build the cake and blow it out yourself first. The free gift on Ethos is The Letter as a short note, which has no cake.",
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
      h1: "Una tarta de cumpleaños virtual con velas que se soplan",
      label: "Tartas de cumpleaños virtuales",
      lead: [
        "En Ethos hay tres tarjetas con una tarta cuyas velas se apagan cuando alguien sopla al móvil. Lo hace el micrófono: la tarjeta espera medio segundo de soplido y apaga las llamas, con su humo. Estas tartas no se pueden cortar ni comer. Sí se puede pedir un deseo, que es lo que cuenta cuando no puedes estar allí.",
        "Abajo están esas tres y dos más con una tarta que funciona de otra forma: una que se dibuja sola y otra que se atrapa. No hay más que cinco, así que la lista tiene cinco. Cada una lleva su edad, tus fotos, una canción y tu mensaje, y cada una se paga una sola vez al publicar.",
      ],
      ideas: [
        {
          template: "birthday-cinema",
          heading: "La que tiene más velas",
          body: "Una tarta en un escenario, entre telones rojos, con llamas que tiemblan y se inclinan cuando respiran cerca del móvil. Quien cumple ocho tiene ocho velas. Quien pasa de doce tiene seis, y la edad en número encima, que es más amable para todo el mundo. Cada soplido apaga unas pocas, así que una tarta llena pide dos o tres intentos, como una de verdad.",
          line: { field: "marquee", where: "En la marquesina, sobre la tarta", text: "PIDE UN DESEO, LENA. TE ESTAMOS MIRANDO." },
        },
        {
          template: "popup-card",
          heading: "La que se enciende primero",
          body: "Una tarta de papel de tres pisos que se levanta de la tarjeta al abrirla, con su edad en el topper. Las velas empiezan apagadas. Tocan cada una para encenderla, hasta cinco, y solo entonces la tarjeta pide un deseo y un soplido. Encenderlas antes alarga el momento, y eso le va bien a quien la abre a solas la mañana de su cumpleaños.",
          line: { field: "banner", where: "En los banderines, sobre la tarta", text: "pide un deseo, Jo" },
        },
        {
          template: "party-animals",
          heading: "La que tiene público",
          body: "A mitad de un collage lleno de animales con gorrito hay una tarta con su edad en velas de número. La tocan o soplan al móvil, las llamas se apagan y todos los animales de alrededor lo celebran a la vez. Los invitados gritan frases tuyas al tocarlos, así que dale a uno una opinión sobre el deseo.",
          line: { field: "shouts", where: "Una de las frases que gritan los animales", text: "SOPLA. el gorro no se aguanta solo" },
        },
        {
          template: "sketchbook",
          heading: "La que se dibuja sola",
          body: "Aquí no se sopla, para que quede claro: esta tarta es un dibujo. La primera página del cuaderno la va entintando línea a línea mientras miran, con una vela por año hasta ocho y su edad rodeada dos veces al lado. Elígela para alguien a quien le daría apuro soplarle al móvil en el autobús. Las fotos pegadas en las páginas siguientes hacen el resto.",
          line: { field: "title", where: "La frase rotulada sobre la tarta", text: "pide un deseo a tinta" },
        },
        {
          template: "arcade",
          heading: "La que se atrapa",
          body: "Elige que caigan trozos de tarta y la tarta de cumpleaños se convierte en un juego. Arrastran una cesta por la parte de abajo de la pantalla para atraparlos, y cada nivel superado descubre una foto. Es la única tarta de aquí con marcador. Mándasela a un hermano, a tu mejor amiga o a cualquiera que contestaría a una tarjeta cursi con un solo emoji.",
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
          a: "Cine de cumpleaños pone una por año hasta doce; a partir de ahí, seis velas y la edad en número encima. Tarjeta pop-up tiene hasta cinco, con la edad en el topper. Fiesta Animal pone la edad en la tarta con velas de número. Cuaderno dibuja hasta ocho.",
        },
        {
          q: "¿Se puede cortar la tarta?",
          a: "No. Ninguna de estas tartas se corta ni se reparte: son para las velas y el deseo. Si cortar una tarta a la vez es importante, hacedlo por videollamada y manda la tarjeta para el deseo.",
        },
        {
          q: "¿Funciona sin micrófono?",
          a: "Sí. Si no hay micrófono, o dicen que no, las velas se apagan deslizando el dedo o con un toque. No hay que configurar nada para que pase.",
        },
        {
          q: "¿Una tarta de cumpleaños virtual es gratis?",
          a: "No. Cada una de estas cinco es un solo pago por esa tarjeta, sin suscripción. El editor es gratis hasta que publicas, así que puedes montar la tarta y soplarla tú antes. El regalo gratis de Ethos es La carta como nota corta, que no tiene tarta.",
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
      title: "Interactive Photo Albums: A Digital Memory Book to Send",
      description: "Eight interactive photo albums you send as a link: a gallery, a road of dates, a camera roll, a sky of stars. How many photos each holds, and what to caption.",
      h1: "Interactive photo albums",
      label: "Interactive photo albums",
      lead: [
        "A photo album you send as a link is a set of photos with an order, captions and a way of being looked through. That last part is where these eight differ. One hangs each photo in a gallery room. One pins them along a road with dates. One hides them on a camera from 2006. The photos are yours. How they get found is the gift.",
        "The real limits, so you can choose before you start: most of these hold 8 to 12 photos and two hold 20, and a caption can be 140 characters. Photos are a paid feature on Ethos, so every album here is paid once, when you publish, and the editor is free until then. Pick by how many photos you have and how much you want to say about each.",
      ],
      ideas: [
        {
          template: "museum",
          heading: "A gallery, one photo to a room",
          body: "Up to twenty photos, each hung alone on a wall in a room of its own with a plaque underneath: your caption as the title, then the years you set for the show. They swipe from room to room, and the last wall is your message, set like the text at the end of an exhibition. Write the captions the way museums do, deadpan, and it gets funnier with every room.",
          line: { field: "caption", where: "A photo caption, on its plaque", text: "Untitled (You, Asleep on the Train), 2022. On loan from my camera roll." },
        },
        {
          template: "our-timeline",
          heading: "A road with a date at every photo",
          body: "For photos that have an order. A road draws itself down the page and pins each photo at a milestone with a label of its own, twenty stops at most. Say what happened, not only when. It ends on a closing line and a countdown, so point the countdown at the next thing: the trip, the move, the wedding.",
          line: { field: "dates", where: "The label at one milestone", text: "March 2021: the flat with loud pipes" },
        },
        {
          template: "scrapbook",
          heading: "A scrapbook page, taped and pinned",
          body: "The one that looks handmade. Cut-out letters spell the title, and up to twelve photos land on the page as polaroids that develop, a photo-booth strip, a stamp and a roll of film, taped and pinned between flowers. There is a torn note for one handwritten line, and a typed letter from you. Five page styles, from Blossom to Seaside.",
          line: { field: "quote", where: "The handwritten line on the torn note", text: "Proof that we do, occasionally, leave the house." },
        },
        {
          template: "digicam",
          heading: "A camera roll from 2006",
          body: "Twelve photos at most, shown on the small screen of a pocket camera with an orange date stamp in the corner. They flick through with the arrows or a swipe, and at the end the camera prints the whole roll as one strip. Set the stamp to the real date of the trip and it reads like a roll you found in a drawer. Switch off “It's their birthday” and the title becomes their name.",
          line: { field: "caption", where: "A photo caption, on the camera's screen", text: "DSC_0031: the night the car broke down and we didn't mind" },
        },
        {
          template: "constellations",
          heading: "A night sky with a photo in every star",
          body: "Three to twelve photos, each one a star. They tap a star to fly to it and see the photo; when every star has been visited, lines join them into a heart, an infinity sign or a star, and your closing line appears under it. It asks for patience, in a good way: nobody skims an album they have to find.",
          line: { field: "finalLine", where: "The line that appears when the constellation completes", text: "Twelve nights I'd live again, in the order they happened." },
        },
        {
          template: "vinyl",
          heading: "A crate of records with your photos as the sleeves",
          body: "They drop the needle, the record turns with the music, and your photos sit in a crate as album covers to flip through, up to twelve. Your message is printed as the liner notes, and you name the album and the artist yourself. The song matters most here, so choose it first and pick the photos that belong to it.",
          line: { field: "album", where: "The album title", text: "Greatest Hits of a Very Long Summer" },
        },
        {
          template: "keepsake",
          heading: "A box of kept things, with a locket",
          body: "A parcel sealed with wax opens onto a box of saved things: your first photo under dried flowers, a ticket, one word torn from a book, and a gold locket that opens on a tap to your second photo, with a few characters engraved inside. Nine photos in all. It suits a small set chosen with care more than a big one.",
          line: { field: "engraving", where: "Engraved inside the locket", text: "14.06 · the pier" },
        },
        {
          template: "music-box",
          heading: "A mirror that shows a new photo with every turn",
          body: "They wind a key three turns, the lid lifts, and a ballerina or two swans turn while the box plays Swan Lake, Brahms' Lullaby or Für Elise. Up to eight photos come up one at a time in the oval mirror inside the lid, and a tap on the mirror brings one close. When the spring runs down, a folded letter lifts out, with all the photos after it.",
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
          body: "A caption has 140 characters, which is one good sentence. Don't describe what the photo already shows. Say what happened just before it or just after, or what somebody said. “Ten minutes before the rain” does more than “Us at the beach”, and “You had just lost the keys” does more than both.",
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
          a: "Yes, up to 140 characters per photo. It shows as the plaque in Museum, under the polaroid in Scrapbook and in pixel type on the Digicam's screen.",
        },
        {
          q: "Can I change the photos after I have sent it?",
          a: "Yes. Open the gift from My gifts, change the photos and publish again. The change appears at the same link, so there is nothing to resend.",
        },
        {
          q: "Is a photo album free?",
          a: "No. Photos are a paid feature, so each album is a one-time payment for that template, with no subscription. You can build it in the editor and watch it play before you pay. The free gift on Ethos is The Letter as a short note, without photos.",
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
      title: "Álbumes de fotos interactivos: un libro de recuerdos digital",
      description: "Ocho álbumes de fotos interactivos que se envían en un enlace: una galería, un camino con fechas, un carrete, un cielo. Cuántas fotos caben en cada uno.",
      h1: "Álbumes de fotos interactivos",
      label: "Álbumes de fotos interactivos",
      lead: [
        "Un álbum de fotos que se manda en un enlace es un conjunto de fotos con un orden, unos pies de foto y una manera de recorrerlo. En eso último se diferencian estos ocho. Uno cuelga cada foto en la sala de una galería. Otro las clava a lo largo de un camino con fechas. Otro las esconde en una cámara de 2006. Las fotos son tuyas. La forma de encontrarlas es el regalo.",
        "Los límites reales, para elegir antes de empezar: en casi todos caben de 8 a 12 fotos y en dos caben 20, y un pie de foto puede tener 140 caracteres. En Ethos las fotos son de pago, así que cada álbum se paga una sola vez, al publicar, y el editor es gratis hasta entonces. Elige según cuántas fotos tengas y cuánto quieras contar de cada una.",
      ],
      ideas: [
        {
          template: "museum",
          heading: "Una galería, con una foto por sala",
          body: "Hasta veinte fotos, cada una sola en una pared de su propia sala, con una placa debajo: tu pie de foto como título y los años que le pongas a la exposición. Pasan de sala en sala deslizando, y la última pared es tu mensaje, compuesto como el texto que cierra una exposición. Escribe los pies como los escriben los museos, con toda la seriedad, y cada sala hace más gracia.",
          line: { field: "caption", where: "Un pie de foto, en su placa", text: "Sin título (Tú, durmiendo en el tren), 2022. Cedida por mi carrete." },
        },
        {
          template: "our-timeline",
          heading: "Un camino con una fecha en cada foto",
          body: "Para fotos que tienen un orden. Un camino se dibuja página abajo y clava cada foto en un hito con su propia etiqueta, veinte paradas como máximo. Cuenta qué pasó, no solo cuándo. Termina con una frase y una cuenta atrás, así que apunta la cuenta atrás a lo siguiente: el viaje, la mudanza, la boda.",
          line: { field: "dates", where: "La etiqueta de un hito", text: "Marzo de 2021: el piso de las tuberías" },
        },
        {
          template: "scrapbook",
          heading: "Una página de álbum, con cinta y chinchetas",
          body: "El que parece hecho a mano. Unas letras recortadas forman el título, y hasta doce fotos caen en la página como polaroids que se revelan, una tira de fotomatón, un sello y un carrete, pegadas con cinta y chinchetas entre flores. Hay una nota rasgada para una frase a mano y una carta tuya a máquina. Cinco estilos de página, de Flores a Playa.",
          line: { field: "quote", where: "La frase a mano de la nota rasgada", text: "Pruebas de que, a veces, salimos de casa." },
        },
        {
          template: "digicam",
          heading: "Un carrete de 2006",
          body: "Doce fotos como máximo, en la pantallita de una cámara de bolsillo, con la fecha naranja en la esquina. Las pasan con las flechas o deslizando, y al final la cámara imprime el carrete entero en una tira. Pon en el sello la fecha real del viaje y parecerá un carrete encontrado en un cajón. Desactiva «Es su cumpleaños» y el título pasa a ser su nombre.",
          line: { field: "caption", where: "Un pie de foto, en la pantalla de la cámara", text: "DSC_0031: la noche que se averió el coche y nos dio igual" },
        },
        {
          template: "constellations",
          heading: "Un cielo de noche con una foto en cada estrella",
          body: "De tres a doce fotos, cada una en una estrella. Tocan una estrella para volar hasta ella y ver la foto; cuando las han visitado todas, unas líneas las unen en un corazón, un infinito o una estrella, y debajo aparece tu frase final. Pide paciencia, en el buen sentido: nadie pasa deprisa un álbum que hay que ir encontrando.",
          line: { field: "finalLine", where: "La frase que aparece al completar la constelación", text: "Doce noches que repetiría, en el orden en que pasaron." },
        },
        {
          template: "vinyl",
          heading: "Una caja de discos con tus fotos de portada",
          body: "Ponen la aguja, el disco gira con la música y tus fotos esperan en una caja como portadas de discos para ir pasando, hasta doce. Tu mensaje va impreso en las notas del libreto, y el nombre del disco y el del artista los pones tú. Aquí manda la canción, así que elígela primero y busca las fotos que le pertenecen.",
          line: { field: "album", where: "El título del disco", text: "Grandes éxitos de un verano muy largo" },
        },
        {
          template: "keepsake",
          heading: "Una caja de cosas guardadas, con un relicario",
          body: "Un paquete con sello de lacre se abre sobre una caja de cosas guardadas: tu primera foto bajo flores secas, un billete, una palabra arrancada de un libro y un relicario de oro que se abre con un toque y enseña tu segunda foto, con unos pocos caracteres grabados dentro. Nueve fotos en total. Le va mejor una selección pequeña y cuidada que una grande.",
          line: { field: "engraving", where: "Grabado dentro del relicario", text: "14.06 · el muelle" },
        },
        {
          template: "music-box",
          heading: "Un espejo que enseña una foto nueva con cada vuelta",
          body: "Dan tres vueltas a una llave, la tapa se levanta y una bailarina o dos cisnes giran mientras la caja toca El lago de los cisnes, la Canción de cuna de Brahms o Para Elisa. Hasta ocho fotos aparecen una a una en el espejo ovalado de la tapa, y con un toque en el espejo se ven de cerca. Cuando se acaba la cuerda sale una carta doblada y, después, todas las fotos.",
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
          a: "No. Las fotos son de pago, así que cada álbum es un solo pago por esa plantilla, sin suscripción. Puedes montarlo en el editor y verlo funcionar antes de pagar. El regalo gratis de Ethos es La carta como nota corta, sin fotos.",
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
      description: "Make a surprise anniversary page from your photos, dates and song, with no code. Seven formats, what goes in each, and how to keep it hidden until the day.",
      h1: "An anniversary website for your girlfriend or boyfriend",
      label: "Anniversary websites",
      lead: [
        "People who search for an anniversary website usually want one of two things: a page that tells the story of the two of them, or a surprise their partner opens on the day. You can code one over a weekend, host it, and hope it works on their phone. Or you can fill one in tonight. These are single pages with a link of their own, made from your photos, your dates and your song.",
        "To be plain about what you get: one page at a tryethos.io link, opened in a browser, with nothing to install. It is not a site with its own domain name or several pages. In return it does things a hand-built page rarely does, like staying shut until midnight or asking for a password. Each format is paid once, when you publish, and one of them has a free version.",
      ],
      ideas: [
        {
          template: "our-timeline",
          heading: "The story page: a road with a stop for every year",
          body: "The closest thing to the “our story” site people picture. A road draws itself as they scroll and stops at each photo, labelled in your words: the first message, the first trip, the keys. Two to twenty stops. It ends on a closing line and a live countdown, which you can aim at tonight's dinner or at next year's date.",
          line: { field: "ending", where: "The closing line, above the countdown", text: "Year four starts here. Same seats?" },
        },
        {
          template: "museum",
          heading: "The gallery page: an exhibition of the two of you",
          body: "A site with rooms. Give the exhibition a title, put the years on every plaque, and hang up to twenty photos, one to a wall, each with a caption. They swipe from room to room like visitors, and the last wall carries your message as the curator's text. A video clip can have a room of its own.",
          line: { field: "exhibition", where: "The exhibition title", text: "Three Years of Us: A Retrospective" },
        },
        {
          template: "the-letter",
          heading: "The single page: a letter under a seal",
          body: "If the website you have in mind is really a letter, send a letter. An envelope with your initial pressed into the wax opens on a tap, and the page writes itself out in handwriting. As a short note of up to 500 characters it is free. With “Make it special” it holds the full letter, your photos as polaroids, a video and a voice message.",
          line: { field: "greeting", where: "The greeting, in place of “Dear…”", text: "To the person who answered at 1 a.m.," },
        },
        {
          template: "scratch-card",
          heading: "The surprise page: news under foil",
          body: "For an anniversary with a secret in it. They rub the foil off a stack of cards with a finger; each hides a photo and its caption, and the last one carries the announcement in big letters: the trip, the ring, the reservation. You choose the words printed on the foil, so the cover gives nothing away.",
          line: { field: "finalTitle", where: "The headline on the last card", text: "We're going back to where we met. Friday." },
        },
        {
          template: "unwrapped",
          heading: "The stats page: your year in numbers",
          body: "The page a developer would build to show off, already built. A row of presents, each hiding a number from your year that counts up when the paper comes off: voice notes, flights, arguments about the thermostat. Up to eight, written by you, number first. The last present prints the whole year as a receipt with both your names on it.",
          line: { field: "stats", where: "One of the eight numbers", text: "58 trains missed for one more coffee" },
        },
        {
          template: "passport",
          heading: "The long-distance page: a route between two cities",
          body: "For an anniversary spent in two places. A passport with their name on the cover opens, a globe turns, and a route draws itself from your city to theirs, with up to six stopovers for the places you have met. The pages fill with stamps, one for each photo up to ten, and the visa page holds your message.",
          line: { field: "nationality", where: "The nationality line", text: "Resident of the 22:10 call" },
        },
        {
          template: "midnight-countdown",
          heading: "The page that isn't there until midnight",
          body: "A surprise page needs a reveal, and this one is built around it. Send the link days before and all they see is a clock running down over a skyline at dusk. At the second you chose, in their time zone, fireworks go off and the page opens on your photos and your words. It holds up to twenty photos.",
          line: { field: "headline", where: "Above the timer", text: "Three years ago today you said yes to a second coffee" },
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
          a: "Yes, on any paid format. You choose the password when you publish, and they type it before the page opens.",
        },
        {
          q: "Will the page stay online?",
          a: "Yes. Links are meant to be permanent, so it opens again on the next anniversary. You can add this year's photos to it then: edits go live at the same link.",
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
      description: "Haz una página de aniversario sorpresa con vuestras fotos, vuestras fechas y vuestra canción, sin programar. Siete formatos y cómo esconderla hasta el día.",
      h1: "Una página web de aniversario para tu novia o tu novio",
      label: "Páginas web de aniversario",
      lead: [
        "Quien busca una página web de aniversario suele querer una de dos cosas: una página que cuente la historia de los dos, o una sorpresa que su pareja abra ese día. Puedes programarla en un fin de semana, alojarla y cruzar los dedos para que funcione en su móvil. O puedes rellenar una esta noche. Estas son páginas únicas con su propio enlace, hechas con vuestras fotos, vuestras fechas y vuestra canción.",
        "Para que quede claro lo que es: una página en un enlace de tryethos.io, que se abre en el navegador, sin instalar nada. No es un sitio con dominio propio ni con varias páginas. A cambio hace cosas que una página hecha a mano casi nunca hace, como quedarse cerrada hasta medianoche o pedir una contraseña. Cada formato se paga una sola vez, al publicar, y uno de ellos tiene versión gratis.",
      ],
      ideas: [
        {
          template: "our-timeline",
          heading: "La página de vuestra historia: un camino con una parada por año",
          body: "Lo más parecido a la web de «nuestra historia» que todo el mundo se imagina. Un camino se dibuja al deslizar y se detiene en cada foto, con una etiqueta en tus palabras: el primer mensaje, el primer viaje, las llaves. De dos a veinte paradas. Termina con una frase y una cuenta atrás en vivo, que puedes apuntar a la cena de esta noche o a la fecha del año que viene.",
          line: { field: "ending", where: "La frase final, sobre la cuenta atrás", text: "Aquí empieza el cuarto año. ¿Mismos asientos?" },
        },
        {
          template: "museum",
          heading: "La página galería: una exposición de los dos",
          body: "Una web con salas. Ponle título a la exposición, escribe los años en cada placa y cuelga hasta veinte fotos, una por pared, cada una con su pie. Pasan de sala en sala como visitantes, y la última pared lleva tu mensaje como texto del comisario. Un clip de vídeo puede tener una sala para él solo.",
          line: { field: "exhibition", where: "El título de la exposición", text: "Tres años de nosotros: una retrospectiva" },
        },
        {
          template: "the-letter",
          heading: "La página única: una carta con sello de lacre",
          body: "Si la web que tienes en la cabeza es en realidad una carta, manda una carta. Un sobre con tu inicial en el lacre se abre con un toque, y la página se va escribiendo a mano. Como nota corta de hasta 500 caracteres es gratis. Con «Hazlo especial» lleva la carta completa, tus fotos como polaroids, un vídeo y un mensaje de voz.",
          line: { field: "greeting", where: "El saludo, en vez de «Querido…»", text: "A quien contestó a la una de la madrugada:" },
        },
        {
          template: "scratch-card",
          heading: "La página sorpresa: una noticia bajo el metalizado",
          body: "Para un aniversario con secreto. Rascan con el dedo una baraja de tarjetas; cada una esconde una foto y su pie, y la última lleva el anuncio en letras grandes: el viaje, el anillo, la reserva. Las palabras impresas sobre la capa metalizada las eliges tú, para que la portada no cuente nada.",
          line: { field: "finalTitle", where: "El titular de la última tarjeta", text: "Volvemos a donde nos conocimos. El viernes." },
        },
        {
          template: "unwrapped",
          heading: "La página de los datos: vuestro año en números",
          body: "La página que haría un programador para lucirse, ya hecha. Una fila de regalos, cada uno con un número de vuestro año que sube al quitar el papel: audios, vuelos, discusiones por el termostato. Hasta ocho, escritos por ti, con el número delante. El último regalo imprime el año entero como un tique con vuestros dos nombres.",
          line: { field: "stats", where: "Uno de los ocho números", text: "58 trenes perdidos por un café más" },
        },
        {
          template: "passport",
          heading: "La página a distancia: una ruta entre dos ciudades",
          body: "Para un aniversario vivido en dos sitios. Un pasaporte con su nombre en la portada se abre, gira un globo y se dibuja una ruta desde tu ciudad hasta la suya, con hasta seis escalas para los lugares donde os habéis visto. Las páginas se llenan de sellos, uno por foto hasta diez, y la página del visado guarda tu mensaje.",
          line: { field: "nationality", where: "La línea de la nacionalidad", text: "Residente de la llamada de las 22:10" },
        },
        {
          template: "midnight-countdown",
          heading: "La página que no existe hasta medianoche",
          body: "Una página sorpresa necesita un momento de destaparse, y esta está hecha alrededor de eso. Manda el enlace días antes y solo se ve un reloj que baja sobre una ciudad al atardecer. En el segundo que elegiste, en su zona horaria, estallan los fuegos artificiales y la página se abre con tus fotos y tus palabras. Caben hasta veinte fotos.",
          line: { field: "headline", where: "Sobre el contador", text: "Hoy hace tres años dijiste que sí a un segundo café" },
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
          body: "Si sabes programar y te apetece practicar, sí. Una página hecha a mano es un regalo en sí misma, y se va a notar las horas que te llevó. Dale un enlace que pueda conservar, pruébala en su móvil y no solo en tu portátil, y comprueba que sigue cargando dentro de un año. Si lo que importa es que funcione ese día, usa uno de los formatos de arriba y dedica el fin de semana que te ahorras a la carta.",
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
          a: "Sí, en cualquier formato de pago. Eliges la contraseña al publicar, y hay que escribirla antes de que la página se abra.",
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
};
