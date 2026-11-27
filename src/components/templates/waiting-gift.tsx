"use client";

import { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import { cn } from "@/lib/utils";
import { findWaitingDraft, type WaitingDraft } from "@/lib/editor/waiting-draft";
import { filedUnder } from "./gallery-sort";

const HIDDEN_KEY = "ethos:waiting-gift-hidden";

/**
 * "Your Bouquet for Ana is waiting": a gift started on this phone and not sent, one tap from its
 * editor, on the front page, the gallery and the occasion pages. Drafts live on the device only
 * (lib/editor/persistence.ts), and nothing told a visitor who came back that theirs was still there.
 * The owner's yes of 27 Nov 2026 (docs/marketing/FUNNELS.md, D1).
 *
 * Read after the page has mounted, so the server's page and the first paint agree; the bar arrives a
 * moment later and takes no room until it does. A "not now" hides it for the rest of the visit.
 * Nothing leaves the phone: no email, no server.
 */
export function WaitingGift({ names, className }: { names: Record<string, string>; className?: string }) {
  const t = useTranslations("templates.waiting");
  const locale = useLocale();
  const [draft, setDraft] = useState<WaitingDraft | null>(null);

  useEffect(() => {
    try {
      if (window.sessionStorage.getItem(HIDDEN_KEY)) return;
    } catch {}
    let storage: Storage;
    try {
      storage = window.localStorage;
    } catch {
      return;
    }
    const found = findWaitingDraft(storage, Object.keys(names), Date.now());
    // Read once, after mount: the device's storage is not something the server's page could know.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (found) setDraft(found);
  }, [names]);

  if (!draft) return null;
  // "Your Letter for Ana", not "Your The Letter"; "Tu Carta", not "Tu La Carta".
  const template = filedUnder(names[draft.slug], locale);
  const hide = () => {
    try {
      window.sessionStorage.setItem(HIDDEN_KEY, "1");
    } catch {}
    setDraft(null);
  };

  return (
    <div data-waiting-gift={draft.slug} role="region" aria-label={t("label")} className={cn("relative flex items-center gap-3 rounded-2xl bg-card py-2.5 pr-2 pl-4 shadow-[0_18px_34px_-24px_rgba(74,32,24,0.55)] ring-1 ring-ink/[0.08]", className)}>
      <span aria-hidden="true" className="size-2 shrink-0 rounded-full bg-rose-deep" />
      <p className="min-w-0 flex-1 text-[14px] leading-snug text-ink">
        {draft.recipient ? t("forName", { template, name: draft.recipient }) : t("plain", { template })}
      </p>
      <Link
        href={`/create/${draft.slug}`}
        onClick={() => track("gallery_pick", { template: draft.slug, action: "waiting" })}
        className="inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-full bg-forest px-4 text-[13.5px] font-semibold text-cream transition-colors hover:bg-forest-raised"
      >
        {t("finish")}
        <ArrowRight aria-hidden="true" className="size-3.5" />
      </Link>
      <button type="button" onClick={hide} aria-label={t("hide")} className="grid size-11 shrink-0 place-items-center rounded-full text-ink-soft transition-colors hover:bg-ink/5 hover:text-ink">
        <X aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
