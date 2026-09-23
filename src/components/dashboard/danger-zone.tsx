"use client";

import { useState, useTransition } from "react";
import { Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { deleteAccount } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

export function DangerZone({ email }: { email: string }) {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  return (
    <section className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-6">
      <h2 className="font-display text-xl">{t("danger")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("dangerBlurb")}</p>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button variant="outline" className="rounded-full" onClick={() => window.open("/api/account/export", "_blank", "noopener")}><Download className="size-4" />{t("export")}</Button>
        <Button variant="destructive" className="rounded-full" onClick={() => setOpen(true)}><Trash2 className="size-4" />{t("deleteAccount")}</Button>
      </div>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent closeLabel={tCommon("close")}>
          <DialogHeader>
            <DialogTitle className="font-display text-2xl">{t("deleteAccount")}</DialogTitle>
            <DialogDescription>{t("deleteConfirm", { email })}</DialogDescription>
          </DialogHeader>
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={email} className="h-11" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button variant="destructive" disabled={typed !== email || pending} onClick={() => start(async () => { const r = await deleteAccount(); if (r.ok) { router.push("/"); router.refresh(); } })}>{t("deleteForever")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
