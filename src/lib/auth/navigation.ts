/**
 * Whether a request is someone opening a page (a tap on a link, an address typed or followed),
 * rather than an image, a script or a fetch made by a page. The sign-in links act on the first:
 * loaded as a picture inside a gift, /auth/confirm used to sign every recipient in to the sender's
 * account. Browsers say what they are loading in Sec-Fetch-Dest; one too old to send it is let
 * through, as before, so nobody honest is turned away.
 */
export function isPageNavigation(headers: Headers): boolean {
  const dest = headers.get("sec-fetch-dest");
  return !dest || dest === "document";
}
