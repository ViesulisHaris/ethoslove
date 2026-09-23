# QA fixes still open

The QA pass on the production build (September 2026) was fixed in four groups: Q1a and Q1b (Dates,
Plan, Long distance), Q2 (games) and Q3 (marketing, gifts, fonts). Every code change the groups
handed on has since been applied, including the ones in files that were off limits during the pass.
Q3 #20 (tagging Fireside for Halloween and Midnight Countdown for Christmas) was declined: those
templates don't fit those holidays.

What is left needs data, assets or a design decision rather than code, plus two optional follow-ups
in the dates code. Line numbers are from the day of the pass.

## Not fixable in code

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
