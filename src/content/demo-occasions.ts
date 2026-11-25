import type { GiftGuideSlug } from "./gift-guides";

/**
 * What a template's own demo is made for, where that is something other than a couple's ordinary
 * day: its poster and its film show the demo, so a page that puts the template in a picture shows
 * this too (Museum's poster reads "DANI → MAMÁ", Midnight Countdown's "Until you're 30").
 *
 * Read from the demos themselves (src/templates/<slug>/demo-data.ts): the recipient and sender,
 * the title, the message and the fields. tests/unit/demo-occasions.test.ts derives the same list from
 * that data and fails when the two differ, so a demo that changes, or a new template whose demo names
 * a birthday or a parent, has to be named here before any page can show it by mistake.
 */
export type DemoMark =
  | "birthday"
  | "christmas"
  | "proposal"
  | "apology"
  | "halloween"
  | "thanksgiving"
  | "graduation"
  /** Sent to a mother or a father, or by one. */
  | "parent"
  /** Sent to a couple by a friend (The Toast: "Elena · Ana & Marco"). */
  | "friends";

export const DEMO_MARKS: Readonly<Record<string, readonly DemoMark[]>> = {
  "birthday-cinema": ["birthday"],
  "midnight-countdown": ["birthday"],
  "front-page": ["birthday"],
  digicam: ["birthday"],
  balloons: ["birthday"],
  "popup-card": ["birthday"],
  sketchbook: ["birthday"],
  "party-animals": ["birthday"],
  museum: ["parent"],
  bloom: ["parent"],
  "recipe-box": ["parent"],
  "cap-toss": ["christmas", "parent"],
  "the-toast": ["friends"],
  "scratch-card": ["proposal"],
  "paper-crane": ["apology"],
  "trick-or-treat": ["halloween"],
  "spooky-season": ["halloween"],
  "be-my-boo": ["halloween"],
  seance: ["halloween"],
  "jack-o-lantern": ["halloween"],
  "haunted-house": ["halloween"],
  "nice-list": ["christmas"],
  unwrapped: ["christmas"],
  "frosted-window": ["christmas"],
  "string-the-lights": ["christmas"],
  "gingerbread-house": ["christmas"],
  wishbone: ["thanksgiving"],
  "light-the-candles": ["thanksgiving"],
};

/**
 * What a page that may show a template in a picture is about, beyond a couple. The months and the
 * memory book are a couple's own days; the apology pages are about saying sorry; the surprise page
 * names a birthday at midnight among its reveals, and a proposal is the surprise Scratch Card's own
 * demo keeps for its last card.
 */
export const PAGE_ABOUT: Readonly<Partial<Record<GiftGuideSlug | "month", readonly DemoMark[]>>> = {
  month: [],
  "apology-for-him": ["apology"],
  "apology-for-her": ["apology"],
  "long-distance-care-package": [],
  surprise: ["birthday", "proposal"],
  "memory-book": [],
};

/** Whether a page about `about` can show this template's poster or film without it saying something the page is not about. */
export function demoFits(template: string, about: readonly DemoMark[]): boolean {
  return (DEMO_MARKS[template] ?? []).every((mark) => about.includes(mark));
}
