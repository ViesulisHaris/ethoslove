"use client";

import { ChevronDown, Lock, Route } from "lucide-react";
import { useTranslations } from "next-intl";
import { DropdownMenu } from "radix-ui";
import { track } from "@/lib/analytics/track";
import { mapsRouteUrl, type MapsProvider } from "@/lib/dates/maps-route";
import type { LatLng } from "@/lib/dates/geo";
import { cn } from "@/lib/utils";

const PROVIDERS: MapsProvider[] = ["google", "apple"];

/**
 * The whole date, every stop in order, in Google Maps or Apple Maps: for members. Anyone else sees
 * the same button with a lock, which opens the sheet that says what it takes. Each stop's own
 * "Directions" stays free for everybody.
 */
export function MapsMenu({ stops, member, onLocked, className }: { stops: LatLng[]; member: boolean; onLocked: () => void; className?: string }) {
  const t = useTranslations("savedDates.maps");
  if (stops.length < 2) return null;
  const button = cn("inline-flex h-12 w-full items-center justify-center gap-2 rounded-full bg-white px-5 text-[14.5px] font-semibold text-forest shadow-soft ring-1 ring-forest/10 transition-colors hover:bg-rose-mist", className);

  if (!member)
    return (
      <button type="button" onClick={onLocked} className={button} data-testid="maps-locked">
        <Route aria-hidden="true" className="size-4 text-rose-deep" />
        {t("cta")}
        <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-dusk px-2 py-0.5 text-[11px] font-semibold text-starlight">
          <Lock aria-hidden="true" className="size-3" />
          <span className="max-[380px]:sr-only">{t("locked")}</span>
        </span>
      </button>
    );

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger asChild>
        <button type="button" aria-label={t("label")} className={button} data-testid="maps-menu">
          <Route aria-hidden="true" className="size-4 text-rose-deep" />
          {t("cta")}
          <ChevronDown aria-hidden="true" className="size-4 text-forest/50" />
        </button>
      </DropdownMenu.Trigger>
      <DropdownMenu.Portal>
        <DropdownMenu.Content align="center" sideOffset={6} className="z-[70] min-w-[var(--radix-dropdown-menu-trigger-width)] rounded-2xl bg-white p-1.5 text-forest shadow-lift ring-1 ring-forest/10 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95">
          {PROVIDERS.map((provider) => (
            <DropdownMenu.Item key={provider} asChild>
              <a
                href={mapsRouteUrl(stops, provider) ?? undefined}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => track("maps_opened", { provider })}
                className="flex min-h-11 cursor-pointer items-center rounded-xl px-3.5 text-[14.5px] font-semibold outline-none data-[highlighted]:bg-rose-mist"
              >
                {t(provider)}
              </a>
            </DropdownMenu.Item>
          ))}
        </DropdownMenu.Content>
      </DropdownMenu.Portal>
    </DropdownMenu.Root>
  );
}
