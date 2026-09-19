import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type CouncilFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<CouncilFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  leadFields: { keys: ["charge", "findings", "verdict"], title: { en: "The case", es: "El caso" } },
};
