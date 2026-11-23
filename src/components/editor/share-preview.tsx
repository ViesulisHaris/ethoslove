"use client";

import { useState } from "react";
import type { GiftData } from "@/lib/gift/schema";
import { useEditor } from "@/lib/editor/store";
import { ShareScreen } from "./share-screen";

/** The template a made-up gift is on, by the occasion asked for (?occasion=). */
const TEMPLATE_FOR: Record<string, string> = { christmas: "frosted-window", birthday: "balloons", anniversary: "coquette" };

/**
 * Development only (app/[currency]/[locale]/(editor)/share-preview): the share screen a paid gift
 * ends on, for a made-up live gift, in the publish sheet's own frame. Signed in as far as the screen
 * can tell (the editor's store says so); every request it makes is the test's to answer.
 */
export function SharePreview({ locale, occasion, used }: { locale: "en" | "es"; occasion: string; used: boolean }) {
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
    photos: [],
    accentColor: "#B23A2E",
    fontPairing: "editorial",
    showReactionCta: true,
    watermark: false,
    fields: {},
  } as unknown as GiftData;
  return (
    <div className="mx-auto min-h-dvh w-full bg-paper sm:max-w-lg" data-testid="share-preview">
      <ShareScreen shortId="k3m9xq" status="live" data={data} giftId={null} usedGift={used} />
    </div>
  );
}
