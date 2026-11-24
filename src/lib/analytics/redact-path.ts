/**
 * A page's path as analytics may see it. Two kinds of address are keys, not just places: a gift's
 * link (/g/abc123 opens that gift) and a group card's link (/c/<token> opens the page where people
 * add their note). Both are reported with the key taken out, so a report can say "a gift was
 * opened" and never which.
 */
export function redactPath(pathname: string): string {
  return pathname.replace(/^((?:\/(?:en|es))?\/g\/)[^/]+/, "$1[shortId]").replace(/^((?:\/(?:en|es))?\/c\/)[^/]+/, "$1[token]");
}
