/* eslint-disable @next/next/no-img-element -- signed Storage URLs, shown at thumbnail size */
"use client";

import { useState } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Loader2, MessageCircle, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { GiftContribution } from "@/lib/gift/schema";
import { cleanText, hasLink, lengthOf } from "@/lib/group/clean";
import type { GroupEntryView, GroupView } from "@/lib/group/client";
import { GROUP_LIMITS } from "@/lib/group/limits";
import { groupReportLink } from "@/lib/group/report";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { Field } from "@/components/editor/field";

/**
 * The pieces of the sender's group card panel (components/editor/sections/group.tsx puts them
 * together and talks to the server). Each is plain: it draws what it is given and says what was
 * tapped. Everything a contributor wrote is drawn as text, never as markup.
 */

const quiet = "inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline disabled:opacity-50";
const iconButton = "grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink disabled:pointer-events-none disabled:opacity-30";

/** Before a link exists: what it costs (the price is shown here first) and the one button. */
export function GroupIntro({ priceLine, onInvite }: { priceLine: string; onInvite: () => void }) {
  const t = useTranslations("editor.group");
  return (
    <div data-testid="group-intro">
      <p className="text-sm leading-relaxed text-ink-soft" data-testid="group-price-line">
        {priceLine}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">{t("stays")}</p>
      <Button type="button" className="mt-5 h-11 rounded-full px-5" onClick={onInvite} data-testid="group-invite">
        {t("invite")}
      </Button>
    </div>
  );
}

/** What the page at the link will say: who is asking, who it is for, and one line on what to write. */
export function GroupSetup({ fromName, forName, busy, error, onCreate }: { fromName: string; forName: string; busy: boolean; error: string | null; onCreate: (input: { fromName: string; forName: string; prompt: string }) => void }) {
  const t = useTranslations("editor.group");
  const [from, setFrom] = useState(fromName);
  const [to, setTo] = useState(forName);
  const [prompt, setPrompt] = useState("");
  const [missing, setMissing] = useState(false);
  const submit = () => {
    const names = { fromName: cleanText(from), forName: cleanText(to), prompt: cleanText(prompt) };
    if (!names.fromName || !names.forName) return setMissing(true);
    setMissing(false);
    onCreate(names);
  };
  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        submit();
      }}
      data-testid="group-setup"
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="group-from" label={t("fromName")}>
          <Input id="group-from" value={from} maxLength={GROUP_LIMITS.name} onChange={(e) => setFrom(e.target.value)} className="h-11" autoComplete="off" />
        </Field>
        <Field id="group-for" label={t("forName")}>
          <Input id="group-for" value={to} maxLength={GROUP_LIMITS.name} onChange={(e) => setTo(e.target.value)} className="h-11" autoComplete="off" />
        </Field>
      </div>
      <Field id="group-prompt" label={t("prompt")} counter={t("optional")}>
        <Input id="group-prompt" value={prompt} maxLength={GROUP_LIMITS.prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t("promptPlaceholder")} className="h-11" autoComplete="off" />
      </Field>
      <div>
        <Button type="submit" className="h-11 rounded-full px-5" disabled={busy} data-testid="group-create">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          <span>{busy ? t("creating") : t("create")}</span>
        </Button>
        {missing || error ? (
          <p role="alert" className="mt-3 text-sm text-coral-deep">
            {missing ? t("needNames") : error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/** The link, with the three ways to pass it on. */
export function GroupLink({ url, shareText, onShared }: { url: string; shareText: string; onShared: (via: "copy" | "share" | "whatsapp") => void }) {
  const t = useTranslations("editor.group");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
      onShared("copy");
    } catch {
      // No clipboard here: the link is on screen to be copied by hand.
    }
  };
  const share = async () => {
    if (typeof navigator.share === "function") {
      try {
        await navigator.share({ text: shareText, url });
        onShared("share");
        return;
      } catch {
        return; // They closed the sheet.
      }
    }
    void copy();
  };
  const pill = "flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-medium hover:border-ink/40";
  return (
    <div data-testid="group-link">
      <p className="mb-2 text-[13px] font-medium text-ink">{t("link")}</p>
      <div className="flex items-center gap-2 rounded-2xl border border-border bg-card p-2 pl-4">
        <span className="min-w-0 flex-1 truncate font-mono text-sm" data-testid="group-url">
          {url.replace(/^https?:\/\//, "")}
        </span>
        <Button type="button" onClick={copy} className="h-11 shrink-0 rounded-full px-4" data-testid="group-copy">
          {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          <span>{copied ? t("copied") : t("copy")}</span>
        </Button>
      </div>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <button type="button" onClick={share} className={pill} data-testid="group-share">
          <Share2 className="size-4" aria-hidden="true" />
          {t("share")}
        </button>
        <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener" onClick={() => onShared("whatsapp")} className={pill} data-testid="group-whatsapp">
          <MessageCircle className="size-4" aria-hidden="true" />
          {t("whatsapp")}
        </a>
      </div>
    </div>
  );
}

/** One note waiting for the sender's yes: who, what, the photo if any, and the two answers. */
export function WaitingEntry({ entry, busy, full, onAdd, onRemove }: { entry: GroupEntryView; busy: boolean; full: boolean; onAdd: (withPhoto: boolean) => void; onRemove: () => void }) {
  const t = useTranslations("editor.group");
  const locale = useLocale();
  const [withPhoto, setWithPhoto] = useState(true);
  const name = entry.name ?? "";
  return (
    <li className="rounded-2xl border border-border bg-card p-4" data-testid="group-waiting-entry">
      <div className="flex gap-3">
        {entry.photo ? <img src={entry.photo.url} alt={t("photoAlt", { name })} width={entry.photo.width} height={entry.photo.height} loading="lazy" className="size-16 shrink-0 rounded-xl bg-ink/5 object-cover" /> : null}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium [overflow-wrap:anywhere] text-ink">{name}</p>
          <p className="mt-1 text-sm leading-relaxed [overflow-wrap:anywhere] text-ink-soft">{entry.note}</p>
          {entry.wantsEmail ? <p className="mt-1.5 text-xs text-muted-foreground">{t("wantsCard")}</p> : null}
        </div>
      </div>
      {entry.photo ? (
        <label className="mt-2 flex min-h-11 cursor-pointer items-center gap-2.5 text-sm text-ink">
          <input type="checkbox" checked={withPhoto} onChange={(e) => setWithPhoto(e.target.checked)} className="size-5 shrink-0 accent-coral" data-testid="group-with-photo" />
          {t("withPhoto")}
        </label>
      ) : null}
      <div className={cn("flex flex-wrap items-center gap-x-2 gap-y-1", entry.photo ? "mt-1" : "mt-3")}>
        <Button type="button" className="h-11 rounded-full px-4" disabled={busy || full} onClick={() => onAdd(Boolean(entry.photo) && withPhoto)} data-testid="group-add">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          <span>{busy ? t("adding") : t("add")}</span>
        </Button>
        <Button type="button" variant="ghost" className="h-11 rounded-full px-4" disabled={busy} onClick={onRemove} data-testid="group-reject">
          {t("remove")}
        </Button>
        {/* A report is an email to a person, in the sender's language, quoting the note's reference and nothing that opens anything. */}
        <a href={groupReportLink("note", entry.reportRef, locale)} className={cn(quiet, "ml-auto text-xs")} data-testid="group-report">
          {t("report")}
        </a>
      </div>
    </li>
  );
}

/** A note just turned down or removed: one line, and a day to change your mind. */
export function DecidedEntry({ entry, busy, onUndo }: { entry: GroupEntryView; busy: boolean; onUndo: () => void }) {
  const t = useTranslations("editor.group");
  return (
    <li className="flex items-center justify-between gap-3 rounded-2xl border border-dashed border-border px-4 py-1 text-sm text-ink-soft" data-testid="group-decided-entry">
      <span className="min-w-0 [overflow-wrap:anywhere]">{t("removed", { name: entry.name ?? "" })}</span>
      <button type="button" onClick={onUndo} disabled={busy} className={cn(quiet, "shrink-0 font-medium text-ink underline")} data-testid="group-undo">
        {t("undo")}
      </button>
    </li>
  );
}

/**
 * Edits a note's name and words in place (a typo), and can take its photo off. Also the form behind
 * "Add one yourself". What the sender types is held to what a contributor's note is held to: one
 * line of plain text, inside the card's lengths, with no web address in it.
 */
export function NoteForm({ initial, noteMax, hasPhoto = false, submitLabel, onSubmit, onCancel, onDropPhoto }: { initial?: { name: string; note: string }; noteMax: number; hasPhoto?: boolean; submitLabel: string; onSubmit: (value: { name: string; note: string }) => void; onCancel: () => void; onDropPhoto?: () => void }) {
  const t = useTranslations("editor.group");
  const [name, setName] = useState(initial?.name ?? "");
  const [note, setNote] = useState(initial?.note ?? "");
  const clean = { name: cleanText(name), note: cleanText(note) };
  const linked = hasLink(clean.name) || hasLink(clean.note);
  const ok = Boolean(clean.name && clean.note) && lengthOf(clean.name) <= GROUP_LIMITS.entryName && lengthOf(clean.note) <= noteMax && !linked;
  return (
    <form
      className="flex flex-col gap-3"
      onSubmit={(event) => {
        event.preventDefault();
        if (ok) onSubmit(clean);
      }}
      data-testid="group-note-form"
    >
      <Input value={name} maxLength={GROUP_LIMITS.entryName} onChange={(e) => setName(e.target.value)} placeholder={t("name")} aria-label={t("name")} className="h-11" autoComplete="off" />
      <div>
        <Textarea value={note} maxLength={noteMax} rows={3} onChange={(e) => setNote(e.target.value)} placeholder={t("note")} aria-label={t("note")} className="min-h-24 resize-none text-base leading-relaxed md:text-[15px]" />
        <p className="mt-1 text-right text-[11px] text-muted-foreground tabular-nums">{t("count", { n: note.length, max: noteMax })}</p>
      </div>
      {linked ? (
        <p role="alert" className="text-sm text-coral-deep" data-testid="group-note-links">
          {t("noLinks")}
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" className="h-11 rounded-full px-4" disabled={!ok}>
          {submitLabel}
        </Button>
        <Button type="button" variant="ghost" className="h-11 rounded-full px-4" onClick={onCancel}>
          {t("cancel")}
        </Button>
        {hasPhoto && onDropPhoto ? (
          <button type="button" onClick={onDropPhoto} className={cn(quiet, "ml-auto")} data-testid="group-drop-photo">
            {t("dropPhoto")}
          </button>
        ) : null}
      </div>
    </form>
  );
}

/** The notes already in the card, in the order the card shows them: move, fix, or take one out. */
export function InCardList({ items, noteMax, busyKey, onMove, onEdit, onDropPhoto, onRemove }: { items: GiftContribution[]; noteMax: number; busyKey: string | null; onMove: (from: number, to: number) => void; onEdit: (key: string, value: { name: string; note: string }) => void; onDropPhoto: (key: string) => void; onRemove: (key: string) => void }) {
  const t = useTranslations("editor.group");
  const [editing, setEditing] = useState<string | null>(null);
  return (
    <ol className="flex flex-col gap-2" data-testid="group-in-card">
      {items.map((item, index) => (
        <li key={item.key} className="rounded-2xl border border-border bg-card px-4 pt-3 pb-2" data-testid="group-item">
          {editing === item.key ? (
            <div className="pt-1 pb-2">
              <NoteForm
                initial={{ name: item.name, note: item.note }}
                noteMax={noteMax}
                hasPhoto={Boolean(item.photo)}
                submitLabel={t("save")}
                onSubmit={(value) => {
                  onEdit(item.key, value);
                  setEditing(null);
                }}
                onCancel={() => setEditing(null)}
                onDropPhoto={() => onDropPhoto(item.key)}
              />
            </div>
          ) : (
            // The words get the card's whole width; the four controls sit in one row under them.
            <div>
              <div className="flex items-start gap-3 pt-1 pr-1">
                {item.photo ? <img src={item.photo.url} alt={t("photoAlt", { name: item.name })} width={item.photo.width} height={item.photo.height} loading="lazy" className="mt-0.5 size-11 shrink-0 rounded-lg bg-ink/5 object-cover" /> : null}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium [overflow-wrap:anywhere] text-ink">{item.name}</p>
                  <p className="mt-0.5 text-sm leading-relaxed [overflow-wrap:anywhere] text-ink-soft">{item.note}</p>
                </div>
              </div>
              <div className="-mb-1 flex justify-end">
                <button type="button" className={iconButton} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={t("moveUp", { name: item.name })} data-testid="group-move-up">
                  <ArrowUp className="size-4" aria-hidden="true" />
                </button>
                <button type="button" className={iconButton} disabled={index === items.length - 1} onClick={() => onMove(index, index + 1)} aria-label={t("moveDown", { name: item.name })} data-testid="group-move-down">
                  <ArrowDown className="size-4" aria-hidden="true" />
                </button>
                <button type="button" className={iconButton} onClick={() => setEditing(item.key)} aria-label={`${t("edit")}: ${item.name}`} data-testid="group-edit">
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button type="button" className={iconButton} disabled={busyKey === item.key} onClick={() => onRemove(item.key)} aria-label={t("removeItem", { name: item.name })} data-testid="group-remove-item">
                  {busyKey === item.key ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
                </button>
              </div>
            </div>
          )}
        </li>
      ))}
    </ol>
  );
}

/** "Add one yourself", for someone without a phone to hand: a note the sender types in for them. */
export function AddOwn({ noteMax, disabled, onAdd }: { noteMax: number; disabled: boolean; onAdd: (value: { name: string; note: string }) => void }) {
  const t = useTranslations("editor.group");
  const [open, setOpen] = useState(false);
  if (!open)
    return (
      <div className="flex flex-wrap items-center gap-x-3">
        <Button type="button" variant="outline" className="h-11 rounded-full px-4" disabled={disabled} onClick={() => setOpen(true)} data-testid="group-add-own">
          <Plus className="size-4" aria-hidden="true" />
          {t("addOwn")}
        </Button>
        <span className="text-xs text-muted-foreground">{t("addOwnHint")}</span>
      </div>
    );
  return (
    <div className="rounded-2xl border border-border bg-card p-4">
      <NoteForm
        noteMax={noteMax}
        submitLabel={t("addOwnAdd")}
        onSubmit={(value) => {
          onAdd(value);
          setOpen(false);
        }}
        onCancel={() => setOpen(false)}
      />
    </div>
  );
}

/**
 * How long the link stays open, and what the sender can do to it. Three states: open (keep it open
 * longer, close it), closed by the sender (reopen it), and past its last day, which nobody closed:
 * that one says the day it ran out and offers the way back. `extend` is where "Keep it open" would
 * move the last day, or null when it can't move (90 days from the start): the button is then not
 * shown, and it promises "30 more days" only when it adds all thirty.
 */
export function LinkControls({ group, date, extend, busy, onExtend, onToggle, onReset }: { group: Pick<GroupView, "closedAt" | "ranOut">; date: string; extend: { date: string; full: boolean } | null; busy: boolean; onExtend: () => void; onToggle: () => void; onReset: () => void }) {
  const t = useTranslations("editor.group");
  const [confirming, setConfirming] = useState(false);
  const closed = Boolean(group.closedAt);
  const ranOut = !closed && group.ranOut;
  return (
    <div className="border-t border-dashed border-border pt-4" data-testid="group-link-controls" data-link={closed ? "closed" : ranOut ? "ran-out" : "open"}>
      <p className="text-sm text-ink-soft" data-testid="group-open-until">
        {closed ? t("closedNow") : ranOut ? t("ranOut", { date }) : t("openUntil", { date })}
      </p>
      {confirming ? (
        <div className="mt-1" role="group" aria-label={t("reset")}>
          <p className="text-sm text-ink">{t("resetConfirm")}</p>
          <div className="flex flex-wrap gap-x-5">
            <button
              type="button"
              disabled={busy}
              className={cn(quiet, "font-medium text-ink underline")}
              onClick={() => {
                setConfirming(false);
                onReset();
              }}
              data-testid="group-reset-yes"
            >
              {t("resetYes")}
            </button>
            <button type="button" className={quiet} onClick={() => setConfirming(false)}>
              {t("cancel")}
            </button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-x-5">
          {closed || !extend ? null : (
            <button type="button" disabled={busy} className={quiet} onClick={onExtend} data-testid="group-extend">
              {ranOut ? t("reopenUntil", { date: extend.date }) : extend.full ? t("extend") : t("extendUntil", { date: extend.date })}
            </button>
          )}
          {ranOut ? null : (
            <button type="button" disabled={busy} className={quiet} onClick={onToggle} data-testid="group-close">
              {closed ? t("reopen") : t("close")}
            </button>
          )}
          <button type="button" disabled={busy} className={quiet} onClick={() => setConfirming(true)} data-testid="group-reset">
            {t("reset")}
          </button>
        </div>
      )}
    </div>
  );
}
