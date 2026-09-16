import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type ToastFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<ToastFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  // The words on the menu card are what the gift is about, so they come straight after the names.
  leadFields: {
    keys: ["opening", "venue", "dateLine"],
    title: { en: "What the menu card says", es: "Lo que dice el menú" },
  },
  // A toast back is from the same evening: same table, same drink. Only the opening line is new.
  replyFields: (fields) => ({
    pour: fields.pour,
    glasses: fields.glasses,
    venue: fields.venue,
    dateLine: fields.dateLine,
    light: fields.light,
  }),
};
