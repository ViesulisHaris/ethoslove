/* Made by scripts/art/holiday/pack.mjs from the Blender scene scripts/art/holiday/gingerbread_house.py. Not edited by hand. */

/** Where the pictures are served from. */
export const ART_BASE = "/art/gingerbread-house/";

/** Each sprite's place on the stage: its top left corner and its size, in stage units (100 across, 170 down). */
export const SPRITES = {
  "gumdrop-red": {
    "x": 46.876,
    "y": 80.875,
    "w": 8.063,
    "h": 8.75
  },
  "gumdrop-green": {
    "x": 46.876,
    "y": 80.875,
    "w": 8.063,
    "h": 8.75
  },
  "peppermint": {
    "x": 46.563,
    "y": 80.562,
    "w": 7.813,
    "h": 8.688
  },
  "button": {
    "x": 46.938,
    "y": 80.938,
    "w": 7.875,
    "h": 7.813
  },
  "star": {
    "x": 46.876,
    "y": 80.75,
    "w": 8.063,
    "h": 7.5
  },
  "heart": {
    "x": 46.75,
    "y": 81.562,
    "w": 7.688,
    "h": 7.563
  },
  "cane": {
    "x": 47.938,
    "y": 79.25,
    "w": 5.875,
    "h": 10.188
  }
} as const;

/** Points the gift needs to know, in the same units. */
export const ANCHORS = {
  "frontBL": {
    "x": 17.695,
    "y": 128.975
  },
  "frontBR": {
    "x": 82.305,
    "y": 128.975
  },
  "frontTR": {
    "x": 82.61,
    "y": 86.985
  },
  "peak": {
    "x": 50,
    "y": 48.51
  },
  "frontTL": {
    "x": 17.39,
    "y": 86.985
  },
  "eaveL": {
    "x": 11.271,
    "y": 93.583
  },
  "eaveR": {
    "x": 88.729,
    "y": 93.583
  },
  "doorTL": {
    "x": 42.657,
    "y": 104.998
  },
  "doorBR": {
    "x": 57.304,
    "y": 128.975
  }
} as const;

/** Where each fairy light sits, for the twinkle. */
export const BULBS: readonly (readonly [number, number])[] = [[-139.63,1.17],[-128.69,-2.99],[-117.13,2.15],[-106.67,-2.33],[-96.67,2],[-86.67,-3.43],[-76.67,0.78],[-66.67,-4.15],[-56.67,0.99],[-46.67,-3.06],[-36.67,2.16],[-26.67,-2.47],[-16.67,1.96],[-6.67,-3.44],[3.33,0.81],[13.33,-4.18],[23.33,1.16],[33.33,-3.12],[43.33,2.29],[53.33,-2.48],[63.33,1.91],[73.33,-3.43],[83.33,0.63],[93.33,-3.94],[103.33,1.16],[113.33,-3.15],[123.33,2.18],[133.33,-2.31],[143.33,1.73],[153.33,-3.58],[163.33,0.83],[173.33,-4.05],[183.33,1.14],[193.33,-2.99],[203.33,2.15],[213.46,-2.33],[224.81,1.87],[236.17,-3.22],[245.65,0.91]];
