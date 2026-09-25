"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowRight, Loader2, Users } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import type { Currency } from "@/lib/pricing/products";
import { deleteSavedDate, listSavedDates, patchSavedDate } from "@/lib/saved-dates/client";
import type { SavedDate, SavedDateSummary, SavedDatesList, UpsellReason } from "@/lib/saved-dates/types";
import { cn } from "@/lib/utils";
import { Cutout } from "@/components/marketing/home/cutouts";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { SavedDateCard, type TripCover } from "./saved-date-card";
import { SavedDatesUpsell } from "./upsell-sheet";

/** How long "Deleted · Undo" stays up. The date is only deleted once it has gone. */
const UNDO_MS = 6000;
const TITLE_MAX = 80;

const summaryOf = ({ data: _data, ...summary }: SavedDate): SavedDateSummary => summary;
const newestFirst = (items: SavedDateSummary[]) => [...items].sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt));
const without = (set: Set<string>, id: string) => {
  const next = new Set(set);
  next.delete(id);
  return next;
};

/**
 * My dates: the dates and trips this person saved, and their partner's while they share, as cards.
 * The first page comes from the server (`initial`); after that the list changes here. Deleting is
 * undoable for a few seconds: the card goes at once, and the date itself only when the undo has
 * passed (or the page is left, with a request that outlives it).
 */
export function MyDatesGrid({ initial, monthly, currency, trips = {}, failed = false }: { initial: SavedDatesList; monthly: boolean; currency: Currency; trips?: Record<string, TripCover>; failed?: boolean }) {
  const t = useTranslations("savedDates");
  const tc = useTranslations("common");
  const router = useRouter();
  const [list, setList] = useState(initial);
  const [state, setState] = useState<"ready" | "loading" | "error">(failed ? "error" : "ready");
  const [hidden, setHidden] = useState<Set<string>>(() => new Set());
  const [renaming, setRenaming] = useState<SavedDateSummary | null>(null);
  const [upsell, setUpsell] = useState<{ open: boolean; reason: UpsellReason }>({ open: false, reason: "read_only" });
  // Deletes waiting out their undo: the timer, and the date, so it can still be sent as the page goes.
  const pending = useRef(new Map<string, number>());

  const titleOf = useCallback((item: SavedDateSummary) => item.title || (item.kind === "trip" ? (trips[item.tripId ?? ""]?.title ?? t("card.trip")) : item.city || t("save.defaultTitle")), [t, trips]);

  const reload = useCallback(async () => {
    const res = await listSavedDates();
    if (res.ok) {
      setList({ items: res.items, quota: res.quota, member: res.member, partner: res.partner });
      setState("ready");
      return;
    }
    // Signed out since the page was drawn: the app's layout sends them to sign in.
    if (res.error === "unauthenticated") return router.refresh();
    setState((s) => (s === "loading" ? "error" : s));
  }, [router]);

  const patchItem = (id: string, change: (item: SavedDateSummary) => SavedDateSummary) => setList((l) => ({ ...l, items: l.items.map((item) => (item.id === id ? change(item) : item)) }));

  const commitDelete = useCallback(
    async (item: SavedDateSummary, keepalive = false) => {
      pending.current.delete(item.id);
      const res = await deleteSavedDate(item.id, { keepalive });
      if (res.ok || res.error === "not_found") {
        setList((l) => ({ ...l, items: l.items.filter((i) => i.id !== item.id), quota: { ...l.quota, used: Math.max(0, l.quota.used - 1) } }));
        setHidden((h) => without(h, item.id));
        return;
      }
      setHidden((h) => without(h, item.id));
      toast.error(t("card.deleteFailed", { title: titleOf(item) }));
    },
    [t, titleOf],
  );

  const undoDelete = (id: string) => {
    const timer = pending.current.get(id);
    if (timer === undefined) return;
    window.clearTimeout(timer);
    pending.current.delete(id);
    setHidden((h) => without(h, id));
  };

  const remove = (item: SavedDateSummary) => {
    setHidden((h) => new Set(h).add(item.id));
    pending.current.set(
      item.id,
      window.setTimeout(() => void commitDelete(item), UNDO_MS),
    );
    toast(t("card.menu.deleteConfirm", { title: titleOf(item) }), { duration: UNDO_MS, action: { label: t("card.undo"), onClick: () => undoDelete(item.id) } });
  };

  // Leaving the page (or closing the tab) ends the undo: whatever was deleted goes then.
  useEffect(() => {
    const waiting = pending.current;
    const flush = () => {
      for (const [id, timer] of waiting) {
        window.clearTimeout(timer);
        void deleteSavedDate(id, { keepalive: true });
      }
      waiting.clear();
    };
    window.addEventListener("pagehide", flush);
    return () => {
      window.removeEventListener("pagehide", flush);
      flush();
    };
  }, []);

  const setRemind = async (item: SavedDateSummary, remind: boolean) => {
    patchItem(item.id, (i) => ({ ...i, remind }));
    const res = await patchSavedDate(item.id, { remind });
    if (res.ok) return;
    patchItem(item.id, (i) => ({ ...i, remind: !remind }));
    toast.error(t("card.remindFailed"));
  };

  /** A rename carries the version it was made on; if the plan changed elsewhere meanwhile, the name still goes on the newest. */
  const rename = async (item: SavedDateSummary, title: string): Promise<boolean> => {
    let res = await patchSavedDate(item.id, { baseVersion: item.version, title });
    if (!res.ok && res.error === "conflict" && res.savedDate) res = await patchSavedDate(item.id, { baseVersion: res.savedDate.version, title });
    if (res.ok) {
      const next = summaryOf(res.savedDate);
      setList((l) => ({ ...l, items: newestFirst(l.items.map((i) => (i.id === next.id ? next : i))) }));
      return true;
    }
    if (res.error === "not_found" || res.error === "read_only") void reload();
    return false;
  };

  const actions = {
    onRename: (item: SavedDateSummary) => setRenaming(item),
    onRemind: (item: SavedDateSummary, remind: boolean) => void setRemind(item, remind),
    onDelete: remove,
    onReadOnly: () => setUpsell({ open: true, reason: "read_only" }),
  };

  const items = list.items.filter((item) => !hidden.has(item.id));
  const partner = list.partner?.name ?? null;
  const limit = list.quota.limit;

  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-10 sm:px-6">
      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-4">
        <div className="min-w-0">
          <h1 className="display-lg">{t("page.title")}</h1>
          <p className="mt-2 flex items-center gap-2 text-muted-foreground">
            {partner ? <Users aria-hidden="true" className="size-4 shrink-0 text-rose-deep" /> : null}
            {partner ? t("page.subShared", { name: partner }) : t("page.sub")}
          </p>
        </div>
        {limit !== null && state !== "error" ? (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-full bg-muted/70 py-1.5 pr-1.5 pl-4 text-[14px]" data-testid="saved-quota">
            <span className="inline-flex items-center gap-2 tabular-nums">
              <span aria-hidden="true" className="flex gap-1">
                {Array.from({ length: limit }, (_, i) => (
                  <span key={i} className={cn("size-2 rounded-full", i < list.quota.used ? "bg-rose" : "bg-foreground/15")} />
                ))}
              </span>
              {t("page.quota", { used: Math.min(list.quota.used, limit), limit })}
            </span>
            <Link href="/pricing?from=saved-dates#for-two" className="btn-star inline-flex min-h-9 items-center gap-1.5 rounded-full px-4 text-[13.5px] font-semibold">
              {t("page.upgrade")}
              <ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        ) : null}
      </header>

      {state !== "ready" ? (
        <div role="alert" className="mt-10 flex flex-col items-center rounded-[28px] border border-dashed border-border px-6 py-14 text-center">
          <p className="font-display text-2xl">{t("page.error")}</p>
          <button
            type="button"
            disabled={state === "loading"}
            onClick={() => {
              setState("loading");
              void reload();
            }}
            className="mt-5 inline-flex h-11 items-center gap-2 rounded-full border border-border px-5 text-sm font-semibold transition-colors hover:bg-muted disabled:opacity-60"
          >
            {state === "loading" ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
            {t("page.retry")}
          </button>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-10 flex flex-col items-center rounded-[28px] border border-dashed border-border px-6 py-14 text-center sm:py-20" data-testid="saved-empty">
          <Cutout id="envelope-ps" className="w-24 -rotate-6 drop-shadow-[0_14px_24px_rgba(120,50,70,0.25)]" />
          <h2 className="mt-6 font-display text-[28px] leading-tight text-balance">{t("page.empty.title")}</h2>
          <p className="mt-2 max-w-sm text-muted-foreground">{t("page.empty.sub")}</p>
          <div className="mt-7 flex flex-wrap justify-center gap-2.5">
            <Link href="/dates" className="btn-rose inline-flex h-12 items-center gap-2 rounded-full px-6 text-[15px] font-semibold">
              {t("page.empty.dates")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
            <Link href="/trips" className="inline-flex h-12 items-center rounded-full border border-border px-6 text-[15px] font-semibold transition-colors hover:bg-muted">
              {t("page.empty.trips")}
            </Link>
          </div>
        </div>
      ) : (
        <ul className="mt-10 grid gap-x-6 gap-y-9 sm:grid-cols-2 lg:grid-cols-3" data-testid="saved-grid">
          {items.map((item) => (
            <li key={item.id}>
              <SavedDateCard item={item} trip={item.tripId ? trips[item.tripId] : undefined} member={list.member} actions={actions} />
            </li>
          ))}
        </ul>
      )}

      <RenameDialog key={renaming?.id ?? "none"} item={renaming} title={renaming ? titleOf(renaming) : ""} onClose={() => setRenaming(null)} onRename={rename} closeLabel={tc("close")} cancelLabel={tc("cancel")} />
      <SavedDatesUpsell open={upsell.open} onOpenChange={(open) => setUpsell((u) => ({ ...u, open }))} reason={upsell.reason} monthly={monthly} currency={currency} />
    </div>
  );
}

function RenameDialog({ item, title, onClose, onRename, closeLabel, cancelLabel }: { item: SavedDateSummary | null; title: string; onClose: () => void; onRename: (item: SavedDateSummary, title: string) => Promise<boolean>; closeLabel: string; cancelLabel: string }) {
  const t = useTranslations("savedDates.card");
  const [value, setValue] = useState(title);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);
  const next = value.replace(/\s+/g, " ").trim();

  const submit = async () => {
    if (!item || !next || next === title) return onClose();
    setSaving(true);
    setFailed(false);
    const ok = await onRename(item, next);
    setSaving(false);
    if (ok) onClose();
    else setFailed(true);
  };

  return (
    <Dialog open={item !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent closeLabel={closeLabel} className="sm:max-w-md">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void submit();
          }}
        >
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{t("renameTitle")}</DialogTitle>
            <DialogDescription className="sr-only">{title}</DialogDescription>
          </DialogHeader>
          <label className="mt-4 block">
            <span className="text-[13px] font-medium text-muted-foreground">{t("renameLabel")}</span>
            {/* 16px: iPhone Safari zooms the page into any smaller field it focuses. */}
            <input value={value} onChange={(e) => setValue(e.target.value)} maxLength={TITLE_MAX} autoFocus className="mt-1 h-12 w-full rounded-2xl border border-border bg-background px-4 text-[16px] outline-none focus:border-rose/50 focus:shadow-[0_0_0_4px_rgba(178,58,94,0.12)]" />
          </label>
          {failed ? (
            <p role="alert" className="mt-2 text-[13px] text-destructive">
              {t("renameFailed")}
            </p>
          ) : null}
          <DialogFooter className="mt-6 gap-2">
            <button type="button" onClick={onClose} className="inline-flex h-11 items-center justify-center rounded-full border border-border px-5 text-sm font-semibold transition-colors hover:bg-muted">
              {cancelLabel}
            </button>
            <button type="submit" disabled={saving || !next} className="btn-rose inline-flex h-11 items-center justify-center gap-2 rounded-full px-6 text-sm font-semibold disabled:opacity-60">
              {saving ? <Loader2 aria-hidden="true" className="size-4 animate-spin" /> : null}
              {t("renameSave")}
            </button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
