# Search and AI assistants

How tryethos.io is registered with search engines, and what to leave alone so it stays that way.

## Google Search Console

- **Property:** `tryethos.io`, a Domain property (every protocol and subdomain).
- **Owner:** haraldsl.biz@gmail.com. Verified on 19 Sep 2026.
- **Verified by:** a TXT record at one.com, the DNS host:
  `tryethos.io TXT google-site-verification=JWLeleIgNYRGlXwZK-IDpY_4XeLc6cc17Af_GsGhe70`.
  **Don't delete it.** Google re-checks, and the property stops working without it.
- The DNS also carries an older Google verification,
  `w3bez2rm6fpt.tryethos.io CNAME gv-y7rmkj2eedg7hm.dv.googlehosted.com`, from another Google
  account. Leave it too until its owner is known.
- **Sitemap submitted:** `https://tryethos.io/sitemap.xml`. Google re-reads it on its own.
- **Adding someone:** Search Console → Settings → Users and permissions. Don't verify a second
  time.

`GOOGLE_SITE_VERIFICATION` (see `src/lib/env.ts`) is the HTML-tag alternative. It isn't needed
while the DNS record exists.

## Bing Webmaster Tools

This covers Bing search, and through it ChatGPT search, Copilot and DuckDuckGo. It needs an
account: sign in at bing.com/webmasters with the Google account above, then choose **Import from
Google Search Console**. That carries the verification and the sitemap across. Its AI Performance
report shows which pages Copilot cites.

`BING_SITE_VERIFICATION` becomes the `msvalidate.01` tag, if the tag method is ever preferred.

## IndexNow

This is what the IndexNow engines (Bing, Yandex, Seznam, Naver, Yep) accept without an account:
"these URLs changed, crawl them now". The key is served at
`https://tryethos.io/a2668847f0e9d03208af41b893146641.txt`
(`public/a2668847f0e9d03208af41b893146641.txt`).

```bash
npm run indexnow                                  # every URL in the live sitemap
node scripts/indexnow.mjs https://tryethos.io/pricing   # just these
```

Run it after a deploy that changes what public pages say. It speeds up crawling, not ranking.

## AI assistants

- `robots.txt` allows every crawler except on private paths. GPTBot, OAI-SearchBot, ClaudeBot,
  PerplexityBot, Google-Extended and Applebot all get the pages; checked 19 Sep 2026. A future
  decision to block model *training* must not block **OAI-SearchBot** or **PerplexityBot**, or
  Ethos drops out of ChatGPT and Perplexity answers altogether.
- `/llms.txt` is generated from the template manifests (`src/app/llms.txt/route.ts`).
- Google's AI Overviews and AI Mode use the ordinary Search index. ChatGPT and Copilot lean on
  Bing. So the two consoles above are the setup; what gets Ethos *recommended* is being mentioned
  elsewhere.
