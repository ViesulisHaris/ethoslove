"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { nanoid } from "nanoid";
import { useLocale, useTranslations } from "next-intl";
import { getEntitlement } from "@/app/actions/gift";
import { AuthForm } from "@/components/auth/auth-form";
import { AddOwn, DecidedEntry, GroupIntro, GroupLink, GroupSetup, InCardList, LinkControls, PageWords, PanelError, WaitingEntry, landing, useLanding } from "@/components/group/panel";
import { track } from "@/lib/analytics/track";
import { useEditor } from "@/lib/editor/store";
import { isolated } from "@/lib/group/bidi";
import { approveEntry, createGroup, decideEntry, findGroup, patchGroup, type GroupEntryView, type GroupError, type GroupView } from "@/lib/group/client";
import { GROUP_LIMITS, GROUP_RETENTION } from "@/lib/group/limits";
import { useCurrency } from "@/lib/pricing/use-currency";
import { formatAmount, groupAmount, hasGroupUnlock, hasUnlock } from "@/lib/pricing/products";
import { cn } from "@/lib/utils";
import type { TemplateManifest } from "@/templates/types";
import { SectionHeader } from "../field";

const DAY = 86_400_000;
const POLL_MS = 20_000;
/** How soon the panel asks again while it has not yet been told how its group stands. */
const RETRY_MS = 5_000;
/** A key for a note the sender typed in themselves: the same shape as one the server makes. */
const ownKey = () => nanoid(14).toLowerCase().replace(/[^a-z0-9]/g, "").padEnd(10, "0").slice(0, 10);

/** What the development-only preview page seeds the section with (no server behind it). */
export type GroupSectionPreview = { step: "intro" | "guest" | "setup" | "active"; group?: GroupView; owned?: string[] };

/**
 * "A group card", in the editor of a template made for one (`manifest.features.group`), and only
 * while group cards are switched on: the editor shell renders it for nothing else. The sender sees
 * the price before any link exists, signs in if they haven't, says what the page at the link should
 * say, and gets the link. From then on this is their inbox: each note waits here until they add it
 * to the card or remove it, and the card's own list of notes is edited here too.
 *
 * The server keeps the group and what people sent; the gift's own content stays the editor's to
 * write. Saying yes returns the item and this puts it in the gift (and saves at once); whenever the
 * group is read again, a note the server says was added but the gift doesn't hold is put back, and
 * one that was removed or taken back by its writer is taken out.
 *
 * Two things it keeps to throughout. What it says when something fails is what happened, never
 * "try again in a moment" over something no second try can change (`words`, below). And the
 * keyboard's focus follows what a tap changed (`land`): the note that was added leaves the list and
 * the list's heading is read out, a note removed lands on its Undo, a form that opens gives its
 * first field the cursor.
 */
export function GroupSection({ manifest, preview }: { manifest: TemplateManifest; preview?: GroupSectionPreview }) {
  const t = useTranslations("editor.group");
  const tS = useTranslations("editor.sections.group");
  const locale = useLocale();
  const currency = useCurrency();
  const slug = manifest.slug;
  const authed = useEditor((s) => s.authed);
  const giftId = useEditor((s) => s.giftId);
  const status = useEditor((s) => s.status);
  const senderName = useEditor((s) => s.data.senderName);
  const recipientName = useEditor((s) => s.data.recipientName);
  const items = useEditor((s) => s.data.contributions);
  const inCard = useMemo(() => items ?? [], [items]);

  const [asked, setAsked] = useState<"intro" | "guest" | "setup">(preview && preview.step !== "active" ? preview.step : "intro");
  const [group, setGroup] = useState<GroupView | null>(preview?.group ?? null);
  // Whether the panel has been told how its group stands. Only an answer counts: a read that failed
  // says nothing about whether the card has a group, and must never be drawn as "it has none".
  const [loaded, setLoaded] = useState(Boolean(preview));
  const [readFailure, setReadFailure] = useState<GroupError | null>(null);
  const [owned, setOwned] = useState<string[]>(preview?.owned ?? []);
  const [busy, setBusy] = useState<string | null>(null);
  // What went wrong and what it was about (a note's id or key, "link", "words", "create", "waiting"):
  // each is said beside the thing that was tapped, never in one line at the foot of the panel.
  const [failure, setFailure] = useState<{ at: string; text: string } | null>(null);
  const failed = (at: string) => (failure?.at === at ? failure.text : null);
  // The form that changes what the page at the link says, open or not.
  const [editingWords, setEditingWords] = useState(false);
  const [section, land] = useLanding<HTMLElement>();
  const live = !preview;

  // In words, what a refusal means for the person looking at it. "Try again in a moment" is kept for
  // what trying again can change.
  const words = useCallback((code: GroupError) => (code === "unavailable" ? t("unavailable") : code === "full" ? t("full") : code === "unauthenticated" ? t("signedOut") : t("error")), [t]);

  // What the account holds, for the price line: only a signed-in account has anything.
  useEffect(() => {
    if (!live || !authed) return;
    let on = true;
    void getEntitlement(slug).then((entitlement) => on && setOwned(entitlement.owned));
    return () => {
      on = false;
    };
  }, [live, authed, slug]);

  // Read the group when the gift is known, then every 20 seconds while the panel is on screen and
  // the tab is in front, and when the tab comes back. Until one read has been answered the panel
  // shows that it is still asking (and asks again sooner): a phone between two bars of signal used
  // to be shown the price and "Invite people" over a card whose link was already out.
  const reread = useRef<() => void>(() => {});
  useEffect(() => {
    if (!live || !authed || !giftId) return;
    let on = true;
    let answered = false;
    let retry: number | undefined;
    const read = () =>
      void findGroup(giftId).then((found) => {
        if (!on) return;
        if (found.ok) {
          answered = true;
          setGroup(found.group);
          setLoaded(true);
          setReadFailure(null);
          return;
        }
        if (answered) return;
        setReadFailure(found.error);
        // Signed out is not something asking again can change.
        if (found.error !== "unauthenticated") {
          window.clearTimeout(retry);
          retry = window.setTimeout(read, RETRY_MS);
        }
      });
    reread.current = read;
    read();
    let visible = true;
    const io = typeof IntersectionObserver === "function" ? new IntersectionObserver(([entry]) => (visible = entry.isIntersecting)) : null;
    if (section.current) io?.observe(section.current);
    const timer = window.setInterval(() => {
      if (visible && document.visibilityState === "visible") read();
    }, POLL_MS);
    window.addEventListener("focus", read);
    return () => {
      on = false;
      io?.disconnect();
      window.clearInterval(timer);
      window.clearTimeout(retry);
      window.removeEventListener("focus", read);
    };
  }, [live, authed, giftId, section]);

  // Keep the gift in step with the group: put back what was added and lost, take out what is gone.
  // (The server is the one that keeps a note taken back out of what is sent: publishing, and saving
  // a card that is out, drop it whatever this copy holds. This only keeps the editor honest.)
  const healing = useRef(new Set<string>());
  useEffect(() => {
    if (!live || !group) return;
    const editor = useEditor.getState();
    const held = new Set((editor.data.contributions ?? []).map((item) => item.key));
    for (const entry of group.entries) {
      if (!entry.key) continue;
      if (entry.status === "approved" && !held.has(entry.key) && !healing.current.has(entry.id)) {
        healing.current.add(entry.id);
        // Asked for with the photo; the server gives it back only if it was added with it the first time.
        void approveEntry(group.id, entry.id, Boolean(entry.photo)).then((again) => {
          healing.current.delete(entry.id);
          if (!again.ok || !again.item) return;
          useEditor.getState().addContribution(again.item, again.previewUrl);
          void useEditor.getState().syncNow();
        });
      } else if (entry.status !== "approved" && entry.status !== "pending" && held.has(entry.key)) {
        editor.removeContribution(entry.key);
        void editor.syncNow();
      }
    }
  }, [live, group]);

  // A guest who signs in from the panel carries straight on to the names.
  const step = asked === "guest" && authed ? "setup" : asked;

  const price = formatAmount(groupAmount(currency, owned, slug), currency, locale);
  const priceLine = hasGroupUnlock(owned, slug) ? t("priceLineHeld", { template: manifest.name[locale === "es" ? "es" : "en"] }) : t(hasUnlock(owned, slug) ? "priceLineOwned" : "priceLine", { template: manifest.name[locale === "es" ? "es" : "en"], price });

  const invite = () => {
    track("group_invite_tap", { template: slug, guest: !authed });
    setFailure(null);
    setAsked(authed ? "setup" : "guest");
    land(authed ? "page-from" : "guest");
  };

  /** What a refusal of the three lines the page says comes to: a web address in one of them is the one thing the form itself can't have caught. */
  const wordsRefused = (code: GroupError | undefined, otherwise: string) => (code === "unavailable" ? t("unavailable") : code === "invalid" ? t("pageNoLinks") : code === "unauthenticated" ? t("signedOut") : otherwise);

  const create = async (input: { fromName: string; forName: string; prompt: string }) => {
    if (!live) return;
    setBusy("create");
    setFailure(null);
    // The group hangs off the draft's row: make sure there is one, and that it holds what is on screen.
    const editor = useEditor.getState();
    const id = await editor.ensureRemote();
    if (id) await editor.syncNow();
    const made = id ? await createGroup({ giftId: id, ...input, ...(input.prompt ? {} : { prompt: undefined }) }) : null;
    setBusy(null);
    if (!made?.ok) return setFailure({ at: "create", text: wordsRefused(made?.error, t("createError")) });
    track("group_link_created", { template: slug });
    setGroup(made.group);
    setLoaded(true);
    // The form is gone and the link is there: on the button that copies it.
    land("copy");
  };

  const patchEntry = (id: string, change: Partial<GroupEntryView>) => setGroup((current) => (current ? { ...current, entries: current.entries.map((entry) => (entry.id === id ? { ...entry, ...change } : entry)) } : current));

  /**
   * The server would not do it because the note is no longer what this panel thought it was: its
   * writer took it back, or it was dealt with from another phone (or has since been deleted).
   * Nothing here is worth trying again; the group is read afresh, so the list is right, and what
   * happened is said under the list's heading, where the focus goes.
   */
  const outOfStep = (code: GroupError) => code === "taken_back" || code === "not_allowed" || code === "not_found";
  const moved = (entry: GroupEntryView, code: GroupError) => {
    reread.current();
    setFailure({ at: "waiting", text: code === "taken_back" ? t("takenBack", { name: isolated(entry.name ?? "") }) : t("noteMoved") });
    land("waiting-title");
  };

  const add = async (entry: GroupEntryView, withPhoto: boolean) => {
    if (!group || !live) return;
    setBusy(entry.id);
    setFailure(null);
    const done = await approveEntry(group.id, entry.id, withPhoto);
    setBusy(null);
    if (!done.ok && outOfStep(done.error)) return moved(entry, done.error);
    if (!done.ok || !done.item) return setFailure({ at: entry.id, text: words(done.ok ? "failed" : done.error) });
    const editor = useEditor.getState();
    editor.addContribution(done.item, done.previewUrl);
    void editor.syncNow();
    patchEntry(entry.id, { status: "approved", key: done.item.key });
    track("group_note_approved", { template: slug, photo: Boolean(done.item.photo) });
    // The note has left this list for the card: its heading, with one fewer waiting, and the next note a Tab away.
    land("waiting-title");
  };

  const decide = async (entry: GroupEntryView, action: "reject" | "restore") => {
    if (!group || !live) return;
    setBusy(entry.id);
    setFailure(null);
    const done = await decideEntry(group.id, entry.id, action);
    setBusy(null);
    if (!done.ok) {
      if (done.error === "gone") {
        // Past the day Undo is given: the line goes, and the list says why. (The server tells the
        // panel which notes can still come back, so this is only a panel left open over midnight.)
        patchEntry(entry.id, { canUndo: false });
        setFailure({ at: "waiting", text: t("undoGone") });
        return land("waiting-title");
      }
      if (outOfStep(done.error)) return moved(entry, done.error);
      return setFailure({ at: entry.id, text: words(done.error) });
    }
    patchEntry(entry.id, { status: done.status, key: action === "restore" ? null : entry.key, decidedAt: action === "restore" ? null : new Date().toISOString(), canUndo: action === "reject" });
    if (action === "reject") track("group_note_removed", { template: slug, added: false });
    // Removed: on its Undo. Brought back: on its "Add to the card".
    land(action === "reject" ? `undo:${entry.id}` : `add:${entry.id}`);
  };

  const removeItem = async (key: string) => {
    const editor = useEditor.getState();
    const entry = group?.entries.find((candidate) => candidate.key === key && candidate.status === "approved");
    if (entry && group && live) {
      setBusy(key);
      setFailure(null);
      // The server first, so a note taken out here is never put back by the next read.
      const done = await decideEntry(group.id, entry.id, "remove");
      setBusy(null);
      // Already out of the card as far as the server knows (its writer took it back): take it out here too.
      if (!done.ok && !outOfStep(done.error)) return setFailure({ at: key, text: words(done.error) });
      if (done.ok) patchEntry(entry.id, { status: "removed", decidedAt: new Date().toISOString(), canUndo: true });
      else reread.current();
    }
    editor.removeContribution(key);
    void editor.syncNow();
    track("group_note_removed", { template: slug, added: true });
    land("in-card-title");
  };

  const change = async (patch: Parameters<typeof patchGroup>[1]) => {
    if (!group || !live) return;
    setBusy("link");
    setFailure(null);
    const done = await patchGroup(group.id, patch);
    setBusy(null);
    if (!done.ok) return setFailure({ at: "link", text: words(done.error) });
    setGroup(done.group);
  };

  // The form closes back into the sentence it opened from, and the focus goes back to its "Edit".
  const closeWords = () => {
    setEditingWords(false);
    land("edit-page");
  };

  // What the page at the link says, changed after the link exists (a name typed wrong, a better
  // line on what to write). The link itself stays the same, so nobody has to be sent a new one.
  const saveWords = async (input: { fromName: string; forName: string; prompt: string }) => {
    if (!group || !live) return;
    setBusy("words");
    setFailure(null);
    const done = await patchGroup(group.id, { fromName: input.fromName, forName: input.forName, prompt: input.prompt || null });
    setBusy(null);
    if (!done.ok) return setFailure({ at: "words", text: wordsRefused(done.error, t("pageError")) });
    track("group_page_edited", { template: slug });
    setGroup(done.group);
    closeWords();
  };

  const dateOf = (iso: string | number) => new Intl.DateTimeFormat(locale, { day: "numeric", month: "long" }).format(new Date(iso));
  // A gift that is already out and never had a group has nothing to invite anyone to.
  if (live && status !== "draft" && loaded && !group && inCard.length === 0) return null;

  const waiting = group?.entries.filter((entry) => entry.status === "pending") ?? [];
  // Whoever took back a note that was already in the card: said for as long as the server still knows their name (a day).
  const tookBack = [...new Set((group?.entries ?? []).filter((entry) => entry.status === "withdrawn" && entry.key && entry.name).map((entry) => entry.name as string))];
  // Turned down or removed, and still inside the day Undo is given: the server says which (`canUndo`), by the same rule its route keeps.
  const decided = group?.entries.filter((entry) => (entry.status === "rejected" || entry.status === "removed") && entry.name && entry.canUndo) ?? [];
  const max = group?.max ?? manifest.features.group?.max ?? 25;
  const noteMax = group?.noteMax ?? manifest.features.group?.noteMax ?? 140;
  const full = inCard.length >= max;
  const sent = Boolean(group?.sentAt);
  const sharing = group ? t("shareText", { from: group.fromName, for: group.forName, url: group.url }) : "";
  // Where "Keep it open" would move the link's last day, and whether that is a whole 30 days on.
  const extend = group?.extendsTo ? { date: dateOf(group.extendsTo), full: !group.ranOut && Date.parse(group.extendsTo) - Date.parse(group.closesAt) >= GROUP_LIMITS.days * DAY } : null;

  // The card's own notes: drawn whenever the card holds any, with a group behind them or not (a
  // duplicated card carries its notes and no group, and they must still be seen, fixed and removed).
  const cardNotes = (
    <div>
      <h3 tabIndex={-1} className={cn("font-display text-xl", landing)} data-land="in-card-title" data-testid="group-in-card-title">
        {t("inCard", { n: inCard.length, max })}
      </h3>
      {tookBack.map((name) => (
        <p key={name} className="mt-1.5 text-sm text-ink-soft" data-testid="group-took-back">
          {t("tookBack", { name: isolated(name) })}
        </p>
      ))}
      {inCard.length === 0 ? <p className="mt-1.5 text-sm text-muted-foreground">{t("inCardEmpty")}</p> : null}
      <div className="mt-3 flex flex-col gap-3">
        <InCardList
          items={inCard}
          noteMax={noteMax}
          busyKey={busy}
          onMove={(from, to) => useEditor.getState().moveContribution(from, to)}
          onEdit={(key, value) => useEditor.getState().updateContribution(key, value)}
          onDropPhoto={(key) => useEditor.getState().updateContribution(key, { photo: null })}
          onRemove={(key) => void removeItem(key)}
          error={failure}
        />
        <AddOwn noteMax={noteMax} disabled={full} onAdd={(value) => useEditor.getState().addContribution({ key: ownKey(), ...value })} />
      </div>
    </div>
  );

  return (
    // Not inside the iPhone app: a group card is bought on the site, and the app sells nothing outside the App Store.
    <section ref={section} data-app-hide data-testid="group-section">
      <SectionHeader n={tS("n")} title={tS("title")} blurb={tS("blurb")} />
      {live && authed && giftId && !loaded ? (
        // Asking whether this gift already has a group: nothing to tap yet, and no jump when the answer
        // comes. If the asking fails, the panel says so and goes on asking; it never falls back to
        // "Invite people", which is only true of a card the server has said has no group.
        <div data-testid="group-loading">
          {readFailure === "unauthenticated" || readFailure === "unavailable" ? null : <div className="h-11 w-40 animate-pulse rounded-full bg-ink/5 motion-reduce:animate-none" aria-hidden="true" />}
          {readFailure ? (
            <p role="status" className={cn("text-sm text-ink-soft", readFailure === "unauthenticated" || readFailure === "unavailable" ? "flex min-h-11 items-center" : "mt-3")} data-testid="group-load-error">
              {readFailure === "unauthenticated" ? t("signedOut") : readFailure === "unavailable" ? t("unavailable") : t("loadError")}
            </p>
          ) : null}
        </div>
      ) : group ? (
        <div className="flex flex-col gap-7" data-testid="group-active">
          {sent ? (
            <p className="rounded-xl border border-border bg-card p-3.5 text-sm text-ink-soft" data-testid="group-sent">
              {t("sentLine")} {waiting.length > 0 && group.sentAt ? t("sentWaiting", { date: dateOf(Date.parse(group.sentAt) + GROUP_RETENTION.afterSentDays * DAY) }) : ""}
            </p>
          ) : (
            <div>
              <GroupLink url={group.url} shareText={sharing} state={group.closedAt ? "closed" : group.ranOut ? "ranOut" : "open"} onShared={(via) => track("group_link_shared", { template: slug, via })} />
              {editingWords ? (
                <div className="mt-3 rounded-2xl border border-border bg-card p-4">
                  <GroupSetup
                    fromName={group.fromName}
                    forName={group.forName}
                    prompt={group.prompt ?? ""}
                    busy={busy === "words"}
                    error={failed("words")}
                    onCreate={(input) => void saveWords(input)}
                    onCancel={() => {
                      setFailure(null);
                      closeWords();
                    }}
                  />
                </div>
              ) : (
                <PageWords
                  group={group}
                  onEdit={() => {
                    setEditingWords(true);
                    land("page-from");
                  }}
                />
              )}
            </div>
          )}

          <div>
            <h3 tabIndex={-1} className={cn("font-display text-xl", landing)} data-land="waiting-title" data-testid="group-waiting-title">
              {t("waiting", { n: waiting.length })}
            </h3>
            {/* What became of a note that is no longer in this list to say it on. */}
            <PanelError text={failed("waiting")} className="mt-1.5" />
            {/* Not under that line: "Gran has just taken that note back." followed by "Nobody has added a note yet." said two things that can't both be so. */}
            {waiting.length === 0 && decided.length === 0 && !failed("waiting") ? (
              <p className="mt-1.5 text-sm text-muted-foreground" data-testid="group-waiting-empty">
                {t("waitingEmpty")}
              </p>
            ) : null}
            <ul className="mt-3 flex flex-col gap-2">
              {waiting.map((entry) => (
                <WaitingEntry key={entry.id} entry={entry} busy={busy === entry.id} full={full} error={failed(entry.id)} onAdd={(withPhoto) => void add(entry, withPhoto)} onRemove={() => void decide(entry, "reject")} />
              ))}
              {decided.map((entry) => (
                <DecidedEntry key={entry.id} entry={entry} busy={busy === entry.id} error={failed(entry.id)} onUndo={() => void decide(entry, "restore")} />
              ))}
            </ul>
            {full && waiting.length > 0 ? <p className="mt-2 text-sm text-ink-soft">{t("full")}</p> : null}
          </div>

          {cardNotes}

          {sent ? null : (
            <LinkControls group={group} date={dateOf(group.closesAt)} extend={extend} busy={busy === "link"} error={failed("link")} onExtend={() => void change({ extend: true })} onToggle={() => void change({ closed: !group.closedAt })} onReset={() => void change({ resetLink: true })} />
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-7">
          {/* Inviting people starts from a draft; a card that is already out has only its notes to show. */}
          {status !== "draft" ? null : step === "guest" ? (
            <div tabIndex={-1} className={cn("rounded-xl border border-line bg-card p-5", landing)} data-land="guest" data-testid="group-guest">
              {/* Its own heading: the site's "Welcome back" greeted people making their first card. */}
              <AuthForm mode="login" next={`/create/${slug}`} compact title={t("guestTitle")} subtitle={t("guestLine")} />
              {/* The way back to the price, which this box replaced. */}
              <button
                type="button"
                onClick={() => {
                  setAsked("intro");
                  land("invite");
                }}
                className="mt-3 inline-flex min-h-11 items-center rounded-md text-sm text-ink-soft underline-offset-4 hover:text-ink hover:underline"
                data-testid="group-guest-cancel"
              >
                {t("guestCancel")}
              </button>
            </div>
          ) : step === "setup" ? (
            <GroupSetup fromName={senderName} forName={recipientName} busy={busy === "create"} error={failed("create")} onCreate={(input) => void create(input)} />
          ) : (
            <GroupIntro priceLine={priceLine} onInvite={invite} />
          )}
          {inCard.length > 0 ? cardNotes : null}
        </div>
      )}
    </section>
  );
}
