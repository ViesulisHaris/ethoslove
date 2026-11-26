/**
 * The date letter's switch (BRIEF-letter.md 5). No imports: the pages, the routes and the legal text
 * read it, and nothing it pulls in may reach a client bundle.
 */

/** DATE_LETTER=on (server). Anything else: no box, no route answers, the job sends nothing. */
export const dateLetterOn = (env: Record<string, string | undefined> = process.env): boolean => env.DATE_LETTER === "on";

/** Which kind of page a sign-up came from: the one thing `letter_asked` carries. Only the kinds that have the box. */
export const LETTER_WHERE = ["dates", "date-city", "date-kind", "trips", "long-distance", "blog"] as const;
export type LetterWhere = (typeof LETTER_WHERE)[number];
