/**
 * The sentences someone agrees to when they add a note to a group card, in the card's language. The
 * page shows them and the route stores them word for word (`agreed`, `email_consent`), so they are
 * written once, here, for both. Changing a word here changes what new notes agree to; notes already
 * stored keep the words they saw.
 */
type L = "en" | "es";

/** The required, unticked box. */
export function groupAgeLine(locale: L): string {
  return locale === "es" ? "Tengo 16 años o más." : "I'm 16 or older.";
}

/** Who sees the note and what happens to it: shown above the button, with a link to the privacy page. */
export function groupNotice(locale: L, fromName: string): string {
  return locale === "es"
    ? `${fromName} verá tu nombre, tu nota y tu foto, y decide si entran en la tarjeta. Si entran, las verá quien la abra. Lo que no se use se borra en los 7 días siguientes al envío.`
    : `${fromName} will see your name, note and photo and chooses whether they go in. If they do, whoever opens the card sees them. What isn't used is deleted within 7 days of the card being sent.`;
}

/** What a contribution's `agreed` column holds: the box they ticked and the notice under it. */
export function groupAgreed(locale: L, fromName: string): string {
  return `${groupAgeLine(locale)} ${groupNotice(locale, fromName)}`;
}

/** Under the optional address field, and stored with the address as what they asked for. */
export function groupEmailConsent(locale: L): string {
  return locale === "es"
    ? "Te escribiremos una vez para confirmar que eres tú y otra con el enlace cuando la tarjeta se envíe. Después borramos tu dirección."
    : "We'll email you once to confirm it's you, and once with the link when the card is sent. Then we delete your address.";
}

/** The line every contributor's photo field carries. */
export function groupPhotoRule(locale: L): string {
  return locale === "es" ? "No subas fotos de menores que no estén a tu cargo." : "Don't upload photos of children who aren't yours.";
}
