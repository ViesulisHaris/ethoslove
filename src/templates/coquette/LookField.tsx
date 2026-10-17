"use client";

import type { FieldEditorProps } from "../types";
import { LookSwatches } from "../_shared/look-swatches";
import { fieldMeta } from "./field-meta";
import { SWATCHES, type LookId } from "./looks";

const NAMES = { en: fieldMeta.en.look.options, es: fieldMeta.es.look.options };

/** The flowers' colour, picked as swatches: six looks is past what labelled buttons can hold. */
export function LookField(props: FieldEditorProps<LookId | undefined>) {
  return <LookSwatches {...props} swatches={SWATCHES} names={NAMES} />;
}
