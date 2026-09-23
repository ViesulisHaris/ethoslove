"use client";

import { useId, useState, type FormEvent } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { normaliseGiftCardCode } from "@/lib/commerce/codes";
import { Link } from "@/i18n/navigation";
import { AuthForm } from "@/components/auth/auth-form";
import { Button } from "@/components/ui/button";
import { useEntitlements } from "./entitlements";
import { redeemErrorKey, type RedeemError } from "./offers";
import { errorOf, postJson } from "./requests";

/**
 * Redeeming "Give Everything": the code, then the account it goes on. Someone who isn't signed in
 * can type the code first; the sign-in underneath brings them back here with it still filled in.
 */
export function RedeemForm({ initialCode }: { initialCode: string }) {
  const t = useTranslations("money.redeem");
  const id = useId();
  const [version, setVersion] = useState(0);
  const { data, loaded } = useEntitlements(version);
  const [code, setCode] = useState(initialCode);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<RedeemError | null>(null);
  const [done, setDone] = useState(false);
  const signedIn = Boolean(data?.signedIn);

  const redeem = async (e: FormEvent) => {
    e.preventDefault();
    // A code that can't be one of ours is answered here, without a request.
    const normalized = normaliseGiftCardCode(code);
    if (!normalized) return setError("notFound");
    setBusy(true);
    setError(null);
    const result = await postJson("/api/gift-cards/redeem", { code: normalized });
    setBusy(false);
    if (result.ok && result.json.ok !== false) return setDone(true);
    const key = redeemErrorKey(errorOf(result), result.status);
    setError(key);
    // The session ran out between loading the page and pressing the button: show the sign-in.
    if (key === "signIn") setVersion((v) => v + 1);
  };

  if (done)
    return (
      <div className="rounded-[28px] bg-white p-6 text-center shadow-soft ring-1 ring-forest/5 sm:p-10" data-testid="redeem-done">
        <span className="mx-auto grid size-14 place-items-center rounded-full bg-moss/10">
          <Check aria-hidden="true" className="size-6 text-moss" />
        </span>
        <h2 className="mt-5 font-display text-3xl text-forest">{t("done.title")}</h2>
        <p className="mt-2 text-[15px] text-forest/70">{t("done.detail")}</p>
        <Button asChild className="mt-7 h-12 rounded-full px-6 text-[15px]">
          <Link href="/templates">
            {t("done.cta")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Button>
      </div>
    );

  return (
    <div className="grid gap-5">
      <form onSubmit={redeem} className="rounded-[28px] bg-white p-6 shadow-soft ring-1 ring-forest/5 sm:p-8" data-testid="redeem-form">
        <label htmlFor={id} className="text-sm font-medium text-forest">
          {t("label")}
        </label>
        <input
          id={id}
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            if (error) setError(null);
          }}
          placeholder={t("placeholder")}
          autoCapitalize="characters"
          autoComplete="off"
          autoCorrect="off"
          spellCheck={false}
          maxLength={32}
          required
          aria-invalid={error !== null}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-2 h-14 w-full rounded-2xl border border-border bg-paper px-5 font-mono text-lg tracking-[0.12em] text-forest uppercase outline-none placeholder:font-sans placeholder:tracking-normal placeholder:normal-case focus:border-ink aria-invalid:border-coral"
        />
        {error ? (
          <p id={`${id}-error`} role="alert" className="mt-2 text-sm text-coral-deep">
            {t(`errors.${error}`)}
          </p>
        ) : null}
        {!loaded || signedIn ? (
          <Button type="submit" disabled={busy || !loaded || code.trim().length === 0} className="mt-5 h-12 w-full rounded-full text-[15px]" data-testid="redeem-submit">
            {busy || !loaded ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {busy ? t("redeeming") : t("button")}
          </Button>
        ) : null}
      </form>

      {loaded && !signedIn ? (
        <section className="rounded-[28px] border border-line bg-card p-6 sm:p-8" data-testid="redeem-sign-in">
          <h2 className="font-display text-2xl">{t("signInTitle")}</h2>
          <p className="mt-1 mb-5 text-sm text-muted-foreground">{t("signInBlurb")}</p>
          <AuthForm mode="login" next={`/redeem${code.trim() ? `?code=${encodeURIComponent(code.trim())}` : ""}`} compact />
        </section>
      ) : null}
    </div>
  );
}
