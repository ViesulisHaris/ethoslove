import { createNavigation } from "next-intl/navigation";
import type { Currency } from "@/lib/pricing/products";
import { LOCALES } from "./locales";
import { routing } from "./routing";

const navigation = createNavigation(routing);

export const { Link, redirect, useRouter, getPathname } = navigation;

const CURRENCY_SEGMENTS = ["usd", "eur", "gbp"] as const satisfies readonly Currency[];
const INSIDE_PREFIX = new RegExp(`^/(?:${CURRENCY_SEGMENTS.join("|")})/(?:${LOCALES.join("|")})(?=/|$)`);

/**
 * The path as the address bar shows it, without the language: "/occasions" on /occasions and on
 * /es/occasions. A page built ahead of time (a static or hourly page) is drawn on the server at the
 * path inside the app, with the hidden currency and the language in front (/usd/en/occasions,
 * src/proxy.ts), while the browser reads the address it was given. Anything drawn from the path,
 * the room marked in the bar or the button docked on /occasions and /gifts, then came out one way in
 * the HTML and another in the browser: React error #418 on those pages. Both now read the same path.
 */
export function publicPathname(pathname: string): string {
  const bare = pathname.replace(INSIDE_PREFIX, "");
  return bare === "" ? "/" : bare;
}

export function usePathname(): string {
  return publicPathname(navigation.usePathname());
}
