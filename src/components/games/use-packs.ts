"use client";

import { useEffect, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { usePathname } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import type { GameKey } from "@/lib/games/catalogue";
import { openPack, type OpenedPack } from "@/lib/games/pack-actions";
import type { PackCards } from "@/lib/games/pack-cards";
import { tabStorage } from "@/lib/games/saved";
import { PACKS, adultConfirmed, confirmAdult, packAccess, packCheckoutBody, packFromSearch, packReturnPath, packsFor, type PackAccess, type PackId } from "@/lib/games/packs";
import { fetchEntitlements, type Entitlements } from "@/components/pricing/entitlements";
import { startCheckout, useCheckoutError } from "@/components/pricing/checkout";

/** sessionStorage, or nothing: some browsers throw on the property itself when storage is blocked. */
export { tabStorage };

/**
 * The packs shelf for one game: what this visitor owns, the pack being played, and the two sheets
 * that can sit on top (what's inside a locked pack, and the 18+ tap). Lives in the game, above the
 * lobby, so the choice outlasts the lobby and a "play again" keeps the same pack.
 *
 * What looks locked comes from /api/entitlements; the cards come from openPack, which checks again
 * on the server. A pack opened once stays in memory for the visit, so switching decks back and
 * forth costs one request.
 */
export function usePacks(game: GameKey) {
  const t = useTranslations("packs");
  const locale = useLocale() === "es" ? "es" : "en";
  const pathname = usePathname();
  const showCheckoutError = useCheckoutError();
  const [owned, setOwned] = useState<{ data: Entitlements | null; loaded: boolean }>({ data: null, loaded: false });
  const [cards, setCards] = useState<Partial<Record<PackId, PackCards>>>({});
  const [playing, setPlaying] = useState<PackId | null>(null);
  const [opening, setOpening] = useState<PackId | null>(null);
  const [offer, setOffer] = useState<PackId | null>(null);
  const [asking, setAsking] = useState<PackId | null>(null);
  const [buying, setBuying] = useState(false);

  const accessOf = (id: PackId): PackAccess | null => (owned.loaded ? packAccess(owned.data?.packs ?? [], Boolean(owned.data?.pass), id) : null);

  const showOffer = (id: PackId) => {
    setOffer(id);
    track("pack_offer_shown", { pack: id, game });
  };

  const load = async (id: PackId) => {
    setOpening(id);
    let result: OpenedPack | null = null;
    try {
      result = await openPack(id);
    } catch {
      result = null;
    }
    setOpening(null);
    if (result?.ok) {
      const opened = result.cards;
      setCards((was) => ({ ...was, [id]: opened }));
      setPlaying(id);
      return;
    }
    // Signed out, or not theirs after all (a pass that ended since the page loaded): the offer.
    if (result && result.reason !== "unavailable") return showOffer(id);
    toast.error(t("openError"));
  };

  const pick = (id: PackId, adultOk = false) => {
    if (opening) return;
    if (PACKS[id].adult && !adultOk && !adultConfirmed(tabStorage())) return setAsking(id);
    if (cards[id]) return setPlaying(id);
    // Only a list that arrived can say "locked"; one that failed to load says nothing either way.
    if (owned.data && accessOf(id) === "locked") return showOffer(id);
    // Owned, or not known: the server decides, and offers it if it isn't theirs.
    void load(id);
  };

  // The fetch below outlives the render that started it; it reaches today's `pick` through this.
  const pickRef = useRef(pick);
  useEffect(() => {
    pickRef.current = pick;
  });

  useEffect(() => {
    let live = true;
    const wanted = packFromSearch(window.location.search);
    void fetchEntitlements().then((data) => {
      if (!live) return;
      setOwned({ data, loaded: true });
      // Back from checkout (?pack=): the pack they paid for opens by itself, after the 18+ tap if it
      // has one. Only a pack they own: a shared link with ?pack= never pops an offer at anybody.
      if (wanted && packsFor(game).includes(wanted) && packAccess(data?.packs ?? [], Boolean(data?.pass), wanted) !== "locked") pickRef.current(wanted);
    });
    return () => {
      live = false;
    };
  }, [game]);

  const buy = async (id: PackId) => {
    if (buying) return;
    setBuying(true);
    // No code travels: a creator is credited through the ref of their personal link, which
    // startCheckout adds to every checkout.
    const result = await startCheckout(packCheckoutBody(id, { pathname, locale }));
    if ("url" in result) {
      track("pay_clicked", { product: "pack", pack: id, game });
      window.location.assign(result.url);
      return;
    }
    setBuying(false);
    // Bought for good since this page loaded (in another tab, say): nothing to pay, just open it.
    if (result.error === "already_owned") {
      setOffer(null);
      return void load(id);
    }
    // In the same words as every other buy button: "too many tries" and "no connection" are not
    // the same failure, and the buyer can do something about each.
    showCheckoutError(result.error);
  };

  return {
    game,
    ids: packsFor(game),
    loaded: owned.loaded,
    /**
     * Known to be signed out. A pack bought on another phone is on the account, not this browser:
     * the offer says "sign in" before it takes anybody's money a second time.
     */
    signedOut: owned.data?.signedIn === false,
    /** Where the buyer lands after checkout or after signing in: this game, with the pack opening. */
    returnPath: (id: PackId) => packReturnPath(pathname, id),
    accessOf,
    playing,
    /** The cards of the pack being played, or null for the free game. */
    cards: playing ? (cards[playing] ?? null) : null,
    opening,
    offer,
    asking,
    buying,
    pick,
    /** Back to the free game. */
    clear: () => setPlaying(null),
    closeOffer: () => setOffer(null),
    confirmAge: () => {
      const id = asking;
      confirmAdult(tabStorage());
      setAsking(null);
      if (id) pick(id, true);
    },
    declineAge: () => setAsking(null),
    buy,
  };
}

export type Shelf = ReturnType<typeof usePacks>;
