import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { getTranslations } from "next-intl/server";
import type { Database } from "@/lib/supabase/types";
import type { Ymd } from "./monthsaries";
import type { IdeaAccount, IdeaBasis } from "./monthly-idea";

/**
 * The monthly idea when a gift is sent (app/actions/gift.ts publishGift): who the account is, and the
 * row that starts it or moves its day. Only ever called when the setting is "buyers" or "all"; with
 * it off, sending a gift reads and writes nothing here.
 */

/** The account as enrolment sees it: its row, and whether it ever paid on the site. Two small reads; throws when either fails. */
export async function readIdeaAccount(db: SupabaseClient<Database>, userId: string): Promise<IdeaAccount> {
  const [row, paid] = await Promise.all([
    db.from("monthly_ideas").select("basis, off_at").eq("user_id", userId).maybeSingle(),
    db.from("purchases").select("id").eq("user_id", userId).eq("status", "paid").or("store.is.null,store.eq.stripe").limit(1),
  ]);
  if (row.error) throw new Error(`monthly idea: ${row.error.message}`);
  if (paid.error) throw new Error(`monthly idea purchases: ${paid.error.message}`);
  return { row: row.data ? { basis: row.data.basis, offAt: row.data.off_at } : null, customer: (paid.data ?? []).length > 0 };
}

/**
 * Writes a new row (with the sentence they were shown, or the Terms sentence they ticked, word for
 * word) or moves an existing one's day to this gift's, and returns the line the share screen shows.
 * A stopped row is never touched: off survives another gift.
 */
export async function enrolForIdeas(
  db: SupabaseClient<Database>,
  args: { userId: string; basis: IdeaBasis; fresh: boolean; since: Ymd; templateSlug: string; locale: "en" | "es" },
): Promise<string> {
  const t = await getTranslations({ locale: args.locale, namespace: "offerEmails" });
  if (args.fresh) {
    const wording = args.basis === "terms" ? String(t.raw("ideaTerms")).replace(/<\/?terms>/g, "") : t("ideaLine");
    const { error } = await db.from("monthly_ideas").insert({ user_id: args.userId, since: args.since, template_slug: args.templateSlug, locale: args.locale, basis: args.basis, wording });
    if (error) throw new Error(`monthly idea not started: ${error.message}`);
  } else {
    const { error } = await db.from("monthly_ideas").update({ since: args.since, template_slug: args.templateSlug, locale: args.locale }).eq("user_id", args.userId).is("off_at", null);
    if (error) throw new Error(`monthly idea not moved: ${error.message}`);
  }
  return t("ideaLine");
}
