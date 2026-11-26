"use client";

import { useEffect, useState } from "react";
import type { GiftLocale } from "@/lib/gift/schema";
import { demoSong } from "@/content/demo-songs";
import { GiftRenderer, type GiftRendererProps } from "@/templates/_shared/GiftRenderer";
import { SongHold, SongStrip, songStripOn } from "@/templates/_shared/SongStrip";
import { loadTemplate, loadedTemplate } from "@/templates/registry";
import type { TemplateModule } from "@/templates/types";
import { SoundGate } from "./sound-gate";

/**
 * A demo as the gift itself arrives (the owner, 26 Nov 2026: "make the demos 1:1 to the actual
 * thing"). A real gift opens from the gate ("Someone made this for you… Tap to open", with the
 * song's sound button under it) unless it has a cover of its own; a demo used to start straight in
 * the gift, so its song had nowhere to be but the corner. Here a demo opens from the same gate, with
 * the demo's own names, and plays the same way after it.
 *
 * Only while the song strip is on (NEXT_PUBLIC_SONG_STRIP): with it off this is the plain
 * GiftRenderer, and a demo is exactly as it was.
 */
export function DemoGift(props: Omit<GiftRendererProps, "mode" | "data"> & { demoLocale: GiftLocale }) {
  const { slug, demoLocale: locale } = props;
  const [loaded, setLoaded] = useState<{ slug: string; mod: TemplateModule | null }>(() => ({ slug, mod: loadedTemplate(slug) ?? null }));
  const [openedFor, setOpenedFor] = useState<string | null>(null);
  const on = songStripOn();

  useEffect(() => {
    if (!on) return;
    let live = true;
    void loadTemplate(slug)
      .then((mod) => live && setLoaded({ slug, mod: mod ?? null }))
      .catch(() => live && setLoaded({ slug, mod: null }));
    return () => {
      live = false;
    };
  }, [slug, on]);

  if (!on) return <GiftRenderer {...props} mode="demo" />;

  const mod = loaded.slug === slug ? loaded.mod : null;
  const demo = mod ? (mod.demoData[locale] ?? mod.demoData.en) : null;
  // A gift with a cover opens from the cover, inside the gift; the gate is for one without.
  const cover = props.coverOverride ?? demo?.cover;
  const hasCover = Boolean(cover && cover !== "classic");
  const opened = hasCover || openedFor === slug;
  const song = demoSong(slug);

  return (
    <div className="relative h-full w-full">
      {opened ? <GiftRenderer {...props} mode="demo" /> : null}
      {!opened && demo ? <SoundGate recipientName={demo.recipientName} senderName={demo.senderName} locale={locale} onOpen={() => setOpenedFor(slug)} /> : null}
      {/* Until the gift's own code has come, the gate's dark page, so nothing flashes. */}
      {!opened && !demo ? <div className="absolute inset-0 bg-night" /> : null}
      {!opened && demo && song ? <SongStrip music={song} locale={locale} onCover /> : null}
      {song ? <SongHold music={song} /> : null}
    </div>
  );
}
