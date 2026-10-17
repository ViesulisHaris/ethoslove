import type { ReminderOccasion } from "@/lib/lifecycle/reminders";
import { EmailLayout, Mono, P, Quiet } from "./layout";

type L = "en" | "es";
const accountFooter: Record<L, string> = { en: "You're getting this because you have an Ethos account.", es: "Recibes esto porque tienes una cuenta en Ethos." };
const bare = (url: string) => url.replace(/^https?:\/\//, "");

/** Only a template checkout is "a gift"; a pass, a game pack or a gift card is just a checkout. */
export function recoveryHeading(locale: L, forTemplate: boolean): string {
  if (locale === "es") return forTemplate ? "Tu regalo sigue esperando." : "Tu compra sigue guardada.";
  return forTemplate ? "Your gift is still waiting." : "Your checkout is still saved.";
}

/**
 * A checkout that was started and not paid. Only ever sent to someone who ticked Stripe's box to
 * hear from us, once per checkout, so the email says both: why it came, and that it won't again.
 */
export function CheckoutRecoveryEmail({ locale, url, templateName, unsubscribeUrl }: { locale: L; url: string; templateName?: string; unsubscribeUrl: string }) {
  const es = locale === "es";
  // Without a template (a pass, a pack, a gift card) the email doesn't guess at what was being bought.
  const started = templateName
    ? es
      ? `Estabas a punto de desbloquear ${templateName}.`
      : `You were about to unlock ${templateName}.`
    : es
      ? "Empezaste una compra en Ethos y no llegaste a terminarla."
      : "You started a checkout on Ethos and didn't finish it.";
  return (
    <EmailLayout
      preview={es ? "Tu compra sigue guardada, por si aún la quieres." : "Your checkout is saved, if you still want it."}
      heading={recoveryHeading(locale, Boolean(templateName))}
      cta={{ label: es ? "Terminar la compra" : "Finish checkout", href: url }}
      footer={es ? "Recibes esto porque marcaste la casilla para recibir correos de Ethos en la página de pago." : "You're getting this because you ticked the box to hear from Ethos at checkout."}
      footerLink={{ label: es ? "Darme de baja" : "Unsubscribe", href: unsubscribeUrl }}
    >
      <P>{es ? `${started} Hemos guardado tu compra para que puedas seguir donde la dejaste.` : `${started} We saved your checkout, so you can pick up where you left off.`}</P>
      <Quiet>{es ? "Si has cambiado de idea, no tienes que hacer nada: no volveremos a escribirte sobre esta compra." : "If you've changed your mind, there's nothing to do: we won't write about this checkout again."}</Quiet>
    </EmailLayout>
  );
}

/** Right after the pass is bought: what it covers, until when, and the link that brings the other person in. */
export function PassWelcomeEmail({ locale, inviteUrl, endsAt, makeUrl, partnerJoined = false }: { locale: L; inviteUrl: string; endsAt: string; makeUrl: string; partnerJoined?: boolean }) {
  const es = locale === "es";
  return (
    <EmailLayout
      preview={es ? `Todo desbloqueado para dos, hasta el ${endsAt}.` : `Everything unlocked for two, until ${endsAt}.`}
      heading={es ? "Ethos for Two ya está activo." : "Ethos for Two is on."}
      cta={{ label: es ? "Hacer un regalo" : "Make a gift", href: makeUrl }}
      footer={accountFooter[locale]}
    >
      <P>{es ? `Hasta el ${endsAt}, todas las plantillas de regalo y todos los packs de juegos están desbloqueados, para ti y para otra persona.` : `Until ${endsAt}, every gift template and every game pack is unlocked, for you and for one other person.`}</P>
      {partnerJoined ? (
        <P>{es ? "Tu pareja ya está dentro y lo seguirá estando: no tienes que enviarle nada." : "Your partner is already in, and stays in: there's nothing to send them."}</P>
      ) : (
        <>
          <P>{es ? "Envíale este enlace a tu pareja. Cuando lo abra e inicie sesión, también será suyo:" : "Send this link to your partner. When they open it and sign in, it's theirs too:"}</P>
          <Mono>
            <a href={inviteUrl} style={{ color: "#1A1614" }}>
              {bare(inviteUrl)}
            </a>
          </Mono>
        </>
      )}
      <Quiet>{es ? "Un solo pago, para 365 días. No se renueva solo: dos semanas antes de que termine te escribiremos y tú decides." : "Paid once, for 365 days. It doesn't renew by itself: two weeks before it ends we'll email you, and you decide."}</Quiet>
    </EmailLayout>
  );
}

/**
 * Two weeks before the pass ends. Nothing renews on its own, so this is the whole renewal: one
 * button. While Ethos for Two is sold as a subscription (`subscriptions`), a year can't be bought
 * again: the button goes to the monthly and yearly plans, to start once this year ends.
 */
export function PassRenewalEmail({ locale, endsAt, renewUrl, subscriptions = false }: { locale: L; endsAt: string; renewUrl: string; subscriptions?: boolean }) {
  const es = locale === "es";
  return (
    <EmailLayout
      preview={es ? `Ethos for Two termina el ${endsAt}.` : `Ethos for Two ends on ${endsAt}.`}
      heading={es ? `Vuestro año termina el ${endsAt}.` : `Your year ends on ${endsAt}.`}
      cta={subscriptions ? { label: es ? "Ver mensual y anual" : "See monthly and yearly", href: renewUrl } : { label: es ? "Renovar otro año" : "Renew for another year", href: renewUrl }}
      footer={accountFooter[locale]}
    >
      <P>
        {subscriptions
          ? es
            ? `Hasta entonces, todo sigue desbloqueado para los dos. Para seguir después, elige mensual o anual a partir del ${endsAt}. Si no, los regalos que ya habéis publicado siguen en línea, pero para los nuevos con plantillas de pago, y para los packs de juegos, hará falta Ethos for Two o un desbloqueo.`
            : `Until then, everything stays unlocked for both of you. To carry on after that, choose monthly or yearly from ${endsAt}. If you don't, gifts you've already published stay online, but new ones with paid templates, and the game packs, need Ethos for Two or an unlock.`
          : es
            ? "Hasta entonces, todo sigue desbloqueado para los dos. Después, los regalos que ya habéis publicado siguen en línea, pero para los nuevos con plantillas de pago, y para los packs de juegos, hará falta un pase nuevo o un desbloqueo."
            : "Until then, everything stays unlocked for both of you. After that, gifts you've already published stay online, but new ones with paid templates, and the game packs, need a new pass or an unlock."}
      </P>
      <Quiet>{es ? "Si prefieres no renovarlo, no tienes que hacer nada: no se cobra nada y no volveremos a escribirte sobre esto." : "If you'd rather not renew, there's nothing to do: nothing is charged, and we won't email about it again."}</Quiet>
    </EmailLayout>
  );
}

/** To the buyer of a "Give Everything" card: the code, how it's used, and who it's for. */
export function GiftCardEmail({ locale, code, redeemUrl, recipientName, note }: { locale: L; code: string; redeemUrl: string; recipientName?: string; note?: string }) {
  const es = locale === "es";
  const forWhom = recipientName?.trim();
  // The page to type into, without the code the button's link may carry: the code is right above.
  const page = bare(redeemUrl).split("?")[0];
  return (
    <EmailLayout
      preview={forWhom ? (es ? `Una tarjeta regalo para ${forWhom}: todas las plantillas de Ethos, para siempre.` : `A gift card for ${forWhom}: every Ethos template, forever.`) : es ? "Tu tarjeta regalo de Ethos: todas las plantillas, para siempre." : "Your Ethos gift card: every template, forever."}
      heading={forWhom ? (es ? `Para ${forWhom}.` : `For ${forWhom}.`) : es ? "Tu tarjeta regalo." : "Your gift card."}
      cta={{ label: es ? "Canjear" : "Redeem", href: redeemUrl }}
      footer={accountFooter[locale]}
    >
      <P>{es ? "Aquí tienes el código. Desbloquea todas las plantillas de regalo de Ethos, también las que añadamos más adelante, para siempre, en la cuenta que lo canjee." : "Here's the code. It unlocks every Ethos gift template, including the ones we add later, forever, on the account that redeems it."}</P>
      <Mono large>{code}</Mono>
      {note?.trim() ? <P>“{note.trim()}”</P> : null}
      <P>{es ? `Para canjearlo, abre ${page}, inicia sesión con cualquier correo e introduce el código.` : `To redeem it, open ${page}, sign in with any email address and enter the code.`}</P>
      <Quiet>{es ? "Reenvía este correo o copia el código en una tarjeta. Se puede usar una vez, en un plazo de 24 meses, y no se puede canjear por dinero." : "Forward this email, or copy the code into a card. It can be used once, within 24 months, and can't be exchanged for cash."}</Quiet>
    </EmailLayout>
  );
}

const REMINDER_HEADING: Record<ReminderOccasion, Record<L, (name: string, date: string) => string>> = {
  birthday: { en: (n, d) => `${n}'s birthday is on ${d}.`, es: (n, d) => `El cumpleaños de ${n} es el ${d}.` },
  anniversary: { en: (n, d) => `Your anniversary with ${n} is on ${d}.`, es: (n, d) => `Tu aniversario con ${n} es el ${d}.` },
  valentines: { en: (_n, d) => `Valentine's Day is on ${d}.`, es: (_n, d) => `San Valentín es el ${d}.` },
  other: { en: (n, d) => `A day for ${n}: ${d}.`, es: (n, d) => `Un día para ${n}: el ${d}.` },
};

export const reminderHeading = (occasion: ReminderOccasion, locale: L, recipientName: string, date: string): string => REMINDER_HEADING[occasion][locale](recipientName, date);

/** "Remind me next year", a year on. It names the day, not how far away it is: a late run still reads true. */
export function ReminderEmail({ locale, recipientName, occasion, date, makeUrl, removeUrl }: { locale: L; recipientName: string; occasion: ReminderOccasion; date: string; makeUrl: string; removeUrl: string }) {
  const es = locale === "es";
  const heading = reminderHeading(occasion, locale, recipientName, date);
  return (
    <EmailLayout
      preview={heading}
      heading={heading}
      cta={{ label: es ? `Hacerle un regalo a ${recipientName}` : `Make ${recipientName} something`, href: makeUrl }}
      footer={es ? "Recibes esto porque le pediste a Ethos que te lo recordara." : "You're getting this because you asked Ethos to remind you."}
      footerLink={{ label: es ? "Quitar este recordatorio" : "Remove this reminder", href: removeUrl }}
    >
      <P>{es ? `Hay tiempo de sobra para hacerle algo a ${recipientName} y programarlo para que se abra esa mañana.` : `There's time to make ${recipientName} something and schedule it to open that morning.`}</P>
      <Quiet>{es ? `Pediste este recordatorio al hacerle un regalo a ${recipientName} en Ethos. Te lo enviamos una vez al año.` : `You asked for this reminder when you made ${recipientName} a gift on Ethos. It comes once a year.`}</Quiet>
    </EmailLayout>
  );
}
