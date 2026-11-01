# Frictionless, trustworthy small digital purchases on mobile web (EU merchant selling to US, UK and Spanish buyers via Stripe)

> **Method note (read first).** Research date: 1 November 2026. Page fetching was blocked in this session for baymard.com, stripe.com and eur-lex.europa.eu. Those hosts must be allowed in the session's network settings before the pages can be fetched. Every figure below therefore comes from search-engine extracts of the cited pages, not from a full read of each page. Spot-check headline numbers on the primary page before quoting them externally. Vendor-published numbers (Stripe, SamCart, Superwall, RevenueCat, Ethoca and others) are labelled as vendor-reported. Anything dated before 2024 is flagged **[historical]**. This is research, not legal advice.

---

## 1. Baymard Institute checkout research (2025–2026): abandonment, reasons, mobile, trust

### Takeaway
Baymard puts the documented average cart abandonment rate at about 70%. Among shoppers who were ready to buy, the leading self-reported reasons are surprise extra costs (about 39–48% depending on the cut), not trusting the site with card details (about 18–19%), and forced account creation (about 18–24%). Baymard's 2025 benchmark finds most mobile checkouts still "mediocre" or worse. Its trust research says reassurance at payment comes mostly from clarity and predictability, with badges a secondary help.

### Cited Findings
**Abandonment rate**
- Baymard's cart-abandonment list page shows an average documented online cart abandonment rate of **70.22%**, last updated **22 September 2025**. The page is now titled "50 Cart Abandonment Rate Statistics 2026". — [Baymard, Cart Abandonment Rate list](https://baymard.com/lists/cart-abandonment-rate)
- Secondary sites cite **70.19%** as Baymard's 2025 average across 49 studies. The small difference from 70.22% reflects different update rounds. — [Germain UX (secondary)](https://germainux.com/?p=22360); [Baymard list](https://baymard.com/lists/cart-abandonment-rate)
- **42%** of US online shoppers say they have abandoned a cart because they were "just browsing / not ready to buy". Baymard's reason percentages exclude this group. — [Baymard list](https://baymard.com/lists/cart-abandonment-rate)

**Top reasons (US adults, excluding "just browsing" unless noted)**
- **Extra costs too high** (shipping, tax, fees): **39%** in one Baymard summary and **40%** on the 2026 statistics list. When the "just browsing" group is excluded, Baymard reports **48%**. — [Baymard, Reduce cart abandonment](https://baymard.com/blog/reduce-cart-abandonment); [Baymard list](https://baymard.com/lists/cart-abandonment-rate)
- **"I didn't trust the site with my credit card information"**: **19%** on the 2026 list and **18%** on the UX-statistics page. — [Baymard list](https://baymard.com/lists/cart-abandonment-rate); [Baymard, 40+ UX statistics](https://baymard.com/blog/ux-statistics)
- **Forced account creation**: **19%** on the current blog, and **18%** in a survey of 1,026 US adults. A **2022** study of 4,384 respondents found **24%** abandoned at least one cart in the past quarter "solely" because of forced account creation **[historical]**. — [Baymard, Reduce cart abandonment](https://baymard.com/blog/reduce-cart-abandonment); [Baymard, Audit checkout for hidden friction](https://baymard.com/blog/audit-checkout-flow-hidden-friction); [Baymard, Make guest checkout prominent](https://baymard.com/research-articles/make-guest-checkout-prominent)
- **Couldn't see the total order cost up front**: **14%**. — [Baymard, Reasons for cart abandonment](https://baymard.com/research-articles/ecommerce-checkout-usability-report-and-benchmark)
- **Site didn't offer the desired payment method**: **10%**. — [Baymard, Payment UX](https://baymard.com/blog/payment-ux)
- Other reasons in secondary summaries attributed to Baymard include "long or confusing checkout" (**~18%**) and delivery too slow (**~21%**). Delivery speed is a physical-goods reason. Percentages differ between summaries because of survey wording and whether "just browsing" is excluded. — [growthsuite (secondary)](https://www.growthsuite.net/blog/data-driven-top-reasons-abandonment-2025); [Baymard list](https://baymard.com/lists/cart-abandonment-rate)

**Mobile and benchmark findings**
- In "Checkout UX Best Practices 2025", **63% of mobile sites** score "mediocre" or worse on checkout UX, as do **46% of mobile apps**. The article is based on 41,000+ checkout performance scores and was updated **25 November 2025**. — [Baymard, Checkout UX 2025](https://baymard.com/research-articles/current-state-of-checkout-ux)
- **62%** of sites fail to make "Guest Checkout" the most prominent option (2025 benchmark). The 2023 round reported **47%**. These are different benchmark rounds, so they don't show a clean trend. — [Baymard, Checkout UX 2025](https://baymard.com/research-articles/current-state-of-checkout-ux); [Baymard, Make guest checkout prominent](https://baymard.com/research-articles/make-guest-checkout-prominent)
- **54%** of sites don't wait until the order-confirmation step to offer account creation (March 2025 article). — [Baymard, Delayed account creation](https://baymard.com/research-articles/delayed-account-creation)
- **65%** of sites don't avoid overly complex password rules (2025). Another Baymard article says **82%** require unnecessarily complex passwords. The two Baymard articles conflict. — [Baymard, Password requirements](https://baymard.com/research-articles/password-requirements-and-password-reset)
- **Over 70%** of respondents in a Baymard survey were reluctant to give a phone number at checkout, which Baymard ties to privacy concerns. — [Baymard, Perceived security](https://baymard.com/blog/perceived-security-of-payment-form)
- Mobile versus desktop abandonment (non-Baymard, directional): many 2025 aggregators report mobile at **~80–86%** and desktop at **~66–73%**. OptiMonk reports mobile **69.02%** versus desktop **62.11%**, and Statista-based US data shows a gap of about 10 points. One UK source gives mobile conversion of **2.85%** versus **3.9%** on desktop (unconfirmed). — [Statista](https://www.statista.com/statistics/457078/cart-abandonment-rate-worldwide); [OptiMonk](https://www.optimonk.com/shopping-cart-abandonment-statistics?web=1); [wisernotify (aggregator)](https://wisernotify.com/blog/mobile-commerce-stats/)

**Trust seals and reassurance on an unknown site**
- Users feel less secure when the card fields don't look more protected than the rest of the form. Baymard recommends visually reinforcing the card-field area, and seals placed near the card fields help. — [Baymard, How users perceive security during checkout](https://baymard.com/blog/perceived-security-of-payment-form)
- In Baymard's site-seal test of **8 seals**, some seals inspired more confidence than others. The study is listed under **2016** and reportedly updated with a **2023** test, so its date is unclear **[historical]**. — [Baymard, Perceived security](https://baymard.com/blog/perceived-security-of-payment-form)
- Baymard's payment-UX guidance says trust at the payment step "is not necessarily about badges and icons (though those can help), but about reducing ambiguity". It points to clarity, predictability and transparency instead. — [Baymard, Payment UX](https://baymard.com/blog/payment-ux)
- A non-Baymard summary of the 19% figure says the trust concern is especially strong for "unfamiliar brands, unusual domains, inconsistent branding". This is a design-studio blog, not Baymard data. — [btng.studio (secondary)](https://www.btng.studio/articles/trust-signals-checkout-abandonment/)

### Inferences
- For a €3–15 digital good with no shipping, the biggest Baymard cause (extra costs) appears as a different risk: a price or extra the buyer didn't expect when they reach the paywall. The 14% "couldn't see total cost up front" finding points the same way.
- The "didn't trust the site with my card" reason (about 1 in 5 abandoners) is the one most affected by brand consistency, a recognisable payment surface and a well-known wallet. A third-party-looking payment page or an unfamiliar merchant name raises the ambiguity Baymard identifies as the main trust killer.
- Badges are secondary. A known wallet sheet such as Apple Pay or Google Pay is itself a strong trust signal, because the card number is never typed into the unknown site.

### Gaps
- I couldn't fetch the Baymard pages to confirm survey dates and sample sizes for the 2026 list reasons. I found no 2025–2026 Baymard study of trust seals on mobile specifically, and none on "unknown merchant" perception.
- Baymard's often-quoted "35% conversion gain from better checkout design" figure wasn't confirmed in this research.
- Baymard data is dominated by physical-goods retail. I found no Baymard data specific to low-price one-off digital goods.

---

## 2. Express wallets and one-click: Apple Pay, Google Pay, Stripe Link; Checkout vs Payment Element vs Express Checkout Element; wallets first; guest checkout

### Takeaway
Stripe's own studies, all vendor-reported, attribute conversion lifts of about 7.8–22% to offering Apple Pay. Stripe also reports roughly 2x when Apple Pay is surfaced early through the Express Checkout Element rather than at the end of checkout, and 7–14% from Link for returning or logged-in users. Independent controlled evidence is thin, and one fundraising case saw negligible Link uptake. Stripe's guidance is consistent: show wallets at the top, default to them on capable devices, and don't force accounts.

### Cited Findings
**Apple Pay and Google Pay**
- Stripe holdback tests across 50+ payment methods: among eligible checkouts, global businesses offering **Apple Pay saw +22.3% conversion and +22.5% revenue** on average (vendor-reported). — [Stripe blog, Testing the conversion impact of 50+ global payment methods](https://stripe.com/blog/testing-the-conversion-impact-of-50-plus-global-payment-methods)
- On the same page, businesses saw an **average 2x increase in conversion** when Apple Pay was shown via the **Express Checkout Element** rather than at the end of checkout. No methodology was found for this figure. — [Stripe blog](https://stripe.com/blog/testing-the-conversion-impact-of-50-plus-global-payment-methods)
- A Stripe Sessions **2024** talk reported a **10%** statistically significant conversion uplift from adding Apple Pay in an A/B test. The same talk gave a **7.8%** conversion increase from another analysis. — [Stripe Sessions 2024, "A look under Stripe's hood"](https://stripe.com/sessions/2024/a-look-under-stripes-hood-using-data-to-demystify-payments)
- Stripe's Apple Pay best practices: show the button on product detail, product list and search pages for customers with Apple Pay set up; don't show it in a disabled state; **default to Apple Pay** and pre-select it on compatible devices. They cite **Wish's A/B test: "2X higher conversion rate increase" from defaulting to Apple Pay**. — [Stripe docs, Apple Pay best practices](https://docs.stripe.com/apple-pay/best-practices)
- Stripe's mobile payment-page guidance says wallet buttons should sit **at the top of the payment section**, not at the bottom. — [Stripe, Mobile payment page design tips](https://stripe.com/en-fr/resources/more/mobile-payment-page-design-tips)

**Stripe Link**
- In an A/B test on businesses with many repeat customers, offering Link gave an **average +14% returning-user conversion uplift** (vendor-reported). — [Stripe newsroom, Optimized checkout 10.5% more revenue](https://stripe.com/newsroom/news/payments-revenue-uplift); [Stripe docs, Link](https://docs.stripe.com/payments/link)
- A global checkout study cited by Stripe found Link raises conversion by **over 7% for logged-in Link customers**. This is a different analysis from the 14% figure. — [Stripe, Link product page](https://stripe.com/en-ca/payments/onelink)
- Stripe's Link page claims reach of **"over 200 million consumers"** (undated). A third-party summary of a Sessions keynote reports **250M+** (year unconfirmed). — [Stripe Link](https://stripe.com/in/link); [createwith (secondary)](https://www.createwith.com/tool/stripe/updates/stripe-unveils-over-200-product-updates-at-sessions)
- In a Stripe Sessions **2025** talk, consumers can check out "three times faster" with Link, and Klarna was being piloted on Link for wider release that summer. — [Stripe Sessions 2025, "Link: The consumer network built by all of us"](https://stripe.com/it-ch/sessions/2025/link-the-consumer-network-built-by-all-of-us)
- Case studies (vendor-hosted): **TicketSocket +10%** conversion with Link; **RushOrderTees +3.50%** after moving to Stripe's Optimized Checkout Suite. — [casestudies.com, TicketSocket](https://www.casestudies.com/company/stripe/case-study/ticketsocket-increases-conversion-rates-by-10-with-link); [casestudies.com, RushOrderTees](https://www.casestudies.com/company/stripe/case-study/rushordertees-boosts-conversion-rate-350-with-stripes-optimized-checkout-suite)
- **Contrary evidence:** FundraiseUp tested Link on donation checkout. Only **just over 1%** of donors chose it, and the revenue impact was "minimal". — [FundraiseUp experiment](https://fundraiseup.com/experiments/stripe-link-in-checkout)
- Link is **not supported in webviews for the Express Checkout Element**, which matters for in-app browsers. — [Stripe docs, Express Checkout Element](https://docs.stripe.com/elements/express-checkout-element)

**Integration choice (Stripe Checkout vs Payment Element vs Express Checkout Element)**
- The Express Checkout Element is a single component that shows one-click buttons (Apple Pay, Google Pay, Link, PayPal and others), and the default ordering can be overridden. Button wording is configurable via `buttonType`, for example `applePay: 'buy'`. — [Stripe docs, Express Checkout Element](https://docs.stripe.com/elements/express-checkout-element); [Stripe docs, Accept a payment with ECE](https://docs.stripe.com/elements/express-checkout-element/accept-a-payment)
- The legacy **Payment Request Button is deprecated** ("only available in Stripe.js dahlia and earlier"), and Stripe says to use the Express Checkout Element instead. — [Stripe docs, Payment Request Button](https://docs.stripe.com/stripe-js/elements/payment-request-button)
- **Payment Element migration**: in a matched-cohort study of 5,000 businesses per group, businesses that migrated saw **+10.5% revenue** relative to matched non-migrators. Stripe notes this "may include the impact of other unobserved changes", so it is observational, not randomised. — [Stripe newsroom](https://stripe.com/newsroom/news/payments-revenue-uplift)
- Stripe Checkout shows the business name from Business details by default, and the header shows an icon or logo. Checkout can be overridden with `branding_settings.display_name` (see section 3). — [Stripe docs, Checkout appearance](https://docs.stripe.com/payments/checkout/customization/appearance)
- **[historical, 2022]** Stripe's European checkout report: **86%** of shoppers would be very likely to abandon if their preferred payment method wasn't available. — [Stripe, State of European checkouts 2022](https://stripe.com/nl/guides/state-of-european-checkouts-2022)

**Guest checkout**
- 62% of sites don't make guest checkout the most prominent option, and 19% of shoppers abandon when forced to create an account (see section 1). — [Baymard, Checkout UX 2025](https://baymard.com/research-articles/current-state-of-checkout-ux); [Baymard, Reduce cart abandonment](https://baymard.com/blog/reduce-cart-abandonment)

### Inferences
- The Stripe Apple Pay figures (7.8%, 10%, 22.3%, "2x") aren't mutually consistent and come from different methods. A defensible planning range for "wallet offered versus not" is a single- to low-double-digit relative lift. The largest effects are tied to placement (wallet first, defaulted) rather than mere availability.
- Link's measured gains are concentrated among returning and logged-in Link users. For a gift product bought once or twice a year by mostly first-time buyers, Link's main value is likely the existing Stripe-network user who is recognised by email or phone, not repeat use. The FundraiseUp result shows uptake can be tiny in some contexts.
- Many gift senders will arrive from social links. Link not working in ECE webviews, and wallet behaviour in in-app browsers generally, is a practical risk worth testing on Instagram, TikTok and WhatsApp in-app browsers.
- Stripe Checkout bundles dynamic wallets, Link and localisation with no custom UI. Payment Element plus ECE gives more control over brand presence on the page. No published head-to-head conversion comparison of the three was found.

### Gaps
- No independent (non-Stripe) controlled study of Apple Pay or Google Pay lift on mobile web for digital goods in 2024–2026 was found. No published Google Pay-specific Stripe lift figure was found.
- No Stripe study comparing hosted Checkout, embedded Checkout and Elements conversion was found.
- Stripe's methodology for the "2x with Express Checkout Element" claim wasn't found.

---

## 3. Merchant name consistency: checkout page, wallet sheet and bank statement vs brand

### Takeaway
Stripe controls three separate customer-visible names: the Checkout header (business name, overridable with `branding_settings.display_name`), the business name in terms and receipts, and the card statement descriptor (a 2–10 character static prefix plus a dynamic suffix, 22 characters in total). Mismatches feed "unrecognised transaction" disputes, which industry sources put among the main drivers of first-party ("friendly") fraud, roughly 40–45% of chargebacks in recent vendor surveys. Most quantification is vendor-reported.

### Cited Findings
**What Stripe shows where**
- Checkout shows the business name from Business details. `branding_settings.display_name` overrides it, but "this only shows at the top of the Checkout page, and your business name still appears in terms, receipts, and other places". — [Stripe docs, Checkout Session create / appearance](https://docs.stripe.com/api/checkout/sessions/create?javascript=false&lang=php); [Stripe docs, Customize appearance](https://docs.stripe.com/payments/checkout/customization/appearance)
- The Dashboard account name is internal only. The statement descriptor, set under Settings → Business settings → Public details, controls what appears on card statements and email receipts. — [Stripe support, Update account name](https://support.stripe.com/questions/update-account-name-shown-in-the-dashboard); [Stripe support, What is a statement descriptor](https://support.stripe.com/questions/what-is-a-statement-descriptor-and-how-do-i-update-it)
- The customer portal name comes from the public business information. — [Stripe docs, Configure customer portal](https://docs.stripe.com/customer-management/configure-portal)

**Statement descriptor mechanics**
- The card descriptor is a **static prefix of 2–10 characters** (the "shortened descriptor" in the Dashboard) plus a **dynamic suffix**. The concatenated string, including the `*` and space, must not exceed **22 characters**, and networks receive only the first 22. Example from the docs: prefix `RUNCLUB` (7) leaves 13 for the suffix. If no shortened descriptor is set, Stripe truncates the account descriptor to form the prefix. — [Stripe docs, Statement descriptors](https://docs.stripe.com/get-started/account/statement-descriptors)
- The suffix is set per payment with `statement_descriptor_suffix` on PaymentIntents or Checkout Sessions, for **card payments only**. — [Stripe docs, Statement descriptors](https://docs.stripe.com/get-started/account/statement-descriptors)
- The shortened descriptor **must reflect the DBA, URL or legal entity name**, uses Latin characters only, and can't be a generic description such as "INSURANCE". Stripe runs a matching algorithm against DBA, URL and legal name. The support article gives 5–22 characters for the full descriptor. — [Stripe support, What is a statement descriptor](https://support.stripe.com/questions/what-is-a-statement-descriptor-and-how-do-i-update-it)
- Stripe may ask a business to change a descriptor that "could lead to customer confusion". Some banks display a friendlier merchant name or logo instead of the descriptor, and mis-mappings must be fixed by the issuer. Stripe gives an opaque descriptor such as "WC*WDGPUR" as an example of one that leads to non-recognition and disputes. — [Stripe support, Why customers see descriptors that don't match](https://support.stripe.com/questions/why-do-customers-see-statement-descriptors-that-don-t-match-what-i-ve-set-in-stripe); [Stripe support, Update business name on statements](https://support.stripe.com/questions/update-business-name-shown-on-customer-bank-statements)

**Unrecognised descriptors, friendly fraud and disputes**
- Chargebacks911's **2026** Field Report (250+ merchants) puts friendly fraud at **43.8%** of chargebacks. Its own internal data says **86%** of the chargebacks it handles stem from friendly fraud (vendor). — [Digital Transactions](https://www.digitaltransactions.net/nearly-44-of-chargebacks-are-labeled-friendly-fraud-finds-a-chargebacks911-report/)
- Secondary sources attribute "over 45%" friendly fraud to Mastercard's *State of Chargebacks 2025*. This couldn't be confirmed against the Mastercard report. — [Flagright (secondary)](https://www.flagright.com/post/chargeback-economics-for-payment-processors)
- Juniper Research (via secondary press) counts **158 million** consumer disputes in 2025, **up 29%** from 2021. — [edgex (secondary)](https://pro.edgex.exchange/en-US/news/article/friendly-fraud-chargeback-abuse-small-businesses)
- In Ethoca's (Mastercard) **2024** Digital Banking Trends Report, **79%** of surveyed consumers said they had reported an unrecognised transaction to their bank. Ethoca calls "transaction confusion" a top reason disputes are rising. — [Ethoca blog, Transaction clarity](https://www.ethoca.com/blog/transaction-clarity-helps-reduce-disputes-credit-card-chargebacks)
- Mastercard-sponsored Javelin research reportedly found **75%** of consumers go directly to the issuer to dispute, bypassing the merchant. This surfaced in the same search cluster as the Ethoca material, and the exact page wasn't pinned down, so verify before quoting. — [Ethoca blog](https://www.ethoca.com/blog/transaction-clarity-helps-reduce-disputes-credit-card-chargebacks)
- Visa Acceptance Solutions, citing Verifi internal reporting from **November 2024**, reportedly says Order Insight deflected an average **40–45%** of confirmed first-party-misuse disputes, and up to **90%** for some subscription merchants. Order Insight shares order details with the issuer so the cardholder recognises the purchase. This is vendor data, surfaced via secondary chargeback-alert comparisons, and the primary Visa page wasn't located. — [2accept, Verifi RDR vs Ethoca vs Order Insight](https://www.2accept.net/blog/verifi-rdr-vs-ethoca-alerts-vs-order-insight); [BeastInsights, Verifi vs Ethoca](https://beastinsights.com/blog/verifi-vs-ethoca-alerts)
- **[historical, 2021]** An Ethoca brochure says "1 in 4" transaction disputes result from friendly fraud, and describes the benign end as consumers genuinely not recognising a charge. — [Ethoca brochure 2021](https://www.ethoca.com/sites/default/files/documents/BROCHURE%20-%20How%20Ethoca%20Fight%20Disputes,%20Chargebacks%20and%20Fraud%20(2021).pdf)
- Consultancy and operator estimates (unverified): about a quarter of "unrecognised transaction" chargebacks trace to an unrecognised descriptor, and a clear descriptor cuts those by **20–40%**. "Unrecognised" reason codes typically run **5–10%** of disputes, and **>20%** signals a descriptor problem. — [Global Payments Consultants](https://www.globalpaymentsconsultants.com/post/billing-descriptor-best-practices); [paymentsandrisk.com](https://paymentsandrisk.com/docs/reference/benchmarks/)

**Buyer trust at the moment of payment**
- Adyen's **2026** Hong Kong Retail Index (YouGov, March–April 2026): **26%** would abandon and avoid the retailer after a payment issue, and checkout is described as "the ultimate trust barrier". This is APAC data. — [MarketScreener, Adyen Index 2026](https://www.marketscreener.com/news/2026-adyen-index-hong-kong-retailers-embrace-ai-but-checkout-remains-the-ultimate-trust-barrier-ce7f5ed8d18cf227)
- Adyen argues that control over branding and layout in the payment step makes the customer trust the environment (vendor opinion). — [Adyen, Reduce cart abandonment](https://www.adyen.com/en_GB/knowledge-hub/5-steps-to-increase-your-checkout-conversions)

### Inferences
- If a buyer starts on one brand, sees a different company name at the payment step, and later sees a third string on the statement, three of Baymard's ambiguity triggers stack at once. The payment-step mismatch hurts conversion, because it falls inside the 19% "didn't trust with card" risk. The statement mismatch hurts disputes and refunds after the sale.
- Because `display_name` changes only the Checkout header, a fully consistent experience likely needs the public business name or DBA (terms, receipts, portal) and the shortened descriptor (statement prefix) set to the brand too, not only the header override.
- Gift purchases have an extra risk. The buyer may not remember a small charge weeks later, and a partner or family member sharing the card may see it. A brand-recognisable descriptor plus a receipt that names the product reduces "I don't recognise this" calls to the bank.

### Gaps
- I couldn't confirm what name Stripe passes to the **Apple Pay and Google Pay payment sheets** ("Pay [name]") for Checkout or ECE, or whether `display_name` affects it.
- No independent, non-vendor study quantifying the conversion cost of a payment page showing a different company name from the brand was found.
- No primary Visa or Mastercard figure on the share of disputes that are "unrecognised descriptor" was found.

---

## 4. Paywall timing for creative tools: make first and pay at the end, or pay first?

### Takeaway
Lab evidence strongly supports letting people build before paying. Self-made and self-designed objects command higher willingness to pay (a 63% premium in the IKEA-box study, with the effect mediated by accomplishment), but **only when the work is completed**. App-industry data supports paywalls triggered right after a value moment or at a gated, high-intent action such as export. It also shows most conversions happen in the first session. The countervailing evidence is that surprise costs at the end are the top abandonment reason, so pay-at-end works best when the price was visible from the start.

### Cited Findings
**Academic: effort, ownership and valuation**
- **IKEA effect** (Norton, Mochon & Ariely, *Journal of Consumer Psychology* 22(3): 453–460, **2012**) **[historical, foundational]**: participants who assembled a plain IKEA storage box were willing to pay a **63% premium** over people offered the identical pre-assembled box (N = 52, incentive-compatible bids). — [Norton, Mochon & Ariely 2012 (Harvard DASH PDF)](https://dash.harvard.edu/bitstreams/7312037d-2473-6bd4-e053-0100007fdf3b/download)
- People who folded their own origami valued it far above non-builders' valuations of the same object (about **5x** per secondary sources), and builders overestimated what others would pay. — [Psychology Today](https://www.psychologytoday.com/intl/blog/make-your-mind/201209/the-ikea-effect-why-we-cherish-things-we-build)
- **Completion is required**: the effect "dissipated" when participants built and then destroyed their creations, or failed to complete them. Effort without completion did not raise valuation. — [Norton, Mochon & Ariely (Harvard DASH, third-round manuscript)](https://dash.harvard.edu/bitstream/handle/1/12136084/norton%20mochon%20ariely%20third%20round[1].pdf); [SSRN abstract](https://papers.ssrn.com/abstract=1777100)
- **"I designed it myself" effect** (Franke, Schreier & Kaiser, *Management Science* 56(1): 125–140, **2010**) **[historical, foundational]**: across five experiments, self-designed products generated significantly higher willingness to pay, beyond preference fit and effort. The effect is **mediated by feelings of accomplishment** and moderated by the outcome and the person's perceived contribution. The authors conclude toolkits shouldn't only minimise effort. — [Franke, Schreier & Kaiser 2010 (WU Vienna PDF)](https://www.wu.ac.at/fileadmin/wu/d/i/entrep/4_forschung/full-text-papers/franke_schreier_kaiser_2010_designed_it_myself.pdf); [RePEc](https://econpapers.repec.org/RePEc:inm:ormnsc:v:56:y:2010:i:1:p:125-140)
- **Endowment effect** (Kahneman, Knetsch & Thaler, *Journal of Political Economy* 98(6): 1325–1348, **1990**) **[historical, foundational]**: willingness to accept greatly exceeds willingness to pay. In the mug experiments, sellers asked roughly **2x** what buyers offered (per secondary sources). — [Kahneman et al. 1990 (MIT PDF)](https://web.mit.edu/curhan/www/docs/Articles/15341_Readings/Behavioral_Decision_Theory/Kahneman_et_al_1990_Experimental_tests.pdf); [Wikipedia (secondary)](https://en.wikipedia.org/wiki/Endowment_effect)

**App industry: paywall data**
- RevenueCat *State of Subscription Apps* **2026** (about 115k apps): **hard paywall** median Day-35 trial-to-paid **10.7%** versus **2.1% freemium**. The top decile of hard-paywall apps reaches **38.7%**. Revenue per install by Day 60 is **$3.09** for hard paywalls versus **$0.38** for freemium. One-year retention of yearly subscribers is about equal (27% versus 28%). The 2025 report had **12.1% versus 2.2%**, so the gap is narrowing. — [RevenueCat SOSA 2026](https://www.revenuecat.com/state-of-subscription-apps); [RevenueCat blog, 2026 benchmarks](https://www.revenuecat.com/blog/growth/subscription-app-trends-benchmarks-2026)
- RevenueCat 2025 data, via secondary write-ups: **~82%** of trials across paid apps start on **Day 0** (85% for business apps). A RevenueCat post cites **89.4%** Day-0 trial starts and argues for showing the paywall in the first session after one value moment. — [SaaStr](https://www.saastr.com/of-trials-start-on-day-0-dont-waste-your-shot); [Airbridge](https://www.airbridge.io/en/blog/paywall-conversion-structural-decisions)
- Superwall guidance: "The highest-converting paywalls appear after users experience real value". Identify the "aha" moment and trigger the paywall shortly after it. Feature-gate paywalls get fewer views but "much higher conversion (intent is high)". Onboarding paywalls get the most views and the biggest absolute revenue. Superwall recommends judging timing on lifetime revenue rather than day-one conversion (vendor). — [Superwall, Best practices](https://superwall.com/blog/superwall-best-practices-winning-paywall-strategies-and-experiments-to); [Superwall, Paywall growth lever framework](https://superwall.com/blog/the-paywall-growth-lever-framework-how-to-build-smarter-experiments-faster); [Superwall, Revenue attribution](https://superwall.com/features/paywall-revenue-attribution)
- RevenueCat on contextual targeting: a dating app cut paywall prompt volume by about half and saw an **81% lift** on its primary offer flow (vendor case). — [RevenueCat, Contextual paywall targeting](https://www.revenuecat.com/blog/growth/contextual-paywall-targeting.md)
- Creative apps commonly place the paywall at **export or watermark removal**, "the moment of creative completion" (opinion pieces, no controlled data). A conflicting claim that upfront paywalls convert **5.5x** better across 1,240 apps is anecdotal and onboarding-focused. — [PaywallPro on DEV, photo/video paywalls](https://dev.to/paywallpro/why-photo-video-apps-have-the-best-paywalls-in-the-app-store-5837); [PaywallPro on DEV, timing paradox](https://dev.to/paywallpro/the-paywall-timing-paradox-why-showing-your-price-upfront-can-5x-your-conversions-4alc)
- Repeated paywall exposure can lower conversion and raise churn (vendor opinion). — [Nami](https://nami-website-5aq.pages.dev/blog/paywall-fatigue-is-the-next-growth-ceiling-for-subscription-apps-in-2026)

**What friction at the paywall hurts most (checkout evidence)**
- Surprise extra costs (39–48%) and not seeing the total up front (14%) are top abandonment reasons (see section 1). — [Baymard list](https://baymard.com/lists/cart-abandonment-rate); [Baymard reasons](https://baymard.com/research-articles/ecommerce-checkout-usability-report-and-benchmark)

### Inferences
- The research converges on "make, finish, then pay". Lab work says completion is the trigger for the valuation boost, and Superwall/RevenueCat data says high-intent gated actions convert best. For a gift editor, the natural paywall moment is publish or send, after a complete preview exists, not mid-edit.
- How much effort before the paywall is optimal? No study gives a number. The evidence suggests enough effort for the creation to feel finished and "mine" (accomplishment and perceived contribution), but not so much that the paywall feels like a trap. The price must be known before investing, or the end-paywall becomes Baymard's "unexpected cost".
- Most paying intent is expressed in the first session (Day-0 data). Paywall friction at that moment (account creation, long forms, an unfamiliar payment brand, extra checkboxes) is likely costlier than friction earlier in the flow.
- Subscription-app data (trial-to-paid) isn't directly comparable to one-off €3–15 purchases. Use it for direction, not benchmarks.

### Gaps
- No published conversion data from Canva, CapCut or Lensa on pay-to-export versus pay-first was found.
- No controlled study of the optimal amount of effort before a paywall in creative tools was found.
- No RevenueCat or Superwall breakdown for photo, video or creative categories, or for one-off web purchases, was found.

---

## 5. Price presentation and add-ons: upsells and order bumps for small digital goods

### Takeaway
Order-bump "take rates" of roughly 15–40% and AOV lifts of 30%+ are widely quoted, but almost entirely by vendors that sell checkout tools. No independent study shows whether bumps reduce primary checkout conversion for €3–15 mobile purchases. Practitioners warn to judge by revenue per checkout visitor, not take rate. EU law requires any paid extra to be an express opt-in, never pre-ticked.

### Cited Findings
- SamCart (vendor, "$7B+" processed): sellers using order bumps "consistently see a **30%+** increase in their average order value". Its example has a **$47 bump converting at 56%** versus a **$97 post-purchase upsell at 6.87%**, and a worked example assumes a 35% take rate without showing data. — [SamCart, Complete guide to order bumps](https://www.samcart.com/blog/the-complete-guide-to-order-bumps); [SamCart, Increase AOV](https://www.samcart.com/blog/how-to-increase-average-order-value)
- CartFlows (vendor): bump acceptance is **15–40%** depending on relevance. JVZoo (vendor): **$10–27** bumps see about **30%** take rates. Focus Digital (agency, thin method): information-product upsell conversion **31.2%** (2025). Another benchmark: upsell take rates for digital products are **10–20%**. — [CartFlows](https://cartflows.com/blog/order-bump/); [JVZoo blog](https://blog.jvzoo.com/order-bumps-the-easiest-30-revenue-increase-youre-not-taking/); [Focus Digital 2025](https://focus-digital.co/average-upsell-conversion-rate-2025-report/); [assetacademy](https://assetacademy.io/offers/offer-types/order-bump-vs-upsell/)
- Practitioner caution: "a bump with a high take rate and a falling checkout conversion rate is a bad bump". Measure revenue per checkout visitor, and test against your own prior version. — [upsellwp](https://upsellwp.com/blog/order-bump-vs-upsell/); [tagada glossary](https://www.tagada.io/glossary/order-bump)
- **EU constraint:** Article 22 CRD requires the consumer's **express consent** to any payment beyond the main price. If consent is inferred from default options the consumer must reject, the consumer is entitled to a refund. **Pre-ticked boxes may not be used.** UK guidance says leaving a default tick, or having to tick to opt out, isn't express consent. — [Directive 2011/83/EU Art. 22 (legislation.gov.uk copy)](https://www.legislation.gov.uk/eudr/2011/83/article/22/data.htm); [EU e-Justice summary](https://webgate.ec.europa.eu/e-justice/639/EN/consumer_rights_directive_201183); [GOV.UK, Consent for additional charges](https://www.gov.uk/government/publications/getting-consent-for-additional-charges-when-selling-online/getting-consent-for-additional-charges-when-selling-online)
- Surprise costs at checkout are the top abandonment reason (Baymard, section 1). — [Baymard list](https://baymard.com/lists/cart-abandonment-rate)

### Inferences
- At a €7.55 average order, a bump priced near the base price (for example €2–4) can raise AOV, but it also adds a decision at the moment of highest friction sensitivity on a small screen. Placing extras in the editor, where they are chosen as part of making the gift, is more consistent with the Baymard and IKEA evidence than adding a checkout-step decision.
- Post-purchase one-tap upsells (after payment, using the saved wallet) avoid putting the primary conversion at risk. Stripe off-session or one-click re-charges may need SCA in the EEA. This isn't verified here.

### Gaps
- No independent (non-vendor) A/B evidence on order bumps for low-price digital goods, or on mobile, was found.
- No data on whether an EU-compliant unticked add-on checkbox changes take rate versus vendor norms was found.

---

## 6. EU rules that add steps: withdrawal waiver for digital content, button wording, SCA, and keeping them to one tap

### Takeaway
To unlock digital content immediately without a 14-day withdrawal exposure, an EU trader needs (i) the consumer's prior express consent to immediate supply, (ii) the consumer's acknowledgement that they lose the withdrawal right, and (iii) confirmation of both on a durable medium. The Commission accepts consent and acknowledgement given together on the purchase page through a positive action. The final button must unambiguously signal payment ("buy now" or "pay now" are accepted examples). Low-value (≤€30) remote card payments can be exempted from SCA at the issuer's discretion, US-issued cards are out of scope (one-leg-out), and wallets carry built-in authentication. A new EU "withdrawal button" applies from 19 June 2026, but only where a withdrawal right exists.

### Cited Findings
**Correction on dates and instruments**
- The **Omnibus Directive** is Directive (EU) **2019/2161**. Its amendments to the CRD applied from **28 May 2022**, including the digital-content withdrawal exception and the trader's right to block use after withdrawal. The **2023** change is a separate instrument, Directive (EU) **2023/2673** (the withdrawal button; see below). — [CMS (Italian implementation)](https://cms.law/en/ita/publication/right-of-withdrawal-and-new-obligations-for-businesses-implementation-of-the-omnibus-directive); [activelaw.de](https://www.activelaw.de/en/news/online-handler-aufgepasst-das-andert-sich-ab-mai-im-widerrufsrecht)

**Article 16(m): digital content not on a tangible medium**
- The withdrawal right doesn't apply once performance has begun **where the contract places the consumer under an obligation to pay**, provided: (i) the consumer gave **prior express consent** to begin during the withdrawal period, (ii) the consumer **acknowledged** they thereby lose the right, and (iii) the trader provided **confirmation** in line with Article 7(2) or 8(7). — [Commission Notice on the CRD, OJ C 525/2021](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ%3AC%3A2021%3A525%3AFULL); [Directive 2011/83/EU Art. 16 (legislation.gov.uk copy, pre-Omnibus text)](https://legislation.gov.uk/eudr/2011/83/article/16/data.pdf)
- If consent, acknowledgement or confirmation is missing, the consumer can withdraw and bears no cost for the digital content supplied (Article 14(4)(b)). — [Directive 2011/83/EU Chapter III (legislation.gov.uk copy)](https://www.legislation.gov.uk/eudr/2011/83/chapter/III/data.pdf); [CMS](https://cms.law/en/ita/publication/right-of-withdrawal-and-new-obligations-for-businesses-implementation-of-the-omnibus-directive)
- Commission guidance says consent and acknowledgement require a **"positive action"** by the consumer, and **can be obtained at the same time**, for example on the purchase page. — [Commission Notice OJ C 525/2021](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ%3AC%3A2021%3A525%3AFULL); [iubenda summary](https://www.iubenda.com/en/help/155124-understanding-the-right-of-withdrawal-in-the-eu-a-guide-for-online-businesses)
- The trader's contract confirmation on a durable medium (for example, the receipt email) must include confirmation of the consent and acknowledgement. — [Commission Notice OJ C 525/2021](https://eur-lex.europa.eu/legal-content/EN/TXT/HTML/?uri=OJ%3AC%3A2021%3A525%3AFULL)
- Under the Omnibus-amended rules, after a withdrawal the trader may prevent further use of the digital content, for example by deactivating access. — [CMS](https://cms.law/en/ita/publication/right-of-withdrawal-and-new-obligations-for-businesses-implementation-of-the-omnibus-directive)
- The Commission adopted a new CRD interpretation **Notice on 17 December 2021**, replacing the 2014 guidance. — [Osborne Clarke](https://marketinglaw.osborneclarke.com/advertising-regulation/new-guidance-from-brussels-on-consumer-rights-directive/)

**Article 8(2): the "button solution"**
- If the order is placed by activating a button, it must be labelled **only** with "order with obligation to pay" **or a corresponding unambiguous formulation**. If not, the consumer isn't bound. — [Covington, Inside Privacy](https://www.insideprivacy.com/consumer-protection/cjeu-clarifies-online-order-buttons-must-indicate-that-the-consumer-is-assuming-an-obligation-to-pay/)
- The Commission's 2021 Notice treats **"buy now"**, **"pay now"** and **"confirm purchase"** as conveying the message. **"Register"**, **"confirm"** and **"order now"** are less likely to comply, as are unnecessarily long phrases that conceal the payment message. — [Osborne Clarke](https://marketinglaw.osborneclarke.com/advertising-regulation/new-guidance-from-brussels-on-consumer-rights-directive/); [SCL](https://www.scl.org/12571-cjeu-rules-on-requirements-for-obligation-to-pay-button/)
- In **CJEU C-249/21 *Fuhrmann-2*, 7 April 2022**, only the words on the button count, not the surrounding context. Whether "complete booking" qualifies was left to the German court, judged on the words alone. — [SCL](https://www.scl.org/12571-cjeu-rules-on-requirements-for-obligation-to-pay-button/); [Lexology](https://www.lexology.com/library/detail.aspx?g=ee33d7f1-7f97-457c-a331-b86d668b33d8); [ECC Netherlands](https://www.eccnederland.nl/en/news/court-justice-order-button-e-commerce-website-must-clearly-convey-obligation-pay)
- Stripe's Express Checkout Element lets merchants choose wallet button wording, for example `applePay: 'buy'` or `googlePay: 'buy'`. — [Stripe docs, ECE](https://docs.stripe.com/elements/express-checkout-element/accept-a-payment)

**New: EU withdrawal button (Directive 2023/2673, Article 11a CRD)**
- Adopted **22 November 2023**. Transposition was due by **19 December 2025**, and it **applies from 19 June 2026**. — [outvio](https://outvio.com/blog/eu-withdrawal-button/); [K&L Gates](https://www.klgates.com/thought-leadership/New-EU-Withdrawal-Button-Requirement-Practical-Implications-and-Recommendations-for-US-and-Global-Online-Sellers-7-8-2026)
- It applies to online-interface distance contracts **only where a withdrawal right exists**. Contracts with no withdrawal right are out of scope, and some sources name "certain digital downloads" explicitly. — [consumer-withdrawal.eu](https://www.consumer-withdrawal.eu/en/articles/eu-withdrawal-button-2026-guide); [Freshfields](https://www.freshfields.com/en/our-thinking/blogs/risk-and-compliance/pitfalls-for-e-commerce-how-the-new-eu-withdrawal-button-widerrufsbutton-wi-102ms91)
- Requirements: a function labelled "withdraw from contract here" or an equivalent, continuously available during the withdrawal period, with a second "confirm withdrawal" step, and **no login required**. Germany's § 356a BGB was published on **5 February 2026**, and Freshfields says a clearly labelled link suffices. — [outvio](https://outvio.com/blog/eu-withdrawal-button/); [Freshfields](https://www.freshfields.com/en/our-thinking/blogs/risk-and-compliance/pitfalls-for-e-commerce-how-the-new-eu-withdrawal-button-widerrufsbutton-wi-102ms91)

**PSD2 Strong Customer Authentication**
- SCA applies to online card payments where **both** the business's acquirer and the cardholder's bank are in the EEA. **One-leg-out** transactions, such as US-issued cards at an EEA merchant, aren't subject to SCA, though some issuers may still decline. — [Stripe guide, SCA](https://stripe.com/guides/strong-customer-authentication); [Stripe support, Businesses affected by SCA](https://support.stripe.com/questions/businesses-affected-by-strong-customer-authentication-(sca)-regulations)
- **Low-value exemption** (RTS, Delegated Regulation 2018/389, Article 16): remote payments **≤€30**. The issuer may require SCA once **5 consecutive** exempt transactions or a **€100 cumulative** total is reached since the last SCA. The EBA's 2018 opinion says the issuer applies one cap or the other, not both. Stripe lists **€30 (£25)** and **€100 (£85)**, and the exemption is granted by the cardholder's bank. — [Stripe docs, SCA exemptions](https://docs.stripe.com/payments/3d-secure/strong-customer-authentication-exemptions); [Stripe support, Small payments exemption](https://support.stripe.com/questions/strong-customer-authentication-(sca)-exemption-for-small-payments-or-microtransactions); [Broadcom TechDocs (EBA opinion quote)](https://techdocs.broadcom.com/us/en/payment-security/arcot-network/arcot-for-issuers/AFI/learn-about-features/psd2---sca-exemptions-implementation/low-value-exemption.html)
- Only the **issuer** can track the cumulative count, and merchants and acquirers can't. — [Adyen](https://www.adyen.com/knowledge-hub/psd2-understanding-strong-customer-authentication); [Worldline](https://worldline.com/en/home/main-navigation/resources/publications/strong-customer-authentication-during-e-commerce-transactions-in-europe)
- The **transaction risk analysis (TRA)** exemption can be requested by Stripe if its fraud rates stay within thresholds, with current limits of **€250 (EEA)** and **£220 (UK/CH)**. — [Stripe docs, SCA exemptions](https://docs.stripe.com/payments/3d-secure/strong-customer-authentication-exemptions)
- **Wallets:** Stripe says Apple Pay and Google Pay "already support payment flows with a built-in layer of authentication (biometric or password)". Secondary sources describe this as satisfying SCA without extra friction, though terminology varies between "exempt" and "compliant". — [Stripe guide, SCA](https://stripe.com/en-gr/guides/strong-customer-authentication); [Signifyd](https://www.signifyd.com/resources/fraud-101/what-is-strong-customer-authentication/)

### Inferences
- **One-tap compliance pattern**, inferred from the above:
  - a single unticked checkbox directly above the pay or wallet buttons that combines consent to immediate access and acknowledgement of losing the right, which the Commission allows to be obtained together;
  - a pay button whose own words signal payment ("Pay €7.55", "Buy now");
  - a receipt email that repeats the consent and acknowledgement.

  The checkbox is one extra tap. Whether a wallet button press can itself carry the 16(m) consent was not established.
- For €3–15 payments, SCA friction should mostly be limited to EEA card-entry buyers whose issuer declines the low-value exemption or hits its counters. US cards are out of scope, and wallets add their own biometric step. The Spanish (EEA) segment is where 3DS challenges are most likely to appear.
- Because the 16(m) waiver removes the withdrawal right, the 2026 withdrawal button should not apply to properly waived instant-unlock purchases. If the waiver isn't validly obtained, the right persists, and the button obligation arguably follows. This is interpretation, not legal advice.
- Showing the EU consent box to US buyers is a business and legal choice. CRD protection is tied to EU consumers. Geo-targeting the box by card or billing country could remove a tap for non-EU buyers, but needs legal review.

### Gaps
- I couldn't fetch EUR-Lex to quote the consolidated Article 16(m) and 14(4)(b) text verbatim.
- I didn't verify whether the 2021 Notice explicitly endorses a single combined tick box, or treats an appropriately worded pay button as a sufficient "positive action".
- UK rules weren't researched here: the Consumer Contracts Regulations 2013 equivalent of 16(m), the DMCC Act 2024 changes, and UK SCA treatment of UK cards at an EU-acquired merchant. Spain's transposition (TRLGDCU) wasn't checked.
- No conversion data on the cost of an EU withdrawal-consent checkbox was found.
- No primary EBA Q&A on tokenised wallets and SCA was found.

---

## 7. Gift-specific purchase friction: send tonight, scheduled delivery, surprise-safe receipts

### Takeaway
Instant delivery is the leading reason people choose digital gifts (70% in a 2025 Fiserv survey), and scheduled "send on date" delivery is a standard feature among e-gift and e-card providers. Some charge only when the gift is sent. I found no research on receipts spoiling surprises. That risk mainly runs through shared statements and email, and is addressed by sender-only receipts and recognisable descriptors.

### Cited Findings
- Fiserv **2025** Prepaid Consumer Insights Survey: among people choosing digital over physical gift cards, top considerations are **instant delivery (70%)**, ease of sharing (51%) and ease of purchase (49%). — [Fiserv 2025 survey (PDF)](https://carat.fiserv.com/content/dam/carat/us/en/pdf/annual-prepaid-consumer-insights-survey-2025.pdf)
- Kaspersky (**December 2025**): about half of holiday shoppers planned to give digital presents. It warns that phishing sites target last-minute digital-gift buyers, which adds to the trust burden on unknown merchants. — [Kaspersky press release](https://www.kaspersky.com/about/press-releases/the-future-of-gift-shopping-half-of-holiday-shoppers-plan-to-give-digital-presents-this-christmas-kaspersky-new-report-reveals)
- Coresight **2025** holiday study: about 9 in 10 shoppers expect to spend the same or a larger share online on digital gift cards. — [Synchrony/Coresight PDF](https://www.synchrony.com/downloads/new-coresight-research-study-unwraps-eight-insights.pdf)
- Blackhawk Network (January 2025, covering 2024 holidays): Boomers were **2x** as likely to buy digital gift cards at the last minute. Giftcards.com claims nearly **75%** bought digital gift cards on Christmas Eve or Day, but the year and sample are unclear. — [Blackhawk infographic](https://pages.blackhawknetwork.com/rs/922-CLG-920/images/US-COM-BHN-Post-Holiday-Research-Infographic.pdf?version=0); [Giftcards.com](https://www.giftcards.com/us/en/blog/gift-card-statistics)
- **[historical, 2018]** Microsoft Store/SurveyMonkey: **25%** of last-minute shopping happens in the final two days, and 37% feel stressed. — [Windows blog](https://blogs.windows.com/windowsexperience/?p=170816)
- **Scheduled delivery patterns:** Vanilla Gift schedules eGifts for a chosen date and **doesn't charge until the card is sent**. The date can't be changed, but the order can be cancelled up to one day before. — [Vanilla Gift](https://www.vanillagift.com/blog/scheduled-gift-card-delivery)
- Jacquie Lawson: "Send card on this date" on web, and a delivery-date field in the app. — [Jacquie Lawson Help Centre](https://www.jacquielawson.com/faq/3475)
- Paperless Post: "Send later" with **date, time and time zone** on the recipients page. — [Paperless Post support](https://paperlesspost.zendesk.com/hc/en-us/articles/206522693)
- Amazon eGift cards can reportedly be scheduled up to a year ahead (secondary affiliate sources only). — [1023jack (secondary)](https://1023jack.com/vetted/best-last-minute-digital-gifts/)

### Inferences
- "Send tonight" buyers are deadline-driven. Any payment hiccup (3DS challenge, account wall, unfamiliar merchant name that triggers hesitation) costs more for them than for a regular buyer. Wallet-first payment and an immediate shareable link match the 70% instant-delivery priority.
- Scheduling (choosing a date and time in the recipient's time zone) is best offered after payment, or as a single optional field, so it doesn't add a required step for "send now" buyers.
- Surprise safety: the recipient should never receive the payment receipt or see the price. The descriptor ("ETHOS" and the like) is what a partner sharing the card might see, so a neutral brand name is preferable to a descriptive suffix that reveals the gift ("ANNIVERSARY GIFT").

### Gaps
- No research was found on how often receipts, statements or notification emails spoil gift surprises.
- No data was found on what share of digital-gift purchases are same-day or "send tonight" in 2024–2026 (the 48-hour figures found were unsourced).
- No evidence was found on whether "charge at send time" (Vanilla) versus "charge now" affects conversion.

---

## Implications for Ethos

*Interpretation only, based on the findings above and the Ethos context given in the brief: tryethos.io; Latvia-based; make in an editor, then pay to publish; average order about €7.55; about 12% of starters pay (September 2026); Stripe; checkout showed "Pay SECUORA" as of 23 September; statement suffix "ETHOS"; EU withdrawal consent box. Not legal advice. Each point respects the owner's constraint of no new buying steps.*

1. **Fix the name at the moment of payment. This is the highest-value, zero-friction change.** "Pay SECUORA" on a page the buyer reached from Ethos sits inside Baymard's 19% "didn't trust the site with my card" risk, and it is the kind of ambiguity Baymard says drives distrust. Setting Checkout's `branding_settings.display_name` to "Ethos" changes only the header. The public business name or DBA (terms, receipts, portal) should also read Ethos, along with the Ethos logo or icon. Also check what name the Apple Pay and Google Pay sheets show (unverified gap in section 3).
2. **Make the statement read as Ethos from the first characters.** With a SECUORA prefix and an ETHOS suffix, the statement likely reads "SECUORA* ETHOS" (inferred from Stripe's prefix/suffix mechanics). The issuer may truncate it or show the prefix most prominently. A shortened descriptor that reflects the URL or DBA, such as "TRYETHOS" or "ETHOS", passes Stripe's DBA/URL/legal-name rule and would make the charge recognisable at a glance. This matters for small gift charges noticed weeks later and for shared-card households. It also avoids "unrecognised" disputes, which cost more than the €7.55 sale. Avoid suffixes that reveal the gift occasion.
3. **Wallets first and defaulted, with no account and no extra fields.** Stripe's own data (vendor-reported) ties the biggest lifts to surfacing Apple Pay and Google Pay early and defaulting to them. Wallets also handle EEA SCA through device biometrics, while US cards aren't subject to SCA and sub-€30 EEA card payments are often exempt. Test the flow inside Instagram, TikTok and WhatsApp in-app browsers, where Link (and possibly wallets) may not render.
4. **Keep the EU consent to one tap and place it where it doubles as reassurance.** One unticked combined checkbox above the pay button (immediate access plus acknowledgement of losing the withdrawal right), a pay button worded "Pay €X" or "Buy now", and a receipt email that repeats both. Consider asking counsel whether the box can be shown only to EU/EEA buyers, which would remove a tap for US buyers. A UK equivalent likely exists, but wasn't researched. A properly obtained waiver should keep Ethos outside the June 2026 withdrawal-button duty for instant-unlock purchases.
5. **Show the price before the effort, collect it after.** "Make first, pay at publish" matches the IKEA-effect and self-design evidence, which shows valuation rises once the creation is complete and feels like the sender's own. Premium templates and extras should show their price or a badge when chosen in the editor, so the paywall total is never a surprise. Baymard's top abandonment reasons are surprise costs and not seeing the total up front.
6. **No new checkout-step upsells.** Bump evidence is vendor-only, and an extra checkout decision on a phone at €7.55 risks the primary conversion. Sell extras inside the editor, where they're part of making the gift, and keep any add-on an unticked opt-in (CRD Article 22). If testing a bump, judge by revenue per checkout visitor, not take rate.
7. **Serve the "send tonight" buyer without adding steps for others.** Give an instant shareable link right after payment, and make "schedule for a date and time (recipient's time zone)" optional after payment. Send receipts to the sender only. Where the brand helps trust, put it in the receipt and the link preview, not in extra screens.
8. **Measurement suggestions.** Track start→publish-tap→pay by device, by in-app browser versus Safari or Chrome, by card country (US, UK, ES) and by payment method (wallet versus card). Watch the Stripe dispute reason mix: a rise in "unrecognised" disputes signals a descriptor problem. Check 3DS challenge rates on Spanish cards. The 12% start-to-pay rate isn't directly comparable to RevenueCat's subscription trial-to-paid medians.
