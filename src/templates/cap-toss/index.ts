import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type CapTossFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<CapTossFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  // What they finished is what the whole gift is about, so it is asked for right after the names.
  leadFields: { keys: ["year", "school", "awardedFor"], title: { en: "What they finished", es: "Qué ha terminado" } },
  // A reply comes back from the same ceremony: same year, same gown, same tassel.
  replyFields: (fields) => ({ year: fields.year, school: fields.school, tassel: fields.tassel, gown: fields.gown }),
};
