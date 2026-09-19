"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export function ShareBox({ url }: { url: string }) {
  const t = useTranslations("dashboard");
  const [copied, setCopied] = useState(false);
  return (
    <div className="mt-3 flex items-center gap-2 rounded-xl border border-border bg-paper p-1.5 pl-3">
      <span className="min-w-0 flex-1 truncate font-mono text-xs">{url.replace(/^https?:\/\//, "")}</span>
      <Button size="sm" className="rounded-full" onClick={async () => { await navigator.clipboard.writeText(url).catch(() => {}); setCopied(true); setTimeout(() => setCopied(false), 1500); }}>
        {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
        <span>{copied ? t("copied") : t("copyLink")}</span>
      </Button>
    </div>
  );
}
