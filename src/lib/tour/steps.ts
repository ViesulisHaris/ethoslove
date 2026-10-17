import type { TourRoom } from "./room";

/**
 * What each room's tour points at, as data. A step names a few selectors, best first, and lights
 * the first one that is on screen. Pages keep their own markup: where there was no stable handle
 * it is a `data-tour` attribute, and otherwise a role, a label or a `data-testid` that the e2e
 * suite already leans on, so a redesign that breaks the tour breaks a test first.
 *
 * The words live in messages under `tour.<room>.<step id>`.
 */
export type TourStep = {
  id: string;
  targets: readonly string[];
  /** With nothing on screen to point at, say it in the middle of the screen rather than skip it. */
  fallback?: "center";
};

export type TourConfig = {
  /**
   * "This room has finished loading." The tour only starts by itself once one of these is on
   * screen, so it never opens over a skeleton and then skips half its steps.
   */
  ready: readonly string[];
  steps: readonly TourStep[];
  /** How far down the page's own bar reaches: a lit target is never scrolled in under it. */
  topInset: number;
};

/** The marketing header floats 12px down and is 56px tall; the layout calls that `--header-h`. */
const MARKETING_BAR = 76;
/** The editor's sticky top bar, 3.5rem, plus its hairline. */
const EDITOR_BAR = 60;

/**
 * The trips page's own "make the gift" button, for a visitor who hasn't opened a trip yet. It is
 * `/templates/${TRIP_GIFT_SLUG}` (lib/trips/trip-gift); importing that module would pull the
 * places catalogue into the tour's chunk, so the slug is spelled out and a unit test holds the two
 * together.
 */
export const TRIP_GIFT_LINK = 'a[href$="/templates/pack-your-bags"]';

// The cards sit in a set of their own (dates-explorer's ListSet), and while one set gives way to the
// next the old one lingers, inert, for its fade: the first card is the live set's.
const FIRST_PLACE = '[data-tour="places"] > :not([inert]) > .place-card-in';

export const TOURS: Record<TourRoom, TourConfig> = {
  dates: {
    // The list stops being busy once the first search has answered, with places or without.
    ready: ['[data-tour="places"][aria-busy="false"]'],
    topInset: MARKETING_BAR,
    steps: [
      { id: "where", targets: ['[data-tour="where"]'] },
      { id: "when", targets: ['[data-tour="when"]'] },
      { id: "mood", targets: ['[data-tour="vibes"]'] },
      { id: "place", targets: [FIRST_PLACE] },
      // A card's only pressable toggle is its "add to our plan" button.
      { id: "add", targets: [`${FIRST_PLACE} button[aria-pressed]`] },
      // "Our plan" only appears once something is in it, and this is the step that matters most.
      { id: "plan", targets: ['[data-tour="plan"]'], fallback: "center" },
    ],
  },
  editor: {
    ready: ['[data-tour="form"]'],
    topInset: EDITOR_BAR,
    steps: [
      { id: "template", targets: ['[data-tour="template"]', 'header a[href$="/templates"]'] },
      // The two name fields sit in one row; `:has()` finds that row without a hook in the section.
      { id: "names", targets: ['[data-tour="form"] div:has(> div > #recipientName)', "#recipientName"] },
      { id: "media", targets: ['[data-tour="form"] div:has(> input[type="file"][accept^="image"])'] },
      // A laptop has the phone preview beside the form; a phone has the Edit / Preview switch.
      { id: "preview", targets: ['[data-tour="preview"] > *', 'header [role="tablist"]'] },
      { id: "publish", targets: ['[data-tour="publish"]', "header > div > button:last-child"] },
    ],
  },
  games: {
    // The hub, or a game's own lobby once it carries its handles.
    ready: ['[data-tour="phones"]', '[data-tour="mode"]'],
    topInset: MARKETING_BAR,
    steps: [
      { id: "phones", targets: ['[data-tour="phones"]', '[data-tour="mode"]'] },
      { id: "room", targets: ['[data-tour="room"]', '[data-tour="two-phones"]'] },
      { id: "packs", targets: ['[data-tour="packs"]'] },
    ],
  },
  trips: {
    ready: ['[data-testid="flight-finder"]'],
    topInset: MARKETING_BAR,
    steps: [
      { id: "flights", targets: ['[data-testid="flight-finder"]'] },
      // Only on the list of trips. Inside one it is already open, and its day-by-day stops sit
      // between the hero and the flights: lighting them would scroll the page down, up, then down.
      { id: "trip", targets: ['[data-testid="trip-card"]'] },
      { id: "surprise", targets: ['[data-testid="make-surprise"]', TRIP_GIFT_LINK] },
    ],
  },
};

/** Whether a step can be shown now: something to point at, or a way to do without. */
export function canShow(step: TourStep, isOnScreen: (step: TourStep) => boolean): boolean {
  return step.fallback === "center" || isOnScreen(step);
}

/** The steps worth showing when the tour opens; the dots count these, not the whole list. */
export function playableSteps(steps: readonly TourStep[], isOnScreen: (step: TourStep) => boolean): TourStep[] {
  return steps.filter((step) => canShow(step, isOnScreen));
}

/**
 * The next step to show from `from`, going `dir`, passing over any whose target has gone since the
 * tour began (a sheet closed, a list emptied). -1 when there is nothing further that way.
 */
export function stepAfter(steps: readonly TourStep[], from: number, dir: 1 | -1, isShowable: (step: TourStep) => boolean): number {
  for (let i = from + dir; i >= 0 && i < steps.length; i += dir) {
    if (isShowable(steps[i])) return i;
  }
  return -1;
}
