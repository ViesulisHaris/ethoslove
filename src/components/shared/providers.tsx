"use client";

// First, before anything renders: a translated page must not be able to crash the app.
import "@/lib/dom/survive-translation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <TooltipProvider delayDuration={200}>
      {children}
      <Toaster position="bottom-center" richColors closeButton />
    </TooltipProvider>
  );
}
