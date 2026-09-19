import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type StickerBombFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<StickerBombFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  leadFields: { keys: ["pack", "labels"], title: { en: "The stickers", es: "Los stickers" } },
};
