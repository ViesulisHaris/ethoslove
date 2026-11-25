import "server-only";

import { env, isConfigured } from "@/lib/env";

type Options = { limit: number; windowSeconds: number };

const memory = new Map<string, { count: number; resetAt: number }>();

/**
 * Sliding-window-ish rate limiter. Uses Upstash Redis (INCR + EXPIRE) when configured,
 * otherwise a per-process map — good enough for dev and single-instance deploys.
 * Returns true when the request is allowed.
 */
export async function rateLimit(key: string, { limit, windowSeconds }: Options): Promise<boolean> {
  if (isConfigured.upstash) {
    try {
      const res = await fetch(`${env.upstashRedisUrl}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.upstashRedisToken}`, "content-type": "application/json" },
        body: JSON.stringify([
          ["INCR", `rl:${key}`],
          ["EXPIRE", `rl:${key}`, windowSeconds, "NX"],
        ]),
        cache: "no-store",
      });
      const json = (await res.json()) as { result: number }[];
      return (json[0]?.result ?? 0) <= limit;
    } catch {
      return true; // never lock users out because the limiter is down
    }
  }
  const now = Date.now();
  const entry = memory.get(key);
  if (!entry || entry.resetAt < now) {
    memory.set(key, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}

const marks = new Map<string, { value: string; expiresAt: number }>();

/**
 * Puts `value` under `key` for `windowSeconds` (null takes it off) and answers what was there
 * before, in one step: two requests at once cannot both read the same old value. Upstash's
 * SET … GET / GETDEL when configured, else the per-process map. Undefined when the store could not
 * be reached: unlike rateLimit the caller decides, since a guess here would be a guess about a count.
 */
export async function swapMark(key: string, value: string | null, windowSeconds: number): Promise<string | null | undefined> {
  if (isConfigured.upstash) {
    try {
      const res = await fetch(`${env.upstashRedisUrl}/pipeline`, {
        method: "POST",
        headers: { Authorization: `Bearer ${env.upstashRedisToken}`, "content-type": "application/json" },
        body: JSON.stringify([value === null ? ["GETDEL", `mk:${key}`] : ["SET", `mk:${key}`, value, "EX", windowSeconds, "GET"]]),
        cache: "no-store",
      });
      if (!res.ok) return undefined;
      const json = (await res.json()) as { result?: unknown; error?: string }[];
      if (!json[0] || json[0].error) return undefined;
      return typeof json[0].result === "string" ? json[0].result : null;
    } catch {
      return undefined;
    }
  }
  const now = Date.now();
  const entry = marks.get(key);
  const before = entry && entry.expiresAt >= now ? entry.value : null;
  if (value === null) marks.delete(key);
  else marks.set(key, { value, expiresAt: now + windowSeconds * 1000 });
  return before;
}
