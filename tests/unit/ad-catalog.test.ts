import { existsSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { catalogCsv, catalogRows } from "@/lib/ads/catalog";
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
