"use client";

import type { z } from "zod";
import type { GiftLocale } from "@/lib/gift/schema";
import type { TemplateModule } from "@/templates/types";
import { describeObjectSchema } from "@/lib/editor/zod-describe";
import { useEditor } from "@/lib/editor/store";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field, Segmented } from "./field";
import { ColorInput } from "./color-input";
import { ListField } from "./list-field";

function humanize(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (c) => c.toUpperCase());
}

/**
 * Form for a template's own `fields`, generated from its Zod schema + fieldMeta labels. `only` and
 * `except` split the fields between the lead group under the names and the rest under the look.
 */
export function TemplateFields({ mod, locale, only, except }: { mod: TemplateModule; locale: GiftLocale; only?: string[]; except?: string[] }) {
  const fields = useEditor((s) => s.data.fields as Record<string, unknown>);
  const patchFields = useEditor((s) => s.patchFields);
  const meta = mod.fieldMeta?.[locale] ?? {};
  const descriptors = describeObjectSchema(mod.fieldsSchema as unknown as z.ZodObject).filter((d) => (!only || only.includes(d.key)) && !except?.includes(d.key));
  if (descriptors.length === 0) return null;

  return (
    <div className="grid gap-5">
      {descriptors.map((d) => {
        const m = meta[d.key];
        const label = m?.label ?? humanize(d.key);
        const value = fields[d.key] ?? d.defaultValue ?? "";
        const id = `field-${d.key}`;
        const Custom = mod.fieldEditors?.[d.key];
        if (Custom)
          return <Custom key={d.key} id={id} label={label} help={m?.help} value={value} onChange={(v: unknown) => patchFields({ [d.key]: v })} locale={locale} fields={fields} />;
        switch (d.widget) {
          case "select": {
            const options = (d.options ?? []).map((o) => ({ value: o, label: m?.options?.[o] ?? humanize(o) }));
            return (
              <Field key={d.key} id={id} label={label} help={m?.help}>
                {options.length <= 4 ? (
                  <Segmented ariaLabel={label} value={String(value)} onChange={(v) => patchFields({ [d.key]: v })} options={options} />
                ) : (
                  <Select value={String(value)} onValueChange={(v) => patchFields({ [d.key]: v })}>
                    <SelectTrigger id={id} className="h-11 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </Field>
            );
          }
          case "boolean":
            return (
              <div key={d.key} className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-[13px] font-medium">{label}</p>
                  {m?.help ? <p className="text-xs text-muted-foreground">{m.help}</p> : null}
                </div>
                <Switch checked={Boolean(value)} onCheckedChange={(v) => patchFields({ [d.key]: v })} aria-label={label} />
              </div>
            );
          case "color":
            return (
              <Field key={d.key} id={id} label={label} help={m?.help}>
                <ColorInput value={String(value || "#000000")} onChange={(v) => patchFields({ [d.key]: v })} />
              </Field>
            );
          case "number":
            return (
              <Field key={d.key} id={id} label={label} help={m?.help}>
                {/* An empty optional number stays empty: shown as 0 it read as an age, and saved as 0 it failed the schema's minimum at publish. */}
                <Input id={id} type="number" inputMode="numeric" value={value === "" || value === undefined || value === null ? "" : String(value)} min={d.min} max={d.max} onChange={(e) => patchFields({ [d.key]: e.target.value === "" ? undefined : Number(e.target.value) })} className="h-11" />
              </Field>
            );
          case "list":
            return (
              <Field key={d.key} id={id} label={label} help={m?.help}>
                <ListField
                  id={id}
                  ariaLabel={label}
                  value={Array.isArray(value) ? (value as string[]) : []}
                  onChange={(v) => patchFields({ [d.key]: v })}
                  minItems={d.minItems}
                  maxItems={d.maxItems}
                  itemMaxLength={d.itemMaxLength}
                  addLabel={m?.addLabel}
                  placeholder={m?.placeholder}
                />
              </Field>
            );
          case "textarea":
            return (
              <Field key={d.key} id={id} label={label} help={m?.help}>
                <Textarea id={id} rows={4} value={String(value)} maxLength={d.maxLength} onChange={(e) => patchFields({ [d.key]: e.target.value })} />
              </Field>
            );
          default:
            return (
              <Field key={d.key} id={id} label={label} help={m?.help}>
                <Input id={id} value={String(value)} maxLength={d.maxLength} onChange={(e) => patchFields({ [d.key]: e.target.value || undefined })} className="h-11" />
              </Field>
            );
        }
      })}
    </div>
  );
}
