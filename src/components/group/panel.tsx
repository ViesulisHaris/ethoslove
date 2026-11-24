/* eslint-disable @next/next/no-img-element -- signed Storage URLs, shown at thumbnail size */
"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import { ArrowDown, ArrowUp, Check, Copy, Loader2, MessageCircle, Pencil, Plus, Share2, Trash2 } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import type { GiftContribution } from "@/lib/gift/schema";
import { isolated } from "@/lib/group/bidi";
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

const quiet = "inline-flex min-h-11 items-center gap-1.5 rounded-md text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline disabled:opacity-50 aria-disabled:opacity-50";
const iconButton = "grid size-11 shrink-0 place-items-center rounded-full text-ink-soft hover:bg-ink/5 hover:text-ink disabled:pointer-events-none disabled:opacity-30";

const never = () => () => {};

/**
 * Keeps the keyboard's focus with what a tap just changed. Nearly every button in this panel replaces
 * the thing it sits in (a note opens into a form, the form closes, a question takes the place of
 * three links), and the button goes with it: the focus fell back to the top of the document, so a
 * keyboard's next Tab started the whole editor again and a screen reader said nothing. `land(name)`
 * says where it should be once the change is drawn: the element marked `data-land={name}` inside
 * `root`, which is the form's first field as it opens and the button that opened it as it closes.
 * It is looked for after each render until it is there, and given up on after a few seconds, so a
 * landing that never comes can't pull the focus away later.
 */
export function useLanding<T extends HTMLElement>() {
  const root = useRef<T>(null);
  const wanted = useRef<{ name: string; since: number } | null>(null);
  useEffect(() => {
    const want = wanted.current;
    if (!want) return;
    if (Date.now() - want.since > 5000) return void (wanted.current = null);
    const target = root.current?.querySelector<HTMLElement>(`[data-land="${want.name}"]`);
    if (!target || target.matches(":disabled")) return;
    wanted.current = null;
    target.focus();
  });
  const land = useCallback((name: string) => {
    wanted.current = { name, since: Date.now() };
  }, []);
  return [root, land] as const;
}
/** A heading or a line that takes the focus when the list under it changes: read out, never a stop on the way through. */
export const landing = "rounded-sm focus:outline-none";

/**
 * What went wrong, said where the sender is looking: inside the note they tapped, beside the link's
 * own controls, under the form they sent. It brings itself into view, because the thing tapped can
 * sit at the edge of a phone's screen (one line at the foot of the whole panel was two screens away).
 */
export function PanelError({ text, className }: { text: string | null | undefined; className?: string }) {
  const line = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (text) line.current?.scrollIntoView({ block: "nearest" });
  }, [text]);
  return text ? (
    <p ref={line} role="alert" className={cn("text-sm text-coral-deep", className)} data-testid="group-error">
      {text}
    </p>
  ) : null;
}

/** Before a link exists: what it costs (the price is shown here first) and the one button. */
export function GroupIntro({ priceLine, onInvite }: { priceLine: string; onInvite: () => void }) {
  const t = useTranslations("editor.group");
  return (
    <div data-testid="group-intro">
      <p className="text-sm leading-relaxed text-ink-soft" data-testid="group-price-line">
        {priceLine}
      </p>
      <p className="mt-1.5 text-xs text-muted-foreground">{t("stays")}</p>
      <Button type="button" className="mt-5 h-11 rounded-full px-5" onClick={onInvite} data-land="invite" data-testid="group-invite">
        {t("invite")}
      </Button>
    </div>
  );
}

/**
 * What the page at the link will say: who is asking, who it is for, and one line on what to write.
 * The same form makes the link (`onCancel` absent) and, once it exists, changes what its page says
 * (`onCancel` given: "Save" and a way out), so a name typed wrong can be put right after it was shared.
 */
export function GroupSetup({ fromName, forName, prompt: promptNow = "", busy, error, onCreate, onCancel }: { fromName: string; forName: string; prompt?: string; busy: boolean; error: string | null; onCreate: (input: { fromName: string; forName: string; prompt: string }) => void; onCancel?: () => void }) {
  const t = useTranslations("editor.group");
  const editing = Boolean(onCancel);
  const [from, setFrom] = useState(fromName);
  const [to, setTo] = useState(forName);
  const [prompt, setPrompt] = useState(promptNow);
  const [missing, setMissing] = useState(false);
  const names = { fromName: cleanText(from), forName: cleanText(to), prompt: cleanText(prompt) };
  // The page at the link is held to what a note is held to: the server refuses a web address in any
  // of the three lines, and "try again in a moment" was all it said. Said here, as it is typed, in words.
  const linked = hasLink(names.fromName) || hasLink(names.forName) || hasLink(names.prompt);
  const submit = () => {
    if (linked) return;
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
      data-testid={editing ? "group-page-form" : "group-setup"}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <Field id="group-from" label={t("fromName")}>
          <Input id="group-from" dir="auto" value={from} maxLength={GROUP_LIMITS.name} onChange={(e) => setFrom(e.target.value)} className="h-11" autoComplete="off" data-land="page-from" />
        </Field>
        <Field id="group-for" label={t("forName")}>
          <Input id="group-for" dir="auto" value={to} maxLength={GROUP_LIMITS.name} onChange={(e) => setTo(e.target.value)} className="h-11" autoComplete="off" />
        </Field>
      </div>
      <Field id="group-prompt" label={t("prompt")} badge={<span className="text-xs font-normal text-muted-foreground">{t("optional")}</span>}>
        <Input id="group-prompt" dir="auto" value={prompt} maxLength={GROUP_LIMITS.prompt} onChange={(e) => setPrompt(e.target.value)} placeholder={t("promptPlaceholder")} className="h-11" autoComplete="off" />
      </Field>
      <div>
        <div className="flex flex-wrap items-center gap-2">
          <Button type="submit" className="h-11 rounded-full px-5" disabled={busy || linked} data-testid={editing ? "group-page-save" : "group-create"}>
            {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
            <span>{editing ? (busy ? t("saving") : t("save")) : busy ? t("creating") : t("create")}</span>
          </Button>
          {onCancel ? (
            <Button type="button" variant="ghost" className="h-11 rounded-full px-4" disabled={busy} onClick={onCancel}>
              {t("cancel")}
            </Button>
          ) : null}
        </div>
        {linked ? (
          <p role="alert" className="mt-3 text-sm text-coral-deep" data-testid="group-page-links">
            {t("pageNoLinks")}
          </p>
        ) : missing || error ? (
          <p role="alert" className="mt-3 text-sm text-coral-deep">
            {missing ? t("needNames") : error}
          </p>
        ) : null}
      </div>
    </form>
  );
}

/**
 * The link, with the ways to pass it on. A link that takes no notes (closed by the sender, or past
 * its last day) says so on itself and offers nothing to share it with: it used to stand at the top
 * looking live, with the only word about it under every note in the card. "Share…" is the phone's
 * own sheet, so it is offered only where there is one.
 */
export function GroupLink({ url, shareText, state = "open", onShared }: { url: string; shareText: string; state?: "open" | "closed" | "ranOut"; onShared: (via: "copy" | "share" | "whatsapp") => void }) {
  const t = useTranslations("editor.group");
  const [copied, setCopied] = useState(false);
  const canShare = useSyncExternalStore(never, () => typeof navigator.share === "function", () => false);
  const open = state === "open";
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
    try {
      await navigator.share({ text: shareText, url });
      onShared("share");
    } catch {
      // They closed the sheet.
    }
  };
  const pill = "flex h-11 items-center justify-center gap-2 rounded-full border border-border bg-card text-sm font-medium hover:border-ink/40";
  return (
    <div data-testid="group-link" data-link={open ? "open" : state === "closed" ? "closed" : "ran-out"}>
      <div className="mb-2 flex items-center gap-2">
        <p className="text-[13px] font-medium text-ink">{t("link")}</p>
        {open ? null : (
          <span className="rounded-full bg-ink px-2.5 py-0.5 text-xs font-medium text-paper" data-testid="group-link-state">
            {t(state === "closed" ? "linkClosed" : "linkRanOut")}
          </span>
        )}
      </div>
      <div className={cn("flex items-center gap-2 rounded-2xl border border-border p-2 pl-4", open ? "bg-card" : "border-dashed")}>
        <span className={cn("min-w-0 flex-1 truncate font-mono text-sm", !open && "text-muted-foreground line-through decoration-ink/30")} data-testid="group-url">
          {url.replace(/^https?:\/\//, "")}
        </span>
        {open ? (
          <Button type="button" onClick={copy} className="h-11 shrink-0 rounded-full px-4" data-land="copy" data-testid="group-copy">
            {copied ? <Check className="size-4" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
            <span>{copied ? t("copied") : t("copy")}</span>
          </Button>
        ) : (
          // The row keeps its height, so nothing under it jumps when the link is closed and reopened.
          <span className="h-11" aria-hidden="true" />
        )}
      </div>
      {open ? (
        <div className={cn("mt-2 grid gap-2", canShare ? "grid-cols-2" : "grid-cols-1")}>
          {canShare ? (
            <button type="button" onClick={share} className={pill} data-testid="group-share">
              <Share2 className="size-4" aria-hidden="true" />
              {t("share")}
            </button>
          ) : null}
          <a href={`https://wa.me/?text=${encodeURIComponent(shareText)}`} target="_blank" rel="noopener" onClick={() => onShared("whatsapp")} className={pill} data-testid="group-whatsapp">
            <MessageCircle className="size-4" aria-hidden="true" />
            {t("whatsapp")}
          </a>
        </div>
      ) : null}
    </div>
  );
}

/**
 * What the page at the link says, in one sentence, with the way to change it: up to 25 people read
 * these names, so a slip in one has to be fixable after the link went out.
 */
export function PageWords({ group, onEdit }: { group: Pick<GroupView, "fromName" | "forName" | "prompt">; onEdit: () => void }) {
  const t = useTranslations("editor.group");
  return (
    <div className="flex items-start justify-between gap-3" data-testid="group-page-words">
      <p className="min-w-0 py-3 text-sm leading-relaxed [overflow-wrap:anywhere] text-ink-soft">
        {t("pageSays", { from: isolated(group.fromName), for: isolated(group.forName) })}
        {group.prompt ? <> {t("pageAsks", { prompt: isolated(group.prompt) })}</> : null}
      </p>
      <button type="button" onClick={onEdit} aria-label={t("editPage")} className={cn(quiet, "min-w-11 shrink-0 justify-end font-medium text-ink underline")} data-land="edit-page" data-testid="group-edit-page">
        {t("edit")}
      </button>
    </div>
  );
}

/** One note waiting for the sender's yes: who, what, the photo if any, and the two answers. */
export function WaitingEntry({ entry, busy, full, error, onAdd, onRemove }: { entry: GroupEntryView; busy: boolean; full: boolean; error?: string | null; onAdd: (withPhoto: boolean) => void; onRemove: () => void }) {
  const t = useTranslations("editor.group");
  const locale = useLocale();
  const [withPhoto, setWithPhoto] = useState(true);
  const name = entry.name ?? "";
  return (
    <li className="rounded-2xl border border-border bg-card p-4" data-testid="group-waiting-entry">
      <div className="flex gap-3">
        {entry.photo ? <img src={entry.photo.url} alt={t("photoAlt", { name: isolated(name) })} width={entry.photo.width} height={entry.photo.height} loading="lazy" className="size-16 shrink-0 rounded-xl bg-ink/5 object-cover" /> : null}
        <div className="min-w-0 flex-1">
          {/* Each starts from the side its own script starts from: a note in Arabic or Hebrew is ranged right, with its full stop at its end. */}
          <p dir="auto" className="text-start text-sm font-medium [overflow-wrap:anywhere] text-ink">
            {name}
          </p>
          <p dir="auto" className="mt-1 text-start text-sm leading-relaxed [overflow-wrap:anywhere] text-ink-soft">
            {entry.note}
          </p>
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
        <Button type="button" className="h-11 rounded-full px-4" disabled={busy || full} onClick={() => onAdd(Boolean(entry.photo) && withPhoto)} data-land={`add:${entry.id}`} data-testid="group-add">
          {busy ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : null}
          <span>{busy ? t("adding") : t("add")}</span>
        </Button>
        <Button type="button" variant="ghost" className="h-11 rounded-full px-4" disabled={busy} onClick={onRemove} data-testid="group-reject">
          {t("remove")}
        </Button>
        {/* A report is an email to a person, in the sender's language, quoting the note's reference and nothing that opens anything. */}
        <a href={groupReportLink("note", entry.reportRef, locale)} className={cn(quiet, "ml-auto min-w-11 justify-end text-xs")} data-testid="group-report">
          {t("report")}
        </a>
      </div>
      <PanelError text={error} className="mt-2" />
    </li>
  );
}

/** A note just turned down or removed: one line, and a day to change your mind. */
export function DecidedEntry({ entry, busy, error, onUndo }: { entry: GroupEntryView; busy: boolean; error?: string | null; onUndo: () => void }) {
  const t = useTranslations("editor.group");
  return (
    <li className="rounded-2xl border border-dashed border-border px-4 py-1 text-sm text-ink-soft" data-testid="group-decided-entry">
      <div className="flex items-center justify-between gap-3">
        <span id={`removed-${entry.id}`} className="min-w-0 [overflow-wrap:anywhere]">
          {t("removed", { name: isolated(entry.name ?? "") })}
        </span>
        {/* Where the focus goes when a note is removed: said with the line beside it, so "Undo" is never heard alone. */}
        <button type="button" onClick={onUndo} disabled={busy} aria-describedby={`removed-${entry.id}`} className={cn(quiet, "min-w-11 shrink-0 justify-end font-medium text-ink underline")} data-land={`undo:${entry.id}`} data-testid="group-undo">
          {t("undo")}
        </button>
      </div>
      <PanelError text={error} className="pb-2" />
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
      <Input dir="auto" value={name} maxLength={GROUP_LIMITS.entryName} onChange={(e) => setName(e.target.value)} placeholder={t("name")} aria-label={t("name")} className="h-11" autoComplete="off" data-land="note-name" />
      <div>
        <Textarea dir="auto" value={note} maxLength={noteMax} rows={3} onChange={(e) => setNote(e.target.value)} placeholder={t("note")} aria-label={t("note")} className="min-h-24 resize-none text-base leading-relaxed md:text-[15px]" />
        <p className="mt-1 text-right text-xs text-muted-foreground tabular-nums" data-testid="group-note-count">
          {t("count", { n: note.length, max: noteMax })}
        </p>
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
export function InCardList({ items, noteMax, busyKey, error, onMove, onEdit, onDropPhoto, onRemove }: { items: GiftContribution[]; noteMax: number; busyKey: string | null; error?: { at: string; text: string } | null; onMove: (from: number, to: number) => void; onEdit: (key: string, value: { name: string; note: string }) => void; onDropPhoto: (key: string) => void; onRemove: (key: string) => void }) {
  const t = useTranslations("editor.group");
  const [editing, setEditing] = useState<string | null>(null);
  const [root, land] = useLanding<HTMLOListElement>();
  // The form closes back into the note it opened from, and the focus goes back to the pencil that opened it.
  const close = (key: string) => {
    setEditing(null);
    land(`edit:${key}`);
  };
  return (
    <ol ref={root} className="flex flex-col gap-2" data-testid="group-in-card">
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
                  close(item.key);
                }}
                onCancel={() => close(item.key)}
                onDropPhoto={() => {
                  onDropPhoto(item.key);
                  // "Remove the photo" goes with the photo: back to the top of the form it was in.
                  land("note-name");
                }}
              />
            </div>
          ) : (
            // The words get the card's whole width; the four controls sit in one row under them.
            <div>
              <div className="flex items-start gap-3 pt-1 pr-1">
                {item.photo ? <img src={item.photo.url} alt={t("photoAlt", { name: isolated(item.name) })} width={item.photo.width} height={item.photo.height} loading="lazy" className="mt-0.5 size-11 shrink-0 rounded-lg bg-ink/5 object-cover" /> : null}
                <div className="min-w-0 flex-1">
                  <p dir="auto" className="text-start text-sm font-medium [overflow-wrap:anywhere] text-ink">
                    {item.name}
                  </p>
                  <p dir="auto" className="mt-0.5 text-start text-sm leading-relaxed [overflow-wrap:anywhere] text-ink-soft">
                    {item.note}
                  </p>
                </div>
              </div>
              <div className="-mb-1 flex justify-end">
                <button type="button" className={iconButton} disabled={index === 0} onClick={() => onMove(index, index - 1)} aria-label={t("moveUp", { name: isolated(item.name) })} data-testid="group-move-up">
                  <ArrowUp className="size-4" aria-hidden="true" />
                </button>
                <button type="button" className={iconButton} disabled={index === items.length - 1} onClick={() => onMove(index, index + 1)} aria-label={t("moveDown", { name: isolated(item.name) })} data-testid="group-move-down">
                  <ArrowDown className="size-4" aria-hidden="true" />
                </button>
                <button
                  type="button"
                  className={iconButton}
                  onClick={() => {
                    setEditing(item.key);
                    land("note-name");
                  }}
                  aria-label={`${t("edit")}: ${isolated(item.name)}`}
                  data-land={`edit:${item.key}`}
                  data-testid="group-edit"
                >
                  <Pencil className="size-4" aria-hidden="true" />
                </button>
                <button type="button" className={iconButton} disabled={busyKey === item.key} onClick={() => onRemove(item.key)} aria-label={t("removeItem", { name: isolated(item.name) })} data-testid="group-remove-item">
                  {busyKey === item.key ? <Loader2 className="size-4 animate-spin" aria-hidden="true" /> : <Trash2 className="size-4" aria-hidden="true" />}
                </button>
              </div>
              <PanelError text={error?.at === item.key ? error.text : null} className="pt-1 pb-2" />
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
  const [root, land] = useLanding<HTMLDivElement>();
  const close = () => {
    setOpen(false);
    land("add-own");
  };
  return (
    <div ref={root}>
      {open ? (
        <div className="rounded-2xl border border-border bg-card p-4">
          <NoteForm
            noteMax={noteMax}
            submitLabel={t("addOwnAdd")}
            onSubmit={(value) => {
              onAdd(value);
              close();
            }}
            onCancel={close}
          />
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-3">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-full px-4"
            disabled={disabled}
            onClick={() => {
              setOpen(true);
              land("note-name");
            }}
            data-land="add-own"
            data-testid="group-add-own"
          >
            <Plus className="size-4" aria-hidden="true" />
            {t("addOwn")}
          </Button>
          <span className="text-xs text-muted-foreground">{t("addOwnHint")}</span>
        </div>
      )}
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
export function LinkControls({ group, date, extend, busy, error, onExtend, onToggle, onReset }: { group: Pick<GroupView, "closedAt" | "ranOut">; date: string; extend: { date: string; full: boolean } | null; busy: boolean; error?: string | null; onExtend: () => void; onToggle: () => void; onReset: () => void }) {
  const t = useTranslations("editor.group");
  const [confirming, setConfirming] = useState(false);
  const [root, land] = useLanding<HTMLDivElement>();
  const closed = Boolean(group.closedAt);
  const ranOut = !closed && group.ranOut;
  // Either answer puts the three links back, and the focus on the one that asked.
  const answered = () => {
    setConfirming(false);
    land("reset");
  };
  return (
    <div ref={root} className="border-t border-dashed border-border pt-4" data-testid="group-link-controls" data-link={closed ? "closed" : ranOut ? "ran-out" : "open"}>
      <p className="text-sm text-ink-soft" data-testid="group-open-until">
        {closed ? t("closedNow") : ranOut ? t("ranOut", { date }) : t("openUntil", { date })}
      </p>
      {confirming ? (
        <div className="mt-1" role="group" aria-labelledby="group-reset-question">
          {/* The question takes the focus, not either answer: it is read out first, and Enter pressed twice can't reset the link. */}
          <p id="group-reset-question" tabIndex={-1} className={cn("text-sm text-ink", landing)} data-land="reset-question">
            {t("resetConfirm")}
          </p>
          <div className="flex flex-wrap gap-x-5">
            <button
              type="button"
              disabled={busy}
              className={cn(quiet, "font-medium text-ink underline")}
              onClick={() => {
                answered();
                onReset();
              }}
              data-testid="group-reset-yes"
            >
              {t("resetYes")}
            </button>
            <button type="button" className={quiet} onClick={answered}>
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
          {/* Dimmed, not switched off, while the link is being changed: it has just been handed the focus back, which a switched-off button can't hold. */}
          <button
            type="button"
            aria-disabled={busy || undefined}
            className={quiet}
            onClick={() => {
              if (busy) return;
              setConfirming(true);
              land("reset-question");
            }}
            data-land="reset"
            data-testid="group-reset"
          >
            {t("reset")}
          </button>
        </div>
      )}
      <PanelError text={error} className="mt-1" />
    </div>
  );
}
