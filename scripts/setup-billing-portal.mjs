/**
 * Makes (or brings up to date) the two Stripe objects Ethos for Two's subscriptions need, on the
 * Stripe account Ethos shares with other businesses (docs/MEMBERSHIP.md 2.1 and 2.7):
 *
 * 1. Ethos's own Customer Portal configuration: cancel at the end of the period (no survey: leaving
 *    is as easy as joining), update the card, see invoices, change the billing name and address, and
 *    no plan switching (that happens on our account page, because the portal can only switch between
 *    standing Prices and Ethos keeps none). The account's default configuration belongs to nobody in
 *    particular and is never changed or made this one: the portal route always names ours. Stripe
 *    makes the first configuration an account gets its default, so on an account without one this
 *    refuses to create ours until the account's own default is saved in the Dashboard; a
 *    configuration of ours that is the default already is left alone and replaced by a new one
 *    (scripts/lib/portal-configuration.mjs).
 * 2. The "Ethos for Two" Product, with no Price at all (nothing without a price can turn up in another
 *    business's checkout), so subscription lines are filed under one Product with the digital-services
 *    tax code and "ETHOS FOR TWO" on the bank statement.
 *
 * Idempotent: it finds its own objects by their metadata (app "ethos", and which object it is) and
 * updates them; it never touches anything without that marker. Test mode first; a live key is refused
 * unless --live is passed. It prints the two variables to set:
 *
 *   node scripts/setup-billing-portal.mjs [--live] [envFile=.env.local]
 *   → STRIPE_PORTAL_CONFIGURATION=bpc_…   STRIPE_PRODUCT_FORTWO=prod_…
 */
import Stripe from "stripe";
import { readFileSync } from "node:fs";
import { PORTAL_MARKER, planPortalConfiguration } from "./lib/portal-configuration.mjs";

const args = process.argv.slice(2);
const live = args.includes("--live");
const envFile = args.find((a) => !a.startsWith("--")) ?? ".env.local";
const env = Object.fromEntries(
  readFileSync(envFile, "utf8")
    .split("\n")
    .filter((l) => l.includes("=") && !l.startsWith("#"))
    .map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim().replace(/^"|"$/g, "")]),
);
const key = env.STRIPE_SECRET_KEY;
if (!key) {
  console.error(`No STRIPE_SECRET_KEY in ${envFile}`);
  process.exit(1);
}
const isLiveKey = /^(sk|rk)_live_/.test(key);
if (isLiveKey && !live) {
  console.error("That is a LIVE key. Run it in test mode first; pass --live to do it on the live account.");
  process.exit(1);
}
if (!isLiveKey && live) {
  console.error("--live was passed with a test key: nothing done.");
  process.exit(1);
}

const stripe = new Stripe(key);
const SITE = "https://tryethos.io";
const dashboard = `https://dashboard.stripe.com${isLiveKey ? "" : "/test"}`;
/** A stop the owner acts on, printed as it is (not as Stripe's error). */
class Refusal extends Error {}
// Which of Ethos's objects each one is, beside the app marker every Ethos object carries (R3).
const PORTAL = PORTAL_MARKER;
const PRODUCT = { app: "ethos", ethos_object: "fortwo_product" };
const ours = (object, marker) => Object.entries(marker).every(([k, v]) => object.metadata?.[k] === v);

const portalSettings = {
  business_profile: { headline: "Ethos for Two", privacy_policy_url: `${SITE}/legal/privacy`, terms_of_service_url: `${SITE}/legal/terms` },
  default_return_url: `${SITE}/account#for-two`,
  features: {
    subscription_cancel: { enabled: true, mode: "at_period_end", proration_behavior: "none", cancellation_reason: { enabled: false, options: "" } },
    payment_method_update: { enabled: true },
    invoice_history: { enabled: true },
    customer_update: { enabled: true, allowed_updates: ["address", "name"] },
    subscription_update: { enabled: false },
  },
  metadata: PORTAL,
};

async function portalConfiguration() {
  const configurations = [];
  for await (const configuration of stripe.billingPortal.configurations.list({ limit: 100 })) configurations.push(configuration);
  const step = planPortalConfiguration(configurations);
  if (step.strandedDefault) {
    console.warn(
      `The portal configuration ${step.strandedDefault} carries Ethos's marker but is the account's DEFAULT (Stripe made it so when it was ` +
        "the account's first). It is left alone: every portal session opened without a configuration, another business's too, gets it. " +
        `Change it in the Dashboard (${dashboard}/settings/billing/portal edits the default) to what the account's default should say. ` +
        "Ethos uses the configuration printed below instead.",
    );
  }
  if (step.action === "refuse") {
    throw new Refusal(
      "This account has no default Customer Portal configuration, and Stripe makes the first one an account gets its default: " +
        "creating Ethos's now would give every other business on the account Ethos's portal. Save the account's own default first " +
        `(${dashboard}/settings/billing/portal → Save), then run this again.`,
    );
  }
  if (step.action === "update") {
    const updated = await stripe.billingPortal.configurations.update(step.id, { ...portalSettings, name: "Ethos for Two", active: true });
    console.log(`updated the portal configuration ${updated.id}`);
    return updated.id;
  }
  const created = await stripe.billingPortal.configurations.create({ ...portalSettings, name: "Ethos for Two" });
  if (created.is_default) throw new Refusal(`the new portal configuration ${created.id} came back as the account's default: stop, and fix that in the Dashboard before using it.`);
  console.log(`created the portal configuration ${created.id}`);
  return created.id;
}

async function product() {
  let found = null;
  for await (const candidate of stripe.products.list({ limit: 100 })) {
    if (ours(candidate, PRODUCT) && (!found || candidate.active)) found = candidate;
  }
  const settings = { name: "Ethos for Two", description: "Ethos for Two, for both of you: saved dates and trips, every gift template and every game pack.", tax_code: "txcd_10000000", statement_descriptor: "ETHOS FOR TWO", metadata: PRODUCT };
  if (found) {
    const updated = await stripe.products.update(found.id, { ...settings, active: true });
    console.log(`updated the product ${updated.id}`);
    return updated.id;
  }
  // No default_price_data: the product must never have a Price (docs/MEMBERSHIP.md 2.1, R6).
  const created = await stripe.products.create(settings);
  console.log(`created the product ${created.id}`);
  return created.id;
}

try {
  const [configuration, fortwo] = [await portalConfiguration(), await product()];
  console.log(`\n${isLiveKey ? "LIVE" : "Test"} mode. Set these (${isLiveKey ? "Vercel Production" : ".env.local and Vercel Preview"}):`);
  console.log(`STRIPE_PORTAL_CONFIGURATION=${configuration}`);
  console.log(`STRIPE_PRODUCT_FORTWO=${fortwo}`);
} catch (e) {
  if (e instanceof Refusal) console.error(`Stopped: ${e.message}`);
  else console.error(`Stripe said no: ${e.type ?? ""} ${e.code ?? ""} ${e.param ?? ""} ${e.message}`);
  process.exit(1);
}
