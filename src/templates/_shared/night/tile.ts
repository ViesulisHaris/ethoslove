import type { CSSProperties } from "react";

/**
 * The size units a night scene draws in, for the one place a template is drawn outside a gift: the
 * editor's cover picker, which puts its `opening` in a small tile. `--u` is defined by `.gift-root`,
 * and the tile is not one, so without this every `calc(N * var(--k))` in the scene is invalid and it
 * collapses. The tile is a size container, so 1cqw is the tile's own width. Same formula as globals.css.
 */
export const TILE_VARS = {
  "--u": "min(1cqw, calc(1cqh * 0.6))",
  "--k": "min(var(--u), 0.5cqh)",
} as CSSProperties;
