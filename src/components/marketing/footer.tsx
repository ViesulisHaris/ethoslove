import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/brand";
import { occasionRow } from "@/components/templates/gallery-occasions";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientSlug } from "@/content/recipients";
import { artSrcSet, pageArt } from "@/content/page-art";
import { CutoutImg } from "@/components/marketing/home/cutouts";
import { Logo } from "@/components/shared/logo";
import { CookieChoiceButton } from "@/components/shared/cookie-consent";
import { pressNav } from "@/lib/press/shown";
import { LocaleSwitcher } from "./locale-switcher";

export async function MarketingFooter() {
  const t = await getTranslations();
  const locale = (await getLocale()) === "es" ? "es" : "en";
  // Ethos in numbers, once its real figures are in; until then the page is a 404 and nothing links to it.
  const press = pressNav(locale);
  const year = new Date().getFullYear();

  return (
    // The site's focus ring is ink, which vanishes on the wine: here it is cream.
    // data-site-footer: a gift's page puts the footer in that gift's colours while it is open (globals.css, --page-footer).
    <footer data-app-hide data-site-footer className="relative mt-auto overflow-hidden bg-forest text-cream [--ring:var(--color-cream)]">
      <div className="grain-overlay opacity-[0.08] mix-blend-overlay" />
      <FooterFlower />
      {/*
       * Two columns on a phone: with every link 44px tall for a thumb, one column made the footer
       * 1,400px long. The company links are the longest ("Canjear una tarjeta regalo"), so they
       * get the full width under the other two.
       */}
      <div className="container-x relative grid grid-cols-2 gap-x-6 gap-y-10 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 max-w-xs md:col-span-1">
          <Logo />
          {/* The maker's mark: the one place the category line shows on a page, in the footer's own small type (cream at 55% is 5.7:1 on the wine; 45% fell just short of 4.5). */}
          <p className="mt-3 text-[11px] font-medium tracking-[0.2em] text-cream/55 uppercase">{BRAND.categoryLine[locale]}</p>
          <p className="font-display mt-4 text-xl leading-snug text-cream/70 italic">{t("footer.blurb")}</p>
        </div>
        <FooterColumn title={t("footer.explore")}>
          <FooterLink href="/gifts">{t("footer.digitalGifts")}</FooterLink>
          <FooterLink href="/templates">{t("nav.templates")}</FooterLink>
          <FooterLink href="/dates">{t("nav.dates")}</FooterLink>
          <FooterLink href="/trips">{t("nav.trips")}</FooterLink>
          <FooterLink href="/long-distance">{t("nav.longDistance")}</FooterLink>
          <FooterLink href="/games">{t("nav.games")}</FooterLink>
          <FooterLink href="/tools/how-long-have-we-been-together">{t("footer.togetherCounter")}</FooterLink>
          <FooterLink href="/tools/love-language-quiz">{t("footer.loveQuiz")}</FooterLink>
          <FooterLink href="/pricing">{t("nav.pricing")}</FooterLink>
          <FooterLink href="/blog">{t("common.blog")}</FooterLink>
        </FooterColumn>
        {/*
         * The six that lead the gallery's row today (in season first: Christmas and Thanksgiving in late
         * November, where the catalogue's first six had neither, walk-choose-8), and the gallery for the
         * rest. A page rendered ahead of time takes the day it was built on.
         */}
        <FooterColumn title={t("nav.occasions")}>
          {occasionRow(new Date().toISOString().slice(0, 10))
            .slice(0, 6)
            .map((o) => (
              <FooterLink key={o} href={`/occasions/${o}`}>
                {t(`occasions.${o}`)}
              </FooterLink>
            ))}
          <FooterLink href="/templates">{t("footer.allOccasions")}</FooterLink>
        </FooterColumn>
        <FooterColumn title={t("footer.company")} className="col-span-2 md:col-span-1">
          <FooterLink href="/about">{t("footer.about")}</FooterLink>
          {press ? <FooterLink href={press.href}>{press.label}</FooterLink> : null}
          <FooterLink href="/legal/terms">{t("footer.terms")}</FooterLink>
          <FooterLink href="/legal/privacy">{t("footer.privacy")}</FooterLink>
          {/* EU consumer law wants the way to withdraw easy to find, on every page (CRD art. 11a). */}
          <FooterLink href="/legal/withdraw">{t("footer.withdraw")}</FooterLink>
          <FooterLink href="/creators">{t("growth.creators.eyebrow")}</FooterLink>
          <FooterLink href="/redeem">{t("money.account.redeem")}</FooterLink>
          <li>
            <a href={`mailto:${BRAND.supportEmail}`} className="inline-block py-3 text-sm text-cream/65 transition-colors duration-200 hover:text-cream lg:py-1">
              {t("footer.contact")}
            </a>
          </li>
        </FooterColumn>
      </div>
      {/* Who it's for: the gift-idea pages, linked from every page so search engines find them. */}
      <nav aria-labelledby="footer-recipients" className="container-x relative border-t border-white/10 pt-6 pb-4">
        <p id="footer-recipients" className="mb-2 text-[11px] font-medium tracking-[0.2em] text-cream/55 uppercase">
          {t("recipients.footerTitle")}
        </p>
        <ul className="flex flex-wrap gap-x-6">
          {RECIPIENTS.map((r) => (
            <FooterLink key={r} href={`/gifts/${recipientSlug(r)}`}>
              {RECIPIENT_GUIDES[r][locale].label}
            </FooterLink>
          ))}
        </ul>
      </nav>
      <div className="container-x relative flex flex-col items-start justify-between gap-4 border-t border-white/10 py-6 text-[12px] text-cream/50 sm:flex-row sm:items-center">
        <p>{t("footer.rights", { year })}</p>
        <div className="flex items-center gap-5">
          <p className="hidden sm:block">{t("footer.madeWith")}</p>
          {/* The privacy policy promises the choice can be changed from here. */}
          <CookieChoiceButton className="min-h-11 text-cream/50 transition-colors duration-200 hover:text-cream" />
          <LocaleSwitcher tone="dark" />
        </div>
      </div>
    </footer>
  );
}

/**
 * One faint flower in the corner, on the pages laid out with the page art (a gift's page): the
 * art's `lily-footer`, the one piece rendered for a dark ground. Where it lies and where it shows is globals.css ([data-footer-flower]):
 * hidden on every other page, and lazy, so a page that never shows it never fetches it.
 */
function FooterFlower() {
  const art = pageArt("lily-footer", "ivory");
  return (
    <span data-footer-flower data-decor="lily-footer" aria-hidden="true">
      <CutoutImg src={art.src1x} srcSet={artSrcSet(art)} sizes="24vw" width={art.width} height={art.height} className="block w-full" />
    </span>
  );
}

function FooterColumn({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <p className="mb-4 text-[11px] font-medium tracking-[0.2em] text-cream/55 uppercase">{title}</p>
      {/* On a phone or a tablet each link is a 44px row for a thumb, with no dead gap between; a mouse needs less. */}
      <ul className="flex flex-col lg:gap-1.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="inline-block py-3 text-sm text-cream/65 transition-colors duration-200 hover:text-cream lg:py-1">
        {children}
      </Link>
    </li>
  );
}
