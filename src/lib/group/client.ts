import type { GiftContribution } from "@/lib/gift/schema";
import type { GroupEntryView, GroupView } from "./store";

/**
 * The sender's panel talking to the group routes (src/app/api/group). Every call answers with what
 * the route said or one plain error name; nothing here throws, so a phone that loses signal mid-tap
 * gets a line of words and a button that still works.
 */
export type { GroupEntryView, GroupView };

export type GroupError = "unauthenticated" | "unavailable" | "not_found" | "not_group_template" | "not_draft" | "invalid" | "full" | "gone" | "sent" | "not_allowed" | "taken_back" | "photo_failed" | "rate_limited" | "failed";
export type Answer<T> = ({ ok: true } & T) | { ok: false; error: GroupError };

const KNOWN: readonly GroupError[] = ["unauthenticated", "unavailable", "not_found", "not_group_template", "not_draft", "invalid", "full", "gone", "sent", "not_allowed", "taken_back", "photo_failed", "rate_limited", "failed"];

async function call<T>(url: string, method: "POST" | "PATCH" | "DELETE", body?: unknown): Promise<Answer<T>> {
  try {
    const res = await fetch(url, { method, headers: body === undefined ? undefined : { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body), cache: "no-store" });
    const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (res.ok && data) return { ok: true, ...data };
    const error = KNOWN.find((known) => known === data?.error);
    return { ok: false, error: error ?? (res.status === 401 ? "unauthenticated" : res.status === 503 ? "unavailable" : "failed") };
  } catch {
    return { ok: false, error: "failed" };
  }
}

/** How the group for this gift stands, or null when it has none. The gift's id goes in the body, never in an address. */
export const findGroup = (giftId: string) => call<{ group: GroupView | null }>("/api/group/find", "POST", { giftId });

export const createGroup = (input: { giftId: string; fromName: string; forName: string; prompt?: string }) => call<{ group: GroupView }>("/api/group", "POST", input);

export const patchGroup = (groupId: string, patch: { fromName?: string; forName?: string; prompt?: string | null; closed?: boolean; resetLink?: true; extend?: true }) => call<{ group: GroupView }>(`/api/group/${groupId}`, "PATCH", patch);

export type Decision = { status: GroupEntryView["status"]; item?: GiftContribution; previewUrl?: string };

export const approveEntry = (groupId: string, entryId: string, withPhoto: boolean) => call<Decision>(`/api/group/${groupId}/entries/${entryId}`, "POST", { action: "approve", withPhoto });

export const decideEntry = (groupId: string, entryId: string, action: "reject" | "remove" | "restore") => call<Decision>(`/api/group/${groupId}/entries/${entryId}`, "POST", { action });
