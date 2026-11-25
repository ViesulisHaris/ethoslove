import type { GameKey } from "@/lib/games/catalogue";

type L = { en: string; es: string };
export type GameFaq = { q: L; a: L };

export type GamePage = {
  /** What happens, in the order it happens: three or four short lines. Only where the page had none. */
  how?: { en: string[]; es: string[] };
  /** Two to four questions, true to this game. */
  faq: GameFaq[];
  /** Blog posts that already link to this game (or, for a game none links to, to the games): at most two. */
  posts: string[];
};

const SAVED: GameFaq = {
  q: { en: "Is anything saved?", es: "¿Se guarda algo?" },
  a: {
    en: "No account, and nothing kept on our side. A game is remembered only in your browser’s tab, so a reload carries on, and it is gone when the tab closes.",
    es: "Sin cuenta y sin nada guardado por nuestra parte. La partida se recuerda solo en la pestaña de tu navegador, para que una recarga siga donde estabais, y desaparece al cerrarla.",
  },
};

const twoPhones = (en: string, es: string): GameFaq => ({
  q: { en: "Can we play on two phones?", es: "¿Se puede jugar en dos móviles?" },
  a: {
    en: `Yes. One of you makes a room and sends the link, or reads out its four-letter code; the other opens it, no account needed. ${en}`,
    es: `Sí. Una persona crea una sala y manda el enlace, o dicta su código de cuatro letras; la otra lo abre, sin cuenta. ${es}`,
  },
});

/**
 * What every game's page says under the game (components/games/page/game-notes.tsx). Every line was
 * read from the game's component and its data on 23 Nov 2026; the numbers in them are held to the
 * code's own constants by tests/unit/game-pages.test.ts. Change a game, read its lines again.
 */
export const GAME_PAGES: Record<GameKey, GamePage> = {
  know: {
    faq: [
      {
        q: { en: "How does the scoring work?", es: "¿Cómo se puntúa?" },
        a: {
          en: "For each question you answer for yourself, then guess what the other will say. Only the guesses score: a point for every right guess about them.",
          es: "En cada pregunta respondes por ti y luego adivinas qué dirá la otra persona. Solo puntúan las apuestas: un punto por cada acierto.",
        },
      },
      {
        q: { en: "How long is a game?", es: "¿Cuánto dura una partida?" },
        a: {
          en: "8 questions, dealt from the 40 in the free deck, each with four answers to pick from. About ten minutes.",
          es: "8 preguntas, sacadas de las 40 de la baraja gratis, cada una con cuatro respuestas. Unos diez minutos.",
        },
      },
      twoPhones("Each answers on their own screen, so nobody sees the other’s pick.", "Cada cual responde en su pantalla, así que nadie ve lo que elige la otra persona."),
      SAVED,
    ],
    posts: ["questions-for-couples", "questions-to-ask-your-partner"],
  },
  rather: {
    faq: [
      {
        q: { en: "How long is a game?", es: "¿Cuánto dura una partida?" },
        a: {
          en: "10 pairs, dealt from the 150 in the list above. You both pick in secret, then see whether you agree. About five minutes.",
          es: "10 dilemas, sacados de los 150 de la lista de arriba. Elegís en secreto y luego veis si coincidís. Unos cinco minutos.",
        },
      },
      twoPhones("On one phone, the phone is handed over between the two picks.", "En un móvil, os lo pasáis entre una elección y la otra."),
      {
        q: { en: "Is there a question of the day?", es: "¿Hay una pregunta del día?" },
        a: {
          en: "Yes: one pair a day, the same for everyone. Answer it and send it by link; the other picks before seeing yours.",
          es: "Sí: un dilema al día, el mismo para todo el mundo. Respóndelo y mándalo con un enlace; quien lo recibe elige antes de ver tu respuesta.",
        },
      },
    ],
    posts: ["would-you-rather-questions-for-couples", "questions-to-ask-your-crush"],
  },
  draw: {
    how: {
      en: [
        "Whoever draws sees the word first; the other looks away.",
        "They draw it with a finger, in one of five inks, with undo and clear.",
        "On one phone the guess is said out loud. On two, it is typed, and the game knows when it is right.",
        "You swap after every word: 6 words, 3 each.",
      ],
      es: [
        "Quien dibuja ve la palabra primero; la otra persona no mira.",
        "La dibuja con el dedo, en una de cinco tintas, con deshacer y borrar.",
        "En un móvil se adivina en voz alta. En dos, se escribe y el juego sabe cuándo aciertas.",
        "Os turnáis en cada palabra: 6 palabras, 3 por persona.",
      ],
    },
    faq: [
      {
        q: { en: "Does it work when we’re apart?", es: "¿Funciona si estamos lejos?" },
        a: {
          en: "Yes. On two phones the drawing appears on the other screen as it is drawn, so it plays on a call from anywhere.",
          es: "Sí. En dos móviles el dibujo aparece en la otra pantalla mientras se hace, así que se juega en una llamada desde donde sea.",
        },
      },
      {
        q: { en: "Does spelling count?", es: "¿Cuenta la ortografía?" },
        a: {
          en: "Yes, but accents, capitals and a stray “a” or “the” don’t cost the point. A guess counts in either of the site’s two languages.",
          es: "Sí, pero las tildes, las mayúsculas o un «el» o «una» de más no quitan el punto. Vale adivinar en cualquiera de los dos idiomas de la web.",
        },
      },
      {
        q: { en: "How long is a game?", es: "¿Cuánto dura una partida?" },
        a: {
          en: "6 words, picked from the 40 in the list above. About ten minutes, longer if one of you is a perfectionist.",
          es: "6 palabras, sacadas de las 40 de la lista de arriba. Unos diez minutos, más si alguien es perfeccionista.",
        },
      },
    ],
    posts: ["virtual-date-ideas-long-distance", "long-distance-relationship-tips"],
  },
  memory: {
    how: {
      en: [
        "16 cards lie face down: 8 pairs of stickers, or of up to 8 of your own photos.",
        "Turn two over. A pair is yours, and you go again.",
        "Not a pair: they turn face down again, and your partner turns two.",
        "When every pair is found, whoever holds more wins.",
      ],
      es: [
        "16 cartas boca abajo: 8 parejas de pegatinas, o de hasta 8 fotos vuestras.",
        "Da la vuelta a dos. Si son pareja, es tuya y repites.",
        "Si no lo son, se vuelven a tapar y tu pareja da la vuelta a otras dos.",
        "Cuando salen todas las parejas, gana quien tenga más.",
      ],
    },
    faq: [
      {
        q: { en: "Are our photos uploaded?", es: "¿Se suben nuestras fotos?" },
        a: {
          en: "No. The photos you pick stay on this phone and are only shown on it. Nothing is uploaded.",
          es: "No. Las fotos que eliges se quedan en este móvil y solo se ven en él. No se sube nada.",
        },
      },
      {
        q: { en: "One phone or two?", es: "¿Un móvil o dos?" },
        a: {
          en: "One, passed between you: the board needs both of you looking at it. A game takes about five minutes.",
          es: "Uno, que os vais pasando: el tablero necesita que lo miréis a la vez. Una partida dura unos cinco minutos.",
        },
      },
      {
        q: SAVED.q,
        a: {
          en: "No account, and nothing kept on our side. The board survives a reload in this tab; your photos don’t, so pick them again.",
          es: "Sin cuenta y sin nada guardado por nuestra parte. El tablero aguanta una recarga en esta pestaña; las fotos no, así que volved a elegirlas.",
        },
      },
    ],
    posts: ["quality-time-love-language", "anniversary-ideas-at-home"],
  },
  deck: {
    faq: [
      {
        q: { en: "How do you play?", es: "¿Cómo se juega?" },
        a: {
          en: "Pick a deck. Whoever holds the phone reads the card out, you both answer, and a tap turns the next one. 12 cards a round.",
          es: "Elegid una baraja. Quien tenga el móvil lee la carta en voz alta, respondéis y un toque pasa a la siguiente. 12 cartas por ronda.",
        },
      },
      {
        q: { en: "Which deck first?", es: "¿Con qué baraja empezar?" },
        a: {
          en: "Light for the sofa, Closer for later in the evening, and Far apart for a call when you’re in different places.",
          es: "Ligeras para el sofá, Más cerca para más tarde, y A distancia para una llamada cuando estáis lejos.",
        },
      },
      {
        q: { en: "Is anything saved?", es: "¿Se guarda algo?" },
        a: {
          en: "No account, and nothing kept on our side. The cards are dealt in your browser, and nothing you say goes anywhere.",
          es: "Sin cuenta y sin nada guardado por nuestra parte. Las cartas se reparten en tu navegador, y lo que digáis no va a ninguna parte.",
        },
      },
    ],
    posts: ["questions-to-ask-your-partner", "deep-questions-to-ask-your-boyfriend"],
  },
  dare: {
    faq: [
      {
        q: { en: "How soft is the soft edition?", es: "¿Cómo de suave es la versión suave?" },
        a: {
          en: "Speeches, impressions, a slow dance, a kiss on the hand. Nothing you couldn’t do with the neighbors in.",
          es: "Discursos, imitaciones, un baile lento, un beso en la mano. Nada que no pudierais hacer con los vecinos en casa.",
        },
      },
      {
        q: { en: "How long is a game?", es: "¿Cuánto dura una partida?" },
        a: {
          en: "12 truths and 12 dares, drawn fresh from the 50 of each in the list above. It ends when both piles run out, or when you say you’re done for the night.",
          es: "12 verdades y 12 retos, sacados cada vez de los 50 de cada tipo de la lista de arriba. Termina cuando se acaban los dos montones o cuando decís que ya está por esta noche.",
        },
      },
      {
        q: { en: "One phone or two?", es: "¿Un móvil o dos?" },
        a: {
          en: "One phone, going round: each turn asks one of you, by name, truth or dare.",
          es: "Un móvil que va pasando: en cada turno pregunta a quien le toca, por su nombre, verdad o reto.",
        },
      },
    ],
    posts: ["truth-or-dare-questions-for-couples"],
  },
  roulette: {
    how: {
      en: [
        "Put in both your names: the wheel is the two of you, half each.",
        "Spin. It picks one of 8 chores and lands on one of you.",
        "Spin again for the next one, as many times as you like.",
        "When it’s all decided, settle it: the last six spins are the verdict.",
      ],
      es: [
        "Poned vuestros nombres: la ruleta es vuestra, mitad y mitad.",
        "Gírala. Elige una de 8 tareas y cae en uno de los dos nombres.",
        "Volved a girar para la siguiente, tantas veces como queráis.",
        "Cuando esté todo decidido, cerradlo: los seis últimos giros son el veredicto.",
      ],
    },
    faq: [
      {
        q: { en: "Which chores are on it?", es: "¿Qué tareas salen?" },
        a: {
          en: "Who cooks tonight, washes up, picks the film, makes the coffee, gets up first tomorrow, books the next date, takes out the trash or chooses the music.",
          es: "Quién cocina esta noche, friega, elige la peli, hace el café, se levanta primero mañana, reserva la próxima cita, saca la basura o elige la música.",
        },
      },
      {
        q: { en: "Is it fair?", es: "¿Es justa?" },
        a: {
          en: "Each of you has half the wheel and every spin lands at random. Whether the result is fair is between the two of you.",
          es: "Cada cual tiene media ruleta y cada giro cae al azar. Si el resultado es justo, eso ya lo habláis vosotros.",
        },
      },
      SAVED,
    ],
    posts: ["quality-time-love-language"],
  },
  // Read from lib/games/picks.ts (PICKS_ROUNDS, picksMatches), lib/games/this-or-that.ts and components/games/picks-game.tsx.
  thisthat: {
    how: {
      en: ["10 pairs are dealt from the 120 in the list above.", "You both pick a side in secret: pass one phone across, or play from two.", "Both picks turn over together, and the game counts how many you matched."],
      es: ["Se reparten 10 parejas de las 120 de la lista de arriba.", "Elegís en secreto: os pasáis un móvil o jugáis con dos.", "Las dos elecciones se destapan a la vez y el juego cuenta las coincidencias."],
    },
    faq: [
      {
        q: { en: "Is it the same as would you rather?", es: "¿Es lo mismo que el juego de qué prefieres?" },
        a: {
          en: "It is faster. Each side is a few words, so a round takes seconds; would you rather gives you two whole situations to weigh.",
          es: "Es más rápido. Cada opción son pocas palabras y una ronda dura segundos; en ¿qué prefieres? hay dos situaciones enteras que sopesar.",
        },
      },
      twoPhones("Each picks on their own screen, and both picks turn over on both.", "Cada cual elige en su pantalla y las dos elecciones se destapan en las dos."),
      SAVED,
    ],
    posts: ["questions-for-couples"],
  },
};

/**
 * The questions under today's question (/games/today), shown closed and given to search engines as
 * an FAQPage. "{count}" is the number of free pairs. Each answer is held to lib/games/daily.ts and
 * components/games/today/today-question.tsx: change one of those and read these again.
 */
export const TODAY_FAQ: GameFaq[] = [
  {
    q: { en: "Is it the same question for everyone?", es: "¿Es la misma pregunta para todo el mundo?" },
    a: {
      en: "Yes. A new pair comes at midnight UTC, picked from {count} of the free deck’s questions, and none comes back until every one has had its day.",
      es: "Sí. Cada día a medianoche UTC llega una pareja nueva, sacada de {count} de las preguntas de la baraja gratis, y ninguna se repite hasta que todas han tenido su día.",
    },
  },
  {
    q: { en: "Can they see my answer before they pick?", es: "¿Ve mi respuesta antes de elegir?" },
    a: {
      en: "No. The link opens on the question with your name over it. Your pick shows only once they have tapped theirs.",
      es: "No. El enlace se abre en la pregunta con tu nombre encima. Tu respuesta aparece solo cuando ha tocado la suya.",
    },
  },
  {
    q: { en: "Is anything saved?", es: "¿Se guarda algo?" },
    a: {
      en: "Nothing on our side, and no account. Your first name and your pick travel in the link itself, after the #, a part a browser never sends to a server. This browser keeps your pick until the tab closes, your name for next time, and the last link you sent, so it knows that link as yours.",
      es: "Nada por nuestra parte, y sin cuenta. Tu nombre y tu respuesta viajan en el propio enlace, después de la almohadilla (#), una parte que el navegador nunca envía a un servidor. Este navegador guarda tu respuesta hasta que cierras la pestaña, tu nombre para la próxima vez y el último enlace que enviaste, para reconocerlo como tuyo.",
    },
  },
  {
    q: { en: "What if they open it tomorrow?", es: "¿Y si lo abre mañana?" },
    a: {
      en: "It still opens on the question you answered, and the reveal works the same. After it, a link leads to that day’s new question.",
      es: "Se sigue abriendo en la pregunta que respondiste y las dos respuestas se ven igual. Después, un enlace lleva a la pregunta nueva de ese día.",
    },
  },
];

/** The questions under the weekly challenge (/games/weekly), shown closed and given to search engines as an FAQPage. "{count}" is the number of sets. Each answer is held to lib/games/weekly.ts and components/games/weekly/weekly-challenge.tsx. */
export const WEEKLY_FAQ: GameFaq[] = [
  {
    q: { en: "When does the challenge change?", es: "¿Cuándo cambia el desafío?" },
    a: {
      en: "Every Monday at midnight UTC. There are {count} themed sets, each made of cards from the free games, and none comes back until every one has had its week.",
      es: "Cada lunes a medianoche UTC. Hay {count} desafíos temáticos, hechos con cartas de los juegos gratis, y ninguno se repite hasta que todos han tenido su semana.",
    },
  },
  {
    q: { en: "Can they see my picks before they answer?", es: "¿Ve mis elecciones antes de responder?" },
    a: {
      en: "No. The link opens on the first pair with your name over it. Your three picks show only once they have made theirs.",
      es: "No. El enlace se abre en la primera pareja con tu nombre encima. Tus tres elecciones aparecen solo cuando ha hecho las suyas.",
    },
  },
  {
    q: { en: "Is anything saved?", es: "¿Se guarda algo?" },
    a: {
      en: "Nothing on our side, and no account. Your first name and your picks travel in the link itself, after the #, a part a browser never sends to a server. This browser keeps your picks until the tab closes, your name for next time, and the last link you sent, so it knows that link as yours.",
      es: "Nada por nuestra parte, y sin cuenta. Tu nombre y tus elecciones viajan en el propio enlace, después de la almohadilla (#), una parte que el navegador nunca envía a un servidor. Este navegador guarda tus elecciones hasta que cierras la pestaña, tu nombre para la próxima vez y el último enlace que enviaste, para reconocerlo como tuyo.",
    },
  },
  {
    q: { en: "What if they open it next week?", es: "¿Y si lo abre la semana que viene?" },
    a: {
      en: "It still opens on the set you answered, marked as last week’s, and both sets of picks show the same way. After it, a link leads to the new week’s challenge.",
      es: "Se sigue abriendo en el desafío que respondiste, marcado como el de la semana pasada, y las elecciones se ven igual. Después, un enlace lleva al desafío de la semana nueva.",
    },
  },
];

/** How many of a list's items stay on show on a game's page, per group; the rest are in the page, closed (components/games/question-list.tsx). Held to 300 words a page by tests/unit/games-text-budget.test.tsx. */
export const LIST_SHOWN = { know: 3, rather: 5, thisthat: 6, draw: 12, deck: 2, dare: 3 } as const;
