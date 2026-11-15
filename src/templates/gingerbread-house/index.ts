import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type GingerbreadHouseFields } from "./schema";
import { demoData } from "./demo-data";
import { artFor, Opening, readLook, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<GingerbreadHouseFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  opening: Opening,
  assets: (data) => artFor(readLook(data.fields)),
};
