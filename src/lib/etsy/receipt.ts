import { getManifest, isTemplateSlug } from "@/templates/manifests";

/**
 * What we read of an Etsy order (Open API v3, getShopReceipt): the fields that say whether it is
 * paid, what was bought and how many. Everything else Etsy sends is ignored.
 */
export type EtsyReceipt = {
  receipt_id: number;
  status: string;
  is_paid: boolean;
  refunds?: unknown[] | null;
  transactions: EtsyTransaction[];
};

export type EtsyTransaction = {
  transaction_id: number;
  listing_id: number;
  quantity: number;
  sku?: string | null;
  price?: { amount: number; divisor: number; currency_code: string } | null;
};

/** An Etsy order number as typed: digits only, spaces and a leading "#" forgiven. */
export function etsyOrderNumber(raw: string): number | null {
  const digits = raw.replace(/[\s#]/g, "");
  if (!/^\d{6,15}$/.test(digits)) return null;
  const n = Number(digits);
  return Number.isSafeInteger(n) ? n : null;
}

/**
 * The template an Etsy listing sells, from its SKU: the template's slug, optionally after "ethos-"
 * ("ethos-popup-card" or "popup-card"). Set on each listing in Etsy (docs/marketing/ETSY.md); a
 * listing without one sells nothing here.
 */
export function skuTemplate(sku: string | null | undefined): string | null {
  const slug = (sku ?? "").trim().toLowerCase().replace(/^ethos-/, "");
  return isTemplateSlug(slug) ? slug : null;
}

/** What one Etsy item becomes here: a premium template is a "single", a free one its "extras". */
export function etsyProduct(slug: string): "single" | "extras" {
  return getManifest(slug)?.tier === "free" ? "extras" : "single";
}

/** One row per item bought: an order of two of a listing can be used twice, and no more. */
export function claimKey(receiptId: number, transactionId: number, unit: number): string {
  return `${receiptId}/${transactionId}/${unit}`;
}

export function receiptOfKey(key: string): number | null {
  const receipt = Number(key.split("/")[0]);
  return Number.isSafeInteger(receipt) && receipt > 0 ? receipt : null;
}

export type ClaimableUnit = { key: string; listingId: number; amount: number; currency: string };

export type Claimable =
  | { ok: true; units: ClaimableUnit[] }
  | { ok: false; error: "not_paid" | "refunded" }
  | { ok: false; error: "other_template"; templates: string[] };

/**
 * Whether this order may hand over `slug`, and the items it can be used for. Only an order Etsy
 * itself calls paid ("paid", or "completed" once delivered) with nothing refunded counts: one still
 * being paid for ("open", "payment processing") waits, and a cancelled or refunded one never counts.
 */
export function claimable(receipt: EtsyReceipt, slug: string): Claimable {
  const unpaid = paymentProblem(receipt);
  if (unpaid) return { ok: false, error: unpaid };
  const units: ClaimableUnit[] = [];
  for (const tx of receipt.transactions) {
    if (skuTemplate(tx.sku) !== slug) continue;
    const count = Math.max(0, Math.min(Math.trunc(tx.quantity), 20));
    const amount = tx.price && tx.price.divisor > 0 ? Math.round((tx.price.amount / tx.price.divisor) * 100) : 0;
    const currency = (tx.price?.currency_code ?? "eur").toLowerCase();
    for (let unit = 0; unit < count; unit++) units.push({ key: claimKey(receipt.receipt_id, tx.transaction_id, unit), listingId: tx.listing_id, amount, currency });
  }
  if (units.length > 0) return { ok: true, units };
  return { ok: false, error: "other_template", templates: orderedTemplates(receipt) };
}

/**
 * The templates a paid order is for, from the order number alone: how /etsy finds a buyer's gift
 * without the PDF. Handing them over is still the claim's job (claimable), item by item.
 */
export function orderTemplates(receipt: EtsyReceipt): { ok: true; templates: string[] } | { ok: false; error: "not_paid" | "refunded" } {
  const unpaid = paymentProblem(receipt);
  return unpaid ? { ok: false, error: unpaid } : { ok: true, templates: orderedTemplates(receipt) };
}

function paymentProblem(receipt: EtsyReceipt): "not_paid" | "refunded" | null {
  const status = receipt.status.toLowerCase();
  if (status === "canceled" || status === "cancelled" || status.includes("refunded") || (receipt.refunds?.length ?? 0) > 0) return "refunded";
  if (receipt.is_paid !== true || (status !== "paid" && status !== "completed")) return "not_paid";
  return null;
}

function orderedTemplates(receipt: EtsyReceipt): string[] {
  return [...new Set(receipt.transactions.map((tx) => skuTemplate(tx.sku)).filter((s): s is string => s !== null))];
}
