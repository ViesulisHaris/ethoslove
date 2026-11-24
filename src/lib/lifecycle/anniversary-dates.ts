/**
 * The templates made for an anniversary, said by name. A gift carries no occasion of its own, and a
 * template's first occasion is too wide a rule: "anniversary" leads thirteen manifests, The Letter
 * among them (most gifts, apologies included) and Museum (mother's and father's day too). So the
 * line goes only where the template is about a couple's years. The owner chooses who joins.
 */
export const ANNIVERSARY_LED: ReadonlySet<string> = new Set(["our-timeline"]);

/**
 * Whether the share screen offers date ideas under the reminders: an anniversary template, to a
 * sender who is signed in (the line sits under the reminders card, which only they see). Never the
 * trip gift ("Pack your bags"): its screen already has the trip to book.
 */
export const showsAnniversaryDates = (templateSlug: string, authed: boolean): boolean => authed && ANNIVERSARY_LED.has(templateSlug);
