import { afterEach, describe, expect, it, vi } from "vitest";
import robots from "@/app/robots";
import sitemap from "@/app/sitemap";
import { LEGAL_UPDATED } from "@/content/legal";
import { PAGE_UPDATED, pageUpdated } from "@/content/page-dates";
import { TEMPLATE_MANIFESTS } from "@/templates/manifests";

type Rules = { allow: string[]; disallow: string[] };

/** A robots.txt path as Google reads it: `*` is any run of characters, and a final `$` ends the URL. */
function pattern(p: string): RegExp {
  const anchored = p.endsWith("$");
  const body = (anchored ? p.slice(0, -1) : p)
    .split("*")
    .map((s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join(".*");
  return new RegExp(`^${body}${anchored ? "$" : ""}`);
}

/** Google's reading: of the rules that match, the longest wins and allow wins a tie; no match is allowed. */
function crawlable(rules: Rules, url: string): boolean {
  const { pathname, search } = new URL(url, "https://tryethos.io");
  const target = pathname + search;
  let best: { length: number; allow: boolean } | null = null;
  for (const [list, allow] of [[rules.allow, true], [rules.disallow, false]] as const) {
    for (const p of list) {
      if (!pattern(p).test(target)) continue;
      if (!best || p.length > best.length || (p.length === best.length && allow)) best = { length: p.length, allow };
    }
  }
  return best?.allow ?? true;
}

function everyone(): Rules {
  const rule = [robots().rules].flat().find((r) => [r.userAgent].flat().includes("*"));
  if (!rule) throw new Error("robots.txt has no rule for every crawler");
  const list = (v: string | string[] | undefined) => (v === undefined ? [] : [v].flat());
  return { allow: list(rule.allow), disallow: list(rule.disallow) };
}

const pages = sitemap();
const urls = [...new Set(pages.flatMap((p) => [p.url, ...Object.values(p.alternates?.languages ?? {})]))].filter((u): u is string => typeof u === "string");
const englishPaths = pages.map((p) => new URL(p.url).pathname).filter((path) => path !== "/es" && !path.startsWith("/es/"));

describe("robots.txt", () => {
  const rules = everyone();

  it("lets crawlers reach every page in the sitemap, in every language", () => {
    expect(urls.length).toBeGreaterThan(300);
    expect(urls.filter((u) => !crawlable(rules, u))).toEqual([]);
  });

  it("keeps them off Next's prefetch requests, which a page renders the same without", () => {
    const prefetches = urls.flatMap((u) => [`${u}?_rsc=1x2y3`, `${u}?utm_source=tiktok&_rsc=ab12`]);
    expect(prefetches.filter((u) => crawlable(rules, u))).toEqual([]);
    // The shape segment prefetches take with Cache Components, and full-page payloads.
    for (const path of ["/templates/bouquet.segments/_tree.segment.rsc", "/es/gifts.segments/$d$currency/__PAGE__.segment.rsc", "/occasions/birthday.rsc"]) {
      expect(crawlable(rules, path), path).toBe(false);
    }
  });

  it("leaves open what a page needs to render and links that carry a query", () => {
    for (const path of [
      "/_next/static/chunks/app/page-3f9a1c.js",
      "/_next/static/css/a1b2c3.css",
      "/_next/image?url=%2Ftemplates%2Fbouquet%2Fposter.jpg&w=640&q=75",
      "/og.png",
      "/templates/scratch-card?utm_source=tiktok",
      "/es/gifts?ref=pinterest",
    ]) {
      expect(crawlable(rules, path), path).toBe(true);
    }
  });

  it("still keeps them out of accounts, the editor and gift links", () => {
    for (const path of ["/dashboard", "/es/account", "/create/bouquet", "/g/abc123", "/api/checkout"]) {
      expect(crawlable(rules, path), path).toBe(false);
    }
  });
});

describe("sitemap dates", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("never come from the clock, so a redeploy changes none of them", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2031-01-01T00:00:00Z"));
    expect(sitemap()).toEqual(pages);
  });

  it("are real days, none of them ahead of today", () => {
    const dated = pages.filter((p) => p.lastModified !== undefined);
    expect(dated.length).toBeGreaterThan(200);
    for (const p of dated) {
      const when = new Date(p.lastModified as string | Date).getTime();
      expect(Number.isNaN(when), p.url).toBe(false);
      expect(when, p.url).toBeLessThanOrEqual(Date.now());
      expect(when, p.url).toBeGreaterThanOrEqual(Date.parse("2026-03-01"));
    }
    for (const [key, day] of Object.entries(PAGE_UPDATED)) expect(day, key).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("each belong to pages that exist", () => {
    for (const key of Object.keys(PAGE_UPDATED)) {
      const found = key.endsWith("/*")
        ? englishPaths.some((path) => path.startsWith(key.slice(0, -1)) && !path.slice(key.length - 1).includes("/"))
        : englishPaths.includes(key);
      expect(found, key).toBe(true);
    }
  });

  it("are a page's own, else its section's, else none", () => {
    expect(pageUpdated("/templates/scratch-card")).toBe(PAGE_UPDATED["/templates/scratch-card"]);
    expect(pageUpdated("/templates/xoxo")).toBe(PAGE_UPDATED["/templates/*"]);
    expect(pageUpdated("/")).toBe(PAGE_UPDATED["/"]);
    expect(pageUpdated("/dates/riga")).toBeUndefined();
    expect(pageUpdated("/creators")).toBeUndefined();
    const undated = pages.filter((p) => new URL(p.url).pathname.startsWith("/dates"));
    expect(undated.length).toBeGreaterThan(0);
    expect(undated.filter((p) => p.lastModified !== undefined)).toEqual([]);
  });

  it("give the legal pages the date they print", () => {
    const legal = pages.filter((p) => new URL(p.url).pathname.includes("/legal/"));
    expect(legal.length).toBeGreaterThan(0);
    for (const p of legal) expect(p.lastModified, p.url).toBe(LEGAL_UPDATED);
  });

  it("give a template launched after the templates' shared date one of its own", () => {
    // Every template already live on 25 Oct, the day "/templates/*" stands for. The holiday three
    // launched on 11 Nov inherited it and told Google they were older than they were; a template
    // added since has to carry its own date (or, if its words haven't changed, join this list).
    const LIVE_ON_SECTION_DATE = [
      "arcade", "autumn-reel", "balloons", "bat-swarm", "be-my-boo", "birthday-cinema", "bloom", "cap-toss", "cauldron",
      "coquette", "dark-romance", "digicam", "evergreen", "fall-for-you", "favorite-person", "fireside", "front-page",
      "garden", "halfway", "haunted-house", "jack-o-lantern", "jar-of-reasons", "kawaii", "keepsake",
      "midnight-countdown", "museum", "music-box", "on-repeat", "our-timeline", "pack-your-bags", "paper-crane",
      "party-animals", "passport", "photo-booth", "picnic", "popup-card", "recipe-box", "scrapbook", "seance",
      "sketchbook", "snow-globe", "spooky-season", "sticker-bomb", "text-thread", "the-council", "the-toast",
      "trick-or-treat", "vinyl", "xoxo",
    ];
    expect(PAGE_UPDATED["/templates/*"]).toBe("2026-10-25");
    for (const m of TEMPLATE_MANIFESTS)
      if (!LIVE_ON_SECTION_DATE.includes(m.slug)) expect(PAGE_UPDATED[`/templates/${m.slug}`], m.slug).toBeDefined();
  });
});
