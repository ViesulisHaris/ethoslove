import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth/auth-form";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/login">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("loginTitle"), robots: { index: false } };
}

export default async function LoginPage({ params }: PageProps<"/[currency]/[locale]/login">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense>
      <AuthForm mode="login" />
    </Suspense>
  );
}
