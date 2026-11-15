/* Made by scripts/art/holiday/pack.mjs from the Blender scene scripts/art/holiday/frosted_window.py. Not edited by hand. */

/** Where the pictures are served from. */
export const ART_BASE = "/art/frosted-window/";

/** Each sprite's place on the stage: its top left corner and its size, in stage units (100 across, 170 down). */
export const SPRITES = {
  "frost-cottage": {
    "x": 15,
    "y": 19,
    "w": 70,
    "h": 92
  },
  "frost-cabin": {
    "x": 15,
    "y": 19,
    "w": 70,
    "h": 92
  },
  "frost-midnight": {
    "x": 15,
    "y": 19,
    "w": 70,
    "h": 92
  },
  "sheet": {
    "x": 11.616,
    "y": 23.462,
    "w": 76.692,
    "h": 121.769
  },
  "ribbon": {
    "x": 35.875,
    "y": 123.938,
    "w": 28.25,
    "h": 2.125
  }
} as const;

/** Points the gift needs to know, in the same units. */
export const ANCHORS = {
  "glassTopLeft": {
    "x": 15,
    "y": 19
  },
  "glassBottomRight": {
    "x": 85,
    "y": 111
  },
  "gift": {
    "x": 61,
    "y": 109.7
  },
  "cuffLeft": {
    "x": 33,
    "y": 120.3
  },
  "cuffRight": {
    "x": 67,
    "y": 120.3
  },
  "sill": {
    "x": 50,
    "y": 114.2
  }
} as const;

/** Where each fairy light sits, for the twinkle. */
export const BULBS: readonly (readonly [number, number])[] = [[14.24,17.5],[23.75,12.5],[33.12,17.5],[42.5,12.5],[51.88,17.5],[61.25,12.5],[70.62,17.5],[80,12.5],[89.01,17.5]];

/** The note's papers: for each, how tall its top, its repeating middle and its bottom are for their width, how much of the bottom fades in, and where the paper begins inside the picture (shares of the width). */
export const SHEETS = {
  "letter": {
    "name": "letter",
    "top": 0.191,
    "mid": 1.208,
    "bottom": 0.238,
    "fade": 0.079,
    "inset": {
      "left": 0.006,
      "right": 0.004,
      "top": 0.021,
      "bottom": 0.003
    }
  }
} as const;

/** A board in the picture seen through the window: its corners (top left, top right, bottom right, bottom left) as shares of the picture across and down. */
export const BOARD = [[0.4969,0.3938],[0.6885,0.3938],[0.6871,0.4844],[0.4969,0.4844]] as const;
