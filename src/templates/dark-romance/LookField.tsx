"use client";

import type { FieldEditorProps } from "../types";
import { LookSwatches } from "../_shared/look-swatches";
import { fieldMeta } from "./field-meta";
import { SWATCHES, type LookId } from "./looks";

const NAMES = { en: fieldMeta.en.look.options, es: fieldMeta.es.look.options };

/** The mood, picked as swatches like the other collages' colours. */
export function LookField(props: FieldEditorProps<LookId | undefined>) {
  return <LookSwatches {...props} swatches={SWATCHES} names={NAMES} />;
}
