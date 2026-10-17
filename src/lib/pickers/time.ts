/**
 * A time of day as the plans and the gifts keep it: "HH:mm", 24-hour, or nothing. The picker
 * offers every hour and the quarters; a time saved before with other minutes ("18:10") keeps them,
 * and they are offered too so the card can show what is chosen.
 */
export type Time = { hour: number; minute: number };

export const HOURS = Array.from({ length: 24 }, (_, hour) => hour);
/** The minutes a tap offers: the quarters, which is what people plan to. */
export const QUARTERS = [0, 15, 30, 45] as const;
/** What a new time starts on when an hour is picked before any minutes. */
const FIRST_MINUTE = 0;

const TIME = /^([01]\d|2[0-3]):([0-5]\d)$/;
const pad = (n: number) => String(n).padStart(2, "0");

export function parseTime(value: string | undefined | null): Time | null {
  const m = value ? TIME.exec(value) : null;
  return m ? { hour: Number(m[1]), minute: Number(m[2]) } : null;
}

export const formatTime = ({ hour, minute }: Time): string => `${pad(hour)}:${pad(minute)}`;

/** A tap on an hour: that hour, keeping the minutes already chosen (or on the hour when there are none). */
export function withHour(value: string | undefined, hour: number): string {
  return formatTime({ hour, minute: parseTime(value)?.minute ?? FIRST_MINUTE });
}

/** A tap on the minutes: only once there is an hour to put them on. */
export function withMinute(value: string | undefined, minute: number): string | undefined {
  const time = parseTime(value);
  return time ? formatTime({ hour: time.hour, minute }) : undefined;
}

/** The minutes the card offers: the quarters, and the time's own minutes when they are not one of them. */
export function minuteChoices(value: string | undefined): number[] {
  const minute = parseTime(value)?.minute;
  const quarters: number[] = [...QUARTERS];
  return minute === undefined || quarters.includes(minute)
    ? quarters
    : [...quarters, minute].sort((a, b) => a - b);
}

/**
 * Where an arrow key moves the focus in a grid of `count` choices laid out `columns` across, as a
 * radio group does it: left and right one, up and down a row, Home and End the ends. It stays put at
 * the edges rather than wrapping, so holding a key never jumps from 23 back to 00. Null for a key the
 * grid doesn't use.
 */
export function moveInGrid(
  index: number,
  key: string,
  columns: number,
  count: number,
): number | null {
  let to: number;
  if (key === "ArrowLeft") to = index - 1;
  else if (key === "ArrowRight") to = index + 1;
  else if (key === "ArrowUp") to = index - columns;
  else if (key === "ArrowDown") to = index + columns;
  else if (key === "Home") to = 0;
  else if (key === "End") to = count - 1;
  else return null;
  return to < 0 || to >= count ? index : to;
}
