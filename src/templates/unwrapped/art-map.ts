/* Made by scripts/art/holiday/pack.mjs from the Blender scene scripts/art/holiday/unwrapped.py. Not edited by hand. */

/** Where the pictures are served from. */
export const ART_BASE = "/art/unwrapped/";

/** Each sprite's place on the stage: its top left corner and its size, in stage units (100 across, 170 down). */
export const SPRITES = {
  "box-red-dots": {
    "x": 12.923,
    "y": 44,
    "w": 74.154,
    "h": 78.692
  },
  "box-green-stripes": {
    "x": 12.923,
    "y": 44,
    "w": 74.154,
    "h": 78.692
  },
  "box-kraft-stars": {
    "x": 12.923,
    "y": 44,
    "w": 74.154,
    "h": 78.692
  },
  "box-kraft-stripes": {
    "x": 12.923,
    "y": 44,
    "w": 74.154,
    "h": 78.692
  },
  "box-tartan-green": {
    "x": 12.923,
    "y": 44,
    "w": 74.154,
    "h": 78.692
  },
  "box-tartan-red": {
    "x": 12.923,
    "y": 44,
    "w": 74.154,
    "h": 78.692
  },
  "box-pink-stripes": {
    "x": 12.923,
    "y": 44,
    "w": 74.154,
    "h": 78.692
  },
  "box-blush-dots": {
    "x": 12.923,
    "y": 44,
    "w": 74.154,
    "h": 78.692
  },
  "box-gold": {
    "x": 12.923,
    "y": 44,
    "w": 74.154,
    "h": 78.692
  },
  "ribbon-cream": {
    "x": 12.769,
    "y": 43.538,
    "w": 74.462,
    "h": 79.538
  },
  "ribbon-red": {
    "x": 12.692,
    "y": 43.538,
    "w": 78.538,
    "h": 82.538
  },
  "ribbon-blush": {
    "x": 12.692,
    "y": 43.538,
    "w": 74.615,
    "h": 79.538
  },
  "ribbon-gold": {
    "x": 12.692,
    "y": 43.538,
    "w": 78.538,
    "h": 79.769
  },
  "tag": {
    "x": 52.769,
    "y": 76.154,
    "w": 35.615,
    "h": 34.615
  },
  "open-red": {
    "x": 11.385,
    "y": 42.231,
    "w": 105.385,
    "h": 106.385
  },
  "open-kraft": {
    "x": 11.385,
    "y": 42.231,
    "w": 105.385,
    "h": 106.385
  },
  "open-plaid": {
    "x": 11.385,
    "y": 42.231,
    "w": 105.385,
    "h": 106.385
  },
  "open-pink": {
    "x": 11.385,
    "y": 42.231,
    "w": 105.385,
    "h": 106.385
  },
  "sheet": {
    "x": 11.616,
    "y": 17.769,
    "w": 76.692,
    "h": 113.462
  },
  "receipt": {
    "x": 15.924,
    "y": 10.231,
    "w": 70.077,
    "h": 106.692
  },
  "tape": {
    "x": 37.376,
    "y": 54.625,
    "w": 25.313,
    "h": 6.125
  }
} as const;

/** Points the gift needs to know, in the same units. */
export const ANCHORS = {
  "tag": {
    "x": 72.5,
    "y": 101.162
  },
  "boxTop": {
    "x": 50,
    "y": 77.713
  },
  "card": {
    "x": 50,
    "y": 78.278
  },
  "cardCorner": {
    "x": 79.5,
    "y": 51.966
  }
} as const;

/** Where each fairy light sits, for the twinkle. */
export const BULBS: readonly (readonly [number, number])[] = [[-27.59,-8.44],[-16.06,-10.03],[-4.62,-6.54],[4.35,-16.01],[15.98,-14.1],[27.21,-15.12],[35.51,-7.23],[46.88,-14.73],[58.8,-14.64],[71.08,-17.14],[78.9,-7.92],[91.19,-11.52],[102.73,-11.3],[112.42,-17.28],[122.12,-10.57],[133.7,-11.93],[-3.19,5.95],[5.85,18.87],[-1.78,32.99],[3.17,47.22],[0.93,61.62],[5.86,76.07],[-1.85,90.53],[3.15,105.82],[1.04,121.59],[5.97,135.6],[-2.55,149.74],[-7.68,165.89],[-21.86,172.93],[99.18,-1.56],[100.16,15.09],[97.11,29.72],[101.71,43.74],[94.11,56.95],[99.08,71.68],[96.83,87.43],[102.04,102.25],[94.87,117.19],[100.01,132.95],[99.76,149.38],[114.06,158.31]];

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
  },
  "receipt": {
    "name": "receipt",
    "top": 0.213,
    "mid": 1.098,
    "bottom": 0.289,
    "fade": 0.076,
    "inset": {
      "left": 0.016,
      "right": 0.038,
      "top": 0.012,
      "bottom": 0.013
    }
  }
} as const;
