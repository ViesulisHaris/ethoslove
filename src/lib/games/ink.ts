/**
 * The drawing in "Draw it, guess it", as it travels between two phones. Points are fractions of the
 * board (0 to 1), never pixels, in flat arrays (x, y, x, y…), because a finger sends many a second.
 *
 * The realtime server delivers one phone's messages to the other out of order now and then (it has
 * been seen swapping neighbours three places apart), and a curve drawn through points in the wrong
 * order gets nicks and back-steps. So every ink message is numbered by the phone that sends it and
 * the other phone applies them in that order, holding any that arrive early; each batch of points
 * also says where in its stroke it goes, so even a batch that comes after a gap lands in its place.
 */
export type Stroke = { id: number; points: number[]; colour: string; width: number };

export type InkOp = { t: "start"; stroke: Stroke } | { t: "more"; id: number; at: number; p: number[] } | { t: "all"; strokes: Stroke[] } | { t: "clear" };
/** `s` is the sending page (fresh on every load), `q` its count, `k` the round the ink belongs to. */
export type InkNote = { s: string; q: number; k: string; op: InkOp };

const isNumbers = (value: unknown): value is number[] => Array.isArray(value) && value.every((n) => n === null || typeof n === "number");
const isStroke = (value: unknown): value is Stroke => {
  if (typeof value !== "object" || value === null) return false;
  const { id, points, colour, width } = value as Partial<Stroke>;
  return typeof id === "number" && isNumbers(points) && typeof colour === "string" && typeof width === "number";
};

export function readInkNote(payload: unknown): InkNote | null {
  if (typeof payload !== "object" || payload === null) return null;
  const { s, q, k, op } = payload as Partial<InkNote>;
  if (typeof s !== "string" || typeof q !== "number" || !Number.isInteger(q) || q < 0 || typeof k !== "string" || typeof op !== "object" || op === null) return null;
  const fits =
    (op.t === "start" && isStroke(op.stroke)) ||
    (op.t === "more" && typeof op.id === "number" && typeof op.at === "number" && Number.isInteger(op.at) && op.at >= 0 && isNumbers(op.p)) ||
    (op.t === "all" && Array.isArray(op.strokes) && op.strokes.every(isStroke)) ||
    op.t === "clear";
  return fits ? { s, q, k, op } : null;
}

/* ------------------------------------------------------------------ in the order they were sent */

/** One sender's messages: the next number due, and any that arrived ahead of it. */
export type Ordered<T> = { s: string; next: number; held: { q: number; body: T }[] };

/**
 * Take message `q` from sender `s` and hand back whatever can now be applied, in order. A page that
 * loads again starts counting from 0 under a new `s`. A `whole` message (the full drawing) stands
 * for everything before it, so it is applied at once and anything older is dropped.
 */
export function orderedTake<T>(stream: Ordered<T> | null, s: string, q: number, body: T, whole = false): { stream: Ordered<T>; ready: T[] } {
  const base: Ordered<T> = stream && stream.s === s ? stream : { s, next: 0, held: [] };
  if (q < base.next || base.held.some((h) => h.q === q)) return { stream: base, ready: [] };
  if (whole) {
    const later = base.held.filter((h) => h.q > q);
    return drain({ s, next: q + 1, held: later }, [body]);
  }
  const held = [...base.held, { q, body }].sort((a, b) => a.q - b.q);
  return drain({ s, next: base.next, held }, []);
}

function drain<T>(stream: Ordered<T>, ready: T[]): { stream: Ordered<T>; ready: T[] } {
  let { next } = stream;
  const held = stream.held.slice();
  while (held.length > 0 && held[0].q === next) {
    ready.push(held.shift()!.body);
    next += 1;
  }
  return { stream: { s: stream.s, next, held }, ready };
}

/** A message that never came: stop waiting for it and apply what is held, in order. */
export function orderedSkip<T>(stream: Ordered<T>): { stream: Ordered<T>; ready: T[] } {
  if (stream.held.length === 0) return { stream, ready: [] };
  const last = stream.held[stream.held.length - 1].q;
  return { stream: { s: stream.s, next: last + 1, held: [] }, ready: stream.held.map((h) => h.body) };
}

/* ------------------------------------------------------------------ onto the paper */

/** A batch of points written at its place in the stroke. A batch still on its way leaves a gap, which the drawing steps over. */
export function placePoints(points: number[], at: number, batch: number[]): number[] {
  const out = points.slice();
  for (let i = out.length; i < at; i++) out.push(Number.NaN);
  batch.forEach((value, i) => {
    out[at + i] = value;
  });
  return out;
}

/** The points that can be drawn: whole x, y pairs, with any gap (or a gap that became null on the way) left out. */
export function inkPairs(points: readonly (number | null)[]): number[] {
  const out: number[] = [];
  for (let i = 0; i + 1 < points.length; i += 2) {
    const x = points[i];
    const y = points[i + 1];
    if (typeof x === "number" && typeof y === "number" && Number.isFinite(x) && Number.isFinite(y)) out.push(x, y);
  }
  return out;
}

/** Strokes in the order they were begun (ids are the time they started), whatever order they arrived in. */
const byStart = (strokes: Stroke[]) => strokes.slice().sort((a, b) => a.id - b.id);

/**
 * One message applied to the paper. The full drawing (`all`) replaces the paper, except on the
 * phone drawing: there it came from the watcher after the artist's page reloaded, and it is added
 * to rather than put over anything drawn since.
 */
export function applyInk(strokes: Stroke[], op: InkOp, drawing: boolean): Stroke[] {
  switch (op.t) {
    case "start":
      return strokes.some((s) => s.id === op.stroke.id) ? strokes : byStart([...strokes, op.stroke]);
    case "more":
      return strokes.map((s) => (s.id === op.id ? { ...s, points: placePoints(s.points, op.at, op.p) } : s));
    case "all":
      return drawing ? byStart([...op.strokes, ...strokes.filter((s) => !op.strokes.some((o) => o.id === s.id))]) : byStart(op.strokes);
    case "clear":
      return [];
  }
}
