/**
 * The camera screen's type: a 5 × 7 bitmap font, drawn here so the screen looks like a 2006 camera's
 * and not like a web page. Each glyph is rows of `#` (lit) and `.`; letters with a tail (g, j, p, q,
 * y, the comma) have two more rows under the line. Accented letters are built from a plain letter
 * and a mark (é is e and an acute), so one table covers Spanish, French, German, Portuguese,
 * Italian, Polish and the Baltic languages. A line with anything else in it (emoji, Cyrillic,
 * Chinese) says so, and the screen sets that line in an ordinary font instead.
 */

type Rows = readonly string[];

const G = (rows: string): Rows => rows.split("|");

/** Cap height, and the two rows a tail hangs into. */
export const CAP = 7;
export const TAIL = 2;
/** Room above a capital for an accent. */
export const ABOVE = 2;
/** A glyph's width, and the column between two. */
export const GLYPH_W = 5;
export const ADVANCE = 6;

const GLYPHS: Record<string, Rows> = {
  " ": G(".....|.....|.....|.....|.....|.....|....."),
  "!": G("..#..|..#..|..#..|..#..|..#..|.....|..#.."),
  '"': G(".#.#.|.#.#.|.....|.....|.....|.....|....."),
  "#": G(".#.#.|.#.#.|#####|.#.#.|#####|.#.#.|.#.#."),
  $: G("..#..|.####|#.#..|.###.|..#.#|####.|..#.."),
  "%": G("##...|##..#|...#.|..#..|.#...|#..##|...##"),
  "&": G(".##..|#..#.|#.#..|.#...|#.#.#|#..#.|.##.#"),
  "'": G("..#..|..#..|.#...|.....|.....|.....|....."),
  "(": G("...#.|..#..|.#...|.#...|.#...|..#..|...#."),
  ")": G(".#...|..#..|...#.|...#.|...#.|..#..|.#..."),
  "*": G(".....|..#..|#.#.#|.###.|#.#.#|..#..|....."),
  "+": G(".....|..#..|..#..|#####|..#..|..#..|....."),
  ",": G(".....|.....|.....|.....|.....|..##.|..##.|...#.|..#.."),
  "-": G(".....|.....|.....|.###.|.....|.....|....."),
  ".": G(".....|.....|.....|.....|.....|.##..|.##.."),
  "/": G(".....|....#|...#.|..#..|.#...|#....|....."),
  "0": G(".###.|#...#|#..##|#.#.#|##..#|#...#|.###."),
  "1": G("..#..|.##..|..#..|..#..|..#..|..#..|.###."),
  "2": G(".###.|#...#|....#|...#.|..#..|.#...|#####"),
  "3": G("#####|...#.|..#..|...#.|....#|#...#|.###."),
  "4": G("...#.|..##.|.#.#.|#..#.|#####|...#.|...#."),
  "5": G("#####|#....|####.|....#|....#|#...#|.###."),
  "6": G("..##.|.#...|#....|####.|#...#|#...#|.###."),
  "7": G("#####|....#|...#.|..#..|.#...|.#...|.#..."),
  "8": G(".###.|#...#|#...#|.###.|#...#|#...#|.###."),
  "9": G(".###.|#...#|#...#|.####|....#|...#.|.##.."),
  ":": G(".....|.##..|.##..|.....|.##..|.##..|....."),
  ";": G(".....|.##..|.##..|.....|.##..|..#..|.#..."),
  "<": G("...#.|..#..|.#...|#....|.#...|..#..|...#."),
  "=": G(".....|.....|#####|.....|#####|.....|....."),
  ">": G(".#...|..#..|...#.|....#|...#.|..#..|.#..."),
  "?": G(".###.|#...#|....#|...#.|..#..|.....|..#.."),
  "@": G(".###.|#...#|....#|.##.#|#.#.#|#.#.#|.###."),
  A: G(".###.|#...#|#...#|#####|#...#|#...#|#...#"),
  B: G("####.|#...#|#...#|####.|#...#|#...#|####."),
  C: G(".###.|#...#|#....|#....|#....|#...#|.###."),
  D: G("###..|#..#.|#...#|#...#|#...#|#..#.|###.."),
  E: G("#####|#....|#....|####.|#....|#....|#####"),
  F: G("#####|#....|#....|####.|#....|#....|#...."),
  G: G(".###.|#...#|#....|#.###|#...#|#...#|.####"),
  H: G("#...#|#...#|#...#|#####|#...#|#...#|#...#"),
  I: G(".###.|..#..|..#..|..#..|..#..|..#..|.###."),
  J: G("..###|...#.|...#.|...#.|...#.|#..#.|.##.."),
  K: G("#...#|#..#.|#.#..|##...|#.#..|#..#.|#...#"),
  L: G("#....|#....|#....|#....|#....|#....|#####"),
  M: G("#...#|##.##|#.#.#|#.#.#|#...#|#...#|#...#"),
  N: G("#...#|#...#|##..#|#.#.#|#..##|#...#|#...#"),
  O: G(".###.|#...#|#...#|#...#|#...#|#...#|.###."),
  P: G("####.|#...#|#...#|####.|#....|#....|#...."),
  Q: G(".###.|#...#|#...#|#...#|#.#.#|#..#.|.##.#"),
  R: G("####.|#...#|#...#|####.|#.#..|#..#.|#...#"),
  S: G(".####|#....|#....|.###.|....#|....#|####."),
  T: G("#####|..#..|..#..|..#..|..#..|..#..|..#.."),
  U: G("#...#|#...#|#...#|#...#|#...#|#...#|.###."),
  V: G("#...#|#...#|#...#|#...#|#...#|.#.#.|..#.."),
  W: G("#...#|#...#|#...#|#.#.#|#.#.#|#.#.#|.#.#."),
  X: G("#...#|#...#|.#.#.|..#..|.#.#.|#...#|#...#"),
  Y: G("#...#|#...#|.#.#.|..#..|..#..|..#..|..#.."),
  Z: G("#####|....#|...#.|..#..|.#...|#....|#####"),
  "[": G(".###.|.#...|.#...|.#...|.#...|.#...|.###."),
  "\\": G(".....|#....|.#...|..#..|...#.|....#|....."),
  "]": G(".###.|...#.|...#.|...#.|...#.|...#.|.###."),
  "^": G("..#..|.#.#.|#...#|.....|.....|.....|....."),
  _: G(".....|.....|.....|.....|.....|.....|#####"),
  "`": G(".#...|..#..|...#.|.....|.....|.....|....."),
  a: G(".....|.....|.###.|....#|.####|#...#|.####"),
  b: G("#....|#....|#.##.|##..#|#...#|#...#|####."),
  c: G(".....|.....|.###.|#....|#....|#...#|.###."),
  d: G("....#|....#|.##.#|#..##|#...#|#...#|.####"),
  e: G(".....|.....|.###.|#...#|#####|#....|.###."),
  f: G("..##.|.#..#|.#...|###..|.#...|.#...|.#..."),
  g: G(".....|.....|.####|#...#|#...#|#...#|.####|....#|.###."),
  h: G("#....|#....|#.##.|##..#|#...#|#...#|#...#"),
  i: G("..#..|.....|.##..|..#..|..#..|..#..|.###."),
  j: G("...#.|.....|..##.|...#.|...#.|...#.|...#.|#..#.|.##.."),
  k: G("#....|#....|#..#.|#.#..|##...|#.#..|#..#."),
  l: G(".##..|..#..|..#..|..#..|..#..|..#..|.###."),
  m: G(".....|.....|##.#.|#.#.#|#.#.#|#...#|#...#"),
  n: G(".....|.....|#.##.|##..#|#...#|#...#|#...#"),
  o: G(".....|.....|.###.|#...#|#...#|#...#|.###."),
  p: G(".....|.....|####.|#...#|#...#|#...#|####.|#....|#...."),
  q: G(".....|.....|.####|#...#|#...#|#...#|.####|....#|....#"),
  r: G(".....|.....|#.##.|##..#|#....|#....|#...."),
  s: G(".....|.....|.###.|#....|.###.|....#|####."),
  t: G(".#...|.#...|###..|.#...|.#...|.#..#|..##."),
  u: G(".....|.....|#...#|#...#|#...#|#..##|.##.#"),
  v: G(".....|.....|#...#|#...#|#...#|.#.#.|..#.."),
  w: G(".....|.....|#...#|#...#|#.#.#|#.#.#|.#.#."),
  x: G(".....|.....|#...#|.#.#.|..#..|.#.#.|#...#"),
  y: G(".....|.....|#...#|#...#|#...#|#...#|.####|....#|.###."),
  z: G(".....|.....|#####|...#.|..#..|.#...|#####"),
  "{": G("...#.|..#..|..#..|.#...|..#..|..#..|...#."),
  "|": G("..#..|..#..|..#..|..#..|..#..|..#..|..#.."),
  "}": G(".#...|..#..|..#..|...#.|..#..|..#..|.#..."),
  "~": G(".....|.....|.#...|#.#.#|...#.|.....|....."),
  // Letters no mark can make, and the punctuation people put in captions.
  // Upside down and hanging below the line, as Spanish sets them: an "i" otherwise.
  "¡": G(".....|.....|..#..|.....|..#..|..#..|..#..|..#..|..#.."),
  "¿": G(".....|.....|..#..|.....|..#..|.#...|#....|#...#|.###."),
  ß: G(".##..|#..#.|#..#.|#.#..|#..#.|#...#|#.##."),
  æ: G(".....|.....|##.#.|..#.#|.####|#.#..|.#.##"),
  Æ: G(".####|#.#..|#.#..|#####|#.#..|#.#..|#.###"),
  ø: G(".....|.....|.###.|#..##|#.#.#|##..#|.###."),
  Ø: G(".###.|#..##|#.#.#|#.#.#|#.#.#|##..#|.###."),
  œ: G(".....|.....|.#.#.|#.#.#|#.###|#.#..|.#.##"),
  Œ: G(".####|#.#..|#.#..|#.##.|#.#..|#.#..|.####"),
  ł: G(".##..|..#..|..##.|.##..|..#..|..#..|.###."),
  Ł: G(".#...|.#...|.#.#.|.##..|##...|.#...|.####"),
  ı: G(".....|.....|.##..|..#..|..#..|..#..|.###."),
  ȷ: G(".....|.....|..##.|...#.|...#.|...#.|...#.|#..#.|.##.."),
  "«": G(".....|..#.#|.#.#.|#.#..|.#.#.|..#.#|....."),
  "»": G(".....|#.#..|.#.#.|..#.#|.#.#.|#.#..|....."),
  "€": G("..###|.#...|####.|.#...|####.|.#...|..###"),
  "£": G("..##.|.#..#|.#...|###..|.#...|.#..#|#.##."),
  "°": G(".##..|#..#.|#..#.|.##..|.....|.....|....."),
  "·": G(".....|.....|.....|..#..|.....|.....|....."),
  "•": G(".....|.....|.###.|.###.|.###.|.....|....."),
  "…": G(".....|.....|.....|.....|.....|.....|#.#.#"),
  "×": G(".....|#...#|.#.#.|..#..|.#.#.|#...#|....."),
  "♥": G(".....|.#.#.|#####|#####|.###.|..#..|....."),
  "★": G("..#..|..#..|#####|.###.|.#.#.|#...#|....."),
  "▶": G(".#...|.##..|.###.|.####|.###.|.##..|.#..."),
};

/** Look-alikes the table draws with a glyph it has. */
const SAME: Record<string, string> = {
  "‘": "'",
  "’": "'",
  "‚": ",",
  "“": '"',
  "”": '"',
  "„": '"',
  "–": "-",
  "—": "-",
  "‑": "-",
  "♡": "♥",
  "❤": "♥",
  "☆": "★",
  " ": " ",
};

/** Accents, over a letter (two rows) or under it (in the tail's rows). */
const MARKS: Record<string, { rows: Rows; under?: boolean }> = {
  "̀": { rows: G(".#...|..#..") },
  "́": { rows: G("...#.|..#..") },
  "̂": { rows: G("..#..|.#.#.") },
  "̃": { rows: G(".##.#|#..#.") },
  "̄": { rows: G(".....|.###.") },
  "̆": { rows: G(".#.#.|..#..") },
  "̇": { rows: G("..#..|.....") },
  "̈": { rows: G(".#.#.|.....") },
  "̊": { rows: G("..#..|.#.#.") },
  "̋": { rows: G(".#.#.|#.#..") },
  "̌": { rows: G(".#.#.|..#..") },
  "̦": { rows: G("..#..|.#..."), under: true },
  "̧": { rows: G("..#..|.##.."), under: true },
  "̨": { rows: G("...#.|....#"), under: true },
};

/** Variation selectors and joiners that ride along with ♥ and friends: nothing to draw. */
const SILENT = /[‍︎️]/;

/** One character cell: the glyph, and any marks it wears. */
type Cell = { glyph: Rows; above: Rows[]; under: Rows[]; tall: boolean };

/** A letter with a mark on top loses its own dot: í is ı and an acute. */
const DOTLESS: Record<string, string> = { i: "ı", j: "ȷ" };

/**
 * The string as cells, or null when something in it isn't in the table. NFD splits é into e and
 * a combining acute, so every accented letter comes apart into things the table has.
 */
export function cellsOf(text: string): Cell[] | null {
  const out: Cell[] = [];
  for (const raw of text.normalize("NFD")) {
    if (SILENT.test(raw)) continue;
    const mark = MARKS[raw];
    if (mark) {
      const last = out[out.length - 1];
      if (!last) return null;
      (mark.under ? last.under : last.above).push(mark.rows);
      continue;
    }
    const ch = SAME[raw] ?? raw;
    const glyph = GLYPHS[ch];
    if (!glyph) return null;
    out.push({ glyph, above: [], under: [], tall: ch >= "A" && ch <= "Z" });
  }
  // Swap i and j for their dotless selves wherever an accent sits on them.
  for (const cell of out) {
    if (!cell.above.length) continue;
    for (const [dotted, dotless] of Object.entries(DOTLESS)) if (cell.glyph === GLYPHS[dotted]) cell.glyph = GLYPHS[dotless];
  }
  return out;
}

export const canDraw = (text: string): boolean => cellsOf(text) !== null;

/**
 * Greedy word wrap for a fixed-pitch font: at most `cols` characters a line and `lines` lines, a
 * word longer than a line broken where it has to be, and "…" on the last line when it runs out.
 */
export function wrap(text: string, cols: number, lines: number): string[] {
  const words = text.trim().split(/\s+/).filter(Boolean);
  const out: string[] = [];
  let line = "";
  const push = () => {
    out.push(line);
    line = "";
  };
  for (let word of words) {
    while ([...word].length > cols) {
      if (line) push();
      const chars = [...word];
      out.push(chars.slice(0, cols).join(""));
      word = chars.slice(cols).join("");
    }
    const next = line ? `${line} ${word}` : word;
    if ([...next].length <= cols) line = next;
    else {
      push();
      line = word;
    }
  }
  if (line) push();
  if (out.length <= lines) return out;
  const kept = out.slice(0, lines);
  const last = [...kept[lines - 1]];
  kept[lines - 1] = (last.length >= cols ? last.slice(0, cols - 1).join("").trimEnd() : kept[lines - 1]) + "…";
  return kept;
}

export type Bitmap = {
  /** Lit pixels as runs: x, y and length. */
  runs: [number, number, number][];
  width: number;
  height: number;
};

/** Rows from one line's cap line to the next: the cap, the tails, and a row to breathe. */
export const pitchOf = (leading = 1): number => CAP + TAIL + leading;

/**
 * The pixels of some lines of text, one run per horizontal stretch of lit pixels. Room is made
 * above the first line only when a capital on it wears an accent, and under the last only for a
 * tail, so plain text sits tight in its box. (An accented capital further down borrows the rows
 * the line above keeps for its tails.) `align` centres each line in the widest.
 */
export function rasterize(lines: string[], align: "left" | "center" = "left", leading = 1): Bitmap | null {
  const rows: Cell[][] = [];
  for (const line of lines) {
    const cells = cellsOf(line);
    if (!cells) return null;
    rows.push(cells);
  }
  if (!rows.length) return null;
  const above = rows[0].some((c) => c.tall && c.above.length) ? ABOVE : 0;
  const tails = rows[rows.length - 1].some((c) => c.glyph.length > CAP || c.under.length) ? TAIL : 0;
  const pitch = pitchOf(leading);
  const cols = Math.max(1, ...rows.map((r) => r.length));
  const width = cols * ADVANCE - 1;
  const height = above + (rows.length - 1) * pitch + CAP + tails;
  const lit = new Set<number>();
  const set = (x: number, y: number) => {
    if (x >= 0 && x < width && y >= 0 && y < height) lit.add(y * width + x);
  };
  const paint = (glyph: Rows, x0: number, y0: number) =>
    glyph.forEach((row, dy) => {
      for (let dx = 0; dx < row.length; dx++) if (row[dx] === "#") set(x0 + dx, y0 + dy);
    });
  rows.forEach((cells, li) => {
    const top = above + li * pitch;
    const shift = align === "center" ? Math.floor(((cols - cells.length) * ADVANCE) / 2) : 0;
    cells.forEach((cell, ci) => {
      const x = shift + ci * ADVANCE;
      paint(cell.glyph, x, top);
      // Over a capital the mark rides above the cap line; over a small letter, in its empty top rows.
      cell.above.forEach((mark) => paint(mark, x, cell.tall ? top - ABOVE : top));
      cell.under.forEach((mark) => paint(mark, x, top + CAP));
    });
  });
  const runs: [number, number, number][] = [];
  for (let y = 0; y < height; y++) {
    let x = 0;
    while (x < width) {
      if (!lit.has(y * width + x)) {
        x++;
        continue;
      }
      const start = x;
      while (x < width && lit.has(y * width + x)) x++;
      runs.push([start, y, x - start]);
    }
  }
  return { runs, width, height };
}

/**
 * The pixels one step outside the lit ones, all round: the dark edge a camera draws round its
 * on-screen text so it reads over any photo.
 */
export function outline(bitmap: Bitmap): Bitmap {
  const { width, height } = bitmap;
  const W = width + 2;
  const H = height + 2;
  const lit = new Set<number>();
  for (const [x, y, n] of bitmap.runs) for (let i = 0; i < n; i++) lit.add((y + 1) * W + x + 1 + i);
  const edge = new Set<number>();
  for (const p of lit) {
    const x = p % W;
    const y = Math.floor(p / W);
    for (let dy = -1; dy <= 1; dy++)
      for (let dx = -1; dx <= 1; dx++) {
        const q = (y + dy) * W + x + dx;
        if (!lit.has(q)) edge.add(q);
      }
  }
  const runs: [number, number, number][] = [];
  for (let y = 0; y < H; y++) {
    let x = 0;
    while (x < W) {
      if (!edge.has(y * W + x)) {
        x++;
        continue;
      }
      const start = x;
      while (x < W && edge.has(y * W + x)) x++;
      runs.push([start, y, x - start]);
    }
  }
  return { runs, width: W, height: H };
}

/** An SVG path for a bitmap's runs, each pixel a unit square. */
export const pathOf = (bitmap: Bitmap, dx = 0, dy = 0): string => bitmap.runs.map(([x, y, n]) => `M${x + dx} ${y + dy}h${n}v1h-${n}z`).join("");
