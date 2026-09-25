import { EmailLayout, InlineLink, P, Quiet } from "./layout";

type L = "en" | "es";
const footer: Record<L, string> = { en: "You're getting this because you have an Ethos account.", es: "Recibes esto porque tienes una cuenta en Ethos." };

export function WelcomeEmail({ locale, siteUrl }: { locale: L; siteUrl: string }) {
  const es = locale === "es";
  return (
    <EmailLayout preview={es ? "Tu cuenta está lista." : "Your account is ready."} heading={es ? "Hola. Ya estás dentro." : "Hello. You're in."} cta={{ label: es ? "Hacer un regalo" : "Make a gift", href: `${siteUrl}/templates` }} footer={footer[locale]}>
      <P>{es ? "Dos plantillas son gratis, para siempre. Elige una, añade unas fotos y escribe lo que nunca dirías en voz alta. Se tarda unos diez minutos." : "Two templates are free, forever. Pick one, add a few photos and write the thing you'd never say out loud. It takes about ten minutes."}</P>
      <Quiet>{es ? "Sin suscripción. Solo pagas si publicas algo con funciones premium." : "No subscription. You only pay if you publish something that needs a premium feature."}</Quiet>
    </EmailLayout>
  );
}

export function GiftPublishedEmail({ locale, recipientName, url, scheduledFor }: { locale: L; recipientName: string; url: string; scheduledFor?: string }) {
  const es = locale === "es";
  return (
    <EmailLayout preview={es ? `Tu regalo para ${recipientName} está publicado.` : `Your gift for ${recipientName} is live.`} heading={scheduledFor ? (es ? "Programado." : "Scheduled.") : es ? "Está publicado." : "It's live."} cta={{ label: es ? "Abrir el regalo" : "Open the gift", href: url }} footer={footer[locale]}>
      <P>{scheduledFor ? (es ? `Tu regalo para ${recipientName} se abrirá el ${scheduledFor}. Hasta entonces, quien tenga el enlace verá una cuenta atrás.` : `Your gift for ${recipientName} unlocks on ${scheduledFor}. Until then, anyone with the link sees a countdown.`) : es ? `Tu regalo para ${recipientName} ya está publicado. Aquí tienes el enlace para enviarlo:` : `Your gift for ${recipientName} is published. Here's the link to send:`}</P>
      <P>
        <a href={url} style={{ color: "#1A1614", fontFamily: "ui-monospace, Menlo, monospace", fontSize: 14 }}>{url.replace(/^https?:\/\//, "")}</a>
      </P>
      <Quiet>{es ? "Te avisaremos cuando lo abran y cuando te envíen una reacción." : "We'll let you know when it's opened and when a reaction comes back."}</Quiet>
    </EmailLayout>
  );
}

/** `nextUrl` offers the next gift: the moment it lands is when making another one sounds best. */
export function GiftOpenedEmail({ locale, recipientName, dashboardUrl, nextUrl }: { locale: L; recipientName: string; dashboardUrl: string; nextUrl?: string }) {
  const es = locale === "es";
  return (
    <EmailLayout preview={es ? `${recipientName} acaba de abrir tu regalo.` : `${recipientName} just opened your gift.`} heading={es ? `${recipientName} lo ha abierto.` : `${recipientName} opened it.`} cta={{ label: es ? "Ver estadísticas" : "See the stats", href: dashboardUrl }} footer={footer[locale]}>
      <P>{es ? "Ahora mismo. Con el sonido activado, esperamos." : "Just now. Sound on, we hope."}</P>
      <Quiet>{es ? "Solo te avisamos de la primera apertura. El resto está en tu panel." : "We only email about the first open. The rest is on your dashboard."}</Quiet>
      {nextUrl ? (
        <Quiet>
          {es ? "¿Ya piensas en la próxima ocasión? " : "Already thinking about the next occasion? "}
          <InlineLink href={nextUrl}>{es ? "Empieza el siguiente regalo" : "Start the next gift"}</InlineLink>.
        </Quiet>
      ) : null}
    </EmailLayout>
  );
}

export function ReactionEmail({ locale, recipientName, emoji, text, hasAudio, dashboardUrl }: { locale: L; recipientName: string; emoji: string; text: string | null; hasAudio: boolean; dashboardUrl: string }) {
  const es = locale === "es";
  return (
    <EmailLayout preview={es ? `${recipientName} te ha enviado ${emoji}` : `${recipientName} sent you ${emoji}`} heading={`${emoji}  ${es ? `De ${recipientName}` : `From ${recipientName}`}`} cta={{ label: hasAudio ? (es ? "Escuchar la nota de voz" : "Listen to the voice note") : es ? "Ver la reacción" : "See the reaction", href: dashboardUrl }} footer={footer[locale]}>
      {text ? <P>“{text}”</P> : null}
      {hasAudio ? <Quiet>{es ? "También te dejó una nota de voz. Está en tu panel." : "They also left a voice note. It's waiting on your dashboard."}</Quiet> : null}
    </EmailLayout>
  );
}

export function GiftUnlockedEmail({ locale, recipientName, url }: { locale: L; recipientName: string; url: string }) {
  const es = locale === "es";
  return (
    <EmailLayout preview={es ? `Tu regalo para ${recipientName} se acaba de abrir.` : `Your gift for ${recipientName} just unlocked.`} heading={es ? "Es la hora." : "It's time."} cta={{ label: es ? "Abrir el regalo" : "Open the gift", href: url }} footer={footer[locale]}>
      <P>{es ? `El regalo programado para ${recipientName} ya está abierto. Si aún no le has enviado el enlace, este es el momento.` : `The gift you scheduled for ${recipientName} is open now. If you haven't sent the link yet, now's the moment.`}</P>
    </EmailLayout>
  );
}

/**
 * What the buyer agreed to at checkout. With `consent` (the sentence they ticked, as fulfilment
 * recorded it on the purchase) it is quoted word for word and called a tick: the withdraw page tells
 * buyers to look here to know whether they can still cancel. Without it, Stripe couldn't show the box
 * and only the notice above the pay button was there. Nothing was ticked, so, like a purchase made
 * before the box existed, the sale keeps its 14-day right to cancel (terms s.9), and the receipt says so.
 *
 * Ethos for Two's year (the pass) is a service: the right to withdraw doesn't go, and a buyer who
 * withdraws within 14 days pays only for the days used (in full back when nothing was ticked).
 */
function consentLine(es: boolean, kind: "giftcard" | "pass" | "other", consent: string | undefined): string {
  if (consent) {
    const ticked = es ? `Al pagar marcaste: «${consent}»` : `At checkout you ticked: “${consent}”`;
    if (kind === "giftcard")
      return es
        ? `${ticked} Para desistir en esos 14 días, antes de que se canjee el código, responde a este correo.`
        : `${ticked} To cancel within those 14 days, before the code is redeemed, reply to this email.`;
    if (kind === "pass")
      return es
        ? `${ticked} Aún puedes desistir en los 14 días siguientes a la compra: responde a este correo y te devolvemos lo que quede, descontando los días ya disfrutados.`
        : `${ticked} You can still withdraw within 14 days of buying: reply to this email, and we'll refund what's left after the days you've used.`;
    return es
      ? `${ticked} Por eso, el derecho de desistimiento de 14 días ya no se aplica. Si algo no funciona, responde a este correo y lo solucionamos.`
      : `${ticked} So the 14-day right to cancel no longer applies. If anything doesn't work, reply to this email and we'll put it right.`;
  }
  if (kind === "giftcard")
    return es
      ? "Puedes desistir en los 14 días siguientes a la compra, con el reembolso íntegro, siempre que el código no se haya canjeado: responde a este correo. Si algo no funciona, también lo solucionamos."
      : "You can cancel within 14 days of buying, for a full refund, as long as the code hasn't been redeemed: reply to this email. If anything doesn't work, we'll put that right too.";
  if (kind === "pass")
    return es
      ? "Pagaste tras un aviso encima del botón Pagar, sin marcar ninguna casilla: si desistes en los 14 días siguientes a la compra, responde a este correo y te devolvemos el importe íntegro."
      : "You paid after a notice above the Pay button, without ticking a box: if you withdraw within 14 days of buying, reply to this email and we'll refund you in full.";
  return es
    ? "Pagaste tras un aviso encima del botón Pagar, sin marcar ninguna casilla, así que conservas el derecho de desistimiento de 14 días: para ejercerlo, responde a este correo en los 14 días siguientes a la compra. Si algo no funciona, también lo solucionamos."
    : "You paid after a notice above the Pay button, without ticking a box, so you keep the 14-day right to cancel: to use it, reply to this email within 14 days of buying. If anything doesn't work, we'll put that right too.";
}

/**
 * `until` is for what doesn't last forever (the Ethos for Two pass, already formatted), and so also
 * marks a pass's receipt, whose right to cancel goes when its year starts (consentLine). `upgrade` is
 * the "Everything for the difference" offer after a single or a pick three: its price already takes
 * off what they've paid. `giftCard` is for a "Give Everything" card: nothing is unlocked for the
 * buyer, and the right to cancel stays until the code is redeemed (terms, section 8), so the receipt
 * must not say it has gone. `consent` is the withdrawal sentence the buyer ticked (consentLine).
 */
export function ReceiptEmail({ locale, productLabel, amountLabel, unlocks, dashboardUrl, until, upgrade, giftCard = false, consent }: { locale: L; productLabel: string; amountLabel: string; unlocks: string[]; dashboardUrl: string; until?: string; upgrade?: { url: string; amountLabel: string }; giftCard?: boolean; consent?: string }) {
  const es = locale === "es";
  const heading = giftCard
    ? es
      ? "Gracias. El código te llega en otro correo."
      : "Thank you. The code comes in its own email."
    : until
      ? es
        ? `Gracias. Es tuyo hasta el ${until}.`
        : `Thank you. It's yours until ${until}.`
      : es
        ? "Gracias. Es tuyo para siempre."
        : "Thank you. It's yours, forever.";
  return (
    <EmailLayout preview={es ? `Recibo: ${productLabel}` : `Receipt: ${productLabel}`} heading={heading} cta={{ label: es ? "Ir a mis regalos" : "Go to my gifts", href: dashboardUrl }} footer={footer[locale]}>
      <P>
        <strong>{productLabel}</strong> · {amountLabel}
      </P>
      {unlocks.length ? (
        <P>
          {es ? "Desbloqueado:" : "Unlocked:"} {unlocks.join(", ")}
        </P>
      ) : null}
      {upgrade ? (
        <Quiet>
          {es ? "¿Quieres todas las plantillas? " : "Want every template? "}
          <InlineLink href={upgrade.url}>{es ? `Para ti, «Todo» cuesta ahora ${upgrade.amountLabel}` : `For you, Everything is now ${upgrade.amountLabel}`}</InlineLink>
          {es ? ": lo que ya has pagado cuenta." : ": what you've paid already counts."}
        </Quiet>
      ) : null}
      <Quiet>{es ? "Pago único, sin renovaciones. Stripe te envía la factura por separado." : "One-time payment, no renewals. Stripe sends the invoice separately."}</Quiet>
      {/* The confirmation, on a durable medium, of the consent given at payment (Consumer Rights Directive art. 8(7)). */}
      <Quiet>{consentLine(es, giftCard ? "giftcard" : until ? "pass" : "other", consent)}</Quiet>
    </EmailLayout>
  );
}
