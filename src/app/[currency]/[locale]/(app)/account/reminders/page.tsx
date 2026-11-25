import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { isConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { MAX_REMINDERS, type Reminder } from "@/lib/lifecycle/reminders";
import type { MonthsaryView } from "@/lib/lifecycle/monthsaries";
import { Link } from "@/i18n/navigation";
import { NotConnected } from "@/components/app/not-connected";
import { ReminderList } from "@/components/reminders/reminder-list";
import { IdeaEmailsSwitch } from "@/components/reminders/idea-emails-switch";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/account/reminders">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "lifecycle.page" });
  return { title: t("title"), robots: { index: false } };
}

async function myReminders(): Promise<{ reminders: Reminder[]; monthsary: MonthsaryView | null; idea: { on: boolean } | null }> {
  const supabase = await getSupabaseServerClient();
  if (!supabase) return { reminders: [], monthsary: null, idea: null };
  // The signed-in person's own client: row-level security returns their reminders only. Before
  // migration 0016 there is no monthsaries table, and before 0022 no monthly_ideas: each reads as none.
  const [{ data }, { data: monthly }, { data: idea }] = await Promise.all([
    supabase.from("reminders").select("id, recipient_name, occasion, month, day, locale, template_slug").order("month").order("day").limit(MAX_REMINDERS),
    supabase.from("monthsaries").select("id, partner_name, since, locale").limit(1).maybeSingle(),
    supabase.from("monthly_ideas").select("off_at").maybeSingle(),
  ]);
  return {
    reminders: (data ?? []).map((r) => ({ id: r.id, recipientName: r.recipient_name, occasion: r.occasion, month: r.month, day: r.day, locale: r.locale, templateSlug: r.template_slug })),
    monthsary: monthly ? { id: monthly.id, partnerName: monthly.partner_name, since: monthly.since, locale: monthly.locale } : null,
    // The monthly idea's row (lib/lifecycle/monthly-idea.ts): its switch is shown only when there is one.
    idea: idea ? { on: idea.off_at === null } : null,
  };
}

export default async function RemindersPage({ params }: PageProps<"/[currency]/[locale]/account/reminders">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("lifecycle.page");
  const user = await getCurrentUser();
  const { reminders, monthsary, idea } = user ? await myReminders() : { reminders: [], monthsary: null, idea: null };

  return (
    <div className="mx-auto w-full max-w-2xl px-4 py-10 sm:px-6">
      <Link href="/account" className="inline-flex min-h-11 items-center gap-1.5 text-sm text-muted-foreground hover:text-ink">
        <ArrowLeft className="size-4" aria-hidden />
        {t("back")}
      </Link>
      <h1 className="mt-2 display-lg">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      {!isConfigured.supabase ? <NotConnected /> : null}
      {user ? <ReminderList initial={reminders} monthsary={monthsary} /> : null}
      {user && idea ? <IdeaEmailsSwitch initialOn={idea.on} /> : null}
    </div>
  );
}
