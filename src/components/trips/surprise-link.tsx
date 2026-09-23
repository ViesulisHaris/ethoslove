"use client";

import type { ReactNode } from "react";
import { useLocale } from "next-intl";
import { Link } from "@/i18n/navigation";
import { saveGiftSeed } from "@/lib/editor/gift-seed";
import { fromFields, readLastFrom } from "@/lib/trips/last-from";

type Props = { slug: string; fields: Record<string, unknown>; className?: string; children: ReactNode };

/**
 * A plain link to the gift editor that leaves the trip behind for it first: the destination, the
 * stops and the nights, worked out on the server, plus where they last flew from, which only this
 * browser knows. Written just before the click navigates, so it is always this trip's. A road
 * trip already starts where its road does (tripGiftFields), and their home airport isn't that.
 */
export function SurpriseLink({ slug, fields, className, children }: Props) {
  const locale = useLocale() === "es" ? "es" : "en";
  const remember = () => {
    const from = fields.trip === "road" ? null : readLastFrom();
    saveGiftSeed({ slug, fields: from ? { ...fields, ...fromFields(from, locale) } : fields });
  };
  return (
    <Link href={`/create/${slug}`} onClick={remember} className={className} data-testid="make-surprise">
      {children}
    </Link>
  );
}
