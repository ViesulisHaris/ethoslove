"use client";
/* eslint-disable @next/next/no-img-element */

import { useState, useTransition } from "react";
import { BarChart3, Copy, ExternalLink, MoreHorizontal, Pencil, QrCode, Trash2, Files } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { Link, useRouter } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import type { DashboardGift } from "@/lib/gift/dashboard";
import { getManifest } from "@/templates/manifests";
import { deleteGift, duplicateGift } from "@/app/actions/gift";
import { SITE } from "@/config/site";
import { cn } from "@/lib/utils";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export function GiftCard({ gift }: { gift: DashboardGift }) {
  const t = useTranslations("dashboard");
  const locale = useLocale() as GiftLocale;
  const router = useRouter();
  const [pending, start] = useTransition();
  const [confirm, setConfirm] = useState(false);
  const manifest = getManifest(gift.template_slug);
  const url = `${typeof window !== "undefined" ? window.location.origin : SITE.url}${SITE.giftPath}/${gift.short_id}`;
  const editHref = `/create/${gift.template_slug}?gift=${gift.id}`;

  const copy = async () => {
    await navigator.clipboard.writeText(url).catch(() => {});
    toast(t("copied"));
  };

  return (
    <article className="group flex flex-col overflow-hidden rounded-3xl border border-border bg-card shadow-soft transition-shadow hover:shadow-lift">
      <Link href={gift.status === "draft" ? editHref : `/dashboard/gift/${gift.id}`} className="relative aspect-[4/3] overflow-hidden bg-night">
        {gift.thumbnail ? <img src={gift.thumbnail} alt="" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]" /> : manifest ? <img src={manifest.thumbnail.poster} alt="" className="h-full w-full object-cover opacity-80" /> : null}
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-4 text-paper">
          <p className="text-[11px] tracking-[0.2em] uppercase opacity-70">{manifest?.name[locale] ?? gift.template_slug}</p>
          <p translate={gift.recipientName ? "no" : undefined} className="font-display text-2xl italic">{gift.recipientName || t("untitled")}</p>
        </div>
        <span className={cn("absolute top-3 left-3 rounded-full px-2.5 py-1 text-[11px] font-semibold tracking-wide uppercase", gift.status === "live" ? "bg-moss text-white" : gift.status === "scheduled" ? "bg-gold text-ink" : "bg-white/90 text-ink")}>
          {t(`status.${gift.status}`)}
        </span>
      </Link>
      <div className="flex items-center justify-between gap-3 px-4 py-3">
        <div className="flex gap-4 text-sm">
          <Stat label={t("opens")} value={gift.stats.opens} />
          <Stat label={t("viewers")} value={gift.stats.uniqueViewers} />
          <Stat label={t("reactions")} value={gift.stats.reactions} />
        </div>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" aria-label={t("actions")} disabled={pending}>
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-52">
            {gift.status !== "draft" ? (
              <>
                <DropdownMenuItem asChild><a href={url} target="_blank" rel="noopener"><ExternalLink className="size-4" />{t("open")}</a></DropdownMenuItem>
                <DropdownMenuItem onSelect={copy}><Copy className="size-4" />{t("copyLink")}</DropdownMenuItem>
                <DropdownMenuItem asChild><Link href={`/dashboard/gift/${gift.id}`}><BarChart3 className="size-4" />{t("stats")}</Link></DropdownMenuItem>
                <DropdownMenuItem asChild><Link href={`/dashboard/gift/${gift.id}/print`}><QrCode className="size-4" />{t("qrCard")}</Link></DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            ) : null}
            <DropdownMenuItem asChild><Link href={editHref}><Pencil className="size-4" />{t("edit")}</Link></DropdownMenuItem>
            <DropdownMenuItem onSelect={() => start(async () => { const r = await duplicateGift(gift.id); if (r.ok) { toast(t("duplicated")); router.refresh(); } })}><Files className="size-4" />{t("duplicate")}</DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={() => setConfirm(true)} className="text-destructive"><Trash2 className="size-4" />{t("delete")}</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <Dialog open={confirm} onOpenChange={setConfirm}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{t("deleteTitle")}</DialogTitle>
            <DialogDescription>{t("deleteBlurb")}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(false)}>{t("cancel")}</Button>
            <Button variant="destructive" disabled={pending} onClick={() => start(async () => { const r = await deleteGift(gift.id); setConfirm(false); if (r.ok) { toast(t("deleted")); router.refresh(); } })}>{t("delete")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </article>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <span className="flex flex-col leading-tight">
      <span className="font-semibold tabular-nums">{value}</span>
      <span className="text-[11px] text-muted-foreground">{label}</span>
    </span>
  );
}
