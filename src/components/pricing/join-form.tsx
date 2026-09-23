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
 * pass the link belongs to. A link that lost its code can be pasted back in whole.
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
  // Already in on somebody's pass (this one, most likely, opened again): nothing left to do.
  const alreadyIn = data?.pass && !data.pass.isOwner ? { endsAt: data.pass.endsAt } : null;
  const done = joined ?? alreadyIn;

  const join = async () => {
    if (!code) return setError("notFound");
    setBusy(true);
    setError(null);
    const result = await postJson("/api/for-two/join", { code });
    setBusy(false);
    if (result.ok && result.json.ok !== false) {
      setJoined({ endsAt: typeof result.json.endsAt === "string" ? result.json.endsAt : null });
      setVersion((v) => v + 1);
      return;
    }
    const key = joinErrorKey(errorOf(result), result.status);
    setError(key);
    if (key === "signIn") setVersion((v) => v + 1);
  };

  if (done) {
    const endsAt = done.endsAt ?? data?.pass?.endsAt ?? null;
    return (
      <div className="rounded-[28px] bg-forest p-6 text-center text-cream shadow-lift sm:p-10" data-testid="join-done">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-white/10">
          <Check aria-hidden="true" className="size-6 text-blush" />
        </span>
        <h2 className="mt-5 font-display text-3xl">{t("done.title")}</h2>
        <p className="mt-2 text-[15px] text-cream/80">
          {endsAt ? t("done.detail", { date: new Intl.DateTimeFormat(locale, { dateStyle: "long" }).format(new Date(endsAt)) }) : t("done.detailNoDate")}
        </p>
        <div className="mt-7 grid gap-2 sm:grid-cols-2">
          <Link href="/templates" className="btn-rose inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold">
            {t("done.ctaGift")}
            <ArrowRight aria-hidden="true" className="size-4" />
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
          className="btn-rose inline-flex h-12 w-full items-center justify-center gap-2 rounded-full px-6 text-[15px] font-semibold disabled:opacity-60"
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
