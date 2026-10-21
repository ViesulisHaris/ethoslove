type L = { en: string; es: string };

// The Spanish never assumes who is playing: an adjective about "yo", "tú" or "nosotros" takes a
// gender in Spanish ("dormido/dormida", "juntos/juntas"), and half the couples reading it would be
// told the wrong one. So those lines are said another way ("un peligro", "contigo", "en pareja").
// The same goes for the question decks and the packs.

/** "How well do you know me?": each answers for themselves and guesses the other. Four options, no right answer. */
export type KnowQuestion = { id: string; prompt: L; options: [L, L, L, L] };
export const KNOW_QUESTIONS: KnowQuestion[] = [
  { id: "sunday", prompt: { en: "My perfect Sunday morning is…", es: "Mi domingo por la mañana perfecto es…" }, options: [{ en: "In bed until noon", es: "En la cama hasta las doce" }, { en: "A long walk", es: "Un paseo largo" }, { en: "Brunch, somewhere new", es: "Brunch en un sitio nuevo" }, { en: "Tidying. Yes, really", es: "Ordenar. Sí, de verdad" }] },
  { id: "fire", prompt: { en: "The thing I'd grab in a fire (after you):", es: "Lo que salvaría de un incendio (después de ti):" }, options: [{ en: "My phone", es: "El móvil" }, { en: "Old photos", es: "Las fotos antiguas" }, { en: "Something you gave me", es: "Algo que me regalaste" }, { en: "The dog. Obviously", es: "El perro. Obviamente" }] },
  { id: "fight", prompt: { en: "When we argue, I…", es: "Cuando discutimos, yo…" }, options: [{ en: "Go quiet", es: "Me quedo en silencio" }, { en: "Talk it out right then", es: "Lo hablo en el momento" }, { en: "Make a joke too soon", es: "Hago una broma demasiado pronto" }, { en: "Need a walk first", es: "Necesito un paseo antes" }] },
  { id: "spend", prompt: { en: "Give me €100 and I'll spend it on…", es: "Dame 100 € y me los gasto en…" }, options: [{ en: "Dinner for us", es: "Una cena en pareja" }, { en: "Something for the flat", es: "Algo para casa" }, { en: "Clothes", es: "Ropa" }, { en: "Nothing. It goes in the pot", es: "Nada. Va al bote" }] },
  { id: "holiday", prompt: { en: "My dream week off:", es: "Mi semana libre soñada:" }, options: [{ en: "A beach and a book", es: "Una playa y un libro" }, { en: "A city I've never seen", es: "Una ciudad que no conozco" }, { en: "Mountains, no signal", es: "Montaña, sin cobertura" }, { en: "Home, with nothing planned", es: "En casa, sin planes" }] },
  { id: "secret", prompt: { en: "My secret talent is…", es: "Mi talento secreto es…" }, options: [{ en: "Cooking one perfect dish", es: "Cocinar un plato perfecto" }, { en: "Remembering everything", es: "Acordarme de todo" }, { en: "Parking", es: "Aparcar" }, { en: "Falling asleep anywhere", es: "Dormirme en cualquier sitio" }] },
  { id: "cry", prompt: { en: "What makes me cry at a film:", es: "Lo que me hace llorar en una peli:" }, options: [{ en: "Old people in love", es: "Ancianos enamorados" }, { en: "Animals", es: "Los animales" }, { en: "Anyone reunited at an airport", es: "Cualquier reencuentro en un aeropuerto" }, { en: "Nothing. I'm made of stone", es: "Nada. Soy de piedra" }] },
  { id: "morning", prompt: { en: "Before coffee, I am…", es: "Antes del café, soy…" }, options: [{ en: "Dangerous", es: "Un peligro" }, { en: "Fine, actually", es: "Normal, la verdad" }, { en: "Asleep, technically", es: "Técnicamente, durmiendo" }, { en: "Already talking", es: "Ya hablando" }] },
  { id: "gift", prompt: { en: "The gift that would make me cry:", es: "El regalo que me haría llorar:" }, options: [{ en: "A letter", es: "Una carta" }, { en: "A trip", es: "Un viaje" }, { en: "Something handmade", es: "Algo hecho a mano" }, { en: "A surprise party", es: "Una fiesta sorpresa" }] },
  { id: "kids", prompt: { en: "If we got a pet tomorrow it'd be…", es: "Si mañana tuviéramos una mascota, sería…" }, options: [{ en: "A dog", es: "Un perro" }, { en: "A cat", es: "Un gato" }, { en: "Something odd. A lizard", es: "Algo raro. Un lagarto" }, { en: "A plant. Start small", es: "Una planta. Empecemos poco a poco" }] },
];

/** "Would you rather": both pick in secret, then compare. */
export type RatherPair = { id: string; a: L; b: L };
export const RATHER_PAIRS: RatherPair[] = [
  { id: "beach", a: { en: "A week on a beach", es: "Una semana en la playa" }, b: { en: "A week in a city", es: "Una semana en una ciudad" } },
  { id: "cook", a: { en: "Cook every night", es: "Cocinar cada noche" }, b: { en: "Wash up every night", es: "Fregar cada noche" } },
  { id: "early", a: { en: "Sunrise together", es: "Ver amanecer contigo" }, b: { en: "Stay up till 3am together", es: "Trasnochar contigo hasta las 3" } },
  { id: "know", a: { en: "Know every song lyric", es: "Saber todas las letras" }, b: { en: "Know every film quote", es: "Saber todas las frases de películas" } },
  { id: "home", a: { en: "A tiny flat in the centre", es: "Un piso diminuto en el centro" }, b: { en: "A big house an hour out", es: "Una casa grande a una hora" } },
  { id: "party", a: { en: "Dinner for two", es: "Cena para dos" }, b: { en: "Dinner for ten", es: "Cena para diez" } },
  { id: "phone", a: { en: "No phone for a weekend", es: "Sin móvil un fin de semana" }, b: { en: "No talking for a weekend", es: "Sin hablar un fin de semana" } },
  { id: "dance", a: { en: "Dance in the kitchen", es: "Bailar en la cocina" }, b: { en: "Dance in a club", es: "Bailar en una discoteca" } },
  { id: "past", a: { en: "Meet each other at 16", es: "Habernos conocido a los 16" }, b: { en: "Meet each other at 60", es: "Conocernos a los 60" } },
  { id: "pet", a: { en: "A dog that talks", es: "Un perro que habla" }, b: { en: "A cat that cleans", es: "Un gato que limpia" } },
  { id: "rain", a: { en: "Rain all holiday, good food", es: "Lluvia todas las vacaciones, buena comida" }, b: { en: "Sun all holiday, bad food", es: "Sol todas las vacaciones, mala comida" } },
  { id: "surprise", a: { en: "Plan every date", es: "Planear cada cita" }, b: { en: "Be surprised every time", es: "Que me sorprendan siempre" } },
  { id: "old", a: { en: "Grow old by the sea", es: "Envejecer junto al mar" }, b: { en: "Grow old in the mountains", es: "Envejecer en la montaña" } },
  { id: "karaoke", a: { en: "Karaoke, sober", es: "Karaoke, sin una gota de alcohol" }, b: { en: "Speech at a wedding, sober", es: "Discurso en una boda, sin una gota de alcohol" } },
  { id: "text", a: { en: "Read each other's texts", es: "Leernos los mensajes" }, b: { en: "Read each other's search history", es: "Leernos el historial de búsqueda" } },
  // The dramatic ones (21 Oct 2026): exes, best friends, secrets and lies, the pairs that start an argument
  // worth screenshotting. Neither side is the obvious answer, so nobody gets off easy.
  { id: "ex-bff", a: { en: "Their ex becomes your best friend", es: "Que su ex se vuelva tu mejor amigo" }, b: { en: "Your ex becomes their best friend", es: "Que tu ex se vuelva su mejor amigo" } },
  { id: "dumped", a: { en: "Get dumped for your best friend", es: "Que te dejen por tu mejor amigo" }, b: { en: "Get dumped for their ex", es: "Que te dejen por su ex" } },
  { id: "nearly", a: { en: "Find out they nearly ended it last month", es: "Descubrir que casi lo deja el mes pasado" }, b: { en: "Find out they nearly kissed someone last month", es: "Descubrir que casi besa a alguien el mes pasado" } },
  { id: "keep", a: { en: "Keep your partner, lose your best friend", es: "Quedarte con tu pareja y perder a tu mejor amigo" }, b: { en: "Keep your best friend, lose your partner", es: "Quedarte con tu mejor amigo y perder a tu pareja" } },
  { id: "deepest-secret", a: { en: "They told their friends your deepest secret", es: "Que cuente tu mayor secreto a sus amigos" }, b: { en: "They told your ex your deepest secret", es: "Que le cuente tu mayor secreto a tu ex" } },
  { id: "hates", a: { en: "Your best friend hates your partner", es: "Que tu mejor amigo odie a tu pareja" }, b: { en: "Their best friend hates you", es: "Que su mejor amigo te odie" } },
  { id: "group-chat", a: { en: "Their group chat reads your fight texts", es: "Que su grupo lea vuestra discusión" }, b: { en: "They read what you told your friends", es: "Que lea lo que contaste a tus amigos" } },
  { id: "checks", a: { en: "They check your phone every night", es: "Que te revise el móvil cada noche" }, b: { en: "They delete their chats every night", es: "Que borre sus chats cada noche" } },
  { id: "app", a: { en: "Their dating app is still active", es: "Que siga con la app de citas activa" }, b: { en: "They keep a folder of their ex's photos", es: "Que guarde una carpeta con fotos de su ex" } },
  { id: "ex-friends", a: { en: "They stay friends with their ex", es: "Que siga siendo amigo de su ex" }, b: { en: "They become friends with your ex", es: "Que se haga amigo de tu ex" } },
  { id: "ex-birthday", a: { en: "They like their ex's new post", es: "Que le dé like a la última foto de su ex" }, b: { en: "They text their ex happy birthday", es: "Que felicite a su ex por su cumpleaños" } },
  { id: "bestie", a: { en: "Their best friend is their ex", es: "Que su mejor amigo sea su ex" }, b: { en: "Their best friend has a crush on them", es: "Que su mejor amigo esté colado por tu pareja" } },
  { id: "next-door", a: { en: "Their ex moves in next door", es: "Que su ex se mude al lado" }, b: { en: "Their ex starts working with them", es: "Que su ex entre a trabajar en su empresa" } },
  { id: "hoodie", a: { en: "They still have their ex's number", es: "Que siga teniendo el número de su ex" }, b: { en: "They still wear their ex's hoodie", es: "Que siga poniéndose la sudadera de su ex" } },
  { id: "first-date", a: { en: "Find out what they thought of you on your first date", es: "Saber qué pensó de ti en vuestra primera cita" }, b: { en: "Find out who they were texting on your first date", es: "Saber a quién escribía en vuestra primera cita" } },
  { id: "dms", a: { en: "Your ex slides into their DMs", es: "Que tu ex le escriba por privado" }, b: { en: "Their ex slides into yours", es: "Que su ex te escriba por privado a ti" } },
  { id: "double", a: { en: "A double date with their ex", es: "Una cita doble con su ex" }, b: { en: "A double date with your ex", es: "Una cita doble con tu ex" } },
  { id: "old-texts", a: { en: "They find your old texts with your ex", es: "Que encuentre tus mensajes viejos con tu ex" }, b: { en: "You find their old texts with their ex", es: "Encontrar sus mensajes viejos con su ex" } },
  { id: "settled", a: { en: "Be the one they settled for", es: "Ser con quien se conformó" }, b: { en: "Be the one that got away", es: "Ser el amor que se le escapó" } },
  { id: "disapprove", a: { en: "Date someone your friends hate", es: "Salir con alguien que tus amigos odian" }, b: { en: "Date someone your family hates", es: "Salir con alguien que tu familia odia" } },
  { id: "mum", a: { en: "Their mum hates you", es: "Que su madre te odie" }, b: { en: "Your mum hates them", es: "Que tu madre odie a tu pareja" } },
  { id: "out-loud", a: { en: "They read your diary", es: "Que lea tu diario" }, b: { en: "They read your texts out loud to their friends", es: "Que lea tus mensajes en voz alta a sus amigos" } },
  { id: "lie", a: { en: "They lie about where they were", es: "Que mienta sobre dónde estaba" }, b: { en: "They lie about who they were with", es: "Que mienta sobre con quién estaba" } },
  { id: "hidden", a: { en: "They hide you from their family", es: "Que te esconda de su familia" }, b: { en: "They hide you on social media", es: "Que te esconda en redes sociales" } },
  { id: "boss", a: { en: "Their ex becomes your boss", es: "Que su ex sea tu jefe" }, b: { en: "Your ex becomes their boss", es: "Que tu ex sea su jefe" } },
  { id: "crush", a: { en: "They had a crush on your sister", es: "Que le gustara tu hermana" }, b: { en: "They had a crush on your best friend", es: "Que le gustara tu mejor amiga" } },
  { id: "wedding", a: { en: "Go to their ex's wedding", es: "Ir a la boda de su ex" }, b: { en: "Their ex comes to yours", es: "Que su ex venga a la vuestra" } },
  { id: "secret-account", a: { en: "Find out they have a secret account", es: "Descubrir que tiene una cuenta secreta" }, b: { en: "Find out you're not on their close friends", es: "Descubrir que no estás en sus mejores amigos" } },
  { id: "talk", a: { en: "They text you “we need to talk”", es: "Que te escriba «tenemos que hablar»" }, b: { en: "They don't text you for a whole day", es: "Que no te escriba en todo el día" } },
  { id: "2am", a: { en: "Their ex texts them at 2am", es: "Que su ex le escriba a las 2 de la mañana" }, b: { en: "They text their ex at 2am", es: "Que escriba a su ex a las 2 de la mañana" } },
];

/** Truth or dare, the soft edition: nothing anybody would regret in the morning. */
export const TRUTHS: L[] = [
  { en: "What did you think the first time you saw me?", es: "¿Qué pensaste la primera vez que me viste?" },
  { en: "Which of my habits do you secretly find adorable?", es: "¿Cuál de mis manías te parece adorable en secreto?" },
  { en: "What's a compliment you've never said out loud?", es: "¿Qué cumplido nunca me has dicho en voz alta?" },
  { en: "When did you last think about me at work?", es: "¿Cuándo pensaste en mí por última vez en el trabajo?" },
  { en: "What's the one thing I do better than anyone?", es: "¿Qué hago yo mejor que nadie?" },
  { en: "What would you cook for me if I were ill?", es: "¿Qué me cocinarías si me encontrara mal?" },
  { en: "Which photo of us is your favourite, and why?", es: "¿Qué foto nuestra es tu favorita y por qué?" },
  { en: "What's a small thing I did that you still think about?", es: "¿Qué cosa pequeña hice que aún recuerdas?" },
  { en: "Describe our first kiss in three words.", es: "Describe nuestro primer beso en tres palabras." },
  { en: "What song is us, and don't say the obvious one.", es: "¿Qué canción es la nuestra? Y no digas la obvia." },
  { en: "What are you most looking forward to with me?", es: "¿Qué es lo que más ganas tienes de vivir conmigo?" },
  { en: "What's something you've never told anyone but me?", es: "¿Qué es algo que nunca le has contado a nadie más que a mí?" },
];
export const DARES: L[] = [
  { en: "Give a 30-second speech about why I'm great. Standing up.", es: "Da un discurso de 30 segundos sobre por qué soy genial. De pie." },
  { en: "Do your best impression of me answering the phone.", es: "Haz tu mejor imitación de mí contestando el teléfono." },
  { en: "Slow dance with me for one full song. No phones.", es: "Baila lento conmigo una canción entera. Sin móviles." },
  { en: "Write me a haiku. Right now. Out loud.", es: "Escríbeme un haiku. Ahora mismo. En voz alta." },
  { en: "Feed me a bite of something with your eyes closed.", es: "Dame de comer un bocado de algo con los ojos cerrados." },
  { en: "Tell me the story of how we met as a nature documentary.", es: "Cuenta cómo nos conocimos como si fuera un documental de naturaleza." },
  { en: "Hold my hand and say nothing for one minute.", es: "Cógeme la mano y no digas nada durante un minuto." },
  { en: "Sing the chorus of the first song you think of. Badly is fine.", es: "Canta el estribillo de la primera canción que se te ocurra. Mal está bien." },
  { en: "Plan our next date out loud, in one breath.", es: "Planea nuestra próxima cita en voz alta, de un tirón." },
  { en: "Let me choose your outfit for tomorrow.", es: "Deja que elija tu ropa de mañana." },
  { en: "Say three things you love about me, in an accent.", es: "Di tres cosas que te encantan de mí, con acento." },
  { en: "Kiss me like it's the airport.", es: "Bésame como si fuera el aeropuerto." },
];

/** Dishes roulette: the chores a wheel can settle. */
export const CHORES: L[] = [
  { en: "cooks tonight", es: "cocina esta noche" },
  { en: "washes up", es: "friega" },
  { en: "picks the film", es: "elige la peli" },
  { en: "makes the tea", es: "hace el té" },
  { en: "gets up first tomorrow", es: "se levanta primero mañana" },
  { en: "books the next date", es: "reserva la próxima cita" },
  { en: "takes the bins out", es: "saca la basura" },
  { en: "chooses the music", es: "elige la música" },
];
