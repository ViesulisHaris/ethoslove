/* Made by scripts/art/holiday/pack.mjs from the Blender scene scripts/art/holiday/light_the_candles.py. Not edited by hand. */

/** Where the pictures are served from. */
export const ART_BASE = "/art/light-the-candles/";

/** Each sprite's place on the stage: its top left corner and its size, in stage units (100 across, 170 down). */
export const SPRITES = {
  "glow-harvest-0-phone": {
    "x": -25,
    "y": 62.7,
    "w": 150,
    "h": 111.9
  },
  "glow-harvest-0-wide": {
    "x": -130,
    "y": 62.7,
    "w": 360,
    "h": 111.9
  },
  "glow-harvest-1-phone": {
    "x": -25,
    "y": 16.8,
    "w": 150,
    "h": 157.9
  },
  "glow-harvest-1-wide": {
    "x": -130,
    "y": 16.8,
    "w": 360,
    "h": 157.9
  },
  "glow-harvest-2-phone": {
    "x": -25,
    "y": -23.8,
    "w": 150,
    "h": 198.4
  },
  "glow-harvest-2-wide": {
    "x": -130,
    "y": -23.8,
    "w": 359.6,
    "h": 198.4
  },
  "glow-harvest-3-phone": {
    "x": -25,
    "y": 30.1,
    "w": 150,
    "h": 144.6
  },
  "glow-harvest-3-wide": {
    "x": -130,
    "y": 30.1,
    "w": 360,
    "h": 144.6
  },
  "glow-harvest-4-phone": {
    "x": -25,
    "y": -35,
    "w": 150,
    "h": 209.6
  },
  "glow-harvest-4-wide": {
    "x": -130,
    "y": -35,
    "w": 360,
    "h": 209.6
  },
  "glow-linen-0-phone": {
    "x": -25,
    "y": 30,
    "w": 150,
    "h": 144.6
  },
  "glow-linen-0-wide": {
    "x": -130,
    "y": 30,
    "w": 360,
    "h": 144.6
  },
  "glow-linen-1-phone": {
    "x": -25,
    "y": 57.8,
    "w": 150,
    "h": 116.9
  },
  "glow-linen-1-wide": {
    "x": -130,
    "y": 57.8,
    "w": 360,
    "h": 116.9
  },
  "glow-linen-2-phone": {
    "x": -25,
    "y": 30.8,
    "w": 150,
    "h": 143.8
  },
  "glow-linen-2-wide": {
    "x": -130,
    "y": 30.8,
    "w": 358.2,
    "h": 143.8
  },
  "glow-linen-3-phone": {
    "x": -25,
    "y": 30.1,
    "w": 150,
    "h": 144.6
  },
  "glow-linen-3-wide": {
    "x": -130,
    "y": 30.1,
    "w": 360,
    "h": 144.6
  },
  "glow-linen-4-phone": {
    "x": -25,
    "y": -35,
    "w": 150,
    "h": 209.6
  },
  "glow-linen-4-wide": {
    "x": -130,
    "y": -35,
    "w": 360,
    "h": 209.6
  },
  "glow-plum-0-phone": {
    "x": -25,
    "y": 62.7,
    "w": 150,
    "h": 111.9
  },
  "glow-plum-0-wide": {
    "x": -130,
    "y": 62.7,
    "w": 360,
    "h": 111.9
  },
  "glow-plum-1-phone": {
    "x": -25,
    "y": 57.8,
    "w": 150,
    "h": 116.9
  },
  "glow-plum-1-wide": {
    "x": -130,
    "y": 57.8,
    "w": 360,
    "h": 116.9
  },
  "glow-plum-2-phone": {
    "x": -25,
    "y": 30.5,
    "w": 150,
    "h": 144.1
  },
  "glow-plum-2-wide": {
    "x": -130,
    "y": 30.5,
    "w": 360,
    "h": 144.1
  },
  "glow-plum-3-phone": {
    "x": -25,
    "y": 30.7,
    "w": 150,
    "h": 144
  },
  "glow-plum-3-wide": {
    "x": -130,
    "y": 30.7,
    "w": 360,
    "h": 144
  },
  "glow-plum-4-phone": {
    "x": -25,
    "y": -35,
    "w": 150,
    "h": 209.6
  },
  "glow-plum-4-wide": {
    "x": -130,
    "y": -35,
    "w": 360,
    "h": 209.6
  }
} as const;

/** Points the gift needs to know, in the same units. */
export const ANCHORS = {
  "wick0": {
    "x": 16.302,
    "y": 100.95
  },
  "foot0": {
    "x": 16.076,
    "y": 132.427
  },
  "wick1": {
    "x": 33.159,
    "y": 65.836
  },
  "foot1": {
    "x": 32.941,
    "y": 132.427
  },
  "wick2": {
    "x": 50.389,
    "y": 109.67
  },
  "foot2": {
    "x": 50,
    "y": 132.427
  },
  "wick3": {
    "x": 67.645,
    "y": 57.982
  },
  "foot3": {
    "x": 67.059,
    "y": 132.427
  },
  "wick4": {
    "x": 84.517,
    "y": 93.179
  },
  "foot4": {
    "x": 83.924,
    "y": 132.427
  }
} as const;

/** Where each fairy light sits, for the twinkle. */
export const BULBS: readonly (readonly [number, number])[] = [[-15.14,-166.61],[-13.87,-177.75],[-13.04,-177.68],[-12.37,-187.05],[-12.09,-192.3],[-13.74,-192.39],[-16.15,-202.67],[-14,-207.08],[-3.52,-206.49],[7.67,-213.67],[22.11,-210.98],[36.41,-215.16],[47.96,-208.11],[61.63,-214.71],[75,-211.45],[88.48,-214.22],[99.95,-207.29],[112.14,-208.14],[116.24,-199.1],[114.48,-193.95],[112.46,-194.07],[112.14,-189.05],[113.04,-177.74],[113.87,-177.85],[114.74,-168.52],[115.79,-167.96]];
