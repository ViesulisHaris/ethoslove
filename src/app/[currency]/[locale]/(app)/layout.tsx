import { headers } from "next/headers";
import { setRequestLocale } from "next-intl/server";
import { ASKED_PATH_HEADER, wallNext } from "@/lib/auth/sign-in-wall";
import { ClientMessages } from "@/i18n/client-messages";
import { redirect } from "@/i18n/navigation";
import { isConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/get-user";
import { AppShell } from "@/components/app/app-shell";
import { SiteMotion } from "@/components/motion/site-motion";
import { SupportLauncher } from "@/components/support/support-launcher";

/** Authenticated app shell. Without Supabase configured it renders a "not connected" state. */
export default async function AppLayout({ children, params }: LayoutProps<"/[currency]/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user && isConfigured.supabase) {
    // Where the person was going, so signing in carries on there (walk-make-4).
    const next = wallNext((await headers()).get(ASKED_PATH_HEADER));
    redirect({ href: next ? { pathname: "/login", query: { next } } : "/login", locale });
  }

  return (
    <ClientMessages scope="(app)/layout" locale={locale}>
      <AppShell
        user={
          user
            ? {
                email: user.email ?? "",
                name: (user.user_metadata?.full_name as string | undefined) ?? null,
              }
            : null
        }
      >
        {children}
      </AppShell>
      <SiteMotion />
      {isConfigured.supportChat ? <SupportLauncher /> : null}
    </ClientMessages>
  );
}
