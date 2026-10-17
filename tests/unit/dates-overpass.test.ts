import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * Asking the public Overpass servers for the rare finds: which server is asked when, what counts as
 * an answer, and what is kept. Every server is played by a stub `fetch`; nothing leaves the machine.
 */

vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => null }));
// Next's data cache, as unstable_cache uses it: a value is kept by its arguments, a throw is not.
vi.mock("next/cache", () => ({
  unstable_cache: <A extends unknown[], R>(fn: (...args: A) => Promise<R>) => {
    const kept = new Map<string, R>();
    return async (...args: A) => {
      const key = JSON.stringify(args);
      if (kept.has(key)) return kept.get(key)!;
      const value = await fn(...args);
      kept.set(key, value);
      return value;
    };
  },
}));

const MAIN = "overpass-api.de";
const VK = "maps.mail.ru";
const COFFEE = "overpass.private.coffee";

type Reply = { status?: number; body?: unknown; afterMs?: number; hang?: boolean; refuse?: boolean };

/** Plays each server: answers after a while, says a status, hangs, or refuses the connection. */
function servers(replies: Partial<Record<string, Reply>>) {
  const asked: string[] = [];
  const hungUp: string[] = [];
  const inits: RequestInit[] = [];
  vi.stubGlobal(
    "fetch",
    vi.fn((input: string, init: RequestInit) => {
      const host = new URL(input).host;
      asked.push(host);
      inits.push(init);
      const reply = replies[host] ?? { refuse: true };
      return new Promise<Response>((resolve, reject) => {
        const signal = init.signal!;
        signal.addEventListener("abort", () => {
          hungUp.push(host);
          reject(signal.reason);
        });
        if (reply.refuse) return reject(new TypeError("fetch failed"));
        if (reply.hang) return;
        setTimeout(() => resolve(new Response(JSON.stringify(reply.body ?? found(1)), { status: reply.status ?? 200 })), reply.afterMs ?? 0);
      });
    }),
  );
  return { asked, hungUp, inits };
}

const MADRID = { lat: 40.42, lng: -3.7 };
function found(n: number) {
  return {
    version: 0.6,
    generator: "Overpass API",
    elements: Array.from({ length: n }, (_, i) => ({ type: "node", id: i + 1, lat: 40.421 + i / 1000, lon: -3.701, tags: { leisure: "bowling_alley", name: `Bolera ${i + 1}` } })),
  };
}

/** A fresh copy of the modules each time: the servers that turned us away are remembered per process. */
async function load() {
  vi.resetModules();
  return { ...(await import("@/lib/dates/overpass-fetch")), ...(await import("@/lib/dates/sources")) };
}

const quick = { deadlineMs: 1000, hedgeMs: 100, revalidate: false } as const;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("asking the Overpass servers", () => {
  it("takes the first server's answer inside its head start, and asks nobody else", async () => {
    const { askOverpass } = await load();
    const net = servers({ [MAIN]: { afterMs: 10 } });
    expect(await askOverpass("q", quick)).toEqual(found(1));
    expect(net.asked).toEqual([MAIN]);
  });

  it("asks the next server once the first has had its head start, takes whoever answers first, and hangs up on the other", async () => {
    const { askOverpass } = await load();
    const net = servers({ [MAIN]: { afterMs: 600, body: found(3) }, [VK]: { afterMs: 20, body: found(2) } });
    const started = Date.now();
    expect(await askOverpass("q", quick)).toEqual(found(2));
    expect(Date.now() - started).toBeLessThan(400);
    expect(net.asked).toEqual([MAIN, VK]);
    expect(net.hungUp).toContain(MAIN);
  });

  it("moves on at once from a refusal, a 429 or a half answer, and asks that server last for a while", async () => {
    const { askOverpass, overpassOrder, COOL_DOWN_MS } = await load();
    let net = servers({ [MAIN]: { status: 429 }, [VK]: { afterMs: 10 } });
    const started = Date.now();
    expect(await askOverpass("q", { ...quick, hedgeMs: 5000 })).toEqual(found(1));
    expect(Date.now() - started).toBeLessThan(400);
    expect(overpassOrder()).toEqual([`https://${VK}/osm/tools/overpass/api/interpreter`, `https://${COFFEE}/api/interpreter`, `https://${MAIN}/api/interpreter`]);

    // A 200 that ran out of time part of the way through is no answer either.
    net = servers({ [VK]: { body: { elements: [], remark: "runtime error: Query timed out in \"query\" at line 1 after 15 seconds." } }, [COFFEE]: { afterMs: 10 } });
    expect(await askOverpass("q", { ...quick, hedgeMs: 5000 })).toEqual(found(1));
    expect(net.asked).toEqual([VK, COFFEE]);
    expect(overpassOrder()[0]).toBe(`https://${COFFEE}/api/interpreter`);

    // Asked in the usual order again once the while is over.
    expect(overpassOrder(Date.now() + COOL_DOWN_MS + 1)[0]).toBe(`https://${MAIN}/api/interpreter`);
  });

  it("is null when nobody answers by the deadline, which no server is blamed for", async () => {
    const { askOverpass, overpassOrder } = await load();
    const net = servers({ [MAIN]: { hang: true }, [VK]: { hang: true }, [COFFEE]: { hang: true } });
    expect(await askOverpass("q", { deadlineMs: 150, hedgeMs: 20, revalidate: false })).toBeNull();
    expect(net.asked).toEqual([MAIN, VK, COFFEE]);
    expect(net.hungUp.sort()).toEqual([COFFEE, VK, MAIN].sort());
    expect(overpassOrder()[0]).toBe(`https://${MAIN}/api/interpreter`);
  });

  it("keeps an answer in Next's data cache by URL only when asked to", async () => {
    const { askOverpass } = await load();
    let net = servers({ [MAIN]: {} });
    await askOverpass("q", { ...quick, revalidate: 60 });
    expect(net.inits[0]).toMatchObject({ next: { revalidate: 60 } });
    net = servers({ [MAIN]: {} });
    await askOverpass("q", quick);
    expect(net.inits[0]).toMatchObject({ cache: "no-store" });
    expect(net.inits[0]).not.toHaveProperty("next");
  });
});

describe("the rare finds of an area", () => {
  it("are kept for the area whichever server gave them, and read in the page's language", async () => {
    const { rareFinds } = await load();
    const net = servers({ [MAIN]: { status: 504 }, [VK]: { afterMs: 10, body: found(2) } });
    const places = await rareFinds(MADRID, "es");
    expect(places?.map((p) => p.name)).toEqual(["Bolera 1", "Bolera 2"]);
    expect(net.asked).toEqual([MAIN, VK]);

    // The next visitor, in either language, is answered from the cache: no server is asked.
    expect((await rareFinds(MADRID, "en"))?.map((p) => p.id)).toEqual(["node/1", "node/2"]);
    expect(net.asked).toEqual([MAIN, VK]);
  });

  it("are shown when a whole answer is empty, but never kept as if that were the area's answer", async () => {
    const { rareFinds } = await load();
    const net = servers({ [MAIN]: { body: { elements: [] } } });
    expect(await rareFinds(MADRID, "en")).toEqual([]);
    expect(await rareFinds(MADRID, "en")).toEqual([]);
    expect(net.asked).toEqual([MAIN, MAIN]);
  });

  it("are null when no server answered, and asked for again next time", async () => {
    const { rareFinds } = await load();
    let net = servers({});
    expect(await rareFinds(MADRID, "en")).toBeNull();
    expect(net.asked).toEqual([MAIN, VK, COFFEE]);
    net = servers({ [COFFEE]: { body: found(1) } });
    expect(await rareFinds(MADRID, "en")).toHaveLength(1);
    expect(net.asked).toContain(COFFEE);
  });
});
