import type { z } from "zod";

/**
 * Each template's field schema on its own, for code that validates a gift without rendering it
 * (publishing, on the server). Loading the whole template for this — as `loadTemplate` does — made
 * the publish action reach every template's components, which put all of them, and three.js, in
 * the editor's first download. A schema file is plain Zod.
 *
 * Every slug in ./manifests needs an entry; tests/unit/templates.test.ts checks each one returns
 * the very schema its template uses.
 */
const schemaLoaders: Record<string, () => Promise<{ fieldsSchema: z.ZodType }>> = {
  "the-letter": () => import("./the-letter/schema"),
  constellations: () => import("./constellations/schema"),
  "birthday-cinema": () => import("./birthday-cinema/schema"),
  "jar-of-reasons": () => import("./jar-of-reasons/schema"),
  "scratch-card": () => import("./scratch-card/schema"),
  "midnight-countdown": () => import("./midnight-countdown/schema"),
  "our-timeline": () => import("./our-timeline/schema"),
  vinyl: () => import("./vinyl/schema"),
  museum: () => import("./museum/schema"),
  "front-page": () => import("./front-page/schema"),
  "fortune-cookie": () => import("./fortune-cookie/schema"),
  "text-thread": () => import("./text-thread/schema"),
  arcade: () => import("./arcade/schema"),
  passport: () => import("./passport/schema"),
  bloom: () => import("./bloom/schema"),
  bouquet: () => import("./bouquet/schema"),
  kawaii: () => import("./kawaii/schema"),
  fireside: () => import("./fireside/schema"),
  "trick-or-treat": () => import("./trick-or-treat/schema"),
  scrapbook: () => import("./scrapbook/schema"),
  halfway: () => import("./halfway/schema"),
  garden: () => import("./garden/schema"),
  "snow-globe": () => import("./snow-globe/schema"),
  "recipe-box": () => import("./recipe-box/schema"),
  "cap-toss": () => import("./cap-toss/schema"),
  "paper-crane": () => import("./paper-crane/schema"),
  "the-toast": () => import("./the-toast/schema"),
};

export const SCHEMA_SLUGS = Object.keys(schemaLoaders);

export async function loadFieldsSchema(slug: string): Promise<z.ZodType | null> {
  // Own keys only: "constructor" is in every object, and it is not a template.
  const loader = Object.hasOwn(schemaLoaders, slug) ? schemaLoaders[slug] : undefined;
  if (!loader) return null;
  return (await loader()).fieldsSchema;
}
