/**
 * The sentences someone agrees to when they add a note to a group card, in the card's language. The
 * page shows them and the route stores them word for word (`agreed`, `email_consent`), so they are
 * written once, here, for both. Changing a word here changes what new notes agree to; notes already
 * stored keep the words they saw.
 */
import { GROUP_RETENTION } from "./limits";

type L = "en" | "es";

/** The required, unticked box. */
export function groupAgeLine(locale: L): string {
  return locale === "es" ? "Tengo 16 años o más." : "I'm 16 or older.";
}

/**
 * Who sees the note and what happens to it: shown above the button, with a link to the privacy page.
 * It names the photo only on a card that takes one (`takesPhotos`, the group's own setting): nobody
 * agrees to something the page never asked them for. The number of days is the promise
 * (GROUP_RETENTION.sentPromiseDays); the daily job deletes a day sooner than that, so that "within"
 * is true whatever hour the card went out.
 */
export function groupNotice(locale: L, fromName: string, takesPhotos: boolean): string {
  const days = GROUP_RETENTION.sentPromiseDays;
  if (locale === "es") {
    const what = takesPhotos ? "tu nombre, tu nota y tu foto" : "tu nombre y tu nota";
    return `${fromName} verá ${what}, y decidirá si entran en la tarjeta. Si entran, los verá quien la abra. Lo que no se use se borra en los ${days} días siguientes al envío.`;
  }
  const what = takesPhotos ? "your name, note and photo" : "your name and note";
  return `${fromName} will see ${what} and choose whether they go in. If they do, whoever opens the card sees them. What isn't used is deleted within ${days} days of the card being sent.`;
}

/** What a contribution's `agreed` column holds: the box they ticked and the notice under it. */
export function groupAgreed(locale: L, fromName: string, takesPhotos: boolean): string {
  return `${groupAgeLine(locale)} ${groupNotice(locale, fromName, takesPhotos)}`;
}

/**
 * Under the optional address field, and stored with the address as what they asked for. The card
 * comes only to someone whose note is in it (lib/group/signed-email.ts), and this says so.
 */
export function groupEmailConsent(locale: L): string {
  return locale === "es"
    ? "Te escribiremos una vez para confirmar que eres tú y, si tu nota entra en la tarjeta, otra con el enlace cuando se envíe. Después borramos tu dirección."
    : "We'll email you once to confirm it's you and, if your note goes into the card, once with the link when it's sent. Then we delete your address.";
}

/** The line every contributor's photo field carries. */
export function groupPhotoRule(locale: L): string {
  return locale === "es" ? "No subas fotos de menores que no estén a tu cargo." : "Don't upload photos of children who aren't yours.";
}
