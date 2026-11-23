import type { PressNumbers } from "@/lib/press/figures";

/**
 * The figures of /press, as scripts/press-numbers.sql returned them on `asOf`. NOT FILLED IN YET:
 * these are zeros, and while `ready` is false the page is a 404 and is in no sitemap, footer or
 * llms.txt. Whoever runs the query pastes its result here key for key and sets `ready`
 * (docs/marketing/growth-build/PLAN-partners.md, "When the numbers arrive").
 * tests/unit/press.test.ts fails if `ready` is true while any figure is 0.
 */
export const PRESS_NUMBERS: PressNumbers = {
  ready: false,
  asOf: "2026-11-23",
  cardsMade: 0,
  cardsOpened: 0,
  opens: 0,
  openedAgain: 0,
  phoneOpens: 0,
  deviceOpens: 0,
  topTemplates: [],
  countries: null,
  reminders: null,
};
