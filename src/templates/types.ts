import type { ComponentType } from "react";
import type { z } from "zod";
import type { GiftData, GiftLocale } from "@/lib/gift/schema";
import type { Occasion } from "@/config/occasions";

export type TemplateTier = "free" | "premium";
export type TemplateStyle = "cinematic" | "minimal" | "playful" | "romantic" | "retro" | "3d";
export type TemplateNeed = "gyroscope" | "microphone" | "deviceMotion" | "webgl";

export interface TemplateManifest {
  slug: string;
  name: Record<GiftLocale, string>;
  tagline: Record<GiftLocale, string>;
  description: Record<GiftLocale, string>;
  /** Most central first: position here is what ranks the template on that occasion's page. */
  occasions: Occasion[];
  styles: TemplateStyle[];
  tier: TemplateTier;
  features: {
    music: boolean;
    video: boolean;
    countdown: boolean;
    surprise: boolean;
    captions: boolean;
    photos: { min: number; max: number };
    needs?: TemplateNeed[];
  };
  thumbnail: { poster: string; webm?: string };
  defaultAccent: string;
  /** Uses three.js / heavy canvas — separate chunk, longer loading screen. */
  heavy: boolean;
  sortOrder: number;
}

export type TemplateMode = "live" | "preview" | "demo";

export type TemplateEvent =
  | { type: "ready" }
  | { type: "started" }
  | { type: "progress"; pct: number }
  | { type: "surprise" }
  | { type: "ended" };

export interface TemplateProps<TFields = Record<string, unknown>> {
  data: GiftData<TFields>;
  mode: TemplateMode;
  onEvent?: (event: TemplateEvent) => void;
  /** Recipient tapped "Send a reaction". */
  onReact?: () => void;
  /** Recipient tapped "Make one for someone". */
  onMakeOne?: () => void;
}

export type FieldMeta = {
  label: string;
  help?: string;
  options?: Record<string, string>;
  /** List fields: the add button's label and the first row's placeholder. */
  addLabel?: string;
  placeholder?: string;
};

/** Props for a template's own editor of one field, when the generated form can't express it. */
export type FieldEditorProps<T = unknown> = {
  id: string;
  label: string;
  help?: string;
  value: T;
  onChange: (value: T) => void;
  locale: GiftLocale;
  /** Every template field, for editors whose view depends on the others. */
  fields?: Record<string, unknown>;
};

export interface TemplateModule<TFields = Record<string, unknown>> {
  manifest: TemplateManifest;
  fieldsSchema: z.ZodType<TFields>;
  /** Labels / help for the template-specific fields, per locale. Keys match the schema. */
  fieldMeta?: Record<GiftLocale, Record<string, FieldMeta>>;
  /** Custom editors, keyed like the schema, for fields the generated form can't express. */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  fieldEditors?: Record<string, ComponentType<FieldEditorProps<any>>>;
  /**
   * Fields worth filling in first. The editor asks for them right under the names, in a group of
   * their own, instead of at the end with the look. Keys match the schema.
   */
  leadFields?: { keys: string[]; title: Record<GiftLocale, string> };
  /** "Send one back": what a reply keeps from the gift it answers, such as the two places swapped. */
  replyFields?: (fields: TFields) => Partial<TFields>;
  /** One complete demo per locale; the gallery, editor and detail page use it. */
  demoData: Record<GiftLocale, GiftData<TFields>>;
  Template: ComponentType<TemplateProps<TFields>>;
}
