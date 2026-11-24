/**
 * A link set as a pill, for the rows that lead from one gift page to its neighbours: by person, by
 * kind, by occasion. Written once, so every row is 44px to a thumb and has a focus ring and a
 * pressed state. It used to be copied into each page, and the rows on /gifts had drifted to 40px
 * with neither.
 */
export const CHIP =
  "inline-flex min-h-11 items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors outline-none hover:border-ink/40 focus-visible:ring-3 focus-visible:ring-ring/50 active:bg-paper-deep";
