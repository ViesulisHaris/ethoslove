import { PRODUCTS, chargedCurrency, formatAmount, membershipAmount, subscriptionsEnabled, type Currency, type ProductId } from "@/lib/pricing/products";
import en from "../../../messages/en.json";
import es from "../../../messages/es.json";
import type { TopicId } from "./topic-ids";

export { STUCK_TOPICS, TOPICS, isStuckTopic, type TopicId } from "./topic-ids";

/**
 * The help chat's topics: the problems people write in about most, each with a ready-made answer
 * (messages: support.topics). A topic costs nothing (no model call) and can't go off-script. The
 * server writes the answer, never the browser, so the chat's record, and the email the team gets on
 * a hand-off, show what the visitor really read.
 */

type TopicText = { label: string; answer: string; stuck?: string; forTwoPass?: string; forTwoSubscription?: string };

const fill = (text: string, values: Record<string, string>) => text.replace(/\{(\w+)\}/g, (whole, key: string) => values[key] ?? whole);

/** One step of a topic: what the visitor "said" (the button) and what the chat answers. */
export function topicTurn(topic: TopicId, step: "answer" | "stuck", locale: "en" | "es", currency: Currency): { visitor: string; reply: string; handoff: boolean } {
  const support = (locale === "es" ? es : en).support;
  const text = support.topics[topic] as TopicText;
  if (step === "stuck") return { visitor: text.stuck ?? support.followAsk, reply: support.handoffReply, handoff: true };
  if (topic !== "prices") return { visitor: text.label, reply: text.answer, handoff: false };

  // Prices in the visitor's own currency, from the same table checkout charges.
  const c = chargedCurrency(currency);
  const price = (id: ProductId) => formatAmount(PRODUCTS[id].amounts[c], c, locale);
  const forTwo = subscriptionsEnabled()
    ? fill(text.forTwoSubscription ?? "", { monthly: formatAmount(membershipAmount("monthly", c), c, locale), yearly: formatAmount(membershipAmount("yearly", c), c, locale) })
    : fill(text.forTwoPass ?? "", { pass: price("pass") });
  const reply = fill(text.answer, { single: price("single"), pick3: price("pick3"), everything: price("everything"), extras: price("extras"), forTwo });
  return { visitor: text.label, reply, handoff: false };
}
