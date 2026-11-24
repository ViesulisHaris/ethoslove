"use client";

import { useSyncExternalStore } from "react";
import { Printer } from "lucide-react";
import { Link } from "@/i18n/navigation";
import { track } from "@/lib/analytics/track";
import { rememberedQrDesign } from "@/lib/qr/remember";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export type TreeTagWords = { title: string; line: string; print: string; label: string };

/**
 * The Tree Tag, offered once, where the gift is shared: on the share screen under the ways to send it
 * (above the QR card, so it is seen without scrolling), and on
 * the gift's page in the dashboard. Only for a gift that came with it (lib/lifecycle/holiday-extras.ts);
 * the print page asks again. The words come in as props, so the dashboard (a server page) and the
 * editor (its own messages) both hand over theirs. Never inside the iPhone app. With `rememberFor` (the
 * dashboard, whose link carries no design), the code design last chosen for this gift on the share screen
 * in this browser is added after mount, so both places print the same code.
 */
export function TreeTagRow({ href, words, place, className = "mt-4", rememberFor }: { href: string; words: TreeTagWords; place: "share" | "dashboard"; className?: string; rememberFor?: string }) {
  // "" on the server and in the first paint, so the link hydrates as rendered; then this browser's kept design.
  const design = useSyncExternalStore(
    onStorage,
    () => (rememberFor ? rememberedQrDesign(rememberFor) : ""),
    () => "",
  );
  const to = design ? `${href}${href.includes("?") ? "&" : "?"}${design}` : href;
  return (
    <section data-app-hide data-testid="tree-tag-row" className={cn("rounded-2xl border border-border bg-card p-4", className)}>
      <div className="flex items-start gap-3.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/art/occasions/christmas.webp" alt="" width={44} height={44} className="size-11 shrink-0" />
        <div className="min-w-0">
          <p className="text-eyebrow text-coral">{words.label}</p>
          <p className="font-display mt-1 text-lg leading-snug">{words.title}</p>
          <p className="mt-1 text-sm text-muted-foreground">{words.line}</p>
        </div>
      </div>
      <Button asChild variant="outline" className="mt-4 h-11 w-full rounded-full">
        <Link href={to} onClick={() => track("tree_tag_print_opened", { place })}>
          <Printer className="size-4" aria-hidden />
          {words.print}
        </Link>
      </Button>
    </section>
  );
}

function onStorage(changed: () => void) {
  window.addEventListener("storage", changed);
  return () => window.removeEventListener("storage", changed);
}
