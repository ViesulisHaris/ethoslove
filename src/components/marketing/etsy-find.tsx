"use client";

import { useState } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import { getManifest } from "@/templates/manifests";
import { track } from "@/lib/analytics/track";
import { rememberEtsyOrder } from "@/lib/etsy/order-memory";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const ERRORS = new Set(["invalid_input", "order_not_found", "not_paid", "refunded", "rate_limited", "etsy_unavailable"]);

/**
 * "Bought on Etsy?" with nothing but the order number: asks which gift it is for (api/etsy/find) and
 * opens that gift's editor, the number kept for its "Bought on Etsy" box. An order of several gifts
 * offers each one.
 */
export function EtsyFind({ locale }: { locale: GiftLocale }) {
  const t = useTranslations("etsyFind");
  const router = useRouter();
  const [order, setOrder] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [choices, setChoices] = useState<string[]>([]);
  const name = (slug: string) => getManifest(slug)?.name[locale] ?? slug;

  const open = (slug: string) => {
    rememberEtsyOrder(order);
    router.push(`/create/${slug}?etsy=1`);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setProblem(null);
    setChoices([]);
    let answer: { templates?: string[]; error?: string };
    try {
      const res = await fetch("/api/etsy/find", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ order }) });
      answer = await res.json().catch(() => ({ error: "failed" }));
    } catch {
      answer = { error: "failed" };
    }
    const templates = answer.templates ?? [];
    if (templates.length > 0) track("etsy_found", { templates: templates.length });
    if (templates.length === 1) return open(templates[0]);
    setBusy(false);
    if (templates.length > 1) setChoices(templates);
    else setProblem(t(`errors.${ERRORS.has(answer.error ?? "") ? answer.error : "failed"}` as "errors.failed"));
  };

  return (
    <div data-testid="etsy-find">
      <form onSubmit={submit} className="grid gap-3">
        <label className="grid gap-1.5 text-sm font-medium">
          {t("order")}
          <Input
            value={order}
            onChange={(e) => setOrder(e.target.value)}
            inputMode="numeric"
            autoComplete="off"
            placeholder="3456789012"
            required
            className="h-12 text-base"
            data-testid="etsy-find-order"
          />
          <span className="text-xs font-normal text-muted-foreground">{t("orderHint")}</span>
        </label>
        {problem ? (
          <p role="alert" className="rounded-lg bg-blush/40 px-3 py-2.5 text-sm text-ink" data-testid="etsy-find-problem">
            {problem}
          </p>
        ) : null}
        <Button type="submit" className="h-12 w-full rounded-full text-base" disabled={busy} data-testid="etsy-find-submit">
          {busy ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
          <span>{busy ? t("checking") : t("submit")}</span>
          {busy ? null : <ArrowRight aria-hidden="true" className="size-4" />}
        </Button>
      </form>
      {choices.length > 0 ? (
        <div className="mt-5 grid gap-2" data-testid="etsy-find-choices">
          <p className="text-sm text-ink-soft">{t("pick")}</p>
          {choices.map((slug) => (
            <Button key={slug} type="button" variant="outline" className="h-12 w-full rounded-full border-ink text-base" onClick={() => open(slug)}>
              {t("make", { template: name(slug) })}
            </Button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
