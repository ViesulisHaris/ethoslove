# Ethos sender and recipient flows: a friction audit and zero-step brand insertion map

Scope: the Ethos repository at /home/user/ethoslove (read only), audited 1 November 2026. Every repo fact is cited as `[path:line]`. Paths are repo-relative. "Fact" bullets are what the code or docs say. "Inferences" are my reading of them. The last section, "Implications for Ethos", is interpretation only and is kept apart from the facts.

Two caveats apply throughout:
- **Code, not production.** I read source code and docs. I did not run the app, open a real gift or load a checkout. Whether a given file is what tryethos.io serves today is not stated anywhere I could find (see Gaps under Q1).
- **No git dates.** The git history is squashed: the oldest reachable commit is a merge dated 2026-10-26. So I could not date when the keep page, the envelope preview card or the sound gate were added.

---

## Q1. Sender flow, step by step: screens, taps, required fields, where payment sits, what checkout and the success screen show, and measured drop-off

### Takeaway
The whole gift is made first and payment comes only at "Publish". A signed-in maker of a free gift reaches a shareable link in about 3 taps after the editor. A guest needs a sign-in loop (email, then a magic link or 6-digit code) for a free gift, or a Stripe checkout for a paid one, where the email given at checkout creates the account. Checkout is already headed "Ethos" and the charge already carries `ETHOS` on the statement. Receipts, the Apple Pay sheet and the one-tap wallet path still show the shared Stripe account's name. The only measured funnel figures in the docs date from 23 September 2026.

### Cited Findings

**Landing to editor**
- The home page leads with gifts for visitors arriving from social refs (`PlatformHero variant={hero}`, gallery strip straight after the hero) — [src/app/[currency]/[locale]/(marketing)/page.tsx:22-45](src/app/[currency]/[locale]/(marketing)/page.tsx)
- Each template card has a primary "Make this gift" ("Crear regalo") link to `/create/<slug>`, a "Details" link and the price tag "Free" or "{price} once" — [src/components/templates/template-card.tsx:161-170](src/components/templates/template-card.tsx); strings [messages/en.json:825](messages/en.json)
- The template page has a "Make this gift" button to `/create/<slug>` and a "full-screen demo" button — [src/app/[currency]/[locale]/(marketing)/templates/[slug]/page.tsx:129-145](src/app/[currency]/[locale]/(marketing)/templates/[slug]/page.tsx)
- So: 1 tap from a card to the editor, or 2 taps through "Details" (inference from the links above).

**In the editor (all free to use)**
- `editor_opened` is tracked on mount — [src/components/editor/editor-shell.tsx:92-94](src/components/editor/editor-shell.tsx)
- Sections, in order: Who, Words, Unwrap, Photos, Music (if the template has it), Video (if it has it), Voice, Look, Extras — [src/components/editor/editor-shell.tsx:159-175](src/components/editor/editor-shell.tsx)
- Fields every template requires at publish: recipient name, sender name, message, the template's minimum photos and its own must-have fields — [src/lib/gift/publish.ts:85-98](src/lib/gift/publish.ts). The Letter needs at least 1 photo; Constellations at least 3 — [src/templates/the-letter/manifest.ts:23](src/templates/the-letter/manifest.ts), [src/templates/constellations/manifest.ts:23](src/templates/constellations/manifest.ts)
- "Title" is optional and is labelled "Optional. Shown on some templates and in the link preview." — `editor.fields.titleHelp` in [messages/en.json](messages/en.json)
- A blank gift starts with `watermark: true`, `showReactionCta: true` and the template's default cover — [src/components/editor/editor-shell.tsx:48-72](src/components/editor/editor-shell.tsx)
- The Extras section's footer switch reads "Remove the “Made with Ethos” footer" ("Quitar el pie «Hecho con Ethos»") — [src/components/editor/sections/extras.tsx:181](src/components/editor/sections/extras.tsx); `editor.extras.removeWatermark` in messages/en.json and es.json

**The publish sheet**
- The top bar's Publish opens the sheet, and `publish_sheet_shown` is tracked with tier and guest — [src/components/editor/publish-sheet.tsx:108-110](src/components/editor/publish-sheet.tsx)
- The sheet is titled "Ready to send?" ("¿Listo para enviarlo?") with "Here's what {name} will get." and a checklist ("Add their name", "Add your name", "Write a message", "Add a photo"…) — [src/components/editor/publish-sheet.tsx:353-392](src/components/editor/publish-sheet.tsx); `editor.publishSheet` in messages
- Payment is needed for a premium template (unless it is a free reply or a campaign), removing the footer, scheduling, a password, or premium extras — [src/lib/gift/publish.ts:36-41](src/lib/gift/publish.ts); [src/components/editor/publish-sheet.tsx:300-307](src/components/editor/publish-sheet.tsx)
- A free gift by a guest gets "Sign in to publish" with "Your draft is saved on this device. Sign in and we'll pick up right here." — [src/components/editor/publish-sheet.tsx:448-458](src/components/editor/publish-sheet.tsx); strings in messages/en.json
- Sign-in sends a magic link plus a 6-digit code (`signInWithOtp`, `verifyOtp`), with Google and Apple buttons. Apple is off until the provider is set up — [src/components/auth/auth-form.tsx:13,38-80](src/components/auth/auth-form.tsx)
- A paid gift by a guest goes straight to the pay panel: "Pay once and it's sent. Your account is created from the email you give at checkout: nothing to sign up for." plus "Photos upload right after payment." — `payGuestBlurb` and `uploadsAfterPay` in messages/en.json; [src/components/editor/paywall.tsx:176-178,332-333](src/components/editor/paywall.tsx)
- The pay panel shows:
  - a title: "Picture their face when it opens", or a real approved reaction;
  - "In this gift: {features}";
  - two plan rows ("This template" / "Every template", or Make it special / upgrade);
  - an unticked bump ("Add every other template…") and an optional "second gift" box;
  - "Pay {price} and send";
  - the one-tap wallet block;
  - "No subscription. Card, Apple Pay and more at checkout."
  — [src/components/editor/paywall.tsx:160-333](src/components/editor/paywall.tsx); [messages/en.json:543](messages/en.json)
- The pay panel's benefit line for removing the footer reads "No Ethos footer, all from you" ("Sin la marca de Ethos, todo de tu parte") — [messages/en.json:521](messages/en.json), `benefitNoWatermark` in es.json
- `pay_clicked` is tracked, then the browser goes to Stripe's URL — [src/components/editor/paywall.tsx:131-145](src/components/editor/paywall.tsx)

**Checkout (Stripe Checkout, hosted)**
- Session settings:
  - `branding_settings` = display name "Ethos" with the site icon at `https://tryethos.io/icons/icon-512.png`;
  - `consent_collection: { promotions: "auto", terms_of_service: "required" }`;
  - `allow_promotion_codes: false`;
  - `statement_descriptor_suffix: "ETHOS"`;
  - the page language follows the site's.
  — [src/lib/stripe/line-items.ts:23-26,296-318](src/lib/stripe/line-items.ts)
- The required tickbox text: "I ask Ethos to unlock my purchase straight away, before the 14-day cancellation period ends, and I understand that once it's unlocked I lose my right to cancel. [Terms]" — [src/lib/stripe/line-items.ts:159-165](src/lib/stripe/line-items.ts); Spanish wording in [docs/MONETIZATION.md:363-364](docs/MONETIZATION.md)
- The promotions box is refused on this account ("not available in your country", US merchants only), so no marketing box appears and no abandoned-checkout email is sent — [docs/STRIPE.md:194-202](docs/STRIPE.md); [docs/LAUNCH.md:166-170](docs/LAUNCH.md)
- STRIPE.md §7 says to switch on Apple Pay, Google Pay and Link in the dashboard. Whether they are on is an account setting, not code — [docs/STRIPE.md:179](docs/STRIPE.md)
- **One-tap path** (Express Checkout Element on the pay sheet):
  - Ethos's own withdrawal tickbox must be ticked before the Apple Pay or Google Pay button appears — [src/components/editor/one-tap-pay.tsx:102-110](src/components/editor/one-tap-pay.tsx)
  - Link, PayPal, Klarna and Amazon Pay are set to "never" — [src/components/editor/one-tap-pay.tsx:143](src/components/editor/one-tap-pay.tsx)
  - The buttons are never offered inside Instagram's or Facebook's in-app browser — [src/components/editor/one-tap-pay.tsx:21-34](src/components/editor/one-tap-pay.tsx)
  - This session deletes `branding_settings`, `custom_text` and `consent_collection` — [src/lib/stripe/line-items.ts:334-343](src/lib/stripe/line-items.ts)
- **Merchant name**:
  - "Receipts and Apple Pay still show the account's name." — [docs/LAUNCH.md:161-165](docs/LAUNCH.md)
  - "Receipts and the Apple Pay sheet still show the account's name until M14." — [docs/MONETIZATION.md:368](docs/MONETIZATION.md)
  - On 23 Sept the live checkout said "Pay SECUORA" — [docs/MONETIZATION.md:335](docs/MONETIZATION.md)
- **Statement**: the code appends `ETHOS` to the account's short descriptor ("shown as `MIGLA* ETHOS`-style"; total under 22 characters) — [docs/STRIPE.md:31-33,125-130](docs/STRIPE.md)
- The account is shared with secuora.net, domainscan and others — [docs/STRIPE.md:3-10](docs/STRIPE.md)

**After payment and the share screen**
- The success page shows "Unlocked." then "Taking you back to your gift…" and auto-redirects after 900 ms. `purchase_completed` fires once per session — [src/app/[currency]/[locale]/(marketing)/checkout/success/after-payment.tsx:10-56](src/app/[currency]/[locale]/(marketing)/checkout/success/after-payment.tsx); [messages/en.json:1186](messages/en.json)
- Back in the editor signed in with everything in place, the sheet publishes automatically ("one less tap") — [src/components/editor/publish-sheet.tsx:313-328](src/components/editor/publish-sheet.tsx)
- The share screen offers:
  - title "It's live." ("Live" eyebrow) with "Send {name} the link — or hand them the card.";
  - a link box with "Copy link";
  - "Open the gift", "Share…", "WhatsApp", "Messages", and an Instagram hint;
  - an Etsy review card (Etsy buyers only);
  - "Book the trip" (Pack Your Bags only);
  - `RemindNextYear` (signed-in only);
  - a QR card designer;
  - "See it in your gifts" and "Make another".
  — [src/components/editor/share-screen.tsx:48-105](src/components/editor/share-screen.tsx)
- The pre-filled share text has no brand word: "I made you something. Open it with your sound on 💌 {url}" / "Te he hecho algo. Ábrelo con el sonido activado 💌 {url}" — `editor.share.shareText` in messages/en.json and es.json
- The eyebrow "Live" / "Scheduled" is hard-coded English, so Spanish users see it too — [src/components/editor/share-screen.tsx:50](src/components/editor/share-screen.tsx)
- Emails after a purchase:
  - a receipt, subject "Your Ethos receipt: {product}" / "Recibo de Ethos: …", which quotes the ticked sentence — [src/lib/email/notify.ts:150](src/lib/email/notify.ts); [src/emails/templates.tsx:118](src/emails/templates.tsx)
  - a "Your gift for {name} is live" email — [src/lib/email/notify.ts:81](src/lib/email/notify.ts)
  - all from `Ethos <hello@tryethos.io>` — [docs/EMAIL.md:10-12](docs/EMAIL.md); [src/emails/layout.tsx:8](src/emails/layout.tsx)

**Measured funnel and drop-off (all "measured, 23 Sept"; the only dated figures I found)**
- Premium templates: about 60% of starters pay (Birthday Cinema 51 of 78, Bouquet 36 of 60) — [docs/MONETIZATION.md:32](docs/MONETIZATION.md)
- Free templates: 4.5% of starts pay (The Letter 62 of 1,383), about 6% of published free gifts — [docs/MONETIZATION.md:32](docs/MONETIZATION.md)
- 863 checkouts started, 155 unpaid (18%), so 82% completion — [docs/MONETIZATION.md:34](docs/MONETIZATION.md); [docs/MONETIZATION.md:808](docs/MONETIZATION.md)
- 5,555 makers; 12.2% paid; 33% made two or more gifts; 22 of 680 buyers bought twice (3%) — [docs/MONETIZATION.md:36](docs/MONETIZATION.md)
- The analytics helper's own comment speaks of "where the 96% of free makers stop" — [src/lib/analytics/track.ts:5-6](src/lib/analytics/track.ts)
- The funnel events now coded: `editor_opened`, `publish_sheet_shown`, `pay_clicked`, `purchase_completed`, `extras_offer_shown`, `bump_toggled`, `second_toggled`, `reminder_saved`, `reply_started`, `keep_tapped`, `keep_requested`, `gift_moved`, `unwrap_picked`, plus Etsy, affiliate, tour and Dates events. They go to Vercel Web Analytics, cookieless, and never fire inside the iPhone app — [src/lib/analytics/track.ts:12-52](src/lib/analytics/track.ts). Call sites: [src/components/editor/paywall.tsx:112,135](src/components/editor/paywall.tsx), [src/templates/_shared/EndScreen.tsx:173](src/templates/_shared/EndScreen.tsx), [src/components/gift/keep-form.tsx:148](src/components/gift/keep-form.tsx), [src/components/gift/gift-experience.tsx:126](src/components/gift/gift-experience.tsx)
- The baseline table lists "Gift revenue per gift visitor: not measured (W7)" and "Reminder opt-in: 0" — [docs/MONETIZATION.md:803,816](docs/MONETIZATION.md)

### Inferences
- **Tap counts** (from the code above, not tested):

  | Path | Taps and fields after the editor | Screens |
  |---|---|---|
  | Signed-in, free gift | Publish, Publish now, Share or WhatsApp, then send in the chat app: about 3 taps | 2 (sheet, share screen) |
  | Guest, free gift | Publish, type email, "Email me a magic link", open the email (or type the code and Verify), back to the sheet, Publish now, Share: about 5 to 6 taps, 1 to 2 fields, an app switch | 3 to 4 |
  | Guest, paid gift on Stripe's page | Publish, Pay, then on Stripe: email, card (or wallet), tickbox, Pay. Then auto-return and auto-publish, then Share: about 5 taps plus the card fields | 4 (sheet, Stripe, success, share) |
  | Paid gift, one-tap wallet | Tickbox, Apple Pay or Google Pay, the wallet sheet, then auto-publish and Share: about 4 taps, no typing | 3 |

- The guest free-gift sign-in (email, an app switch to the inbox, then back) is likely the costliest step in the free funnel. The docs hold no measurement of it.
- Payment comes after making in every path. So any brand element on the publish sheet or at checkout reaches only people who have already invested in a whole gift.

### Gaps
- No funnel numbers after 23 Sept appear in docs, reports or research notes. The events coded in `track.ts` have no recorded results anywhere in the repo. There is no measured drop-off between editor_opened and publish_sheet_shown, or between the guest sign-in and the publish.
- Whether the shared account's Apple Pay, Google Pay and Link switches are on, and whether M14 (Ethos's own Stripe account) has happened, is not recorded. The newest status in the docs is the 23 Sept "Pay SECUORA" note.
- Which code is live: [docs/LAUNCH.md:3-5](docs/LAUNCH.md) says (as of 23 Sept) "Nothing has been deployed", and [docs/MONETIZATION.md:192](docs/MONETIZATION.md) refers to an old and a new repo. The 16 Oct marketing notes describe the envelope card as "now" live. The cutover status itself is not stated.

---

## Q2. Recipient flow, step by step: preview, sound gate, end screen (free, paid, reply mode), "Keep this gift", and the emails a recipient can get

### Takeaway
A recipient sees a preview card that names nobody but them ("for Maya / someone made you something") and carries no brand. Then they always make one tap to open. That tap is either a plain dark "sound gate" or a decorated envelope or box, depending on the template's cover. On classic-cover gifts, a loading screen of at least 1.6 seconds follows the tap. The end screen is the only place with any brand text, and only on footer-on gifts. A paid gift today shows the word "Ethos" nowhere inside the gift: only an unlabelled seal icon on the gate and loading screens. "Keep this gift" leaves the gift for a separate page that asks for an email and is double opt-in.

### Cited Findings

**Link preview (chat card, og tags)**
- og:title is the sender's Title if set, otherwise "{name}, someone made you something 💌" / "{name}, alguien te ha hecho algo 💌" — [src/app/[currency]/[locale]/(gift)/g/[shortId]/page.tsx:24-27](src/app/[currency]/[locale]/(gift)/g/[shortId]/page.tsx)
- og:description is "Open it with your sound on." / "Ábrelo con el sonido activado." — [page.tsx:28](src/app/[currency]/[locale]/(gift)/g/[shortId]/page.tsx)
- og:image is `/g/<id>/card.jpg` at 2400×1256, alt "Someone made you something" / "Alguien te ha hecho algo"; robots noindex — [page.tsx:29-37](src/app/[currency]/[locale]/(gift)/g/[shortId]/page.tsx); [src/lib/gift/share-card.ts:3-7](src/lib/gift/share-card.ts)
- **og:site_name is missing.** The gift page sets its own `openGraph`. The root layout's `openGraph.siteName: SITE.name` ("Ethos") is therefore dropped, because Next shallow-merges metadata: "All `openGraph` fields from `app/layout.js` are replaced" — [page.tsx:35](src/app/[currency]/[locale]/(gift)/g/[shortId]/page.tsx); [src/app/[currency]/[locale]/layout.tsx:138-145](src/app/[currency]/[locale]/layout.tsx); [node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md:1344-1378](node_modules/next/dist/docs/01-app/03-api-reference/04-functions/generate-metadata.md)
- **"· Ethos" is in the HTML title but not in og:title.** The root title template is "%s · Ethos" in both languages — [layout.tsx:136](src/app/[currency]/[locale]/layout.tsx); `meta.titleTemplate` in messages/en.json and es.json. Next takes og:title's template only from the parent's `openGraph.title.template`, and the root's is a plain string — [node_modules/next/dist/lib/metadata/resolve-metadata.js:805-807](node_modules/next/dist/lib/metadata/resolve-metadata.js); [node_modules/next/dist/lib/metadata/resolvers/resolve-opengraph.js:150](node_modules/next/dist/lib/metadata/resolvers/resolve-opengraph.js)
- **The card picture** shows a sealed envelope with a wax seal (a PNG cut-out: `wax-seal-heart`, `wax-seal-flower` or `wax-seal-swans`), a bow and flowers on one of four papers. On the right sit "for" / "para", the name, a rule, and "someone made you something" / "alguien te ha hecho algo" — [src/lib/gift/card-art.ts:40-107,135-170](src/lib/gift/card-art.ts)
  - It "never shows the gift, and carries no web address: the chat prints the domain under it anyway" — [card-art.ts:4-8](src/lib/gift/card-art.ts)
  - The paper follows the template and look — [src/lib/gift/share-card.ts:31-70](src/lib/gift/share-card.ts)
- The fallback "plain card", drawn only if the envelope fails, still prints `TRYETHOS.IO` — [src/app/g/[shortId]/card.jpg/route.tsx:64-107](src/app/g/[shortId]/card.jpg/route.tsx)
- The card is served as a JPEG of about 80–125 KB, because a 521 KB PNG was "past the ~300 KB WhatsApp is known to drop previews over". The CDN caches it for a day, and the URL carries a version hash of what it shows — [card.jpg/route.tsx:56-62,139-142](src/app/g/[shortId]/card.jpg/route.tsx); [share-card.ts:16-25](src/lib/gift/share-card.ts)
- The Terms tell senders a preview "can show the gift's title or the recipient's name" (ES: "su vista previa puede mostrar el título del regalo o el nombre del destinatario") — [src/content/legal.ts:117](src/content/legal.ts), [legal.ts:312](src/content/legal.ts)

**Opening: the sound gate, a cover, then loading**
- A gift whose cover is `classic` (or unset) shows the `SoundGate`. Any other cover skips it: "tapping the cover is the gesture that lets sound play, so asking for a second tap would only get in the way" — [src/components/gift/gift-experience.tsx:42-54,136](src/components/gift/gift-experience.tsx)
- Which templates get a sound gate by default:
  - The Letter and about 30 others default to `classic`, because "each opens with its own envelope, book, diary, gate, camera, booth, basket, box or invitation" — [src/templates/_shared/covers/looks.ts:460-490](src/templates/_shared/covers/looks.ts)
  - Constellations defaults to the "starry" cover, so no sound gate — [looks.ts:508-511](src/templates/_shared/covers/looks.ts)
- The SoundGate is one full-screen button "The single user gesture browsers need before audio can play. Also the emotional threshold." It shows:
  - the pulsing `LogoMark` seal;
  - "{sender} → {recipient}";
  - "Someone made this for you, {name}…" ("Alguien hizo esto para ti, {name}…");
  - a coral pill "Tap to open" ("Toca para abrir");
  - "Turn your sound on" ("Activa el sonido").
  — [src/components/gift/sound-gate.tsx:9-35](src/components/gift/sound-gate.tsx); [src/templates/_shared/i18n.ts:9-14,82-87](src/templates/_shared/i18n.ts)
- `LogoMark` is "a wax seal pressed with a heart", an inline SVG with `aria-hidden="true"` and no word. The word "Ethos" lives only in the separate `Wordmark` / `Logo` — [src/components/shared/logo.tsx:19-56](src/components/shared/logo.tsx)
- After the gate (classic cover), the `LoadingScreen` stays up at least 1,600 ms. It shows the `LogoMark`, "Someone made this for you", the recipient's name, a hairline progress bar and "Turn your sound on" — [src/templates/_shared/GiftRenderer.tsx:21,91-95,162-169](src/templates/_shared/GiftRenderer.tsx); [src/templates/_shared/LoadingScreen.tsx:105-157](src/templates/_shared/LoadingScreen.tsx)
- A decorated cover shows an envelope or gift box with "For {name}" ("Para {name}") and "Tap to open". Its tap calls `prime()` and `buzz(12)`, then plays `playPaper` (envelope) or `playRibbon` (box), and a `playChime` about 0.6–0.82 s later. All are synthesised sounds — [src/templates/_shared/covers/Cover.tsx:167-184,269,282](src/templates/_shared/covers/Cover.tsx); [src/templates/_shared/collage/sounds.ts:12-44](src/templates/_shared/collage/sounds.ts)
- The SoundGate's own tap only sets state and records the view. No shared opening sound plays there — [src/components/gift/gift-experience.tsx:83-86](src/components/gift/gift-experience.tsx)
- Many classic-cover templates then ask for their own tap (for example "Tap the seal" / "Toca el sello", `tapSeal`) — [src/templates/_shared/i18n.ts:15,88](src/templates/_shared/i18n.ts)
- Audio rules that bear on a new sound:
  - A real catalogue song never autoplays; it waits on the end screen for a tap — [src/templates/_shared/hooks/use-gift-audio.ts](src/templates/_shared/hooks/use-gift-audio.ts) (header comment)
  - Mute state is remembered for shared pieces — use-gift-audio.ts header
  - "Sound floor" rules let only one voice play at a time — [src/templates/_shared/sound-floor.ts](src/templates/_shared/sound-floor.ts) (header comment)
- Gift pages carry `translate="no"` ("The whole gift page is the sender's") — [gift-experience.tsx:110-112](src/components/gift/gift-experience.tsx); [GiftRenderer.tsx:120-127](src/templates/_shared/GiftRenderer.tsx)

**Inside the gift: the floating footer**
- On a footer-on gift, the `Watermark` floats bottom-centre at z-40: a pill reading "Made with Ethos" ("Hecho con Ethos"), 11 px, white/85 on black/40, with the seal. It links to `/made-with-ethos?ref=watermark&template=<slug>` in a new tab. "Deliberately small and tasteful — it is the viral hook, not an ad." — [src/templates/_shared/Watermark.tsx:6-34](src/templates/_shared/Watermark.tsx); [src/config/brand.ts:24-28](src/config/brand.ts)
- It hides while the end screen is in view; the end screen then carries it inline — [GiftRenderer.tsx:106,179-180](src/templates/_shared/GiftRenderer.tsx); [src/templates/_shared/gift-chrome.tsx:5-18](src/templates/_shared/gift-chrome.tsx)
- The footer is on unless the sender owns an unlock: `watermark: !entitlement.unlocked` — [src/lib/gift/publish.ts:41](src/lib/gift/publish.ts)

**End screen, in order** ([src/templates/_shared/EndScreen.tsx:83-200](src/templates/_shared/EndScreen.tsx))
1. A pulsing heart.
2. "The end. For now." ("Fin. Por ahora.").
3. "Made by {sender} for {recipient}" ("Hecho por {sender} para {recipient}").
4. Then, as present: the unwrap surprise, the voice note, the song card and the dedication.
5. "Send {sender} a reaction" (if the reaction prompt is on, the default).
6. The make-one button.
7. "The first reply is free" ("La primera respuesta es gratis"), only for a paid premium gift with no footer.
8. "Keep this gift" ("Guardar este regalo").
9. "Watch again" (if the template passes a replay).
10. The inline "Made with Ethos" footer, on footer-on gifts only.

- **Reply mode.** Real gift pages always render with `replyMode`, so the make-one button reads "Send one back to {sender}" ("Hazle uno a {sender}"). "Make one for someone you love" ("Haz uno para alguien que quieres") appears only in demos and previews, where reply mode is off — [gift-experience.tsx:122-133](src/components/gift/gift-experience.tsx); [EndScreen.tsx:144-160](src/templates/_shared/EndScreen.tsx); [i18n.ts:40-43,115-118](src/templates/_shared/i18n.ts)
- **Free versus paid end screens.**
  - Free (footer on): items 1–6 and 8–10, without the "first reply is free" line.
  - Paid premium (footer off): items 1–9, with "The first reply is free" and no footer.
  - A free template with "Make it special" (footer off): no footer and no free-reply line, because the template is not premium — [EndScreen.tsx:27-40](src/templates/_shared/EndScreen.tsx)
- The "send one back" tap seeds the editor with the names swapped, tracks `reply_started` and opens `/create/<slug>`, adding a sealed token for a paid premium gift — [gift-experience.tsx:122-130](src/components/gift/gift-experience.tsx); [page.tsx:70-76](src/app/[currency]/[locale]/(gift)/g/[shortId]/page.tsx)
- On iOS Safari, after the gift ends, a top banner says "Save it to your phone: tap Share, then “Add to Home Screen”." — [src/components/gift/home-screen-tip.tsx:11-35](src/components/gift/home-screen-tip.tsx); [gift-experience.tsx:138](src/components/gift/gift-experience.tsx)
- The home-screen app name is already "Ethos" (`appleWebApp.title: SITE.name`; the manifest name and short_name are `BRAND.name`). But `start_url` is "/" for the whole site — [layout.tsx:158](src/app/[currency]/[locale]/layout.tsx); [src/app/manifest.ts:8-22](src/app/manifest.ts)
- M11 item 3 planned a per-gift manifest "so 'Add to Home Screen' opens the gift" — [docs/MONETIZATION.md:611](docs/MONETIZATION.md). No per-gift manifest exists: `src/app/manifest.ts` is the only manifest file.

**Where the footer leads**
- `/made-with-ethos` (noindex): eyebrow "Made with Ethos", title "Someone made you one of these.", subtitle "Make one back — free to start." Then free templates first and premium after, with the gift's own template marked "The one you got" — [src/app/[currency]/[locale]/(marketing)/made-with-ethos/page.tsx:11-71](src/app/[currency]/[locale]/(marketing)/made-with-ethos/page.tsx); `madeWith` in [messages/en.json:3269](messages/en.json)
- The premium shelf promises: "Make the whole gift first, for free. If you send it, you pay once, and it goes without the footer." ("…y va sin la marca.") — `madeWith.premium.blurb` in messages/en.json and es.json

**"Keep this gift" and recipient emails**
- The end screen's "Keep this gift" link shows on real gift pages, never in demos or the editor and never in the iPhone app (`data-app-hide`). It tracks `keep_tapped` and navigates to `/g/<id>/keep` — [EndScreen.tsx:166-183](src/templates/_shared/EndScreen.tsx); [gift-chrome.tsx:16-17](src/templates/_shared/gift-chrome.tsx)
- The keep page asks for:
  - a title "Keep this gift" and the blurb "We'll email you the link so you can open it again any time.";
  - one required field, "Your email";
  - optional unticked boxes under "Want a reminder too? Tick any you'd like": "Remind me before {sender}'s birthday", "Remind me before our anniversary", "Remind me before Valentine's Day". Each box except Valentine's opens Month and Day menus;
  - the button "Email me the link".
  — [src/components/gift/keep-form.tsx:13-37,207-260](src/components/gift/keep-form.tsx). Spanish: "Guardar este regalo", "Tu correo", "Avísame antes del cumpleaños de {sender}", "Envíame el enlace" — [keep-form.tsx:38-62](src/components/gift/keep-form.tsx)
- The consent line under the button: "We'll email you once to confirm it's you. Then this gift's link, and a reminder nine days before each day you ticked. Every email has a link to unsubscribe." — [src/lib/keep/keep.ts:37-41](src/lib/keep/keep.ts)
- The keep emails:
  - the confirmation "Confirm to keep the gift" with the button "Yes, email me the link" and a "Never email me" footer link;
  - then "Your gift from {sender}" with "Open the gift" and "Unsubscribe".
  — [src/emails/keep.tsx:7-61](src/emails/keep.tsx)
- The emails a recipient can get, and on what basis:
  - **Keep emails**: consent given on the keep page and confirmed by email; nothing more if they don't confirm within seven days — [src/content/legal.ts:120,494,545](src/content/legal.ts)
  - **Reaction**: a recipient's reaction goes to the sender by email. The recipient may tick "Ethos may show this reaction on its site, without your name" — [src/components/gift/reaction-sheet.tsx:14-37](src/components/gift/reaction-sheet.tsx); [legal.ts:119,493](src/content/legal.ts)
  - **Nothing else**: "we send no other emails and no newsletters" — [legal.ts:486](src/content/legal.ts)
- Analytics on gift pages: Vercel cookieless analytics only, with gift links shortened to `/g/[shortId]`. Clarity and the Meta and TikTok pixels never run on gift pages — [legal.ts:531-534](src/content/legal.ts)
- Measured, 23 Sept:
  - 13,959 recipients; "86% of gift opens are on free, watermarked gifts";
  - opens by device: iPhone 68%, Android 25%, desktop 7%;
  - replies: 2.3% of free gifts against 0.5% of premium gifts.
  — [docs/MONETIZATION.md:37-38](docs/MONETIZATION.md)

### Inferences
- **Recipient step count, classic cover** (for example The Letter): see the preview, tap the link, tap "Tap to open", wait at least 1.6 s on loading, then usually a template tap ("Tap the seal"), then the gift. Two required taps before content. **Decorated cover**: one tap, about 1.15–1.35 s of opening animation, then the gift.
- "Keep this gift" is the heaviest recipient flow:
  - it leaves the gift (a new page);
  - 1 required field, plus 2 optional menus per reminder;
  - 1 submit, then an inbox round trip ("Yes, email me the link").
  - That makes 2 screens, at least 3 taps and 2 emails before anything is kept.
- The recipient has no brand-bearing share action. The only recipient outputs are a reaction (private to the sender), "send one back" and "keep".
- On a paid gift, the only brand cues are the unlabelled seal (gate and loading screen), the domain in the address bar and chat preview, the browser tab title "… · Ethos", and the home-screen name "Ethos" if added.

### Gaps
- I could not see how iMessage, WhatsApp and Instagram DMs actually render this preview: which of og:title, `<title>` or the domain they show, and whether a missing og:site_name changes anything. That needs a device test.
- The share of gifts that use a classic cover versus a decorated one (so who sees the SoundGate) is not measured anywhere I found.
- There is no measured keep_tapped → keep_requested → confirmed conversion.

---

## Q3. For each proposed brand element: the zero-step insertion point and its risks

### Takeaway
Five of the eight elements have a clean zero-step slot in existing code:
- a wordmark during the loading wait or under "Made by…";
- the gate seal;
- a sound on the existing tap;
- the button's wording;
- og:site_name and the checkout already being "Ethos".

Two do not:
- A recipient share card is an added (if optional) action.
- One-tap date capture is already one tap for signed-in senders but cannot be zero-step for recipients, because it needs an email under the consent rules.

The biggest collisions are with the paid "no footer" promise, for (a) and (h), and with the 16 Oct "no brand text in pictures" marketing rule, for (b) on the preview card.

### Cited Findings and per-element mapping

**(a) A small permanent seal-and-name maker's mark on every gift, paid ones included**
- Existing zero-step slots that render for every gift:
  1. The `LoadingScreen`'s seal (`LogoMark`), shown at least 1.6 s on classic-cover gifts — [LoadingScreen.tsx:109-116](src/templates/_shared/LoadingScreen.tsx); [GiftRenderer.tsx:21](src/templates/_shared/GiftRenderer.tsx)
  2. The end screen's "Made by {sender} for {recipient}" line — [EndScreen.tsx:110-112](src/templates/_shared/EndScreen.tsx)
  3. The SoundGate seal — [sound-gate.tsx:15-17](src/components/gift/sound-gate.tsx)

  Slots 1 and 3 do not show on decorated-cover gifts — [gift-experience.tsx:53-54](src/components/gift/gift-experience.tsx). Slot 2 shows on every template's end screen.
- **Layout collisions.** The bottom-centre of every gift is the Watermark's zone (z-40) — [Watermark.tsx:27](src/templates/_shared/Watermark.tsx). Also in use:
  - bottom-right: `UnwrapPeek` (`right-3 bottom-4 z-40`) and the video sound button (`right-3 bottom-3`) — [src/templates/_shared/UnwrapGift.tsx:246](src/templates/_shared/UnwrapGift.tsx); [src/templates/_shared/GiftVideo.tsx:79](src/templates/_shared/GiftVideo.tsx)
  - top-right: the sound toggle (z-40) — [src/templates/_shared/SoundToggle.tsx:33](src/templates/_shared/SoundToggle.tsx)
  - top: the home-screen tip (z-75) — [home-screen-tip.tsx:26](src/components/gift/home-screen-tip.tsx)
  - 49 template files place their own controls against `safe-area-inset-bottom` (grep count across src/templates)
  - There are 54 template folders.
- **Terms and copy it collides with**:
  - Terms s.2: "removing the footer" is a paid extra — [legal.ts:84](src/content/legal.ts)
  - Unlocks and "Make it special" include "no footer" — [legal.ts:131-132](src/content/legal.ts)
  - The footer "may be removed only by unlocking the template" — [legal.ts:226](src/content/legal.ts)
  - The pay panel: "No Ethos footer, all from you" — [messages/en.json:521](messages/en.json)
  - /made-with-ethos: "it goes without the footer" — `madeWith.premium.blurb`
  - Changes to what was paid for "in more than a minor way" need advance notice and a 30-day free exit with a proportionate refund — [legal.ts:248](src/content/legal.ts)
- **Accessibility**: `LogoMark` is `aria-hidden` — [logo.tsx:24](src/components/shared/logo.tsx). The current footer text is 11 px at white/85 on black/40 — [Watermark.tsx:26](src/templates/_shared/Watermark.tsx)
- **Translations**: "Made by {sender}" / "Hecho por {sender}" sits directly above "Made with Ethos" / "Hecho con Ethos" on free gifts — [i18n.ts:40,115](src/templates/_shared/i18n.ts); [brand.ts:25-28](src/config/brand.ts)
- **Performance**: `LogoMark` is an inline SVG path, so it adds no network cost — [logo.tsx:8-28](src/components/shared/logo.tsx)

**(b) The word "Ethos" on the seal, on the sound gate and the preview envelope**
- **Sound gate**: the seal is `LogoMark` with no text; `Wordmark` exists for the name — [sound-gate.tsx:16](src/components/gift/sound-gate.tsx); [logo.tsx:31-40](src/components/shared/logo.tsx). This is zero-step, but only classic-cover gifts show the gate.
- Decorated covers draw their own envelope seals (`SealMark`: a heart, star or paw mark, or a photo `sealArt`), which are separate art — [src/templates/_shared/covers/Centerpieces.tsx:16-27,124-141](src/templates/_shared/covers/Centerpieces.tsx)
- **Preview envelope**: the seal is a PNG cut-out placed at the flap's tip — [card-art.ts:159](src/lib/gift/card-art.ts). Adding text means an overlay in `cardArt`, plus bumping the URL version so crawlers fetch the new card — [share-card.ts:22-25](src/lib/gift/share-card.ts); [card.jpg/route.tsx:62](src/app/g/[shortId]/card.jpg/route.tsx)
- **The 16 Oct decision about the preview**:
  - "The owner: the preview card 'looks bland'." The card became the envelope, and "the picture no longer prints the site's address. The slides draw the real card" — [docs/marketing/VIRAL-FORMULA.md:2216-2221](docs/marketing/VIRAL-FORMULA.md)
  - The same day the first tryethos post got 0 views; "the difference was the site's name on screen ('tryethos.io' in the link card)… TikTok reads text in pictures" — [VIRAL-FORMULA.md:2223-2230](docs/marketing/VIRAL-FORMULA.md)
  - The rule set then: "Nothing that names the site on screen. No link card, no domain, no 'tryethos' in the chat." — [VIRAL-FORMULA.md:2232](docs/marketing/VIRAL-FORMULA.md)
  - 17 Oct: TikTok support said visibility "was limited due to a violation of our Community Guidelines". The likely rule is commercial disclosure, so "keeping the name off-screen is not enough" and product posts go up with "Your brand" switched on — [VIRAL-FORMULA.md:2251-2262](docs/marketing/VIRAL-FORMULA.md)
- The other share-card generator (plans and dates) prints both `ETHOS` and `TRYETHOS.IO` — [src/app/og/share.jpg/route.tsx:74,80,107,113](src/app/og/share.jpg/route.tsx)
- **Accessibility**: the card's alt text is "Someone made you something" — [page.tsx:30](src/app/[currency]/[locale]/(gift)/g/[shortId]/page.tsx)

**(c) A two-second opening sound on the existing tap**
- The existing gesture is the SoundGate button ("The single user gesture browsers need before audio can play") — [sound-gate.tsx:9-12](src/components/gift/sound-gate.tsx). A loading wait of at least 1.6 s follows it — [GiftRenderer.tsx:21,91-95](src/templates/_shared/GiftRenderer.tsx)
- Decorated covers already play a sound on tap: paper or ribbon, then a three-note sine chime (783.99, 1174.66 and 1567.98 Hz) — [Cover.tsx:169-175](src/templates/_shared/covers/Cover.tsx); [collage/sounds.ts:41-44](src/templates/_shared/collage/sounds.ts)
- Synthesised sounds need no file download (`prime()` warms the audio context) — [src/templates/_shared/synth.ts:66-80](src/templates/_shared/synth.ts)
- **What a new sound would have to coexist with**:
  - Library or uploaded background music fades in when the template mounts; "a bell on top of one adds up past full scale and clips" — [use-gift-audio.ts](src/templates/_shared/hooks/use-gift-audio.ts) (header comment)
  - The recipient's mute is remembered for shared pieces — same file
  - Only one voice plays at a time (`sound-floor`) — [sound-floor.ts](src/templates/_shared/sound-floor.ts) (header comment)

**(d) Renaming "send one back" / "make one" to name the brand**
- **Live string**: "Send one back to {sender}" / "Hazle uno a {sender}". It is the only one recipients see on real gifts — [i18n.ts:43,118](src/templates/_shared/i18n.ts); [gift-experience.tsx:131](src/components/gift/gift-experience.tsx)
- "Make one for someone you love" / "Haz uno para alguien que quieres" appears only in demos — [i18n.ts:42,117](src/templates/_shared/i18n.ts)
- **The Terms name the button**:
  - "the “send one back” button at its end lets you make one gift in reply" — [legal.ts:139](src/content/legal.ts)
  - ES: "el botón para devolver el detalle que aparece al final" — [legal.ts:334](src/content/legal.ts)
  - LAUNCH test 7.10 also checks this button — [docs/LAUNCH.md:296-312](docs/LAUNCH.md)
- The button wraps long strings (`[overflow-wrap:anywhere]`, min-h-12) — [EndScreen.tsx:146-160](src/templates/_shared/EndScreen.tsx)

**(e) A recipient share card**
- No recipient share action exists. The end screen's actions are reaction, send one back, keep and replay — [EndScreen.tsx:131-197](src/templates/_shared/EndScreen.tsx). The iOS tip is about the home screen only — [home-screen-tip.tsx:12](src/components/gift/home-screen-tip.tsx)
- **Infrastructure that already exists**:
  - The per-gift envelope card at `/g/<id>/card.jpg` (unbranded) — [card.jpg/route.tsx:109-143](src/app/g/[shortId]/card.jpg/route.tsx)
  - The branded plan and date card at `/og/share.jpg` — [src/app/og/share.jpg/route.tsx:74-113](src/app/og/share.jpg/route.tsx)
- **Privacy framing**: "Anyone who has a published gift's link can open it… treat them like a private letter" — [legal.ts:117](src/content/legal.ts). Gifts can be password-protected — [legal.ts:118](src/content/legal.ts)
- Clarity and the ad pixels never run on gift pages, so any share would be counted only by Vercel analytics — [legal.ts:533-534](src/content/legal.ts)

**(f) One-tap occasion-date capture for reminders**
- **Sender side already exists.** `RemindNextYear` on the share screen: "first row is this gift's occasion next year, filled in from the gift (one tap saves it, the details open only to change them)". Then birthday, anniversary, Valentine's, monthly and someone else, each "added with its own tap" — [src/components/reminders/remind-next-year.tsx:44-58](src/components/reminders/remind-next-year.tsx)
  - Card copy: "Want a nudge before the next one?" / "One email nine days before each day you add…" — `lifecycle.remind` in messages/en.json
  - Shown only when signed in — [share-screen.tsx:88](src/components/editor/share-screen.tsx)
  - Tracked as `reminder_saved` — [remind-next-year.tsx:155,200](src/components/reminders/remind-next-year.tsx)
- Guests who pay come back "signed in" — [after-payment.tsx:40-43](src/app/[currency]/[locale]/(marketing)/checkout/success/after-payment.tsx). Free guests must sign in to publish — [publish-sheet.tsx:449-458](src/components/editor/publish-sheet.tsx)
- **Recipient side**: dates only via the keep page (email, a tickbox, month and day, then a confirmation email) — [keep-form.tsx:233-260](src/components/gift/keep-form.tsx); [legal.ts:494](src/content/legal.ts)
- **The plan said**: "One question, one tap… The tap is the consent; store the wording and the time." Offered on the share screen, in opened and reaction emails, and on the dashboard. "Never on the recipient's end screen." — [docs/MONETIZATION.md:531-537](docs/MONETIZATION.md)
- **Rules from the plan**:
  - consent text must name every email it covers;
  - a recipient's birthday is someone else's data, so keep only the first name, day and month;
  - Latvian e-marketing law applies.
  — [docs/MONETIZATION.md:547,555-559](docs/MONETIZATION.md)
- The plan's reminder opt-in target is 5–15% of senders, "read in early November" — [docs/MONETIZATION.md:816](docs/MONETIZATION.md)

**(g) Checkout and statement showing "Ethos"**
- **Already done in code**:
  - the hosted checkout header is "Ethos" with the icon — [line-items.ts:23-26,313,423](src/lib/stripe/line-items.ts)
  - the statement suffix `ETHOS` — [line-items.ts:315](src/lib/stripe/line-items.ts)
  - an "Ethos for Two" Product descriptor `ETHOS FOR TWO` for subscriptions — [docs/STRIPE.md:31-33](docs/STRIPE.md)
- **The Terms already promise it**: "The charge appears on your statement with “ETHOS” in its description." ES: "…extracto con «ETHOS» en la descripción." — [legal.ts:144,339](src/content/legal.ts)
- **Still not Ethos**:
  - receipts and the Apple Pay sheet — [docs/LAUNCH.md:165](docs/LAUNCH.md)
  - the one-tap wallet session, which drops `branding_settings` — [line-items.ts:341](src/lib/stripe/line-items.ts)
  - the account's own short descriptor prefix ("MIGLA*"-style) — [docs/STRIPE.md:127-129](docs/STRIPE.md)
  - a possible account-level Terms URL belonging to another business in the checkout footer — [docs/STRIPE.md:191-195](docs/STRIPE.md)
- **The fix already planned, M14**: Ethos's own Stripe account for SIA "MIGLAI", with public name "Ethos", statement descriptor "TRYETHOS.IO", a verified Apple Pay domain, and Google Pay, Link and PayPal on. Rationale: "Receipts and the Apple Pay sheet still name the other business"; and if the account belongs to another company, "the checkout names a different trader from the one in the Terms (CRD Art 6(1)(b) to (c))" — [docs/MONETIZATION.md:634-660](docs/MONETIZATION.md)
- The trader in the Terms is SIA "MIGLAI" — [legal.ts:9-10](src/content/legal.ts)

**(h) og:title and og:description naming Ethos without spoiling the surprise**
- **Current**: og:title is the sender's Title or "{name}, someone made you something 💌"; og:description "Open it with your sound on."; no og:site_name — [page.tsx:24-36](src/app/[currency]/[locale]/(gift)/g/[shortId]/page.tsx)
- The root layout already defines `siteName: SITE.name`, but the gift page overrides the whole `openGraph` object — [layout.tsx:138-145](src/app/[currency]/[locale]/layout.tsx)
- **Zero-step slots**: add `siteName` to the gift page's `openGraph`, and/or a brand word in the `description` constant, in both languages — [page.tsx:28,35](src/app/[currency]/[locale]/(gift)/g/[shortId]/page.tsx)
- **Promises it touches**: "No Ethos footer, all from you" (paid) — [messages/en.json:521](messages/en.json). The Terms on previews only mention title and name — [legal.ts:117](src/content/legal.ts)

### Inferences (per element: zero-step verdict and main risk)

| Element | Zero-step insertion point | Adds a step? | Main risks |
|---|---|---|---|
| (a) Permanent maker's mark | A small seal + "Ethos" on the end screen's "Made by…" line (every template), and/or under the LoadingScreen seal (classic covers) | No | **Terms and pay copy**: paid buyers were sold "no footer… all from you". Existing paid gifts change after the fact (legal.ts:248). Must be visibly not the footer: non-link, no "Made with". Bottom zones are crowded; an end-screen line avoids per-template collisions. ES "Hecho por / Hecho con" sit together. |
| (b) "Ethos" on the seal | SoundGate: a `Wordmark` under or inside the seal. Preview card: text on the envelope's seal in `cardArt` | No | Gate shows only on classic covers. Card text conflicts with the 16 Oct rule "Nothing that names the site on screen", because the TikTok slides draw the real card; 17 Oct evidence points at disclosure instead, but that is unconfirmed. Needs a URL version bump. Screen readers: the seal is aria-hidden, so a wordmark adds "Ethos" to the gate's accessible name. |
| (c) Opening sound | Fire a short synth "seal crack + chime" in `SoundGate`'s onClick, inside the ≥1.6 s loading wait. Decorated covers already chime | No | Overlap or clipping with background music starting on mount. Must respect remembered mute. iPhone silent-switch behaviour for Web Audio is untested here. Becomes part of every screen recording, which helps recall but means it must not annoy. |
| (d) Brand the reply button | String change in i18n.ts (EN and ES) | No | The Terms name the "send one back" button (EN and ES), so they need a sync. The ES text is natural only as "Hazle un Ethos a {sender}", which uses the brand as a common noun (genericide risk). "Make one" is demo-only, so renaming it has almost no recipient reach. |
| (e) Recipient share card | No true zero-step point. The least-friction option is an optional "Share the envelope" button reusing `/g/<id>/card.jpg` | Yes (optional action) | Competes with 4 existing end-screen buttons. Sharing a private gift link: the card must never show content. Password gifts. Brand text on the card meets the same 16 Oct issue as (b). |
| (f) One-tap date capture | Senders: already one tap (RemindNextYear first row). Recipients: none without an email | Senders no; recipients yes | M6 said never on the recipient's end screen. Recipient dates need email plus double opt-in (Terms 120, 494, 545). Consent text must name each email. Third-party birthday data. |
| (g) Checkout and statement say "Ethos" | Already done for the hosted page and the statement suffix. Remaining: M14 (own account: receipts, Apple Pay sheet, descriptor "TRYETHOS.IO") | No | Until M14, the wallet sheet and receipts name the shared account's business, and a "Pay SECUORA"-type header can recur on the one-tap path. Trader-identity mismatch (CRD) if the account isn't MIGLAI's. The 22-character descriptor limit. |
| (h) og tags name Ethos | `openGraph.siteName: "Ethos"` and/or "· Ethos" in the description | No | For senders who paid for "all from you", the preview naming Ethos may feel like a footer. The TikTok slides may show the preview text. Rendering per chat app is unverified. Content stays unspoiled as long as only the brand, never the template, is named. |

### Gaps
- There is no A/B data on whether the "Made with Ethos" footer itself lowers reply or paid rates. The docs hold only the raw reply rates (2.3% free against 0.5% premium), which are confounded by the paywall.
- There is no measurement of how many recipients reach the end screen, which is where (a) via "Made by…", (d) and (e) would live. Progress events exist (`/api/gift/<id>/view` PATCH with pct, [gift-experience.tsx:88-104](src/components/gift/gift-experience.tsx)), but no figures are in the docs.
- There is no device test of the SoundGate tap plus a synth sound on iOS with the silent switch on.

---

## Q4. Which elements conflict with the Terms or with past decisions, and what would need changing

### Takeaway
Two clear conflicts:
- **(a) A mark on paid gifts** collides with the sold "no footer" benefit, in the Terms, the pay panel, /made-with-ethos and the free-reply copy.
- **(b) or (h) brand text in the preview picture or text** collides with the 16 Oct marketing rule that removed the domain from the card.

Smaller ones:
- (d) needs the Terms' button name updated.
- (f) for recipients collides with the M6 "never on the recipient's end screen" rule and the double opt-in promise.
- (g) is already promised in the Terms and blocked only by M14.

Two planned brand touches were never built: the M11 "or make one for someone else" link on paid end screens, and the per-gift manifest.

### Cited Findings
- **The footer is a sold benefit**:
  - Terms s.2 lists "removing the footer" among paid extras — [legal.ts:84](src/content/legal.ts)
  - s.6 unlocks have "no footer", and "Make it special" has "no footer" — [legal.ts:131-132](src/content/legal.ts)
  - IP clause: the "Made with Ethos" footer "may be removed only by unlocking the template" — [legal.ts:226](src/content/legal.ts) (ES [legal.ts:421](src/content/legal.ts))
  - A refund brings the footer back ("gifts that only paid to remove the footer show it again") — [legal.ts:190](src/content/legal.ts)
- **Free replies carry the footer by Terms**: "A free reply carries the “Made with Ethos” footer and no paid extras" — [legal.ts:139](src/content/legal.ts). The editor says the same: "it goes with the small “Made with Ethos” footer" — [messages/en.json:551](messages/en.json)
- **Changes to paid features**: "If a change affects your access to, or use of, something you paid for in more than a minor way, we'll tell you in advance, and you can end the contract for it free of charge within 30 days and get a proportionate refund." — [legal.ts:248](src/content/legal.ts)
- **The preview card decision (16 to 17 Oct)**: the domain was removed from the card picture because:
  - the owner found the old card "bland";
  - "the chat prints the domain under it anyway" — [card-art.ts:7-8](src/lib/gift/card-art.ts)
  - a post showing "tryethos.io" in the link card got 0 views. The working explanation was "TikTok reads text in pictures, and a post that shows a web address gets held back".

  The rule became "Nothing that names the site on screen". On 17 Oct TikTok attributed the limit to a Community Guidelines violation, probably commercial disclosure, and concluded "keeping the name off-screen is not enough" — [VIRAL-FORMULA.md:2216-2262](docs/marketing/VIRAL-FORMULA.md)
- **The statement already promised**: "The charge appears on your statement with “ETHOS” in its description." — [legal.ts:144](src/content/legal.ts). The code delivers the suffix — [line-items.ts:315](src/lib/stripe/line-items.ts)
- **Reminders plan**: "Never on the recipient's end screen." — [docs/MONETIZATION.md:537](docs/MONETIZATION.md). The built "Keep this gift" link sits on the end screen but leads to a separate page; the code comment says "The gift itself carries no form" — [EndScreen.tsx:166-168](src/templates/_shared/EndScreen.tsx); [keep/page.tsx:20-26](src/app/[currency]/[locale]/(gift)/g/[shortId]/keep/page.tsx)
- **No other emails**: "Apart from these… we send no other emails and no newsletters." — [legal.ts:486](src/content/legal.ts). Kept-gift emails rest on consent — [legal.ts:545](src/content/legal.ts)
- **Planned but unbuilt brand touches**:
  - M11.2, "On paid gifts' end screens, a text link under Replay: 'or make one for someone else' (`/gifts?ref=g`)" — [docs/MONETIZATION.md:610](docs/MONETIZATION.md). There is no such string or `ref=g` in `src` (grep).
  - M11.3, the per-gift manifest — [docs/MONETIZATION.md:611](docs/MONETIZATION.md). Not present.
  - W8.3 planned the watermark to link `/templates/<slug>?ref=wm-<slug>` — [docs/MONETIZATION.md:414](docs/MONETIZATION.md). As built, it links `/made-with-ethos?ref=watermark&template=<slug>` — [Watermark.tsx:18-19](src/templates/_shared/Watermark.tsx)
- **The watermark's value per the plan**: "86% of gift opens carry the watermark, the most-seen ad Ethos has." — [docs/MONETIZATION.md:416](docs/MONETIZATION.md)
- **Brand identity source**: `BRAND.name` "Ethos", `legalName` "Ethos Love", `domain` "tryethos.io"; the watermark comment: "Keep it short; it is the viral hook" — [src/config/brand.ts:5-28](src/config/brand.ts)

### Inferences: what would need changing, per element
- **(a) mark on paid gifts** would need all of these:
  - Terms s.2, s.6, the IP clause and the refund clause redefined so the "footer" (the linked "Made with Ethos" pill) is distinct from a non-link maker's mark that every gift carries;
  - the pay panel's "No Ethos footer, all from you" / "Sin la marca de Ethos, todo de tu parte" rewritten;
  - /made-with-ethos "goes without the footer" checked;
  - for gifts already sold footer-free, notice under legal.ts:248, or apply the mark only to gifts published after the change.

  Without these, it reads as taking back a paid feature.
- **(b) or (e) brand text in the card picture** would need the marketing team's 16 Oct rule revisited (or a separate unbranded card variant for TikTok slides, which `scripts/share-card.mjs` already renders separately according to VIRAL-FORMULA.md:2220-2221), plus a cache-version bump.
- **(d)** needs legal.ts:139 and :334, LAUNCH test 7.10 and the ES grammar reviewed.
- **(f) for recipients** contradicts M6's "never on the recipient's end screen" only if a capture control is placed on the end screen itself. Keeping it on the keep page respects both M6 and the double opt-in. A zero-step version for recipients is not possible within legal.ts:120, 494 and 545.
- **(g)** needs no Terms change (already promised). The remaining work is operational (M14).
- **(h)** has no Terms conflict. The tension is with the paid "all from you" positioning and with the slides.

### Gaps
- I found no doc recording why "Keep this gift" was placed on the end screen despite M6. The squashed history has no commit message to explain it.
- I found no legal review of whether a non-removable brand mark on paid gifts would count as a "more than minor" change.

---

## Implications for Ethos

*Interpretation, kept separate from the facts above. Ranked by brand value against friction and risk. "Value" weighs reach (86% of opens are on free gifts; the end screen and preview reach every recipient) and memorability. "Risk" weighs added steps, Terms conflicts and the 16 Oct marketing rule.*

1. **(h) og:site_name "Ethos" on gift links.** High value, near-zero risk. It is a one-line metadata fix restoring what the root layout already intends. It reaches every recipient before the tap, names no template and spoils nothing. Keep the brand out of og:title. Optionally add "· Ethos" to the description, but test what each chat app shows first.
2. **(g) Finish "Ethos" at checkout through M14.** High trust value (the receipt, Apple Pay sheet and statement name match the brand), no step, already promised in the Terms. The code is done; the account move is the work. This also removes the CRD trader-identity exposure.
3. **(c) A two-second synth opening sound on the SoundGate tap.** High memorability, no step, no asset weight. It sits inside the existing ≥1.6 s wait and matches the chime decorated covers already play, so it unifies one "Ethos sound" across both paths. Respect mute; keep it under the music ceiling.
4. **(b, gate only) A wordmark on the SoundGate and loading seal.** Medium to high value, no step. It shows on every classic-cover gift, paid included, at the "emotional threshold", and is the framing a gift company would own. It does not touch the footer promise if it is framing rather than a footer. Leave the preview-card seal unbranded until the 16 Oct question is settled.
5. **(a, as an end-screen line) A small seal + "Ethos" beside "Made by {sender} for {recipient}".** High value, since it is the one permanent mark on every template with no layout collision. But it carries the **highest Terms risk** on paid gifts. Ship it on footer-on gifts and new gifts first, rewrite the pay panel and Terms, and treat legacy paid gifts under legal.ts:248.
6. **(d) Brand the reply button.** Low to medium value, no step. It touches the Terms and Spanish grammar, and "make one" is demo-only. Consider instead the unbuilt M11.2 line on paid end screens, which adds brand reach where today there is none.
7. **(f) Occasion capture.** Already one tap for senders, so the value is in surfacing it, not redesigning it. For recipients it cannot be zero-step under the consent model; keep it on the keep page.
8. **(b, card) and (e) a recipient share card.** Lowest priority. (e) always adds an action and competes with four end-screen buttons, and brand text in the card picture collides with the 16 Oct rule and the TikTok slide pipeline.
