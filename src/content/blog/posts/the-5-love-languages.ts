import type { BlogPost } from "../types";

export const post: BlogPost = {
  slug: "the-5-love-languages",
  published: "2026-11-20",
  occasion: "just-because",
  templates: ["the-letter", "picnic", "bouquet"],
  content: {
    en: {
      title: "The 5 love languages: what they are and how to use them",
      description: "The 5 love languages in plain words, with one small thing to try for each, how to find yours and theirs, what to do when they differ, and what research says.",
      keyword: "5 love languages",
      lead: "The 5 love languages are words of affirmation, quality time, receiving gifts, acts of service and physical touch: five ways people give and notice love, named by counsellor Gary Chapman in his 1992 book. Most people want all five. Your love language is the one you notice first and miss most when it stops. Below: each one in plain words, how to spot yours and theirs, and what to do when they don't match.",
      takeaways: [
        "The five: words of affirmation, quality time, receiving gifts, acts of service, physical touch.",
        "People tend to give love the way they'd like to get it, so watch what your partner does for you.",
        "Different languages are the usual case, not a warning sign. Learn to say it in theirs.",
        "Research finds people value all five, so treat your result as a starting point, not a label.",
      ],
      body: [
        { type: "h2", text: "What are the 5 love languages?" },
        {
          type: "p",
          text: "Gary Chapman, a Baptist pastor and marriage counsellor, kept hearing the same complaint from couples: one would say “I don't feel loved”, and the other would say “I'm doing everything I can”. Going back over years of notes from those sessions, he found that what people wanted fell into five groups. He called them love languages, and his 1992 book *The 5 Love Languages* has sold more than 20 million copies.",
        },
        {
          type: "p",
          text: "The idea is simple. Both partners can be trying hard and still miss, because each is speaking a language the other doesn't hear well. The table puts the five love language types side by side, with one thing you could do for each tonight and the thing that hurts most. Each name links to a full guide.",
        },
        {
          type: "table",
          head: ["Love language", "They feel loved when…", "Try tonight", "What hurts most"],
          rows: [
            ["[Words of affirmation](/blog/words-of-affirmation)", "It's said out loud or written down", "Tell them one specific thing they did this week that you noticed", "Harsh words, and praise that's never said"],
            ["[Quality time](/blog/quality-time-love-language)", "They have your whole attention", "Twenty minutes after dinner, both phones in another room", "Cancelled plans and half-listening"],
            ["[Receiving gifts](/blog/gift-giving-love-language)", "Something shows you thought of them", "Bring home the snack they mentioned once, weeks ago", "A forgotten birthday, or a gift chosen in a rush"],
            ["[Acts of service](/blog/acts-of-service-love-language)", "You make their load lighter", "Do the one job they've been dreading, without being asked", "Promises to help that never happen"],
            ["[Physical touch](/blog/physical-touch-love-language)", "You reach for them", "A long hug when they get home, before anyone says a word", "Pulling away, or no touch for days"],
          ],
        },
        { type: "h2", text: "The five love languages, one by one" },
        { type: "h3", text: "1. Words of affirmation" },
        {
          type: "p",
          text: "Compliments, thanks, encouragement, “I'm proud of you”. What counts is being specific. “You were brilliant with my mother at lunch” lands; “you're amazing” mostly doesn't. People with this language keep messages for years, and a careless line in an argument stays with them longer than it would with most people.",
        },
        { type: "h3", text: "2. Quality time" },
        {
          type: "p",
          text: "Undivided attention: a conversation where you actually listen, or doing something together. It's measured in attention, not hours. Two hours on the same sofa while you both scroll doesn't count, and checking your phone while they talk counts against you.",
        },
        { type: "h3", text: "3. Receiving gifts" },
        {
          type: "p",
          text: "Not about money. The gift is proof that they were on your mind when they weren't in the room: the ticket stub, the pastry from the bakery they like, the thing they mentioned in passing that you remembered. Chapman's name for it is “receiving gifts”, and people often search for it as gift giving.",
        },
        { type: "h3", text: "4. Acts of service" },
        {
          type: "p",
          text: "Doing something that makes their life easier: filling the car up, sorting the paperwork, cooking when they're tired. For this person, actions really do speak louder than words, and “let me know if you need anything” is close to useless. Spot the job and do it.",
        },
        { type: "h3", text: "5. Physical touch" },
        {
          type: "p",
          text: "Hugs, holding hands, a hand on the back, sitting close, and sex. It's often the small, everyday touch that matters most: the kiss on the way out the door, a foot against theirs under the table. Days with no touch at all feel cold to them, even when everything else is fine.",
        },
        { type: "h2", text: "How to find your love language (and theirs)" },
        {
          type: "p",
          text: "Chapman's own method is to watch three things, and it works on both of you:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**How they show love to other people.** People tend to give love the way they'd like to get it. The friend who always turns up with a little present is telling you something.",
            "**What they complain about most.** “You're always on your phone” points to quality time. “You never say anything nice” points to words. A complaint is often a request in disguise.",
            "**What they ask for most.** “Can we go for a walk?” and “Can you help me with this?” are two different languages.",
          ],
        },
        {
          type: "p",
          text: "For yourself, ask the reverse: what would you miss most if it stopped tomorrow? Then check it with a quiz. Ours is a free [love language quiz](/tools/love-language-quiz): thirty quick choices between two things that feel like love, about four minutes, no email. It shows how all five rank for you, and you can send the link to your partner and see your results side by side.",
        },
        {
          type: "tip",
          title: "Read the whole result, not just the top line",
          text: "If two languages are only a few points apart, treat them as a pair. And look at the bottom one too: it's the language you'd most easily forget to speak to someone who needs it.",
        },
        { type: "h2", text: "When your love languages don't match" },
        {
          type: "p",
          text: "This is the usual case. Two people who speak different languages can both be trying hard and both feel unloved, which is exactly the pattern Chapman kept seeing. Say you're words of affirmation and he's acts of service. You tell him every day how much you love him; he cleans your car and puts up the shelf. Each of you is giving, and each of you is waiting for something else.",
        },
        {
          type: "list",
          items: [
            "**Translate, don't replace.** Keep doing what comes naturally, and add one thing a week in their language.",
            "**Ask in their terms.** “Can you text me when you land?” is easier to act on than “I need more reassurance”.",
            "**Notice the love you're already getting.** The shelf he put up was meant as an “I love you”. Saying that you saw it helps both of you.",
            "**Talk about it at a calm time,** not in the middle of an argument about the shelf.",
          ],
        },
        { type: "p", text: "Lines to start the conversation:" },
        { type: "quote", text: "I've realised I feel most loved when you tell me things, even small ones. What's the thing that makes you feel most loved by me?" },
        { type: "quote", text: "When you cooked on Tuesday because I was wiped out, that meant a lot. I don't think I said so." },
        { type: "h2", text: "How many love languages are there: 5 or 7?" },
        {
          type: "p",
          text: "Chapman's model has five, and it's still the one people mean by “love languages”. The “7 love languages” you may have seen come from Truity, a company that makes online personality tests: in 2022 it published seven “love styles” (activity, appreciation, emotional, financial, intellectual, physical and practical) based on its own online survey. Most of them map onto Chapman's five. The two that are new are emotional (feeling supported and understood) and intellectual (deep conversation, sharing ideas). It's a different, commercial framework, not an update to the book.",
        },
        {
          type: "p",
          text: "That said, the two new styles name something real. If your partner lights up most when you talk through an idea together, or when you listen without trying to fix anything, that's worth knowing whatever you call it.",
        },
        { type: "h2", text: "Which love language is most common?" },
        {
          type: "p",
          text: "Quality time, at least in the United States. When [YouGov asked American adults in 2022](https://yougov.com/en-us/articles/41009-what-are-americans-love-languages) to rank the five, 38% put quality time first, more than any other language. So if you're unsure what someone wants, undivided attention is a good first guess. It's a poll, though, not a rule: most people in it, 62%, put something else first.",
        },
        { type: "h2", text: "Do the love languages hold up? What the research says" },
        {
          type: "p",
          text: "Less well than their popularity suggests. In a 2024 review in *Current Directions in Psychological Science*, relationship scientists Emily Impett, Haeyoung Gideon Park and Amy Muise went through the published studies. As [the University of Toronto reported](https://www.utoronto.ca/news/little-evidence-linking-five-love-languages-healthy-relationships-researchers-say), they found little support for the idea that each person has one primary language, that there are exactly five, or that couples whose languages match are happier.",
        },
        {
          type: "p",
          text: "Two of their points are useful in practice. Quizzes force you to choose between things you'd happily have both of, and when people rate each language on its own, they rate all five as important. And the researchers suggest thinking of love as a balanced diet rather than a language: everyone needs a bit of everything, plus things the five leave out, such as emotional support and backing your partner's own goals.",
        },
        {
          type: "p",
          text: "So use the five as a vocabulary, not a diagnosis. They give you words for what you want and a reason to ask what the other person wants. The asking is what helps.",
        },
        { type: "h2", text: "A gift in each love language" },
        {
          type: "p",
          text: "Once you know theirs, you can make them something in it. A [digital gift](/gifts) from Ethos opens on their phone with your photos and your words, so it suits a birthday, an anniversary or [no reason at all](/occasions/just-because). Each language has a template that fits it: three are below, and for the other two, [Scratch Card](/templates/scratch-card) can hide a list of jobs you'll do for them (acts of service) and [XOXO](/templates/xoxo) is an envelope sealed with a lipstick kiss (physical touch). The Letter is free as a short note (up to 500 characters, no photos); the full letter and the others are a one-time unlock ([see pricing](/pricing)), and every template has a free demo.",
        },
        {
          type: "template",
          slug: "the-letter",
          note: "For words of affirmation. They tap to break a wax seal, the letter unfolds on a candlelit desk, your words appear in handwriting and your photos drop in as polaroids. A short version, up to 500 characters and without the photos, is free; the full letter with photos is paid once.",
        },
        {
          type: "template",
          slug: "picnic",
          note: "For quality time. A picnic basket on a gingham blanket: each tap takes one thing out, each with a line you wrote, and the last thing out is a folded note with your letter. If you've planned a date, it comes out of the basket too.",
        },
        {
          type: "template",
          slug: "bouquet",
          note: "For receiving gifts. You build a bouquet stem by stem, in the colours you choose, and they watch it come together one flower at a time before opening the little card inside. It never wilts.",
        },
      ],
      faq: [
        {
          q: "What are the five love languages?",
          a: "Words of affirmation (compliments, thanks and encouragement), quality time (undivided attention), receiving gifts (things that show you were thinking of them), acts of service (doing things that make their life easier) and physical touch (hugs, holding hands, closeness). Gary Chapman described them in his 1992 book. Most people value all five; their love language is the one they notice most and miss most when it stops.",
        },
        {
          q: "How many love languages are there? Is it 5 or 7?",
          a: "Five, in Gary Chapman's original model, which is what most people mean. The seven you may have seen are “love styles” published in 2022 by Truity, a personality-test company: activity, appreciation, emotional, financial, intellectual, physical and practical. Most overlap with Chapman's five; emotional and intellectual are the new ones. It's a separate framework, not a new edition of the book.",
        },
        {
          q: "Which love language is most common?",
          a: "Quality time. In a 2022 YouGov poll of American adults, 38% ranked it first, more than any other language. That makes undivided attention a good first guess when you don't know someone's love language, but only a guess: ask them, or each take a quiz and compare.",
        },
        {
          q: "What is most men's love language?",
          a: "There isn't one. Nothing reliable shows that men share a love language, any more than women do. The easiest way to find his is to watch what he does for you without being asked, listen to what he complains about, and notice what he asks for. Or ask him straight out what makes him feel most loved.",
        },
        {
          q: "Can you have more than one love language?",
          a: "Yes, and most people do. Chapman talks about a primary and a secondary language, and research finds people rate all five as important when they're asked about each one separately. If two of yours come out close in a quiz, treat them as a pair and tell your partner about both.",
        },
      ],
    },
    es: {
      title: "Los 5 lenguajes del amor: qué son y cómo usarlos",
      description: "Los 5 lenguajes del amor sin rodeos: algo que probar en cada uno, cómo saber el tuyo y el suyo, qué hacer si no coinciden y qué dice la ciencia.",
      keyword: "los 5 lenguajes del amor",
      lead: "Los 5 lenguajes del amor son las palabras de afirmación, el tiempo de calidad, recibir regalos, los actos de servicio y el contacto físico: cinco formas de dar y notar el amor que el consejero Gary Chapman describió en su libro de 1992. Casi todo el mundo quiere los cinco. Tu lenguaje del amor es el que notas primero y el que más echas de menos cuando falta. Aquí tienes cada uno sin rodeos, cómo saber el tuyo y el de tu pareja, y qué hacer si no coinciden.",
      takeaways: [
        "Los cinco: palabras de afirmación, tiempo de calidad, recibir regalos, actos de servicio y contacto físico.",
        "Solemos dar amor como nos gustaría recibirlo, así que fíjate en lo que tu pareja hace por ti.",
        "Tener lenguajes distintos es lo normal, no una mala señal. Aprende a decirlo en el suyo.",
        "Los estudios ven que valoramos los cinco: toma tu resultado como un punto de partida, no como una etiqueta.",
      ],
      body: [
        { type: "h2", text: "¿Cuáles son los 5 lenguajes del amor?" },
        {
          type: "p",
          text: "Gary Chapman, pastor baptista y consejero matrimonial, oía una y otra vez la misma queja en las parejas que atendía: una persona decía «no me siento querida» y la otra respondía «hago todo lo que puedo». Repasando años de notas de esas sesiones, vio que lo que pedían cabía en cinco grupos. Los llamó lenguajes del amor, y su libro de 1992, *Los 5 lenguajes del amor*, ha vendido más de 20 millones de ejemplares.",
        },
        {
          type: "p",
          text: "La idea es sencilla. Los dos podéis estar esforzándoos y aun así no acertar, porque cada cual habla un lenguaje que el otro no oye bien. La tabla pone los cinco tipos de lenguaje del amor uno al lado del otro, con algo que podrías hacer esta noche en cada uno y lo que más duele. Cada nombre lleva a una guía completa.",
        },
        {
          type: "table",
          head: ["Lenguaje del amor", "Se siente querido cuando…", "Prueba esta noche", "Lo que más duele"],
          rows: [
            ["[Palabras de afirmación](/blog/words-of-affirmation)", "Se lo dices en voz alta o por escrito", "Dile algo concreto que hizo esta semana y en lo que te fijaste", "Las palabras duras, y los elogios que nunca llegan"],
            ["[Tiempo de calidad](/blog/quality-time-love-language)", "Tiene toda tu atención", "Veinte minutos después de cenar, con los dos móviles en otra habitación", "Los planes cancelados y escuchar a medias"],
            ["[Recibir regalos](/blog/gift-giving-love-language)", "Algo demuestra que pensaste en esa persona", "Llévale a casa ese capricho que mencionó una vez, hace semanas", "Un cumpleaños olvidado, o un regalo comprado con prisas"],
            ["[Actos de servicio](/blog/acts-of-service-love-language)", "Le aligeras la carga", "Haz esa tarea que lleva días posponiendo, sin que te lo pida", "Las promesas de ayudar que nunca se cumplen"],
            ["[Contacto físico](/blog/physical-touch-love-language)", "Buscas su contacto", "Un abrazo largo cuando llegue a casa, antes de decir nada", "Que te apartes, o pasar días sin tocaros"],
          ],
        },
        { type: "h2", text: "Los cinco lenguajes del amor, uno a uno" },
        { type: "h3", text: "1. Palabras de afirmación" },
        {
          type: "p",
          text: "Cumplidos, gracias, ánimos, un «qué orgullo». Lo que cuenta es ser concreto. «Estuviste genial con mi madre en la comida» llega; «eres increíble», casi nunca. Quien tiene este lenguaje guarda mensajes durante años, y una frase dura en una discusión le pesa más que a la mayoría.",
        },
        { type: "h3", text: "2. Tiempo de calidad" },
        {
          type: "p",
          text: "Atención plena: una conversación en la que de verdad escuchas, o hacer algo juntos. Se mide en atención, no en horas. Dos horas en el mismo sofá mirando cada cual su móvil no cuentan, y mirar el teléfono mientras te habla resta.",
        },
        { type: "h3", text: "3. Recibir regalos" },
        {
          type: "p",
          text: "No va de dinero. El regalo es la prueba de que pensabas en esa persona cuando no estaba delante: la entrada del concierto, el dulce de su panadería favorita, eso que mencionó de pasada y tú recordaste. Chapman lo llama «recibir regalos», y mucha gente lo busca como el lenguaje del amor de los regalos.",
        },
        { type: "h3", text: "4. Actos de servicio" },
        {
          type: "p",
          text: "Hacer algo que le facilite la vida: ponerle gasolina al coche, ocuparte del papeleo, cocinar cuando está agotado. Para esta persona, los hechos valen más que las palabras, y «avísame si necesitas algo» casi no sirve. Mira qué hace falta y hazlo.",
        },
        { type: "h3", text: "5. Contacto físico" },
        {
          type: "p",
          text: "Abrazos, ir de la mano, una mano en la espalda, sentarse cerca, y el sexo. Muchas veces lo que más importa es el contacto pequeño de cada día: el beso al salir por la puerta, un pie contra el suyo bajo la mesa. Los días sin ningún contacto se le hacen fríos, aunque todo lo demás vaya bien.",
        },
        { type: "h2", text: "Cómo saber cuál es tu lenguaje del amor (y el suyo)" },
        {
          type: "p",
          text: "El método del propio Chapman es fijarse en tres cosas, y sirve para los dos:",
        },
        {
          type: "list",
          ordered: true,
          items: [
            "**Cómo demuestra cariño a los demás.** Solemos dar amor como nos gustaría recibirlo. La amiga que siempre aparece con un detalle te está diciendo algo.",
            "**De qué se queja más.** «Siempre estás con el móvil» apunta al tiempo de calidad. «Nunca me dices nada bonito» apunta a las palabras. Muchas quejas son una petición disfrazada.",
            "**Qué pide más a menudo.** «¿Damos un paseo?» y «¿Me ayudas con esto?» son dos lenguajes distintos.",
          ],
        },
        {
          type: "p",
          text: "Para ti, hazte la pregunta al revés: ¿qué echarías más de menos si mañana desapareciera? Luego compruébalo con un test. El nuestro es un [test de los lenguajes del amor](/tools/love-language-quiz) gratis: treinta elecciones rápidas entre dos cosas que para ti son amor, unos cuatro minutos, sin dejar tu correo. Te muestra cómo quedan los cinco, y puedes mandar el enlace a tu pareja para ver vuestros resultados lado a lado.",
        },
        {
          type: "tip",
          title: "Mira el resultado entero, no solo el primero",
          text: "Si dos lenguajes quedan a pocos puntos, tómalos como un par. Y mira también el último: es el lenguaje que más fácil se te olvidaría hablar con alguien que lo necesita.",
        },
        { type: "h2", text: "Cuando vuestros lenguajes del amor no coinciden" },
        {
          type: "p",
          text: "Es lo normal. Dos personas que hablan lenguajes distintos pueden estar esforzándose las dos y sentirse las dos poco queridas, justo lo que Chapman veía una y otra vez. Pongamos que el tuyo son las palabras de afirmación y el de tu novio los actos de servicio. Tú le dices cada día cuánto le quieres; él te lava el coche y cuelga la estantería. Los dos dais, y los dos esperáis otra cosa.",
        },
        {
          type: "list",
          items: [
            "**Traduce, no sustituyas.** Sigue haciendo lo que te sale natural y añade una cosa a la semana en su lenguaje.",
            "**Pide en sus términos.** «¿Me escribes cuando aterrices?» es más fácil de cumplir que «necesito que me des más seguridad».",
            "**Fíjate en el amor que ya recibes.** La estantería que colgó era un «te quiero». Decirle que lo viste os ayuda a los dos.",
            "**Habladlo en un momento tranquilo,** no en mitad de una discusión sobre la estantería.",
          ],
        },
        { type: "p", text: "Frases para empezar la conversación:" },
        { type: "quote", text: "Me he dado cuenta de que donde más querida me siento es cuando me dices las cosas, aunque sean pequeñas. ¿Qué es lo que más te hace sentir querido por mí?" },
        { type: "quote", text: "Lo del martes, cuando hiciste la cena porque yo estaba hecha polvo, significó mucho. Creo que no te lo dije." },
        { type: "h2", text: "¿Cuántos lenguajes del amor hay: 5 o 7?" },
        {
          type: "p",
          text: "El modelo de Chapman tiene cinco, y es el que la gente tiene en mente cuando habla de lenguajes del amor. Los «7 lenguajes del amor» que quizá hayas visto vienen de Truity, una empresa estadounidense de tests de personalidad en internet: en 2022 publicó siete «estilos de amor» (actividad, aprecio, emocional, económico, intelectual, físico y práctico) a partir de su propia encuesta en línea. Casi todos encajan con los cinco de Chapman. Los dos nuevos son el emocional (sentirse apoyado y comprendido) y el intelectual (las conversaciones profundas, compartir ideas). Es otro modelo, de una empresa, no una nueva versión del libro.",
        },
        {
          type: "p",
          text: "Aun así, esos dos estilos nuevos nombran algo real. Si a tu pareja lo que más le ilumina la cara es darle vueltas a una idea contigo, o que la escuches sin intentar arreglarle nada, merece la pena saberlo, lo llames como lo llames.",
        },
        { type: "h2", text: "¿Cuál es el lenguaje del amor más común?" },
        {
          type: "p",
          text: "El tiempo de calidad, al menos en Estados Unidos. Cuando [YouGov pidió a adultos estadounidenses en 2022](https://yougov.com/en-us/articles/41009-what-are-americans-love-languages) que ordenaran los cinco, el 38 % puso el tiempo de calidad en primer lugar, más que cualquier otro. Así que, si no sabes qué quiere alguien, la atención plena es una buena primera apuesta. Pero es una encuesta, no una regla: la mayoría, el 62 %, puso otro en primer lugar.",
        },
        { type: "h2", text: "¿Tienen base científica los lenguajes del amor?" },
        {
          type: "p",
          text: "Menos de lo que su fama hace pensar. En 2024, tres especialistas en relaciones de pareja, Emily Impett, Haeyoung Gideon Park y Amy Muise, publicaron en la revista *Current Directions in Psychological Science* una revisión de los estudios que había. Como contó [la Universidad de Toronto](https://www.utoronto.ca/news/little-evidence-linking-five-love-languages-healthy-relationships-researchers-say), encontraron poco apoyo a la idea de que cada persona tenga un lenguaje principal, de que sean exactamente cinco o de que las parejas cuyos lenguajes coinciden sean más felices.",
        },
        {
          type: "p",
          text: "Dos de sus conclusiones sirven en el día a día. Los tests te obligan a elegir entre cosas que querrías tener a la vez, y cuando se puntúa cada lenguaje por separado, la gente da mucha importancia a los cinco. Y proponen ver el amor como una dieta equilibrada más que como un idioma: todos necesitamos un poco de todo, además de cosas que los cinco dejan fuera, como el apoyo emocional o respaldar los propios objetivos de tu pareja.",
        },
        {
          type: "p",
          text: "Así que usa los cinco como un vocabulario, no como un diagnóstico. Te dan palabras para lo que quieres y una excusa para preguntar qué quiere la otra persona. Lo que ayuda es preguntar.",
        },
        { type: "h2", text: "Un regalo en cada lenguaje del amor" },
        {
          type: "p",
          text: "Cuando sepas el suyo, puedes hacerle algo en ese lenguaje. Un [regalo digital](/gifts) de Ethos se abre en su móvil con tus fotos y tus palabras, así que vale para un cumpleaños, un aniversario o [porque sí](/occasions/just-because). Cada lenguaje tiene una plantilla que le va: tienes tres aquí abajo, y para los otros dos, [Rasca y gana](/templates/scratch-card) puede esconder una lista de tareas que harás por esa persona (actos de servicio) y [XOXO](/templates/xoxo) es un sobre sellado con un beso de pintalabios (contacto físico). La carta es gratis como nota corta (hasta 500 caracteres, sin fotos); la carta entera y las demás se desbloquean con un pago único ([mira los precios](/pricing)), y todas las plantillas tienen una demo gratis.",
        },
        {
          type: "template",
          slug: "the-letter",
          note: "Para las palabras de afirmación. Con un toque rompe el sello de lacre, la carta se despliega sobre un escritorio a la luz de una vela, tus palabras aparecen escritas a mano y tus fotos caen como polaroids. Una versión corta, de hasta 500 caracteres y sin las fotos, es gratis; la carta entera con fotos se paga una sola vez.",
        },
        {
          type: "template",
          slug: "picnic",
          note: "Para el tiempo de calidad. Una cesta de pícnic sobre una manta de cuadros: cada toque saca una cosa, cada una con una frase tuya, y lo último que sale es una nota doblada con tu carta. Si has planeado una cita, también sale de la cesta.",
        },
        {
          type: "template",
          slug: "bouquet",
          note: "Para recibir regalos. Creas un ramo tallo a tallo, en los colores que elijas, y lo ve formarse flor a flor antes de abrir la tarjeta escondida dentro. Nunca se marchita.",
        },
      ],
      faq: [
        {
          q: "¿Cuáles son los cinco lenguajes del amor?",
          a: "Palabras de afirmación (cumplidos, gracias y ánimos), tiempo de calidad (atención plena), recibir regalos (cosas que demuestran que pensabas en esa persona), actos de servicio (hacer cosas que le facilitan la vida) y contacto físico (abrazos, ir de la mano, cercanía). Gary Chapman los describió en su libro de 1992. Casi todo el mundo valora los cinco; su lenguaje del amor es el que más nota y el que más echa de menos cuando falta.",
        },
        {
          q: "¿Cuántos lenguajes del amor hay? ¿Son 5 o 7?",
          a: "Cinco, en el modelo original de Gary Chapman, que es el que casi todo el mundo tiene en mente. Los siete que quizá hayas visto son «estilos de amor» que publicó en 2022 Truity, una empresa de tests de personalidad: actividad, aprecio, emocional, económico, intelectual, físico y práctico. Casi todos se solapan con los cinco de Chapman; el emocional y el intelectual son los nuevos. Es otro modelo, no una nueva edición del libro.",
        },
        {
          q: "¿Cuál es el lenguaje del amor más común?",
          a: "El tiempo de calidad. En una encuesta de YouGov de 2022 a adultos estadounidenses, el 38 % lo puso en primer lugar, más que cualquier otro. Eso convierte la atención plena en una buena primera apuesta cuando no sabes el lenguaje de alguien, pero solo es una apuesta: pregúntale, o haced cada uno un test y comparad.",
        },
        {
          q: "¿Cuál es el lenguaje del amor de la mayoría de los hombres?",
          a: "No hay uno. Nada fiable demuestra que los hombres compartan un lenguaje del amor, igual que no lo comparten las mujeres. Para saber el suyo, fíjate en lo que hace por ti sin que se lo pidas, escucha de qué se queja y mira qué te pide. O pregúntale sin rodeos qué es lo que más le hace sentirse querido.",
        },
        {
          q: "¿Se puede tener más de un lenguaje del amor?",
          a: "Sí, y es lo más habitual. Chapman habla de un lenguaje principal y uno secundario, y los estudios ven que la gente da importancia a los cinco cuando se le pregunta por cada uno por separado. Si en un test te salen dos muy cerca, tómalos como un par y cuéntale los dos a tu pareja.",
        },
      ],
    },
  },
};
