import type { KnowQuestion, RatherPair } from "./content";
import type { PackId } from "./packs";

type L = { en: string; es: string };

/**
 * What is inside each pack, per game it deals into. Only the server imports this (pack-actions.ts
 * hands a pack to its owner); the shelf's names, blurbs and samples are in packs.ts. Written for
 * this, like the free decks, and in the same voice: short, specific, answerable on a sofa.
 */
export type PackCards = {
  /** Question cards: read one out, both answer. */
  deck?: L[];
  /** "How well do you know me?": four answers, no right one. */
  know?: KnowQuestion[];
  /** "Would you rather": both pick in secret. */
  rather?: RatherPair[];
  /** Truth or dare, both decks together. */
  truths?: L[];
  dares?: L[];
};

/* ------------------------------------------------------------------ after a year */

const DEEP_DECK: L[] = [
  { en: "What's a habit of mine you've quietly adopted?", es: "¿Qué costumbre mía has adoptado sin darte cuenta?" },
  { en: "What have you changed your mind about since we met?", es: "¿En qué has cambiado de opinión desde que nos conocimos?" },
  { en: "When we argue about the dishes, what are we really arguing about?", es: "Cuando discutimos por los platos, ¿por qué discutimos en realidad?" },
  { en: "What did you think being in a relationship would be like, and what is it actually like?", es: "¿Cómo creías que sería tener pareja y cómo es en realidad?" },
  { en: "What's something I do that still surprises you?", es: "¿Qué hago que todavía te sorprende?" },
  { en: "What's a worry you carry around that I might not know about?", es: "¿Qué preocupación llevas encima que quizá yo no conozca?" },
  { en: "When do you feel most appreciated by me? And least?", es: "¿Cuándo sientes que más te valoro? ¿Y menos?" },
  { en: "What's something from your family you want us to keep, and something you'd leave behind?", es: "¿Qué costumbre de tu familia quieres que conservemos y cuál dejarías atrás?" },
  { en: "How can you tell I'm upset before I say a word?", es: "¿Cómo sabes que estoy mal antes de que diga nada?" },
  { en: "What's the kindest thing I've done for you that I've probably forgotten?", es: "¿Qué es lo más bonito que he hecho por ti y que seguramente ya he olvidado?" },
  { en: "If we could replay one argument, which one, and what would you say this time?", es: "Si pudiéramos repetir una discusión, ¿cuál sería y qué dirías esta vez?" },
  { en: "What does home mean to you now, compared with a year ago?", es: "¿Qué significa para ti «casa» ahora, comparado con hace un año?" },
  { en: "What's a dream you've stopped mentioning? Why did you stop?", es: "¿Qué sueño has dejado de mencionar? ¿Por qué?" },
  { en: "Which part of our routine would you protect at all costs?", es: "¿Qué parte de nuestra rutina protegerías a toda costa?" },
  { en: "What's one thing you'd like us to stop doing?", es: "¿Qué te gustaría que dejáramos de hacer?" },
  { en: "When have you been proudest to be with me?", es: "¿Cuándo te ha dado más orgullo estar conmigo?" },
  { en: "What's a question you've been scared to ask me?", es: "¿Qué pregunta te ha dado miedo hacerme?" },
  { en: "How do you want us to handle money when a month gets tight?", es: "¿Cómo quieres que llevemos el dinero cuando venga un mes difícil?" },
  { en: "What would you like us to learn together, from scratch?", es: "¿Qué te gustaría que aprendiéramos en pareja, desde cero?" },
  { en: "What would you tell the version of me from our first month?", es: "¿Qué le dirías a la versión de mí de nuestro primer mes?" },
  { en: "What's a small promise we could make each other tonight?", es: "¿Qué pequeña promesa podríamos hacernos esta noche?" },
  { en: "Honestly, how do you like to make up after a fight?", es: "Con sinceridad, ¿cómo te gusta hacer las paces después de una pelea?" },
  { en: "What do you do for us that you wish I noticed more?", es: "¿Qué haces por nuestra relación que te gustaría que yo notara más?" },
  { en: "Picture a Sunday morning ten years from now. Where are we?", es: "Imagina un domingo por la mañana dentro de diez años. ¿Dónde estamos?" },
  { en: "What's one thing about me you'd never want to change?", es: "¿Qué es lo que nunca querrías que cambiara de mí?" },
  { en: "What do you still find hard to ask me for?", es: "¿Qué te sigue costando pedirme?" },
  { en: "Which couple we know do you secretly admire, and what would you borrow from them?", es: "¿Qué pareja de las que conocemos admiras en secreto y qué le copiarías?" },
  { en: "What's the best thing this year has taught you about us?", es: "¿Qué es lo mejor que te ha enseñado este año sobre lo nuestro?" },
];

const DEEP_KNOW: KnowQuestion[] = [
  { id: "deep-recharge", prompt: { en: "After a hard week, what I actually need is…", es: "Después de una semana dura, lo que de verdad necesito es…" }, options: [{ en: "A night in with no plans", es: "Una noche en casa, sin planes" }, { en: "My friends and a loud table", es: "Mis amigos y una mesa ruidosa" }, { en: "A hug and no questions", es: "Un abrazo y ninguna pregunta" }, { en: "To move: a run, a swim, anything", es: "Moverme: correr, nadar, lo que sea" }] },
  { id: "deep-sorry", prompt: { en: "The apology that works on me:", es: "La disculpa que funciona conmigo:" }, options: [{ en: "Saying it properly, out loud", es: "Decirlo bien, en voz alta" }, { en: "A hug first, words later", es: "Primero un abrazo; las palabras, después" }, { en: "Fixing the thing", es: "Arreglar lo que pasó" }, { en: "Some time alone, then a coffee", es: "Un rato a solas y luego un café" }] },
  { id: "deep-loved", prompt: { en: "I feel most loved when you…", es: "Siento más tu cariño cuando…" }, options: [{ en: "Say it", es: "Me lo dices" }, { en: "Plan something for us", es: "Me preparas un plan" }, { en: "Take a job off my list", es: "Me quitas una tarea de encima" }, { en: "Just sit close", es: "Te sientas cerca, sin más" }] },
  { id: "deep-awake", prompt: { en: "What keeps me up at night:", es: "Lo que me quita el sueño:" }, options: [{ en: "Money", es: "El dinero" }, { en: "Work", es: "El trabajo" }, { en: "The people I love", es: "La gente a la que quiero" }, { en: "Nothing. I sleep like a log", es: "Nada. Duermo como un tronco" }] },
  { id: "deep-five", prompt: { en: "In five years, what I want most for us is…", es: "Dentro de cinco años, lo que más quiero para nuestra relación es…" }, options: [{ en: "A new city", es: "Una ciudad nueva" }, { en: "A bigger home", es: "Una casa más grande" }, { en: "More trips", es: "Más viajes" }, { en: "This, but calmer", es: "Esto mismo, pero con más calma" }] },
  { id: "deep-argue", prompt: { en: "In an argument, what I really want is…", es: "En una discusión, lo que de verdad quiero es…" }, options: [{ en: "To be understood", es: "Que me entiendas" }, { en: "To be right. A little", es: "Tener razón. Un poco" }, { en: "For it to be over", es: "Que se acabe ya" }, { en: "A plan so it doesn't happen again", es: "Un plan para que no vuelva a pasar" }] },
  { id: "deep-quiet", prompt: { en: "When I go quiet, it usually means…", es: "Cuando me quedo en silencio, suele ser porque…" }, options: [{ en: "I'm tired, that's all", es: "Es cansancio, nada más" }, { en: "Something's bothering me and I'm working up to it", es: "Algo me molesta y me estoy armando de valor para decirlo" }, { en: "I'm still at work, in my head", es: "Sigo con la cabeza en el trabajo" }, { en: "Nothing at all. Honestly", es: "Nada de nada. De verdad" }] },
  { id: "deep-proud", prompt: { en: "What I'm proudest of this year:", es: "De lo que siento más orgullo este año:" }, options: [{ en: "Something at work", es: "De algo del trabajo" }, { en: "Us", es: "De lo nuestro" }, { en: "A habit I finally kept", es: "De un hábito que por fin he mantenido" }, { en: "Just getting through it", es: "De haberlo sacado adelante" }] },
  { id: "deep-holidays", prompt: { en: "The holidays, ideally:", es: "Las fiestas, idealmente:" }, options: [{ en: "With my family", es: "Con mi familia" }, { en: "With yours", es: "Con la tuya" }, { en: "Half and half", es: "Mitad y mitad" }, { en: "Just us, somewhere far away", es: "Solo tú y yo, en algún sitio lejos" }] },
  { id: "deep-windfall", prompt: { en: "Give me an unexpected €1,000 and it goes on…", es: "Si me cayeran 1000 € del cielo, serían para…" }, options: [{ en: "Savings. Obviously", es: "El ahorro. Obviamente" }, { en: "A trip for two", es: "Un viaje en pareja" }, { en: "Something for home", es: "Algo para casa" }, { en: "Clearing a debt", es: "Quitarme una deuda de encima" }] },
  { id: "deep-ill", prompt: { en: "When I'm ill, I want…", es: "Cuando me encuentro mal, quiero…" }, options: [{ en: "Soup and silence", es: "Sopa y silencio" }, { en: "Company and films", es: "Compañía y pelis" }, { en: "To be left completely alone", es: "Que me dejen completamente en paz" }, { en: "Sympathy. Lots of it", es: "Mimos. Muchos" }] },
  { id: "deep-change", prompt: { en: "If I could change one thing about our life right now:", es: "Si pudiera cambiar una cosa de nuestra vida ahora mismo:" }, options: [{ en: "More time together", es: "Pasar más tiempo contigo" }, { en: "Less work", es: "Menos trabajo" }, { en: "Where we live", es: "Dónde vivimos" }, { en: "Nothing, honestly", es: "Nada, la verdad" }] },
];

/* ------------------------------------------------------------------ miles apart */

const DISTANCE_DECK: L[] = [
  { en: "What time is it where you are, and what would I be doing if I were there?", es: "¿Qué hora es donde estás y qué estaría haciendo yo si estuviera ahí?" },
  { en: "What's the best call we've ever had? What made it so good?", es: "¿Cuál ha sido nuestra mejor llamada? ¿Qué la hizo tan buena?" },
  { en: "What do you do in the first hour after we hang up?", es: "¿Qué haces en la primera hora después de colgar?" },
  { en: "Which is harder: the goodbye at the airport, or the first night alone after it?", es: "¿Qué es más duro: la despedida en el aeropuerto o la primera noche a solas después?" },
  { en: "What have you started doing because it reminds you of me?", es: "¿Qué has empezado a hacer porque te recuerda a mí?" },
  { en: "If you could teleport here for one hour tonight, what would we do?", es: "Si pudieras teletransportarte aquí una hora esta noche, ¿qué haríamos?" },
  { en: "What do you miss that's so small you'd feel silly saying it?", es: "¿Qué echas de menos que es tan pequeño que te da vergüenza decirlo?" },
  { en: "One of us is having an awful day and the other is asleep. What's the rule?", es: "A una persona le toca un día horrible y la otra está durmiendo. ¿Cuál es la norma?" },
  { en: "What should the next visit have that the last one didn't?", es: "¿Qué debería tener la próxima visita que no tuvo la última?" },
  { en: "Who in your life doesn't quite get us, and what would you like to tell them?", es: "¿Quién de tu entorno no acaba de entendernos y qué te gustaría decirle?" },
  { en: "Which place where you live do you most want to show me?", es: "¿Qué sitio de donde vives es el que más ganas tienes de enseñarme?" },
  { en: "What's the longest we've gone without talking, and how did you take it?", es: "¿Cuánto es lo máximo que hemos estado sin hablar y cómo lo llevaste?" },
  { en: "What do you wish I asked you about more on our calls?", es: "¿Sobre qué te gustaría que te preguntara más en nuestras llamadas?" },
  { en: "What should we watch, read or cook at the same time this week?", es: "¿Qué podríamos ver, leer o cocinar a la vez esta semana?" },
  { en: "When did you want to message me this week, and didn't?", es: "¿Cuándo quisiste escribirme esta semana y no lo hiciste?" },
  { en: "Describe the day the distance ends. Be specific: what are we eating?", es: "Describe el día en que se acaba la distancia. Con detalles: ¿qué comemos?" },
  { en: "When the distance ends, who moves, and what will they miss most?", es: "Cuando se acabe la distancia, ¿quién se muda y qué echará más de menos?" },
  { en: "What does trust look like when we can't see each other's days?", es: "¿Cómo es la confianza cuando no compartimos el día a día?" },
  { en: "What tradition could we start that works across two time zones?", es: "¿Qué tradición podríamos empezar que funcione con dos husos horarios?" },
  { en: "What's in the last photo you took, and why did you take it?", es: "¿Qué sale en la última foto que hiciste y por qué la hiciste?" },
  { en: "What have you learned about me that you'd never have learned if we lived together?", es: "¿Qué has aprendido de mí que nunca habrías descubierto si viviéramos en la misma casa?" },
  { en: "What should the letter I send you next month say?", es: "¿Qué debería decir la carta que te mande el mes que viene?" },
  { en: "Which of my messages have you read more than once?", es: "¿Qué mensaje mío has leído más de una vez?" },
  { en: "What do people get wrong when they hear we're long distance?", es: "¿Qué es lo que la gente no entiende cuando se entera de que estamos a distancia?" },
  { en: "What would you do differently at our next goodbye?", es: "¿Qué harías distinto en nuestra próxima despedida?" },
  { en: "What's a small thing I could do from here that would make your week?", es: "¿Qué cosa pequeña podría hacer desde aquí que te alegrara la semana?" },
];

const DISTANCE_RATHER: RatherPair[] = [
  { id: "far-calls", a: { en: "A long call once a week", es: "Una llamada larga a la semana" }, b: { en: "Ten minutes every day", es: "Diez minutos cada día" } },
  { id: "far-visits", a: { en: "A long visit twice a year", es: "Una visita larga dos veces al año" }, b: { en: "A weekend every month", es: "Un fin de semana cada mes" } },
  { id: "far-post", a: { en: "A handwritten letter every month", es: "Una carta a mano cada mes" }, b: { en: "A voice note every morning", es: "Un audio cada mañana" } },
  { id: "far-zones", a: { en: "Same time zone, different countries", es: "Mismo huso horario, distinto país" }, b: { en: "Same country, opposite shifts", es: "Mismo país, turnos opuestos" } },
  { id: "far-film", a: { en: "Watch a film together on a laggy call", es: "Ver una peli a la vez con la llamada a trompicones" }, b: { en: "Watch it apart and talk about it after", es: "Verla por separado y comentarla después" } },
  { id: "far-sleep", a: { en: "Fall asleep on the call", es: "Dormirnos con la llamada puesta" }, b: { en: "Say goodnight properly and hang up", es: "Darnos las buenas noches como es debido y colgar" } },
  { id: "far-move", a: { en: "Be the one who moves", es: "Ser quien se muda" }, b: { en: "Be the one who waits", es: "Ser quien espera" } },
  { id: "far-surprise", a: { en: "A surprise visit", es: "Una visita sorpresa" }, b: { en: "A visit you can count down to for months", es: "Una visita con meses de cuenta atrás" } },
  { id: "far-hug", a: { en: "The hug in arrivals, in front of everyone", es: "El abrazo en llegadas, delante de todo el mundo" }, b: { en: "The hug at the front door, no audience", es: "El abrazo en la puerta de casa, sin público" } },
  { id: "far-parcel", a: { en: "A parcel of snacks from their side of the map", es: "Un paquete de snacks de su lado del mapa" }, b: { en: "A playlist that took them a week", es: "Una lista de canciones que le llevó una semana" } },
  { id: "far-texts", a: { en: "Good-morning texts that land at 3am", es: "Mensajes de buenos días que llegan a las 3 de la madrugada" }, b: { en: "No texts until you're both awake", es: "Nada de mensajes hasta que hayamos despertado" } },
  { id: "far-together", a: { en: "Play a game on two phones tonight", es: "Jugar a algo con dos móviles esta noche" }, b: { en: "Read the same book, a chapter a night", es: "Leer el mismo libro, un capítulo por noche" } },
  { id: "far-date", a: { en: "Know the exact date we next meet", es: "Saber la fecha exacta del próximo reencuentro" }, b: { en: "Not know it, but it's sooner than you think", es: "No saberla, pero que sea antes de lo que crees" } },
  { id: "far-end", a: { en: "End the distance in a year, in a city neither of us knows", es: "Acabar con la distancia en un año, en una ciudad que no conocemos" }, b: { en: "End it in three years, in one of our home towns", es: "Acabar con ella en tres años, en una de nuestras ciudades" } },
];

/* ------------------------------------------------------------------ after dark */

// Flirty, never explicit: kissing and closeness in general terms, no acts, no bodies. The tests hold
// every card here against a list of words that would cross that line, in both languages.
const SPICY_TRUTHS: L[] = [
  { en: "When exactly did you first want to kiss me?", es: "¿En qué momento exacto te entraron ganas de besarme por primera vez?" },
  { en: "What do I wear that you find unfairly distracting?", es: "¿Qué ropa mía te distrae tanto que no es justo?" },
  { en: "What's the most attractive thing I do without realising?", es: "¿Qué es lo más atractivo que hago sin darme cuenta?" },
  { en: "Describe our best kiss so far. Take your time.", es: "Describe nuestro mejor beso hasta ahora. Sin prisa." },
  { en: "What's a compliment about me you've been saving?", es: "¿Qué piropo sobre mí te has estado guardando?" },
  { en: "Where's the most inconvenient place you've caught yourself thinking about me?", es: "¿Cuál es el sitio más inoportuno en el que te has pillado pensando en mí?" },
  { en: "What could I whisper that would ruin your concentration for a whole day?", es: "¿Qué podría susurrarte que te arruinara la concentración un día entero?" },
  { en: "What's the flirtiest message you almost sent me, and didn't?", es: "¿Cuál es el mensaje más atrevido que estuviste a punto de mandarme y no mandaste?" },
  { en: "When am I at my most irresistible?", es: "¿Cuándo estoy más irresistible?" },
  { en: "Describe a perfect date that ends at home. Stop at the front door.", es: "Describe una cita perfecta que acaba en casa. Hasta la puerta, ni un paso más." },
  { en: "Which song would you put on to set the mood?", es: "¿Qué canción pondrías para crear ambiente?" },
  { en: "Which look of mine can you read from across a room?", es: "¿Qué mirada mía sabes leer desde la otra punta de una sala?" },
  { en: "What's something romantic you've always wanted to try and never said?", es: "¿Qué cosa romántica siempre has querido probar y nunca lo has dicho?" },
];

const SPICY_DARES: L[] = [
  { en: "Kiss me like it's the last scene of the film.", es: "Bésame como en la última escena de la peli." },
  { en: "Whisper something you like about me, close enough to tickle.", es: "Susúrrame algo que te guste de mí, tan cerca que haga cosquillas." },
  { en: "Dim the lights and give me one slow song. You choose it.", es: "Baja las luces y bailemos una canción lenta. Tú eliges cuál." },
  { en: "Look me in the eyes for thirty seconds. No laughing.", es: "Mírame a los ojos treinta segundos. Sin reírte." },
  { en: "Plan our next date night out loud, in your most seductive voice.", es: "Planea nuestra próxima cita en voz alta, con tu tono más seductor." },
  { en: "Write a one-line love note and hide it where I'll find it tomorrow.", es: "Escribe una nota de amor de una línea y escóndela donde la encuentre mañana." },
  { en: "Give me three kisses: one sweet, one silly, one that means business.", es: "Dame tres besos: uno tierno, uno tonto y uno que vaya en serio." },
  { en: "Send me a flirty text right now, even though I'm right here.", es: "Mándame un mensaje coqueto ahora mismo, aunque me tengas al lado." },
  { en: "Give me your best chat-up line. If it works, you get a kiss.", es: "Suéltame tu mejor frase para ligar. Si funciona, te ganas un beso." },
  { en: "Close your eyes and let me surprise you with a kiss. No peeking.", es: "Cierra los ojos y deja que te sorprenda con un beso. Sin mirar." },
  { en: "Tell me your favourite memory of us, in a whisper.", es: "Cuéntame en susurros tu recuerdo favorito de lo nuestro." },
  { en: "Sing me one line of a love song without looking away.", es: "Cántame un verso de una canción de amor sin dejar de mirarme." },
  { en: "Pull me close and tell me what you're thinking. The real version.", es: "Acércame a ti y dime lo que estás pensando. La versión de verdad." },
];

const SPICY_RATHER: RatherPair[] = [
  { id: "dark-kisses", a: { en: "One long kiss", es: "Un beso largo" }, b: { en: "A hundred quick ones", es: "Cien besos rápidos" } },
  { id: "dark-first", a: { en: "Always make the first move", es: "Dar siempre el primer paso" }, b: { en: "Always wait for them to make it", es: "Esperar siempre a que lo dé la otra persona" } },
  { id: "dark-dinner", a: { en: "A fancy dinner out that ends at home", es: "Una cena elegante fuera que acaba en casa" }, b: { en: "A night in that starts with candles", es: "Una noche en casa que empieza con velas" } },
  { id: "dark-texts", a: { en: "Flirty texts all day long", es: "Mensajes coquetos todo el día" }, b: { en: "One look across a crowded room", es: "Una sola mirada desde la otra punta de una sala llena" } },
  { id: "dark-shown", a: { en: "Be told I look irresistible", es: "Que me digan que estoy irresistible" }, b: { en: "Be shown it", es: "Que me lo demuestren" } },
  { id: "dark-lights", a: { en: "Lights on", es: "Con la luz encendida" }, b: { en: "Candlelight", es: "A la luz de las velas" } },
  { id: "dark-away", a: { en: "A weekend away with no plans", es: "Un fin de semana fuera sin planes" }, b: { en: "A night in with our phones off", es: "Una noche en casa con los móviles apagados" } },
  { id: "dark-ready", a: { en: "Get ready together", es: "Arreglarnos a la vez" }, b: { en: "Be surprised by what they're wearing", es: "Que me sorprenda con lo que lleva puesto" } },
  { id: "dark-bed", a: { en: "Breakfast in bed", es: "Desayuno en la cama" }, b: { en: "Dessert in bed", es: "Postre en la cama" } },
  { id: "dark-bath", a: { en: "A candlelit bath for two", es: "Un baño a la luz de las velas para dos" }, b: { en: "A blanket fort for two", es: "Un fuerte de mantas para dos" } },
  { id: "dark-hands", a: { en: "Hold hands everywhere we go", es: "Ir de la mano a todas partes" }, b: { en: "Save it all for when we're home", es: "Guardarlo todo para cuando estemos en casa" } },
  { id: "dark-letter", a: { en: "A love letter read aloud", es: "Una carta de amor leída en voz alta" }, b: { en: "A love letter hidden in my coat pocket", es: "Una carta de amor escondida en el bolsillo del abrigo" } },
  { id: "dark-rain", a: { en: "A kiss in the rain", es: "Un beso bajo la lluvia" }, b: { en: "A kiss at the top of a Ferris wheel", es: "Un beso en lo alto de una noria" } },
  { id: "dark-serenade", a: { en: "Be serenaded", es: "Que me den una serenata" }, b: { en: "Be written a poem", es: "Que me escriban un poema" } },
];

export const PACK_CARDS: Record<PackId, PackCards> = {
  deep: { deck: DEEP_DECK, know: DEEP_KNOW },
  distance: { deck: DISTANCE_DECK, rather: DISTANCE_RATHER },
  // The truths are questions both can answer too, so they are the pack's question deck as well.
  spicy: { deck: SPICY_TRUTHS, truths: SPICY_TRUTHS, dares: SPICY_DARES, rather: SPICY_RATHER },
};
