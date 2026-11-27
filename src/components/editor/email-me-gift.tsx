"use client";

import { useState, type FormEvent } from "react";
import { useTranslations } from "next-intl";
import { Check, Loader2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { emailMeGiftOn } from "@/lib/lifecycle/later-flag";

/**
 * "Not ready to send? Email me this gift": under a guest's pay panel, for whoever leaves at the
 * price. One field; the address gets one email with a link back to this template's editor
 * (api/gift/later). The gift itself stays on this device: nothing of it is sent anywhere, and the
 * small print says what opening the link does. Drawn only while NEXT_PUBLIC_EMAIL_ME_GIFT is 1.
 */
export function EmailMeGift({ slug, locale }: { slug: string; locale: "en" | "es" }) {
  const t = useTranslations("editor.publishSheet.later");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "sent" | "failed" | "limited">("idle");
  if (!emailMeGiftOn()) return null;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (state === "sending" || !email.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/gift/later", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ email: email.trim(), slug, locale }) });
      // Counted from the requests to the route itself (POST /api/gift/later), not as an analytics event.
      setState(res.ok ? "sent" : res.status === 429 ? "limited" : "failed");
    } catch {
      setState("failed");
    }
  };

  if (!open)
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="mt-1 min-h-11 w-full text-center text-sm text-muted-foreground underline-offset-4 hover:text-ink hover:underline"
        data-testid="email-me-gift-link"
      >
        {t("link")}
      </button>
    );

  if (state === "sent")
    return (
      <p role="status" className="mt-4 flex items-start gap-2 rounded-xl border border-line bg-card p-4 text-sm text-ink" data-testid="email-me-gift-sent">
        <Check aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-coral" />
        <span>{t("sent")}</span>
      </p>
    );

  return (
    <form onSubmit={submit} className="mt-4 rounded-xl border border-line bg-card p-4" data-testid="email-me-gift">
      <p className="font-display text-lg">{t("title")}</p>
      <p className="mt-1 text-sm text-muted-foreground">{t("blurb")}</p>
      <div className="mt-3 flex gap-2">
        <Input
          type="email"
          inputMode="email"
          autoComplete="email"
          required
          maxLength={254}
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state !== "idle") setState("idle");
          }}
          placeholder={t("placeholder")}
          aria-label={t("label")}
          className="h-11 min-w-0 flex-1"
        />
        <Button type="submit" className="h-11 shrink-0 rounded-full px-5" disabled={state === "sending"}>
          {state === "sending" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          <span>{t("send")}</span>
        </Button>
      </div>
      {state === "failed" || state === "limited" ? (
        <p role="alert" className="mt-2 text-sm text-ink">
          {t(state)}
        </p>
      ) : null}
      <p className="mt-3 text-xs leading-relaxed text-muted-foreground">
        {t("small")}{" "}
        <Link href="/legal/privacy" className="underline underline-offset-2">
          {t("privacy")}
        </Link>
      </p>
    </form>
  );
}
