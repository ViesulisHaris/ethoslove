/**
 * Real proof on the site, and the pay screen that leads with it: numbers counted by the database and
 * only ever rounded down; reactions shown only with their writer's yes, the owner's approval and the
 * sender's silence, as their emoji and words and nothing else; the pay panel opening with the outcome
 * and saying what each paid part does, inside its budget.
 */
import { NextRequest } from "next/server";
import { renderToStaticMarkup } from "react-dom/server";
import { NextIntlClientProvider } from "next-intl";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import en from "../../messages/en.json";
import es from "../../messages/es.json";
import { signToken } from "@/lib/lifecycle/links";
import { MIN_OPENED, OPENS_WORTH_SAYING, SENDER_DAYS, SHOWN_TEXT_MAX, roundDown, shownReaction, toProof, type ReactionRow } from "@/lib/proof/numbers";
import { ReactionEmail } from "@/emails/templates";
import { getManifest } from "@/templates/manifests";
import { FakeDb } from "./helpers/fake-db";

const state = vi.hoisted(() => ({ db: null as unknown, notified: [] as unknown[][], limited: false, cleared: [] as unknown[][] }));
vi.mock("server-only", () => ({}));
// Outside a request there is no Next cache: the cached readers run as they are, and clearing is recorded.
vi.mock("next/cache", () => ({
  unstable_cache: (fn: (...args: unknown[]) => unknown) => fn,
  revalidateTag: (...args: unknown[]) => void state.cleared.push(["tag", ...args]),
  revalidatePath: (...args: unknown[]) => void state.cleared.push(["path", ...args]),
}));
vi.mock("@/lib/rate-limit", () => ({ rateLimit: async () => !state.limited }));
vi.mock("@/lib/supabase/admin", () => ({ getSupabaseAdminClient: () => state.db }));
vi.mock("@/lib/email/notify", () => ({ notifyReaction: async (...args: unknown[]) => void state.notified.push(args) }));
vi.mock("@/lib/app/use-bridge", () => ({ useInApp: () => false, useNativeEvents: () => undefined, useNativeReady: () => undefined }));
vi.mock("@/i18n/navigation", () => ({
  Link: ({ href, children, ...rest }: { href: string; children?: React.ReactNode }) => (
    <a href={href} {...rest}>
      {children}
    </a>
  ),
  usePathname: () => "/create/bouquet",
  useRouter: () => ({ push: () => undefined }),
}));
vi.mock("next-intl/server", () => ({
  getTranslations: async ({ locale, namespace }: { locale: "en" | "es"; namespace: string }) => {
    const root = namespace.split(".").reduce<Record<string, unknown>>((node, key) => node[key] as Record<string, unknown>, (locale === "es" ? es : en) as Record<string, unknown>);
    return (key: string, values: Record<string, string> = {}) => {
      const text = key.split(".").reduce<unknown>((node, part) => (node as Record<string, unknown>)[part], root) as string;
      return text.replace(/\{(\w+)\}/g, (_, name: string) => values[name] ?? "");
    };
  },
}));

const { Reactions } = await import("@/components/marketing/home/reactions");
const { Paywall } = await import("@/components/editor/paywall");
const reactRoute = await import("@/app/api/gift/[shortId]/react/route");
const privateRoute = await import("@/app/api/reactions/private/route");
const { shownReactions } = await import("@/lib/proof/proof");

const NOW = Date.parse("2026-10-22T10:00:00Z");
const DAY = 86_400_000;
const SECRET = "proof-test-secret";

describe("the numbers", () => {
  it("round down to two significant figures, so they stay true", () => {
    expect([14_237, 14_000, 987, 1_999, 123_456, 56, 100, 0, -5, Number.NaN].map(roundDown)).toEqual([14_000, 14_000, 980, 1_900, 120_000, 56, 100, 0, 0, 0]);
  });

  it(`say nothing below ${MIN_OPENED} gifts opened, or when the database answers nonsense`, () => {
    expect(toProof({ opened: MIN_OPENED - 1, opens: 900 })).toBeNull();
    expect(toProof({ opened: "lots", opens: 3 })).toBeNull();
    expect(toProof(null)).toBeNull();
    expect(toProof({ opened: MIN_OPENED, opens: MIN_OPENED })).toEqual({ opened: MIN_OPENED, more: false, opensEach: null });
  });

  it(`give opens per gift only from ${OPENS_WORTH_SAYING} up, down to a tenth`, () => {
    expect(toProof({ opened: 14_237, opens: 47_900 })).toEqual({ opened: 14_000, more: true, opensEach: 3.3 });
    expect(toProof({ opened: 14_237, opens: 42_000 })).toEqual({ opened: 14_000, more: true, opensEach: null });
  });
});

describe("which reactions may be shown", () => {
  const row = (over: Partial<ReactionRow> = {}): ReactionRow => ({
    emoji: "😭",
    text: "I watched it four times.",
    share_consent: true,
    approved_at: new Date(NOW - DAY).toISOString(),
    sender_withheld_at: null,
    created_at: new Date(NOW - (SENDER_DAYS + 1) * DAY).toISOString(),
    ...over,
  });

  it("only with the writer's yes, the owner's approval, and the sender's silence for a week", () => {
    expect(shownReaction(row(), NOW)).toEqual({ emoji: "😭", text: "I watched it four times." });
    expect(shownReaction(row({ share_consent: false }), NOW)).toBeNull();
    expect(shownReaction(row({ approved_at: null }), NOW)).toBeNull();
    expect(shownReaction(row({ sender_withheld_at: new Date(NOW).toISOString() }), NOW)).toBeNull();
    expect(shownReaction(row({ created_at: new Date(NOW - 2 * DAY).toISOString() }), NOW)).toBeNull();
  });

  it("only a few words: none, or too many, and it isn't shown; invisible characters are dropped", () => {
    expect(shownReaction(row({ text: null }), NOW)).toBeNull();
    expect(shownReaction(row({ text: " ​ " }), NOW)).toBeNull();
    expect(shownReaction(row({ text: "x".repeat(SHOWN_TEXT_MAX + 1) }), NOW)).toBeNull();
    expect(shownReaction(row({ text: "  so‮  good  " }), NOW)).toEqual({ emoji: "😭", text: "so good" });
  });
});

describe("the reactions a page reads", () => {
  const read = (rows: Record<string, unknown>[]) => {
    state.db = new FakeDb({ reactions: rows }, NOW).db;
  };
  const shown = (id: string, text: string, locale: string | null, approvedDaysAgo: number) => ({
    id,
    gift_id: "00000000-0000-4000-8000-000000000001",
    emoji: "😭",
    text,
    locale,
    share_consent: true,
    approved_at: new Date(NOW - approvedDaysAgo * DAY).toISOString(),
    sender_withheld_at: null,
    created_at: new Date(NOW - (SENDER_DAYS + 3) * DAY).toISOString(),
  });
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it("are in the page's own language only, newest approval first", async () => {
    read([shown("a", "Four times.", "en", 3), shown("b", "Lo vi cuatro veces.", "es", 2), shown("c", "Best gift yet.", "en", 1), shown("d", "Sin palabras.", "es", 4), shown("e", "From before languages.", null, 1)]);
    expect((await shownReactions(3, "en")).map((r) => r.text)).toEqual(["Best gift yet.", "Four times."]);
    expect((await shownReactions(3, "es")).map((r) => r.text)).toEqual(["Lo vi cuatro veces.", "Sin palabras."]);
  });

  it("none in a language: that page gets none, never another language's", async () => {
    read([shown("a", "Four times.", "en", 1), shown("b", "Best gift yet.", "en", 2), shown("c", "I cried.", "en", 3)]);
    expect(await shownReactions(3, "es")).toEqual([]);
    expect(await shownReactions(1, "en")).toEqual([{ emoji: "😭", text: "Four times." }]);
  });
});

const intl = (node: React.ReactNode, locale: "en" | "es" = "en") =>
  renderToStaticMarkup(
    <NextIntlClientProvider locale={locale} messages={locale === "es" ? es : en} timeZone="UTC">
      {node}
    </NextIntlClientProvider>,
  );

describe("the home page's reactions section", () => {
  const real = [
    { emoji: "😭", text: "I watched it four times." },
    { emoji: "🥹", text: "<img src=x onerror=alert(1)>" },
    { emoji: "❤️", text: "Best thing anyone's made me." },
  ];

  it("shows the samples, said to be samples, until real ones are approved", () => {
    const html = intl(<Reactions />);
    expect(html).toContain("Sample reactions.");
    expect(html).toContain("Marco");
    expect(html).not.toContain('data-testid="proof-numbers"');
  });

  it("then the real ones instead: emoji and words only, as text, and no sample names", () => {
    const html = intl(<Reactions real={real} />);
    expect(html).toContain("Real reactions, shared by the people who got the gifts. Names left out.");
    expect(html.match(/A real reaction/g)).toHaveLength(3);
    expect(html).toContain("&lt;img src=x onerror=alert(1)&gt;");
    expect(html).not.toContain("<img src=x");
    for (const sample of ["Marco", "Sofía", "stairwell", "Sample reactions"]) expect(html).not.toContain(sample);
  });

  it("says the count, rounded down, in the reader's language", () => {
    expect(intl(<Reactions numbers={{ opened: 14_000, more: true, opensEach: 3.3 }} />)).toContain("14,000+ Ethos gifts opened so far, 3.3 times each on average.");
    expect(intl(<Reactions numbers={{ opened: 14_000, more: true, opensEach: null }} />)).toContain("14,000+ Ethos gifts opened so far.");
    expect(intl(<Reactions numbers={{ opened: 14_000, more: true, opensEach: 3.3 }} />, "es")).toContain("14.000+ regalos de Ethos abiertos hasta ahora, 3,3 veces cada uno de media.");
  });
});

describe("the pay panel", () => {
  const bouquet = getManifest("bouquet")!;
  const letter = getManifest("the-letter")!;
  const pay = (props: Partial<Parameters<typeof Paywall>[0]> = {}, locale: "en" | "es" = "en") =>
    intl(<Paywall manifest={bouquet} currency="eur" locale={locale} guest={false} features={["Your voice saying it", "Only they can open it"]} returnTo="/create/bouquet?resume=publish" upgrade={null} blocked={false} {...props} />, locale);

  it("opens with the outcome, then what each paid part does for them", () => {
    const html = pay();
    expect(html).toContain("Picture their face when it opens");
    expect(html).toContain("In this gift: Your voice saying it · Only they can open it");
    expect(html).toContain("Pay once and this template is yours for good.");
    for (const part of ["Voice messages", "Scheduling", "Password", "This gift uses", "no password needed"]) expect(html).not.toContain(part);
  });

  it("keeps its budget: two rows, one button, and the small print under it", () => {
    const html = pay();
    expect(html.match(/role="radio"/g)).toHaveLength(2);
    expect(html.match(/data-testid="pay-single"/g)).toHaveLength(1);
    expect(html).toContain('data-testid="guarantee"');
  });

  it("opens with a real reaction instead, when the site has one it may show, and still within budget", () => {
    const html = pay({ reaction: { emoji: "😭", text: "I watched it four times." } });
    expect(html).toContain("“I watched it four times.”");
    expect(html).toContain("a real reaction to an Ethos gift");
    expect(html).not.toContain("Picture their face");
    expect(html.match(/role="radio"/g)).toHaveLength(2);
  });

  it("in Spanish, and for a free template's extras", () => {
    expect(pay({}, "es")).toContain("Imagina su cara cuando lo abra");
    const extras = pay({ manifest: letter, features: ["Tu voz diciéndolo"] }, "es");
    expect(extras).toContain("En este regalo: Tu voz diciéndolo");
    expect(extras).toContain("Hazlo especial una vez y esta plantilla los conserva para siempre.");
    // A guest's account needs no sign-up, and nothing there says "password" beside a gift that has one.
    expect(pay({ guest: true })).toContain("nothing to sign up for");
  });
});

describe("the pricing cards' words", () => {
  it("lead with the outcome and say what each part does, under the same plan names", () => {
    expect([en.pricing.plans.single.name, en.pricing.plans.pick3.name, en.pricing.plans.everything.name]).toEqual(["One template", "Pick three", "Everything"]);
    expect([es.pricing.plans.single.name, es.pricing.plans.pick3.name, es.pricing.plans.everything.name]).toEqual(["Una plantilla", "Elige tres", "Todo"]);
    expect(en.pricing.plans.single.features).toEqual(expect.arrayContaining(["Your voice saying it, or your video", "Opens at midnight on their day", "Only they can open it"]));
    expect(es.pricing.plans.single.features).toEqual(expect.arrayContaining(["Tu voz diciéndolo, o tu vídeo", "Se abre a medianoche en su día", "Solo esa persona puede abrirlo"]));
    for (const plan of [en.pricing.plans.single, en.pricing.plans.everything]) for (const old of ["Video and voice messages", "Scheduling and password"]) expect(plan.features).not.toContain(old);
  });
});

// --- Sending a reaction, and the sender's no ------------------------------------------------

const GIFT = "00000000-0000-4000-8000-000000000001";
function reactionDb(locale: "en" | "es" = "en") {
  const fake = new FakeDb({ reactions: [] }, NOW);
  const db = fake.db as unknown as { from: unknown };
  state.db = {
    from: db.from,
    rpc: async (name: string, args: Record<string, unknown>) => {
      if (name === "get_public_gift") return { data: { id: GIFT, locale }, error: null };
      if (name === "add_reaction") {
        const id = `r-${fake.rows("reactions").length + 1}`;
        fake.rows("reactions").push({ id, gift_id: GIFT, emoji: args.p_emoji, text: args.p_text, audio_path: args.p_audio_path, created_at: new Date(NOW).toISOString(), share_consent: false, share_consent_at: null, sender_withheld_at: null, approved_at: null });
        return { data: id, error: null };
      }
      return { data: null, error: { message: `no rpc ${name}` } };
    },
  };
  fake.tables.reactions = fake.rows("reactions");
  return fake;
}
const react = (fields: Record<string, string>) => {
  const form = new FormData();
  for (const [k, v] of Object.entries(fields)) form.set(k, v);
  return reactRoute.POST(new NextRequest("https://ethos.test/api/gift/abc23def4/react", { method: "POST", body: form }), { params: Promise.resolve({ shortId: "abc23def4" }) } as never);
};

describe("a recipient's yes to showing their reaction", () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    state.notified = [];
    state.limited = false;
  });
  afterEach(() => vi.useRealTimers());

  it("is kept with the moment they gave it, only when they ticked the box, and the sender is told", async () => {
    const fake = reactionDb();
    expect((await react({ emoji: "😭", text: "I watched it four times.", share: "1" })).status).toBe(200);
    expect(fake.rows("reactions")[0]).toMatchObject({ share_consent: true, share_consent_at: new Date(NOW).toISOString(), approved_at: null, locale: "en" });
    expect(state.notified[0]).toEqual([GIFT, "😭", "I watched it four times.", false, "r-1"]);

    expect((await react({ emoji: "❤️", text: "Thank you" })).status).toBe(200);
    expect(fake.rows("reactions")[1]).toMatchObject({ share_consent: false, share_consent_at: null });
    expect(state.notified[1]).toEqual([GIFT, "❤️", "Thank you", false, null]);
  });

  it("keeps the gift's language with the yes, so only that language's pages may show it", async () => {
    const fake = reactionDb("es");
    await react({ emoji: "😭", text: "Lo he visto cuatro veces.", share: "1" });
    expect(fake.rows("reactions")[0]).toMatchObject({ share_consent: true, locale: "es" });
  });

  it("an emoji alone has nothing to show, so the sender isn't asked about it", async () => {
    reactionDb();
    await react({ emoji: "🥹", text: "", share: "1" });
    expect(state.notified[0][4]).toBeNull();
  });

  it("the email tells the sender, with a link to keep it private; without the yes, nothing about it", () => {
    const base = { locale: "en" as const, recipientName: "Leo", emoji: "😭", text: "I watched it four times.", hasAudio: false, dashboardUrl: "https://ethos.test/dashboard/gift/x" };
    const told = renderToStaticMarkup(ReactionEmail({ ...base, privateUrl: "https://ethos.test/api/reactions/private?t=abc" }));
    expect(told).toContain("Leo said Ethos may show this reaction on its site");
    expect(told).toContain('href="https://ethos.test/api/reactions/private?t=abc"');
    expect(told).toContain("keep it private");
    expect(renderToStaticMarkup(ReactionEmail(base))).not.toContain("keep it private");
  });
});

describe("the sender's no", () => {
  beforeAll(() => {
    process.env.VIEWER_HASH_SECRET = SECRET;
  });
  const linkPage = async (method: "GET" | "POST", token: string) => {
    const res = await privateRoute[method](new NextRequest(`https://ethos.test/api/reactions/private?t=${encodeURIComponent(token)}&l=en`, { method }));
    return { status: res.status, text: (await res.text()).replace(/&#39;/g, "'") };
  };

  it("asks first, then keeps it off the site for good", async () => {
    const fake = new FakeDb({ reactions: [{ id: "11111111-1111-4111-8111-111111111111", gift_id: GIFT, emoji: "😭", text: "x", share_consent: true, approved_at: new Date(NOW).toISOString(), sender_withheld_at: null }] }, NOW);
    state.db = fake.db;
    const token = await signToken("reaction-private", "11111111-1111-4111-8111-111111111111", SECRET);
    expect((await linkPage("GET", token)).text).toContain("Keep this reaction private?");
    expect(fake.rows("reactions")[0].sender_withheld_at).toBeNull();
    expect((await linkPage("POST", token)).text).toContain("It's private.");
    expect(fake.rows("reactions")[0].sender_withheld_at).not.toBeNull();
    // Already on the site: gone on the next visit, never served from a cache.
    expect(state.cleared).toEqual([
      ["tag", "proof-reactions", { expire: 0 }],
      ["path", "/[locale]/gifts", "page"],
    ]);
    expect((await linkPage("GET", token)).text).toContain("It's private.");
    expect((await linkPage("POST", `11111111-1111-4111-8111-111111111111.${"A".repeat(43)}`)).status).toBe(404);
  });
});
