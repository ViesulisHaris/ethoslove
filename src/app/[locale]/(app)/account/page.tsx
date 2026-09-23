import type { Metadata } from "next";
import { Bell, ChevronRight, Gift, RotateCcw, Sparkles } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import type { GiftLocale } from "@/lib/gift/schema";
import { isConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/get-user";
import { listMyPurchases } from "@/lib/gift/dashboard";
import { EVERY_PACK, EVERY_TEMPLATE, PRODUCTS, currencyFor, formatAmount, isProductId, type Currency } from "@/lib/pricing/products";
import { PACK_NAMES, isPackId } from "@/lib/games/packs";
import { DAY_MS, inviteUrl } from "@/lib/commerce/db";
import { summarisePass, upgradeOffer } from "@/lib/commerce/entitlements";
import { passesOf } from "@/lib/commerce/passes";
import { splitUnlocks } from "@/lib/commerce/unlocks";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getManifest } from "@/templates/manifests";
import { Link } from "@/i18n/navigation";
import { NotConnected } from "@/components/app/not-connected";
import { DangerZone } from "@/components/dashboard/danger-zone";
import { InviteLink } from "@/components/pricing/invite-link";
import { UpgradeButton } from "@/components/pricing/upgrade-button";
import { Button } from "@/components/ui/button";

/** Inside this many days of its end, the pass section offers the renewal. */
const RENEW_WITHIN_DAYS = 30;

/**
 * Purchases, unlocks and the pass, split the way checkout sees them (lib/commerce): what a pass lends
 * ends with it, so it is labelled apart from what was bought outright, and it doesn't stop the
 * upgrade being offered.
 */
async function loadAccount(userId: string, lang: "en" | "es", currency: Currency) {
  const { purchases, unlocks } = await listMyPurchases(userId);
  const supabase = await getSupabaseServerClient();
  // The codes they bought, so one is never lost with the email it came in (RLS: the buyer's own).
  const [passes, { data: giftCards }] = supabase
    ? await Promise.all([
        passesOf(supabase, userId),
        supabase.from("gift_cards").select("id, code, recipient_name, redeemed_at, expires_at").eq("buyer_user_id", userId).order("created_at", { ascending: false }),
      ])
    : [[], { data: null }];
  const now = Date.now();
  const pass = summarisePass(passes, userId, now, (code) => inviteUrl(code, lang));
  const { forever, lent } = splitUnlocks(unlocks, passes.map((p) => p.purchase_id));
  return {
    purchases,
    forever,
    lent,
    pass,
    giftCards: giftCards ?? [],
    daysLeft: pass ? Math.max(0, Math.ceil((Date.parse(pass.endsAt) - now) / DAY_MS)) : null,
    upgrade: upgradeOffer(forever, purchases, currency),
  };
}

export async function generateMetadata({ params }: Omit<PageProps<"/[locale]/account">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "account" });
  return { title: t("title"), robots: { index: false } };
}

export default async function AccountPage({ params }: PageProps<"/[locale]/account">) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("account");
  const tm = await getTranslations("money");
  const user = await getCurrentUser();
  const l = locale as GiftLocale;
  const lang = locale === "es" ? "es" : "en";
  const currency: Currency = currencyFor(locale === "es" ? "ES" : "US");
  const { purchases, forever, lent, pass, giftCards, daysLeft, upgrade } = user
    ? await loadAccount(user.id, lang, currency)
    : { purchases: [], forever: [], lent: [], pass: null, giftCards: [], daysLeft: null, upgrade: null };
  const fmt = new Intl.DateTimeFormat(locale, { dateStyle: "medium" });
  const longDate = (iso: string) => new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(iso));

  const templateChips = [...forever.map((slug) => ({ slug, lent: false })), ...lent.map((slug) => ({ slug, lent: true }))]
    .filter(({ slug }) => !slug.startsWith("pack:"))
    .map(({ slug, lent: viaPass }) =>
      slug === EVERY_TEMPLATE ? (viaPass ? tm("account.everythingWithPass") : t("everything")) : (getManifest(slug)?.name[l] ?? slug),
    );
  const packName = (row: string) => {
    const id = row.slice("pack:".length);
    return isPackId(id) ? PACK_NAMES[id][lang] : null;
  };
  const packRows = [...forever, ...lent].filter((slug) => slug.startsWith("pack:"));
  const packChips = packRows.includes(EVERY_PACK) ? [tm("account.everyPack")] : packRows.map(packName).filter((name): name is string => Boolean(name));

  const productLabel = (p: (typeof purchases)[number]) => {
    const name = isProductId(p.product) ? tm(`product.${p.product}`) : p.product;
    const label = p.kind === "bump" ? tm("product.withBump", { product: name }) : name;
    // What was picked, where there is something to name: the template, the three, the pack.
    const picked = p.template_slugs.map((slug) => (slug.startsWith("pack:") ? packName(slug) : (getManifest(slug)?.name[l] ?? null))).filter(Boolean);
    return picked.length ? `${label} · ${picked.join(", ")}` : label;
  };

  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-10">
      <h1 className="display-lg">{t("title")}</h1>
      <p className="mt-2 text-muted-foreground">{t("subtitle")}</p>
      {!isConfigured.supabase ? <NotConnected /> : null}
      {user ? (
        <>
          <section className="mt-10 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t("profile")}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{t("signedInAs", { email: user.email ?? "" })}</p>
          </section>

          {pass ? (
            <section id="for-two" className="relative mt-6 overflow-hidden rounded-2xl bg-forest p-6 text-cream" data-testid="account-pass">
              <span className="pointer-events-none absolute -top-16 -right-16 size-48 rounded-full bg-rose/30 blur-3xl" aria-hidden="true" />
              <p className="relative text-eyebrow text-blush">{tm("account.passTitle")}</p>
              <p className="relative mt-2 font-display text-2xl">
                {pass.isOwner ? tm("account.passActive", { date: longDate(pass.endsAt) }) : tm("account.passAsPartner", { date: longDate(pass.endsAt) })}
              </p>
              {pass.isOwner ? (
                pass.partnerJoined ? (
                  <p className="relative mt-2 text-sm text-cream/80">{tm("account.passPartnerJoined")}</p>
                ) : pass.inviteUrl ? (
                  <>
                    <p className="relative mt-2 text-sm text-cream/80">{tm("account.passWaiting")}</p>
                    <InviteLink url={pass.inviteUrl} tone="dark" className="relative mt-4 max-w-md" />
                  </>
                ) : null
              ) : null}
              {pass.isOwner && daysLeft !== null && daysLeft <= RENEW_WITHIN_DAYS ? (
                <div className="relative mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white/10 p-4">
                  <p className="min-w-0 flex-1 text-sm text-cream/90">{tm("account.passEndingSoon", { days: daysLeft })}</p>
                  <Link href="/pricing?renew=pass" className="btn-rose inline-flex h-11 shrink-0 items-center rounded-full px-5 text-sm font-semibold">
                    {tm("account.passRenew", { price: formatAmount(PRODUCTS.pass.amounts[currency], currency, locale) })}
                  </Link>
                </div>
              ) : null}
            </section>
          ) : null}

          {upgrade ? (
            <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-coral/30 bg-coral/5 p-6" data-testid="account-upgrade">
              <div className="min-w-0 flex-1 basis-64">
                <h2 className="font-display text-xl">{tm("account.upgradeTitle")}</h2>
                <p className="mt-1 text-sm text-ink-soft">{tm("account.upgradeBlurb", { price: formatAmount(upgrade.amount, upgrade.currency, locale) })}</p>
              </div>
              <UpgradeButton currency={upgrade.currency} returnTo="/account" label={tm("account.upgradeCta", { price: formatAmount(upgrade.amount, upgrade.currency, locale) })} />
            </section>
          ) : null}

          <section className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t("unlocks")}</h2>
            {templateChips.length === 0 ? (
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">{t("noUnlocks")}</p>
                <Button asChild variant="outline" className="h-11 rounded-full px-5"><Link href="/pricing">{t("seePricing")}</Link></Button>
              </div>
            ) : (
              <ul className="mt-3 flex flex-wrap gap-2">
                {templateChips.map((label) => (
                  <li key={label} className="rounded-full border border-gold/60 bg-gold/10 px-3 py-1.5 text-sm">
                    {label}
                  </li>
                ))}
              </ul>
            )}
            {packChips.length ? (
              <>
                <h3 className="mt-5 text-eyebrow text-ink-soft">{tm("account.packs")}</h3>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {packChips.map((label) => (
                    <li key={label} className="rounded-full border border-lilac/30 bg-lilac-soft px-3 py-1.5 text-sm text-lilac">
                      {label}
                    </li>
                  ))}
                </ul>
              </>
            ) : null}
          </section>

          {!pass ? (
            <section className="mt-6 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border bg-card p-6">
              <div className="min-w-0 flex-1 basis-64">
                <h2 className="flex items-center gap-2 font-display text-xl">
                  <Sparkles aria-hidden="true" className="size-4 text-rose" />
                  {tm("account.passTitle")}
                </h2>
                <p className="mt-1 text-sm text-muted-foreground">{tm("account.passNone", { price: formatAmount(PRODUCTS.pass.amounts[currency], currency, locale) })}</p>
              </div>
              <Button asChild variant="outline" className="h-11 rounded-full px-5">
                <Link href="/pricing#for-two">{tm("account.passSee")}</Link>
              </Button>
            </section>
          ) : null}

          <section className="mt-6 rounded-2xl border border-border bg-card p-6">
            <h2 className="font-display text-xl">{t("purchases")}</h2>
            {purchases.length === 0 ? (
              <p className="mt-2 text-sm text-muted-foreground">{t("noPurchases")}</p>
            ) : (
              <ul className="mt-3 divide-y divide-border text-sm">
                {purchases.map((p) => (
                  <li key={p.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                    <span className="min-w-0">
                      <span className="font-medium">{productLabel(p)}</span>
                      <span className="ml-2 text-muted-foreground">{fmt.format(new Date(p.created_at))}</span>
                    </span>
                    <span className="tabular-nums">
                      {formatAmount(p.amount, p.currency as Currency, locale)} · {t(`purchaseStatus.${p.status}`)}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {giftCards.length ? (
            <section className="mt-6 rounded-2xl border border-border bg-card p-6" data-testid="account-gift-cards">
              <h2 className="font-display text-xl">{tm("account.giftCards")}</h2>
              <ul className="mt-3 divide-y divide-border text-sm">
                {giftCards.map((card) => (
                  <li key={card.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3">
                    <span className="min-w-0">
                      <span className="font-mono tracking-wider select-all">{card.code}</span>
                      {card.recipient_name ? <span className="ml-2 text-muted-foreground">{tm("account.giftCardFor", { name: card.recipient_name })}</span> : null}
                    </span>
                    <span className="text-muted-foreground">
                      {card.redeemed_at
                        ? tm("account.giftCardRedeemed")
                        : card.expires_at
                          ? tm("account.giftCardOpen", { date: fmt.format(new Date(card.expires_at)) })
                          : tm("account.giftCardOpenNoDate")}
                    </span>
                  </li>
                ))}
              </ul>
            </section>
          ) : null}

          <section className="mt-6 rounded-2xl border border-border bg-card p-2">
            <h2 className="sr-only">{tm("account.more")}</h2>
            <ul className="divide-y divide-border">
              <li>
                <Link href="/account/reminders" className="flex min-h-16 items-center gap-4 rounded-xl px-4 py-3 hover:bg-muted/60">
                  <Bell aria-hidden="true" className="size-5 shrink-0 text-coral" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{tm("account.reminders")}</span>
                    <span className="block text-sm text-muted-foreground">{tm("account.remindersBlurb")}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
              <li>
                <Link href="/redeem" className="flex min-h-16 items-center gap-4 rounded-xl px-4 py-3 hover:bg-muted/60">
                  <Gift aria-hidden="true" className="size-5 shrink-0 text-rose" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{tm("account.redeem")}</span>
                    <span className="block text-sm text-muted-foreground">{tm("account.redeemBlurb")}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
              {/* The EU withdrawal function (Consumer Rights Directive art. 11a): how to cancel where the right still applies. */}
              <li>
                <Link href="/legal/withdraw" className="flex min-h-16 items-center gap-4 rounded-xl px-4 py-3 hover:bg-muted/60" data-testid="account-withdraw">
                  <RotateCcw aria-hidden="true" className="size-5 shrink-0 text-ink-soft" />
                  <span className="min-w-0 flex-1">
                    <span className="block font-medium">{tm("account.withdraw")}</span>
                    <span className="block text-sm text-muted-foreground">{tm("account.withdrawBlurb")}</span>
                  </span>
                  <ChevronRight aria-hidden="true" className="size-4 shrink-0 text-muted-foreground" />
                </Link>
              </li>
            </ul>
          </section>

          <DangerZone email={user.email ?? ""} />
        </>
      ) : null}
    </div>
  );
}
