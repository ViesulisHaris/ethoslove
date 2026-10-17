import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/shared/logo";

export default async function NotFound() {
  const t = await getTranslations("notFound");
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <Logo />
      <p className="text-eyebrow mt-12 text-coral">404</p>
      <h1 className="display-xl mt-3">{t("title")}</h1>
      <p className="mt-4 max-w-md text-muted-foreground">{t("detail")}</p>
      {/* The page's only way on: 44px for a thumb, not the default 32. */}
      <Button asChild className="mt-8 h-11 rounded-full px-6">
        <Link href="/">{t("home")}</Link>
      </Button>
    </div>
  );
}
