"use client";

import { useMemo } from "react";
import { useLocale, useTranslations } from "next-intl";
import type { TemplateManifest } from "@/templates/types";
import { useEditor } from "@/lib/editor/store";
import { allTimezones, isoToWallTime, wallTimeToIso } from "@/lib/editor/time";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimeFields } from "@/components/pickers/date-time-fields";
import { useToday } from "@/components/pickers/use-today";
import { Field, PremiumBadge, SectionHeader, Segmented } from "../field";

function Toggle({ label, help, checked, onChange, premium }: { label: string; help?: string; checked: boolean; onChange: (v: boolean) => void; premium?: string }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <p className="flex items-center gap-2 text-[13px] font-medium">
          {label}
          {premium ? <PremiumBadge label={premium} /> : null}
        </p>
        {help ? <p className="mt-0.5 text-xs text-muted-foreground">{help}</p> : null}
      </div>
      <Switch checked={checked} onCheckedChange={onChange} aria-label={label} />
    </div>
  );
}

function TimezoneSelect({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const zones = useMemo(() => allTimezones(), []);
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-11 w-full" aria-label={label}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent className="max-h-72">
        {zones.map((z) => (
          <SelectItem key={z} value={z}>
            {z.replace(/_/g, " ")}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function ExtrasSection({ manifest }: { manifest: TemplateManifest }) {
  const t = useTranslations("editor.extras");
  const tS = useTranslations("editor.sections.extras");
  const data = useEditor((s) => s.data);
  const patch = useEditor((s) => s.patch);
  const schedule = useEditor((s) => s.schedule);
  const setSchedule = useEditor((s) => s.setSchedule);
  const password = useEditor((s) => s.password);
  const setPassword = useEditor((s) => s.setPassword);
  const removeWatermark = useEditor((s) => s.removeWatermark);
  const setRemoveWatermark = useEditor((s) => s.setRemoveWatermark);
  const premium = t("premiumBadge");
  const tz = schedule.timezone;
  const locale = useLocale() === "es" ? "es" : "en";
  // A countdown and a reveal are both still to come: no day before today.
  const today = useToday();

  const nextWeek = () => {
    const d = new Date(Date.now() + 7 * 864e5);
    d.setHours(0, 0, 0, 0);
    return wallTimeToIso(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}T00:00`, tz) ?? d.toISOString();
  };

  return (
    <section className="flex flex-col gap-7">
      <SectionHeader n={tS("n")} title={tS("title")} blurb={tS("blurb")} />

      {manifest.features.countdown ? (
        <div className="flex flex-col gap-4">
          <Toggle
            label={t("countdown")}
            help={t("countdownHelp")}
            checked={Boolean(data.countdown)}
            onChange={(v) => patch({ countdown: v ? { targetAt: nextWeek(), timezone: tz, label: "" } : undefined })}
          />
          {data.countdown ? (
            <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
              <Field id="countdownLabel" label={t("countdownLabel")}>
                <Input id="countdownLabel" value={data.countdown.label ?? ""} maxLength={80} placeholder={t("countdownLabelPlaceholder")} onChange={(e) => patch({ countdown: { ...data.countdown!, label: e.target.value } })} className="h-11" />
              </Field>
              {/* One above the other: the day and the time need the card's whole width in the editor's column. */}
              <div className="grid gap-4">
                <Field id="countdownAt" label={t("dateTime")}>
                  <DateTimeFields
                    id="countdownAt"
                    label={t("dateTime")}
                    locale={locale}
                    min={today}
                    value={isoToWallTime(data.countdown.targetAt, data.countdown.timezone)}
                    onChange={(wall) => {
                      const iso = wallTimeToIso(wall, data.countdown!.timezone);
                      if (iso) patch({ countdown: { ...data.countdown!, targetAt: iso } });
                    }}
                  />
                </Field>
                <Field label={t("timezone")}>
                  <TimezoneSelect
                    label={t("timezone")}
                    value={data.countdown.timezone}
                    onChange={(zone) => {
                      const wall = isoToWallTime(data.countdown!.targetAt, data.countdown!.timezone);
                      const iso = wallTimeToIso(wall, zone) ?? data.countdown!.targetAt;
                      patch({ countdown: { ...data.countdown!, timezone: zone, targetAt: iso } });
                    }}
                  />
                </Field>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {manifest.features.surprise ? (
        <div className="flex flex-col gap-4">
          <Toggle label={t("surprise")} help={t("surpriseHelp")} checked={Boolean(data.surprise)} onChange={(v) => patch({ surprise: v ? { text: "", reveal: "hold" } : undefined })} />
          {data.surprise ? (
            <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
              <Field id="surpriseText" label={t("surpriseText")}>
                <Textarea id="surpriseText" rows={3} value={data.surprise.text} maxLength={600} onChange={(e) => patch({ surprise: { ...data.surprise!, text: e.target.value } })} />
              </Field>
              <Field label={t("reveal")}>
                <Segmented
                  ariaLabel={t("reveal")}
                  value={data.surprise.reveal}
                  onChange={(reveal) => patch({ surprise: { ...data.surprise!, reveal } })}
                  options={[
                    { value: "tap", label: t("tap") },
                    { value: "hold", label: t("hold") },
                    { value: "shake", label: t("shake") },
                  ]}
                />
              </Field>
            </div>
          ) : null}
        </div>
      ) : null}

      <Field id="password" label={t("password")} help={t("passwordHelp")} badge={<PremiumBadge label={premium} />}>
        <Input id="password" type="text" autoComplete="off" value={password} maxLength={64} placeholder={t("passwordPlaceholder")} onChange={(e) => setPassword(e.target.value)} className="h-11" />
      </Field>

      <div className="flex flex-col gap-4">
        <Toggle label={t("schedule")} help={t("scheduleHelp")} premium={premium} checked={schedule.enabled} onChange={(v) => setSchedule({ enabled: v, unlockAt: v ? (schedule.unlockAt ?? nextWeek()) : schedule.unlockAt })} />
        {schedule.enabled ? (
          <div className="grid gap-4 rounded-xl border border-border bg-card p-4">
            <Field id="unlockAt" label={t("unlockAt")}>
              <DateTimeFields
                id="unlockAt"
                label={t("unlockAt")}
                locale={locale}
                min={today}
                value={schedule.unlockAt ? isoToWallTime(schedule.unlockAt, tz) : ""}
                onChange={(wall) => {
                  const iso = wallTimeToIso(wall, tz);
                  if (iso) setSchedule({ unlockAt: iso });
                }}
              />
            </Field>
            <Field label={t("timezone")}>
              <TimezoneSelect
                label={t("timezone")}
                value={tz}
                onChange={(zone) => {
                  const wall = schedule.unlockAt ? isoToWallTime(schedule.unlockAt, tz) : "";
                  setSchedule({ timezone: zone, unlockAt: wall ? (wallTimeToIso(wall, zone) ?? schedule.unlockAt) : schedule.unlockAt });
                }}
              />
            </Field>
          </div>
        ) : null}
      </div>

      <Toggle label={t("removeWatermark")} premium={premium} checked={removeWatermark} onChange={setRemoveWatermark} />
    </section>
  );
}
