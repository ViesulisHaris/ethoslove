import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/brand";
import { OCCASIONS } from "@/config/occasions";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientSlug } from "@/content/recipients";
import { Logo } from "@/components/shared/logo";
import { CookieChoiceButton } from "@/components/shared/cookie-consent";
import { LocaleSwitcher } from "./locale-switcher";

export async function MarketingFooter() {
  const t = await getTranslations();
  const locale = (await getLocale()) === "es" ? "es" : "en";
  const year = new Date().getFullYear();

  return (
    // The site's focus ring is ink, which vanishes on the wine: here it is cream.
    <footer data-app-hide className="relative mt-auto overflow-hidden bg-forest text-cream [--ring:var(--color-cream)]">
      <div className="grain-overlay opacity-[0.08] mix-blend-overlay" />
      {/*
       * Two columns on a phone: with every link 44px tall for a thumb, one column made the footer
       * 1,400px long. The company links are the longest ("Canjear una tarjeta regalo"), so they
       * get the full width under the other two.
       */}
      <div className="container-x relative grid grid-cols-2 gap-x-6 gap-y-10 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 max-w-xs md:col-span-1">
          <Logo />
          <p className="font-display mt-4 text-xl leading-snug text-cream/70 italic">{t("footer.blurb")}</p>
        </div>
        <FooterColumn title={t("footer.explore")}>
          <FooterLink href="/dates">{t("nav.dates")}</FooterLink>
          <FooterLink href="/trips">{t("nav.trips")}</FooterLink>
          <FooterLink href="/gifts">{t("nav.gifts")}</FooterLink>
          <FooterLink href="/templates">{t("nav.templates")}</FooterLink>
          <FooterLink href="/long-distance">{t("nav.longDistance")}</FooterLink>
          <FooterLink href="/games">{t("nav.games")}</FooterLink>
          <FooterLink href="/pricing">{t("nav.pricing")}</FooterLink>
          <FooterLink href="/blog">{t("common.blog")}</FooterLink>
        </FooterColumn>
        <FooterColumn title={t("nav.occasions")}>
          {OCCASIONS.slice(0, 6).map((o) => (
            <FooterLink key={o} href={`/occasions/${o}`}>
              {t(`occasions.${o}`)}
            </FooterLink>
          ))}
        </FooterColumn>
        <FooterColumn title={t("footer.company")} className="col-span-2 md:col-span-1">
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
        <p id="footer-recipients" className="mb-2 text-[11px] font-medium tracking-[0.2em] text-cream/45 uppercase">
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

function FooterColumn({ title, className, children }: { title: string; className?: string; children: React.ReactNode }) {
  return (
    <div className={className}>
      <p className="mb-4 text-[11px] font-medium tracking-[0.2em] text-cream/45 uppercase">{title}</p>
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
