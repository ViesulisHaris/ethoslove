/* Made by scripts/art/holiday/pack.mjs from the Blender scene scripts/art/holiday/nice_list.py. Not edited by hand. */

/** Where the pictures are served from. */
export const ART_BASE = "/art/nice-list/";

/** Each sprite's place on the stage: its top left corner and its size, in stage units (100 across, 170 down). */
export const SPRITES = {
  "paper": {
    "x": 11.77,
    "y": 34.538,
    "w": 78.462,
    "h": 120.615
  },
  "rod": {
    "x": 3.154,
    "y": 29.308,
    "w": 98.692,
    "h": 11.077
  },
  "roll": {
    "x": 3.923,
    "y": 32.923,
    "w": 98.077,
    "h": 17.308
  },
  "ribbon-red": {
    "x": 33.154,
    "y": 22.692,
    "w": 47,
    "h": 38.154
  },
  "ribbon-pink": {
    "x": 33.154,
    "y": 22.692,
    "w": 46.923,
    "h": 38.154
  },
  "ribbon-blue": {
    "x": 33.154,
    "y": 22.692,
    "w": 46.923,
    "h": 38.154
  },
  "tag": {
    "x": 55.538,
    "y": 35,
    "w": 29.692,
    "h": 39
  },
  "stamp": {
    "x": 5.308,
    "y": 155.615,
    "w": 34.462,
    "h": 29.462
  },
  "seal": {
    "x": 44.5,
    "y": 77.938,
    "w": 11.75,
    "h": 12.25
  },
  "clip": {
    "x": 46.4,
    "y": 109,
    "w": 8.067,
    "h": 24.467
  }
} as const;

/** Points the gift needs to know, in the same units. */
export const ANCHORS = {
  "tag": {
    "x": 72.7,
    "y": 64.865
  },
  "rod": {
    "x": 50,
    "y": 35.155
  },
  "paperTop": {
    "x": 50,
    "y": 35.798
  },
  "roll": {
    "x": 50,
    "y": 40.63
  },
  "stamp": {
    "x": 18,
    "y": 170.008
  },
  "padRed": {
    "x": 18,
    "y": 170.008
  },
  "padGreen": {
    "x": 34,
    "y": 176.008
  },
  "clipEdge": {
    "x": 50,
    "y": 111.987
  }
} as const;

/** Where each fairy light sits, for the twinkle. */
export const BULBS: readonly (readonly [number, number])[] = [[-27.59,-9.45],[-16.06,-10.99],[-4.62,-7.51],[4.35,-17.07],[15.98,-15.02],[27.21,-16.21],[35.51,-8.27],[46.88,-15.66],[58.8,-15.75],[71.08,-18.2],[78.9,-8.7],[91.19,-12.5],[102.73,-12.26],[112.42,-18.3],[122.12,-11.66],[133.7,-12.79],[-3.94,4.23],[4.91,16.98],[-2.34,31.02],[2.49,45.06],[-0.21,62.01],[4.21,76.71],[-2.77,91.2],[2.78,106.48],[-0.18,121.94],[4.78,137.39],[-4.26,150.93],[-11,164.38],[99.54,-3.46],[100.67,12.91],[97.56,27.54],[102.45,41.79],[95.22,57.45],[100.76,72.08],[97.79,87.66],[102.19,103.07],[95.2,117.69],[100.11,133.04],[100.07,149.64],[115.52,158.03]];

/** The note's papers: for each, how tall its top, its repeating middle and its bottom are for their width, how much of the bottom fades in, and where the paper begins inside the picture (shares of the width). */
export const SHEETS = {
  "letter": {
    "name": "letter",
    "top": 0.216,
    "mid": 1.106,
    "bottom": 0.215,
    "fade": 0.076,
    "inset": {
      "left": 0.016,
      "right": 0.037,
      "top": 0.016,
      "bottom": 0.012
    }
  }
} as const;
