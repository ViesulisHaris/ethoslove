/* Made by scripts/art/holiday/pack.mjs from the Blender scene scripts/art/holiday/leaf_pile.py. Not edited by hand. */

/** Where the pictures are served from. */
export const ART_BASE = "/art/leaf-pile/";

/** Each sprite's place on the stage: its top left corner and its size, in stage units (100 across, 170 down). */
export const SPRITES = {
  "leaf-maple-red": {
    "x": 40.4,
    "y": 72.333,
    "w": 20.667,
    "h": 23.8
  },
  "leaf-maple-orange": {
    "x": 40.333,
    "y": 72.067,
    "w": 20.733,
    "h": 24.067
  },
  "leaf-maple-gold": {
    "x": 40.466,
    "y": 72.333,
    "w": 20.6,
    "h": 23.8
  },
  "leaf-maple-brown": {
    "x": 40.2,
    "y": 71.8,
    "w": 20.867,
    "h": 24.333
  },
  "leaf-oak-red": {
    "x": 43.333,
    "y": 72.8,
    "w": 14.467,
    "h": 23.333
  },
  "leaf-oak-orange": {
    "x": 43.4,
    "y": 72.8,
    "w": 14.4,
    "h": 23.333
  },
  "leaf-oak-gold": {
    "x": 43.467,
    "y": 72.867,
    "w": 14.333,
    "h": 23.267
  },
  "leaf-oak-brown": {
    "x": 43.533,
    "y": 73,
    "w": 14.267,
    "h": 23.133
  },
  "leaf-beech-red": {
    "x": 45.467,
    "y": 73.133,
    "w": 10.467,
    "h": 23
  },
  "leaf-beech-orange": {
    "x": 45.467,
    "y": 73.133,
    "w": 10.467,
    "h": 23
  },
  "leaf-beech-gold": {
    "x": 45.467,
    "y": 73.067,
    "w": 10.467,
    "h": 23.067
  },
  "leaf-beech-brown": {
    "x": 45.4,
    "y": 73.067,
    "w": 10.533,
    "h": 23.067
  },
  "sheet": {
    "x": 11.616,
    "y": 17.769,
    "w": 76.692,
    "h": 113.462
  },
  "twig": {
    "x": 27.812,
    "y": 97.687,
    "w": 44.313,
    "h": 11.5
  }
} as const;

/** Points the gift needs to know, in the same units. */
export const ANCHORS = {
  "card": {
    "x": 50,
    "y": 78.658
  },
  "cardTopLeft": {
    "x": 13.895,
    "y": 53.967
  },
  "cardBottomRight": {
    "x": 86.105,
    "y": 103.349
  }
} as const;

/** Where each fairy light sits, for the twinkle. */
export const BULBS: readonly (readonly [number, number])[] = [[-30.52,-6.33],[-17.58,-7.47],[-4.41,-2.82],[6.36,-12.68],[20.28,-12.1],[33.44,-13.81],[44.32,-4.77],[56.72,-10.15],[71.02,-11.18],[82.79,-17.49],[93.78,-7.85],[105.91,-7.53],[118.68,-2.87],[128.76,-10.52],[140.78,-9.88],[-29.15,189.48],[-14.88,188.67],[-2.83,193.99],[7.91,185.47],[21.78,185.36],[33.18,179.44],[44.15,187.42],[58,187.87],[69.06,193.67],[78.99,185.82],[92.03,185.25],[103.3,179.27],[113.89,185.53],[126.52,183.71],[137.39,191.71]];

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
