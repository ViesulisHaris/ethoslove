/* Made by scripts/art/holiday/pack.mjs from the Blender scene scripts/art/holiday/wishbone.py. Not edited by hand. */

/** Where the pictures are served from. */
export const ART_BASE = "/art/wishbone/";

/** Each sprite's place on the stage: its top left corner and its size, in stage units (100 across, 170 down). */
export const SPRITES = {
  "head": {
    "x": 46.357,
    "y": 55.643,
    "w": 9.714,
    "h": 18.643
  },
  "arm-left": {
    "x": 9.429,
    "y": 65.357,
    "w": 45,
    "h": 58.857
  },
  "arm-right": {
    "x": 49.214,
    "y": 65.357,
    "w": 43.357,
    "h": 58.857
  },
  "sheet": {
    "x": 11.616,
    "y": 17.769,
    "w": 76.692,
    "h": 113.462
  },
  "peg": {
    "x": 47.188,
    "y": 55.25,
    "w": 7.313,
    "h": 26.75
  },
  "twine": {
    "x": 10,
    "y": 107.437,
    "w": 80,
    "h": 0.938
  }
} as const;

/** Points the gift needs to know, in the same units. */
export const ANCHORS = {
  "card": {
    "x": 50,
    "y": 18.795
  },
  "tagLeft": {
    "x": 18.405,
    "y": 116.964
  },
  "endLeft": {
    "x": 28.8,
    "y": 107.653
  },
  "breakLeft": {
    "x": 46.125,
    "y": 73.558
  },
  "tagRight": {
    "x": 81.595,
    "y": 116.964
  },
  "endRight": {
    "x": 71.2,
    "y": 107.653
  },
  "breakRight": {
    "x": 53.875,
    "y": 73.558
  },
  "joint": {
    "x": 50,
    "y": 68.949
  },
  "plate": {
    "x": 50,
    "y": 92.658
  },
  "pegEdge": {
    "x": 50,
    "y": 71.319
  }
} as const;

/** Where each fairy light sits, for the twinkle. */
export const BULBS: readonly (readonly [number, number])[] = [[-27.59,-9.45],[-16.06,-10.99],[-4.62,-7.51],[4.35,-17.07],[15.98,-15.02],[27.21,-16.21],[35.51,-8.27],[46.88,-15.66],[58.8,-15.75],[71.08,-18.2],[78.9,-8.7],[91.19,-12.5],[102.73,-12.26],[112.42,-18.3],[122.12,-11.66],[133.7,-12.79],[-3.94,4.07],[4.91,16.71],[-2.34,30.72],[2.49,44.74],[-0.21,61.7],[4.21,76.4],[-2.77,90.89],[2.78,106.17],[-0.18,121.63],[4.78,137.1],[-4.26,150.7],[-11,164.23],[99.54,-3.62],[100.67,12.64],[97.56,27.25],[102.45,41.48],[95.22,57.15],[100.76,71.77],[97.79,87.36],[102.19,102.76],[95.2,117.38],[100.11,132.75],[100.07,149.41],[115.52,157.87]];

/** The note's papers: for each, how tall its top, its repeating middle and its bottom are for their width, how much of the bottom fades in, and where the paper begins inside the picture (shares of the width). */
export const SHEETS = {
  "letter": {
    "name": "letter",
    "top": 0.178,
    "mid": 1.125,
    "bottom": 0.223,
    "fade": 0.074,
    "inset": {
      "left": 0.006,
      "right": 0.003,
      "top": 0.005,
      "bottom": 0.004
    }
  }
} as const;
