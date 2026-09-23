"use client";

import { useEffect, useState } from "react";
import { hasSessionCookie } from "@/lib/supabase/session-cookie";

/**
 * GET /api/entitlements: what the visitor may use right now. Read defensively, because a page that
 * shows a pass must never break over a field it didn't expect: anything malformed reads as nothing.
 * Checked by hand rather than with zod, which would ship the whole library to every page that asks
 * (the games, /pricing, /redeem, /for-two/join) to read four fields.
 */
export type PassInfo = { endsAt: string; isOwner: boolean; partnerJoined: boolean; inviteUrl?: string };
export type Entitlements = { signedIn: boolean; templates: string[]; packs: string[]; pass: PassInfo | null };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
/** A list of strings, or an empty one: one bad entry voids the list rather than being skipped. */
const strings = (value: unknown): string[] => (Array.isArray(value) && value.every((v) => typeof v === "string") ? [...value] : []);

function parsePass(value: unknown): PassInfo | null {
  if (!isRecord(value)) return null;
  const { endsAt, isOwner, partnerJoined, inviteUrl } = value;
  if (typeof endsAt !== "string" || typeof isOwner !== "boolean" || typeof partnerJoined !== "boolean") return null;
  return { endsAt, isOwner, partnerJoined, ...(typeof inviteUrl === "string" ? { inviteUrl } : {}) };
}

/** Only `signedIn` is required; every other field falls back to "nothing" on its own. */
export function parseEntitlements(value: unknown): Entitlements | null {
  if (!isRecord(value) || typeof value.signedIn !== "boolean") return null;
  return { signedIn: value.signedIn, templates: strings(value.templates), packs: strings(value.packs), pass: parsePass(value.pass) };
}

const SIGNED_OUT: Entitlements = { signedIn: false, templates: [], packs: [], pass: null };

export async function fetchEntitlements(): Promise<Entitlements | null> {
  // No session cookie, no session: answered here, so a signed-out visitor sees the sign-in at once.
  if (!hasSessionCookie()) return SIGNED_OUT;
  try {
    const res = await fetch("/api/entitlements", { cache: "no-store", credentials: "same-origin" });
    if (!res.ok) return null;
    return parseEntitlements(await res.json());
  } catch {
    return null;
  }
}

/**
 * The visitor's entitlements, fetched once per `version`; bump it after a join or a redemption.
 * Not fetched at all while `enabled` is false, for a page that only sometimes needs them.
 */
export function useEntitlements(version = 0, enabled = true): { data: Entitlements | null; loaded: boolean } {
  const [state, setState] = useState<{ data: Entitlements | null; loaded: boolean; version: number }>({ data: null, loaded: false, version: -1 });
  useEffect(() => {
    if (!enabled) return;
    let live = true;
    void fetchEntitlements().then((data) => {
      if (live) setState({ data, loaded: true, version });
    });
    return () => {
      live = false;
    };
  }, [version, enabled]);
  return enabled ? { data: state.data, loaded: state.loaded && state.version === version } : { data: null, loaded: false };
}
