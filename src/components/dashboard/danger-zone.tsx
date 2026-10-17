"use client";

import { useState, useTransition } from "react";
import { Download, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";
import { toast } from "sonner";
import { useRouter } from "@/i18n/navigation";
import { deleteAccount } from "@/app/actions/account";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

/**
 * Export and delete. Someone who pays for Ethos for Two is told before deleting what happens to it:
 * a web subscription is cancelled at once with the account (the time left isn't refunded), an App
 * Store one only Apple can stop. When Stripe can't be reached nothing is deleted, and they're told so.
 */
export function DangerZone({ email, billed = null }: { email: string; billed?: "stripe" | "app_store" | null }) {
  const t = useTranslations("account");
  const tCommon = useTranslations("common");
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, start] = useTransition();
  const remove = () =>
    start(async () => {
      const r = await deleteAccount();
      if (r.ok) {
        router.push("/");
        router.refresh();
        return;
      }
      toast.error(r.error === "subscription_cancel_failed" ? t("deleteSubscriptionFailed") : t("deleteFailed"));
    });
  return (
    <section className="mt-8 rounded-2xl border border-destructive/30 bg-destructive/[0.03] p-6">
      <h2 className="font-display text-xl">{t("danger")}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{t("dangerBlurb")}</p>
      {billed ? <p className="mt-2 text-sm text-ink" data-testid="danger-membership">{billed === "stripe" ? t("dangerSubscription") : t("dangerAppStore")}</p> : null}
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
          {billed ? <p className="text-sm text-ink">{billed === "stripe" ? t("dangerSubscription") : t("dangerAppStore")}</p> : null}
          <Input value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={email} className="h-11" />
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>{t("cancel")}</Button>
            <Button variant="destructive" disabled={typed !== email || pending} onClick={remove}>{t("deleteForever")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </section>
  );
}
