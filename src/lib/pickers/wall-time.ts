import { parseTime } from "./time";

/**
 * The editor's "YYYY-MM-DDTHH:mm" wall times (a countdown's moment, a scheduled gift's), picked as a
 * day and a time apart. The strings stay exactly the ones the datetime-local input used to give, so
 * everything downstream (wallTimeToIso, the store, the server) sees no difference.
 */
const WALL = /^(\d{4}-\d{2}-\d{2})T(\d{2}:\d{2})/;
/** A day picked before any time starts at midnight, as a datetime-local input's did. */
export const MIDNIGHT = "00:00";

export function splitWall(wall: string | undefined | null): { day: string; time: string } {
  const m = wall ? WALL.exec(wall) : null;
  return m ? { day: m[1], time: m[2] } : { day: "", time: "" };
}

/** The wall time for a day and a time, or "" while there is no day (a time on its own is no moment). */
export function joinWall(day: string, time: string | undefined): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return "";
  return `${day}T${parseTime(time) ? time : MIDNIGHT}`;
}
