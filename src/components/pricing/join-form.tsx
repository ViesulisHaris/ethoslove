"use client";

import { useId, useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { useEntitlements } from "./entitlements";
import { inviteCodeFrom, joinErrorKey, type JoinError } from "./offers";
import { errorOf, postJson } from "./requests";

/**
 * The partner's side of "Ethos for Two": sign in (or make an account), then one tap to join the
 * membership the link belongs to. A link that lost its code can be pasted back in whole. A
 * membership that renews by itself has no end date to promise, so "until {date}" is said only of
 * one that ends (a pass, or a subscription that was cancelled).
 */
export function JoinForm({ initialCode }: { initialCode: string | null }) {
  const t = useTranslations("money.join");
  const locale = useLocale();
  const id = useId();
  const [version, setVersion] = useState(0);
  const { data, loaded } = useEntitlements(version);
  const [typed, setTyped] = useState("");
  const code = initialCode ?? inviteCodeFrom(typed);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<JoinError | null>(null);
  const [joined, setJoined] = useState<{ endsAt: string | null } | null>(null);
  const signedIn = Boolean(data?.signedIn);
  // Already in on somebody's membership (this one, most likely, opened again): nothing left to do.
  const member = data?.membership;
  const alreadyIn =
    member && !member.isOwner && member.running
      ? { endsAt: member.renews ? null : (member.endsAt ?? member.periodEnd) }
      : data?.pass && !data.pass.isOwner && !member
        ? { endsAt: data.pass.endsAt }
        : null;
  const done = joined ?? alreadyIn;

  const join = async () => {
    if (!code) return setError("notFound");
    setBusy(true);
    setError(null);
    const result = await postJson("/api/for-two/join", { code });
    setBusy(false);
    if (result.ok && result.json.ok !== false) {
      // null while it renews by itself (POST /api/for-two/join: { ok, endsAt, renews }).
      setJoined({ endsAt: result.json.renews === true || typeof result.json.endsAt !== "string" ? null : result.json.endsAt });
      setVersion((v) => v + 1);
      return;
    }
    const key = joinErrorKey(errorOf(result), result.status);
    setError(key);
    if (key === "signIn") setVersion((v) => v + 1);
  };

  if (done) {
    const endsAt = done.endsAt;
    return (
      <div className="relative overflow-hidden rounded-[28px] bg-dusk-sky p-6 text-center text-cream shadow-lift ring-1 ring-starlight/25 sm:p-10" data-testid="join-done">
        <div aria-hidden="true" className="dusk-stars absolute inset-x-0 top-0 h-28 [mask-image:linear-gradient(180deg,#000,transparent)]" />
        <span className="relative mx-auto grid size-14 place-items-center rounded-full bg-starlight/15 ring-1 ring-starlight/40">
          <Check aria-hidden="true" className="size-6 text-starlight" strokeWidth={2.6} />
        </span>
        <h2 className="relative mt-5 font-display text-3xl">{t("done.title")}</h2>
        <p className="relative mt-2 text-[15px] text-moonlight/85">
          {endsAt ? t("done.detail", { date: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(endsAt)) }) : t("done.detailNoDate")}
        </p>
        <div className="relative mt-7 grid gap-2 sm:grid-cols-2">
          <Link href="/my-dates" className="btn-star inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold sm:col-span-2">
            {t("done.ctaDates")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
          <Link href="/templates" className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
            {t("done.ctaGift")}
          </Link>
          <Link href="/games" className="inline-flex h-12 items-center justify-center rounded-full border border-white/25 px-6 text-[15px] font-semibold text-cream hover:bg-white/10">
            {t("done.ctaGames")}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="grid gap-5">
      {!initialCode ? (
        <div className="rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-forest/5 sm:p-8">
          <p className="text-sm text-forest/75">{t("noCode")}</p>
          <label htmlFor={id} className="mt-4 block text-sm font-medium text-forest">
            {t("codeLabel")}
          </label>
          <input
            id={id}
            value={typed}
            onChange={(e) => {
              setTyped(e.target.value);
              if (error) setError(null);
            }}
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            className="mt-2 h-12 w-full rounded-2xl border border-border bg-paper px-4 font-mono text-base text-forest outline-none focus:border-ink"
            data-testid="join-code-input"
          />
        </div>
      ) : null}

      {error ? (
        <p role="alert" className="rounded-2xl border border-coral/40 bg-coral/5 p-4 text-sm text-ink" data-testid="join-error">
          {t(`errors.${error}`)}
        </p>
      ) : null}

      {!loaded ? (
        <div className="grid h-12 place-items-center">
          <Loader2 aria-hidden="true" className="size-5 animate-spin text-muted-foreground" />
        </div>
      ) : signedIn ? (
        <button
          type="button"
          onClick={join}
          disabled={busy || !code}
          className="btn-star inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold disabled:opacity-60"
          data-testid="join-submit"
        >
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          {busy ? t("joining") : t("button")}
        </button>
      ) : (
        <section className="rounded-[28px] border border-line bg-card p-6 sm:p-8" data-testid="join-sign-in">
          <h2 className="font-display text-2xl">{t("signInTitle")}</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("signInBlurb")}</p>
          <AuthForm mode="login" next={`/for-two/join${code ? `?code=${encodeURIComponent(code)}` : ""}`} compact />
        </section>
      )}
    </div>
  );
}
