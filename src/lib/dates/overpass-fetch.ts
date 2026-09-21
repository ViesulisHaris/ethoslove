import "server-only";

import { OVERPASS_ENDPOINTS } from "./overpass";

const USER_AGENT = "Ethos/1.0 (+https://tryethos.io)";

type Options = { deadlineMs: number; hedgeMs: number; revalidate: number };

/**
 * Asks the public Overpass servers a question. They are free, shared and frequently busy, so the
 * first server gets a head start and, if it has not answered, the next is asked as well; whoever
 * answers first with real data wins and the others are hung up on. Null when nobody answers in time.
 */
export async function askOverpass(query: string, { deadlineMs, hedgeMs, revalidate }: Options): Promise<unknown | null> {
  const controllers: AbortController[] = [];
  const deadline = AbortSignal.timeout(deadlineMs);

  const ask = async (endpoint: string): Promise<unknown> => {
    const controller = new AbortController();
    controllers.push(controller);
    // A GET, so Next's data cache can key on the URL.
    const res = await fetch(`${endpoint}?data=${encodeURIComponent(query)}`, {
      next: { revalidate },
      headers: { "user-agent": USER_AGENT, accept: "application/json" },
      signal: AbortSignal.any([controller.signal, deadline]),
    });
    if (!res.ok) throw new Error(`overpass ${res.status}`);
    const json = (await res.json()) as { elements?: unknown[]; remark?: string };
    // A 200 with a "remark" is a query that ran out of time part of the way through.
    if (!Array.isArray(json.elements) || json.remark) throw new Error("overpass partial");
    return json;
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
        if (settled || next >= OVERPASS_ENDPOINTS.length) return;
        const endpoint = OVERPASS_ENDPOINTS[next++];
        pending++;
        clearTimeout(timer);
        timer = setTimeout(start, hedgeMs);
        ask(endpoint).then(finish, () => {
          pending--;
          if (next < OVERPASS_ENDPOINTS.length) start();
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
