/**
 * The bat, drawn once as paths in a 48 × 28 cell, with the body at x = 24. `up` is the wing-beat:
 * 1 holds the tips high, -1 drops them. The canvas paints each of a few beats into a sprite and
 * stamps those; the page's still bats are the same paths as SVG, so they are the same animal.
 */
export const CELL = { w: 48, h: 28 } as const;
export const FRAMES = 9;

/** The right wing: a hooked arm with a scalloped trailing edge. The left is this, mirrored. */
export function wingPath(up: number): string {
  const tipY = 12.5 - 9 * up;
  return [
    "M25.2 14.6",
    `Q31.5 ${9 - 6.5 * up} 46 ${tipY}`,
    `Q43.4 ${tipY + 5.4} 39.6 ${16.8 - 2.6 * up}`,
    `Q37.8 ${14.8 - 1.8 * up} 34.6 ${19 - 1.6 * up}`,
    `Q31.8 ${17.2 - 1.0 * up} 28.6 ${21.6 - 0.6 * up}`,
    "Q26.8 19.6 25.2 19.4",
    "Z",
  ].join(" ");
}

/** The body: a head with two ears, and a body that tapers to a point. */
export const BODY_PATH = "M22.6 7 L21.3 2.4 L24 5 L26.7 2.4 L25.4 7 Q27.2 10.6 25.2 16 Q24.2 20.4 24 22.4 Q23.8 20.4 22.8 16 Q20.8 10.6 22.6 7 Z";

/** The beat for sprite `frame`, from the wings fully down to fully up. */
export const upFor = (frame: number) => -1 + (2 * frame) / (FRAMES - 1);

/** The sprite frame for a wing height between -1 and 1. */
export const frameFor = (up: number) => Math.max(0, Math.min(FRAMES - 1, Math.round(((up + 1) / 2) * (FRAMES - 1))));

/**
 * One canvas per wing-beat, painted in `fill` with a hair of `rim` light round it so a bat can be
 * seen against the dark sky as well as against the moon. Browser only.
 */
export function buildSprites(fill: string, rim: string, scale = 2): HTMLCanvasElement[] {
  return Array.from({ length: FRAMES }, (_, frame) => {
    const canvas = document.createElement("canvas");
    canvas.width = CELL.w * scale;
    canvas.height = CELL.h * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.scale(scale, scale);
    const wing = new Path2D(wingPath(upFor(frame)));
    const body = new Path2D(BODY_PATH);
    ctx.fillStyle = fill;
    ctx.strokeStyle = rim;
    ctx.lineWidth = 0.7;
    ctx.lineJoin = "round";
    const paint = () => {
      ctx.stroke(wing);
      ctx.fill(wing);
    };
    paint();
    ctx.save();
    ctx.translate(CELL.w, 0);
    ctx.scale(-1, 1);
    paint();
    ctx.restore();
    ctx.stroke(body);
    ctx.fill(body);
    return canvas;
  });
}
