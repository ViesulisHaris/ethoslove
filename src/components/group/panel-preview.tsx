"use client";

import { useState, useSyncExternalStore } from "react";
import { GroupPayPanel } from "@/components/editor/group-pay-panel";
import { GroupSection, type GroupSectionPreview } from "@/components/editor/sections/group";
import { useEditor } from "@/lib/editor/store";
import type { GiftContribution, GiftData, GiftLocale } from "@/lib/gift/schema";
import type { GroupEntryView, GroupView } from "@/lib/group/client";
import { useCurrency } from "@/lib/pricing/use-currency";
import { manifest } from "@/templates/_group-reference/manifest";

/**
 * Development only (the pages that draw these answer 404 in production): the sender's group card
 * panel and its pay panel with made-up notes, for screenshots and the browser tests, which have no
 * account and no database. `live` leaves the panel talking to the real routes, which a test answers.
 */
export type PanelPreviewState = "intro" | "guest" | "setup" | "active" | "full" | "sent" | "ranout" | "capped" | "copy";

const GIFT = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const NOW = "2026-12-01T10:00:00.000Z";
const PHOTO = { url: "/demo/photos/p3.webp", width: 1024, height: 1024 };

const COPY = {
  en: {
    from: "Tom",
    to: "Nora",
    prompt: "One line that only you would know.",
    waiting: [
      { name: "Gran", note: "Forty is nothing. Ring me when you have finished with the candles." },
      { name: "The whole Okonkwo family", note: "Bring the dog on Sunday. The kids have drawn him a banner." },
    ],
    removed: "Uncle Rob",
    inCard: [
      { name: "Mum", note: "You were born at 4 a.m. and you have kept me up ever since. I would not swap one night of it." },
      { name: "Iris", note: "Same table at Lucca on the 12th. I'm buying, you're choosing the wine." },
      { name: "Sam", note: "You taught me to drive in a car park and never once shouted." },
    ],
    filler: (n: number) => ({ name: `Guest ${n}`, note: "Happy birthday, Nora. See you on Saturday." }),
  },
  es: {
    from: "Tomás",
    to: "Nora",
    prompt: "Una línea que solo vosotros sabéis.",
    waiting: [
      { name: "La abuela", note: "Cuarenta no es nada. Llámame cuando acabes de soplar las velas." },
      { name: "Los Okonkwo, al completo", note: "Trae al perro el domingo. Los niños le han pintado una pancarta." },
    ],
    removed: "El tío Rober",
    inCard: [
      { name: "Mamá", note: "Naciste a las cuatro de la mañana y desde entonces no me has dejado dormir. No cambiaría ni una sola noche." },
      { name: "Iris", note: "La misma mesa de siempre el día 12. Invito yo, el vino lo eliges tú." },
      { name: "Sam", note: "Me enseñaste a conducir en un aparcamiento y no gritaste ni una vez." },
    ],
    filler: (n: number) => ({ name: `Invitado ${n}`, note: "Feliz cumpleaños, Nora. Nos vemos el sábado." }),
  },
} as const;

const entry = (n: number, over: Partial<GroupEntryView>): GroupEntryView => ({
  id: `eeeeeeee-eeee-4eee-8eee-${String(n).padStart(12, "0")}`,
  status: "pending",
  name: null,
  note: null,
  photo: null,
  wantsEmail: false,
  key: null,
  reportRef: `prev000${n}`,
  createdAt: NOW,
  decidedAt: null,
  ...over,
});

function fixture(state: PanelPreviewState, locale: GiftLocale): { group: GroupView | null; items: GiftContribution[] } {
  const copy = COPY[locale];
  if (state === "intro" || state === "guest" || state === "setup") return { group: null, items: [] };
  const base: GiftContribution[] = copy.inCard.map((item, i) => ({ key: `preview00${i}`, ...item, ...(i === 0 ? { photo: PHOTO } : {}) }));
  // A duplicated card: it carries the notes and has no group behind it.
  if (state === "copy") return { group: null, items: base };
  const items = state === "full" ? [...base, ...Array.from({ length: 22 }, (_, i) => ({ key: `filler${String(i).padStart(4, "0")}`, ...copy.filler(i + 4) }))] : base;
  const entries: GroupEntryView[] = [
    entry(1, { ...copy.waiting[0], wantsEmail: true }),
    ...(state === "active" ? [entry(2, { ...copy.waiting[1], photo: PHOTO }), entry(3, { status: "rejected", name: copy.removed, note: "…", decidedAt: NOW })] : []),
    ...items.slice(0, 3).map((item, i) => entry(10 + i, { status: "approved", name: item.name, note: item.note, key: item.key })),
  ];
  return {
    items,
    group: {
      id: "99999999-9999-4999-8999-999999999999",
      url: "https://tryethos.io/c/previewPreviewPreview0",
      fromName: copy.from,
      forName: copy.to,
      prompt: copy.prompt,
      max: 25,
      noteMax: 140,
      takesPhotos: true,
      // "ranout": the link's last day passed three days before NOW and nobody closed it. "capped":
      // open, and already at the last day a link can have, so there is nothing to keep it open to.
      closesAt: state === "ranout" ? "2026-11-28T10:00:00.000Z" : state === "capped" ? "2027-01-15T10:00:00.000Z" : "2026-12-31T10:00:00.000Z",
      closedAt: null,
      ranOut: state === "ranout",
      extendsTo: state === "sent" || state === "capped" ? null : state === "ranout" ? "2026-12-31T10:00:00.000Z" : "2027-01-30T10:00:00.000Z",
      sentAt: state === "sent" ? NOW : null,
      reportRef: "prev1ew0",
      entries,
    },
  };
}

function seedEditor(locale: GiftLocale, items: GiftContribution[], authed: boolean) {
  const copy = COPY[locale];
  const data: GiftData = { version: 1, templateSlug: manifest.slug, locale, title: "", recipientName: copy.to, senderName: copy.from, message: "", messageStyle: "fade", photos: [], accentColor: manifest.defaultAccent, fontPairing: "editorial", showReactionCta: true, watermark: true, fields: {}, ...(items.length ? { contributions: items } : {}) };
  useEditor.setState({ slug: manifest.slug, manifest, data, giftId: authed ? GIFT : null, shortId: null, status: "draft", assets: {}, hydrated: true, authed, userId: authed ? "11111111-1111-4111-8111-111111111111" : null, save: "idle", dirty: false });
}

const never = () => () => {};

/** In the browser only: the editor's store holds nothing on the server, as in the editor itself, which draws its form after it loads. */
export function GroupPanelPreview(props: { state: PanelPreviewState; locale: GiftLocale; owned: boolean; live: boolean }) {
  const inBrowser = useSyncExternalStore(never, () => true, () => false);
  return inBrowser ? <Seeded {...props} /> : null;
}

function Seeded({ state, locale, owned, live }: { state: PanelPreviewState; locale: GiftLocale; owned: boolean; live: boolean }) {
  // Seeded once, before the section first reads the store.
  const [preview] = useState<GroupSectionPreview | undefined>(() => {
    const { group, items } = fixture(state, locale);
    // Everyone but the guest is signed in; a live panel starts with an empty card and asks the routes.
    seedEditor(locale, live ? [] : items, state !== "guest");
    if (live) return undefined;
    return { step: group ? "active" : state === "guest" || state === "setup" ? state : "intro", group: group ?? undefined, owned: owned ? [manifest.slug] : [] };
  });
  return (
    <div className="mx-auto max-w-[520px] px-5 pt-8 pb-24 sm:px-7">
      <div className="flex flex-col divide-y divide-border [&>section]:py-9 [&>section:first-child]:pt-0">
        <GroupSection manifest={manifest} preview={preview} />
      </div>
    </div>
  );
}

export function GroupPayPreview({ locale, owned, inApp }: { locale: GiftLocale; owned: boolean; inApp: boolean }) {
  const currency = useCurrency();
  return (
    <div className="mx-auto max-w-lg px-4 pt-2 pb-16 min-[360px]:px-5 sm:px-8">
      <GroupPayPanel manifest={manifest} currency={currency} locale={locale} ownedRows={owned ? [manifest.slug] : []} returnTo={`/create/${manifest.slug}?resume=publish`} paymentsEnabled inApp={inApp} />
    </div>
  );
}
