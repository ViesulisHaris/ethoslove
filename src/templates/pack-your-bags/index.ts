import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type PackYourBagsFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<PackYourBagsFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  // The trip is the gift: what kind, where to, from where and when, asked for straight after the names.
  leadFields: { keys: ["trip", "toCity", "fromCity", "when"], title: { en: "The trip", es: "El viaje" } },
};
