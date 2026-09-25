import type Stripe from "stripe";

/**
 * An in-memory stand-in for the Stripe SDK, covering what the membership code calls: subscriptions
 * (retrieve with the expansions fulfilment asks for, update, cancel), invoices (retrieve, update, list,
 * void, preview), customers, refunds, payment intents and the billing portal. Every call is recorded,
 * so a test can say that nothing was written to Stripe for somebody else's event.
 */
type Obj = Record<string, unknown>;

export type FakeSubscriptionInput = {
  id?: string;
  status?: string;
  customer?: string;
  interval?: "month" | "year";
  amount?: number;
  currency?: string;
  product?: string;
  start?: number;
  /** Defaults to a month or a year before periodEnd. */
  periodStart?: number;
  periodEnd?: number;
  cancelAtPeriodEnd?: boolean;
  cancelAt?: number | null;
  endedAt?: number | null;
  cancellationReason?: string | null;
  metadata?: Record<string, string>;
  latestInvoice?: string | null;
};

const s = (ms: number) => Math.floor(ms / 1000);

export class FakeStripe {
  subscriptions: Record<string, Obj> = {};
  invoices: Record<string, Obj> = {};
  customers: Record<string, Obj> = {};
  refunds: Record<string, Obj[]> = {};
  paymentIntents: Record<string, Obj> = {};
  calls: { method: string; args: unknown[] }[] = [];
  /** What the next plan switch does: switch, or wait on a payment that failed or needs the bank. */
  switchOutcome: "switched" | "payment_failed" | "requires_action" = "switched";
  /** Throw on the next call to this method, as Stripe being unreachable would. */
  failing = new Set<string>();

  constructor(private readonly now: () => number) {}

  addSubscription(input: FakeSubscriptionInput): Obj {
    const id = input.id ?? `sub_${Object.keys(this.subscriptions).length + 1}`;
    const periodEnd = input.periodEnd ?? this.now() + 30 * 86_400_000;
    const periodStart = input.periodStart ?? periodEnd - (input.interval === "month" ? 30 : 365) * 86_400_000;
    const sub: Obj = {
      id,
      object: "subscription",
      status: input.status ?? "active",
      customer: input.customer ?? "cus_1",
      currency: input.currency ?? "eur",
      start_date: s(input.start ?? this.now()),
      cancel_at_period_end: input.cancelAtPeriodEnd ?? false,
      cancel_at: input.cancelAt ? s(input.cancelAt) : null,
      ended_at: input.endedAt ? s(input.endedAt) : null,
      cancellation_details: { reason: input.cancellationReason ?? null },
      metadata: input.metadata ?? {},
      latest_invoice: input.latestInvoice ?? null,
      pending_update: null,
      items: {
        data: [
          {
            id: `si_${id}`,
            current_period_start: s(periodStart),
            current_period_end: s(periodEnd),
            price: { currency: input.currency ?? "eur", unit_amount: input.amount ?? (input.interval === "month" ? 499 : 2999), product: input.product ?? "prod_fortwo", recurring: { interval: input.interval ?? "year" } },
          },
        ],
      },
    };
    this.subscriptions[id] = sub;
    return sub;
  }

  addInvoice(invoice: Obj & { id: string }): Obj {
    const full: Obj = { object: "invoice", metadata: {}, status: "paid", currency: "eur", amount_paid: 0, amount_due: 0, status_transitions: { paid_at: s(this.now()) }, ...invoice };
    this.invoices[invoice.id] = full;
    return full;
  }

  private record(method: string, args: unknown[]) {
    this.calls.push({ method, args });
    if (this.failing.has(method)) {
      this.failing.delete(method);
      throw new Error(`stripe unreachable: ${method}`);
    }
  }

  /** Calls that change something at Stripe. */
  writes(): { method: string; args: unknown[] }[] {
    return this.calls.filter((c) => /\.(update|cancel|voidInvoice|create)$/.test(c.method) && c.method !== "invoices.createPreview");
  }

  private expanded(sub: Obj, expand: string[] = []): Obj {
    const out: Obj = { ...sub };
    if (expand.includes("customer") && typeof sub.customer === "string") out.customer = this.customers[sub.customer] ?? { id: sub.customer, deleted: false, metadata: {} };
    if (expand.some((e) => e.startsWith("latest_invoice")) && typeof sub.latest_invoice === "string") out.latest_invoice = this.invoices[sub.latest_invoice] ?? null;
    return out;
  }

  get client(): Stripe {
    return {
      subscriptions: {
        retrieve: async (id: string, params?: { expand?: string[] }) => {
          this.record("subscriptions.retrieve", [id, params]);
          const sub = this.subscriptions[id];
          if (!sub) throw new Error(`No such subscription: ${id}`);
          return this.expanded(sub, params?.expand);
        },
        update: async (id: string, params: Obj) => {
          this.record("subscriptions.update", [id, params]);
          const sub = this.subscriptions[id];
          if (!sub) throw new Error(`No such subscription: ${id}`);
          if ("cancel_at_period_end" in params) {
            sub.cancel_at_period_end = params.cancel_at_period_end;
            const item = (sub.items as { data: Obj[] }).data[0];
            sub.cancel_at = params.cancel_at_period_end ? item.current_period_end : null;
          }
          if ("cancel_at" in params) sub.cancel_at = params.cancel_at === "" ? null : params.cancel_at;
          if (params.metadata) sub.metadata = { ...(sub.metadata as Obj), ...(params.metadata as Obj) };
          const items = params.items as { price_data: { recurring: { interval: string }; unit_amount: number } }[] | undefined;
          if (items) {
            if (this.switchOutcome !== "switched") {
              const invoice = this.addInvoice({ id: `in_switch_${Object.keys(this.invoices).length + 1}`, status: "open", billing_reason: "subscription_update", hosted_invoice_url: "https://invoice.stripe.test/i/1", payments: { data: [{ status: "open", is_default: true, payment: { payment_intent: "pi_switch" } }] } });
              this.paymentIntents.pi_switch = { id: "pi_switch", status: this.switchOutcome === "requires_action" ? "requires_action" : "requires_payment_method" };
              return { ...sub, pending_update: { expires_at: s(this.now()) + 82_800 }, latest_invoice: invoice };
            }
            const item = (sub.items as { data: Obj[] }).data[0];
            const interval = items[0].price_data.recurring.interval;
            item.price = { ...(item.price as Obj), recurring: { interval }, unit_amount: items[0].price_data.unit_amount };
            // A change of interval starts a new period now.
            item.current_period_start = s(this.now());
            item.current_period_end = s(this.now() + (interval === "year" ? 365 : 30) * 86_400_000);
          }
          return { ...sub };
        },
        cancel: async (id: string, params?: Obj) => {
          this.record("subscriptions.cancel", [id, params]);
          const sub = this.subscriptions[id];
          if (!sub) throw new Error(`No such subscription: ${id}`);
          Object.assign(sub, { status: "canceled", ended_at: s(this.now()), canceled_at: s(this.now()), cancellation_details: { reason: "cancellation_requested" } });
          return { ...sub };
        },
      },
      invoices: {
        retrieve: async (id: string, params?: Obj) => {
          this.record("invoices.retrieve", [id, params]);
          const invoice = this.invoices[id];
          if (!invoice) throw new Error(`No such invoice: ${id}`);
          return { ...invoice };
        },
        update: async (id: string, params: { metadata?: Obj }) => {
          this.record("invoices.update", [id, params]);
          const invoice = this.invoices[id];
          if (invoice && params.metadata) invoice.metadata = { ...(invoice.metadata as Obj), ...params.metadata };
          return { ...invoice };
        },
        list: async (params: { subscription?: string; status?: string }) => {
          this.record("invoices.list", [params]);
          const data = Object.values(this.invoices).filter((i) => (!params.status || i.status === params.status) && (!params.subscription || (i.parent as { subscription_details?: { subscription?: string } } | undefined)?.subscription_details?.subscription === params.subscription));
          return { data, has_more: false };
        },
        voidInvoice: async (id: string) => {
          this.record("invoices.voidInvoice", [id]);
          const invoice = this.invoices[id];
          if (invoice) invoice.status = "void";
          return { ...invoice };
        },
        createPreview: async (params: Obj) => {
          this.record("invoices.createPreview", [params]);
          return { amount_due: 2749, currency: "eur", lines: { data: [{ period: { start: s(this.now()), end: s(this.now() + 365 * 86_400_000) } }] } };
        },
      },
      customers: {
        retrieve: async (id: string) => {
          this.record("customers.retrieve", [id]);
          const customer = this.customers[id];
          if (!customer) throw new Error(`No such customer: ${id}`);
          return { ...customer };
        },
        update: async (id: string, params: { metadata?: Obj }) => {
          this.record("customers.update", [id, params]);
          const customer = (this.customers[id] ??= { id, deleted: false, metadata: {} });
          if (params.metadata) customer.metadata = { ...(customer.metadata as Obj), ...params.metadata };
          return { ...customer };
        },
      },
      refunds: {
        list: async (params: { charge: string }) => {
          this.record("refunds.list", [params]);
          return { data: this.refunds[params.charge] ?? [] };
        },
      },
      paymentIntents: {
        retrieve: async (id: string) => {
          this.record("paymentIntents.retrieve", [id]);
          return this.paymentIntents[id] ?? { id, status: "succeeded" };
        },
      },
      billingPortal: {
        sessions: {
          create: async (params: Obj) => {
            this.record("billingPortal.sessions.create", [params]);
            return { url: "https://billing.stripe.test/p/session_1" };
          },
        },
      },
      checkout: {
        sessions: {
          create: async (params: Obj) => {
            this.record("checkout.sessions.create", [params]);
            const n = this.calls.filter((c) => c.method === "checkout.sessions.create").length;
            return { id: `cs_test_${n}`, object: "checkout.session", url: `https://checkout.stripe.test/c/cs_test_${n}`, mode: params.mode, metadata: params.metadata };
          },
        },
      },
    } as unknown as Stripe;
  }
}
