"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import type { GiftData } from "@/lib/gift/schema";
import { useEditor } from "@/lib/editor/store";
import dynamic from "next/dynamic";
import type { PairPreviewState } from "./two-more-gifts";
import { AlreadyPaid } from "./already-paid";

// In the editor the share screen only ever draws in the browser (after a publish); so it does here.
const ShareScreen = dynamic(() => import("./share-screen").then((m) => m.ShareScreen), { ssr: false });

/** The template a made-up gift is on, by the occasion asked for (?occasion=). */
const TEMPLATE_FOR: Record<string, string> = { christmas: "frosted-window", birthday: "balloons", anniversary: "coquette" };

/**
 * Development only (app/[currency]/[locale]/(editor)/share-preview): the share screen a paid gift
 * ends on, for a made-up live gift, in the publish sheet's own frame. Signed in as far as the screen
 * can tell (the editor's store says so); every request it makes is the test's to answer.
 */
export function SharePreview({ locale, occasion, used, state, paid }: { locale: "en" | "es"; occasion: string; used: boolean; state?: PairPreviewState; paid?: number }) {
  const t = useTranslations("editor.publishSheet");
  // The editor's store is what says the sender is signed in: set once, before the screen draws.
  useState(() => useEditor.setState({ authed: true, userId: "00000000-0000-4000-8000-000000000001" }));
  const data = {
    version: 1,
    templateSlug: TEMPLATE_FOR[occasion] ?? "coquette",
    locale,
    title: "",
    recipientName: "Mia",
    senderName: "Leo",
    message: "Hi",
    messageStyle: "typewriter",
    // A gift of this kind holds photos (coquette needs one): the reminder card promises them only then.
    photos: [1, 2, 3, 4].map((n) => ({ id: `p${n}`, url: `/demo/photos/p${n}.webp`, width: 1200, height: 1600 })),
    accentColor: "#B23A2E",
    fontPairing: "editorial",
    showReactionCta: true,
    watermark: false,
    fields: {},
  } as unknown as GiftData;
  // ?paid=<n>: the publish sheet's "It's already paid for." panel instead, with n gifts ready.
  if (paid)
    return (
      <div className="mx-auto min-h-dvh w-full bg-paper px-4 pt-8 pb-10 min-[360px]:px-5 sm:max-w-lg sm:px-8" data-testid="share-preview">
        <h2 className="font-display text-3xl">{t("title")}</h2>
        <p className="mt-2 text-sm text-muted-foreground">{t.rich("subtitle", { name: "Mia", who: (chunks) => <span className="text-ink">{chunks}</span> })}</p>
        <AlreadyPaid ready={paid} thumbs={["/demo/photos/p1.webp", "/demo/photos/p2.webp", "/demo/photos/p3.webp", "/demo/photos/p4.webp"]} photos={4} name="Mia" opensWhen={null} busy={false} onSend={() => {}} onPayInstead={() => {}} />
      </div>
    );
  return (
    <div className="mx-auto min-h-dvh w-full bg-paper sm:max-w-lg" data-testid="share-preview">
      <ShareScreen shortId="k3m9xq" status="live" data={data} giftId={null} usedGift={used} pairPreview={state} />
    </div>
  );
}
