import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type SnowGlobeFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<SnowGlobeFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  // What is in the globe and what appears in the snow is the whole gift, so it is asked for first.
  leadFields: { keys: ["scene", "lines", "shakes"], title: { en: "The globe", es: "La bola" } },
  // A reply is the same shelf seen from the other house.
  replyFields: (fields) => ({ scene: fields.scene, mood: fields.mood, shakes: fields.shakes }),
};
