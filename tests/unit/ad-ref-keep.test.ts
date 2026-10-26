import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

/**
 * An ad's ref outlives the tab only for a visitor who allowed advertising cookies, only for 7 days,
 * and never for any other kind of link (lib/attribution/ref.ts, privacy policy section 12). Each
 * "visit" below is a fresh copy of the modules over the same browser storage, the way a reload or a
 * return the next day starts with nothing in memory.
 */

const DAY = 86_400_000;
const T0 = Date.UTC(2026, 9, 26, 17, 0);

function storage() {
  const items = new Map<string, string>();
  return {
    getItem: (key: string) => items.get(key) ?? null,
    setItem: (key: string, value: string) => void items.set(key, String(value)),
    removeItem: (key: string) => void items.delete(key),
    clear: () => items.clear(),
    items,
  };
}

let store: ReturnType<typeof storage>;

async function visit() {
  vi.resetModules();
  const consent = await import("@/lib/analytics/consent");
  const ref = await import("@/lib/attribution/ref");
  return { ...consent, ...ref };
}

beforeEach(() => {
  store = storage();
  vi.stubGlobal("window", { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} });
  vi.stubGlobal("localStorage", store);
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe("keeping an ad's ref for a buyer who comes back", () => {
  it("keeps nothing without a yes: the ref lasts for the tab only", async () => {
    const first = await visit();
    first.rememberRef("?ref=ad-meta-bq", T0);
    expect(first.currentRef(T0)).toBe("ad-meta-bq");
    expect(store.items.has(first.AD_REF_KEY)).toBe(false);

    const later = await visit();
    expect(later.currentRef(T0 + 4 * 3_600_000)).toBeUndefined();
  });

  it("counts a return visit to the ad when the visitor had said yes", async () => {
    const first = await visit();
    first.setConsent("granted");
    first.rememberRef("?ref=ad-meta-bq&utm_source=meta", T0);

    const later = await visit();
    expect(later.currentRef(T0 + 4 * 3_600_000)).toBe("ad-meta-bq");
  });

  it("keeps the ad from the moment of a yes given after landing", async () => {
    const first = await visit();
    first.rememberRef("?ref=ad-meta-pc", T0);
    expect(store.items.has(first.AD_REF_KEY)).toBe(false);
    first.setConsent("granted");
    first.keepAdRef(T0 + 60_000);

    const later = await visit();
    expect(later.currentRef(T0 + DAY)).toBe("ad-meta-pc");
  });

  it("removes it when the answer becomes no", async () => {
    const first = await visit();
    first.setConsent("granted");
    first.rememberRef("?ref=ad-meta-xo", T0);
    expect(store.items.has(first.AD_REF_KEY)).toBe(true);
    first.setConsent("denied");
    first.keepAdRef(T0 + 60_000);
    expect(store.items.has(first.AD_REF_KEY)).toBe(false);

    const later = await visit();
    expect(later.currentRef(T0 + DAY)).toBeUndefined();
  });

  it("is not read for someone whose answer is no, even if something was left behind", async () => {
    const first = await visit();
    first.setConsent("granted");
    first.rememberRef("?ref=ad-meta-bc", T0);
    store.setItem("ethos-consent", "denied");

    const later = await visit();
    expect(later.currentRef(T0 + DAY)).toBeUndefined();
  });

  it("lasts as long as Meta counts an ad click, 7 days, then goes", async () => {
    const first = await visit();
    first.setConsent("granted");
    first.rememberRef("?ref=ad-meta-bq", T0);

    expect((await visit()).currentRef(T0 + 6 * DAY)).toBe("ad-meta-bq");
    const late = await visit();
    expect(late.currentRef(T0 + 7 * DAY + 1)).toBeUndefined();
    expect(store.items.has(late.AD_REF_KEY)).toBe(false);
  });

  it("never keeps a creator's link, a post's link or a gift's", async () => {
    for (const ref of ["c-maya", "tt-couple", "jayandmya"]) {
      store.clear();
      const first = await visit();
      first.setConsent("granted");
      first.rememberRef(`?ref=${ref}`, T0);
      expect(first.currentRef(T0)).toBe(ref);
      expect(store.items.has(first.AD_REF_KEY)).toBe(false);
    }
  });

  it("lets the link of this visit win over an ad clicked earlier", async () => {
    const first = await visit();
    first.setConsent("granted");
    first.rememberRef("?ref=ad-meta-bq", T0);

    const later = await visit();
    later.rememberRef("?ref=c-maya", T0 + DAY);
    expect(later.currentRef(T0 + DAY)).toBe("c-maya");
  });

  it("ignores a stored value that isn't one it wrote", async () => {
    const first = await visit();
    first.setConsent("granted");
    for (const raw of ["not json", JSON.stringify({ ref: "c-maya", at: T0 }), JSON.stringify({ ref: "AD-META<>", at: T0 }), JSON.stringify({ ref: "ad-meta-bq", at: "yesterday" }), JSON.stringify({ ref: "ad-meta-bq", at: T0 + DAY })]) {
      store.setItem(first.AD_REF_KEY, raw);
      expect((await visit()).currentRef(T0)).toBeUndefined();
    }
  });
});
