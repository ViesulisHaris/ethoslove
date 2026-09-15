import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type HalfwayFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { DistanceField, PlaceField, StopsField } from "./PlaceField";

export const template: TemplateModule<HalfwayFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  // Only the places need their own editors; everything else uses the same controls as every template.
  fieldEditors: { from: PlaceField, to: PlaceField, stops: StopsField, distanceKm: DistanceField },
  // The places decide what the whole gift is about, so they're asked for straight after the names.
  leadFields: { keys: ["from", "to", "stops", "distanceKm"], title: { en: "Where you both are", es: "Dónde estáis" } },
  // A reply flies the other way, and everyone keeps their own island.
  replyFields: (fields) => ({
    from: fields.to,
    to: fields.from,
    stops: [...fields.stops].reverse(),
    distanceKm: fields.distanceKm,
    yourIsland: fields.theirIsland,
    theirIsland: fields.yourIsland,
    vehicle: fields.vehicle,
  }),
};
