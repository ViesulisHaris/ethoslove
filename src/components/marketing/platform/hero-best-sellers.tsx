"use client";

import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";

/** What the strip needs of a gift, read on the server (platform-hero.tsx): not the whole catalogue in the page's script. */
export type HomePick = { slug: string; name: string; poster: string };

/**
 * Three best sellers under the front page's buttons, each one tap from its editor. The owner's yes of
 * 27 Nov 2026 to the Clarity read of that day: 54% of phone visitors never scroll the front page, and
 * its first screen showed no gift at all, only words, a button and a photograph. Now the first screen
 * holds three gifts that sell (Coquette pays on one editor in ten, the free Letter on one in seventy).
 *
 * No prices, as on the gallery's pictures (the owner, 23 Nov 2026: a price on the picture makes it look
 * less like an impulse buy). Counted as the gallery's cards are (`gallery_pick`), with "home" for where.
 */
export function HeroBestSellers({ label, picks }: { label: string; picks: HomePick[] }) {
  if (picks.length === 0) return null;
  return (
    <div data-hero-picks className="mt-6 max-w-[26rem] sm:mt-8">
      <p className="text-[11px] font-medium tracking-[0.2em] text-forest/70 uppercase">{label}</p>
      <ul className="mt-3 grid grid-cols-3 gap-2.5 sm:gap-3">
        {picks.map((m, i) => (
          <li key={m.slug} className="min-w-0">
            <Link
              href={`/create/${m.slug}`}
              onClick={() => track("gallery_pick", { template: m.slug, action: "home" })}
              data-hero-pick={m.slug}
              className="group block rounded-2xl focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2 focus-visible:ring-offset-blush-paper focus-visible:outline-none"
            >
              <span className={`relative block aspect-[4/5] overflow-hidden rounded-2xl bg-forest/10 shadow-[0_18px_30px_-20px_rgba(120,20,60,0.55)] ring-1 ring-forest/10 transition-transform duration-300 group-hover:-translate-y-0.5 group-active:scale-[0.98] motion-reduce:transition-none ${i === 1 ? "sm:-rotate-1" : ""}`}>
                <Image src={m.poster} alt="" fill sizes="(min-width: 640px) 136px, 30vw" quality={70} className={`object-cover ${CROP[m.slug] ?? "object-top"}`} />
              </span>
              <span className="mt-2 block truncate text-[13.5px] leading-tight font-medium text-forest">{m.name}</span>
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

/** As the gallery's card crops them (gallery-card.tsx): Bouquet's lettering sits at the very top. */
const CROP: Record<string, string> = {
  bouquet: "object-[50%_60%]",
};
