"use client";

import { useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { FreeTermsBox } from "@/components/editor/free-terms-box";
import { cn } from "@/lib/utils";

/**
 * Development only: the free version's Terms box over a send button, wired as the send sheet wires
 * them (components/editor/publish-sheet.tsx), without publishing anything: "sent" appears instead.
 */
export function TermsPreview() {
  const t = useTranslations("editor.publishSheet");
  const [on, setOn] = useState(false);
  const [nudge, setNudge] = useState(false);
  const [sent, setSent] = useState(false);
  const ref = useRef<HTMLInputElement>(null);
  return (
    <div>
      <FreeTermsBox
        checked={on}
        onChange={(v) => {
          setOn(v);
          if (v) setNudge(false);
        }}
        nudge={nudge}
        inputRef={ref}
      />
      <Button
        className={cn("mt-4 h-12 w-full rounded-full text-base", !on && "opacity-50")}
        aria-disabled={!on || undefined}
        aria-describedby={nudge ? "free-terms-nudge" : undefined}
        onClick={() => {
          if (!on) {
            setNudge(true);
            ref.current?.focus();
            return;
          }
          setSent(true);
        }}
        data-testid="terms-send"
      >
        <span>{t("publishNow")}</span>
      </Button>
      {sent ? (
        <p className="mt-3 text-center text-xs text-muted-foreground" data-testid="terms-sent">
          sent
        </p>
      ) : null}
    </div>
  );
}
