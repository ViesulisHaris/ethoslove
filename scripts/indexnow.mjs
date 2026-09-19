// node scripts/indexnow.mjs [url ...]
//
// Tells the IndexNow engines that pages changed, so they crawl them now instead of whenever they
// next pass by: Bing (and through it ChatGPT search and Copilot), Yandex, Seznam, Naver and Yep.
// With no arguments it submits every URL in the live sitemap. Run it after a deploy that changes
// what public pages say. It speeds up discovery, not ranking.
//
// KEY must match public/<KEY>.txt: that file is how the engines know a submission is ours.

const HOST = "tryethos.io";
const KEY = "a2668847f0e9d03208af41b893146641";
const KEY_LOCATION = `https://${HOST}/${KEY}.txt`;

async function sitemapUrls() {
  const xml = await (await fetch(`https://${HOST}/sitemap.xml`)).text();
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1].trim());
}

const urls = process.argv.length > 2 ? process.argv.slice(2) : await sitemapUrls();
const foreign = urls.filter((u) => new URL(u).host !== HOST);
if (foreign.length) {
  console.error(`Only ${HOST} URLs can be submitted with this key: ${foreign.join(", ")}`);
  process.exit(1);
}

// A submission whose key can't be fetched is thrown away, so check it's live first.
const keyFile = await fetch(KEY_LOCATION);
if (!keyFile.ok || (await keyFile.text()).trim() !== KEY) {
  console.error(`${KEY_LOCATION} isn't serving the key (HTTP ${keyFile.status}); deploy it first.`);
  process.exit(1);
}

const res = await fetch("https://api.indexnow.org/indexnow", {
  method: "POST",
  headers: { "content-type": "application/json; charset=utf-8" },
  body: JSON.stringify({ host: HOST, key: KEY, keyLocation: KEY_LOCATION, urlList: urls }),
});
// 200: accepted. 202: accepted, key still being checked. 4xx: rejected, with the reason below.
console.log(`IndexNow answered ${res.status} for ${urls.length} URL${urls.length === 1 ? "" : "s"}.`);
if (res.status >= 300) {
  console.error(await res.text());
  process.exit(1);
}
