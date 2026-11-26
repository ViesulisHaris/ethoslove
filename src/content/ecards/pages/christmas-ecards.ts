import type { EcardPage } from "../types";

export const page: EcardPage = {
  slug: "christmas-ecards",
  added: "2026-11-26",
  occasion: "christmas",
  photo: "p4",
  cover: "frosted-window",
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
      "{note:One is free: The Letter, as a short note of up to 500 characters with a song.|One is free: The Letter.} Each of the six Christmas scenes is a one-time payment, made when you publish, and the design is then yours for good. You can build the whole card first to see whether it is worth it. A paid card can be set to open on Christmas morning.",
    ],
    ideas: [
      {
        template: "the-letter",
        heading: "The free one: a Christmas note under wax",
        body: "An envelope closed with a wax seal. One tap breaks the seal, and {note:your note, up to 500 characters,|your note} is written out across the page in handwriting while your song plays. The free version takes two names and no photos. Skip the round-up of the year. Write about one evening from it and why you would keep that one.",
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
        a: "{note:One is: The Letter as a short note, up to 500 characters with a song.|Yes, {free:names}.} Each of the six Christmas scenes is a one-time payment with no subscription: the design is yours for good, and you can build a card before you pay.",
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
      "{note:Una es gratis: La carta, como nota corta de hasta 500 caracteres con una canción.|Una es gratis: La carta.} Cada una de las seis escenas de Navidad es un pago único, al publicar, y el diseño queda tuyo para siempre. Puedes montar la tarjeta entera antes para ver si merece la pena. Una tarjeta de pago puede programarse para que se abra la mañana de Navidad.",
    ],
    ideas: [
      {
        template: "the-letter",
        heading: "La gratis: una nota de Navidad bajo lacre",
        body: "Un sobre cerrado con un sello de lacre. Un toque rompe el sello y {note:tu nota, de hasta 500 caracteres,|tu nota} se va escribiendo a mano por la página mientras suena tu canción. La versión gratis pide dos nombres y ninguna foto. Sáltate el resumen del año. Escribe sobre una sola tarde y por qué te quedarías con esa.",
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
        a: "{note:Una sí: La carta como nota corta, de hasta 500 caracteres y con una canción.|Sí, {free:names}.} Cada una de las seis escenas de Navidad es un pago único y sin suscripción: el diseño queda tuyo para siempre y puedes montar una tarjeta antes de pagar.",
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
};
