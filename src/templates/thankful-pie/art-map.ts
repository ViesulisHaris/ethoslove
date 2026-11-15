/* Made by scripts/art/holiday/pack.mjs from the Blender scene scripts/art/holiday/thankful_pie.py. Not edited by hand. */

/** Where the pictures are served from. */
export const ART_BASE = "/art/thankful-pie/";

/** Each sprite's place on the stage: its top left corner and its size, in stage units (100 across, 170 down). */
export const SPRITES = {
  "slice0": {
    "x": 22.214,
    "y": 74,
    "w": 31.5,
    "h": 37.071
  },
  "slice1": {
    "x": 17.143,
    "y": 90.286,
    "w": 36.286,
    "h": 37
  },
  "slice2": {
    "x": 23.214,
    "y": 105.643,
    "w": 30.5,
    "h": 37.786
  },
  "slice3": {
    "x": 50.215,
    "y": 105.643,
    "w": 31.571,
    "h": 37.357
  },
  "slice4": {
    "x": 49.642,
    "y": 89.714,
    "w": 37.214,
    "h": 37.071
  },
  "slice5": {
    "x": 49.572,
    "y": 73.571,
    "w": 31.214,
    "h": 37.643
  },
  "sheet": {
    "x": 11.616,
    "y": 17.769,
    "w": 76.692,
    "h": 113.462
  },
  "tape": {
    "x": 37.438,
    "y": 104.75,
    "w": 25.125,
    "h": 6.25
  },
  "pie": {
    "x": 17.143,
    "y": 72.571,
    "w": 71.714,
    "h": 72
  }
} as const;

/** Points the gift needs to know, in the same units. */
export const ANCHORS = {
  "cardTopLeft": {
    "x": 7.481,
    "y": 18.879
  },
  "cardBottomRight": {
    "x": 92.519,
    "y": 62.848
  },
  "cardHead": {
    "x": 50.251,
    "y": 29.589
  },
  "cardMargin": {
    "x": 16.759,
    "y": 28.93
  },
  "rule0": {
    "x": 16.66,
    "y": 33.346
  },
  "rule1": {
    "x": 16.562,
    "y": 37.761
  },
  "rule2": {
    "x": 16.463,
    "y": 42.177
  },
  "rule3": {
    "x": 16.365,
    "y": 46.592
  },
  "rule4": {
    "x": 16.267,
    "y": 51.008
  },
  "rule5": {
    "x": 16.168,
    "y": 55.424
  },
  "rule6": {
    "x": 16.07,
    "y": 59.839
  },
  "slice0": {
    "x": 41,
    "y": 92.573
  },
  "slice0Out": {
    "x": 26,
    "y": 68.159
  },
  "slice1": {
    "x": 32,
    "y": 107.221
  },
  "slice1Out": {
    "x": 2,
    "y": 107.221
  },
  "slice2": {
    "x": 41,
    "y": 121.87
  },
  "slice2Out": {
    "x": 26,
    "y": 146.284
  },
  "slice3": {
    "x": 59,
    "y": 121.87
  },
  "slice3Out": {
    "x": 74,
    "y": 146.284
  },
  "slice4": {
    "x": 68,
    "y": 107.221
  },
  "slice4Out": {
    "x": 98,
    "y": 107.221
  },
  "slice5": {
    "x": 59,
    "y": 92.573
  },
  "slice5Out": {
    "x": 74,
    "y": 68.159
  },
  "pie": {
    "x": 50,
    "y": 107.221
  },
  "pieEdge": {
    "x": 82.4,
    "y": 106.982
  }
} as const;

/** Where each fairy light sits, for the twinkle. */
export const BULBS: readonly (readonly [number, number])[] = [[-27.39,7.56],[-13.99,5.38],[-2.35,7.72],[6.72,-1.29],[17.74,2.23],[29.06,1.03],[40.23,7.7],[48.95,-0.2],[60.46,0.9],[73.08,-0.54],[81.16,8.25],[93.04,3.05],[104.52,3.87],[115.13,-0.88],[124.77,6.18],[137.41,5.42],[-4.81,21.16],[3.94,35.18],[-2.98,50.3],[2.03,65.3],[-0.93,81.02],[4.02,96.08],[-3.01,110.63],[2.28,124.64],[0.15,140.01],[-1.03,154.71],[-15.7,164.12],[99.85,14.01],[101.14,28.8],[97.74,44.14],[103.21,59.45],[96.26,73.85],[100.72,89.1],[97.74,104.76],[103.04,119.16],[94.65,133.65],[104.33,146.08],[111.55,161.28]];

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
