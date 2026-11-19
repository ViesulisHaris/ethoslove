import { createHash } from "node:crypto";

/** The help chat's fixed lines: what it says when the model's answer can't be used. */
export const SUPPORT_LINES = {
  en: {
    offTopic: "I can only help with questions about Ethos. What can I help you with on tryethos.io?",
    failed: "Sorry, I couldn't answer that one properly. I can pass it to our team, who answer by email: just leave your address below.",
    tooLong: "This chat has got long, so it's best to pass it to our team, who answer by email: just leave your address below.",
  },
  es: {
    offTopic: "Solo puedo ayudarte con preguntas sobre Ethos. ¿En qué te ayudo con tryethos.io?",
    failed: "Perdona, no he podido responder bien a eso. Puedo pasárselo a nuestro equipo, que responde por email: deja tu dirección aquí abajo.",
    tooLong: "Esta conversación ya es larga, así que mejor se la paso a nuestro equipo, que responde por email: deja tu dirección aquí abajo.",
  },
} as const;

/**
 * Who a visitor is, for the limits only: a hash of their IP and a server secret, never stored with a
 * chat, and kept in the counters no longer than a day past the window that needs it.
 */
export function visitorKey(ip: string): string {
  const salt = process.env.SUPPORT_HASH_SALT ?? process.env.CRON_SECRET ?? "ethos-help-chat";
  return createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
}

/** The counter key for one UTC day's spend. */
export const spendKey = (now: Date) => `spend:${now.toISOString().slice(0, 10)}`;
