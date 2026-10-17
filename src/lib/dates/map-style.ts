/**
 * The map's colours. OpenFreeMap's "positron" is a quiet grey style; this repaints it as the same
 * blush paper the rest of the site is printed on (sage parks, pale blue water, white streets, plum
 * lettering) before the map ever draws, so there is no grey flash. Layers are matched by id and
 * anything the style renames or drops upstream is simply left as it comes.
 */
type Layer = { id: string; type: string; paint?: Record<string, unknown>; layout?: Record<string, unknown> };
export type MapStyle = { version: number; layers: Layer[]; [key: string]: unknown };

export const MAP_PAPER = "#FBF3EE";

const FILL: Record<string, string> = {
  park: "#DCEBD8",
  water: "#CFE3EE",
  landuse_residential: "#F8EEE8",
  landcover_wood: "#D3E6CE",
  landcover_ice_shelf: "#FDFBFA",
  landcover_glacier: "#FDFBFA",
  building: "#F4E7E0",
  "aeroway-area": "#F6ECE6",
  road_area_pier: MAP_PAPER,
};

const LINE: Record<string, string> = {
  waterway: "#C3DCE9",
  highway_path: "#F1DFD8",
  highway_minor: "#FFFFFF",
  highway_major_casing: "#EBD8CF",
  highway_major_inner: "#FFFFFF",
  highway_major_subtle: "#F0E0D8",
  highway_motorway_casing: "#E8CFC4",
  highway_motorway_inner: "#FFF6EC",
  highway_motorway_subtle: "#F0E0D8",
  highway_motorway_bridge_casing: "#E8CFC4",
  highway_motorway_bridge_inner: "#FFF6EC",
  tunnel_motorway_casing: "#EBD8CF",
  tunnel_motorway_inner: "#FBF1EA",
  road_pier: MAP_PAPER,
  railway: "#E7D6CE",
  railway_transit: "#E7D6CE",
  railway_service: "#E7D6CE",
  railway_dashline: "#FBF3EE",
  railway_transit_dashline: "#FBF3EE",
  railway_service_dashline: "#FBF3EE",
  "aeroway-taxiway": "#EFE1DA",
  "aeroway-runway-casing": "#EFE1DA",
  "aeroway-runway": "#FFFFFF",
  boundary_2: "#D9B9BF",
  boundary_3: "#E3CBCF",
  boundary_disputed: "#D9B9BF",
};

const INK = "#5B3F49";
const INK_SOFT = "#8A6F78";
const WATER_INK = "#6A93AD";
const HALO = "rgba(255,250,247,0.9)";

export function applyPalette<T extends MapStyle>(style: T): T {
  const layers = style.layers.map((layer) => {
    const paint = { ...(layer.paint ?? {}) };
    if (layer.type === "background") paint["background-color"] = MAP_PAPER;
    else if (layer.type === "fill" && FILL[layer.id]) {
      paint["fill-color"] = FILL[layer.id];
      if (layer.id === "building") paint["fill-outline-color"] = "#EBD9D0";
    } else if (layer.type === "line" && LINE[layer.id]) paint["line-color"] = LINE[layer.id];
    else if (layer.type === "symbol") {
      const water = layer.id.startsWith("water");
      const road = layer.id.startsWith("highway-name");
      if ("text-color" in paint || layer.layout?.["text-field"]) {
        paint["text-color"] = water ? WATER_INK : road ? INK_SOFT : INK;
        paint["text-halo-color"] = HALO;
        paint["text-halo-width"] = 1.2;
      }
    }
    return { ...layer, paint };
  });
  return { ...style, layers };
}
