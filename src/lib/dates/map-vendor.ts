/**
 * MapLibre is served from this site rather than bundled (see scripts/copy-maplibre.mjs for why).
 * The folder is named after the version, so this must match the installed package; a unit test
 * fails when the package is upgraded and this line is not.
 */
export const MAPLIBRE_VERSION = "6.10.0";
export const MAPLIBRE_URL = `/vendor/maplibre-gl/${MAPLIBRE_VERSION}/maplibre-gl.mjs`;

/** OpenFreeMap's light style: free, no key, and quiet enough to recolour (map-style.ts). */
export const MAP_STYLE_URL = "https://tiles.openfreemap.org/styles/positron";
