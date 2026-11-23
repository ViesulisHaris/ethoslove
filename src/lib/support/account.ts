import "server-only";

import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * What the team needs to answer a help-chat hand-off without digging: the account that uses the
 * address the visitor gave (if any), its purchases and its gifts, newest first. It only ever goes
 * into the email to the support inbox, never back to the visitor, so an address someone else owns
 * reveals nothing to whoever typed it. Read-only; any failure gives "unknown" and the email still goes.
 */
export type SupportAccount =
  | { kind: "none" }
  | { kind: "unknown" }
  | {
      kind: "account";
      createdAt: string;
      purchases: { createdAt: string; product: string; templates: string[]; amount: number; currency: string; status: string }[];
      gifts: { shortId: string; template: string; status: string; createdAt: string; publishedAt: string | null; opens: number }[];
    };

const LIMIT = 10;

export async function supportAccount(email: string): Promise<SupportAccount> {
  const db = getSupabaseAdminClient();
  if (!db) return { kind: "unknown" };
  try {
    const { data: profile, error } = await db.from("profiles").select("id, created_at").eq("email", email.toLowerCase()).maybeSingle();
    if (error) return { kind: "unknown" };
    if (!profile) return { kind: "none" };
    const [purchases, gifts] = await Promise.all([
      db.from("purchases").select("created_at, product, template_slugs, amount, currency, status").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(LIMIT),
      db.from("gifts").select("id, short_id, template_slug, status, created_at, published_at").eq("user_id", profile.id).order("created_at", { ascending: false }).limit(LIMIT),
    ]);
    const giftRows = gifts.data ?? [];
    const opens = new Map<string, number>();
    if (giftRows.length > 0) {
      const { data: views } = await db.from("gift_views").select("gift_id").in("gift_id", giftRows.map((g) => g.id)).limit(1000);
      for (const view of views ?? []) opens.set(view.gift_id, (opens.get(view.gift_id) ?? 0) + 1);
    }
    return {
      kind: "account",
      createdAt: profile.created_at,
      purchases: (purchases.data ?? []).map((p) => ({
        createdAt: p.created_at,
        product: p.product,
        templates: p.template_slugs ?? [],
        amount: p.amount,
        currency: p.currency,
        status: p.status,
      })),
      gifts: giftRows.map((g) => ({
        shortId: g.short_id,
        template: g.template_slug,
        status: g.status,
        createdAt: g.created_at,
        publishedAt: g.published_at,
        opens: opens.get(g.id) ?? 0,
      })),
    };
  } catch {
    return { kind: "unknown" };
  }
}
