import type { Db } from "@/lib/commerce/db";

/**
 * An in-memory stand-in for the service-role Supabase client, covering the query-builder calls the
 * commerce code makes: select / insert / upsert / update / delete, the eq / in / is / lt(e) / gt(e)
 * filters, order, limit, single and maybeSingle. Unique constraints mirror the migrations, so a
 * duplicate fails with Postgres's 23505 the way the real one does, and a failing statement changes
 * nothing.
 */
type Row = Record<string, unknown>;
type Result = { data: unknown; error: { code?: string; message: string } | null };

const UNIQUE: Record<string, string[][]> = {
  profiles: [["id"], ["email"]],
  purchases: [["id"], ["stripe_session_id"]],
  template_unlocks: [["id"], ["user_id", "template_slug"]],
  couple_passes: [["id"], ["purchase_id"], ["invite_code"]],
  gift_cards: [["id"], ["code"], ["purchase_id"]],
  creators: [["code"]],
  gifts: [["id"], ["short_id"]],
  free_replies: [["original_gift_id"], ["reply_gift_id"]],
  gift_card_details: [["purchase_id"]],
};

const DEFAULTS: Record<string, Row> = {
  purchases: { status: "pending", template_slugs: [], currency: "usd", creator_code: null, ref: null, discount_amount: null, kind: null, terms_consent: null, terms_consent_at: null },
  template_unlocks: { purchase_id: null },
  couple_passes: { partner_user_id: null, renewal_reminded_at: null },
  gift_cards: { purchase_id: null, buyer_user_id: null, recipient_name: null, note: null, redeemed_by: null, redeemed_at: null, expires_at: null },
};

let counter = 0;
const nextId = () => `00000000-0000-4000-8000-${String(++counter).padStart(12, "0")}`;

const isNull = (v: unknown) => v === null || v === undefined;

class Query implements PromiseLike<Result> {
  private op: "select" | "insert" | "upsert" | "update" | "delete" = "select";
  private filters: ((row: Row) => boolean)[] = [];
  private payload: Row[] = [];
  private patch: Row = {};
  private conflict: string[] = [];
  private ignoreDuplicates = false;
  private returning = false;
  private cardinality: "one" | "maybe" | null = null;
  private sort: { column: string; ascending: boolean } | null = null;
  private max: number | null = null;

  constructor(
    private readonly store: FakeDb,
    private readonly table: string,
  ) {}

  select() {
    if (this.op !== "select") this.returning = true;
    return this;
  }
  insert(rows: Row | Row[]) {
    this.op = "insert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    return this;
  }
  upsert(rows: Row | Row[], options: { onConflict?: string; ignoreDuplicates?: boolean } = {}) {
    this.op = "upsert";
    this.payload = Array.isArray(rows) ? rows : [rows];
    this.conflict = (options.onConflict ?? "id").split(",").map((c) => c.trim());
    this.ignoreDuplicates = Boolean(options.ignoreDuplicates);
    return this;
  }
  update(patch: Row) {
    this.op = "update";
    this.patch = patch;
    return this;
  }
  delete() {
    this.op = "delete";
    return this;
  }
  eq(column: string, value: unknown) {
    this.filters.push((row) => row[column] === value);
    return this;
  }
  neq(column: string, value: unknown) {
    this.filters.push((row) => row[column] !== value);
    return this;
  }
  in(column: string, values: unknown[]) {
    this.filters.push((row) => values.includes(row[column]));
    return this;
  }
  is(column: string, value: null) {
    this.filters.push((row) => (value === null ? isNull(row[column]) : row[column] === value));
    return this;
  }
  lt(column: string, value: string | number) {
    this.filters.push((row) => !isNull(row[column]) && (row[column] as string | number) < value);
    return this;
  }
  lte(column: string, value: string | number) {
    this.filters.push((row) => !isNull(row[column]) && (row[column] as string | number) <= value);
    return this;
  }
  gt(column: string, value: string | number) {
    this.filters.push((row) => !isNull(row[column]) && (row[column] as string | number) > value);
    return this;
  }
  gte(column: string, value: string | number) {
    this.filters.push((row) => !isNull(row[column]) && (row[column] as string | number) >= value);
    return this;
  }
  order(column: string, options: { ascending?: boolean } = {}) {
    this.sort = { column, ascending: options.ascending !== false };
    return this;
  }
  limit(n: number) {
    this.max = n;
    return this;
  }
  single() {
    this.cardinality = "one";
    return this;
  }
  maybeSingle() {
    this.cardinality = "maybe";
    return this;
  }

  then<A = Result, B = never>(onFulfilled?: ((value: Result) => A | PromiseLike<A>) | null, onRejected?: ((reason: unknown) => B | PromiseLike<B>) | null): PromiseLike<A | B> {
    return Promise.resolve()
      .then(() => this.run())
      .then(onFulfilled, onRejected);
  }

  private rows(): Row[] {
    return (this.store.tables[this.table] ??= []);
  }

  private matches(): Row[] {
    return this.rows().filter((row) => this.filters.every((f) => f(row)));
  }

  private violation(candidate: Row, others: Row[]): string | null {
    for (const columns of UNIQUE[this.table] ?? []) {
      if (columns.some((c) => isNull(candidate[c]))) continue;
      if (others.some((row) => row !== candidate && columns.every((c) => row[c] === candidate[c]))) return columns.join(",");
    }
    return null;
  }

  private withDefaults(row: Row): Row {
    return { ...(DEFAULTS[this.table] ?? {}), id: nextId(), created_at: new Date(this.store.now()).toISOString(), ...row };
  }

  private shape(rows: Row[]): Result {
    const copies = rows.map((row) => ({ ...row }));
    if (this.cardinality === "one") return copies.length === 1 ? { data: copies[0], error: null } : { data: null, error: { code: "PGRST116", message: "not exactly one row" } };
    if (this.cardinality === "maybe") return copies.length <= 1 ? { data: copies[0] ?? null, error: null } : { data: null, error: { code: "PGRST116", message: "more than one row" } };
    return { data: copies, error: null };
  }

  private run(): Result {
    const failure = this.store.failures.find((f) => f.table === this.table && f.op === this.op);
    if (failure) {
      this.store.failures.splice(this.store.failures.indexOf(failure), 1);
      return { data: null, error: { message: failure.message } };
    }
    this.store.calls.push({ table: this.table, op: this.op });
    const table = this.rows();

    if (this.op === "select") {
      let rows = this.matches();
      if (this.sort) {
        const { column, ascending } = this.sort;
        rows = [...rows].sort((a, b) => ((a[column] as string) < (b[column] as string) ? -1 : (a[column] as string) > (b[column] as string) ? 1 : 0) * (ascending ? 1 : -1));
      }
      if (this.max !== null) rows = rows.slice(0, this.max);
      return this.shape(rows);
    }

    if (this.op === "insert" || this.op === "upsert") {
      const next = [...table];
      const affected: Row[] = [];
      for (const raw of this.payload) {
        if (this.op === "upsert") {
          const existing = next.find((row) => this.conflict.every((c) => row[c] === raw[c]));
          if (existing) {
            if (this.ignoreDuplicates) continue;
            const merged = { ...existing, ...raw };
            next[next.indexOf(existing)] = merged;
            affected.push(merged);
            continue;
          }
        }
        const row = this.withDefaults(raw);
        next.push(row);
        const clash = this.violation(row, next);
        if (clash) return { data: null, error: { code: "23505", message: `duplicate key value violates unique constraint (${this.table}: ${clash})` } };
        affected.push(row);
      }
      this.store.tables[this.table] = next;
      return this.returning ? this.shape(affected) : { data: null, error: null };
    }

    if (this.op === "update") {
      const hit = this.matches();
      for (const row of hit) Object.assign(row, this.patch);
      return this.returning ? this.shape(hit) : { data: null, error: null };
    }

    const hit = this.matches();
    this.store.tables[this.table] = table.filter((row) => !hit.includes(row));
    return this.returning ? this.shape(hit) : { data: null, error: null };
  }
}

export class FakeDb {
  tables: Record<string, Row[]>;
  calls: { table: string; op: string }[] = [];
  failures: { table: string; op: string; message: string }[] = [];
  clock: number;

  constructor(seed: Record<string, Row[]> = {}, now = Date.parse("2026-09-23T12:00:00.000Z")) {
    this.tables = structuredClone(seed);
    this.clock = now;
  }

  now = () => this.clock;

  /** The next statement of this kind on this table fails, as a database error would. */
  failNext(table: string, op: string, message = "boom") {
    this.failures.push({ table, op, message });
  }

  rows(table: string): Row[] {
    return this.tables[table] ?? [];
  }

  get db(): Db {
    return { from: (table: string) => new Query(this, table) } as unknown as Db;
  }
}
