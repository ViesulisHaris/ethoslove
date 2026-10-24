type L = { en: string; es: string };
export type DeckId = "light" | "deep" | "apart";

/** Question cards for two: pass the phone, read it out, both answer. Written for this, not collected from anywhere. */
export const DECKS: Record<DeckId, { name: L; blurb: L; from: string; to: string; ink: string; cards: L[] }> = {
  light: {
    name: { en: "Light", es: "Ligeras" },
    blurb: { en: "Silly ones, for the sofa.", es: "De risa, para el sofá." },
    from: "#FFE3D3",
    to: "#F9C6D0",
    ink: "#8E2F4C",
    cards: [
      { en: "What's the most useless thing you're weirdly good at?", es: "¿Qué es lo más inútil que se te da rarísimamente bien?" },
      { en: "Which of my habits did you pretend to like at the start?", es: "¿Qué costumbre mía fingiste que te gustaba al principio?" },
      { en: "If we opened a café tomorrow, what would it be called and who does the washing up?", es: "Si mañana abriéramos una cafetería, ¿cómo se llamaría y quién friega?" },
      { en: "What's a hill you will die on that does not matter at all?", es: "¿Por qué tontería sin importancia discutirías hasta el final?" },
      { en: "Describe our first date as a film title.", es: "Describe nuestra primera cita como el título de una peli." },
      { en: "What food would you ban from the house if you could?", es: "¿Qué comida prohibirías en casa si pudieras?" },
      { en: "Which of us would survive longer in the woods, and why is it me?", es: "¿Quién aguantaría más en el bosque, y por qué soy yo?" },
      { en: "What's the worst gift you've ever had to look pleased about?", es: "¿Cuál es el peor regalo por el que has tenido que poner buena cara?" },
      { en: "You get one do-over of a day we've had. Which day?", es: "Puedes repetir un día de los que hemos vivido. ¿Cuál?" },
      { en: "What would your villain origin story be?", es: "¿Qué te haría pasarte al lado oscuro?" },
      { en: "What do I do that makes you laugh when I'm not trying to be funny?", es: "¿Qué hago que te hace reír cuando no intento hacer gracia?" },
      { en: "Pick a theme song for each of us walking into a room.", es: "Elige nuestras canciones de entrada: la que suena cuando cada cual entra en una sala." },
      { en: "What's the most expensive thing you've ever broken?", es: "¿Qué es lo más caro que has roto nunca?" },
      { en: "If our life was a sitcom, what would it be called?", es: "Si nuestra vida fuera una serie de humor, ¿cómo se llamaría?" },
      { en: "Which celebrity would you trust to plan our wedding?", es: "¿A qué famoso dejarías organizar nuestra boda?" },
      { en: "What's a food you pretend to like for my sake?", es: "¿Qué comida finges que te gusta por mí?" },
      { en: "What would you name our boat?", es: "¿Cómo llamarías a nuestro barco?" },
      { en: "Which of my friends would last longest in a horror film?", es: "¿Cuál de mis amigos aguantaría más en una peli de terror?" },
      { en: "What's the weirdest thing you've googled this month?", es: "¿Qué es lo más raro que has buscado en Google este mes?" },
      { en: "What's the most dramatic thing you've done to avoid a phone call?", es: "¿Qué es lo más exagerado que has hecho para no coger una llamada?" },
      { en: "What's a song you know every word to and aren't proud of?", es: "¿Qué canción te sabes entera y preferirías no saberte?" },
      { en: "Which of my stories have you heard so often you could tell it better?", es: "¿Qué historia mía has oído tantas veces que la contarías mejor?" },
      { en: "What animal do you think I was in a past life?", es: "¿Qué animal crees que fui en otra vida?" },
      { en: "If we robbed a bank, whose fault would it be that we got caught?", es: "Si atracáramos un banco, ¿por culpa de quién nos pillarían?" },
      { en: "What's the pettiest thing you've ever got annoyed about?", es: "¿Qué es lo más tonto por lo que te has enfadado?" },
      { en: "Which film would you happily watch with me forever?", es: "¿Qué peli verías conmigo para siempre sin quejarte?" },
      { en: "If you went on a quiz show, what would your specialist subject be?", es: "Si fueras a un concurso de preguntas, ¿cuál sería tu tema?" },
      { en: "What's a trend you secretly loved?", es: "¿Qué moda te encantó en secreto?" },
      { en: "If I were a dish, what would I be?", es: "Si yo fuera un plato, ¿cuál sería?" },
      { en: "What's the first thing you'd buy if we won the lottery?", es: "¿Qué es lo primero que comprarías si nos tocara la lotería?" },
      { en: "Which of us would be worse at camping?", es: "¿A quién se le daría peor ir de acampada?" },
      { en: "What's the strangest dream you've had about me?", es: "¿Cuál es el sueño más raro que has tenido conmigo?" },
      { en: "Name three things in our fridge right now. No looking.", es: "Di tres cosas que hay en nuestra nevera ahora mismo. Sin mirar." },
      { en: "What's a bad habit you're secretly proud of?", es: "¿Qué mala costumbre tienes que en el fondo te enorgullece?" },
      { en: "If we had a pet that could talk, what would it say about this house?", es: "Si tuviéramos una mascota que hablara, ¿qué contaría de esta casa?" },
      { en: "What's a word you always say wrong?", es: "¿Qué palabra pronuncias siempre mal?" },
      { en: "Which film romance would never work in real life?", es: "¿Qué romance de película no funcionaría en la vida real?" },
      { en: "What would your job be in a medieval village?", es: "¿A qué te dedicarías en un pueblo medieval?" },
      { en: "What's the funniest thing I've said in my sleep?", es: "¿Qué es lo más gracioso que he dicho en sueños?" },
      { en: "What's the most you've spent on something you never used?", es: "¿Qué es lo más caro que has comprado y no has usado nunca?" },
      { en: "Which job would you be fired from on the first day?", es: "¿De qué trabajo te echarían el primer día?" },
      { en: "What would our band be called?", es: "¿Cómo se llamaría nuestro grupo de música?" },
    ],
  },
  deep: {
    name: { en: "Closer", es: "Más cerca" },
    blurb: { en: "Slower ones, for later in the evening.", es: "Más lentas, para cuando avanza la noche." },
    from: "#E4E0F6",
    to: "#CFC7EE",
    ink: "#4B3F9A",
    cards: [
      { en: "When did you first think this might be something?", es: "¿Cuándo pensaste por primera vez que esto podía ir en serio?" },
      { en: "What's something small I do that makes you feel looked after?", es: "¿Qué cosa pequeña hago que te hace sentir que te cuido?" },
      { en: "What did you need as a kid that you're still learning to ask for?", es: "¿Qué necesitabas en tu infancia que todavía estás aprendiendo a pedir?" },
      { en: "What's a version of our life in five years that would make you happy?", es: "¿Qué versión de nuestra vida dentro de cinco años te haría feliz?" },
      { en: "When do you feel most like yourself around me?", es: "¿Cuándo te sientes más tú cuando estás conmigo?" },
      { en: "What's one thing you wish we did more of?", es: "¿Qué te gustaría que hiciéramos más?" },
      { en: "What's something you've never quite managed to tell me?", es: "¿Qué es eso que nunca has acabado de contarme?" },
      { en: "Which moment of ours do you replay the most?", es: "¿Qué momento nuestro es el que más repasas?" },
      { en: "What are you proud of that nobody ever asks about?", es: "¿Qué te enorgullece y nadie te pregunta nunca?" },
      { en: "How do you like to be comforted when it's been a bad day?", es: "¿Cómo te gusta que te consuelen cuando has tenido un mal día?" },
      { en: "What's a fear you'd like me to understand better?", es: "¿Qué miedo te gustaría que yo entendiera mejor?" },
      { en: "What does a perfect ordinary Tuesday with me look like?", es: "¿Cómo es un martes normal y perfecto conmigo?" },
      { en: "What's something you've changed your mind about since we met?", es: "¿En qué has cambiado de opinión desde que nos conocimos?" },
      { en: "When did I last make you proud?", es: "¿Cuándo fue la última vez que te hice sentir orgullo?" },
      { en: "What's a memory of us you never want to lose?", es: "¿Qué recuerdo nuestro no quieres perder nunca?" },
      { en: "What does home mean to you now?", es: "¿Qué significa para ti la palabra hogar ahora?" },
      { en: "What's one way I could love you better?", es: "¿De qué manera podría quererte mejor?" },
      { en: "What's a dream you've put on hold?", es: "¿Qué sueño has dejado en pausa?" },
      { en: "When do you feel closest to me?", es: "¿Cuándo sientes que estamos más cerca?" },
      { en: "What's a habit of mine you'd miss if it stopped?", es: "¿Qué manía mía echarías de menos si desapareciera?" },
      { en: "What did your parents get right about love?", es: "¿Qué hicieron bien tus padres en el amor?" },
      { en: "What's something you'd like us to learn together?", es: "¿Qué te gustaría que aprendiéramos en pareja?" },
      { en: "What's the kindest thing anyone has ever done for you?", es: "¿Qué es lo más bonito que alguien ha hecho por ti?" },
      { en: "How do you know when something's wrong with me, even if I don't say it?", es: "¿Cómo sabes cuándo me pasa algo, aunque no lo diga?" },
      { en: "What's something you forgave that still matters to you?", es: "¿Qué has perdonado que todavía te importa?" },
      { en: "Who in your life would you trust with anything?", es: "¿En qué persona de tu vida confiarías para cualquier cosa?" },
      { en: "What part of your childhood do you want our life to have?", es: "¿Qué parte de tu infancia te gustaría que tuviera nuestra vida?" },
      { en: "What reaches you most: words, time, touch or help?", es: "¿Qué te llega más: palabras, tiempo, caricias o ayuda?" },
      { en: "What's something about me you only understood later?", es: "¿Qué de mí entendiste solo con el tiempo?" },
      { en: "What would you tell the you from the day we met?", es: "¿Qué le dirías a quien eras el día que nos conocimos?" },
      { en: "What's a small promise you'd like us to make?", es: "¿Qué pequeña promesa te gustaría que nos hiciéramos?" },
      { en: "When did you last cry, and why?", es: "¿Cuándo lloraste por última vez y por qué?" },
      { en: "What does a good apology look like to you?", es: "Para ti, ¿cómo es una buena disculpa?" },
      { en: "What would you like to stop worrying about?", es: "¿Por qué te gustaría dejar de preocuparte?" },
      { en: "What's a tradition you'd like us to start?", es: "¿Qué tradición te gustaría que empezáramos?" },
      { en: "Which year of your life would you live again?", es: "¿Qué año de tu vida volverías a vivir?" },
      { en: "What do you need more of from me this month?", es: "¿Qué necesitas más de mí este mes?" },
      { en: "What do you like about yourself that I might not see?", es: "¿Qué te gusta de ti que quizá yo no veo?" },
      { en: "What would make next year our best one yet?", es: "¿Qué haría que el año que viene fuera el mejor hasta ahora?" },
      { en: "What's the bravest thing you've ever done?", es: "¿Qué es lo más valiente que has hecho nunca?" },
      { en: "Where do you see us when we're old?", es: "¿Dónde nos imaginas de mayores?" },
      { en: "What do you hope I'll always remember about you?", es: "¿Qué esperas que siempre recuerde de ti?" },
    ],
  },
  apart: {
    name: { en: "Far apart", es: "A distancia" },
    blurb: { en: "For the call, when you've run out of news.", es: "Para la llamada, cuando se acaban las novedades." },
    from: "#D9EEF3",
    to: "#BBDDE8",
    ink: "#22607F",
    cards: [
      { en: "What's the first thing we're doing when I land?", es: "¿Qué es lo primero que hacemos cuando aterrice?" },
      { en: "Show me something within arm's reach and tell me its story.", es: "Enséñame algo que tengas a mano y cuéntame su historia." },
      { en: "What part of your day do you most wish I'd been there for?", es: "¿En qué momento de tu día te habría gustado más que yo estuviera?" },
      { en: "What's a smell, a song or a place that is now just you, to me?", es: "¿Qué olor, canción o sitio es ya, para mí, simplemente tú?" },
      { en: "What's the hardest hour of the day to be apart?", es: "¿Cuál es la hora del día en la que más cuesta estar lejos?" },
      { en: "Describe the view from your window right now, badly.", es: "Descríbeme lo que ves por la ventana ahora mismo, pero mal." },
      { en: "What's one ordinary thing you can't wait to do together again?", es: "¿Qué cosa normal y corriente estás deseando que volvamos a hacer?" },
      { en: "What should I send you in the post this month?", es: "¿Qué debería enviarte por correo este mes?" },
      { en: "What did you eat today? Rate it. Be honest.", es: "¿Qué has comido hoy? Puntúalo. Con sinceridad." },
      { en: "What have you got better at since we've been doing this long distance?", es: "¿En qué has mejorado desde que llevamos esto a distancia?" },
      { en: "Where will we live when the distance is over? Wrong answers only.", es: "¿Dónde viviremos cuando se acabe la distancia? Solo respuestas equivocadas." },
      { en: "What do you want me to know before we hang up tonight?", es: "¿Qué quieres que sepa antes de colgar esta noche?" },
    ],
  },
};

export const DECK_IDS = Object.keys(DECKS) as DeckId[];

/** Cards in one round of a free deck: a sitting's worth, dealt from the whole deck. */
export const DECK_ROUND = 12;

/** A fixed shuffle from a seed: the same deck order for both people when the seed travels in a link. */
export function shuffled(count: number, seed: number): number[] {
  const order = Array.from({ length: count }, (_, i) => i);
  let state = (seed >>> 0) || 1;
  const next = () => {
    // xorshift32: small, even enough for a deck of cards, and the same everywhere.
    state ^= state << 13;
    state >>>= 0;
    state ^= state >>> 17;
    state ^= state << 5;
    state >>>= 0;
    return state / 4294967296;
  };
  for (let i = count - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}
