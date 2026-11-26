"use client";

import type { GiftLocale } from "@/lib/gift/schema";
import { useRouter } from "@/i18n/navigation";
import { GiftRenderer, type GiftRendererProps } from "@/templates/_shared/GiftRenderer";
import { songStripOn } from "@/templates/_shared/SongStrip";
import { defaultCoverFor } from "@/templates/_shared/covers/looks";

/**
 * A demo as the gift itself plays (the owner, 26 Nov 2026: "make the demos 1:1 to the actual
 * thing", "the whole gift must be 1:1"), while the song strip is on:
 *
 * - It opens from the cover a new gift of its template starts with (the editor's defaultCoverFor):
 *   "For Ana · Tap to open", with the song's sound button under it. Where that cover is the plain
 *   one, the gift's own first screen is its opening (an envelope, a book, a gate), and the sound
 *   button waits on that screen until the first tap. Never the dark "Someone made this for you"
 *   page: that belongs to a gift's own link, and the owner does not want it on a demo.
 * - It ends as a recipient's gift ends: a reaction, "send one back", "keep this gift". In a demo each
 *   of them leads to making this gift, since there is no sender to answer and no gift to keep.
 *
 * With the switch off (NEXT_PUBLIC_SONG_STRIP) this is the plain GiftRenderer, and a demo is exactly
 * as it was.
 */
export function DemoGift(props: Omit<GiftRendererProps, "mode" | "data"> & { demoLocale: GiftLocale }) {
  const router = useRouter();
  if (!songStripOn()) return <GiftRenderer {...props} mode="demo" />;
  const { slug } = props;
  const make = () => router.push(`/create/${slug}`);
  return <GiftRenderer {...props} coverFallback={defaultCoverFor(slug)} songOnOpening mode="demo" replyMode keepHref={`/create/${slug}`} onReact={props.onReact ?? make} onMakeOne={props.onMakeOne ?? make} />;
}
