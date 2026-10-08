import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type FavoritePersonFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<FavoritePersonFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["look", "title"], title: { en: "The page", es: "La página" } },
  opening: Opening,
};
