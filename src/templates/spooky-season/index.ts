import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type SpookySeasonFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<SpookySeasonFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["look", "note"], title: { en: "The scrapbook", es: "El álbum" } },
  opening: Opening,
};
