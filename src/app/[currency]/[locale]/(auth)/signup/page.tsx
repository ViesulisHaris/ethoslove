import type { Metadata } from "next";
import { Suspense } from "react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { AuthForm } from "@/components/auth/auth-form";

export async function generateMetadata({ params }: Omit<PageProps<"/[currency]/[locale]/signup">, "searchParams">): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "auth" });
  return { title: t("signupTitle"), robots: { index: false } };
}

export default async function SignupPage({ params }: PageProps<"/[currency]/[locale]/signup">) {
  const { locale } = await params;
  setRequestLocale(locale);
  return (
    <Suspense>
      <AuthForm mode="signup" />
    </Suspense>
  );
}
