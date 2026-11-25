import { describe, expect, it } from "vitest";
import { HTML_LIMITED_BOT_UA_RE } from "next/dist/shared/lib/router/utils/html-bots";
import { shouldServeStreamingMetadata } from "next/dist/server/lib/streaming-metadata";
import nextConfig from "../../next.config";

/**
 * Which readers wait for a page's tags in its <head> (next.config.ts's htmlLimitedBots). Anyone the
 * list misses gets tags that await the query (/dates, /plan) streamed into the body. Googlebot was
 * missed (reports/seoaudit-audit.md, M2), so the list names Google's crawlers; people are not in it.
 * Each check runs Next's own test of the list, the one that decides at request time.
 */
const bots = nextConfig.htmlLimitedBots;
const streamsTo = (ua: string) => shouldServeStreamingMetadata(ua, bots instanceof RegExp ? bots.source : bots);

const GOOGLE = {
  Googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Googlebot smartphone": "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.6778.69 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  "Googlebot-Image": "Googlebot-Image/1.0",
  "Google-InspectionTool": "Mozilla/5.0 (compatible; Google-InspectionTool/1.0;)",
  GoogleOther: "GoogleOther",
  "AdsBot-Google": "AdsBot-Google (+http://www.google.com/adsbot.html)",
  "Storebot-Google": "Mozilla/5.0 (X11; Linux x86_64; Storebot-Google/1.0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Mediapartners-Google": "Mediapartners-Google",
};

const PEOPLE = {
  "Chrome on Windows": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Safari on iPhone": "Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1",
  "Firefox on Android": "Mozilla/5.0 (Android 14; Mobile; rv:132.0) Gecko/132.0 Firefox/132.0",
  "Chrome on Android": "Mozilla/5.0 (Linux; Android 10; K) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36",
};

describe("readers who get a page's tags in its <head>", () => {
  it("include Googlebot and Google's other crawlers", () => {
    for (const [name, ua] of Object.entries(GOOGLE)) expect(streamsTo(ua), name).toBe(false);
  });

  it("still include Bingbot and every agent of Next's own list", () => {
    expect(streamsTo("Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)")).toBe(false);
    const ours = String(bots instanceof RegExp ? bots.source : bots).split("|");
    for (const agent of HTML_LIMITED_BOT_UA_RE.source.split("|")) expect(ours, agent).toContain(agent);
  });

  it("leave people's browsers out, so they keep the streamed page", () => {
    for (const [name, ua] of Object.entries(PEOPLE)) expect(streamsTo(ua), name).toBe(true);
  });
});
