import type { AbstractIntlMessages } from "next-intl";

/**
 * Cutting the message catalogue down to what the browser needs, and putting the pieces back
 * together. Pure, so the client provider (merge-messages.tsx) and the tests share it.
 */

/** The part of `all` under each dotted path ("dates", "money.checkoutErrors"), in the same shape. */
export function pickMessages(all: AbstractIntlMessages, paths: readonly string[]): AbstractIntlMessages {
  let out: AbstractIntlMessages = {};
  for (const path of paths) {
    const keys = path.split(".");
    let node: AbstractIntlMessages | string | undefined = all;
    for (const key of keys) node = typeof node === "object" ? node[key] : undefined;
    if (node === undefined) continue;
    const branch = keys.reduceRight<AbstractIntlMessages | string>((inner, key) => ({ [key]: inner }), node);
    out = mergeMessages(out, branch as AbstractIntlMessages);
  }
  return out;
}

/** `extra` laid over `base`, branch by branch: a nested provider adds to what's above it. */
export function mergeMessages(base: AbstractIntlMessages, extra: AbstractIntlMessages): AbstractIntlMessages {
  const out: AbstractIntlMessages = { ...base };
  for (const [key, value] of Object.entries(extra)) {
    const under = out[key];
    out[key] = typeof value === "object" && typeof under === "object" ? mergeMessages(under, value) : value;
  }
  return out;
}

/** Does a provider that sends `sent` cover a component reading `needed` ("games.lobby" is covered by "games")? */
export function isCovered(needed: string, sent: readonly string[]): boolean {
  return sent.some((path) => needed === path || needed.startsWith(`${path}.`));
}
