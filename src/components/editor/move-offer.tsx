"use client";

import { useState } from "react";
import Image from "next/image";
import { Check, Loader2, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { MOVE_TO_SLUGS } from "@/config/featured";
import type { GiftLocale } from "@/lib/gift/schema";
import { PRODUCTS, formatAmount } from "@/lib/pricing/products";
import { useCurrency } from "@/lib/pricing/use-currency";
import { useEditor } from "@/lib/editor/store";
import { useInApp } from "@/lib/app/use-bridge";
import { moveGiftTo } from "@/lib/editor/move-gift";
import { track } from "@/lib/analytics/track";
import { getManifest } from "@/templates/manifests";
import type { TemplateManifest } from "@/templates/types";

const DISMISSED_KEY = "ethos:move-offer-dismissed";
const DISMISSED_FOR_MS = 7 * 24 * 60 * 60 * 1000;

function dismissedLately(): boolean {
  try {
    const at = Number(window.localStorage.getItem(DISMISSED_KEY));
    return at > 0 && Date.now() - at < DISMISSED_FOR_MS;
  } catch {
    return false;
  }
}

/**
 * "Same words, a bigger moment", on a free template's form: the gift so far moved into one of the
 * premium best sellers with one tap, names, words, photos and song included (lib/editor/move-gift).
 * The free template is made by far the most and paid for about one time in twenty; people who
 * start a premium one mostly buy it. The free draft stays where it is, so this is never a trap:
 * the new editor says where the gift came from and links back.
 *
 * Only while the gift is a draft (a sent gift keeps its template), and a "not now" hides it for a
 * week on this device. The form renders only in the browser, so reading the dismissal on the
 * first render can't disagree with the server.
 */
export function MoveOffer({ manifest }: { manifest: TemplateManifest }) {
  const t = useTranslations("editor.move");
  const locale = useLocale() as GiftLocale;
  const router = useRouter();
  // Inside the iPhone app the App Store sets the price, and quotes it itself when they publish.
  const inApp = useInApp();
  const status = useEditor((s) => s.status);
  const photoCount = useEditor((s) => s.data.photos.length);
  const [dismissed, setDismissed] = useState(dismissedLately);
  const [moving, setMoving] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const currency = useCurrency();

  if (manifest.tier !== "free" || status !== "draft" || dismissed) return null;
  const options = MOVE_TO_SLUGS.flatMap((slug) => getManifest(slug) ?? []);
  // The same price the publish sheet will quote for a premium template.
  const price = formatAmount(PRODUCTS.single.amounts[currency], currency, locale);

  const dismiss = () => {
    try {
      window.localStorage.setItem(DISMISSED_KEY, String(Date.now()));
    } catch {}
    setDismissed(true);
  };

  const move = async (to: TemplateManifest) => {
    if (moving) return;
    setMoving(to.slug);
    setFailed(false);
    const moved = await moveGiftTo(to.slug).catch(() => false);
    if (!moved) {
      setMoving(null);
      setFailed(true);
      return;
    }
    track("gift_moved", { from: manifest.slug, to: to.slug });
    router.push(`/create/${to.slug}?from=${manifest.slug}`);
  };

  return (
    <section data-testid="move-offer">
      <div className="relative rounded-[24px] bg-card bg-[radial-gradient(120%_90%_at_0%_0%,rgba(244,199,195,0.5),transparent_65%)] p-5 ring-1 ring-black/5 sm:p-6">
        <button
          type="button"
          onClick={dismiss}
          aria-label={t("dismiss")}
          className="absolute top-1.5 right-1.5 grid size-11 place-items-center rounded-full text-muted-foreground transition-colors hover:bg-ink/5 hover:text-ink"
        >
          <X className="size-4" />
        </button>
        <h2 className="font-display pr-10 text-[1.45rem] leading-tight">{t("title")}</h2>
        <p className="mt-1.5 pr-4 text-sm text-muted-foreground">{t("blurb")}</p>
        <div className="mt-5 grid grid-cols-3 gap-3">
          {options.map((m) => (
            <button
              key={m.slug}
              type="button"
              onClick={() => void move(m)}
              disabled={moving !== null}
              aria-label={t("moveTo", { name: m.name[locale] })}
              data-move-to={m.slug}
              className="group flex min-w-0 flex-col text-left disabled:cursor-wait"
            >
              <span className="relative block aspect-[390/600] w-full overflow-hidden rounded-2xl bg-ink/10 shadow-[0_18px_36px_-24px_rgba(23,19,15,0.6)] ring-1 ring-black/5 transition-transform duration-300 group-hover:-translate-y-0.5 group-active:scale-[0.98]">
                <Image src={m.thumbnail.poster} alt="" fill sizes="(min-width: 768px) 130px, 30vw" quality={70} className="object-cover" />
                {moving === m.slug ? (
                  <span className="absolute inset-0 grid place-items-center bg-ink/45 text-white">
                    <Loader2 className="size-5 animate-spin" />
                    <span className="sr-only">{t("moving")}</span>
                  </span>
                ) : null}
              </span>
              <span className="mt-2 text-sm leading-tight font-medium">{m.name[locale]}</span>
              {photoCount > m.features.photos.max ? (
                <span className="mt-0.5 text-[11px] leading-snug text-muted-foreground">{t("keeps", { n: m.features.photos.max })}</span>
              ) : null}
            </button>
          ))}
        </div>
        <p className="mt-4 text-xs leading-relaxed text-muted-foreground">
          {inApp ? null : `${t("price", { price })} `}
          {t("staysFree", { name: manifest.name[locale] })}
        </p>
        {failed ? (
          <p className="mt-2 text-xs font-medium text-destructive" role="alert">
            {t("failed")}
          </p>
        ) : null}
      </div>
    </section>
  );
}

/** Above the form of a gift that has just been moved here: where it came from, and the way back. */
export function MovedNote({ from }: { from: TemplateManifest }) {
  const t = useTranslations("editor.move");
  const locale = useLocale() as GiftLocale;
  const name = from.name[locale];
  return (
    // Clear of "How it works", which floats over the top of the form on a phone.
    <div className="mt-6 mb-8 rounded-2xl bg-accent px-4 pt-3.5 pb-1 text-sm md:mt-0" data-testid="moved-note">
      <p className="flex gap-2.5">
        <Check className="mt-0.5 size-4 shrink-0 text-coral" />
        {t("moved", { name })}
      </p>
      <Link href={`/create/${from.slug}`} className="ml-[1.625rem] inline-flex min-h-11 items-center font-medium text-coral underline underline-offset-4">
        {t("back", { name })}
      </Link>
    </div>
  );
}
