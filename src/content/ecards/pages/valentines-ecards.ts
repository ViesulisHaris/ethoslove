import type { EcardPage } from "../types";

export const page: EcardPage = {
  slug: "valentines-ecards",
  added: "2026-11-27",
  occasion: "valentines",
  photo: "p1",
  cover: "xoxo",
  en: {
    title: "Valentine Ecards: Animated, Romantic, One Free",
    description: "Animated valentine ecards for a phone: a kiss-sealed envelope, a jar of reasons, a funny game of falling hearts. One is free, and each has a line to borrow.",
    h1: "Valentine ecards that take a minute to open",
    label: "Valentine ecards",
    hero: {
      line: "A valentine they unseal, shake, hold, wind up or play.",
      sentence: "Each of these valentine ecards is made on your phone and sent as one link, and a paid one can wait to open on the 14th.",
    },
    ideasTitle: "Eight for the 14th",
    craft: "Getting the day right",
    film: "xoxo",
    lead: [
      "A valentine ecard, or any digital valentine card, used to be a cartoon heart in an inbox. These eight are small scenes that open on a phone: an envelope they unseal, a jar of notes they shake out, a photo booth that prints your strip, a flower that opens while they hold it, a game they have to win. You add the words and the photos, and send one link by text or email, so it can land on the morning of the 14th.",
      "{note:One is free: The Letter, as a short note of up to 500 characters with a song.|One of these is free: The Letter.} Each of the other seven is a one-time payment when you publish, with no subscription, and the design is then yours for good. You can build the whole card and watch it before deciding, and a paid card can be set to open at the hour you choose.",
    ],
    ideas: [
      {
        template: "the-letter",
        heading: "The free one: a valentine under a seal",
        body: "An envelope waits on a desk by a candle, tied with twine and sealed with your initial. They tap the seal, the letter unfolds, dated the day it is opened, and {note:your note of up to 500 characters|your letter} writes itself out, with a song from the library playing under it. Leave out the word forever. Write about one small thing they do that you have never told them you noticed.",
        line: { field: "freeNote", where: "The whole note", text: "Happy Valentine’s Day. You still fold receipts into whatever book you’re reading to keep your page, and I find them everywhere. Please never stop. Dinner at the Thai place at eight, and I booked the corner table." },
      },
      {
        template: "xoxo",
        heading: "Sealed with a kiss, then covered in them",
        body: "An envelope closed with a lipstick kiss, addressed to them. They open it and scroll down a collage: your photos as polaroids on a lace doily, what you call them in letters cut from a newspaper, and a card of your own lines with some words underlined, circled and highlighted. A tap anywhere leaves another kiss, and your letter is at the bottom. Use the nickname nobody else is allowed to use.",
        line: { field: "headline", where: "What you call them", text: "my co-pilot" },
      },
      {
        template: "jar-of-reasons",
        heading: "A jar of reasons to shake out",
        body: "A glass jar full of folded notes, each one a reason you wrote. They shake the phone or tap the jar, a note tumbles out and unfolds, and some notes carry one of your photos. Three reasons at least and a hundred at most, 160 characters each. When the jar is empty, a button opens your letter. Twelve real reasons beat a hundred vague ones.",
        line: { field: "reasons", where: "One of the reasons", text: "You learned the night bus timetable so I would never wait alone." },
      },
      {
        template: "photo-booth",
        heading: "Four flashes, then a strip of you two",
        body: "A photo booth waits behind its curtain with a sign lit up on top. They pull the curtain and press the button, and four times a flash freezes one of your photos in the booth’s mirror. The strip slides out gray and develops as they watch. They tap it, and it lands on a wall of love letters, with your letter and a line of yours in pen, up to 40 characters. For the line, name something they still do for you.",
        line: { field: "line", where: "The words on the wall", text: "you still save me the window seat" },
      },
      {
        template: "bloom",
        heading: "A flower that opens only under their finger",
        body: "A single peony, tulip or daisy, in any color you pick. Petal by petal it opens, but only with a finger held on the screen; lift it and the flower pauses. Fully open, it sends your photos drifting up around it, up to eight, with your message inside. Caption each photo with where it was taken, not when.",
        line: { field: "caption", where: "A photo’s caption", text: "The balcony where you planted the tulips upside down" },
      },
      {
        template: "music-box",
        heading: "Wind the key and the letter lifts",
        body: "A music box sits on a vanity with their name on a gold plate. They wind the key with a finger, three turns, and the lid opens on a ballerina or two swans turning to Swan Lake, Brahms’ Lullaby or Für Elise. Each time the figure comes around, a new photo of yours shows in the mirror inside the lid, and as the tune runs down a letter lifts out of the velvet. Choose the tune they hum without knowing its name.",
        line: { field: "message", where: "The letter that lifts out", text: "You hum Für Elise when you do the dishes and have no idea what it is. Now you know." },
      },
      {
        template: "dark-romance",
        heading: "For someone who would hate all the pink",
        body: "A black diary with their name on it, locked with a heart. They turn the key and it opens on a gothic collage: your photo between dark roses, your words in cut-out letters and, if you add a second photo, that photo printed on a tarot card you name, beside playing cards and a bet of yours. Each tap on the page leaves a rose, and your letter waits at the bottom under a wax seal. Make the bet about where it started.",
        line: { field: "bet", where: "The torn-out words", text: "all in, since the bus stop" },
      },
      {
        template: "arcade",
        heading: "The funny one: a game they have to win",
        body: "A tiny retro game with your title on its start screen. They drag a basket to catch falling hearts, and every level they clear uncovers one of your photos, up to eight; after the last level comes your message. Catches per level start at eight, and you can set anything from three to twenty. Name the game like a boss fight, not a love letter.",
        line: { field: "title", where: "Game title", text: "BOSS LEVEL: DATE NIGHT" },
      },
    ],
    sections: [
      {
        heading: "Pick by how they take romance",
        body: "Someone who keeps every note gets the jar, with real reasons in it. Someone who rolls their eyes at hearts gets the black diary, or the game set to drop stars instead of hearts. Someone you have been with for years gets the photo booth, with a photo from each year, up to ten. A first Valentine’s Day gets the free letter, kept short, because a long one this early is a lot.",
      },
      {
        heading: "Have it open first thing on the 14th",
        body: "A card that opens before work is read in bed, not between meetings. A paid card can be scheduled: in the editor, under Extras, switch on Schedule the reveal and choose the date, the hour and their time zone. Send the link the night before. Until the hour comes it shows a countdown, and then it opens.",
      },
      {
        heading: "If you are apart on the day",
        body: "Pick their time zone in the editor, not yours, so 8 a.m. on the card is 8 a.m. where they wake up. Then wait for them to call you, and let them tell you which part they liked before you ask. If they are a day ahead of you, schedule it for the 14th on their side, which is still the 13th on yours.",
      },
    ],
    faq: [
      {
        q: "Are these valentine ecards free?",
        a: "{note:One is: The Letter as a short note, up to 500 characters with a song and no photos.|One is: The Letter.} Each of the other seven is a one-time payment, with no subscription: the design is yours for good, and you can build the whole card and watch it before you pay.",
      },
      { q: "How do I send a valentine ecard?", a: "Publish it and you get one link. Send it by text, email or a chat app. There is also a QR code you can print and slip into a paper card or a box of chocolates, and a phone camera opens the same card." },
      { q: "Can it arrive on the morning of Valentine’s Day?", a: "Yes, on a paid card. In the editor, under Extras, switch on Schedule the reveal and set the date, the hour and their time zone. Send the link whenever you like: until then it shows a countdown, and at that hour it opens." },
      { q: "Does the person need an app or an account?", a: "No. It opens in the browser on any phone or computer, from the link or the QR code, and nobody signs in to see it." },
      { q: "Can I send a valentine ecard to family or a friend?", a: "Yes. The words are all yours, but XOXO, Dark Romance and the photo booth’s wall of love letters read as romance. The jar of reasons, the flower, the music box, the game and the free letter suit a parent, a child or a best friend: write what you would say to their face." },
      { q: "What is an ecard?", a: "A greeting card sent as a link or an email instead of through the mail. Here it is a small animated scene with your words, usually your photos, and a song on every card but Arcade, and it opens in the browser on their phone." },
      { q: "What is a cute Valentine’s quote?", a: "A short line that is true of the two of you beats a famous one. A few from this page to borrow: “You still save me the window seat.” “You learned the night bus timetable so I would never wait alone.” “You hum Für Elise when you do the dishes and have no idea what it is.” For a funny one, name the game: “Boss level: date night.” Change the place or the habit to yours." },
    ],
    related: [
      { href: "/occasions/valentines", label: "Valentine’s Day gift ideas" },
      { href: "/gifts/christmas-ecards", label: "Christmas ecards" },
      { href: "/gifts/last-minute", label: "Last-minute gifts" },
      { href: "/digital-cards", label: "Digital cards" },
    ],
  },
  es: {
    title: "Tarjetas de San Valentín virtuales, una gratis",
    description: "Tarjetas de San Valentín virtuales que se abren en el móvil: un sobre sellado con un beso, un frasco de razones, un juego divertido. Una es gratis.",
    h1: "Tarjetas de San Valentín virtuales que se abren despacio",
    label: "Tarjetas de San Valentín virtuales",
    hero: {
      line: "Una tarjeta para abrir, agitar, mantener pulsada, darle cuerda o jugar.",
      sentence: "Cada una se hace en el móvil y se manda en un enlace, y una de pago puede esperar a abrirse el día 14.",
    },
    ideasTitle: "Ocho para el 14",
    craft: "Para acertar con el día",
    film: "xoxo",
    lead: [
      "Una tarjeta de San Valentín virtual solía ser un corazón de dibujos animados en el correo. Estas ocho son pequeñas escenas que se abren en el móvil: un sobre sellado con un beso, un frasco de notas que se agita, un fotomatón que imprime vuestra tira, una flor que se abre mientras se mantiene el dedo en la pantalla, un juego que hay que ganar. Tú pones las palabras y las fotos, y mandas un enlace por mensaje o por correo, para que llegue la mañana del 14.",
      "{note:Una es gratis: La carta, como nota corta de hasta 500 caracteres con una canción.|Una de ellas es gratis: La carta.} Cada una de las otras siete es un pago único al publicar, sin suscripción, y el diseño queda tuyo para siempre. Puedes montar la tarjeta entera y verla antes de decidir, y una tarjeta de pago puede programarse para abrirse a la hora que elijas.",
    ],
    ideas: [
      {
        template: "the-letter",
        heading: "La gratis: San Valentín bajo un sello",
        body: "Un sobre atado con cordel espera junto a una vela, sellado con tu inicial. Se toca el sello, la carta se despliega con la fecha del día en que se abre y {note:tu nota de hasta 500 caracteres|tu carta} se va escribiendo sola, con una canción de la biblioteca de fondo. Olvídate del «para siempre». Escribe sobre una pequeña costumbre suya en la que te has fijado y que nunca le has comentado.",
        line: { field: "freeNote", where: "La nota entera", text: "Feliz San Valentín. Sigues metiendo tickets en el libro que estés leyendo para marcar la página, y los encuentro por todas partes. No dejes de hacerlo nunca. Cena en el tailandés a las ocho, y he reservado la mesa del rincón." },
      },
      {
        template: "xoxo",
        heading: "Sellada con un beso, y luego llena de besos",
        body: "Un sobre cerrado con un beso de pintalabios, con su nombre. Al abrirlo aparece un collage que se recorre hacia abajo: tus fotos como polaroids sobre un tapete de encaje, cómo le llamas en letras recortadas de un periódico y una tarjeta con tus frases y algunas palabras subrayadas, rodeadas con un círculo o resaltadas. Cada toque deja otro beso, y tu carta está al final. Pon el mote que solo le dices tú.",
        line: { field: "headline", where: "Cómo le llamas", text: "mi copiloto" },
      },
      {
        template: "jar-of-reasons",
        heading: "Un frasco de razones que agitar",
        body: "Un frasco de cristal lleno de notas dobladas, cada una con una razón escrita por ti. Se agita el móvil o se toca el frasco, cae una nota y se despliega, y algunas notas llevan una de tus fotos. Tres razones como mínimo y cien como máximo, de 160 caracteres cada una. Cuando el frasco se queda vacío, un botón abre tu carta. Doce razones de verdad valen más que cien vagas.",
        line: { field: "reasons", where: "Una de las razones", text: "Te aprendiste los horarios del bus nocturno para que nunca me tocara esperar a solas." },
      },
      {
        template: "photo-booth",
        heading: "Cuatro flashes y una tira con vosotros dos",
        body: "Un fotomatón espera tras su cortina con un cartel iluminado encima. Se corre la cortina y se pulsa el botón, y cuatro veces un flash congela una de tus fotos en el espejo de la cabina. La tira sale gris y se va revelando ante sus ojos. Al tocarla, aterriza en un muro de cartas de amor, con tu carta y una frase tuya a boli, de hasta 40 caracteres. En la frase, pon algo que todavía hace por ti.",
        line: { field: "line", where: "Las palabras del muro", text: "me sigues guardando la ventanilla" },
      },
      {
        template: "bloom",
        heading: "Una flor que solo se abre sin soltarla",
        body: "Una sola flor, peonía, tulipán o margarita, del color que elijas. Pétalo a pétalo se abre, pero solo con un dedo sobre la pantalla; si se levanta el dedo, la flor se detiene. Abierta del todo, hace subir tus fotos a su alrededor, hasta ocho, con tu mensaje dentro. Pon en el pie de cada foto dónde se hizo, no cuándo.",
        line: { field: "caption", where: "El pie de una foto", text: "El balcón donde plantaste los tulipanes del revés" },
      },
      {
        template: "music-box",
        heading: "Se le da cuerda y sale la carta",
        body: "Una caja de música en un tocador, con su nombre en una placa dorada. Se da cuerda a la llave con un dedo, tres vueltas, y la tapa se abre con una bailarina o dos cisnes girando al son de El lago de los cisnes, la Canción de cuna de Brahms o Para Elisa. Cada vez que la figura da la vuelta, aparece una foto tuya nueva en el espejo de la tapa, y cuando la melodía se apaga, una carta sale del terciopelo. Elige la melodía que tararea sin saber cómo se llama.",
        line: { field: "message", where: "La carta que sale", text: "Tarareas Para Elisa cuando friegas los platos y no tienes ni idea de qué es. Ahora ya lo sabes." },
      },
      {
        template: "dark-romance",
        heading: "Para quien no soporta tanto rosa",
        body: "Un diario negro con su nombre, cerrado con un candado de corazón. Se gira la llave y dentro aparece un collage gótico: tu foto entre rosas oscuras, tus palabras en letras recortadas y, si añades una segunda foto, esa foto impresa en una carta del tarot con el nombre que elijas, junto a naipes y una apuesta tuya. Cada toque en la página deja una rosa, y tu carta espera al final bajo un sello de lacre. Que la apuesta diga dónde empezó todo.",
        line: { field: "bet", where: "Las palabras recortadas", text: "me la jugué en la parada" },
      },
      {
        template: "arcade",
        heading: "La divertida: un juego que hay que ganar",
        body: "Un minijuego retro con tu título en la pantalla de inicio. Con una cesta se atrapan los corazones que caen; al pasar de nivel se destapa una foto tuya, hasta ocho, y tras el último nivel llega tu mensaje. Por defecto son ocho capturas por nivel, y puedes poner de tres a veinte. Ponle nombre de jefe final, no de carta de amor.",
        line: { field: "title", where: "Título del juego", text: "JEFE FINAL: LA CITA" },
      },
    ],
    sections: [
      {
        heading: "Elige según cómo se toma el romanticismo",
        body: "A quien guarda todas las notas, el frasco, con razones de verdad. A quien pone los ojos en blanco con los corazones, el diario negro, o el juego con estrellas en lugar de corazones. A quien lleva años contigo, el fotomatón, con una foto de cada año, hasta diez. Para un primer San Valentín, la carta gratis y corta, porque una carta larga tan pronto abruma.",
      },
      {
        heading: "Que se abra a primera hora del 14",
        body: "Una tarjeta que se abre antes del trabajo se lee en la cama, no entre reuniones. Una tarjeta de pago se puede programar: en el editor, en Extras, activa «Programar la apertura» y elige la fecha, la hora y su zona horaria. Manda el enlace la noche anterior. Hasta esa hora muestra una cuenta atrás, y luego se abre.",
      },
      {
        heading: "Si ese día estáis lejos",
        body: "Elige en el editor su zona horaria, no la tuya, para que las 8 de la tarjeta sean las 8 donde se despierta. Luego espera a que te llame, y deja que te cuente qué parte le ha gustado antes de que se lo preguntes. Si allí ya es el día siguiente, prográmala para su 14, que en tu reloj todavía es 13.",
      },
    ],
    faq: [
      {
        q: "¿Estas tarjetas de San Valentín son gratis?",
        a: "{note:Una sí: La carta como nota corta, de hasta 500 caracteres, con una canción y sin fotos.|Una sí: La carta.} Cada una de las otras siete es un pago único, sin suscripción: el diseño queda tuyo para siempre, y puedes montar la tarjeta entera y verla antes de pagar.",
      },
      { q: "¿Cómo se manda una tarjeta de San Valentín virtual?", a: "Al publicarla recibes un enlace. Mándalo por mensaje, por correo o por un chat. También hay un código QR que puedes imprimir y meter en una tarjeta de papel o en una caja de bombones, y la cámara del móvil abre la misma tarjeta." },
      { q: "¿Puede llegar la mañana de San Valentín?", a: "Sí, con una tarjeta de pago. En el editor, en Extras, activa «Programar la apertura» y elige la fecha, la hora y su zona horaria. Manda el enlace cuando quieras: hasta entonces muestra una cuenta atrás, y a esa hora se abre." },
      { q: "¿Hace falta una app o una cuenta para verla?", a: "No. Se abre en el navegador de cualquier móvil u ordenador, desde el enlace o el código QR, y nadie tiene que iniciar sesión para verla." },
      { q: "¿Puedo mandar una tarjeta de San Valentín a la familia o a una amistad?", a: "Sí. Las palabras son todas tuyas, pero XOXO, Dark Romance y el muro de cartas de amor del fotomatón suenan a pareja. El frasco de razones, la flor, la caja de música, el juego y la carta gratis sirven para la familia o para tu mejor amistad: escribe lo que le dirías a la cara." },
      { q: "¿Qué es una tarjeta virtual?", a: "Una tarjeta de felicitación que se manda por enlace o por email en lugar de por correo postal. Aquí es una pequeña escena animada con tus palabras, casi siempre tus fotos y una canción en todas menos Arcade, y se abre en el navegador de su móvil." },
      { q: "¿Qué frase bonita se pone en una tarjeta de San Valentín?", a: "Una frase corta y cierta sobre vosotros dos gana a una famosa. Algunas de esta página para copiar: «Me sigues guardando la ventanilla». «Te aprendiste los horarios del bus nocturno para que nunca me tocara esperar a solas». «Tarareas Para Elisa cuando friegas los platos y no tienes ni idea de qué es». Para una divertida, ponle nombre al juego: «Jefe final: la cita». Cambia el sitio o la costumbre por los vuestros." },
    ],
    related: [
      { href: "/occasions/valentines", label: "Ideas de regalo de San Valentín" },
      { href: "/gifts/christmas-ecards", label: "Tarjetas de Navidad virtuales" },
      { href: "/gifts/last-minute", label: "Regalos de última hora" },
      { href: "/digital-cards", label: "Tarjetas digitales" },
    ],
  },
};
