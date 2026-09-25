import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type MusicBoxFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<MusicBoxFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  // Who dances and to what: the two things the whole gift is about, and the lacquer with them.
  leadFields: { keys: ["figurine", "tune", "box"], title: { en: "The music box", es: "La caja de música" } },
};
