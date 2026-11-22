type L = { en: string; es: string };
export type GameFaq = { q: L; a: L };

/**
 * The questions under today's question (/games/today), shown closed and given to search engines as
 * an FAQPage. "{count}" is the number of free pairs. Each answer is held to lib/games/daily.ts and
 * components/games/today/today-question.tsx: change one of those and read these again.
 */
export const TODAY_FAQ: GameFaq[] = [
  {
    q: { en: "Is it the same question for everyone?", es: "¿Es la misma pregunta para todo el mundo?" },
    a: {
      en: "Yes. A new pair comes at midnight UTC, picked from the {count} questions of the free deck, and none comes back until every one has had its day.",
      es: "Sí. Cada día a medianoche UTC llega una pareja nueva, sacada de las {count} preguntas de la baraja gratis, y ninguna se repite hasta que todas han tenido su día.",
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
      en: "No. Your first name and your pick travel in the link itself, after the #, a part a browser never sends to a server. No account, no room, nothing kept on our side.",
      es: "No. Tu nombre y tu respuesta viajan en el propio enlace, después de la #, una parte que el navegador nunca envía a un servidor. Sin cuenta, sin sala, nada guardado por nuestra parte.",
    },
  },
  {
    q: { en: "What if they open it tomorrow?", es: "¿Y si lo abre mañana?" },
    a: {
      en: "It still opens on the question you answered, and the reveal works the same. After it, there is a button for that day's new question.",
      es: "Se sigue abriendo en la pregunta que respondiste y las dos respuestas se ven igual. Después hay un botón para la pregunta nueva de ese día.",
    },
  },
];
