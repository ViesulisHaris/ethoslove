# Dollar and pound prices: built, off until you say go

Written 25 Oct 2026 for the USA Meta test. Today everyone sees and pays €9.99, so the ads send
Americans to a euro price: it reads as a foreign shop, and many US cards add a ~3% foreign-transaction
fee. The code to fix that is ready and does nothing until one setting is switched on.

## What a visitor sees once it is on

| Where they are | One template | Three | Everything | Make it special | Ethos for Two | Game pack |
|---|---|---|---|---|---|---|
| United States (and its territories) | **$11.99** | $17.99 | $29.99 | $8.99 | $5.99 a month / $34.99 a year | $2.99 |
| United Kingdom (and IM, JE, GG) | **£8.99** | £12.99 | £21.99 | £6.49 | £4.49 / £25.99 | £2.49 |
| Everywhere else, all of Europe included | **€9.99** | €14.99 | €24.99 | €7.49 | €4.99 / €29.99 | €2.99 |

These are the amounts already in `src/lib/pricing/products.ts`. The visitor's country picks the price
everywhere a price appears: the editor's pay sheet (where the four ads land), template pages and the
price Google reads from them, the template cards (home page, gallery), the pricing page and /gifts,
game packs, Ethos for Two, the account page. Checkout charges exactly what the page showed. Receipts and emails already use the
currency charged. The Terms list all three prices and say "We charge in euros, or in US dollars if
you're in the United States and in pounds sterling if you're in the United Kingdom".

How it works: every page is built once per currency, and on each visit the site picks the copy for the
visitor's country (Vercel reports it). The address bar doesn't change, pages stay as fast as they are
now, and a cached page can't show one country's price to another.

## Money and tax

- **Stripe can do it.** A Latvian Stripe account can charge in 135+ currencies, dollars and pounds
  included. Card fees stay as they are: US cards are "international" (3.15% + €0.25) whatever the
  currency, UK cards 2.5% + €0.25.
- **Conversion: 2%.** Dollars and pounds are converted to euros before the payout, and Stripe charges
  2% of the amount for it. To avoid it, add a USD (and GBP) bank account in Stripe's payout settings
  (Wise gives account details in both) and turn on settlement in those currencies.
- **Per sale it comes out about the same.** At about $1.15 and £0.87 to the euro (check on the day):
  a US sale today leaves ≈ €9.43 after fees, and at $11.99 ≈ €9.64. A UK sale after UK VAT and fees
  leaves ≈ €7.83 today and ≈ €7.90 at £8.99.
- **Tax doesn't change.** Tax goes by where the buyer is, not the currency. Stripe Tax adds tax only
  where you're registered. With no US registration a US sale carries no sales tax, as today: the $11.99
  is all yours. UK VAT (20%) is still owed on every UK sale (option A, self-managed). Paying in pounds
  makes the HMRC return simpler: the VAT is the price ÷ 6, already in GBP, and Stripe Tax records it
  in pounds. EU sales stay at Latvian 21% inside €9.99. In the Latvian VAT return, US and UK sales go
  in row 48.2 as now, converted at the ECB rate.
- **Google mostly crawls from the US**, so search results will mostly show $11.99, to European
  searchers too. If that matters, crawlers can be kept on euros; say so.

## Checked, and not checked

- Checked: unit tests run the real proxy and checkout through to the Stripe session (US $11.99,
  Latvia €9.99, UK £8.99). Browser tests ran on a build with the currencies on: template page and its
  structured data, pricing page, the ads' landing page through to the checkout request. With the
  setting off, every country still sees €9.99.
- Not checked: the Stripe dashboard itself (no keys on this machine). `scripts/check-currencies.mjs`
  reads it without changing anything: the account's country, which currencies it has already charged
  in, whether Adaptive Pricing has been converting, the payout currencies and the tax registrations.

## To switch it on (your go)

1. Merge the branch. On its own it changes nothing anyone can see (everything stays in euros).
2. Vercel → Production → `NEXT_PUBLIC_PRICE_CURRENCIES` = `eur,usd,gbp`, and in the same deploy set
   `LEGAL_UPDATED` in `src/content/legal.ts` to that day, because the Terms change. Then redeploy (the
   setting only takes effect in a new build).
3. Check: `https://tryethos.io/llms.txt` lists all three prices, and from a US connection (a VPN)
   `/templates/bouquet` and the pay sheet show $11.99.
4. Put "$11.99" back into the four ads' text.

To undo: remove the setting and redeploy. Everyone is back on euros.

For anyone working on the code: every page moved one folder down, from `src/app/[locale]` to
`src/app/[currency]/[locale]` (docs/ARCHITECTURE.md). A branch that adds a page in the old folder gets
a merge conflict that names the new place.
