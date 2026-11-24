import type { ReminderOccasion } from "@/lib/lifecycle/reminders";
import type { SeasonId } from "@/lib/lifecycle/suggest";
import type { IdeaBasis } from "@/lib/lifecycle/monthly-idea";
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
export function ReminderEmail(props: ReminderEmailProps) {
  if (props.stage) return <StagedReminderEmail {...props} stage={props.stage} />;
  const { locale, recipientName, occasion, date, idea, moreUrl, removeUrl } = props;
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

/**
 * The three e-mails before a saved day (lib/lifecycle/reminder-job.ts): `stage` 1 seven days before,
 * 2 two days before, 3 the day before. Without `stage`, the one e-mail as it has always been (a
 * kept gift's reminder, or the job on a database without migration 0025), word for word.
 */
export type ReminderStage = 1 | 2 | 3;
export type ReminderPaid = { paid: "ready" } | { paid: "price"; prices: { single: string; three: string | null } } | { paid: "none" };
export type ReminderEmailProps = {
  locale: L;
  recipientName: string;
  occasion: ReminderOccasion;
  date: string;
  idea: EmailIdea;
  moreUrl: string;
  removeUrl: string;
  stage?: ReminderStage;
  /** "next Friday", "this Friday", "tomorrow" (whenWords). */
  when?: string;
  /** "Friday": the day the gift can open at midnight on. */
  weekday?: string;
  /** What the opened gift already holds: their photos and both names, or the name alone. */
  started?: "photos" | "name";
  /** "Open my gift" and the price line's link: the open route (api/reminders/open). */
  openUrl?: string;
  skipUrl?: string;
} & Partial<ReminderPaid>;

/** "Mia's birthday is next Friday." The occasion's sentence, with `when` in it. */
export function stagedSentence(occasion: ReminderOccasion, locale: L, name: string, when: string): string {
  if (locale === "es") {
    if (occasion === "birthday") return `El cumpleaños de ${name} es ${when}.`;
    if (occasion === "anniversary") return `Tu aniversario con ${name} es ${when}.`;
    if (occasion === "valentines") return `San Valentín es ${when}.`;
    return `El día de ${name} es ${when}.`;
  }
  if (occasion === "birthday") return `${name}'s birthday is ${when}.`;
  if (occasion === "anniversary") return `Your anniversary with ${name} is ${when}.`;
  if (occasion === "valentines") return `Valentine's Day is ${when}.`;
  return `${name}'s day is ${when}.`;
}

export function stagedReminderHeading(stage: ReminderStage, occasion: ReminderOccasion, locale: L, name: string, when: string): string {
  if (stage === 3) return locale === "es" ? "Aún estás a tiempo." : "It's not too late.";
  return stagedSentence(occasion, locale, name, when);
}

export function stagedReminderSubject(stage: ReminderStage, occasion: ReminderOccasion, locale: L, name: string, when: string): string {
  if (stage === 1) return stagedSentence(occasion, locale, name, when).replace(/\.$/, "");
  if (stage === 3) return stagedSentence(occasion, locale, name, locale === "es" ? "mañana" : "tomorrow").replace(/\.$/, "");
  if (locale === "es") {
    if (occasion === "birthday") return `Faltan dos días para el cumpleaños de ${name}`;
    if (occasion === "anniversary") return "Faltan dos días para tu aniversario";
    if (occasion === "valentines") return "Faltan dos días para San Valentín";
    return `Faltan dos días para el día de ${name}`;
  }
  if (occasion === "birthday") return `Two days until ${name}'s birthday`;
  if (occasion === "anniversary") return "Two days until your anniversary";
  if (occasion === "valentines") return "Two days until Valentine's Day";
  return `Two days until ${name}'s day`;
}

function stagedBody(props: ReminderEmailProps & { stage: ReminderStage }): string {
  const { stage, locale, recipientName: name, occasion, date, started = "name", weekday = "" } = props;
  const es = locale === "es";
  if (stage === 3) {
    const opening = stagedSentence(occasion, locale, name, es ? "mañana" : "tomorrow");
    return es
      ? `${opening} Hacer tu regalo lleva unos diez minutos y llega en cuanto lo envías. O prográmalo para medianoche.`
      : `${opening} Your gift takes about ten minutes and arrives the moment you send it. Or set it to open at midnight.`;
  }
  if (stage === 1) {
    if (es)
      return started === "photos"
        ? `Es el ${date}. Tu regalo ya está empezado: los dos nombres y tus fotos ya están puestos. Te lleva unos diez minutos, y puede abrirse a medianoche de ese día.`
        : `Es el ${date}. Tu regalo ya está empezado, con el nombre de ${name} ya escrito. Te lleva unos diez minutos, y puede abrirse a medianoche de ese día.`;
    return started === "photos"
      ? `That's ${date}. Your gift is started: both names and your photos are already in. It takes about ten minutes, and it can open at midnight on the day.`
      : `That's ${date}. Your gift is started, with ${name}'s name already in. It takes about ten minutes, and it can open at midnight on the day.`;
  }
  // "for {name}" only when there is a name to say.
  const forName = name ? (es ? ` para ${name}` : ` for ${name}`) : "";
  if (es)
    return started === "photos"
      ? `Tu regalo${forName} sigue esperando, con los dos nombres y tus fotos puestos. Hazlo esta noche y prográmalo para que se abra a medianoche del ${weekday}.`
      : `Tu regalo${forName} sigue esperando. Hazlo esta noche y prográmalo para que se abra a medianoche del ${weekday}.`;
  return started === "photos"
    ? `Your gift${forName} is still waiting, with both names and your photos in. Make it tonight and set it to open at midnight on ${weekday}.`
    : `Your gift${forName} is still waiting. Make it tonight and set it to open at midnight on ${weekday}.`;
}

const STAGE_BUTTON: Record<ReminderStage, Record<L, string>> = {
  1: { en: "Open my gift", es: "Abrir mi regalo" },
  2: { en: "Finish my gift", es: "Terminar mi regalo" },
  3: { en: "Make it now", es: "Hacerlo ahora" },
};

/**
 * One of the three e-mails before a day. It may say the gift is started with their photos (the
 * owner's order of 24 Nov 2026), and only when it is (the job checks there is a gift for that name
 * with photos): it never carries a photo, a word or a title from any gift. The one picture is the
 * suggested template's own cover, in the first e-mail. Under the button, at most one line about
 * money: a gift ready, or the template's own price and three for the pair's on top.
 */
function StagedReminderEmail(props: ReminderEmailProps & { stage: ReminderStage }) {
  const { stage, locale, recipientName, occasion, idea, moreUrl, removeUrl, skipUrl, when = "", openUrl = idea.url } = props;
  const es = locale === "es";
  const heading = stagedReminderHeading(stage, occasion, locale, recipientName, when);
  const paid = props.paid === "ready" ? "ready" : props.paid === "price" && props.prices ? props.prices : null;
  return (
    <EmailLayout
      lang={locale}
      preview={stage === 3 ? stagedSentence(occasion, locale, recipientName, es ? "mañana" : "tomorrow") : heading}
      heading={heading}
      footer={es ? "Le pediste a Ethos que te recordara este día: tres correos, que paran en cuanto haces el regalo." : "You asked Ethos to remind you of this day: three emails, which stop once your gift is made."}
      footerLinks={[
        ...(skipUrl ? [{ label: es ? "Este año no" : "Not this year", href: skipUrl }] : []),
        { label: es ? "Quitar este recordatorio" : "Remove this reminder", href: removeUrl },
      ]}
    >
      <P>{stagedBody(props)}</P>
      {stage === 1 ? <Idea name={idea.name} tagline={idea.tagline} href={openUrl} poster={idea.poster} /> : null}
      <CtaButton href={openUrl} label={STAGE_BUTTON[stage][locale]} />
      {paid === "ready" ? (
        <Quiet>{es ? "Ya está pagado: usa uno de los regalos que tienes listos." : "Already paid for: it uses one of the gifts you have ready."}</Quiet>
      ) : paid ? (
        <Quiet>
          {es ? `Un regalo cuesta ${paid.single}.` : `One gift is ${paid.single}.`}
          {paid.three ? (
            <>
              {es ? " O " : " Or "}
              <InlineLink href={openUrl}>{es ? `este y los dos siguientes por ${paid.three}` : `this one and your next two for ${paid.three}`}</InlineLink>.
            </>
          ) : null}
        </Quiet>
      ) : null}
      {/* Every template the gallery offers that holds photos takes them; a free note doesn't (lib/editor/start-from-gift.ts startPhotoLimit). */}
      {stage === 1 && props.started === "photos" ? (
        <Quiet>
          {es ? "¿Prefieres otro? " : "Rather make something else? "}
          <InlineLink href={moreUrl}>{es ? "Todos los regalos con fotos" : "Every photo gift"}</InlineLink>
          {es ? " conservan las tuyas." : " keeps yours."}
        </Quiet>
      ) : stage === 1 ? (
        <Quiet>
          {es ? "¿Prefieres otro? " : "Rather make something else? "}
          <InlineLink href={moreUrl}>{es ? "Mira todos los regalos" : "See every gift"}</InlineLink>.
        </Quiet>
      ) : null}
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

/**
 * The monthly idea's words, by season (lib/lifecycle/suggest.ts SEASON_IDEAS): the heading, which is
 * also the subject, the one paragraph, and the preview line. General on purpose: a question anyone
 * could be asked that month, never who their last gift was for, which template, or when.
 */
export const IDEA_COPY: Record<SeasonId, Record<L, { heading: string; body: string; preview: string }>> = {
  "jan-birthday": {
    en: { heading: "A birthday coming up?", body: "January birthdays come right after everyone has spent their ideas on December. If there's one close to you, this could be it:", preview: "One idea for a January birthday." },
    es: { heading: "¿Se acerca un cumpleaños?", body: "Los cumpleaños de enero llegan cuando ya se han gastado todas las ideas en diciembre. Si tienes uno cerca, esta idea te puede servir:", preview: "Una idea para un cumpleaños de enero." },
  },
  valentines: {
    en: { heading: "Anyone in mind for Valentine's Day?", body: "It's on 14 February. Make the gift today, schedule it for that morning, and it waits until then.", preview: "It's on 14 February. One idea." },
    es: { heading: "¿Tienes a alguien en mente para San Valentín?", body: "Es el 14 de febrero. Haz el regalo hoy, prográmalo para esa mañana y esperará hasta entonces.", preview: "Es el 14 de febrero. Una idea." },
  },
  "feb-anniversary": {
    en: { heading: "An anniversary coming up?", body: "Any anniversary counts: a first date, a wedding, the day you moved in. For whichever is next:", preview: "One idea for an anniversary." },
    es: { heading: "¿Se acerca un aniversario?", body: "Cualquier aniversario cuenta: una primera cita, una boda, el día que os fuisteis a vivir juntos. Para el próximo:", preview: "Una idea para un aniversario." },
  },
  march: {
    en: { heading: "Whose birthday is next?", body: "Someone in the family, a friend, someone at work. Whoever it is, start here:", preview: "Whoever is next, one idea." },
    es: { heading: "¿De quién es el próximo cumpleaños?", body: "Alguien de la familia, del grupo de amigos, del trabajo. Sea quien sea, empieza por aquí:", preview: "Sea quien sea, una idea." },
  },
  april: {
    en: { heading: "Is Mother's Day coming up where you are?", body: "In much of the world it falls in May, and a gift made now can wait for the day.", preview: "In much of the world it's in May. One idea." },
    es: { heading: "¿Se acerca el Día de la Madre?", body: "En muchos países cae en mayo, y un regalo hecho ahora puede esperar hasta ese día.", preview: "En muchos países es en mayo. Una idea." },
  },
  may: {
    en: { heading: "Anything to celebrate this month?", body: "A birthday, an anniversary, someone who has earned a thank-you. If one is on your calendar, this is a good place to start:", preview: "One idea for whatever comes first." },
    es: { heading: "¿Algo que celebrar este mes?", body: "Un cumpleaños, un aniversario, alguien que se ha ganado que le des las gracias. Si tienes algo en el calendario, puedes empezar por aquí:", preview: "Una idea para lo primero que llegue." },
  },
  june: {
    en: { heading: "A wedding or a graduation this month?", body: "June is full of them. If someone you love has one, try this:", preview: "June is full of them. One idea." },
    es: { heading: "¿Una boda o una graduación este mes?", body: "Junio está lleno de ellas. Si alguien a quien quieres celebra una, prueba con esto:", preview: "Junio está lleno de ellas. Una idea." },
  },
  july: {
    en: { heading: "Someone far away right now?", body: "A gift opens wherever they are, the moment you send the link.", preview: "It opens wherever they are. One idea." },
    es: { heading: "¿Alguien que está lejos ahora mismo?", body: "Un regalo se abre allí donde esté, en cuanto le envías el enlace.", preview: "Se abre allí donde esté. Una idea." },
  },
  august: {
    en: { heading: "Got a birthday in the next few weeks?", body: "The photos are probably on your phone already. This one puts them to use:", preview: "The photos are already on your phone. One idea." },
    es: { heading: "¿Algún cumpleaños en las próximas semanas?", body: "Seguramente las fotos ya están en tu móvil. Con esto les das uso:", preview: "Las fotos ya están en tu móvil. Una idea." },
  },
  september: {
    en: { heading: "Is an anniversary close?", body: "Find a photo from each year you've had together. Here's somewhere to put them:", preview: "A photo from each year, and one idea." },
    es: { heading: "¿Hay un aniversario cerca?", body: "Busca una foto de cada año que lleváis juntos. Aquí tienes dónde ponerlas:", preview: "Una foto de cada año, y una idea." },
  },
  october: {
    en: { heading: "Anyone in mind for Halloween?", body: "It's on 31 October, and a gift doesn't have to be scary to belong to it.", preview: "It's on 31 October. One idea." },
    es: { heading: "¿Tienes a alguien en mente para Halloween?", body: "Es el 31 de octubre, y un regalo no tiene que dar miedo para ser de Halloween.", preview: "Es el 31 de octubre. Una idea." },
  },
  november: {
    en: { heading: "Someone to thank this month?", body: "A thank-you is easier to write than it sounds: say what they did, and what it changed.", preview: "Say what they did, and what it changed." },
    es: { heading: "¿Alguien a quien darle las gracias este mes?", body: "Dar las gracias es más fácil de lo que parece: di qué hizo y qué cambió.", preview: "Di qué hizo y qué cambió." },
  },
  christmas: {
    en: { heading: "Something for the two of you this Christmas?", body: "Christmas is on 25 December. Whatever you make now can be scheduled for that morning.", preview: "Christmas is on 25 December. One idea." },
    es: { heading: "¿Algo para los dos estas Navidades?", body: "Navidad es el 25 de diciembre. Lo que hagas ahora puedes programarlo para esa misma mañana.", preview: "Navidad es el 25 de diciembre. Una idea." },
  },
  "year-end": {
    en: { heading: "What did your year together add up to?", body: "Before it's over: the voice notes, the trips, the nights someone stole the blanket. A way to look back at it together:", preview: "Your year, before it's over." },
    es: { heading: "¿Cómo ha sido vuestro año juntos?", body: "Antes de que acabe: los audios, los viajes, las noches que alguien se quedó con la manta. Una forma de repasarlo juntos:", preview: "Vuestro año, antes de que acabe." },
  },
};

export const monthlyIdeaHeading = (season: SeasonId, locale: L): string => IDEA_COPY[season][locale].heading;

const IDEA_FOOTER: Record<IdeaBasis, Record<L, string>> = {
  notice: { en: "You're getting this because you sent a gift with Ethos.", es: "Recibes esto porque enviaste un regalo con Ethos." },
  terms: { en: "You're getting this because you sent a free gift with Ethos, which comes with these emails.", es: "Recibes esto porque enviaste un regalo gratis con Ethos, que incluye estos correos." },
  box: { en: "You're getting this because you asked for Ethos offers.", es: "Recibes esto porque pediste las ofertas de Ethos." },
};

/**
 * One gift idea a month, for a year after someone's last gift (lib/lifecycle/monthly-idea.ts). A
 * question for the season, one template, the button. The first one may carry a one-time price: it
 * says until when, never how much (the page shows the price before anyone pays). No name, nothing
 * from a gift, no tracking: the only pictures are the mark and the template's own cover.
 */
export function MonthlyIdeaEmail({
  locale,
  season,
  idea,
  moreUrl,
  stopUrl,
  basis,
  priceUntil,
}: {
  locale: L;
  season: SeasonId;
  idea: EmailIdea;
  moreUrl: string;
  stopUrl: string;
  basis: IdeaBasis;
  /** The last day the one-time price works, already formatted ("27 December"); only in the first email. */
  priceUntil?: string;
}) {
  const es = locale === "es";
  const copy = IDEA_COPY[season][locale];
  const stop = es ? "Dejar de recibir estos correos" : "Stop these emails";
  return (
    <EmailLayout
      lang={locale}
      preview={priceUntil ? (es ? "Una idea, y un precio especial de un solo uso." : "One idea, and a one-time price on it.") : copy.preview}
      heading={copy.heading}
      footer={IDEA_FOOTER[basis][locale]}
      footerLink={{ label: stop, href: stopUrl }}
    >
      <P>{copy.body}</P>
      <Idea name={idea.name} tagline={idea.tagline} href={idea.url} poster={idea.poster} />
      <CtaButton href={idea.url} label={es ? "Hacer este regalo" : "Make this one"} />
      {priceUntil ? (
        <P>
          {es
            ? `Este primer correo trae un precio especial de un solo uso: un regalo por menos de lo habitual, hasta el ${priceUntil}. Va en el botón de arriba, y verás el precio antes de pagar.`
            : `This first email comes with a one-time price: one gift for less than usual, until ${priceUntil}. The button above carries it, and you see the price before you pay.`}
        </P>
      ) : null}
      <Quiet>
        {es ? "¿Otra cosa? " : "Something else? "}
        <InlineLink href={moreUrl}>{es ? "Todas las plantillas" : "Every template"}</InlineLink>.
      </Quiet>
      <Quiet>
        {es ? "Una idea al mes, durante un año desde tu último regalo. " : "One idea a month, for a year after your last gift. "}
        <InlineLink href={stopUrl}>{stop}</InlineLink>.
      </Quiet>
    </EmailLayout>
  );
}
