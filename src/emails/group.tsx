import { CtaButton, EmailLayout, InlineLink, Mono, P, Quiet } from "./layout";

type L = "en" | "es";
const bare = (url: string) => url.replace(/^https?:\/\//, "");

export const groupConfirmSubject = (locale: L) => (locale === "es" ? "Confirma para recibir la tarjeta" : "Confirm to be sent the card");
export const groupSignedSubject = (locale: L, fromName: string) => (locale === "es" ? `${fromName} ha enviado la tarjeta que firmaste` : `${fromName} sent the card you signed`);
export const groupNudgeSubject = (locale: L, n: number, forName: string) =>
  locale === "es" ? (n === 1 ? `Una nota espera en tu tarjeta para ${forName}` : `${n} notas esperan en tu tarjeta para ${forName}`) : n === 1 ? `A note is waiting for your card for ${forName}` : `${n} notes are waiting for your card for ${forName}`;

/**
 * The one email someone who added a note to a group card gets before anything else: their address
 * must say yes before it is sent the finished card. Anyone with a card's link can type any address,
 * so this names nobody and nothing about the card, and says how to never get one again.
 */
export function GroupConfirmEmail({ locale, confirmUrl, neverUrl }: { locale: L; confirmUrl: string; neverUrl: string }) {
  const es = locale === "es";
  return (
    <EmailLayout
      lang={locale}
      preview={es ? "Confirma y te enviamos la tarjeta cuando esté lista. Si no fuiste tú, no hagas nada." : "Confirm and we'll send the card when it's ready. If it wasn't you, do nothing."}
      heading={es ? "¿Te enviamos la tarjeta?" : "Send you the card?"}
      footer={es ? "Recibes esto porque alguien escribió esta dirección al añadir una nota a una tarjeta en grupo de Ethos." : "You're getting this because this address was entered when a note was added to a group card on Ethos."}
      footerLink={{ label: es ? "No escribirme nunca más" : "Never email me", href: neverUrl }}
    >
      <P>
        {es
          ? "Esta dirección se acaba de escribir para recibir una tarjeta en grupo de Ethos cuando se envíe. Si fuiste tú, confírmalo."
          : "This address was just entered to be sent a group card on Ethos once it goes out. If that was you, confirm."}
      </P>
      <CtaButton href={confirmUrl} label={es ? "Sí, envíamela" : "Yes, send it to me"} />
      <Quiet>
        {es ? "¿No fuiste tú? No hagas nada: sin confirmar, no te llega nada más. O " : "Not you? Do nothing: without a confirmation, nothing else comes. Or "}
        <InlineLink href={neverUrl}>{es ? "pide que no te escribamos nunca" : "ask us never to email you"}</InlineLink>.
      </Quiet>
    </EmailLayout>
  );
}

/**
 * "Here's the card you signed": the one email a contributor asked for, sent once the card is out
 * and their note is in it. The address has said yes, so it may say who sent the card; it carries
 * the card's own link and nothing else from it. Their address is deleted as this goes.
 */
export function GroupSignedEmail({ locale, fromName, giftUrl, hasPassword, makeUrl }: { locale: L; fromName: string; giftUrl: string; hasPassword: boolean; makeUrl: string }) {
  const es = locale === "es";
  return (
    <EmailLayout
      lang={locale}
      preview={es ? "Tu nota va dentro. Ábrela cuando quieras." : "Your note is in it. Open it any time."}
      heading={es ? `${fromName} ha enviado la tarjeta a la que añadiste tu nota.` : `${fromName} sent the card you added a note to.`}
      footer={es ? "Lo pediste al añadir tu nota. Es el único correo, y ya hemos borrado tu dirección." : "You asked for this when you added your note. It's the only email, and we've deleted your address."}
    >
      <P>{es ? "Puedes abrirla con este enlace:" : "You can open it with this link:"}</P>
      <Mono>
        <a href={giftUrl} style={{ color: "#1A1614" }}>
          {bare(giftUrl)}
        </a>
      </Mono>
      {hasPassword ? <Quiet>{es ? `${fromName} le ha puesto una contraseña: pídesela.` : `${fromName} set a password; ask them for it.`}</Quiet> : null}
      <CtaButton href={giftUrl} label={es ? "Abrir la tarjeta" : "Open the card"} />
      <Quiet>
        <InlineLink href={makeUrl}>{es ? "Haz una para alguien" : "Make one for someone"}</InlineLink>
      </Quiet>
    </EmailLayout>
  );
}

/** To the sender: notes are waiting for their yes. At most one a day, and it names only who the card is for. */
export function GroupNudgeEmail({ locale, count, forName, editorUrl }: { locale: L; count: number; forName: string; editorUrl: string }) {
  const es = locale === "es";
  const one = count === 1;
  return (
    <EmailLayout
      lang={locale}
      preview={es ? "Nada entra en la tarjeta hasta que tú lo decidas." : "Nothing goes into the card until you say so."}
      heading={es ? (one ? `Una nota espera en tu tarjeta para ${forName}.` : `${count} notas esperan en tu tarjeta para ${forName}.`) : one ? `A note is waiting for your card for ${forName}.` : `${count} notes are waiting for your card for ${forName}.`}
      footer={es ? "Recibes esto porque compartiste el enlace de una tarjeta en grupo. Como mucho, un aviso al día." : "You're getting this because you shared a group card's link. One of these a day at most."}
    >
      <P>{es ? "Ábrela para leerlas y elegir cuáles entran." : "Open it to read them and choose which go in."}</P>
      <CtaButton href={editorUrl} label={es ? "Ver las notas" : "See the notes"} />
    </EmailLayout>
  );
}
