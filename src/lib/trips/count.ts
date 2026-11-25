/**
 * How many preset trips there are (lib/trips/presets.ts), for the editor's "One of our twelve trips"
 * line: the editor loads the trips themselves (90 KB) only when asked, so it reads this instead.
 * tests/unit/catalogue-counts.test.ts fails the moment it differs from TRIPS.length.
 */
export const TRIP_COUNT = 12;
