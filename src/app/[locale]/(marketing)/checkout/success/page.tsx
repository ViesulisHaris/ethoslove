import type { Metadata } from "next";
import { Check } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getStripe } from "@/lib/stripe/server";
import { accountCreatedByCheckout, fulfilCheckoutSession } from "@/lib/stripe/fulfil";
import { getCurrentUser } from "@/lib/auth/get-user";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { robots: { index: false } };

export default async function CheckoutSuccessPage({
  params,
  searchParams,
}: PageProps<"/[locale]/checkout/success">) {
  const { locale } = await params;
  const { session_id, return: back } = await searchParams;
  setRequestLocale(locale);
  const t = await getTranslations("checkout");
  const user = await getCurrentUser();
  const stripe = getStripe();

  const returnTo =
    typeof back === "string" && back.startsWith("/") && !back.startsWith("//")
      ? back
      : "/dashboard";

  let state: "paid" | "pending" | "error" | "signin" = "error";
  let signInUrl: string | null = null;
  if (stripe && typeof session_id === "string") {
    try {
      const session = await stripe.checkout.sessions.retrieve(session_id);
      if (session.metadata?.guest === "1") {
        // Guest checkout: fulfil, then sign this browser in as the buyer. The session id only
        // ever reaches the buyer's browser (Stripe redirects there), and the window is short.
        // Stripe never verifies the email typed at checkout, so this only ever signs in to an
        // account the same checkout created; an existing account's owner signs in as usual.
        const result = await fulfilCheckoutSession(session);
        state = result.ok ? "paid" : session.payment_status === "unpaid" ? "pending" : "error";
        if (result.ok && result.email && result.userId && user?.id !== result.userId) {
          const fresh = Date.now() / 1000 - session.created < 30 * 60;
          const admin = getSupabaseAdminClient();
          const { data: link } =
            admin && fresh && (await accountCreatedByCheckout(result.userId, session.id))
              ? await admin.auth.admin.generateLink({ type: "magiclink", email: result.email })
              : { data: null };
          const tokenHash = link?.properties?.hashed_token;
          if (tokenHash)
            signInUrl = `/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=magiclink&next=${encodeURIComponent(returnTo)}`;
          else state = "signin";
        }
      } else if (user && session.metadata?.user_id === user.id) {
        const result = await fulfilCheckoutSession(session);
        state = result.ok ? "paid" : session.payment_status === "unpaid" ? "pending" : "error";
      }
    } catch {
      state = "error";
    }
  }
  if (signInUrl) redirect(signInUrl);

  return (
    <div className="container-narrow flex flex-col items-center py-24 text-center">
      <div className="grid size-16 place-items-center rounded-full bg-moss/10">
        <Check className="size-7 text-moss" />
      </div>
      <h1 className="mt-6 display-lg">{t(`${state}.title`)}</h1>
      <p className="mt-3 max-w-md text-muted-foreground">{t(`${state}.detail`)}</p>
      <Button asChild className="mt-8 h-12 rounded-full px-6">
        {state === "signin" ? (
          <Link href={`/login?next=${encodeURIComponent(returnTo)}`}>{t("signIn")}</Link>
        ) : (
          <Link href={returnTo}>{t("continue")}</Link>
        )}
      </Button>
    </div>
  );
}
