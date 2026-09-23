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
