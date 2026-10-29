import type { ReminderOccasion } from "@/lib/lifecycle/reminders";
import { CtaButton, EmailLayout, Idea, InlineLink, Mono, P, Quiet } from "./layout";

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

export function publishReminderSubject(locale: L): string {
  return locale === "es" ? "Te falta un paso: publica tu regalo" : "One step left: publish your gift";
}

/**
 * A gift paid for and still not published a quarter of an hour later (lib/commerce/publish-reminders.ts),
 * once per purchase. The button signs them in to the account the purchase is on and opens the gift
 * ready to publish (api/checkout/finish). A guest's gift is kept only on the device it was made on,
 * so the email says where to open it, and that it won't be charged for twice.
 */
export function PublishReminderEmail({ locale, url, template }: { locale: L; url: string; template: Omit<EmailIdea, "url"> }) {
  const es = locale === "es";
  return (
    <EmailLayout
      lang={locale}
      preview={es ? "Ya está pagado. Publícalo y tendrás el enlace para enviarlo." : "It's paid for. Publish it to get the link to send."}
      heading={es ? "Te falta un paso." : "One step left."}
      cta={{ label: es ? "Publicar mi regalo" : "Publish my gift", href: url }}
      footer={es ? "Recibes esto porque pagaste un regalo en Ethos que aún no está publicado. Solo te lo enviamos una vez." : "You're getting this because you paid for a gift on Ethos that isn't published yet. We only send this once."}
    >
      <P>{es ? "Tu regalo ya está pagado, pero aún no está publicado, así que todavía no tienes el enlace para enviarlo." : "Your gift is paid for, but it isn't published yet, so there's no link to send."}</P>
      <Idea name={template.name} tagline={template.tagline} href={url} poster={template.poster} />
      <P>{es ? "Ábrelo, échale un último vistazo y pulsa Publicar: tendrás el enlace al momento." : "Open it, give it a last look and tap Publish: you'll get the link straight away."}</P>
      <Quiet>
        {es
          ? "Ábrelo en el móvil o el ordenador donde lo hiciste: tu regalo está guardado ahí hasta que lo publiques. Ya está pagado, así que no te pedirá pagar otra vez."
          : "Open it on the phone or computer you made it on: your gift is saved there until you publish it. It's already paid for, so you won't be asked to pay again."}
      </Quiet>
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

/** The same with no name to say: a kept gift signed with a pet name ("Tu amor") reminds of "the sender". */
const UNNAMED_HEADING: Record<ReminderOccasion, Record<L, (date: string) => string>> = {
  birthday: { en: (d) => `The sender's birthday is on ${d}.`, es: (d) => `El cumpleaños de quien te lo regaló es el ${d}.` },
  anniversary: { en: (d) => `Your anniversary is on ${d}.`, es: (d) => `Vuestro aniversario es el ${d}.` },
  valentines: { en: (d) => `Valentine's Day is on ${d}.`, es: (d) => `San Valentín es el ${d}.` },
  other: { en: (d) => `A day to remember: ${d}.`, es: (d) => `Un día para recordar: el ${d}.` },
};

export const reminderHeading = (occasion: ReminderOccasion, locale: L, recipientName: string, date: string): string =>
  recipientName ? REMINDER_HEADING[occasion][locale](recipientName, date) : UNNAMED_HEADING[occasion][locale](date);

/** A template an email suggests (lib/lifecycle/suggest.ts): its name and line in the reader's language, its editor and its poster. */
export type EmailIdea = { name: string; tagline: string; url: string; poster: string };

/**
 * "Remind me next year", a year on. It names the day, not how far away it is: a late run still reads
 * true. One template is suggested for the occasion, a tap from its editor. Nothing from the gift the
 * reminder was saved with goes in: not its photos, not its words, not even that there was one (a
 * reminder can be for someone no gift was made for). With no name (a kept gift signed with a pet
 * name), it speaks of "the sender" and "them".
 */
export function ReminderEmail({ locale, recipientName, occasion, date, idea, moreUrl, removeUrl }: { locale: L; recipientName: string; occasion: ReminderOccasion; date: string; idea: EmailIdea; moreUrl: string; removeUrl: string }) {
  const es = locale === "es";
  const heading = reminderHeading(occasion, locale, recipientName, date);
  return (
    <EmailLayout
      lang={locale}
      preview={heading}
      heading={heading}
      footer={es ? "Recibes esto porque le pediste a Ethos que te lo recordara." : "You're getting this because you asked Ethos to remind you."}
      footerLink={{ label: es ? "Quitar este recordatorio" : "Remove this reminder", href: removeUrl }}
    >
      <P>
        {es
          ? `Hay tiempo de sobra para hacerle algo${recipientName ? ` a ${recipientName}` : ""} y programarlo para que se abra esa mañana. Una idea:`
          : `There's time to make ${recipientName || "them"} something and schedule it to open that morning. One idea:`}
      </P>
      <Idea name={idea.name} tagline={idea.tagline} href={idea.url} poster={idea.poster} />
      <CtaButton href={idea.url} label={recipientName ? (es ? `Hacerlo para ${recipientName}` : `Make it for ${recipientName}`) : es ? "Hazle algo" : "Make them something"} />
      <Quiet>
        {es ? "¿Otra cosa? " : "Something else? "}
        <InlineLink href={moreUrl}>{es ? "Todas las plantillas" : "Every template"}</InlineLink>.
      </Quiet>
      <Quiet>{es ? "Pediste este recordatorio en Ethos. Llega una vez al año." : "You asked Ethos for this reminder. It comes once a year."}</Quiet>
    </EmailLayout>
  );
}

/** "Still celebrating with Ana tomorrow?": the check-in's subject and heading, which say nothing about what. */
export const monthsaryCheckInHeading = (locale: L, partnerName: string): string =>
  locale === "es" ? `¿Mañana seguís celebrándolo, ${partnerName} y tú?` : `Still celebrating with ${partnerName} tomorrow?`;

/** "7 months with Ana today", "A year with Ana today": the reminder's, once they've said yes. */
export function monthsaryHeading(locale: L, partnerName: string, months: number): string {
  const years = months % 12 === 0 ? months / 12 : null;
  if (locale === "es") return years ? `Hoy cumplís ${years === 1 ? "un año" : `${years} años`}, ${partnerName} y tú` : `Hoy cumplís ${months} ${months === 1 ? "mes" : "meses"}, ${partnerName} y tú`;
  return years ? `${years === 1 ? "A year" : `${years} years`} with ${partnerName} today` : `${months} ${months === 1 ? "month" : "months"} with ${partnerName} today`;
}

/**
 * The day before a monthsary: a neutral check that it is still on. Many couples break up, so the
 * subject names no milestone, and a reminder only follows a yes. No answer means nothing more this
 * month; one tap stops them all.
 */
export function MonthsaryCheckInEmail({ locale, partnerName, date, yesUrl, stopUrl }: { locale: L; partnerName: string; date: string; yesUrl: string; stopUrl: string }) {
  const es = locale === "es";
  const heading = monthsaryCheckInHeading(locale, partnerName);
  return (
    <EmailLayout
      lang={locale}
      preview={es ? "Un sí y te lo recordamos mañana. Si no, no hace falta contestar." : "Say yes and we'll remind you tomorrow. Otherwise, no need to answer."}
      heading={heading}
      footer={es ? "Recibes esto porque le pediste a Ethos recordatorios cada mes." : "You're getting this because you asked Ethos for monthly reminders."}
      footerLink={{ label: es ? "Dejar de recibir estos correos" : "Stop these", href: stopUrl }}
    >
      <P>{es ? `Mañana, ${date}, es vuestro mesiversario. ¿Quieres que te lo recordemos por la mañana, con una idea pequeña?` : `Tomorrow, ${date}, is your monthsary with ${partnerName}. Want a reminder in the morning, with one small idea?`}</P>
      <CtaButton href={yesUrl} label={es ? "Sí, recuérdamelo" : "Yes, remind me"} />
      <Quiet>
        {es ? "Si no contestas, no te escribimos más sobre este mesiversario. " : "If you don't answer, we won't write about this one again. "}
        <InlineLink href={stopUrl}>{es ? "Dejar de recibir estos correos" : "Stop these for good"}</InlineLink>.
      </Quiet>
    </EmailLayout>
  );
}

/** On the monthsary, after a yes: the day, and one small template to make before the evening. */
export function MonthsaryReminderEmail({ locale, partnerName, months, idea, stopUrl }: { locale: L; partnerName: string; months: number; idea: EmailIdea; stopUrl: string }) {
  const es = locale === "es";
  const heading = monthsaryHeading(locale, partnerName, months);
  return (
    <EmailLayout
      lang={locale}
      preview={es ? "Algo pequeño, antes de esta noche." : "Something small, before tonight."}
      heading={`${heading}.`}
      footer={es ? "Recibes esto porque dijiste que sí ayer. Cada mes te preguntamos primero." : "You're getting this because you said yes yesterday. We always ask first."}
      footerLink={{ label: es ? "Dejar de recibir estos correos" : "Stop these", href: stopUrl }}
    >
      <P>{es ? "¿Qué tal algo pequeño para que lo abra esta noche? Una idea:" : "Something small, for tonight? One idea:"}</P>
      <Idea name={idea.name} tagline={idea.tagline} href={idea.url} poster={idea.poster} />
      <CtaButton href={idea.url} label={es ? `Hacerlo para ${partnerName}` : `Make it for ${partnerName}`} />
    </EmailLayout>
  );
}
