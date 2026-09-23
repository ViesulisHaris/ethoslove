import { setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { Link } from "@/i18n/navigation";
import { Logo } from "@/components/shared/logo";
import { SiteMotion } from "@/components/motion/site-motion";

export default async function AuthLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <ClientMessages scope="(auth)/layout" locale={locale}>
      <div className="relative flex min-h-dvh flex-col bg-paper">
        <div className="grain-overlay opacity-[0.05]" />
        <header className="relative container-x flex h-16 items-center border-b border-line sm:h-20">
          {/* Named by the wordmark it shows, "Ethos", in either language: an aria-label "Home" was English on /es. */}
          <Link href="/" className="inline-flex h-11 items-center rounded-full">
            <Logo />
          </Link>
        </header>
        <main className="relative flex flex-1 items-center justify-center px-5 py-12">
          {children}
        </main>
        <SiteMotion />
      </div>
    </ClientMessages>
  );
}
