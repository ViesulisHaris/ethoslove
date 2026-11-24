"use client";
/* eslint-disable @next/next/no-img-element */

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useEditor } from "@/lib/editor/store";
import type { StartedFrom } from "@/lib/editor/start-from-gift";

/** The started gift as the reader last left it: when their own hand changes the names or the photos, the card has done its job. */
const signature = (s: { recipientName: string; senderName: string; photos: { id: string }[] }) => JSON.stringify([s.recipientName, s.senderName, s.photos.map((p) => p.id)]);

/**
 * "pending": the start is read but its photos are still on their way after the form showed. The card
 * holds its place, drawn as the started card will be, so nothing moves when they arrive.
 */
export type StartedState = { kind: "started"; from: StartedFrom } | { kind: "offer"; from: StartedFrom } | { kind: "pending"; from: StartedFrom };

/**
 * Above the form of a gift a reminder e-mail started (api/reminders/open, lib/editor/start-from-gift):
 * the photos that came in, what is already in, "Change the photos" (when some came) and "Start empty". Over a draft that
 * already had something in it, nothing is changed: one line offers the names and photos instead.
 * It goes once the reader changes the names or the photos themselves, or dismisses it, and never
 * shows on a gift that is already out.
 */
export function StartedForYou({
  state,
  onChangePhotos,
  onEmpty,
  onUse,
  onDismiss,
  noPhotos = false,
}: {
  state: StartedState;
  onChangePhotos: () => void;
  onEmpty: () => Promise<void> | void;
  onUse: () => Promise<void> | void;
  onDismiss: () => void;
  /** A free note, where photos are the paid step: the card never asks for them. */
  noPhotos?: boolean;
}) {
  const t = useTranslations("editor.started");
  const photos = useEditor((s) => s.data.photos);
  const status = useEditor((s) => s.status);
  const recipientName = useEditor((s) => s.data.recipientName);
  const senderName = useEditor((s) => s.data.senderName);
  const [busy, setBusy] = useState<"empty" | "use" | null>(null);
  // What the start put in, as it stood when the card appeared (it is drawn once the start is in).
  const [first] = useState(() => signature({ recipientName, senderName, photos }));
  const edited = state.kind === "started" && first !== signature({ recipientName, senderName, photos });

  useEffect(() => {
    if (edited) onDismiss();
  }, [edited, onDismiss]);

  if (status !== "draft" || edited) return null;

  const run = async (which: "empty" | "use", act: () => Promise<void> | void) => {
    if (busy) return;
    setBusy(which);
    try {
      await act();
    } finally {
      setBusy(null);
    }
  };

  if (state.kind === "offer") {
    return (
      // Clear of "How it works", which floats over the top of the form on a phone.
      // Its own height, always: an offer that replaces a pending card is shorter, and the form under it
      // moves up once, as the card changes, and never again (remind-N3-2: held at the pending card's
      // height it was a mostly empty box).
      <div className="mt-6 mb-8 rounded-[24px] bg-card px-5 py-4 ring-1 ring-black/5 md:mt-0" data-testid="started-offer">
        <p className="text-[15px] leading-snug">{t(state.from.mode === "photos" ? "offer" : "offerNames", { name: state.from.name })}</p>
        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
          <button
            type="button"
            onClick={() => void run("use", onUse)}
            disabled={busy !== null}
            className="inline-flex h-11 items-center gap-2 rounded-full border border-ink/15 px-5 text-sm font-semibold transition-colors hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-coral focus-visible:outline-none active:scale-[0.98] disabled:opacity-60 motion-reduce:active:scale-100"
          >
            {busy === "use" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
            {t("use")}
          </button>
          <button type="button" onClick={onDismiss} className="inline-flex min-h-11 items-center text-sm text-ink-soft underline underline-offset-4 hover:text-ink focus-visible:ring-2 focus-visible:ring-coral focus-visible:outline-none">
            {t("no")}
          </button>
        </div>
      </div>
    );
  }

  if (state.kind === "pending") return <PendingCard from={state.from} noPhotos={noPhotos} onEmpty={() => void run("empty", onEmpty)} busy={busy === "empty"} />;

  const shown = photos.slice(0, 4);
  const more = photos.length - shown.length;
  return (
    <div className="mt-6 mb-8 rounded-[24px] bg-card p-5 ring-1 ring-black/5 sm:p-6 md:mt-0" data-testid="started-for-you">
      {shown.length > 0 ? (
        <ul className="mb-4 flex items-center" aria-label={t("thumbs")}>
          {shown.map((p, i) => (
            <li key={p.id} className={i === 0 ? "" : "-ml-2.5"} style={{ zIndex: shown.length - i }}>
              <img src={p.url} alt="" className="size-12 rounded-xl object-cover ring-2 ring-card sm:size-14" />
            </li>
          ))}
          {more > 0 ? (
            <li className="-ml-2.5 grid size-12 place-items-center rounded-xl bg-accent text-sm font-semibold ring-2 ring-card sm:size-14" aria-hidden>
              +{more}
            </li>
          ) : null}
        </ul>
      ) : null}
      <h2 className="font-display text-[1.65rem] leading-tight">{t("title")}</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {state.from.mode === "photos" && photos.length > 0 ? t("withPhotos", { count: photos.length, name: state.from.name }) : noPhotos ? t("namesWords") : t("namesOnly")}
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        {/* Only when photos came in: with none there is nothing to change, and on a free note the photos are a paid step. */}
        {photos.length > 0 ? (
          <button
            type="button"
            onClick={onChangePhotos}
            className="inline-flex h-11 items-center rounded-full border border-ink/15 px-5 text-sm font-semibold transition-colors hover:bg-ink/5 focus-visible:ring-2 focus-visible:ring-coral focus-visible:outline-none active:scale-[0.98] motion-reduce:active:scale-100"
          >
            {t("change")}
          </button>
        ) : null}
        <button
          type="button"
          onClick={() => void run("empty", onEmpty)}
          disabled={busy !== null}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-soft underline underline-offset-4 hover:text-ink focus-visible:ring-2 focus-visible:ring-coral focus-visible:outline-none disabled:opacity-60"
        >
          {busy === "empty" ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {t("empty")}
        </button>
      </div>
    </div>
  );
}

/**
 * The started card while its photos are still coming: the same frame, the same thumbnails (as soft
 * squares), the same lines and the same buttons, so the form under it never moves when they land.
 * The finished sentence is laid under the "Bringing in…" one, invisible, to hold its exact height.
 */
function PendingCard({ from, noPhotos, onEmpty, busy }: { from: StartedFrom; noPhotos: boolean; onEmpty: () => void; busy: boolean }) {
  const t = useTranslations("editor.started");
  const withPhotos = from.mode === "photos" && from.photos > 0;
  const shown = withPhotos ? Math.min(from.photos, 4) : 0;
  const more = withPhotos ? from.photos - shown : 0;
  const finished = withPhotos ? t("withPhotos", { count: from.photos, name: from.name }) : noPhotos ? t("namesWords") : t("namesOnly");
  return (
    <div className="mt-6 mb-8 rounded-[24px] bg-card p-5 ring-1 ring-black/5 sm:p-6 md:mt-0" data-testid="started-pending" aria-busy="true">
      {shown > 0 ? (
        <ul className="mb-4 flex items-center" aria-hidden>
          {Array.from({ length: shown }, (_, i) => (
            <li key={i} className={i === 0 ? "" : "-ml-2.5"} style={{ zIndex: shown - i }}>
              <span className="block size-12 animate-pulse rounded-xl bg-muted ring-2 ring-card motion-reduce:animate-none sm:size-14" />
            </li>
          ))}
          {more > 0 ? <li className="-ml-2.5 grid size-12 place-items-center rounded-xl bg-accent text-sm font-semibold ring-2 ring-card sm:size-14">+{more}</li> : null}
        </ul>
      ) : null}
      <h2 className="font-display text-[1.65rem] leading-tight">{t("title")}</h2>
      <p className="mt-1.5 grid text-sm leading-relaxed text-muted-foreground">
        <span className="col-start-1 row-start-1" role="status">
          {withPhotos ? t("putting", { count: from.photos, name: from.name }) : finished}
        </span>
        <span className="invisible col-start-1 row-start-1" aria-hidden>
          {finished}
        </span>
      </p>
      <div className="mt-4 flex flex-wrap items-center gap-x-6 gap-y-2">
        {withPhotos ? (
          // The spinner sits over the label, never beside it: a wider button would wrap "Start empty"
          // onto a line of its own (it did in Spanish) and the card would shrink when the photos land.
          <button type="button" disabled aria-label={t("change")} className="relative inline-flex h-11 items-center rounded-full border border-ink/15 px-5 text-sm font-semibold opacity-60" data-testid="started-pending-change">
            <span className="invisible" aria-hidden>
              {t("change")}
            </span>
            <Loader2 className="absolute inset-0 m-auto size-4 animate-spin motion-reduce:animate-none" aria-hidden />
          </button>
        ) : null}
        <button
          type="button"
          onClick={onEmpty}
          disabled={busy}
          className="inline-flex min-h-11 items-center gap-2 text-sm text-ink-soft underline underline-offset-4 hover:text-ink focus-visible:ring-2 focus-visible:ring-coral focus-visible:outline-none disabled:opacity-60"
        >
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          {t("empty")}
        </button>
      </div>
    </div>
  );
}
