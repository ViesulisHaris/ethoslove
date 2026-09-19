"use client";

import { useState } from "react";
import { Loader2, Sparkles } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { toast } from "sonner";
import { OCCASIONS } from "@/config/occasions";
import { useEditor } from "@/lib/editor/store";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Field } from "./field";

export function WritingHelper({ open, onOpenChange, onUse }: { open: boolean; onOpenChange: (v: boolean) => void; onUse: (text: string) => void }) {
  const t = useTranslations();
  const locale = useLocale();
  const data = useEditor((s) => s.data);
  const [occasion, setOccasion] = useState<string>("just-because");
  const [relationship, setRelationship] = useState("");
  const [facts, setFacts] = useState("");
  const [drafts, setDrafts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/write", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ occasion, relationship, facts, locale, recipientName: data.recipientName, senderName: data.senderName }),
      });
      const json = (await res.json()) as { drafts?: string[]; error?: string };
      if (res.status === 401) throw new Error("unauthenticated");
      if (!res.ok || !json.drafts) throw new Error(json.error ?? "failed");
      setDrafts(json.drafts);
    } catch (e) {
      toast.error((e as Error).message === "unauthenticated" ? t("editor.writer.signIn") : t("editor.writer.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto sm:max-w-xl">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">{t("editor.writer.title")}</DialogTitle>
          <DialogDescription>{t("editor.writer.blurb")}</DialogDescription>
        </DialogHeader>
        <div className="grid gap-4">
          <Field label={t("editor.writer.occasion")}>
            <Select value={occasion} onValueChange={setOccasion}>
              <SelectTrigger className="h-11 w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {OCCASIONS.map((o) => (
                  <SelectItem key={o} value={o}>
                    {t(`occasions.${o}`)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>
          <Field id="relationship" label={t("editor.writer.relationship")}>
            <Input id="relationship" value={relationship} onChange={(e) => setRelationship(e.target.value)} placeholder={t("editor.writer.relationshipPlaceholder")} className="h-11" />
          </Field>
          <Field id="facts" label={t("editor.writer.facts")} help={t("editor.writer.factsHelp")}>
            <Textarea id="facts" value={facts} onChange={(e) => setFacts(e.target.value)} rows={4} placeholder={t("editor.writer.factsPlaceholder")} />
          </Field>
          <Button onClick={generate} disabled={loading || facts.trim().length < 10} className="h-11 rounded-full">
            {loading ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />}
            <span>{t("editor.writer.generate")}</span>
          </Button>
          {drafts.length > 0 ? (
            <div className="grid gap-3">
              {drafts.map((d, i) => (
                <div key={i} className="rounded-xl border border-border bg-card p-4">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{d}</p>
                  <Button variant="outline" size="sm" className="mt-3 rounded-full" onClick={() => { onUse(d); onOpenChange(false); }}>
                    {t("editor.writer.use")}
                  </Button>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}
