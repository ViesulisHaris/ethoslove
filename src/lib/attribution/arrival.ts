import { referrerHost, utmValue } from "./source";

/**
 * Arrivals the dashboard couldn't see. An assistant's answer, an Instagram bio link and a pin's link
 * open the site with no referrer the browser will pass on, only a tag in the address
 * (`?utm_source=chatgpt.com`, `?utm_source=ig`, `?ref=pinterest`), and Vercel's page views here
 * keep no tags. So on 20 Nov 2026 "no source" turned out to hold about 200 ChatGPT visits a week
 * that looked like nothing at all, and Pinterest's real number (none) could only be dug out of
 * request logs. Each such arrival is now counted once, as an event named for where it came from.
 *
 * Only the name is sent: no address, no tag's value, nothing of the visitor. Gift links are left
 * out: someone opening a gift sent to them over Instagram is not a visitor who found the site.
 */
export type ArrivalEvent = "arrived_chatgpt" | "arrived_ai" | "arrived_pinterest" | "arrived_instagram";

/** A gift (or a hug) opened by the person it was made for: never counted as an arrival. */
const SOMEONES_GIFT = /^\/(?:(?:en|es)\/)?(?:g|hug)(?:\/|$)/;

const CHATGPT_HOST = /^(?:chatgpt\.com|chat\.openai\.com)$/;
/** The other assistants that link out: Perplexity, Copilot, Gemini, Claude. */
const ASSISTANT_HOST = /(?:^|\.)perplexity\.ai$|^copilot\.microsoft\.com$|^gemini\.google\.com$|^claude\.ai$/;
const ASSISTANT_TAG = /perplexity|copilot|gemini|claude/;
const PINTEREST_HOST = /(?:^|\.)pinterest\.[a-z.]+$|^pin\.it$|^com\.pinterest$/;
const INSTAGRAM_HOST = /(?:^|\.)instagram\.com$|^com\.instagram\.android$/;

/**
 * Which of those arrivals a visit's first page is, if any: read from the address it opened at and
 * `document.referrer`, the same two things the checkout's source is read from (./source.ts).
 */
export function arrivalEvent(location: { pathname: string; search: string }, referrer: string | null | undefined): ArrivalEvent | null {
  if (SOMEONES_GIFT.test(location.pathname.toLowerCase())) return null;
  const params = new URLSearchParams(location.search);
  const tag = utmValue(params.get("utm_source")) ?? "";
  const host = referrerHost(referrer) ?? "";
  if (tag === "chatgpt.com" || tag === "chatgpt" || tag === "openai" || CHATGPT_HOST.test(host)) return "arrived_chatgpt";
  if (ASSISTANT_TAG.test(tag) || ASSISTANT_HOST.test(host)) return "arrived_ai";
  // Our own pins end in ?ref=pinterest (the pin routine); Pinterest adds `epik` to the links it sends out.
  if (params.get("ref")?.toLowerCase() === "pinterest" || tag === "pinterest" || params.get("epik") || PINTEREST_HOST.test(host)) return "arrived_pinterest";
  if (tag === "ig" || tag === "instagram" || INSTAGRAM_HOST.test(host)) return "arrived_instagram";
  return null;
}
