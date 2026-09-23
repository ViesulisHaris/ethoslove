# QA fixes still open

The QA pass on the production build (September 2026) was fixed in four groups: Q1a and Q1b (Dates,
Plan, Long distance), Q2 (games) and Q3 (marketing, gifts, fonts). This file lists what is still
open after the final check. Every Q1a↔Q1b hand-off in the dates and long-distance code has been
applied. What is left:

- **Section 1:** changes that touch files the commerce and legal work owned during the pass.
- **Section 2:** changes outside the dates and long-distance code that the owning groups handed on.
- **Section 3:** problems that need data, assets or a design decision rather than code.

Each exact change is quoted from the group that found it. Line numbers are from the day of the pass.

## 1. Files on the do-not-edit list

| Finding | File | Exact change |
|---|---|---|
| Q2 #17 Small tap targets on phones: footer links are 28 px tall | `src/components/marketing/footer.tsx` | FooterLink and the Contact link: change `py-1` to `py-2.5 md:py-1`. FooterColumn list: change `gap-1.5` to `gap-0 md:gap-1.5`. LocaleSwitcher: change `h-8` to `h-10`. |
| Q2 #21 Hub: the pink button shows through the header (same Safari bug in a template) | `src/templates/the-letter/letter.module.css` (~lines 496–497) | Put `-webkit-backdrop-filter` above `backdrop-filter`. Only in that order does Lightning CSS (the minifier) keep both, as `globals.css` now does. |
| Q3 #5 Every page's HTML carries the entire translation file | pricing, checkout, redeem, for-two and creators pages; `src/i18n/client-namespaces.ts` | Give each of those pages a `layout.tsx` that wraps its children in `<ClientMessages scope="(marketing)/<dir>/layout">`, and add those scopes to `client-namespaces.ts`. Then remove `pricing`, `money`, `forTwo` and `auth` from `"(marketing)/layout"`. That is about 14 KB off every other marketing page. |
| Q3 #4 Home hero jumps because the H1's width is measured in the fallback font | `src/app/[locale]/(marketing)/creators/page.tsx:63` | `max-w-[13ch]` → `max-w-[7.8em]` (N ch becomes N×0.6 em). |
| Q3 #18 zod ships to the browser | `src/components/pricing/entitlements.ts` | zod still ships on `/games/{rather,dare,know,deck}`, `/pricing`, `/redeem` and `/for-two/join`, through `components/games/use-packs.ts` → `entitlements.ts`. Replace `passSchema`/`entitlementsSchema` with a hand-written `parseEntitlements` guard and plain types, as `src/lib/dates/plan.ts` now does. |
| Q3 #20 Halloween and Christmas pages promote templates they don't list (optional) | `src/templates/fireside/manifest.ts`, `src/templates/midnight-countdown/manifest.ts` | Add `halloween` to Fireside's occasions and `christmas` to Midnight Countdown's, if they should be listed there. The intro copy could then name them again. |
| Q3 #9 Demo top bar buttons are small on phones | `src/components/gift/demo-stage.tsx:34` | Below 360 px the Back link is only about 30 px wide, because its label becomes `sr-only`. Suggested fix (not from the report): give the link `min-w-11 justify-center`. |
| Q3 #9: decision needed | `src/components/gift/demo-stage.tsx` | Q3 edited this file (class names only, for the 44 px demo bar) although `src/components/gift/**` was off limits. Its brief did assign it the demo chrome. Keep it, or revert it if the commerce team owns that file. |

## 2. Outside the dates and long-distance code (not on the list; left for their owners)

| Finding | File | Exact change |
|---|---|---|
| Q1b #32 English accessibility labels on Spanish pages | `src/components/marketing/header.tsx:63, 109` | Replace `aria-label="Primary"` and `aria-label="Mobile"` with translated keys, in a namespace every route already sends (see `src/i18n/client-namespaces.ts` and the `client-messages` test). |
| Q1b #32 (same) | `src/components/ui/sheet.tsx` | Add a `closeLabel` prop for the built-in close button's screen-reader text, and pass the translated "Close" from the header's menu sheet. |
| Q1b #32 (same: "Notifications alt+T") | `src/components/shared/providers.tsx` / `src/components/ui/sonner.tsx` | Set the Toaster's `containerAriaLabel` and `toastOptions.closeButtonAriaLabel` from `common.*` keys. |
| Q1b #14 The map is slow to open on phones | `src/components/trips/route-map.tsx:71` | Call `preloadMapLibre()` and use `loadMapStyle()` from `@/lib/dates/map-vendor`, so the trips map downloads MapLibre's two files and the style in parallel, as the Dates map does. |
| Q1b #26 Phones download the 1800 px photos | `src/components/marketing/platform/platform-hero.tsx:144` (gifts hero) | `sizes="(min-width: 1024px) 476px, 88vw"` → `sizes={heroSizes("(min-width: 1024px) 476px")}`. This saves nothing for the portrait home hero at line 71: its smaller file is 675 px. |
| Q3 #4 Hero jump from `ch` widths | `src/app/[locale]/(marketing)/games/page.tsx:34`, `trips/page.tsx:74`, `trips/[id]/page.tsx:107` | `max-w-[12ch]` → `max-w-[7.2em]`, `max-w-[12ch]` → `max-w-[7.2em]`, `max-w-[16ch]` → `max-w-[9.6em]`. The Long-distance and city pages are done. |
| Q3 #16 Button wrapping on phones | `src/components/marketing/platform/bands.tsx:22` | The Long-distance button wraps at 320 px: `px-7` → `px-5 sm:px-7 text-center leading-tight`. |
| Q3 #18 zod ships to the browser | `src/lib/lifecycle/reminders.ts`, `src/components/reminders/reminder-list.tsx` | `/account/reminders` gets zod through `reminder-list.tsx` → `reminders.ts`. Move its zod schemas to a server-only file and give the client plain types. |

## 3. Not fixable in code

| Finding | What it needs |
|---|---|
| Q1a #1 Tokyo can't be found (Brooklyn part) | Brooklyn, New York is missing from Photon's data. It needs a fix upstream, or a built-in entry for it. |
| Q1a #0 "No town by that name" when the geocoder is slow (Spanish part) | Photon rejects `lang=es`, so Spanish searches get local names. The built-in cities cover the big ones. |
| Q1a #13 Men-only saunas suggested for couples | Venues with no tags saying so (for example Covent Garden Health Spa) need `lgbtq:men=only` or `access`/`female`/`male` tags added on OpenStreetMap. |
| Q3 #4 Hero jump at 1280 px and wider | The fallback font is wider than Newsreader at display size. This needs a design call: a tuned fallback font (`size-adjust`), or `display: "optional"`. |
| Q3 #19 Template posters and preview videos shown on /es are English-only | The posters and videos need re-capturing in Spanish. The autumn Fireside poster on the Christmas page needs a seasonal one. |
| Q1b #26 /dates idea images are 960×720 in 184×236 boxes | A 1200 px hero and smaller idea images can only be offered once those files exist. That is an asset task. |

## Optional follow-ups in the dates code

- **Q1a #4 Idea stops far apart.** A boat hire or a beach picked 6–8 km out still gets a second stop more than a walk away, because places are only loaded 1.5 km around the search. The panel and the plan now show the distance ("4.5 km") instead of an impossible walk. The full fix is a small extra search around a far first stop, fed only to `fillStops`. It also needs a way to open those places, which are in neither the list nor the map.
- **Q1b #12 Back leaves /dates (edge case).** Suppose someone leaves /dates while the phone's map or a place sheet is open, then comes back. One Back press then does nothing, because the page's history entry for that layer is still there.
