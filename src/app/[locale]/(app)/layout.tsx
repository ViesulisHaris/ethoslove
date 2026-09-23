import { setRequestLocale } from "next-intl/server";
import { ClientMessages } from "@/i18n/client-messages";
import { redirect } from "@/i18n/navigation";
import { isConfigured } from "@/lib/env";
import { getCurrentUser } from "@/lib/auth/get-user";
import { AppShell } from "@/components/app/app-shell";

/** Authenticated app shell. Without Supabase configured it renders a "not connected" state. */
export default async function AppLayout({ children, params }: LayoutProps<"/[locale]">) {
  const { locale } = await params;
  setRequestLocale(locale);

  const user = await getCurrentUser();
  if (!user && isConfigured.supabase) {
    redirect({ href: "/login", locale });
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
    </ClientMessages>
  );
}
