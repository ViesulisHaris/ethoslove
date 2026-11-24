import type { Metadata } from "next";
import { headers } from "next/headers";
import { Plus } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { isConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listMyGifts, listPaidUnsent } from "@/lib/gift/dashboard";
import { Button } from "@/components/ui/button";
import { NotConnected } from "@/components/app/not-connected";
import { GiftCard } from "@/components/dashboard/gift-card";
import { UnsentGift } from "@/components/dashboard/unsent-gift";
import { GiftsReady } from "@/components/dashboard/gifts-ready";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { readyGifts } from "@/lib/commerce/gift-credits";
import { nextDays, todayIn, type NextDay } from "@/lib/lifecycle/next-days";
import type { ReminderOccasion } from "@/lib/lifecycle/reminders";

/**
 * Gifts ready (two more gifts) and the next two days the account knows of, read with the visitor's
 * own session: nothing when there are none, or before migration 0024 (readyGifts reads null). The
 * days are counted from the visitor's own date (their timezone, as Vercel tells it), as the share
 * screen's card counts them in the browser.
 */
async function visitorToday(): Promise<Date> {
  return todayIn((await headers()).get("x-vercel-ip-timezone"));
}

async function readyStrip(userId: string): Promise<{ count: number; days: NextDay[] }> {
  const db = await getSupabaseServerClient();
  if (!db) return { count: 0, days: [] };
  const count = (await readyGifts(db, userId)) ?? 0;
  if (count === 0) return { count, days: [] };
  const { data } = await db.from("reminders").select("recipient_name, occasion, month, day").eq("user_id", userId);
  const saved = (data ?? []).map((r) => ({ recipientName: r.recipient_name, occasion: r.occasion as ReminderOccasion, month: r.month, day: r.day }));
  return { count, days: nextDays(await visitorToday(), saved, null) };
}

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/dashboard">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "dashboard" });
  return { title: t("title"), robots: { index: false } };
}

export default async function DashboardPage({ params, searchParams }: PageProps<"/[currency]/[locale]/dashboard">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("dashboard");
  const user = await getCurrentUser();
  const [gifts, paidUnsent, ready] = user ? await Promise.all([listMyGifts(user.id), listPaidUnsent(user.id), readyStrip(user.id)]) : [[], [], { count: 0, days: [] }];
  // Development only (NODE_ENV is inlined at build): ?unsent=<template> draws the card without a
  // purchase, and ?ready=<n> the strip of gifts ready without any.
  const query = process.env.NODE_ENV === "development" ? await searchParams : {};
  const preview = query.unsent;
  const readyPreview = Number(typeof query.ready === "string" ? query.ready : NaN);
  const strip = Number.isInteger(readyPreview) && readyPreview > 0 ? { count: readyPreview, days: nextDays(await visitorToday(), [], null) } : ready;
  const unsent = typeof preview === "string" && preview ? [preview] : paidUnsent;

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="display-lg">{t("title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
        </div>
        <Button asChild className="rounded-full">
          <Link href="/templates">
            <Plus className="size-4" />
            {t("newGift")}
          </Link>
        </Button>
      </div>
      {!isConfigured.supabase ? <NotConnected /> : null}
      {/* Gifts already paid for and not made yet: above the list, where the next one starts. */}
      <GiftsReady count={strip.count} days={strip.days} />
      {/* Paid for, not sent yet: first, and in place of "you haven't made a gift yet". */}
      {unsent.length > 0 ? (
        <div className="mt-10 grid gap-4">
          {unsent.map((slug) => (
            <UnsentGift key={slug} slug={slug} />
          ))}
        </div>
      ) : null}
      {gifts.length === 0 && unsent.length > 0 ? null : gifts.length === 0 ? (
        <div className="mt-12 flex flex-col items-center justify-center rounded-3xl border border-dashed border-border py-20 text-center">
          <p className="font-display text-2xl">{t("empty")}</p>
          <p className="mt-2 max-w-sm text-sm text-muted-foreground">{t("emptyBlurb")}</p>
          <Button asChild variant="outline" className="mt-6 rounded-full">
            <Link href="/templates">{t("emptyCta")}</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {gifts.map((g) => (
            <GiftCard key={g.id} gift={g} />
          ))}
        </div>
      )}
    </div>
  );
}
