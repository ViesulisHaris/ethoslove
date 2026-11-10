import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import sitemap from "@/app/sitemap";
import { catalogCsv, catalogRows, chatgptFeedJsonl, chatgptFeedRows } from "@/lib/ads/catalog";
import { PRODUCTS } from "@/lib/pricing/products";
import { TEMPLATE_MANIFESTS, listManifests } from "@/templates/manifests";

/**
 * The catalog the ad platforms match pixel events against. A row only matches when its id is the
 * exact content id the pixels send, which is the template's slug, so that is pinned here, along with
 * the pictures every row points at.
 */

/** RFC 4180, enough for the feed: quoted fields, doubled quotes, CRLF lines. */
function parseCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let value = "";
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        value += '"';
        i++;
      } else if (c === '"') quoted = false;
      else value += c;
    } else if (c === '"') quoted = true;
    else if (c === ",") {
      row.push(value);
      value = "";
    } else if (c === "\r" && text[i + 1] === "\n") {
      row.push(value);
      rows.push(row);
      row = [];
      value = "";
      i++;
    } else value += c;
  }
  return rows;
}

const premium = listManifests({ tier: "premium" }).map((m) => m.slug);

describe("the ad catalog", () => {
  it("lists every premium template once, by its slug, and nothing else", () => {
    const ids = catalogRows().map((r) => r.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...premium].sort());
    const free = TEMPLATE_MANIFESTS.filter((m) => m.tier === "free").map((m) => m.slug);
    for (const slug of free) expect(ids).not.toContain(slug);
  });

  it("points only at the live site's public pages and pictures", () => {
    for (const row of catalogRows()) {
      expect(row.link).toBe(`https://tryethos.io/create/${row.id}`);
      expect(row.image_link).toMatch(/^https:\/\/tryethos\.io\/templates\/[a-z0-9-]+\/poster\.jpg$/);
      expect(`${row.link} ${row.image_link}`).not.toMatch(/\/g\/|\/dashboard|\/account|\/checkout|\?/);
    }
  });

  it("every picture is a file the site serves, at least 500 × 500 as both platforms ask", async () => {
    for (const row of catalogRows()) {
      const file = path.join("public", new URL(row.image_link).pathname);
      expect(existsSync(file), file).toBe(true);
      const { width = 0, height = 0, format } = await sharp(file).metadata();
      expect(format, file).toBe("jpeg");
      expect(Math.min(width, height), file).toBeGreaterThanOrEqual(500);
    }
  });

  it("sells one template at the pricing page's euro price, new and in stock, under the brand", () => {
    for (const row of catalogRows()) {
      expect(row.price).toBe(`${(PRODUCTS.single.amounts.eur / 100).toFixed(2)} EUR`);
      expect(row).toMatchObject({ availability: "in stock", condition: "new", brand: "Ethos" });
      expect(row.title.length).toBeLessThanOrEqual(150);
      expect(row.description.length).toBeGreaterThan(0);
    }
  });

  it("writes CSV that reads back as the same rows, for Meta and for TikTok", () => {
    const rows = catalogRows();
    const meta = parseCsv(catalogCsv("meta"));
    expect(meta[0]).toEqual(["id", "title", "description", "availability", "condition", "price", "link", "image_link", "brand"]);
    expect(meta.slice(1)).toEqual(rows.map((r) => [r.id, r.title, r.description, r.availability, r.condition, r.price, r.link, r.image_link, r.brand]));
    const tiktok = parseCsv(catalogCsv("tiktok"));
    expect(tiktok[0][0]).toBe("sku_id");
    expect(tiktok.slice(1)).toEqual(meta.slice(1));
  });
});

/** OpenAI's product feed spec (developers.openai.com/commerce/product-feeds/spec), as read 10 Nov 2026. */
describe("the ChatGPT shopping feed", () => {
  const rows = chatgptFeedRows();
  const REQUIRED = ["item_id", "title", "description", "url", "brand", "seller_name", "image_url", "availability", "price"] as const;

  it("lists every premium template once, by its slug, like the ad catalog", () => {
    const ids = rows.map((r) => r.item_id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual([...premium].sort());
  });

  it("fills every field OpenAI requires, within its limits, in plain text", () => {
    for (const row of rows) {
      for (const key of REQUIRED) expect(String(row[key]).trim(), `${row.item_id} ${key}`).not.toBe("");
      expect(row.title.length).toBeLessThanOrEqual(150);
      expect(row.description.length).toBeLessThanOrEqual(5000);
      expect(`${row.title} ${row.description}`).not.toMatch(/<\/?[a-z][^>]*>/i);
      expect(["in_stock", "out_of_stock", "pre_order", "backorder", "unknown"]).toContain(row.availability);
      expect(row).toMatchObject({ brand: "Ethos", seller_name: "Ethos", condition: "new", is_digital: true });
    }
  });

  it("asks the US price of one template, in dollars, and nothing for delivery", () => {
    for (const row of rows) {
      expect(row.price).toMatch(/^\d+\.\d{2} USD$/);
      expect(row.price).toBe(`${(PRODUCTS.single.amounts.usd / 100).toFixed(2)} USD`);
      expect(row.shipping_price).toBe("0.00 USD");
    }
  });

  it("links each row to its template's public page in the sitemap, and to its poster, never to the editor", () => {
    // The sitemap's origin follows the environment (localhost here), so compare paths.
    const listed = new Set(sitemap().map((entry) => new URL(entry.url).pathname));
    for (const row of rows) {
      expect(row.url).toBe(`https://tryethos.io/templates/${row.item_id}`);
      expect(listed.has(new URL(row.url).pathname), row.url).toBe(true);
      expect(row.image_url).toMatch(/^https:\/\/tryethos\.io\/templates\/[a-z0-9-]+\/poster\.jpg$/);
      expect(existsSync(path.join("public", new URL(row.image_url).pathname)), row.image_url).toBe(true);
      expect(row).toMatchObject({ seller_url: "https://tryethos.io", seller_tos: "https://tryethos.io/legal/terms", seller_privacy_policy: "https://tryethos.io/legal/privacy" });
      expect(`${row.url} ${row.image_url}`).not.toMatch(/\/create|\/g\/|\?/);
    }
  });

  it("writes JSON Lines that read back as the same rows", () => {
    const lines = chatgptFeedJsonl().split("\n");
    expect(lines.pop()).toBe("");
    expect(lines.map((line) => JSON.parse(line))).toEqual(rows);
  });
});
