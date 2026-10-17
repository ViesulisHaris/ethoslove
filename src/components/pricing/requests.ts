"use client";

export type PostResult = { ok: boolean; status: number; json: Record<string, unknown> };

/**
 * A JSON POST to one of our own endpoints that never throws: a dropped connection comes back as
 * status 0, a body that isn't JSON as {}, so every caller handles exactly one shape.
 */
export async function postJson(url: string, body: unknown): Promise<PostResult> {
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as unknown;
    return { ok: res.ok, status: res.status, json: json && typeof json === "object" ? (json as Record<string, unknown>) : {} };
  } catch {
    return { ok: false, status: 0, json: {} };
  }
}

export const errorOf = (result: PostResult): string | undefined => (typeof result.json.error === "string" ? result.json.error : undefined);
