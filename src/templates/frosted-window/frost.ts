/**
 * How much of the frost a finger has wiped away, kept as a coarse grid over the glass rather than
 * read back from the picture (which would cost a whole canvas of pixels every time).
 */
export type FrostGrid = { cols: number; rows: number; cells: Uint8Array };

/** The share of the snowman's board that must show through before the letter is offered. Nothing melts by itself: only what the finger wipes goes. */
export const REVEAL_AT = 0.7;

export function frostGrid(cols = 30, rows = 40): FrostGrid {
  return { cols, rows, cells: new Uint8Array(cols * rows) };
}

/**
 * Marks as wiped every cell whose middle lies within `radius` of the point (u, v). All three are
 * shares of the glass's width (u, radius) and height (v); `aspect` is its height over its width, so
 * that the brush is round on the glass and not stretched with it.
 */
export function wipeAt(grid: FrostGrid, u: number, v: number, radius: number, aspect: number): void {
  const { cols, rows, cells } = grid;
  const rv = radius / aspect;
  const c0 = Math.max(0, Math.floor((u - radius) * cols));
  const c1 = Math.min(cols - 1, Math.ceil((u + radius) * cols));
  const r0 = Math.max(0, Math.floor((v - rv) * rows));
  const r1 = Math.min(rows - 1, Math.ceil((v + rv) * rows));
  for (let r = r0; r <= r1; r++)
    for (let c = c0; c <= c1; c++) {
      const du = (c + 0.5) / cols - u;
      const dv = ((r + 0.5) / rows - v) * aspect;
      if (du * du + dv * dv <= radius * radius) cells[r * cols + c] = 1;
    }
}

/** Every point along a stroke from a to b, close enough together that the brush leaves no gaps. */
export function strokePoints(a: { u: number; v: number }, b: { u: number; v: number }, radius: number, aspect: number): { u: number; v: number }[] {
  const d = Math.hypot(b.u - a.u, (b.v - a.v) * aspect);
  const n = Math.max(1, Math.ceil(d / (radius * 0.35)));
  return Array.from({ length: n }, (_, i) => ({ u: a.u + ((b.u - a.u) * (i + 1)) / n, v: a.v + ((b.v - a.v) * (i + 1)) / n }));
}

/** The share of the glass wiped clear, 0 to 1. */
export function wiped(grid: FrostGrid): number {
  let n = 0;
  for (const c of grid.cells) n += c;
  return n / grid.cells.length;
}

/** The share wiped clear of one part of the glass, given by its corners as shares of the glass (u across, v down). */
export function wipedIn(grid: FrostGrid, box: { u0: number; v0: number; u1: number; v1: number }): number {
  const { cols, rows, cells } = grid;
  let n = 0;
  let all = 0;
  for (let r = 0; r < rows; r++)
    for (let c = 0; c < cols; c++) {
      const u = (c + 0.5) / cols;
      const v = (r + 0.5) / rows;
      if (u < box.u0 || u > box.u1 || v < box.v0 || v > box.v1) continue;
      all++;
      n += cells[r * cols + c];
    }
  return all ? n / all : 1;
}
