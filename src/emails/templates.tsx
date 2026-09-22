import { EmailLayout, P, Quiet } from "./layout";

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

export function GiftOpenedEmail({ locale, recipientName, dashboardUrl }: { locale: L; recipientName: string; dashboardUrl: string }) {
  const es = locale === "es";
  return (
    <EmailLayout preview={es ? `${recipientName} acaba de abrir tu regalo.` : `${recipientName} just opened your gift.`} heading={es ? `${recipientName} lo ha abierto.` : `${recipientName} opened it.`} cta={{ label: es ? "Ver estadísticas" : "See the stats", href: dashboardUrl }} footer={footer[locale]}>
      <P>{es ? "Ahora mismo. Con el sonido activado, esperamos." : "Just now. Sound on, we hope."}</P>
      <Quiet>{es ? "Solo te avisamos de la primera apertura. El resto está en tu panel." : "We only email about the first open. The rest is on your dashboard."}</Quiet>
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

export function ReceiptEmail({ locale, productLabel, amountLabel, unlocks, dashboardUrl }: { locale: L; productLabel: string; amountLabel: string; unlocks: string[]; dashboardUrl: string }) {
  const es = locale === "es";
  return (
    <EmailLayout preview={es ? `Recibo: ${productLabel}` : `Receipt: ${productLabel}`} heading={es ? "Gracias. Es tuyo para siempre." : "Thank you. It's yours, forever."} cta={{ label: es ? "Ir a mis regalos" : "Go to my gifts", href: dashboardUrl }} footer={footer[locale]}>
      <P>
        <strong>{productLabel}</strong> · {amountLabel}
      </P>
      <P>{es ? "Desbloqueado:" : "Unlocked:"} {unlocks.join(", ")}</P>
      <Quiet>{es ? "Pago único, sin renovaciones. Stripe te envía la factura por separado." : "One-time payment, no renewals. Stripe sends the invoice separately."}</Quiet>
      {/* The confirmation, on a durable medium, of the consent given at payment (Consumer Rights Directive art. 8(7)). */}
      <Quiet>
        {es
          ? "Pediste que se desbloqueara al instante, así que el derecho de desistimiento de 14 días ya no se aplica. Si algo no funciona, responde a este correo y lo solucionamos."
          : "You asked for it to be unlocked straight away, so the 14-day right to cancel no longer applies. If anything doesn't work, reply to this email and we'll put it right."}
      </Quiet>
    </EmailLayout>
  );
}
