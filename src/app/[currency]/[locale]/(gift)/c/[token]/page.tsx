import { cache } from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { setRequestLocale } from "next-intl/server";
import type { Db } from "@/lib/commerce/db";
import { ContributeForm } from "@/components/group/contribute-form";
import { KeptNoteGate } from "@/components/group/kept-gate";
import { groupGiftsEnabled } from "@/lib/group/flag";
import { GroupUnavailableError, groupByToken, linkState, type GroupRow, type LinkState } from "@/lib/group/store";
import { isGroupToken } from "@/lib/group/token";
import { linkSecret } from "@/lib/lifecycle/links";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

/**
 * The group behind a link, and what the link is right now (taking notes, full, closed by its
 * sender, past its last day, or sent); null for anything that isn't one. Off
 * (the switch), a token of the wrong shape, a link that was reset, and a database without migration
 * 0023 all read the same from outside: there is no such page (a 404, drawn by not-found.tsx beside
 * this file: the site's own while group cards are off, one line on what to do once they are on).
 */
const groupAt = cache(async (token: string): Promise<{ group: GroupRow; state: LinkState } | null> => {
  if (!groupGiftsEnabled() || !isGroupToken(token)) return null;
  const admin = getSupabaseAdminClient() as Db | null;
  if (!admin || !linkSecret()) return null;
  try {
    const group = await groupByToken(admin, token);
    return group ? { group, state: await linkState(admin, group, Date.now()) } : null;
  } catch (error) {
    if (error instanceof GroupUnavailableError) return null;
    throw error;
  }
});

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/c/[token]">, "searchParams">): Promise<Metadata> {
  const { token } = await params;
  const found = await groupAt(token);
  const es = found?.group.locale === "es";
  return {
    title: es ? "Añade tu nota a la tarjeta en grupo" : "Add your note to the group card",
    // Never indexed, never followed, and the address (which is the key to the page) is never sent on as a referrer.
    robots: { index: false, follow: false },
    referrer: "no-referrer",
  };
}

/**
 * The page at a group card's link, https://tryethos.io/c/<token>: where the people the sender
 * invited add a name, a note and maybe a photo, with no account. The address has no language in it
 * and names no gift (src/proxy.ts sends /c/* here without redirecting, as it does /g/*); the page
 * speaks the card's own language. No site chrome, no price, nothing to pay, and no analytics beyond
 * the cookieless page count, which sees the address as /c/[token] (components/shared/analytics.tsx).
 */
export default async function ContributePage({ params }: PageProps<"/[currency]/[locale]/c/[token]">) {
  const { locale, token } = await params;
  setRequestLocale(locale);
  const found = await groupAt(token);
  if (!found) notFound();
  const { group, state } = found;
  return (
    <>
      <KeptNoteGate token={token} />
      <ContributeForm
        token={token}
        state={state}
        locale={group.locale === "es" ? "es" : "en"}
        fromName={group.from_name}
        forName={group.for_name}
        prompt={group.prompt}
        noteMax={group.note_max}
        takesPhotos={group.takes_photos}
        reportRef={group.report_ref}
      />
    </>
  );
}
