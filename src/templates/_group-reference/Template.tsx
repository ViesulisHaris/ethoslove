"use client";

import { useEffect, useMemo, useRef } from "react";
import { parseRichText } from "@/lib/gift/rich-text";
import type { GiftContribution } from "@/lib/gift/schema";
import type { TemplateProps } from "../types";
import { MessageBody } from "../_shared/MessageBody";
import { EndScreen } from "../_shared/EndScreen";
import type { GroupReferenceFields } from "./schema";

const S = {
  en: { for: "For {name}", from: "from {name}", fromMany: "from {name} and {n} more", signed: "Signed by" },
  es: { for: "Para {name}", from: "de {name}", fromMany: "de {name} y {n} más", signed: "Firman" },
} as const;

const PAPER = "#FBF6EE";
const INK = "#2A211C";
const SOFT = "#6B5D53";
const LINE = "#E7DCCD";

/**
 * The reference template for a group card: the sender's words, then every contribution in the
 * order the sender left them, then the end screen. It keeps the contract a real group template must
 * (src/lib/group, DESIGN-group.md 1.3):
 *   - every item of `data.contributions` is drawn, in array order, from none to the manifest's 25;
 *   - a name and a note are plain React text, never parsed as rich text and never turned into links,
 *     and both wrap anywhere, so a 24-character name and a note of one long word stay inside the card;
 *   - a photo is optional, its box is reserved from its width and height, and past the first screen
 *     it loads lazily;
 *   - it carries no form, no report control and no link out: reporting is the end screen's;
 *   - it keeps working in the editor's preview as the list changes under it (keys are the items' own).
 */
export function Template({ data, mode, onEvent, onReact, onMakeOne }: TemplateProps<GroupReferenceFields>) {
  const s = S[data.locale] ?? S.en;
  const notes = data.contributions ?? [];
  const blocks = useMemo(() => parseRichText(data.message), [data.message]);
  const end = useRef<HTMLDivElement>(null);
  const eventRef = useRef(onEvent);
  useEffect(() => {
    eventRef.current = onEvent;
  });

  useEffect(() => {
    eventRef.current?.({ type: "ready" });
    if (mode === "preview") return;
    eventRef.current?.({ type: "started" });
    const el = end.current;
    if (!el) return;
    let ended = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (ended || !entries.some((entry) => entry.isIntersecting)) return;
        ended = true;
        eventRef.current?.({ type: "progress", pct: 100 });
        eventRef.current?.({ type: "ended" });
      },
      { threshold: 0.4 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [mode]);

  const others = notes.length;
  const byline = others > 0 ? s.fromMany.replace("{name}", data.senderName).replace("{n}", String(others)) : s.from.replace("{name}", data.senderName);

  return (
    <div className="absolute inset-0 overflow-x-hidden overflow-y-auto overscroll-contain" style={{ background: PAPER, color: INK, fontFamily: "var(--gift-font-body)" }} data-scroller="">
      <div className="mx-auto w-full max-w-[34rem] px-[max(1.25rem,6cqw)] pt-[max(3rem,12cqh)] pb-[calc(4rem+env(safe-area-inset-bottom))]">
        <header>
          <p className="text-[0.8rem] [overflow-wrap:anywhere]" style={{ color: SOFT }}>
            {byline}
          </p>
          <h1 className="mt-2 leading-[1.05] [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-display)", fontSize: "clamp(2.1rem, 10cqw, 3rem)" }}>
            {data.title.trim() || s.for.replace("{name}", data.recipientName)}
          </h1>
        </header>

        {data.message.trim() ? <MessageBody data={data} blocks={blocks} mode={mode} ornament={false} className="mt-10" /> : null}

        {notes.length > 0 ? (
          <section className="mt-14" data-testid="contributions">
            <h2 className="flex items-center gap-3 text-[0.8rem] font-normal tracking-normal" style={{ color: SOFT, fontFamily: "var(--gift-font-body)" }}>
              <span>{s.signed}</span>
              <span aria-hidden="true" className="h-px flex-1" style={{ background: LINE }} />
            </h2>
            <ol className="mt-5 flex flex-col gap-4">
              {notes.map((item, index) => (
                <li key={item.key}>
                  <Signed item={item} eager={index < 2} />
                </li>
              ))}
            </ol>
          </section>
        ) : null}

        <div ref={end} className="mt-16" style={{ color: INK }}>
          <EndScreen data={data} tone="light" onReact={onReact} onMakeOne={onMakeOne} />
        </div>
      </div>
    </div>
  );
}

/** One person's card: their photo if they added one, their words, and their name as a signature. */
function Signed({ item, eager }: { item: GiftContribution; eager: boolean }) {
  return (
    <figure className="overflow-hidden rounded-2xl border bg-white" style={{ borderColor: LINE }} data-testid="contribution">
      {item.photo ? (
        // The box is reserved from the photo's own shape, so the list never jumps as photos arrive.
        // eslint-disable-next-line @next/next/no-img-element -- a signed Storage URL; a template renders with no app around it
        <img
          src={item.photo.url}
          alt=""
          width={item.photo.width}
          height={item.photo.height}
          loading={eager ? "eager" : "lazy"}
          decoding="async"
          className="block h-auto max-h-[70cqh] w-full object-cover"
          style={{ aspectRatio: `${item.photo.width} / ${item.photo.height}`, background: LINE }}
        />
      ) : null}
      <blockquote className="px-5 pt-5 text-[1.02rem] leading-relaxed [overflow-wrap:anywhere]">{item.note}</blockquote>
      <figcaption className="px-5 pt-2 pb-4 text-right leading-tight [overflow-wrap:anywhere]" style={{ fontFamily: "var(--gift-font-hand)", fontSize: "1.55rem", color: "var(--gift-accent-deep)" }}>
        {item.name}
      </figcaption>
    </figure>
  );
}
