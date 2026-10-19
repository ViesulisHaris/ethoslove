import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type BatSwarmFields } from "./schema";
import { demoData } from "./demo-data";
import { Opening, Template } from "./Template";
import { fieldMeta } from "./field-meta";
import { LookField } from "./LookField";

export const template: TemplateModule<BatSwarmFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  fieldEditors: { look: LookField },
  leadFields: { keys: ["line", "look"], title: { en: "The swarm", es: "La bandada" } },
  opening: Opening,
};
