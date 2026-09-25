"use client";

import { useEffect, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { getSavedDate } from "@/lib/saved-dates/client";
import { readLink, writeLink } from "@/lib/saved-dates/link";
import { linkFor, planKey } from "@/lib/saved-dates/sync";
import type { SavedDate } from "@/lib/saved-dates/types";
import { readPlan, type Plan } from "@/lib/dates/plan";
import { currentPlan } from "@/components/dates/use-plan";
import { useSessionKey } from "./use-saved-account";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type OpenedSaved =
  | { state: "none" }
  | { state: "opening" }
  /** Theirs, but past the free few that stay editable: shown like a plan that came in a link, and not linked. */
  | { state: "readOnly"; saved: SavedDate }
  | { state: "signIn"; id: string }
  | { state: "notFound" }
  | { state: "failed" };

/** The link's `#s=…` goes once the date is open: a reload then shows the plan, not the opening again. */
function dropHash() {
  window.history.replaceState(window.history.state, "", window.location.pathname + window.location.search);
  // replaceState fires no hashchange, so the page is told by hand.
  window.dispatchEvent(new HashChangeEvent("hashchange"));
}

/**
 * `/plan#s=<id>`: a saved date opened from My dates or its reminder email. A hash, like `#p=`, so
 * /plan stays one static page. The date is written into the plan on this device and linked, so what
 * is changed here is saved back. If what is on this device is a plan nobody has saved, they are
 * asked first, as "Keep this plan" asks.
 */
export function useOpenSavedDate(hash: string, { confirmReplace, replacePlan }: { confirmReplace: () => boolean; replacePlan: (plan: Plan) => void }): OpenedSaved {
  const router = useRouter();
  // A new session asks again: "sign in to open this date" opens it once they have.
  const session = useSessionKey();
  const id = hash.startsWith("#s=") ? hash.slice(3) : null;
  const [answer, setAnswer] = useState<{ key: string; opened: OpenedSaved } | null>(null);
  const key = `${hash}|${session}`;

  const valid = id !== null && UUID.test(id);
  useEffect(() => {
    if (!id || !valid) return;
    let live = true;
    const settle = (opened: OpenedSaved) => live && setAnswer({ key, opened });
    void (async () => {
      const res = await getSavedDate(id);
      if (!live) return;
      if (!res.ok) return settle(res.error === "unauthenticated" ? { state: "signIn", id } : res.error === "not_found" ? { state: "notFound" } : { state: "failed" });
      const saved = res.savedDate;
      if (saved.kind === "trip") {
        router.replace(`/trips/${"tripId" in saved.data ? saved.data.tripId : ""}`);
        return;
      }
      if (!saved.editable) return settle({ state: "readOnly", saved });
      const plan = readPlan(saved.data);
      if (!plan) return settle({ state: "failed" });
      const linked = readLink();
      if (linked?.id !== saved.id) {
        const here = currentPlan();
        const hereKey = planKey(here);
        const unsaved = here.stops.length > 0 && (!linked || hereKey !== linked.synced) && hereKey !== planKey(plan);
        if (unsaved && !confirmReplace()) return dropHash();
        writeLink(linkFor(saved));
        replacePlan(plan);
      }
      // Already the date on this device: its own changes stay, and the sync carries on with them.
      dropHash();
    })();
    return () => {
      live = false;
    };
    // `confirmReplace`, `replacePlan` and the router act on the answer, they don't ask for another.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, id, valid]);

  if (!id) return { state: "none" };
  if (!valid) return { state: "notFound" };
  return answer?.key === key ? answer.opened : { state: "opening" };
}
