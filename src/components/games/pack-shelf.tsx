"use client";

import { useState, type ReactNode } from "react";
import { Check, Loader2, Lock, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";
import { PACKS, adultConfirmed, confirmAdult, isPackId, type PackId } from "@/lib/games/packs";
import { PRODUCTS, formatAmount } from "@/lib/pricing/products";
import { Sheet, SheetClose, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { PlayingCard, type BackTone, type SuitName } from "./cards";
import { ScreenTop } from "./screen-top";
import { tabStorage, type Shelf } from "./use-packs";
import { useInApp } from "@/lib/app/use-bridge";
import { closeInApp } from "@/lib/app/bridge";

const SUITS: SuitName[] = ["heart", "spade", "diamond"];

/** A pack's price as checkout charges it: the catalogue's euro amount, the currency the pack is sold in. */
export function packPrice(locale: string): string {
  return formatAmount(PRODUCTS.pack.amounts.eur, "eur", locale);
}

/** Under a pack's name: its price with a lock, "Yours", or that it came with Ethos for Two. */
export function PackStatus({ shelf, id }: { shelf: Shelf; id: PackId }) {
  const t = useTranslations("packs");
  const locale = useLocale();
  const access = shelf.accessOf(id);
  // Inside the iPhone app a price is the App Store's to show, in its own sheet.
  const inApp = useInApp();
  if (shelf.opening === id)
    return (
      <>
        <Loader2 aria-hidden="true" className="size-3.5 animate-spin" />
        {t("opening")}
      </>
    );
  // Nothing until it is known, rather than a price that turns into "Yours" a moment later.
  if (access === null) return <span aria-hidden="true">&nbsp;</span>;
  if (access === "pass") return <>{t("included")}</>;
  if (access === "owned") return <>{t("owned")}</>;
  if (inApp)
    return (
      <>
        <Lock aria-hidden="true" className="size-3.5" />
        {t("appLocked")}
      </>
    );
  return (
    <>
      <Lock aria-hidden="true" className="size-3.5" />
      <span className="sr-only">{t("locked")}</span>
      {packPrice(locale)}
    </>
  );
}

function AdultMark({ className }: { className?: string }) {
  return <span className={cn("rounded-full px-1.5 py-px text-[10.5px] font-bold tracking-wide", className)}>18+</span>;
}

function ShelfTile({ active, onClick, back, name, status, adult = false }: { active: boolean; onClick: () => void; back: BackTone; name: string; status: ReactNode; adult?: boolean }) {
  return (
    <button type="button" aria-pressed={active} onClick={onClick} className={cn("group flex min-h-16 items-center gap-3 rounded-2xl p-2.5 pr-4 text-left ring-1 transition-colors", active ? "bg-white/15 ring-rose-tint/70" : "bg-white/[0.06] ring-white/10 hover:bg-white/10")}>
      <PlayingCard faceDown back={back} radius={7} className={cn("aspect-[5/7] w-9 shrink-0 transition-transform duration-300 ease-(--ease-out-quint)", active ? "-rotate-6" : "group-hover:-rotate-3")} />
      <span className="min-w-0">
        <span className="flex items-center gap-1.5 text-[15px] leading-tight font-semibold text-cream">
          {name}
          {adult ? <AdultMark className="bg-white/12 text-cream/80" /> : null}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[12.5px] leading-tight text-cream/60">{status}</span>
      </span>
      {active ? <Check aria-hidden="true" className="ml-auto size-4 shrink-0 text-rose-tint" /> : null}
    </button>
  );
}

/**
 * The packs, in a lobby: the free game first, then each pack that deals into this game. On two
 * phones only the host sees it; the guest plays whatever the host deals.
 */
export function LobbyShelf({ shelf, twoPhones = false }: { shelf: Shelf; twoPhones?: boolean }) {
  const t = useTranslations("packs");
  const locale = useLocale() === "es" ? "es" : "en";
  if (shelf.ids.length === 0) return null;
  return (
    <div className="mt-8 max-w-xl" data-tour="packs">
      <p id={`packs-${shelf.game}`} className="text-eyebrow text-blush">
        {t("title")}
      </p>
      <div role="group" aria-labelledby={`packs-${shelf.game}`} className="mt-3 grid gap-2 sm:grid-cols-2">
        <ShelfTile active={shelf.playing === null} onClick={shelf.clear} back="rose" name={t("classic")} status={t("free")} />
        {shelf.ids.map((id) => (
          <ShelfTile key={id} active={shelf.playing === id} onClick={() => shelf.pick(id)} back={PACKS[id].back} name={PACKS[id].name[locale]} adult={PACKS[id].adult} status={<PackStatus shelf={shelf} id={id} />} />
        ))}
      </div>
      {twoPhones ? <p className="mt-2.5 text-[12.5px] leading-snug text-cream/50">{t("hostOnly")}</p> : null}
    </div>
  );
}

/** The two sheets a shelf can open: what's inside a locked pack, and the 18+ tap. */
export function PackSheets({ shelf }: { shelf: Shelf }) {
  return (
    <>
      <OfferSheet shelf={shelf} />
      <AdultSheet shelf={shelf} />
    </>
  );
}

function OfferSheet({ shelf }: { shelf: Shelf }) {
  const t = useTranslations("packs");
  const locale = useLocale() === "es" ? "es" : "en";
  // Inside the iPhone app: no price and no link to the site's pricing; the App Store's sheet sells it.
  const inApp = useInApp();
  // The pack stays on the sheet while it slides away, after the offer itself has been cleared.
  const [shown, setShown] = useState<PackId | null>(shelf.offer);
  if (shelf.offer !== null && shelf.offer !== shown) setShown(shelf.offer);
  const info = shown ? PACKS[shown] : null;
  const games = info ? new Intl.ListFormat(locale, { type: "conjunction" }).format(info.games.map((g) => t(`games.${g}`))) : "";

  return (
    <Sheet open={shelf.offer !== null} onOpenChange={(open) => (open ? undefined : shelf.closeOffer())}>
      <SheetContent side="bottom" showCloseButton={false} className="max-h-[92dvh] gap-0 overflow-y-auto rounded-t-[28px] border-0 bg-paper text-forest">
        {info ? (
          <div className="mx-auto w-full max-w-2xl px-5 pt-7 pb-[max(1.75rem,env(safe-area-inset-bottom))] sm:px-8">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="flex items-center gap-2 text-eyebrow text-rose-deep">
                  {t("sheet.eyebrow", { n: info.cards })}
                  {info.adult ? <AdultMark className="bg-rose-deep/10 text-rose-deep" /> : null}
                </p>
                <SheetTitle className="mt-2 font-display text-[34px] leading-none font-normal text-forest">{info.name[locale]}</SheetTitle>
              </div>
              <SheetClose asChild>
                <button type="button" aria-label={t("sheet.close")} className="-mt-1 -mr-2 grid size-11 shrink-0 place-items-center rounded-full text-forest/60 hover:bg-forest/5">
                  <X aria-hidden="true" className="size-5" />
                </button>
              </SheetClose>
            </div>
            <SheetDescription className="mt-3 text-[15.5px] leading-relaxed text-forest/70">{info.blurb[locale]}</SheetDescription>
            <p className="mt-1.5 text-[13.5px] text-forest/55">{t("sheet.plays", { games })}</p>

            <ul className="mt-6 grid gap-3 sm:grid-cols-3" aria-label={t("sheet.samples")}>
              {info.samples.map((sample, i) => (
                <li key={i}>
                  <PlayingCard rank={String(i + 1)} suit={SUITS[i]} corners="sm" radius={16} tone={i === 1 ? "blush" : "cream"} className={cn("h-full", i === 0 ? "sm:rotate-[-1.5deg]" : i === 2 ? "sm:rotate-[1.5deg]" : "")} faceClassName="min-h-[112px] justify-center px-7 py-7">
                    <span className="font-display text-[18px] leading-snug">{sample[locale]}</span>
                  </PlayingCard>
                </li>
              ))}
            </ul>

            <div className="mt-7 flex flex-col gap-2 sm:flex-row sm:items-center">
              <button type="button" onClick={() => void shelf.buy(info.id)} disabled={shelf.buying} className="btn-rose inline-flex h-12 items-center justify-center gap-2 rounded-full px-7 text-[15px] font-semibold disabled:opacity-70">
                {shelf.buying ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : <Lock aria-hidden="true" className="size-4" />}
                {inApp ? t("sheet.appBuy") : t("sheet.buy", { price: packPrice(locale) })}
              </button>
              <Link href="/pricing?renew=pass" data-app-hide className="inline-flex h-12 items-center justify-center rounded-full border border-forest/15 px-6 text-center text-[14.5px] font-semibold text-forest hover:bg-forest/5">
                {t("sheet.pass")}
              </Link>
            </div>
            <p className="mt-3 text-[13px] leading-snug text-forest/60">{inApp ? t("sheet.appOnce") : t("sheet.once")}</p>
            {shelf.signedOut && inApp ? (
              <button type="button" onClick={() => void shelf.signInInApp()} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-forest underline underline-offset-4 hover:text-rose-deep">
                {t("sheet.signIn")}
              </button>
            ) : shelf.signedOut ? (
              <Link href={`/login?next=${encodeURIComponent(shelf.returnPath(info.id))}`} className="inline-flex min-h-11 items-center text-[14px] font-semibold text-forest underline underline-offset-4 hover:text-rose-deep">
                {t("sheet.signIn")}
              </Link>
            ) : null}
          </div>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

function AdultSheet({ shelf }: { shelf: Shelf }) {
  const t = useTranslations("packs");
  const locale = useLocale() === "es" ? "es" : "en";
  const [shown, setShown] = useState<PackId | null>(shelf.asking);
  if (shelf.asking !== null && shelf.asking !== shown) setShown(shelf.asking);
  return (
    <Sheet open={shelf.asking !== null} onOpenChange={(open) => (open ? undefined : shelf.declineAge())}>
      <SheetContent side="bottom" showCloseButton={false} className="gap-0 rounded-t-[28px] border-0 bg-paper text-forest">
        <div className="mx-auto w-full max-w-md px-5 pt-8 pb-[max(1.75rem,env(safe-area-inset-bottom))] text-center">
          <span aria-hidden="true" className="mx-auto grid size-14 place-items-center rounded-full bg-rose-mist font-display text-[20px] text-rose-deep">
            18+
          </span>
          <SheetTitle className="mt-4 font-display text-[30px] leading-tight font-normal text-forest">{t("adult.title")}</SheetTitle>
          <SheetDescription className="mt-2 text-[15px] leading-relaxed text-forest/70">{t("adult.body", { name: shown ? PACKS[shown].name[locale] : "" })}</SheetDescription>
          <div className="mt-6 grid gap-2">
            <button type="button" onClick={shelf.confirmAge} className="btn-rose h-12 rounded-full px-7 text-[15px] font-semibold">
              {t("adult.yes")}
            </button>
            <button type="button" onClick={shelf.declineAge} className="h-12 rounded-full border border-forest/15 px-6 text-[15px] font-semibold text-forest hover:bg-forest/5">
              {t("adult.no")}
            </button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

/**
 * The 18+ tap on a phone that didn't choose the pack: whether it has been given for a pack, and
 * giving it. Only ever used once a game is under way, so never on the server.
 */
export function useAdultTap(): [(pack: PackId) => boolean, () => void] {
  const [given, setGiven] = useState(() => typeof window !== "undefined" && adultConfirmed(tabStorage()));
  return [
    // The pack arrives from the other phone, so it is checked rather than trusted to be one of ours.
    (pack) => !(isPackId(pack) && PACKS[pack].adult) || given,
    () => {
      confirmAdult(tabStorage());
      setGiven(true);
    },
  ];
}

/**
 * On the guest's phone, before a pack the host chose that asks for the 18+ tap: the guest taps for
 * themselves. Leaving is a way out of the room, not a refusal anybody else sees.
 */
export function AdultGate({ pack, host, onYes, onLeave }: { pack: PackId; host: string; onYes: () => void; onLeave?: () => void }) {
  const t = useTranslations("packs");
  const locale = useLocale() === "es" ? "es" : "en";
  return (
    <section className="container-narrow py-12 text-center sm:py-16">
      <ScreenTop screen="adult" />
      <PlayingCard faceDown back={PACKS[pack].back} className="mx-auto aspect-[5/7] w-40 rotate-[-4deg] sm:w-44" backLabel={<span className="rounded-full bg-cream/95 px-3 py-1 font-display text-[22px] text-forest">18+</span>} />
      <h1 className="mt-8 display-md text-cream">{t("adult.title")}</h1>
      <p className="mx-auto mt-2 max-w-md text-[15px] leading-relaxed text-cream/65">{t("adult.guest", { name: host, pack: PACKS[pack].name[locale] })}</p>
      <div className="mt-7 flex flex-wrap justify-center gap-2">
        <button type="button" onClick={onYes} className="btn-rose h-12 rounded-full px-7 text-[15px] font-semibold">
          {t("adult.yes")}
        </button>
        {/* Leaving tells the other phone, so it isn't left waiting for somebody who has gone. */}
        <Link
          href="/games"
          onClick={(event) => {
            onLeave?.();
            // Inside the iPhone app leaving closes the game, onto the app's own shelf.
            closeInApp(event);
          }}
          className="inline-flex h-12 items-center rounded-full border border-white/20 px-6 text-[15px] font-semibold text-cream hover:bg-white/10"
        >
          {t("adult.leave")}
        </Link>
      </div>
    </section>
  );
}
