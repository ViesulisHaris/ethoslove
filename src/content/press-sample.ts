import type { PressNumbers } from "@/lib/press/figures";

/**
 * INVENTED figures, for looking at /press on a dev server (PRESS_PREVIEW=1) and for its tests.
 * Never the truth, never shown by a production build (lib/press/shown.ts), and never to be copied
 * into press-numbers.ts: a test fails if the committed snapshot equals this one.
 */
export const PRESS_SAMPLE: PressNumbers = {
  ready: true,
  asOf: "2026-11-20",
  cardsMade: 21480,
  cardsOpened: 15930,
  opens: 52310,
  openedAgain: 9870,
  phoneOpens: 46120,
  deviceOpens: 52310,
  topTemplates: [
    { slug: "the-letter", made: 6890 },
    { slug: "bouquet", made: 2410 },
    { slug: "jar-of-reasons", made: 1730 },
    { slug: "scratch-card", made: 1390 },
    { slug: "constellations", made: 1120 },
  ],
  countries: 64,
  reminders: { total: 840, birthday: 410, anniversary: 290, valentines: 60 },
};
