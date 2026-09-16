import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type RecipeBoxFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";
import { fieldMeta } from "./field-meta";

export const template: TemplateModule<RecipeBoxFields> = {
  manifest,
  fieldsSchema,
  demoData,
  Template,
  fieldMeta,
  // The recipe is what the gift is: it gets asked for right under the names.
  leadFields: {
    keys: ["recipeName", "ingredients", "makes"],
    title: { en: "The recipe", es: "La receta" },
  },
  // One back keeps the kitchen, never her ingredients.
  replyFields: (fields) => ({ counter: fields.counter, cloth: fields.cloth }),
};
