import type { TemplateModule } from "../types";
import { manifest } from "./manifest";
import { fieldsSchema, type GroupReferenceFields } from "./schema";
import { demoData } from "./demo-data";
import { Template } from "./Template";

export const template: TemplateModule<GroupReferenceFields> = { manifest, fieldsSchema, demoData, Template };
