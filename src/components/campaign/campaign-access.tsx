"use client";

import { useEffect, useId, useState, type FormEvent } from "react";
import Image from "next/image";
import { ArrowRight, Check, Loader2, Lock } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { errorOf, postJson } from "@/components/pricing/requests";
import { BRAND } from "@/config/brand";
import { CAMPAIGN_GIFT_LIMIT } from "@/lib/commerce/campaign-rules";

export type CampaignTemplateCard = { slug: string; name: string; tagline: string; poster: string };

type Status = { state: "active" | "ended" | "revoked"; grantedAt: string; endsAt: string | null; published: number; left: number };
type Loaded = { signedIn: boolean; campaign: Status | null };
type ErrorKey = "wrong" | "tooMany" | "accounts" | "signIn" | "generic";

const errorKey = (error: string | undefined, status: number): ErrorKey =>
  error === "wrong_password" ? "wrong" : error === "too_many_accounts" ? "accounts" : status === 429 ? "tooMany" : status === 401 ? "signIn" : "generic";

/**
 * The creator campaign's secret page: sign in, type the password from the brief, and the four
 * campaign templates open on the account for a few days (lib/commerce/campaign-rules.ts). Every
 * rule is held by the server; this page only explains them.
 */
export function CampaignAccess({ templates }: { templates: CampaignTemplateCard[] }) {
  const t = useTranslations("campaign");
  const locale = useLocale();
  const id = useId();
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<ErrorKey | null>(null);
  // Bumped to look again (the session ran out between loading the page and pressing the button).
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let alive = true;
    fetch("/api/campaign", { credentials: "same-origin", cache: "no-store" })
      .then((res) => res.json() as Promise<Loaded>)
      .then((data) => alive && setLoaded(data))
      .catch(() => alive && setLoaded({ signedIn: false, campaign: null }));
    return () => {
      alive = false;
    };
  }, [version]);

  const unlock = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const result = await postJson("/api/campaign", { password });
    setBusy(false);
    if (result.ok && result.json.campaign) return setLoaded({ signedIn: true, campaign: result.json.campaign as Status });
    const key = errorKey(errorOf(result), result.status);
    setError(key);
    // The session ran out between loading the page and pressing the button: show the sign-in.
    if (key === "signIn") setVersion((v) => v + 1);
  };

  if (!loaded)
    return (
      <div className="grid h-40 place-items-center rounded-[28px] bg-white shadow-soft ring-1 ring-forest/5" aria-busy="true">
        <Loader2 aria-hidden="true" className="size-5 animate-spin text-forest/50" />
      </div>
    );

  if (!loaded.signedIn)
    return (
      <section className="rounded-[28px] border border-line bg-card p-6 sm:p-8" data-testid="campaign-sign-in">
        <h2 className="font-display text-2xl">{t("signInTitle")}</h2>
        <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("signInBlurb")}</p>
        <AuthForm mode="login" next="/campaign" compact />
      </section>
    );

  const campaign = loaded.campaign;
  if (campaign?.state === "ended" || campaign?.state === "revoked")
    return (
      <div className="rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-forest/5 sm:p-10" data-testid={`campaign-${campaign.state}`}>
        <h2 className="font-display text-3xl text-forest">{t(`${campaign.state}.title`)}</h2>
        <p className="mt-2 text-[15px] text-forest/70">{t(`${campaign.state}.detail`, { email: BRAND.supportEmail })}</p>
      </div>
    );

  if (campaign?.state === "active") {
    const until = campaign.endsAt
      ? t("active.until", { date: new Intl.DateTimeFormat(locale, { dateStyle: "long", timeStyle: "short" }).format(new Date(campaign.endsAt)) })
      : t("active.noEnd");
    return (
      <div className="grid gap-6" data-testid="campaign-active">
        <div className="rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-forest/5 sm:p-8">
          <span className="grid size-12 place-items-center rounded-full bg-moss/10">
            <Check aria-hidden="true" className="size-5 text-moss" />
          </span>
          <h2 className="mt-4 font-display text-3xl text-forest">{t("active.title")}</h2>
          <p className="mt-2 text-[15px] text-forest/80">
            {until} {t("active.left", { left: campaign.left, limit: CAMPAIGN_GIFT_LIMIT })}
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2">
          {templates.map((template) => (
            <li key={template.slug} className="flex flex-col overflow-hidden rounded-[24px] bg-white shadow-soft ring-1 ring-forest/5">
              <div className="relative aspect-[390/480] bg-ink/10">
                <Image src={template.poster} alt="" fill sizes="(min-width: 640px) 360px, 100vw" className="object-cover object-top" />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <h3 className="font-display text-2xl">{template.name}</h3>
                <p className="mt-1 flex-1 text-sm text-muted-foreground">{template.tagline}</p>
                {campaign.left > 0 ? (
                  <Button asChild className="mt-4 h-11 rounded-full">
                    <Link href={`/create/${template.slug}`} data-testid={`campaign-make-${template.slug}`}>
                      {t("active.make")}
                      <ArrowRight aria-hidden="true" className="size-4" />
                    </Link>
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>

        <section className="rounded-[28px] border border-line bg-card p-6 sm:p-8">
          <h2 className="font-display text-2xl">{t("active.rulesTitle")}</h2>
          <ul className="mt-3 grid gap-2 text-[15px] text-forest/80">
            {(["footer", "extras", "stays", "once"] as const).map((rule) => (
              <li key={rule} className="flex gap-2">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-rose" />
                {t(`active.rules.${rule}`)}
              </li>
            ))}
          </ul>
        </section>
      </div>
    );
  }

  return (
    <form onSubmit={unlock} className="rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-forest/5 sm:p-8" data-testid="campaign-form">
      <label htmlFor={id} className="flex items-center gap-2 text-sm font-medium text-forest">
        <Lock aria-hidden="true" className="size-4" />
        {t("passwordLabel")}
      </label>
      <input
        id={id}
        type="password"
        value={password}
        onChange={(e) => {
          setPassword(e.target.value);
          if (error) setError(null);
        }}
        placeholder={t("passwordPlaceholder")}
        autoComplete="off"
        maxLength={100}
        required
        aria-invalid={error !== null}
        aria-describedby={error ? `${id}-error` : undefined}
        className="mt-2 h-14 w-full rounded-2xl border border-border bg-paper px-5 text-lg text-forest outline-none focus:border-ink aria-invalid:border-coral"
      />
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-coral-deep">
          {t(`errors.${error}`)}
        </p>
      ) : null}
      <Button type="submit" disabled={busy || password.trim().length === 0} className="mt-5 h-12 w-full rounded-full text-[15px]" data-testid="campaign-submit">
        {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
        {busy ? t("unlocking") : t("unlock")}
      </Button>
    </form>
  );
}
