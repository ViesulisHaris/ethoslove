/* Made by scripts/art/holiday/pack.mjs from the Blender scene scripts/art/holiday/string_the_lights.py. Not edited by hand. */

/** Where the pictures are served from. */
export const ART_BASE = "/art/string-the-lights/";

/** Each sprite's place on the stage: its top left corner and its size, in stage units (100 across, 170 down). */
export const SPRITES = {} as const;

/** Points the gift needs to know, in the same units. */
export const ANCHORS = {
  "boardTopLeft": {
    "x": 27.39,
    "y": 139.527
  },
  "boardBottomRight": {
    "x": 72.664,
    "y": 151.947
  }
} as const;

/** Where each fairy light sits, for the twinkle. */
export const BULBS: readonly (readonly [number, number])[] = [[11.549,74.871],[13.893,72.977],[16.24,70.296],[18.58,68.405],[20.923,65.73],[23.259,63.842],[25.597,61.172],[27.929,59.288],[30.263,56.621],[32.591,54.741],[34.92,52.08],[37.245,50.202],[39.57,47.546],[41.89,45.672],[44.211,43.02],[46.528,41.149],[48.843,38.502],[51.157,38.891],[53.472,40.76],[55.79,43.41],[58.109,45.282],[60.431,47.936],[62.754,49.812],[65.081,52.471],[67.407,54.35],[69.739,57.013],[72.069,58.896],[74.405,61.564],[76.739,63.45],[79.079,66.123],[81.417,68.012],[83.762,70.69],[86.104,72.582],[88.454,75.265],[32.024,106.393],[35.296,105.202],[38.568,103.189],[41.836,102],[45.104,99.99],[48.368,98.802],[51.632,98.391],[54.897,100.401],[58.163,101.589],[61.433,103.601],[64.703,104.791],[67.977,106.805]];
