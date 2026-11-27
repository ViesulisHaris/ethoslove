# Draft: /gifts/birthday-ecards (not published, not reviewed)

Written 2026-11-27. It passes every test but one: `tests/unit/ecard-pages.test.ts` ("the guard lets the routine's files through") takes the first page file in the folder as its sample and expects `"christmas-ecards"` in it, so any slug that sorts before "christmas" fails. Once a person fixes that test, a run can copy the block below into `src/content/ecards/pages/birthday-ecards.ts`, check the facts again and run the panel.

```ts
import type { EcardPage } from "../types";

export const page: EcardPage = {
  slug: "birthday-ecards",
  added: "2026-11-27",
  occasion: "birthday",
  photo: "p3",
  cover: "front-page",
  en: {
    title: "Happy Birthday Ecards: Funny, Animated, One Free",
    description: "Happy birthday ecards that open on a phone: a front page about them, stickers to slap, a court of cats. One is free, and each has a line to borrow.",
    h1: "Birthday ecards that start with a tap",
    label: "Birthday ecards",
    hero: {
      line: "A birthday card they tap, scratch, pop or scroll through.",
      sentence: "Each of these birthday ecards is made on your phone and sent as one link, and a paid one can stay closed until midnight.",
    },
    ideasTitle: "Seven to send today",
    craft: "Before you press send",
    film: "sticker-bomb",
    lead: [
      "A birthday ecard used to be a cartoon in an email. These seven are small scenes that open on a phone with your words inside: a front page about them, a page they cover in stickers, a court of cats, a chat that types itself out. You write it, add photos and a song if you want them, and send one link by text, WhatsApp or email.",
      "{note:One is free: The Letter, as a short note of up to 500 characters with a song.|One of these is free: The Letter.} Each of the other six is a one-time payment when you publish, with no subscription, and the design is then yours for good. You can build the whole card and watch it before deciding. A paid card can also be set to open at midnight on the day.",
    ],
    ideas: [
      {
        template: "the-letter",
        heading: "The free one: a birthday note under a seal",
        body: "An envelope tied with twine waits on a desk, sealed with your initial. They tap the seal, the twine goes, the flap lifts and the letter unfolds, dated the day they open it. Under “Dear” and their name, {note:your note of up to 500 characters|your letter} types itself out while a song plays. Skip the list of wishes. Write about one birthday you spent together and what you would do again.",
        line: { field: "freeNote", where: "The whole note", text: "Happy birthday. Last year you spent it carrying boxes into the new place and still made pancakes for everyone who helped. This year the only thing you’re lifting is a fork. Dinner’s booked for eight." },
      },
      {
        template: "front-page",
        heading: "A newspaper where they are the only story",
        body: "A folded newspaper waits on a table by some glasses, a pen and a coffee cup. One tap opens it into a front page: The Daily and their name on the masthead unless you rename the paper, today’s date, your headline in capitals, a lead photo with its caption and your message set as the story. Then the weather (sunny, with a 100% chance of cake, unless you write your own), up to eight classified ads and a horoscope. Make the headline something that really happened this year, reported dead straight.",
        line: { field: "headline", where: "The headline", text: "Maya, 35, still cannot fold a fitted sheet" },
      },
      {
        template: "sticker-bomb",
        heading: "Twelve taps, twelve stickers, then the card",
        body: "An empty page with one line on it: their name and an order to slap some stickers. Each tap slaps one down right under the finger: cats in shark hats, a hamster with cake, your photos as polaroids, and under some a label-maker strip of up to 28 characters, written by you. After the twelfth comes confetti, and your card slides up in handwriting. Fill the strips with nicknames only your group uses.",
        line: { field: "labels", where: "One of the label-maker strips", text: "texts back in 4 to 6 weeks" },
      },
      {
        template: "the-council",
        heading: "The funny one: a court of cats rules",
        body: "A bench of cats hears the case against the birthday person. The charge is yours to write. They tap through the hearing: each cat reads out one of your findings, up to six of 90 characters, then the ruling comes with a rubber stamp, guilty, approved, certified icon or pardoned, as you choose. Your photos go in as exhibits, up to six, and the full ruling is your letter. For a birthday, charge them with the year they just had.",
        line: { field: "charge", where: "The charge", text: "turning 30 and still refusing to own a calendar" },
      },
      {
        template: "text-thread",
        heading: "Their phone lights up with your messages",
        body: "Three messages from you land on their lock screen, the last one saying you made them something. They tap, the chat opens, and your messages arrive one by one, typing dots between them and a small pop as each lands, with a photo wherever you typed [photo], up to twelve. Your name is in the header and your letter is the final message. Keep the first lines as dull as a real text, so the last one lands.",
        line: { field: "lines", where: "The first message of the chat", text: "it’s 12:01 and I wanted to be the first" },
      },
      {
        template: "scratch-card",
        heading: "The present, under the foil of the last card",
        body: "A ticket lies on a counter with a coin beside it and their name printed on it. They tap to begin and rub the foil off each card with a finger; when it clears, confetti bursts and one of your photos shows with its caption, up to twelve cards. The last one carries your big line, up to 60 characters, with your message under it. Put the actual present there, written as plainly as a booking.",
        line: { field: "finalTitle", where: "The big line on the last card", text: "Saturday, 10 a.m.: the pottery class you keep mentioning" },
      },
      {
        template: "balloons",
        heading: "Balloons to pop, a photo in each",
        body: "A ceiling of balloons drifts in under their age in gold foil numbers. Bunting spells out a line of yours, one letter to a pennant, up to 24. Each balloon they pop drops a polaroid of one of your photos, captioned, up to eight. The biggest waits until the others are gone, and it is holding your letter. Leave their name on the wall and give the bunting the joke.",
        line: { field: "banner", where: "The bunting", text: "welcome to your thirties" },
      },
    ],
    sections: [
      {
        heading: "Pick the card by the person",
        body: "Someone who laughs at themselves gets the front page or the court of cats. A group of friends that lives in one chat gets the stickers, with labels only they understand. Someone far away gets the text thread, because it looks like the conversation you already have. Then write one detail only you know.",
      },
      {
        heading: "Make it open at midnight",
        body: "Most birthday messages arrive once people are awake, so the one that opens at midnight gets read alone. A paid card can be scheduled: in the editor, under Extras, switch on Schedule the reveal and pick the date, the hour and their time zone. Send the link the evening before. Until the hour comes, it shows a countdown.",
      },
      {
        heading: "Sending it on WhatsApp or by text",
        body: "Paste the link into WhatsApp, a text or an email, or into the group chat so everyone sees it open. It opens in the browser with nothing to install. Print the QR code as well if there is a paper card or a present to tuck it into, and a phone camera opens the same card.",
      },
    ],
    faq: [
      {
        q: "Are these birthday ecards free?",
        a: "{note:One is: The Letter as a short note, up to 500 characters with a song.|One is: The Letter.} Each of the other six is a one-time payment, with no subscription: the design is yours for good, and you can build the whole card and watch it before you pay.",
      },
      { q: "How do I send a birthday ecard on WhatsApp?", a: "Publish it and you get one link. Paste it into a WhatsApp chat, a text or an email, and they tap it to open the card. There is also a QR code you can print and put inside a paper card." },
      { q: "Can I send one without signing up?", a: "You can make the whole card and watch it with no account. You sign in when you publish, and the person who gets it signs up for nothing: they just open the link." },
      { q: "Can a birthday ecard arrive at midnight?", a: "Yes, on a paid card. In the editor, under Extras, switch on Schedule the reveal and set the date, the hour and their time zone. Send the link whenever you like: until then it shows a countdown, and at midnight it opens." },
      { q: "Does the person need an app to open it?", a: "No. It opens in the browser on any phone or computer, from the link or the QR code, and nobody needs an account to see it." },
      { q: "What should I write in a birthday ecard?", a: "One thing from this year that only the two of you know about, then what you hope the next year holds for them. A joke works best when it is one they already tell about themselves. Each card above has a line you can borrow." },
    ],
    related: [
      { href: "/occasions/birthday", label: "Birthday gift ideas" },
      { href: "/gifts/interactive-birthday-card", label: "Interactive birthday cards" },
      { href: "/gifts/virtual-birthday-cake", label: "Virtual birthday cakes" },
      { href: "/digital-cards", label: "Digital cards" },
    ],
  },
  es: {
    title: "Tarjetas de cumpleaños virtuales, una gratis",
    description: "Tarjetas de cumpleaños virtuales que se abren en el móvil: una portada sobre quien cumple, stickers que pegar, un tribunal de gatos. Una es gratis.",
    h1: "Tarjetas de cumpleaños virtuales que empiezan con un toque",
    label: "Tarjetas de cumpleaños virtuales",
    hero: {
      line: "Una tarjeta que se toca, se rasca, se explota o se lee como un chat.",
      sentence: "Cada una se hace en el móvil y se manda en un enlace, y una de pago puede esperar cerrada hasta medianoche.",
    },
    ideasTitle: "Siete para mandar hoy",
    craft: "Antes de darle a enviar",
    film: "sticker-bomb",
    lead: [
      "Una tarjeta de cumpleaños virtual solía ser un dibujo en un correo. Estas siete son pequeñas escenas que se abren en el móvil con tus palabras dentro: una portada de periódico sobre quien cumple, una página que se llena de stickers, un tribunal de gatos, un chat que se escribe solo. Tú escribes, añades fotos y una canción si quieres, y mandas un enlace por mensaje, WhatsApp o correo.",
      "{note:Una es gratis: La carta, como nota corta de hasta 500 caracteres con una canción.|Una de ellas es gratis: La carta.} Cada una de las otras seis es un pago único al publicar, sin suscripción, y el diseño queda tuyo para siempre. Puedes montar la tarjeta entera y verla antes de decidir. Una tarjeta de pago puede programarse, además, para abrirse a medianoche el mismo día.",
    ],
    ideas: [
      {
        template: "the-letter",
        heading: "La gratis: una nota de cumpleaños bajo un sello",
        body: "Un sobre atado con cordel espera en un escritorio, cerrado con un sello con tu inicial. Se toca el sello, el cordel se suelta, la solapa se levanta y la carta se despliega con la fecha del día en que se abre. Bajo un saludo con su nombre, {note:tu nota de hasta 500 caracteres|tu carta} se va escribiendo sola mientras suena una canción. Sáltate la lista de deseos. Escribe sobre un cumpleaños que pasasteis juntos y qué repetirías.",
        line: { field: "freeNote", where: "La nota entera", text: "Feliz cumpleaños. El año pasado lo pasaste cargando cajas a la casa nueva y aun así hiciste tortitas para todo el que ayudó. Este año lo único que vas a levantar es el tenedor. La cena está reservada a las ocho." },
      },
      {
        template: "front-page",
        heading: "Un periódico en el que solo hay una noticia",
        body: "Un periódico doblado espera en una mesa junto a unas gafas, un boli y una taza de café. Con un toque se abre en una portada: en la cabecera, El Diario de y su nombre, salvo que le pongas otro, la fecha de hoy, tu titular en mayúsculas, una foto principal con su pie y tu mensaje contado como la noticia. Luego, el tiempo (soleado, con un 100 % de probabilidad de tarta, si no escribes otro), hasta ocho anuncios clasificados y un horóscopo. Haz del titular algo que pasó de verdad este año, contado muy en serio.",
        line: { field: "headline", where: "El titular", text: "Maya, 35 años, sigue sin saber doblar una sábana bajera" },
      },
      {
        template: "sticker-bomb",
        heading: "Doce toques, doce stickers y luego la tarjeta",
        body: "Una página vacía con una sola frase: su nombre y la orden de pegar unos stickers. Cada toque pega uno justo bajo el dedo: gatos con gorro de tiburón, un hámster con tarta, tus fotos en forma de polaroid y, debajo de algunos, una tira de rotuladora con tus palabras, de hasta 28 caracteres. Tras el duodécimo salta el confeti y tu tarjeta sube escrita a mano. Llena las tiras de motes que solo usa vuestro grupo.",
        line: { field: "labels", where: "Una de las tiras de rotuladora", text: "contesta en 4 a 6 semanas" },
      },
      {
        template: "the-council",
        heading: "La divertida: un tribunal de gatos dicta sentencia",
        body: "Un estrado de gatos abre el caso contra quien cumple años. El cargo lo escribes tú. La vista avanza a toques: cada gato lee una de tus conclusiones, hasta seis de 90 caracteres, y luego llega la sentencia con un sello de goma, culpable, visto bueno, icono certificado o indulto, a tu elección. Tus fotos entran como pruebas, hasta seis, y la sentencia completa es tu carta. En un cumpleaños, el cargo puede ser el año entero.",
        line: { field: "charge", where: "El cargo", text: "cumplir 30 y seguir sin tener un calendario" },
      },
      {
        template: "text-thread",
        heading: "Su móvil se enciende con tus mensajes",
        body: "Tres mensajes tuyos llegan a su pantalla de bloqueo, y el último dice que le has hecho algo. Con un toque se abre el chat y tus mensajes llegan uno a uno, con los puntitos de «escribiendo» entre ellos y un pequeño pop al llegar, y una foto donde escribiste [photo], hasta doce. Tu nombre va en la cabecera y tu carta es el último mensaje. Haz que las primeras líneas sean tan normales como un mensaje cualquiera, para que el último pese.",
        line: { field: "lines", where: "El primer mensaje del chat", text: "son las 00:01 y quería ser la primera persona" },
      },
      {
        template: "scratch-card",
        heading: "El regalo, bajo el metalizado de la última",
        body: "Un boleto espera en un mostrador, con una moneda al lado y su nombre impreso. Se toca para empezar y se rasca el metalizado de cada tarjeta con el dedo; al despejarse salta el confeti y aparece una de tus fotos con su pie, hasta doce tarjetas. La última lleva tu frase grande, de hasta 60 caracteres, con tu mensaje debajo. Pon ahí el regalo de verdad, escrito tan claro como una reserva.",
        line: { field: "finalTitle", where: "La frase grande de la última tarjeta", text: "Sábado, 10:00: el taller de cerámica del que tanto hablas" },
      },
      {
        template: "balloons",
        heading: "Globos que explotar, con una foto en cada uno",
        body: "Un techo de globos entra flotando bajo su edad en números de foil dorado. Una guirnalda deletrea una frase tuya, una letra por banderín, hasta 24. Cada globo que se explota suelta una polaroid de una de tus fotos, con su pie, hasta ocho. El más grande espera a que caigan los demás y es el que guarda tu carta. Deja su nombre en la pared y pon la broma en los banderines.",
        line: { field: "banner", where: "Los banderines", text: "ya son treinta" },
      },
    ],
    sections: [
      {
        heading: "Elige la tarjeta por la persona",
        body: "A quien se ríe de sí, la portada o el tribunal de gatos. A un grupo de amigos que vive en un chat, los stickers, con tiras que solo entendéis en ese grupo. A quien está lejos, el hilo de mensajes, porque se parece a la conversación que ya tenéis. Y luego escribe un detalle que solo sabes tú.",
      },
      {
        heading: "Que se abra a medianoche",
        body: "Casi todas las felicitaciones llegan cuando la gente ya se ha despertado, así que la que se abre a medianoche se lee a solas. Una tarjeta de pago se puede programar: en el editor, en Extras, activa «Programar la apertura» y elige la fecha, la hora y su zona horaria. Manda el enlace la noche antes. Hasta esa hora muestra una cuenta atrás.",
      },
      {
        heading: "Mandarla por WhatsApp o por mensaje",
        body: "Pega el enlace en WhatsApp, en un mensaje o en un correo, o en el chat del grupo para que todo el mundo la vea abrirse. Se abre en el navegador sin instalar nada. Imprime también el código QR si hay una tarjeta de papel o un regalo donde meterlo, y la cámara del móvil abre la misma tarjeta.",
      },
    ],
    faq: [
      {
        q: "¿Estas tarjetas de cumpleaños son gratis?",
        a: "{note:Una sí: La carta como nota corta, de hasta 500 caracteres y con una canción.|Una sí: La carta.} Cada una de las otras seis es un pago único, sin suscripción: el diseño queda tuyo para siempre, y puedes montar la tarjeta entera y verla antes de pagar.",
      },
      { q: "¿Cómo se manda una tarjeta de cumpleaños por WhatsApp?", a: "Al publicarla recibes un enlace. Pégalo en un chat de WhatsApp, un mensaje o un correo, y con un toque se abre la tarjeta. También hay un código QR que puedes imprimir y meter en una tarjeta de papel." },
      { q: "¿Se puede mandar sin registrarse?", a: "Puedes montar la tarjeta entera y verla sin cuenta. Inicias sesión al publicar, y quien la recibe no tiene que registrarse en nada: solo abre el enlace." },
      { q: "¿Puede llegar a medianoche?", a: "Sí, con una tarjeta de pago. En el editor, en Extras, activa «Programar la apertura» y elige la fecha, la hora y su zona horaria. Manda el enlace cuando quieras: hasta entonces muestra una cuenta atrás, y a medianoche se abre." },
      { q: "¿Hace falta una app para abrirla?", a: "No. Se abre en el navegador de cualquier móvil u ordenador, desde el enlace o el código QR, y nadie necesita una cuenta para verla." },
      { q: "¿Qué se escribe en una tarjeta de cumpleaños?", a: "Algo de este año que solo sabéis las dos personas, y luego lo que esperas de su próximo año. Una broma funciona mejor si es una que ya cuenta sobre sí. Cada tarjeta de arriba trae una frase para copiar." },
    ],
    related: [
      { href: "/occasions/birthday", label: "Ideas de regalo de cumpleaños" },
      { href: "/gifts/interactive-birthday-card", label: "Tarjetas de cumpleaños interactivas" },
      { href: "/gifts/virtual-birthday-cake", label: "Tartas de cumpleaños virtuales" },
      { href: "/digital-cards", label: "Tarjetas digitales" },
    ],
  },
};
```
