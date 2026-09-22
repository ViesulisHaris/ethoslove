"use client";

import { useState } from "react";
import { Loader2, LogIn, Trash2 } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { COST_IDS, COST_LABELS, type Cost } from "@/lib/dates/cost";
import type { Rating } from "@/lib/dates/rank";
import { WENT_AS_IDS, WENT_AS_LABELS, type PublicReview } from "@/lib/dates/reviews";
import type { WentAs } from "@/lib/supabase/types";
import { Stars, StarPicker } from "./stars";
import { BRAND } from "@/config/brand";

/**
 * A report is an email to a person, with what a notice needs already in it: which review, why, and
 * who is asking (Digital Services Act art. 16). Nothing to build, and nothing lost to a form.
 */
const reportLink = (id: string) =>
  `mailto:${BRAND.supportEmail}?subject=${encodeURIComponent(`Report review ${id}`)}&body=${encodeURIComponent(`Review: ${id}\n\nWhat is wrong with it, and why (for example: fake, offensive, someone's personal details, illegal):\n\n\nYour name:\n\nI believe the information in this report is accurate and complete.`)}`;

export type ReviewsLabels = {
  title: string;
  /** Shown by the post button: a review is public, under the writer's first name. */
  publicNote: string;
  /** Anyone can flag a review; it goes to a person (Digital Services Act notice-and-action). */
  report: string;
  summary: (stars: string, n: number) => string;
  none: string;
  rate: string;
  edit: string;
  yourStars: string;
  starWords: string[];
  cost: string;
  wentAs: string;
  body: string;
  bodyPlaceholder: string;
  send: string;
  sending: string;
  cancel: string;
  remove: string;
  signIn: string;
  signInBlurb: string;
  failed: string;
  thanks: string;
  when: (iso: string) => string;
};

type Props = { rating?: Rating; reviews: PublicReview[] | undefined; locale: "en" | "es"; labels: ReviewsLabels; loginNext: string; onSubmit: (input: { stars: number; cost: Cost | null; wentAs: WentAs | null; body: string }) => Promise<"ok" | "unauthenticated" | "failed">; onDelete: () => Promise<boolean> };

/** What couples said about this place, and the form to add a line of your own. */
export function Reviews({ rating, reviews, locale, labels, loginNext, onSubmit, onDelete }: Props) {
  const mine = reviews?.find((r) => r.mine);
  const [open, setOpen] = useState(false);
  const [stars, setStars] = useState(mine?.stars ?? 0);
  const [cost, setCost] = useState<Cost | null>((mine?.cost as Cost | null) ?? null);
  const [wentAs, setWentAs] = useState<WentAs | null>(mine?.wentAs ?? null);
  const [body, setBody] = useState(mine?.body ?? "");
  const [state, setState] = useState<"idle" | "sending" | "unauthenticated" | "failed" | "done">("idle");

  const submit = async () => {
    if (!stars) return;
    setState("sending");
    const result = await onSubmit({ stars, cost, wentAs, body });
    setState(result === "ok" ? "done" : result);
    if (result === "ok") setOpen(false);
  };

  return (
    <section className="mt-6 border-t border-forest/10 pt-5" aria-label={labels.title}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-[19px] text-forest">{labels.title}</h3>
          {rating?.reviews ? (
            <p className="mt-1 flex items-center gap-2 text-[13.5px] text-forest/70">
              <Stars value={rating.stars} />
              {labels.summary(rating.stars.toFixed(1), rating.reviews)}
            </p>
          ) : (
            <p className="mt-1 text-[13.5px] text-forest/55">{labels.none}</p>
          )}
        </div>
        {!open ? (
          <button type="button" onClick={() => setOpen(true)} className="h-10 shrink-0 rounded-full bg-rose-soft px-4 text-[13.5px] font-semibold text-rose-ink hover:bg-rose-tint">
            {mine ? labels.edit : labels.rate}
          </button>
        ) : null}
      </div>

      {open ? (
        <form
          className="mt-4 rounded-[20px] bg-blush-paper p-4"
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <p className="text-[12.5px] font-semibold text-forest/70">{labels.yourStars}</p>
          <StarPicker value={stars} onChange={setStars} labels={labels.starWords} />
          <p className="mt-3 text-[12.5px] font-semibold text-forest/70">{labels.cost}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={labels.cost}>
            {COST_IDS.map((c) => (
              <button key={c} type="button" aria-pressed={cost === c} onClick={() => setCost(cost === c ? null : c)} className={cn("h-9 rounded-full px-3 text-[13px] font-semibold", cost === c ? "bg-forest text-cream" : "bg-white text-forest/75 ring-1 ring-forest/10")}>
                {COST_LABELS[c][locale]}
              </button>
            ))}
          </div>
          <p className="mt-3 text-[12.5px] font-semibold text-forest/70">{labels.wentAs}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5" role="group" aria-label={labels.wentAs}>
            {WENT_AS_IDS.map((w) => (
              <button key={w} type="button" aria-pressed={wentAs === w} onClick={() => setWentAs(wentAs === w ? null : w)} className={cn("h-9 rounded-full px-3 text-[13px] font-semibold", wentAs === w ? "bg-forest text-cream" : "bg-white text-forest/75 ring-1 ring-forest/10")}>
                {WENT_AS_LABELS[w][locale]}
              </button>
            ))}
          </div>
          <label className="mt-3 block">
            <span className="text-[12.5px] font-semibold text-forest/70">{labels.body}</span>
            <textarea value={body} maxLength={400} rows={3} onChange={(e) => setBody(e.target.value)} placeholder={labels.bodyPlaceholder} className="mt-1.5 w-full resize-none rounded-2xl border border-forest/15 bg-white px-3.5 py-2.5 text-[15px] leading-relaxed text-forest outline-none focus:border-rose/50 focus:shadow-[0_0_0_4px_rgba(214,51,108,0.12)]" />
          </label>
          {state === "unauthenticated" ? (
            <p className="mt-3 rounded-2xl bg-white p-3.5 text-[13.5px] leading-snug text-forest/75">
              {labels.signInBlurb}{" "}
              <Link href={{ pathname: "/login", query: { next: loginNext } }} className="inline-flex items-center gap-1 font-semibold text-rose-deep underline-offset-4 hover:underline">
                <LogIn aria-hidden="true" className="size-3.5" />
                {labels.signIn}
              </Link>
            </p>
          ) : null}
          {state === "failed" ? <p className="mt-3 text-[13.5px] text-destructive">{labels.failed}</p> : null}
          <div className="mt-4 flex items-center gap-2">
            <button type="submit" disabled={!stars || state === "sending"} className="btn-rose inline-flex h-11 items-center gap-2 rounded-full px-5 text-[14px] font-semibold disabled:bg-none disabled:bg-forest/10 disabled:text-forest/50 disabled:shadow-none">
              {state === "sending" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              {state === "sending" ? labels.sending : labels.send}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="h-11 rounded-full px-4 text-[14px] font-semibold text-forest/70 hover:bg-forest/5">
              {labels.cancel}
            </button>

            {mine ? (
              <button type="button" onClick={() => void onDelete().then((ok) => ok && setOpen(false))} className="ml-auto inline-flex h-11 items-center gap-1.5 rounded-full px-3 text-[13px] font-semibold text-destructive hover:bg-destructive/5">
                <Trash2 aria-hidden="true" className="size-3.5" />
                {labels.remove}
              </button>
            ) : null}
          </div>
          <p className="mt-2 text-[12px] text-forest/50">{labels.publicNote}</p>
        </form>
      ) : null}
      {state === "done" && !open ? (
        <p role="status" className="mt-3 text-[13.5px] font-medium text-moss">
          {labels.thanks}
        </p>
      ) : null}

      {reviews === undefined ? (
        <div className="mt-4 space-y-2">
          <div className="h-14 animate-pulse rounded-2xl bg-forest/5" />
        </div>
      ) : reviews.length > 0 ? (
        <ul className="mt-4 space-y-3">
          {reviews.map((r) => (
            <li key={r.id} className={cn("rounded-2xl p-3.5 ring-1 ring-forest/5", r.mine ? "bg-blush-paper" : "bg-white")}>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-forest/60">
                <Stars value={r.stars} size="xs" />
                <span className="font-semibold text-forest">{r.name}</span>
                <span>· {labels.when(r.createdAt)}</span>
                {r.wentAs ? <span className="rounded-full bg-forest/5 px-2 py-0.5 text-[11px] font-medium">{WENT_AS_LABELS[r.wentAs][locale]}</span> : null}
                {r.cost !== null && r.cost !== undefined ? <span className="rounded-full bg-forest/5 px-2 py-0.5 text-[11px] font-medium">{COST_LABELS[r.cost as Cost][locale]}</span> : null}
              </div>
              {r.body ? <p className="mt-1.5 text-[14.5px] leading-relaxed text-forest/85">{r.body}</p> : null}
              {!r.mine ? (
                <a href={reportLink(r.id)} className="mt-1.5 inline-flex min-h-8 items-center text-[12px] font-medium text-forest/45 underline-offset-2 hover:text-forest/70 hover:underline">
                  {labels.report}
                </a>
              ) : null}
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}
