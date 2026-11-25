import type { LetterWords } from "@/content/date-letter";
import { CtaButton, EmailLayout, InlineLink, P, Quiet } from "./layout";

type L = "en" | "es";

export const letterConfirmSubject = (locale: L): string => (locale === "es" ? "Confirma tu carta de citas" : "Confirm your date letter");

/**
 * The one e-mail the date letter's box sends before anything else (lib/lifecycle/date-letter-store.ts):
 * nothing weekly goes until its button is pressed. It names nobody, since anyone can type any
 * address into the box, and it says how never to get one again (`stopUrl` deletes the address and
 * puts it on the unsubscribe list).
 */
export function LetterConfirmEmail({ locale, confirmUrl, stopUrl }: { locale: L; confirmUrl: string; stopUrl: string }) {
  const es = locale === "es";
  return (
    <EmailLayout
      lang={locale}
      preview={es ? "Confirma y empiezan a llegar. Si no fuiste tú, no hagas nada." : "Confirm and the letters start. If it wasn’t you, do nothing."}
      heading={es ? "¿Una idea de cita cada jueves?" : "One date idea every Thursday?"}
      footer={es ? "Recibes esto porque alguien escribió esta dirección para la carta de citas de Ethos." : "You’re getting this because this address was entered for the date letter on Ethos."}
      footerLink={{ label: es ? "No escribirme nunca" : "Never email me", href: stopUrl }}
    >
      <P>
        {es
          ? "Alguien acaba de escribir esta dirección en Ethos para recibir la carta de citas: una idea de cita a la semana, lista para el fin de semana. Si fuiste tú, confírmalo aquí abajo. Hasta entonces no te llegará nada."
          : "This address was just entered on Ethos for the date letter: one date idea a week, ready for the weekend. If that was you, confirm below. Nothing comes until you do."}
      </P>
      <CtaButton href={confirmUrl} label={es ? "Sí, envíame la carta de citas" : "Yes, send me the date letter"} />
      <Quiet>
        {es ? "¿No fuiste tú? No hagas nada, o " : "Not you? Do nothing, or "}
        <InlineLink href={stopUrl}>{es ? "pide que no escribamos nunca a esta dirección" : "ask us never to email this address"}</InlineLink>.
      </Quiet>
    </EmailLayout>
  );
}

/**
 * This week's date letter: one of the site's date ideas as a plan for the weekend (what it is, about
 * how long, about what it costs in words, the twist unless the opening already says it, a line to say),
 * one button to plan it, and only where a gift honestly fits the idea, one quiet line saying the plan
 * can be wrapped in one. That line has no link of its own: a gift wraps a plan, and the plan is made
 * behind the button (an empty /plan has nothing to wrap). No picture but the mark, no name, no amount,
 * nothing that tracks. The stop link is the footer's, once, beside the mail app's own unsubscribe button.
 */
export function DateLetterEmail({ locale, words, planUrl, stopUrl }: { locale: L; words: LetterWords; planUrl: string; stopUrl: string }) {
  const es = locale === "es";
  return (
    <EmailLayout
      lang={locale}
      preview={words.open}
      heading={words.title}
      footer={es ? "Recibes esto porque pediste la carta de citas de Ethos." : "You’re getting this because you asked for the date letter on Ethos."}
      footerLink={{ label: es ? "Dejar de recibir estos correos" : "Stop these emails", href: stopUrl }}
    >
      <P>{words.open}</P>
      <Quiet>{`${words.about} ${words.cost}`}</Quiet>
      {words.twist ? <P>{`${es ? "El giro: " : "The twist: "}${words.twist}`}</P> : null}
      <P>{es ? `Qué decirle: «${words.say}»` : `What to say: “${words.say}”`}</P>
      <CtaButton href={planUrl} label={es ? "Planear esta cita" : "Plan this date"} />
      {words.gift ? (
        <Quiet>
          {es
            ? "Cuando esté planeada, puedes envolver el plan en un regalo y enviarlo como invitación."
            : "Once it’s planned, you can wrap the plan in a gift and send that as the invitation."}
        </Quiet>
      ) : null}
    </EmailLayout>
  );
}
