import { joinDe } from "@/lib/keep/keep";
import { CtaButton, EmailLayout, InlineLink, Mono, P, Quiet } from "./layout";

type L = "en" | "es";
const bare = (url: string) => url.replace(/^https?:\/\//, "");

export const keepConfirmSubject = (locale: L) => (locale === "es" ? "Confirma para guardar el regalo" : "Confirm to keep the gift");
export const keepLinkSubject = (locale: L, sender = "") =>
  sender ? (locale === "es" ? `Tu regalo de ${sender}` : `Your gift from ${sender}`) : locale === "es" ? "El enlace de tu regalo" : "Your gift's link";

/**
 * The one email a "keep this gift" request sends before anything else: an address must say yes
 * before it gets the link or any reminder. It names nobody and nothing about the gift, since anyone
 * can type any address into the form, and it says how to never get one again.
 */
export function KeepConfirmEmail({ locale, confirmUrl, neverUrl }: { locale: L; confirmUrl: string; neverUrl: string }) {
  const es = locale === "es";
  return (
    <EmailLayout
      lang={locale}
      preview={es ? "Confirma y te enviamos el enlace. Si no fuiste tú, no hagas nada." : "Confirm and we'll send the link. If it wasn't you, do nothing."}
      heading={es ? "¿Guardamos el regalo?" : "Keep the gift?"}
      footer={es ? "Recibes esto porque alguien escribió esta dirección para guardar un regalo en Ethos." : "You're getting this because this address was entered to keep a gift on Ethos."}
      footerLink={{ label: es ? "No escribirme nunca más" : "Never email me", href: neverUrl }}
    >
      <P>{es ? "Esta dirección se acaba de escribir para guardar un regalo en Ethos. Si fuiste tú, confírmalo y te enviamos su enlace." : "This address was just entered to keep a gift on Ethos. If that was you, confirm and its link is on its way."}</P>
      <CtaButton href={confirmUrl} label={es ? "Sí, envíame el enlace" : "Yes, email me the link"} />
      <Quiet>
        {es ? "¿No fuiste tú? No hagas nada: sin confirmar, no te llega nada más. O " : "Not you? Do nothing: without a confirmation, nothing else comes. Or "}
        <InlineLink href={neverUrl}>{es ? "pide que no te escribamos nunca" : "ask us never to email you"}</InlineLink>.
      </Quiet>
    </EmailLayout>
  );
}

/** A day a keeper will be reminded of, already in words: "their birthday", "3 May". */
export type KeptDay = { label: string; date: string };

/**
 * After the confirmation: the gift's own link, to open it again any time, and the days they will be
 * reminded of. The address has said yes, so `sender`, the first name on the gift, may say whom it is
 * from; nothing else comes from the gift: no other names, no photos, no words.
 */
export function KeepLinkEmail({ locale, giftUrl, days, sender = "", stopUrl }: { locale: L; giftUrl: string; days: KeptDay[]; sender?: string; stopUrl: string }) {
  const es = locale === "es";
  const list = new Intl.ListFormat(es ? "es" : "en-GB", { style: "long", type: "conjunction" }).format(days.map((d) => `${d.label} (${d.date})`));
  return (
    <EmailLayout
      lang={locale}
      preview={es ? "Para abrirlo cuando quieras." : "To open it again any time."}
      heading={sender ? (es ? `Aquí tienes tu regalo de ${sender}.` : `Here's your gift from ${sender}.`) : es ? "Aquí tienes tu regalo." : "Here's your gift."}
      footer={es ? "Recibes esto porque pediste a Ethos que te guardara este regalo." : "You're getting this because you asked Ethos to keep this gift for you."}
      footerLink={{ label: es ? "Darme de baja" : "Unsubscribe", href: stopUrl }}
    >
      <P>{es ? "Ábrelo cuando quieras con este enlace:" : "Open it again any time with this link:"}</P>
      <Mono>
        <a href={giftUrl} style={{ color: "#1A1614" }}>
          {bare(giftUrl)}
        </a>
      </Mono>
      <CtaButton href={giftUrl} label={es ? "Abrir el regalo" : "Open the gift"} />
      {days.length > 0 ? <Quiet>{es ? joinDe(`Y te escribiremos nueve días antes de ${list}.`) : `And we'll email you nine days before ${list}.`}</Quiet> : null}
    </EmailLayout>
  );
}
