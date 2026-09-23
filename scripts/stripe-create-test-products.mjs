/**
 * Creates the three Ethos products in Stripe TEST mode (idempotent by name) and prints
 * the env lines to use with test keys. Live-mode products are created in the Dashboard
 * (docs/STRIPE.md §1).   Usage: node scripts/stripe-create-test-products.mjs
 */
import Stripe from "stripe";
import { readFileSync } from "node:fs";

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1)]));
if (!env.STRIPE_SECRET_KEY?.startsWith("sk_test_")) throw new Error("STRIPE_SECRET_KEY in .env.local must be a test key (sk_test_…)");
const stripe = new Stripe(env.STRIPE_SECRET_KEY);

const CATALOG = [
  { key: "STRIPE_PRODUCT_SINGLE", name: "Ethos — One template", description: "One premium gift template, unlocked on your account forever. No subscription.", eur: 749, usd: 799, gbp: 649 },
  { key: "STRIPE_PRODUCT_PICK3", name: "Ethos — Pick three", description: "Any three templates, free or premium, unlocked forever. No subscription.", eur: 1099, usd: 1199, gbp: 949 },
  { key: "STRIPE_PRODUCT_EVERYTHING", name: "Ethos — Everything", description: "Every template, current and future, unlocked forever. No subscription.", eur: 2299, usd: 2499, gbp: 1999 },
];

const existing = await stripe.products.list({ active: true, limit: 100 });
const out = [];
for (const item of CATALOG) {
  let product = existing.data.find((p) => p.name === item.name);
  if (!product) {
    product = await stripe.products.create({
      name: item.name,
      description: item.description,
      tax_code: "txcd_10000000", // General – Electronically Supplied Services
      statement_descriptor: "ETHOS",
      default_price_data: {
        currency: "eur",
        unit_amount: item.eur,
        tax_behavior: "inclusive",
        currency_options: { usd: { unit_amount: item.usd, tax_behavior: "inclusive" }, gbp: { unit_amount: item.gbp, tax_behavior: "inclusive" } },
      },
    });
    console.log("created", item.name, product.id);
  } else {
    console.log("exists ", item.name, product.id);
  }
  out.push(`${item.key}=${product.id}`);
}
console.log("\n# test-mode products:\n" + out.join("\n"));
