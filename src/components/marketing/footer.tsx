import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { BRAND } from "@/config/brand";
import { OCCASIONS } from "@/config/occasions";
import { Logo } from "@/components/shared/logo";
import { CookieChoiceButton } from "@/components/shared/cookie-consent";
import { LocaleSwitcher } from "./locale-switcher";

export async function MarketingFooter() {
  const t = await getTranslations();
  const year = new Date().getFullYear();

  return (
    <footer className="relative mt-auto overflow-hidden bg-forest text-cream">
      <div className="grain-overlay opacity-[0.08] mix-blend-overlay" />
      <div className="container-x relative grid gap-10 py-16 md:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="max-w-xs">
          <Logo />
          <p className="font-display mt-4 text-xl leading-snug text-cream/70 italic">{t("footer.blurb")}</p>
        </div>
        <FooterColumn title={t("footer.product")}>
          <FooterLink href="/templates">{t("nav.templates")}</FooterLink>
          <FooterLink href="/pricing">{t("nav.pricing")}</FooterLink>
          <FooterLink href="/occasions">{t("nav.occasions")}</FooterLink>
        </FooterColumn>
        <FooterColumn title={t("nav.occasions")}>
          {OCCASIONS.slice(0, 6).map((o) => (
            <FooterLink key={o} href={`/occasions/${o}`}>
              {t(`occasions.${o}`)}
            </FooterLink>
          ))}
        </FooterColumn>
        <FooterColumn title={t("footer.company")}>
          <FooterLink href="/legal/terms">{t("footer.terms")}</FooterLink>
          <FooterLink href="/legal/privacy">{t("footer.privacy")}</FooterLink>
          <li>
            <a href={`mailto:${BRAND.supportEmail}`} className="inline-block py-1 text-sm text-cream/65 transition-colors hover:text-cream">
              {t("footer.contact")}
            </a>
          </li>
        </FooterColumn>
      </div>
      <div className="container-x relative flex flex-col items-start justify-between gap-4 border-t border-white/10 py-6 text-[12px] text-cream/50 sm:flex-row sm:items-center">
        <p>{t("footer.rights", { year })}</p>
        <div className="flex items-center gap-5">
          <p className="hidden sm:block">{t("footer.madeWith")}</p>
          {/* The privacy policy promises the choice can be changed from here. */}
          <CookieChoiceButton className="text-cream/50 transition-colors hover:text-cream" />
          <LocaleSwitcher className="h-8 text-xs text-cream/70 hover:bg-white/10 hover:text-cream" />
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="mb-4 text-[11px] font-medium tracking-[0.2em] text-cream/45 uppercase">{title}</p>
      <ul className="flex flex-col gap-1.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link href={href} className="inline-block py-1 text-sm text-cream/65 transition-colors hover:text-cream">
        {children}
      </Link>
    </li>
  );
}
