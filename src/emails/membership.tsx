import type { MembershipPlan } from "@/lib/pricing/products";
import { EmailLayout, Mono, P, Quiet } from "./layout";

/**
 * Ethos for Two as a subscription (docs/MEMBERSHIP.md 5.1): the welcome, which is also the contract's
 * confirmation on a durable medium, the reminder before a yearly renewal, a renewal that didn't go
 * through, and the end. Service emails: part of the contract, so no unsubscribe link. Dates and
 * amounts arrive formatted in the email's language.
 */

type L = "en" | "es";
const accountFooter: Record<L, string> = { en: "You're getting this because you have Ethos for Two.", es: "Recibes esto porque tienes Ethos for Two." };
const bare = (url: string) => url.replace(/^https?:\/\//, "");

export const membershipSubject = {
  welcome: (locale: L) => (locale === "es" ? "Bienvenidos a Ethos for Two" : "Welcome to Ethos for Two"),
  renewal: (locale: L, date: string) => (locale === "es" ? `Ethos for Two se renueva el ${date}` : `Ethos for Two renews on ${date}`),
  payment: (locale: L) => (locale === "es" ? "No hemos podido cobrar tu Ethos for Two" : "Your Ethos for Two payment didn't go through"),
  ended: (locale: L) => (locale === "es" ? "Ethos for Two ha terminado" : "Ethos for Two has ended"),
};

/**
 * Right after the first payment. `consent` is the sentence ticked at checkout, quoted word for word;
 * without it (Stripe couldn't show the box) the buyer keeps the right to withdraw with a full refund,
 * and the email says that instead.
 */
export function MembershipWelcomeEmail({
  locale,
  plan,
  amount,
  renewsOn,
  inviteUrl,
  consent,
  datesUrl,
}: {
  locale: L;
  plan: MembershipPlan;
  amount: string;
  renewsOn: string;
  inviteUrl?: string;
  consent: string | null;
  datesUrl: string;
}) {
  const es = locale === "es";
  const planLine =
    plan === "monthly"
      ? es
        ? `Tu suscripción: ${amount} al mes, se renueva el ${renewsOn} y después cada mes hasta que la canceles.`
        : `Your plan: ${amount} a month, renewing on ${renewsOn} and every month after that until you cancel.`
      : es
        ? `Tu suscripción: ${amount} al año, se renueva el ${renewsOn} y después cada año hasta que la canceles. Te escribiremos una semana antes de cada renovación.`
        : `Your plan: ${amount} a year, renewing on ${renewsOn} and every year after that until you cancel. We'll email you a week before each renewal.`;
  const withdrawal = consent
    ? es
      ? `Al pagar marcaste: «${consent}» Para desistir en un plazo de 14 días, responde a este correo o usa «Desistir de una compra» en nuestra web: te devolvemos lo que pagaste, descontando los días ya disfrutados.`
      : `At checkout you ticked: “${consent}” To withdraw within 14 days, reply to this email or use “Withdraw from a purchase” on our site: we refund what you paid, less the days you've used.`
    : es
      ? "Pagaste sin marcar la casilla, así que si desistes en un plazo de 14 días te devolvemos el importe íntegro: responde a este correo."
      : "You paid without ticking the box, so if you withdraw within 14 days we refund you in full: reply to this email.";
  return (
    <EmailLayout
      preview={es ? "Citas guardadas sin límite, todas las plantillas y todos los packs, para los dos." : "Unlimited saved dates, every template and every pack, for both of you."}
      heading={es ? "Ethos for Two ya está activo." : "Ethos for Two is on."}
      cta={{ label: es ? "Planear una cita" : "Plan a date", href: datesUrl }}
      footer={accountFooter[locale]}
    >
      <P>
        {es
          ? "Citas y viajes guardados sin límite, compartidos entre los dos; todas las plantillas de regalo y todos los packs de juegos; un recordatorio el día antes de cada cita guardada. Para ti y para otra persona."
          : "Unlimited saved dates and trips, shared between you; every gift template and every game pack; a reminder the day before each saved date. For you and one other person."}
      </P>
      {inviteUrl ? (
        <>
          <P>{es ? "Envíale este enlace a tu pareja. Cuando lo abra e inicie sesión, también será suyo:" : "Send this link to your partner. When they open it and sign in, it's theirs too:"}</P>
          <Mono>
            <a href={inviteUrl} style={{ color: "#1A1614" }}>
              {bare(inviteUrl)}
            </a>
          </Mono>
        </>
      ) : null}
      <P>{planLine}</P>
      <P>{es ? "Puedes cancelarla cuando quieras desde tu cuenta: conservas todo hasta el final del periodo que has pagado." : "Cancel any time from your account page: you keep everything until the end of the period you've paid for."}</P>
      {/* The confirmation, on a durable medium, of what was agreed at payment (Consumer Rights Directive art. 8(7)). */}
      <Quiet>{withdrawal}</Quiet>
    </EmailLayout>
  );
}

/** A week before a yearly renewal: when, how much, and that not renewing costs nothing. */
export function MembershipRenewalEmail({ locale, renewsOn, amount, monthly, manageUrl }: { locale: L; renewsOn: string; amount: string; monthly?: string; manageUrl: string }) {
  const es = locale === "es";
  return (
    <EmailLayout
      preview={es ? `Ethos for Two se renueva el ${renewsOn}.` : `Ethos for Two renews on ${renewsOn}.`}
      heading={es ? `Vuestro año se renueva el ${renewsOn}.` : `Your year renews on ${renewsOn}.`}
      cta={{ label: es ? "Gestionar Ethos for Two" : "Manage Ethos for Two", href: manageUrl }}
      footer={accountFooter[locale]}
    >
      {monthly ? (
        <P>
          {es
            ? `Hacia el ${renewsOn} pasa a ser mensual, como pediste: ${monthly} al mes hasta que la canceles. Lo que quede del año se descuenta.`
            : `Around ${renewsOn} it switches to monthly, as you asked: ${monthly} a month until you cancel. What's left of the year is taken off.`}
        </P>
      ) : (
        <P>
          {es
            ? `El ${renewsOn} cobraremos ${amount} por otro año de Ethos for Two, para los dos. Si queréis seguir, no tenéis que hacer nada.`
            : `On ${renewsOn} we'll charge ${amount} for another year of Ethos for Two, for both of you. There's nothing to do if you want to keep it.`}
        </P>
      )}
      <P>
        {es
          ? `Si prefieres no renovarla, cancélala antes desde tu cuenta: conservas todo hasta el ${renewsOn} y no se cobra nada más.`
          : `If you'd rather not renew, cancel before then from your account: you keep everything until ${renewsOn}, and nothing more is charged.`}
      </P>
    </EmailLayout>
  );
}

/**
 * A renewal that didn't go through: the card failed ("failed", update it on the account page), or
 * the bank wants the payment confirmed ("action_required", on Stripe's page for the invoice). Until
 * `until` it keeps running for both, which is the grace.
 */
export function MembershipPaymentEmail({ locale, kind, amount, until, url }: { locale: L; kind: "failed" | "action_required"; amount: string; until: string; url: string }) {
  const es = locale === "es";
  const confirm = kind === "action_required";
  return (
    <EmailLayout
      preview={es ? "Ethos for Two sigue activo mientras lo arreglamos." : "Ethos for Two stays on while this gets sorted."}
      heading={es ? "No hemos podido cobrar el pago." : "We couldn't take your payment."}
      cta={confirm ? { label: es ? "Confirmar el pago" : "Confirm the payment", href: url } : { label: es ? "Actualizar mi tarjeta" : "Update my card", href: url }}
      footer={accountFooter[locale]}
    >
      <P>
        {confirm
          ? es
            ? `Tu banco quiere que confirmes el pago de ${amount}. Solo lleva un momento:`
            : `Your bank wants you to confirm the payment of ${amount}. It takes a moment:`
          : es
            ? `Tu tarjeta no ha aceptado el cargo de ${amount}. Ethos for Two sigue activo para los dos hasta el ${until} mientras lo volvemos a intentar; actualiza tu tarjeta antes para conservarlo.`
            : `Your card didn't go through for ${amount}. Ethos for Two stays on for both of you until ${until} while we try again; update your card before then to keep it.`}
      </P>
      {confirm ? <Quiet>{es ? `Ethos for Two sigue activo para los dos hasta el ${until} mientras tanto.` : `Ethos for Two stays on for both of you until ${until} in the meantime.`}</Quiet> : null}
    </EmailLayout>
  );
}

/** A membership that ran out: what stays, and the way back. Never sent after a refund or a withdrawal. */
export function MembershipEndedEmail({ locale, pricingUrl }: { locale: L; pricingUrl: string }) {
  const es = locale === "es";
  return (
    <EmailLayout
      preview={es ? "Vuestras citas guardadas siguen en vuestra cuenta." : "Your saved dates are still in your account."}
      heading={es ? "Ethos for Two ha terminado." : "Ethos for Two has ended."}
      cta={{ label: es ? "Volver a Ethos for Two" : "Get Ethos for Two again", href: pricingUrl }}
      footer={accountFooter[locale]}
    >
      <P>
        {es
          ? "Vuestras citas y viajes guardados siguen en tu cuenta, y los regalos que has publicado siguen en línea. Con el plan gratuito puedes editar tus tres citas guardadas más recientes; las demás se pueden seguir consultando hasta que borres alguna o volváis."
          : "Your saved dates and trips are still in your account, and gifts you've published stay online. The free plan edits your three most recent saved dates; the others stay readable until you delete some or come back."}
      </P>
    </EmailLayout>
  );
}
