"use client";

import { Suspense } from "react";
import { useTranslations } from "next-intl";
import { AuthForm } from "@/components/auth/auth-form";
import { BottomSheet } from "./bottom-sheet";

/**
 * "Sign in to save your date", over the page they are on, so the plan they made (which is in this
 * browser, not in the page) is still there when they come back. `next` brings them back to it; the
 * caller has already noted what to save once they do (rememberSaveAfterSignIn).
 */
export function SignInDialog({ open, onOpenChange, next, title, sub }: { open: boolean; onOpenChange: (open: boolean) => void; next: string; title: string; sub: string }) {
  const tc = useTranslations("common");
  return (
    <BottomSheet open={open} onOpenChange={onOpenChange} title={title} description={sub} closeLabel={tc("close")} testId="saved-dates-sign-in">
      <div className="mt-5 rounded-[22px] bg-white p-5 shadow-soft ring-1 ring-forest/5">
        {/* The form reads the address's ?next and ?error, which a static page only knows in the browser. */}
        <Suspense fallback={<div className="h-40 animate-pulse rounded-2xl bg-forest/5" />}>
          <AuthForm mode="login" next={next} compact />
        </Suspense>
      </div>
    </BottomSheet>
  );
}
