import type { Occasion } from "@/config/occasions";
import type { GiftLocale } from "@/lib/gift/schema";

/**
 * What each occasion page says below its templates: how to make the gift for that day, and the
 * questions people bring to it. Written for the person making one, not for a search engine — but
 * this is also what made the pages thin against the guides that get recommended instead. Every
 * fact here (photo counts, what is free, links not expiring, edits going live) matches the pricing
 * page's FAQ; change one and change both.
 */
export type OccasionGuide = {
  title: string;
  lead: string;
  sections: { heading: string; body: string }[];
  faq: { q: string; a: string }[];
};

const phoneEn = {
  q: "Can I make it on my phone?",
  a: "Yes. The editor works on a phone, the preview updates as you type, and photos come straight from your camera roll. Ten minutes is a fair estimate, longer if you keep rewriting the message.",
};
const phoneEs = {
  q: "¿Puedo hacerlo desde el móvil?",
  a: "Sí. El editor funciona en el móvil, la vista previa cambia mientras escribes y las fotos salen directamente del carrete. Diez minutos es un cálculo justo, más si te da por reescribir el mensaje.",
};
const costEn = {
  q: "Does it cost anything?",
  a: "Two templates are free, with up to ten photos and our music library, and they publish with a small “Made with Ethos” footer. Premium templates are a one-time payment for that template, forever — no subscription — and add real songs, video, voice messages, scheduling and a password.",
};
const costEs = {
  q: "¿Cuesta algo?",
  a: "Dos plantillas son gratis, con hasta diez fotos y nuestra biblioteca de música, y se publican con un pequeño pie que dice “Hecho con Ethos”. Las premium son un solo pago por esa plantilla, para siempre, sin suscripción, y añaden canciones reales, vídeo, mensajes de voz, programación y contraseña.",
};
const keepEn = {
  q: "Will it still be there next year?",
  a: "Yes. Links are meant to be permanent, so it can be opened again on the next one and the one after. If you spot a typo after sending, edit it and the change goes live at the same link.",
};
const keepEs = {
  q: "¿Seguirá ahí el año que viene?",
  a: "Sí. Los enlaces están pensados para durar, así que se puede volver a abrir el año siguiente y el otro. Si ves una errata después de enviarlo, edítalo y el cambio sale en el mismo enlace.",
};

export const OCCASION_GUIDES: Record<Occasion, Record<GiftLocale, OccasionGuide>> = {
  birthday: {
    en: {
      title: "A birthday gift they'll open twice",
      lead: "Most birthday messages are a line in a group chat, read once and buried by lunch. This is the other kind: a page with their name on it, the photos you have of them, the song they can't help singing, and the thing you actually mean — opened on their phone, whenever they like.",
      sections: [
        {
          heading: "What to write",
          body: "Skip “happy birthday, have a great day”. Write one specific thing: the night they drove two hours to bring you soup, the joke only the two of you get, what you'd tell a stranger about them. Three or four sentences are plenty. If the words won't come, start with “The thing I never say is…” and keep going.",
        },
        {
          heading: "What to add",
          body: "Pick photos with a story, not the best-lit ones: the terrible haircut year, the trip where it rained. Add a song from the library, or, on a premium template, a thirty-second preview of the one they always put on, a short video, or a voice message, which is the closest thing to being in the room. Birthday Cinema has them blow out the candles; Balloons and Party Animals are for the ones who'd rather laugh.",
        },
        {
          heading: "When to send it",
          body: "On a premium template, schedule it to unlock at midnight in their time zone, so it's the first thing they see; otherwise send the link at the moment you'd normally text. If you'll see them in person, print the QR card and put it in the real card, inside the book, on the cake box. It opens with the phone camera; there is nothing to install.",
        },
      ],
      faq: [
        phoneEn,
        {
          q: "What if their birthday is today?",
          a: "It arrives the moment you press send. Publish it, copy the link and put it in WhatsApp, iMessage, anywhere a link goes. There is nothing to ship and no cut-off.",
        },
        costEn,
      ],
    },
    es: {
      title: "Un regalo de cumpleaños que abrirá dos veces",
      lead: "Casi todas las felicitaciones son una línea en un grupo, leída una vez y enterrada antes de comer. Esto es lo otro: una página con su nombre, las fotos que tienes de esa persona, la canción que no puede evitar cantar y lo que de verdad quieres decirle, abierto en su móvil cuando quiera.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Olvida el “feliz cumple, que pases un gran día”. Escribe una cosa concreta: la noche que condujo dos horas para traerte sopa, el chiste que solo entendéis vosotros, lo que le contarías de esa persona a un desconocido. Con tres o cuatro frases basta. Si no salen, empieza por “Lo que nunca te digo es…” y sigue.",
        },
        {
          heading: "Qué añadir",
          body: "Elige fotos con historia, no las mejor iluminadas: el año del corte de pelo terrible, el viaje en el que llovió. Pon una canción de la biblioteca o, en una plantilla premium, una muestra de treinta segundos de la que siempre elige, un vídeo corto o un mensaje de voz, lo más parecido a estar allí. En Birthday Cinema sopla las velas; Balloons y Party Animals son para quien prefiere reírse.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "En una plantilla premium, prográmalo para que se abra a medianoche en su zona horaria y sea lo primero que vea; si no, manda el enlace a la hora a la que le escribirías. Si vais a veros, imprime la tarjeta QR y métela en la tarjeta de verdad, dentro del libro, en la caja de la tarta. Se abre con la cámara del móvil; no hay nada que instalar.",
        },
      ],
      faq: [
        phoneEs,
        {
          q: "¿Y si su cumpleaños es hoy?",
          a: "Llega en el momento en que pulsas enviar. Publícalo, copia el enlace y pégalo en WhatsApp, iMessage o donde quieras. No hay nada que mandar por correo ni hora límite.",
        },
        costEs,
      ],
    },
  },

  anniversary: {
    en: {
      title: "An anniversary gift made of your own story",
      lead: "An anniversary is the one day a year the two of you are the subject. Cards borrow other people's words for it. This uses yours: the photos only you have, the song that's yours, and a note about what these years have actually been like, opened on their phone and kept.",
      sections: [
        {
          heading: "What to write",
          body: "Don't summarise the relationship. Pick three moments and put them in order: the first one, a hard one you got through, and something from last month. Say what each one taught you about them. That is an anniversary letter, and it beats anything on a shelf. The Letter is free; Our Timeline draws the years as a road.",
        },
        {
          heading: "What to add",
          body: "Photos from across the years, in order, so the story reads as a story — up to ten on a free template, twenty on premium. The song from your wedding, your first road trip, or the one you argue about: a premium template plays a thirty-second preview of the real recording, and carries a video clip and a voice message too. Museum hangs the photos in rooms; Vinyl puts the song at the centre.",
        },
        {
          heading: "When to send it",
          body: "On a premium template, schedule it for the morning of the anniversary so it's waiting when they wake up, in their time zone if you're apart; or send it at the table and watch them open it. Their reaction — an emoji, a note, a recorded message — comes back to you in your dashboard.",
        },
      ],
      faq: [
        {
          q: "Can we both make one?",
          a: "Yes. At the end of every gift there is a reply, and “send one back” starts a new gift with the names already swapped, on the same template.",
        },
        {
          q: "How many photos can I add?",
          a: "Up to ten on a free template and twenty on a premium one. Put them in the order you want the story told; the template arranges them.",
        },
        keepEn,
      ],
    },
    es: {
      title: "Un regalo de aniversario hecho con vuestra historia",
      lead: "El aniversario es el único día del año en que el tema sois vosotros dos. Las tarjetas lo cuentan con palabras de otros. Esto usa las tuyas: las fotos que solo tienes tú, la canción que es vuestra y una nota sobre cómo han sido estos años de verdad, abierta en su móvil y guardada.",
      sections: [
        {
          heading: "Qué escribir",
          body: "No resumas la relación. Elige tres momentos y ponlos en orden: el primero, uno difícil que superasteis y algo del mes pasado. Di qué te enseñó cada uno sobre esa persona. Eso es una carta de aniversario, y gana a cualquiera de una estantería. The Letter es gratis; Our Timeline dibuja los años como un camino.",
        },
        {
          heading: "Qué añadir",
          body: "Fotos de todos esos años, en orden, para que la historia se lea como una historia: hasta diez en una plantilla gratis, veinte en una premium. La canción de la boda, del primer viaje o la que siempre discutís: una plantilla premium reproduce una muestra de treinta segundos de la grabación real, y lleva además un vídeo y un mensaje de voz. Museum cuelga las fotos en salas; Vinyl pone la canción en el centro.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "En una plantilla premium, prográmalo para la mañana del aniversario, para que esté esperando cuando se despierte, en su zona horaria si estáis lejos; o mándalo en la mesa y mira cómo lo abre. Su reacción, un emoji, una nota o un mensaje grabado, te llega a tu panel.",
        },
      ],
      faq: [
        {
          q: "¿Podemos hacer uno cada uno?",
          a: "Sí. Al final de cada regalo hay una respuesta, y “devolver uno” abre un regalo nuevo con los nombres ya cambiados, en la misma plantilla.",
        },
        {
          q: "¿Cuántas fotos puedo poner?",
          a: "Hasta diez en una plantilla gratis y veinte en una premium. Ponlas en el orden en que quieras contar la historia; la plantilla las coloca.",
        },
        keepEs,
      ],
    },
  },

  valentines: {
    en: {
      title: "A Valentine's gift that lasts past the evening",
      lead: "Flowers wilt, chocolates are gone by ten, and the card ends up in a drawer. A gift they open on their phone — a letter under a wax seal, a bouquet you picked stem by stem, a sky where every star is a photo of the two of you — is still there next February, and the one after.",
      sections: [
        {
          heading: "What to write",
          body: "Not “I love you” on its own; they know. Write what you noticed this year: the way they make the coffee, the thing they did when your week fell apart, what you're looking forward to. Keep it to a few lines that only fit them. The Letter is free and opens with a seal; XOXO and Coquette are for the flirt.",
        },
        {
          heading: "What to add",
          body: "Two or three photos are enough here — the first one you took together and the most recent. Bouquet lets you choose the flowers yourself and never wilts; Bloom opens a single flower while they hold the screen. Add a song from the library, or, on a premium template, a thirty-second preview of yours. A voice message at the end, also premium, lands harder than any line of text.",
        },
        {
          heading: "When to send it",
          body: "On a premium template, schedule it to open at midnight on the fourteenth, or first thing in the morning, before the day gets loud. If you're doing dinner, print the QR card and slip it under their plate; it opens with the phone camera. If you're apart, it arrives the second you send it, and their reaction comes straight back.",
        },
      ],
      faq: [
        {
          q: "Is it too much for someone I've only just started seeing?",
          a: "Pick a light template — Kawaii, Arcade, XOXO — write two honest lines, and it reads as a gesture, not a declaration. What you write sets the weight, not the format.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo de San Valentín que dura más que la noche",
      lead: "Las flores se marchitan, los bombones no llegan a las diez y la tarjeta acaba en un cajón. Un regalo que abre en su móvil, una carta con sello de lacre, un ramo que has elegido tallo a tallo, un cielo en el que cada estrella es una foto vuestra, sigue ahí el febrero que viene, y el otro.",
      sections: [
        {
          heading: "Qué escribir",
          body: "No un “te quiero” a secas; ya lo sabe. Escribe lo que has notado este año: cómo hace el café, lo que hizo la semana que se te vino abajo, lo que te apetece que venga. Unas pocas líneas que solo le vayan a esa persona. The Letter es gratis y se abre con un sello; XOXO y Coquette son para tontear.",
        },
        {
          heading: "Qué añadir",
          body: "Con dos o tres fotos basta: la primera que os hicisteis y la más reciente. En Bouquet eliges tú las flores y nunca se marchitan; en Bloom se abre una sola flor mientras mantiene pulsada la pantalla. Añade una canción de la biblioteca o, en una plantilla premium, una muestra de treinta segundos de la vuestra. Un mensaje de voz al final, también premium, llega más hondo que cualquier línea escrita.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "En una plantilla premium, prográmalo para que se abra a medianoche del catorce, o a primera hora, antes de que el día se llene de ruido. Si hay cena, imprime la tarjeta QR y déjala bajo su plato; se abre con la cámara del móvil. Si estáis lejos, llega en el segundo en que lo envías, y su reacción vuelve directa.",
        },
      ],
      faq: [
        {
          q: "¿Es demasiado para alguien con quien acabo de empezar?",
          a: "Elige una plantilla ligera, Kawaii, Arcade, XOXO, escribe dos líneas sinceras y se lee como un gesto, no como una declaración. El peso lo pone lo que escribes, no el formato.",
        },
        phoneEs,
        costEs,
      ],
    },
  },

  wedding: {
    en: {
      title: "A wedding gift with the words in it",
      lead: "For the couple, or for the person you're marrying. A wedding day goes past in a blur; the morning after is when they read things. Gather the photos, the wishes and a song into something they can open then — and every year that follows.",
      sections: [
        {
          heading: "What to write",
          body: "If it's for the couple: one memory of each of them, and one line about the two of them together that you'd never say in a speech. If it's for your partner, written the night before: what you're thinking about, and what you promise. The Toast raises a glass; Front Page prints them on the cover of their own paper.",
        },
        {
          heading: "What to add",
          body: "Photos from before they met and from the years since — Our Timeline sets them along a road, Museum hangs them in rooms. The song from the first dance if you know it; both templates are premium, so it plays a thirty-second preview of the real recording. For a gift to your partner, a voice message is the thing they'll keep coming back to.",
        },
        {
          heading: "When to send it",
          body: "Print the QR card and tuck it inside the real card, so it's opened with the rest. Or schedule it for the morning after, when the phones come out and the day is being relived. A gift to your partner can be timed for the hour before the ceremony, when they're alone with their phone.",
        },
      ],
      faq: [
        {
          q: "Can guests contribute?",
          a: "One person makes each gift. If several of you want in, make one each — the couple gets a set — or gather the lines by message first and put them in one gift together.",
        },
        {
          q: "Does the QR card work without an app?",
          a: "Yes. The phone camera reads it and opens the gift in the browser. It works on iPhone and Android, and the link on the card stays live.",
        },
        keepEn,
      ],
    },
    es: {
      title: "Un regalo de boda con las palabras dentro",
      lead: "Para la pareja, o para la persona con la que te casas. El día pasa volando; la mañana siguiente es cuando se leen las cosas. Junta las fotos, los deseos y una canción en algo que puedan abrir entonces, y cada año que venga después.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Si es para la pareja: un recuerdo de cada uno y una frase sobre los dos juntos que nunca dirías en un discurso. Si es para tu pareja, escrito la noche antes: en qué piensas y qué prometes. The Toast levanta la copa; Front Page los pone en la portada de su propio periódico.",
        },
        {
          heading: "Qué añadir",
          body: "Fotos de antes de conocerse y de los años desde entonces: Our Timeline las coloca a lo largo de un camino, Museum las cuelga en salas. La canción del primer baile si la sabes; las dos plantillas son premium, así que suena una muestra de treinta segundos de la grabación real. En un regalo para tu pareja, un mensaje de voz es a lo que volverá una y otra vez.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Imprime la tarjeta QR y métela en la tarjeta de verdad, para que se abra con las demás. O prográmalo para la mañana siguiente, cuando salen los móviles y se revive el día. Un regalo a tu pareja puede abrirse la hora antes de la ceremonia, cuando está a solas con su móvil.",
        },
      ],
      faq: [
        {
          q: "¿Pueden participar los invitados?",
          a: "Cada regalo lo hace una persona. Si sois varios, haced uno cada uno, la pareja recibe un conjunto, o recoged antes las frases por mensaje y ponedlas juntas en un solo regalo.",
        },
        {
          q: "¿La tarjeta QR funciona sin app?",
          a: "Sí. La cámara del móvil la lee y abre el regalo en el navegador. Funciona en iPhone y Android, y el enlace de la tarjeta sigue vivo.",
        },
        keepEs,
      ],
    },
  },

  graduation: {
    en: {
      title: "A graduation gift from the first day to the last",
      lead: "Money is what everyone gives, and it's spent by August. This is the other thing: the photos from year one to the cap and gown, what you were proud of when nobody was looking, and a song for the day — timed to open the moment they finish.",
      sections: [
        {
          heading: "What to write",
          body: "Not “congratulations” — they'll get fifty of those. Write one thing you saw them do that they don't know you noticed: the semester they nearly quit, the night before the exam, the phone call where they sounded different. Then one line about what comes next. Front Page puts them on the cover; Fortune Cookie hides the line inside for them to crack.",
        },
        {
          heading: "What to add",
          body: "The first-day photo, the awkward middle years, and this month — Our Timeline lays them along the road that got them there. Add the song they studied to, or the one from the car on the way to school; these templates are premium, so a thirty-second preview of the real one plays. Cap Toss is the one for the day itself: they cheer into the phone and the cap goes up.",
        },
        {
          heading: "When to send it",
          body: "Schedule it for the morning of the ceremony, or for the minute it ends if you know the time. If you're in the audience, print the QR card and hand it over with the flowers. If you can't be there, it arrives wherever they are, and their reaction comes back to you.",
        },
      ],
      faq: [
        {
          q: "Can it come from the whole family?",
          a: "Sign it from all of you and put everyone's line in the message. If each of you wants to say your own piece, make one gift each; they're quick.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo de graduación del primer día al último",
      lead: "Dinero le da todo el mundo, y en agosto ya no queda. Esto es lo otro: las fotos desde el primer curso hasta el birrete, de qué estabas orgulloso cuando nadie miraba y una canción para el día, programado para abrirse en el momento en que termina.",
      sections: [
        {
          heading: "Qué escribir",
          body: "No “enhorabuena”; recibirá cincuenta. Escribe una cosa que le viste hacer y que no sabe que notaste: el cuatrimestre en que casi lo deja, la noche antes del examen, la llamada en la que sonaba distinto. Luego una línea sobre lo que viene. Front Page le pone en la portada; Fortune Cookie esconde la frase dentro para que la rompa.",
        },
        {
          heading: "Qué añadir",
          body: "La foto del primer día, los años torpes del medio y este mes: Our Timeline las coloca a lo largo del camino que le trajo hasta aquí. Añade la canción con la que estudiaba, o la del coche de camino al colegio; estas plantillas son premium, así que suena una muestra de treinta segundos de la de verdad. Cap Toss es la del día en sí: anima al móvil a gritos y el birrete sale volando.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Prográmalo para la mañana de la ceremonia, o para el minuto en que acaba si sabes la hora. Si estás entre el público, imprime la tarjeta QR y dásela con las flores. Si no puedes estar, llega esté donde esté, y su reacción te vuelve a ti.",
        },
      ],
      faq: [
        {
          q: "¿Puede ser de toda la familia?",
          a: "Fírmalo de parte de todos y pon la frase de cada uno en el mensaje. Si cada cual quiere decir lo suyo, haced un regalo por persona; se hacen rápido.",
        },
        phoneEs,
        costEs,
      ],
    },
  },

  christmas: {
    en: {
      title: "A Christmas gift that can't get lost in the post",
      lead: "For the people you won't see this year and the ones you will. Nothing to ship, no deadline to miss: it opens on Christmas morning wherever they are, with your photos, a song for the day and the message you'd say if you were in the room.",
      sections: [
        {
          heading: "What to write",
          body: "The year in three lines: what you'll remember about it, what they did for you in it, and what you want for them in the next one. Say the thing you'd say after dinner, once the table has gone quiet. Fireside unfolds your letter by candlelight; Snow Globe shakes your photos into the snow.",
        },
        {
          heading: "What to add",
          body: "The photos from this year, and one old Christmas photo for the ones who'll recognise it — twenty fit, but eight good ones beat twenty. Both templates are premium, so add a thirty-second preview of the real song, and if you're apart, a voice message: the closest you'll get to being there.",
        },
        {
          heading: "When to send it",
          body: "Schedule it for Christmas morning in their time zone — it unlocks by itself. If you'll be together, print the QR card and hang it on the tree or leave it in the stocking; it opens with the phone camera. For a whole family, make one gift and send the same link to everyone.",
        },
      ],
      faq: [
        {
          q: "Can one gift go to several people?",
          a: "Yes. A gift is a link, and the link can be opened by anyone you send it to. For a family, address it to all of them and send it once.",
        },
        {
          q: "Will it open on an older phone?",
          a: "It runs in the phone's browser, with nothing to install, on any iPhone or Android from the last several years. On a slow connection it takes a moment longer to load.",
        },
        costEn,
      ],
    },
    es: {
      title: "Un regalo de Navidad que no se pierde en el correo",
      lead: "Para los que no verás este año y para los que sí. Nada que enviar por correo, ninguna fecha límite: se abre la mañana de Navidad estén donde estén, con tus fotos, una canción para el día y el mensaje que dirías si estuvieras allí.",
      sections: [
        {
          heading: "Qué escribir",
          body: "El año en tres líneas: lo que recordarás de él, lo que esa persona hizo por ti y lo que le deseas para el siguiente. Di lo que dirías después de la cena, cuando la mesa se queda en silencio. Fireside despliega tu carta a la luz de una vela; Snow Globe agita tus fotos en la nieve.",
        },
        {
          heading: "Qué añadir",
          body: "Las fotos de este año y una Navidad antigua para quien vaya a reconocerla. Las dos plantillas son premium, así que añade una muestra de treinta segundos de la canción de verdad y, si estáis lejos, un mensaje de voz: lo más cerca que vas a estar.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Prográmalo para la mañana de Navidad en su zona horaria; se desbloquea solo. Si vais a estar juntos, imprime la tarjeta QR y cuélgala del árbol o déjala en el calcetín; se abre con la cámara del móvil. Para toda una familia, haz un regalo y manda el mismo enlace a todos.",
        },
      ],
      faq: [
        {
          q: "¿Un regalo puede ir a varias personas?",
          a: "Sí. Un regalo es un enlace, y el enlace lo abre cualquiera a quien se lo mandes. Para una familia, dirígelo a todos y envíalo una vez.",
        },
        {
          q: "¿Se abre en un móvil viejo?",
          a: "Funciona en el navegador del móvil, sin instalar nada, en cualquier iPhone o Android de los últimos años. Con mala conexión tarda un poco más en cargar.",
        },
        costEs,
      ],
    },
  },

  halloween: {
    en: {
      title: "A Halloween gift they open with a tap",
      lead: "Better than a bag of sweets, and it doesn't need a costume. Ring the doorbell, light the pumpkin, and let a small ghost hand over your photos, your message and a song in the dark — for the friend who loves this night, or the one who needs cheering up on it.",
      sections: [
        {
          heading: "What to write",
          body: "Keep it light and keep it short. An inside joke, the story of the costume that went wrong, a dare for the evening. Trick or Treat delivers it after the bell: treat lights the pumpkin and rains sweets, trick earns a boo first, then the treat anyway.",
        },
        {
          heading: "What to add",
          body: "Photos from past Halloweens, the worse the costume the better. A song for the dark, from the library or a thirty-second preview of the one you're both thinking of. A short video is worth it here: a jump scare works better moving. The template is premium, so all three come with it.",
        },
        {
          heading: "When to send it",
          body: "Send it as the doorbell rounds start, or schedule it for the moment it gets dark where they are. If there's a party, print the QR card and hide it somewhere they'll find it late. It opens with the phone camera, with nothing to install, so it works on a borrowed phone at the party too.",
        },
      ],
      faq: [
        {
          q: "Is it scary?",
          a: "Only as scary as you make it. The template is a doorbell, a pumpkin and a small ghost; what you write and which song you pick decide the mood. For someone easily spooked, choose a gentle song and it's a friendly ghost at the door.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo de Halloween que se abre con un toque",
      lead: "Mejor que una bolsa de chuches, y no hace falta disfraz. Llama al timbre, enciende la calabaza y deja que un fantasmita entregue tus fotos, tu mensaje y una canción en la oscuridad, para quien adora esta noche o para quien necesita que se la alegren.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Ligero y corto: con tres o cuatro frases basta. Un chiste privado, la historia del disfraz que salió mal, un reto para la noche. Trick or Treat lo entrega después del timbre: “treat” enciende la calabaza y llueven chuches; “trick” se gana primero un buu, y luego las chuches igualmente.",
        },
        {
          heading: "Qué añadir",
          body: "Fotos de Halloweens pasados, cuanto peor el disfraz, mejor. Una canción para la oscuridad, de la biblioteca o una muestra de treinta segundos de la que tenéis en la cabeza. Un vídeo corto aquí compensa: un susto funciona mejor en movimiento. La plantilla es premium, así que las tres cosas van incluidas.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Mándalo cuando empiecen las rondas del timbre, o prográmalo para el momento en que anochece donde está. Si hay fiesta, imprime la tarjeta QR y escóndela donde la encuentre tarde. Se abre con la cámara del móvil, sin instalar nada, así que funciona también en un móvil prestado en plena fiesta.",
        },
      ],
      faq: [
        {
          q: "¿Da miedo?",
          a: "Solo el que tú le pongas. La plantilla es un timbre, una calabaza y un fantasmita; el tono lo deciden lo que escribes y la canción que eliges. Para alguien asustadizo, elige una canción suave y es un fantasma simpático en la puerta.",
        },
        phoneEs,
        costEs,
      ],
    },
  },

  "mothers-day": {
    en: {
      title: "A Mother's Day gift in your own words",
      lead: "She has a drawer of cards. What she doesn't have is the thing you'd say if you weren't embarrassed: the old photos, the song she always sings along to, and a letter that names what she did for you. Sent as a link she can open on the bus, at work, and again that night.",
      sections: [
        {
          heading: "What to write",
          body: "Start with a specific memory — the packed lunches, the lift at 2 a.m., the thing she said that you still repeat. Then say what you understand about it now that you didn't then. Two paragraphs. Jar of Reasons lets you give her a jar of short ones to shake out one at a time, which is easier than one long letter.",
        },
        {
          heading: "What to add",
          body: "Find the photos she's in, not the ones she took — there are always fewer of those. Add her song: something from the library, or, on a premium template, a thirty-second preview of the real one. Bouquet never wilts and you pick every stem; Recipe Box writes the recipe for her, one ingredient at a time.",
        },
        {
          heading: "When to send it",
          body: "On a premium template, schedule it for first thing in the morning, so it's there before the phone calls. If you're bringing her lunch, print the QR card and put it under her plate. If you're far away, it arrives the second you send it, and her reaction — an emoji, a note, or a recorded one — comes back to your dashboard.",
        },
      ],
      faq: [
        {
          q: "Can my brothers and sisters add their lines?",
          a: "One person makes the gift; collect the others' lines by message and put them in, each under a name. Or make one each — she gets a set to open one after another.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo del Día de la Madre con tus palabras",
      lead: "Tiene un cajón de tarjetas. Lo que no tiene es lo que le dirías si no te diera vergüenza: las fotos antiguas, la canción que siempre canta y una carta que nombre lo que hizo por ti. Enviado como un enlace que abre en el autobús, en el trabajo y otra vez esa noche.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Empieza por un recuerdo concreto: las meriendas, el coche a las dos de la madrugada, la frase que dijo y que sigues repitiendo. Luego di qué entiendes ahora que entonces no. Dos párrafos. Jar of Reasons te deja darle un tarro de razones cortas para sacar de una en una, que es más fácil que una carta larga.",
        },
        {
          heading: "Qué añadir",
          body: "Busca las fotos en las que sale ella, no las que hizo ella; siempre hay menos. Añade su canción: algo de la biblioteca o, en una plantilla premium, una muestra de treinta segundos de la de verdad. Bouquet nunca se marchita y eliges cada tallo; Recipe Box escribe la receta de ella, ingrediente a ingrediente.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "En una plantilla premium, prográmalo para primera hora de la mañana, para que esté antes que las llamadas. Si vas a llevarle la comida, imprime la tarjeta QR y déjala bajo su plato. Si estás lejos, llega en cuanto lo envías, y su reacción, un emoji, una nota o una grabada, te llega a tu panel.",
        },
      ],
      faq: [
        {
          q: "¿Pueden añadir algo mis hermanos?",
          a: "El regalo lo hace una persona; recoge las frases de los demás por mensaje y ponlas dentro, cada una con su nombre. O haced uno cada uno: le llega un conjunto para abrir uno detrás de otro.",
        },
        phoneEs,
        costEs,
      ],
    },
  },

  "fathers-day": {
    en: {
      title: "A Father's Day gift he'll actually keep",
      lead: "Not another tie, not a mug. The road trips, the lessons, the terrible jokes, in a gift that opens on his phone — with a note that says the thing sons and daughters mostly don't say to their dads, and the song from the car.",
      sections: [
        {
          heading: "What to write",
          body: "Dads get the shortest messages of anyone. Give him a real one: the time he showed up, the thing he taught you that you use every week, the joke you've stolen. Then one line you've never said out loud. Front Page makes him the headline; Museum gives the two of you a building.",
        },
        {
          heading: "What to add",
          body: "The photo where he's carrying you, the one where you're the same height, and one from this year. The song from the car, or the one he plays too loud in the kitchen: these templates are premium, so a thirty-second preview of the real one plays. A short video of the grandchildren, if there are any.",
        },
        {
          heading: "When to send it",
          body: "Send it in the morning, before the barbecue, or schedule it so it's the first thing on his phone. If you're together, print the QR card and put it with the present; it opens with the camera. Jar of Reasons gives him a jar of short ones to shake out over the week.",
        },
      ],
      faq: [
        {
          q: "He isn't good with phones. Will he manage?",
          a: "It's one tap on a link, or pointing the camera at the card. There's nothing to install and no account to make. If he can open a photo someone sends him, he can open this.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo del Día del Padre que guardará de verdad",
      lead: "Ni otra corbata ni otra taza. Los viajes en coche, las lecciones y los chistes malos, en un regalo que se abre en su móvil, con una nota que dice lo que hijos e hijas casi nunca dicen a sus padres, y la canción del coche.",
      sections: [
        {
          heading: "Qué escribir",
          body: "A los padres les llegan los mensajes más cortos de todos. Dale uno de verdad: la vez que apareció, lo que te enseñó y usas cada semana, el chiste que le has robado. Luego una línea que nunca has dicho en voz alta. Front Page le hace titular; Museum os da un edificio a los dos.",
        },
        {
          heading: "Qué añadir",
          body: "La foto en la que te lleva en brazos, la de cuando ya medís lo mismo y una de este año. La canción del coche, o la que pone demasiado alta en la cocina: estas plantillas son premium, así que suena una muestra de treinta segundos de la de verdad. Un vídeo corto de los nietos, si los hay.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Mándalo por la mañana, antes de la comida, o prográmalo para que sea lo primero que vea en el móvil. Si estáis juntos, imprime la tarjeta QR y ponla con el regalo; se abre con la cámara. Jar of Reasons le da un tarro de razones cortas para ir sacando durante la semana.",
        },
      ],
      faq: [
        {
          q: "No se maneja con el móvil. ¿Sabrá abrirlo?",
          a: "Es un toque en un enlace, o apuntar la cámara a la tarjeta. No hay nada que instalar ni cuenta que crear. Si sabe abrir una foto que le mandan, sabe abrir esto.",
        },
        phoneEs,
        costEs,
      ],
    },
  },

  apology: {
    en: {
      title: "How to say sorry when a text isn't enough",
      lead: "A text apology is read in four seconds and answered in ten. This takes longer to make, and that is the point: they can see you sat down, chose the words, found the photo, and sent something they can open when they're ready — not something they have to answer now.",
      sections: [
        {
          heading: "What to write",
          body: "Say what you did, in plain words, without “if” and without “but”. Say what you understand it cost them. Say what you'll do differently, and only if it's true. Don't ask for anything back. The Letter is free and gives the words room; Text Thread says it one bubble at a time, the way you'd have said it if you'd had the nerve.",
        },
        {
          heading: "What to add",
          body: "One photo, maybe two, from a good day — not as a bargaining chip, as a reminder of what you're apologising for the sake of. No song is fine here, or something quiet from the library. Paper Crane has them fold the page crease by crease, one line per fold, which takes patience; Bloom opens slowly, which suits the tone.",
        },
        {
          heading: "When to send it",
          body: "Not at midnight, not at work. Send it when they'll have a quiet moment, and don't follow it with a text asking if they've seen it. Your dashboard shows you when it's been opened and carries their reaction back if they choose to send one. Then leave it with them.",
        },
      ],
      faq: [
        {
          q: "Is a digital gift too little for a serious apology?",
          a: "It's the words that do the work; the gift is the envelope. Write the honest version, don't decorate it, and it will read as what it is: time taken.",
        },
        {
          q: "Can I make it without them knowing until it's sent?",
          a: "Yes. Nobody sees it until you publish, and nobody is told about it until you send the link yourself. The Letter is free, so there's no charge to explain either.",
        },
        keepEn,
      ],
    },
    es: {
      title: "Cómo pedir perdón cuando un mensaje no basta",
      lead: "Una disculpa por WhatsApp se lee en cuatro segundos y se contesta en diez. Esto tarda más en hacerse, y esa es la gracia: se nota que te sentaste, elegiste las palabras, buscaste la foto y mandaste algo que puede abrir cuando esté preparado, no algo que tenga que contestar ahora.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Di lo que hiciste, con palabras claras, sin “si” y sin “pero”. Di qué entiendes que le costó. Di qué harás distinto, y solo si es verdad. No pidas nada a cambio. The Letter es gratis y le da espacio a las palabras; Text Thread lo dice burbuja a burbuja, como lo habrías dicho si te hubieras atrevido.",
        },
        {
          heading: "Qué añadir",
          body: "Una foto, dos como mucho, de un buen día: no como moneda de cambio, sino para recordar por qué pides perdón. Aquí puede ir sin canción, o algo tranquilo de la biblioteca. Paper Crane le hace doblar la hoja pliegue a pliegue, una línea por doblez, y eso pide paciencia; Bloom se abre despacio, que va con el tono.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Ni a medianoche ni en el trabajo. Mándalo cuando tenga un rato tranquilo, y no lo sigas con un mensaje preguntando si lo ha visto. Tu panel te dice cuándo se ha abierto y te trae su reacción si decide mandarla. Y luego déjalo en sus manos.",
        },
      ],
      faq: [
        {
          q: "¿Un regalo digital se queda corto para una disculpa seria?",
          a: "El trabajo lo hacen las palabras; el regalo es el sobre. Escribe la versión sincera, no la adornes, y se leerá como lo que es: tiempo dedicado.",
        },
        {
          q: "¿Puedo hacerlo sin que se entere hasta que lo envíe?",
          a: "Sí. Nadie lo ve hasta que lo publicas, y nadie se entera hasta que tú mismo mandas el enlace. The Letter es gratis, así que tampoco hay un cargo que explicar.",
        },
        keepEs,
      ],
    },
  },

  "long-distance": {
    en: {
      title: "A gift that arrives the moment you send it",
      lead: "Miles apart, the post takes a week and the parcel goes to the wrong office. This arrives the second it's ready, in their time zone, on their phone: a passport that flies from your city to theirs, the places that belong to you both, a countdown to the next visit, and your voice.",
      sections: [
        {
          heading: "What to write",
          body: "Write about a normal day, not a grand feeling: what you ate, what you'd have shown them on the walk, the thing you nearly texted at 3 a.m. and didn't. Distance makes the small things the point. Halfway flies a paper plane from your door to theirs; Passport draws the route from your city to theirs and stamps a page for every photo.",
        },
        {
          heading: "What to add",
          body: "The last photo you took together and the first one from this stretch apart. The song you send each other: both templates are premium, so a thirty-second preview of the real one plays. Record a voice message — hearing you is what they're short of — and set a countdown to the day you land.",
        },
        {
          heading: "When to send it",
          body: "Schedule it for the morning where they are, so it's waiting when they wake up; the time zone is a setting. Or send it at the end of your day, so they have it at the start of theirs. Their reaction comes back to your dashboard, and “send one back” gives them a way to answer with one of their own.",
        },
      ],
      faq: [
        {
          q: "Does the schedule use my time or theirs?",
          a: "You choose the time zone when you schedule it. Pick theirs and it unlocks at that hour where they are, whatever the clock says where you are.",
        },
        {
          q: "Can they reply with one?",
          a: "Yes. At the end of every gift there is “send one back”, which starts a new gift with the names already swapped. Halfway even flips the two places.",
        },
        costEn,
      ],
    },
    es: {
      title: "Un regalo que llega en el momento en que lo envías",
      lead: "A kilómetros, el correo tarda una semana y el paquete acaba en la oficina equivocada. Esto llega en el segundo en que está listo, en su zona horaria, en su móvil: un pasaporte que vuela de tu ciudad a la suya, los sitios que son de los dos, una cuenta atrás hasta la próxima visita y tu voz.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Escribe sobre un día normal, no sobre un gran sentimiento: qué comiste, qué le habrías enseñado en el paseo, lo que casi le escribes a las tres de la mañana y no. La distancia convierte lo pequeño en lo importante. Halfway lanza un avión de papel de tu puerta a la suya; Passport dibuja la ruta de tu ciudad a la suya y sella una página por cada foto.",
        },
        {
          heading: "Qué añadir",
          body: "La última foto que os hicisteis juntos y la primera de esta temporada separados. La canción que os mandáis: las dos plantillas son premium, así que suena una muestra de treinta segundos de la de verdad. Graba un mensaje de voz, oírte es lo que le falta, y pon una cuenta atrás hasta el día en que aterrizas.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Prográmalo para la mañana donde está, para que le espere al despertar; la zona horaria se elige. O mándalo al final de tu día, para que lo tenga al principio del suyo. Su reacción te llega a tu panel, y “devolver uno” le da una forma de contestar con uno suyo.",
        },
      ],
      faq: [
        {
          q: "¿La programación usa mi hora o la suya?",
          a: "Eliges la zona horaria al programarlo. Pon la suya y se desbloquea a esa hora donde está, diga lo que diga el reloj donde estás tú.",
        },
        {
          q: "¿Puede responder con uno?",
          a: "Sí. Al final de cada regalo hay un “devolver uno” que abre un regalo nuevo con los nombres ya cambiados. Halfway incluso intercambia los dos sitios.",
        },
        costEs,
      ],
    },
  },

  "just-because": {
    en: {
      title: "A gift for no reason, which is the best reason",
      lead: "Birthdays are expected. A Tuesday isn't. A small gift on an ordinary day — three photos, a song, a few honest lines — says you were thinking of them when nothing required it, which is the thing people actually want to hear.",
      sections: [
        {
          heading: "What to write",
          body: "One line about why today: something reminded you of them, they've had a rough week, you just wanted to. Then one thing you like about them that you've never said. That's it; keep it under a hundred words. Fortune Cookie hides it inside; Sticker Bomb and The Council are for making them laugh at their desk.",
        },
        {
          heading: "What to add",
          body: "A photo from your camera roll they haven't seen, and one they'd forgotten. A song from the library, or, on a premium template, a thirty-second preview of the one that's playing right now. Nothing else needed. The Letter is free if you want it plain; Kawaii and Balloons if you want it light.",
        },
        {
          heading: "When to send it",
          body: "Now. That's the point of this one. Copy the link into the chat you're already in. If you want it to land at a particular moment — the start of their commute, the end of a hard day — a premium template lets you schedule it to the minute.",
        },
      ],
      faq: [
        {
          q: "Isn't it a bit much for no occasion?",
          a: "Not if it's short. Pick a light template, write three lines, and it's the size of a nice text with a bit more care in it. The weight comes from what you write, not from the format.",
        },
        phoneEn,
        costEn,
      ],
    },
    es: {
      title: "Un regalo sin motivo, que es el mejor motivo",
      lead: "Los cumpleaños se esperan. Un martes no. Un regalo pequeño en un día cualquiera, tres fotos, una canción, unas líneas sinceras, dice que pensabas en esa persona cuando nada lo exigía, que es justo lo que la gente quiere oír.",
      sections: [
        {
          heading: "Qué escribir",
          body: "Una línea sobre por qué hoy: algo te ha recordado a esa persona, ha tenido una semana dura, te apetecía. Luego una cosa que te gusta de ella y que nunca has dicho. Nada más; que no pase de cien palabras. Fortune Cookie lo esconde dentro; Sticker Bomb y The Council son para hacerle reír en su mesa de trabajo.",
        },
        {
          heading: "Qué añadir",
          body: "Una foto del carrete que no ha visto y otra que había olvidado. Una canción de la biblioteca o, en una plantilla premium, una muestra de treinta segundos de la que suena ahora mismo. No hace falta más. The Letter es gratis si lo quieres sencillo; Kawaii y Balloons si lo quieres ligero.",
        },
        {
          heading: "Cuándo enviarlo",
          body: "Ahora. De eso va este. Copia el enlace en el chat en el que ya estás y mándalo sin avisar. Si quieres que llegue en un momento concreto, al empezar su trayecto al trabajo, al final de un día difícil, una plantilla premium te deja programarlo al minuto, en su zona horaria.",
        },
      ],
      faq: [
        {
          q: "¿No es demasiado sin una ocasión?",
          a: "No si es corto. Elige una plantilla ligera, escribe tres líneas, y tiene el tamaño de un buen mensaje con algo más de cuidado. El peso lo pone lo que escribes, no el formato.",
        },
        phoneEs,
        costEs,
      ],
    },
  },
};
