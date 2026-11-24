/**
 * What a reminder e-mail's "Open my gift" starts the new gift from (api/reminders/open), as the
 * editor's address (`?start=`) and the cookie `ethos_start_from` carry it: a gift's id (its names and
 * photos come into the new gift, read in the owner's own browser), or "r-" and a reminder's id when
 * no gift was made for that person (only their name comes in). Ids only, never a name.
 */
export const START_COOKIE = "ethos_start_from";
/** Two hours: long enough to look through the gallery first, gone before the day is out. */
export const START_COOKIE_SECONDS = 2 * 60 * 60;
export const START_PARAM = "start";

const UUID = "[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}";
const PATTERN = new RegExp(`^(r-)?(${UUID})$`);

export type StartRef = { kind: "gift"; id: string } | { kind: "reminder"; id: string };

export function parseStartRef(value: string | null | undefined): StartRef | null {
  const match = PATTERN.exec((value ?? "").trim().toLowerCase());
  if (!match) return null;
  return match[1] ? { kind: "reminder", id: match[2] } : { kind: "gift", id: match[2] };
}

export const startRefValue = (ref: StartRef): string => (ref.kind === "gift" ? ref.id : `r-${ref.id}`);

/** The value of a cookie in `document.cookie`, or null. */
export function readCookie(cookies: string, name: string): string | null {
  for (const part of cookies.split(";")) {
    const [key, ...rest] = part.trim().split("=");
    if (key === name) return decodeURIComponent(rest.join("="));
  }
  return null;
}
