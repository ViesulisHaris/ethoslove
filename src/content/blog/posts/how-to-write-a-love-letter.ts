import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "how-to-write-a-love-letter",
  published: "2026-10-26",
  occasion: "valentines",
  templates: ["the-letter", "xoxo", "coquette"],
  content: {
    en: {
      title: "How to write a love letter when you freeze at a blank page",
      description: "How to write a love letter in five steps: one memory, what it meant, what's true now and what you want next, plus a finished example and ways to open and close.",
      keyword: "how to write a love letter",
      lead: "To write a love letter, start with one memory, not your whole relationship. Say what happened, then what it meant to you, then something true about now, and end with what you want next. That's the whole structure. Below are the five steps with an example for each, a finished letter built from them, and ways to open and close that don't sound borrowed.",
      takeaways: [
        "One specific memory carries a letter further than ten compliments.",
        "Write it the way you'd say it out loud, then cut the sentences you'd never say.",
        "Leave out grievances, exes and promises you can't keep.",
        "Half a page you mean beats two pages you padded.",
      ],
      body: [
        { type: "h2", text: "How to write a love letter in five steps" },
        {
          type: "p",
          text: "Most people freeze because they try to fit everything in. A love letter isn't a summary of the relationship. It's one window into it, held open long enough for them to see what you see. Give yourself twenty minutes and follow these in order:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Pick one memory.** Not the best one, the one that comes back to you when you're doing something else. The night the car broke down. The morning they made you breakfast and burned all of it. Write it in one line before you start.",
            "**Tell it plainly.** Write what happened the way you'd tell a friend: where you were, what they did, what was said. \"You stood in the rain trying to read the map on your phone while I held the umbrella over the phone instead of you.\"",
            "**Say what it meant.** This is the sentence most letters skip. What did you realise, or feel, or decide? \"I remember thinking: this is someone I could get lost with.\"",
            "**Say something true about now.** Bring it into the present with one thing you notice about them these days. \"You still check the map three times before we leave the house, and I still love watching you do it.\"",
            "**End with what you want next.** A plan, a hope, a small promise you'll keep. \"Let's get lost somewhere new this year. I'll hold the umbrella over you this time.\"",
          ],
        },
        {
          type: "tip",
          title: "Can't get past the first line?",
          text: "Record yourself telling them the memory as a voice note, then write down what you said. Spoken sentences are shorter and warmer than the ones we type, and most of the letter will already be there.",
        },
        { type: "h2", text: "A love letter example, built from those steps" },
        {
          type: "p",
          text: "Here is what the five steps look like as one short letter. A letter like this takes about twenty minutes to write, and it's about 140 words, which fits on one side of a sheet of paper:",
        },
        {
          type: "quote",
          text: "I keep thinking about that night in the rain. You were trying to read the map on your phone, and I was holding the umbrella over the phone instead of you, and you didn't say a word about it. You just kept walking, soaked, completely sure we'd find the place. We never found it. We shared a slice of pizza in a bus shelter instead, and it's still one of my favourite dinners.",
        },
        {
          type: "quote",
          text: "I remember thinking: this is someone I could get lost with. I didn't say it then, because it was far too early and you had rain in your ears. I'm saying it now.",
        },
        {
          type: "quote",
          text: "You still check the map three times before we leave the house, and I still love watching you do it. Let's get lost somewhere new this year. I'll hold the umbrella over you this time.",
          cite: "Yours, completely",
        },
        {
          type: "p",
          text: "Notice what it doesn't do: it never says \"you're amazing\" or \"I can't live without you\". The memory says it for you. For more on turning moments into lines, our [100 reasons why I love you](/blog/reasons-why-i-love-you) uses the same method on a list.",
        },
        { type: "h2", text: "How to start a love letter" },
        {
          type: "p",
          text: "The greeting is easier than it looks: use the name or nickname you actually call them. \"Dear\" works for a formal, old-fashioned letter; most people skip it. Then the first sentence. These openings get you straight into the memory, which is where the letter wants to be:",
        },
        {
          type: "list",
          items: [
            "\"I keep thinking about…\" followed by the memory.",
            "\"Do you remember…\" followed by a moment they'll remember too.",
            "\"I've never told you this, but…\" if there's something you noticed and kept to yourself.",
            "\"I'm writing this because…\" if there's an occasion: a year together, a move, a hard month.",
            "\"It's late and you're asleep next to me, so…\" if it's true. Where you are as you write is a good first line.",
          ],
        },
        { type: "h2", text: "How to end a love letter" },
        {
          type: "p",
          text: "End on what you want next, then sign off in your own voice. Avoid anything you'd put on a work email. Some sign-offs that work, from simplest to most romantic:",
        },
        {
          type: "table",
          head: ["Sign-off", "When it fits"],
          rows: [
            ["Love, then your name", "Always. Simple is never wrong."],
            ["All my love", "When the letter is warm but not dramatic."],
            ["Yours", "When you want it to feel like a promise."],
            ["The name you're saved under in their phone", "When you share a joke and want the letter to end on it."],
            ["Forever yours", "For a big moment: an anniversary, a proposal, a goodbye at the airport."],
          ],
        },
        {
          type: "p",
          text: "Then add a P.S. It's often the line they remember longest, so keep it light: an inside joke, a plan for Saturday, \"P.S. You still owe me pizza.\"",
        },
        { type: "h2", text: "What to leave out of a love letter" },
        {
          type: "list",
          items: [
            "**Grievances.** Even gentle ones. \"I know things have been hard because you've been so busy\" turns the letter into a conversation you should have in person.",
            "**Exes and comparisons.** \"Nobody has ever treated me like this\" makes them think about who did.",
            "**Promises you can't keep.** \"I'll never be grumpy again\" is a joke you'll both remember on Tuesday. Promise something small and real instead.",
            "**Song lyrics and quotes**, unless it's your song. Someone else's words in the middle of yours make the rest sound borrowed too.",
            "**A paragraph apologising for not being good with words.** One line is honest. A paragraph is stalling.",
          ],
        },
        { type: "h2", text: "How long should a love letter be?" },
        {
          type: "p",
          text: "Shorter than you think. The letter above is about 140 words. That's enough for one memory told properly, and it can be read twice in a minute, which is what people do with love letters.",
        },
        {
          type: "table",
          head: ["What it's for", "Length", "Time to write"],
          rows: [
            ["A note in a lunchbox or a coat pocket", "Two or three sentences", "Five minutes"],
            ["Just because", "100 to 200 words", "Twenty minutes"],
            ["[An anniversary](/blog/anniversary-letter-to-boyfriend) or a birthday", "200 to 400 words", "An evening, with a night's sleep before you reread it"],
            ["Before time apart", "As long as one memory needs, or a set of [open when letters](/blog/open-when-letter-ideas)", "Write it a few days before, not the night before"],
          ],
        },
        { type: "h2", text: "Handwritten or digital?" },
        {
          type: "p",
          text: "Handwritten, if you'll see them: your handwriting is part of the letter, crossings-out included. Write a draft first, copy it out once, and date it, so years from now they know when you wrote it. If they're far away, send it as a [digital gift](/gifts) instead, and add the photo from the memory you wrote about. Having it open at a set moment, such as midnight where they are, is a paid extra on any template.",
        },
        {
          type: "template",
          slug: "the-letter",
          note: "A wax-sealed envelope they open with a tap. The letter unfolds on a candle-lit desk, your words appear in handwriting and your photos drop in as polaroids. Free, and the closest thing to a letter on paper.",
        },
        {
          type: "template",
          slug: "xoxo",
          note: "An envelope sealed with a lipstick kiss. They scroll down a red collage of your photos as polaroids, cut-out newspaper letters spelling what you call them and a card with the lines you'd underline, already underlined. Your letter is at the bottom, typed, with one last kiss by your name.",
        },
        {
          type: "template",
          slug: "coquette",
          note: "They untie a satin bow and a collage unrolls under their thumb: polaroids between lilies and blossom, a postcard in your handwriting, your song on a little player. The torn pink paper behind it is faintly covered in the words of your letter, which waits at the bottom.",
        },
        {
          type: "p",
          text: "XOXO and Coquette are [premium templates](/pricing). If you're writing for [Valentine's Day](/occasions/valentines), start a week ahead: the letter will be better for a second draft.",
        },
      ],
      faq: [
        {
          q: "How do you start a love letter?",
          a: "Use the name or nickname you actually call them, then go straight into a memory: \"I keep thinking about the night…\" or \"Do you remember…\". Starting with a specific moment is easier than starting with how you feel, and it pulls the rest of the letter along with it.",
        },
        {
          q: "What should I write in a love letter?",
          a: "One memory told plainly, what it meant to you, something true about them now, and what you want next. That structure works for any relationship and any length. Leave out grievances, exes and promises you can't keep.",
        },
        {
          q: "How long should a love letter be?",
          a: "Usually 100 to 400 words. A just-because letter can be half a page; an anniversary letter can be a full page. Length matters less than whether each sentence could only be about them, so cut anything that could go in anyone's letter.",
        },
        {
          q: "How do you end a love letter?",
          a: "End with what you want next, such as a plan, a hope or a small promise, then sign off in your own voice: \"Love\", \"All my love\" or \"Yours\" followed by your name. A short P.S. with an inside joke is the line they'll often remember longest.",
        },
      ],
    },
    es: {
      title: "Cómo escribir una carta de amor si te bloqueas al empezar",
      description: "Cómo escribir una carta de amor en cinco pasos: un recuerdo, qué significó, qué es verdad hoy y qué quieres después, con un ejemplo y cómo empezar y acabar.",
      keyword: "cómo escribir una carta de amor",
      lead: "Para escribir una carta de amor, empieza por un recuerdo, no por toda la relación. Cuenta qué pasó, luego qué significó para ti, después algo que sea verdad ahora, y termina con lo que quieres que pase después. Esa es toda la estructura. Aquí tienes los cinco pasos con un ejemplo de cada uno, una carta terminada a partir de ellos y formas de empezar y acabar que no suenan prestadas.",
      takeaways: [
        "Un recuerdo concreto llega más lejos que diez piropos.",
        "Escríbela como la dirías en voz alta, y luego quita las frases que nunca dirías.",
        "Deja fuera los reproches, los ex y las promesas que no vas a cumplir.",
        "Media página sentida vale más que dos de relleno.",
      ],
      body: [
        { type: "h2", text: "Cómo escribir una carta de amor en cinco pasos" },
        {
          type: "p",
          text: "Casi todo el mundo se bloquea porque intenta meterlo todo. Una carta de amor no es un resumen de la relación. Es una ventana a ella, abierta el tiempo justo para que vea lo que tú ves. Date veinte minutos y sigue estos pasos en orden:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Elige un recuerdo.** No el mejor, sino el que te vuelve a la cabeza cuando estás haciendo otra cosa. La noche que se averió el coche. La mañana que te hizo el desayuno y se le quemó todo. Escríbelo en una línea antes de empezar.",
            "**Cuéntalo tal cual.** Escribe lo que pasó como se lo contarías a una amiga: dónde estabais, qué hizo, qué os dijisteis. «Estabas bajo la lluvia intentando leer el mapa en el móvil mientras yo sujetaba el paraguas encima del móvil en vez de encima de ti».",
            "**Di qué significó.** Es la frase que casi todas las cartas se saltan. ¿De qué te diste cuenta, qué sentiste, qué decidiste? «Me acuerdo de pensar: con esta persona me perdería a gusto».",
            "**Di algo que sea verdad ahora.** Tráelo al presente con algo que notas en esa persona hoy en día. «Sigues mirando el mapa tres veces antes de salir de casa, y a mí me sigue encantando verte hacerlo».",
            "**Termina con lo que quieres que pase después.** Un plan, un deseo, una promesa pequeña que vayas a cumplir. «Vamos a perdernos en algún sitio nuevo este año. Esta vez el paraguas te lo sujeto a ti».",
          ],
        },
        {
          type: "tip",
          title: "¿No pasas de la primera línea?",
          text: "Grábate contándole el recuerdo en una nota de voz y luego escribe lo que has dicho. Las frases habladas son más cortas y más cálidas que las que tecleamos, y casi toda la carta ya estará ahí.",
        },
        { type: "h2", text: "Un ejemplo de carta de amor hecha con esos pasos" },
        {
          type: "p",
          text: "Así quedan los cinco pasos en una carta corta. Se tarda unos veinte minutos en escribirla y tiene unas 140 palabras, lo que cabe en una cara de un folio:",
        },
        {
          type: "quote",
          text: "No dejo de pensar en aquella noche bajo la lluvia. Intentabas leer el mapa en el móvil, yo sujetaba el paraguas encima del móvil en vez de encima de ti, y no dijiste ni una palabra. Seguiste andando, empapado, convencido de que encontraríamos el sitio. No lo encontramos nunca. Acabamos compartiendo un trozo de pizza en una parada de autobús, y sigue siendo una de mis cenas favoritas.",
        },
        {
          type: "quote",
          text: "Me acuerdo de pensar: con esta persona me perdería a gusto. No te lo dije entonces, porque era demasiado pronto y tenías lluvia hasta en las orejas. Te lo digo ahora.",
        },
        {
          type: "quote",
          text: "Sigues mirando el mapa tres veces antes de salir de casa, y a mí me sigue encantando verte hacerlo. Vamos a perdernos en algún sitio nuevo este año. Esta vez el paraguas te lo sujeto a ti.",
          cite: "Tuya, del todo",
        },
        {
          type: "p",
          text: "Fíjate en lo que no hace: nunca dice «eres increíble» ni «no puedo vivir sin ti». El recuerdo lo dice por ti. Para convertir momentos en frases, nuestras [100 razones por las que te quiero](/blog/reasons-why-i-love-you) usan el mismo método en una lista.",
        },
        { type: "h2", text: "Cómo empezar una carta de amor" },
        {
          type: "p",
          text: "El saludo es más fácil de lo que parece: usa el nombre o el mote con el que le llamas de verdad. «Querido» o «querida» funciona para una carta más clásica; mucha gente se lo salta. Luego, la primera frase. Estos comienzos te llevan directa al recuerdo, que es donde la carta quiere estar:",
        },
        {
          type: "list",
          items: [
            "«No dejo de pensar en…» y el recuerdo.",
            "«¿Te acuerdas de…?» y un momento que también recuerde.",
            "«Nunca te lo he dicho, pero…» si hay algo que notaste y te guardaste.",
            "«Te escribo porque…» si hay un motivo: un año juntos, una mudanza, un mes difícil.",
            "«Es tarde y estás dormido a mi lado, así que…» si es verdad. Dónde estás mientras escribes es una buena primera línea.",
          ],
        },
        { type: "h2", text: "Cómo terminar una carta de amor" },
        {
          type: "p",
          text: "Termina con lo que quieres que pase después y despídete con tu propia voz. Evita cualquier cosa que pondrías en un correo del trabajo. Algunas despedidas que funcionan, de la más sencilla a la más romántica:",
        },
        {
          type: "table",
          head: ["Despedida", "Cuándo encaja"],
          rows: [
            ["Te quiero, y tu nombre", "Siempre. Lo sencillo nunca falla."],
            ["Con todo mi amor", "Cuando la carta es cálida pero no dramática."],
            ["Tuya o tuyo", "Cuando quieres que suene a promesa."],
            ["El nombre con el que te tiene guardada en el móvil", "Cuando compartís una broma y quieres que la carta acabe con ella."],
            ["Tuya para siempre", "Para un momento grande: un aniversario, una pedida, una despedida en el aeropuerto."],
          ],
        },
        {
          type: "p",
          text: "Y luego añade una posdata. Suele ser la línea que más tiempo se recuerda, así que hazla ligera: una broma privada, un plan para el sábado, «P. D.: me sigues debiendo una pizza».",
        },
        { type: "h2", text: "Qué no poner en una carta de amor" },
        {
          type: "list",
          items: [
            "**Reproches.** Ni siquiera suaves. «Sé que las cosas han estado difíciles porque has estado muy ocupado» convierte la carta en una conversación que tendríais que tener en persona.",
            "**Ex y comparaciones.** «Nadie me había tratado nunca así» le hace pensar en quién sí.",
            "**Promesas que no vas a cumplir.** «Nunca volveré a estar de mal humor» es una broma que los dos recordaréis el martes. Promete algo pequeño y real.",
            "**Letras de canciones y citas**, salvo que sea vuestra canción. Palabras de otro en mitad de las tuyas hacen que el resto también suene prestado.",
            "**Un párrafo pidiendo perdón por no saber escribir.** Una línea es sincera. Un párrafo es marear la perdiz.",
          ],
        },
        { type: "h2", text: "¿Cuánto tiene que ocupar una carta de amor?" },
        {
          type: "p",
          text: "Menos de lo que crees. La carta de arriba tiene unas 140 palabras. Basta para contar bien un recuerdo, y se puede leer dos veces en un minuto, que es lo que hace la gente con las cartas de amor.",
        },
        {
          type: "table",
          head: ["Para qué es", "Extensión", "Tiempo para escribirla"],
          rows: [
            ["Una nota en la fiambrera o en el bolsillo del abrigo", "Dos o tres frases", "Cinco minutos"],
            ["Sin motivo", "De 100 a 200 palabras", "Veinte minutos"],
            ["[Un aniversario](/blog/anniversary-letter-to-boyfriend) o un cumpleaños", "De 200 a 400 palabras", "Una tarde, y una noche de sueño antes de releerla"],
            ["Antes de una temporada separados", "Lo que pida un recuerdo, o una serie de [cartas para abrir cuando](/blog/open-when-letter-ideas)", "Escríbela unos días antes, no la noche anterior"],
          ],
        },
        { type: "h2", text: "¿A mano o digital?" },
        {
          type: "p",
          text: "A mano, si vas a verle: tu letra es parte de la carta, tachones incluidos. Haz primero un borrador, pásalo a limpio una vez y ponle la fecha, para que dentro de unos años sepa cuándo la escribiste. Si está lejos, mándala como [regalo digital](/gifts) y añade la foto del recuerdo del que hablas. Que se abra en un momento concreto, como la medianoche donde esté, es un extra de pago en cualquier plantilla.",
        },
        {
          type: "template",
          slug: "the-letter",
          note: "Un sobre lacrado que se abre con un toque. La carta se despliega sobre un escritorio a la luz de una vela, tus palabras aparecen escritas a mano y tus fotos caen como polaroids. Gratis, y lo más parecido a una carta en papel.",
        },
        {
          type: "template",
          slug: "xoxo",
          note: "Un sobre sellado con un beso de pintalabios. Baja por un collage en rojo con tus fotos como polaroids, letras recortadas de periódico con el nombre que le das y una tarjeta con las frases que subrayarías, ya subrayadas. Tu carta está al final, a máquina, con un último beso junto a tu nombre.",
        },
        {
          type: "template",
          slug: "coquette",
          note: "Desata un lazo de satén y un collage se despliega bajo su dedo: polaroids entre lirios y flores, una postal con tu letra, tu canción en un reproductor diminuto. El papel rosa rasgado del fondo está cubierto, muy tenue, con las palabras de tu carta, que espera al final.",
        },
        {
          type: "p",
          text: "XOXO y Coquette son [plantillas premium](/pricing). Si escribes para [San Valentín](/occasions/valentines), empieza una semana antes: la carta saldrá mejor con un segundo borrador.",
        },
      ],
      faq: [
        {
          q: "¿Cómo se empieza una carta de amor?",
          a: "Usa el nombre o el mote con el que le llamas de verdad y entra directamente en un recuerdo: «No dejo de pensar en aquella noche…» o «¿Te acuerdas de…?». Empezar por un momento concreto es más fácil que empezar por lo que sientes, y arrastra el resto de la carta.",
        },
        {
          q: "¿Qué se pone en una carta de amor?",
          a: "Un recuerdo contado tal cual, qué significó para ti, algo que sea verdad de esa persona ahora y lo que quieres que pase después. Esa estructura vale para cualquier relación y cualquier extensión. Deja fuera los reproches, los ex y las promesas que no vas a cumplir.",
        },
        {
          q: "¿Cuánto tiene que ocupar una carta de amor?",
          a: "Normalmente entre 100 y 400 palabras. Una carta sin motivo puede ocupar media página; una de aniversario, una página entera. Importa menos la extensión que el que cada frase solo pueda hablar de esa persona, así que quita lo que valdría para la carta de cualquiera.",
        },
        {
          q: "¿Cómo se termina una carta de amor?",
          a: "Con lo que quieres que pase después, como un plan, un deseo o una promesa pequeña, y luego despídete con tu propia voz: «Te quiero», «Con todo mi amor» o «Tuya», y tu nombre. Una posdata corta con una broma privada suele ser la línea que más tiempo se recuerda.",
        },
      ],
    },
  },
};
