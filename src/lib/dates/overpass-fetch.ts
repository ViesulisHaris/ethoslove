import "server-only";

import { OVERPASS_ENDPOINTS } from "./overpass";

const USER_AGENT = "Ethos/1.0 (+https://tryethos.io)";

type Options = {
  /** The whole question: whoever hasn't answered by then is hung up on, and the answer is null. */
  deadlineMs: number;
  /** How long one server has the question to itself before the next is asked as well. */
  hedgeMs: number;
  /** Seconds Next's data cache keeps an answer, keyed by URL; false when the caller keeps its own. */
  revalidate: number | false;
};

/**
 * A server that turned us away (rate limited, busy, down, a half answer) is asked last for a while.
 * Their limits are per IP address, and a function's address is shared: asking again at once only
 * waits on the same refusal (the main instance holds a request up to 16 s before its 429), and the
 * main instance stops taking connections from an address that keeps asking after one.
 */
export const COOL_DOWN_MS = 2 * 60_000;
const coolingUntil = new Map<string, number>();

/** The servers in the order to ask them: the usual order, with the ones that turned us away lately last. */
export function overpassOrder(now = Date.now()): string[] {
  const cooling = (endpoint: string) => (coolingUntil.get(endpoint) ?? 0) > now;
  return [...OVERPASS_ENDPOINTS.filter((e) => !cooling(e)), ...OVERPASS_ENDPOINTS.filter(cooling)];
}

/**
 * Asks the public Overpass servers a question. They are free, shared and frequently busy, so the
 * first server gets a head start and, if it has not answered, the next is asked as well; whoever
 * answers first with real data wins and the others are hung up on. A server that fails is followed
 * at once by the next. Null when nobody answers in time.
 */
export async function askOverpass(query: string, { deadlineMs, hedgeMs, revalidate }: Options): Promise<unknown | null> {
  const endpoints = overpassOrder();
  const controllers: AbortController[] = [];
  const deadline = AbortSignal.timeout(deadlineMs);

  const ask = async (endpoint: string): Promise<unknown> => {
    const controller = new AbortController();
    controllers.push(controller);
    try {
      // A GET, so Next's data cache can key on the URL when it is asked to keep the answer.
      const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
        ...(revalidate === false ? { cache: "no-store" as const } : { next: { revalidate } }),
        headers: { "user-agent": USER_AGENT, accept: "application/json" },
        signal: AbortSignal.any([controller.signal, deadline]),
      });
      if (!res.ok) throw new Error(`overpass ${res.status}`);
      const json = (await res.json()) as { elements?: unknown[]; remark?: string };
      // A 200 with a "remark" is a query that ran out of time part of the way through.
      if (!Array.isArray(json.elements) || json.remark) throw new Error("overpass partial");
      return json;
    } catch (error) {
      // Hung up on because another server won, or the deadline came: nothing this server did.
      if (!controller.signal.aborted && !deadline.aborted) coolingUntil.set(endpoint, Date.now() + COOL_DOWN_MS);
      throw error;
    }
  };

  try {
    return await new Promise<unknown | null>((resolve) => {
      let pending = 0;
      let next = 0;
      let settled = false;
      let timer: ReturnType<typeof setTimeout> | undefined;
      const finish = (value: unknown | null) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        resolve(value);
      };
      const start = () => {
        if (settled || next >= endpoints.length) return;
        const endpoint = endpoints[next++];
        pending++;
        clearTimeout(timer);
        timer = setTimeout(start, hedgeMs);
        ask(endpoint).then(finish, () => {
          pending--;
          if (next < endpoints.length) start();
          else if (pending === 0) finish(null);
        });
      };
      deadline.addEventListener("abort", () => finish(null), { once: true });
      start();
    });
  } finally {
    for (const c of controllers) c.abort();
  }
}
