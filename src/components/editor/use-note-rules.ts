"use client";

import { useEffect, useState } from "react";
import { useLocale } from "next-intl";
import { getEntitlement } from "@/app/actions/gift";
import { useEditor } from "@/lib/editor/store";
import { FREE_NOTE_MAX_CHARS, noteCanBeFree, noteRules } from "@/lib/gift/free-tier";
import { PRODUCTS, formatAmount } from "@/lib/pricing/products";
import { useCurrency } from "@/lib/pricing/use-currency";

/** One question per account and template, however many parts of the editor ask it. */
const owned = new Map<string, Promise<boolean>>();

/**
 * Whether the gift in the editor is a Letter whose free version is the short note
 * (lib/gift/free-tier.ts), for the parts of the form that say so before the send screen does: the
 * letter's counter and the line under the photos. A sender who already owns the template's extras
 * is told nothing: for them it is all included.
 */
export function useNoteRules(): { note: boolean; /** False for a gift made of photos: held to the rules, it has no free version. */ free: boolean; max: number; price: string } {
  const manifest = useEditor((s) => s.manifest);
  // The store holds no gift until it has loaded.
  const freeTier = useEditor((s) => s.data?.freeTier);
  const authed = useEditor((s) => s.authed);
  const userId = useEditor((s) => s.userId);
  const slug = useEditor((s) => s.slug);
  const currency = useCurrency();
  const locale = useLocale();
  const held = manifest !== null && noteRules(manifest, { freeTier });
  const [unlocked, setUnlocked] = useState(false);

  useEffect(() => {
    if (!held || !authed || !userId) return;
    const key = `${userId}:${slug}`;
    let asked = owned.get(key);
    if (!asked) {
      asked = getEntitlement(slug)
        .then((entitlement) => entitlement.unlocked)
        .catch(() => false);
      owned.set(key, asked);
    }
    let live = true;
    void asked.then((value) => {
      if (live) setUnlocked(value);
    });
    return () => {
      live = false;
    };
  }, [held, authed, userId, slug]);

  return {
    note: held && !(authed && unlocked),
    free: manifest !== null && noteCanBeFree(manifest),
    max: FREE_NOTE_MAX_CHARS,
    price: formatAmount(PRODUCTS.extras.amounts[currency], currency, locale),
  };
}
