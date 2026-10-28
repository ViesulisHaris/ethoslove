/*
 * What a tab remembers of an Etsy buyer, in sessionStorage: that they came from an Etsy order (the
 * editor's pay sheet becomes the "Bought on Etsy" box) and the order number they typed on /etsy, so
 * that box starts with it. Kept for the tab only, so signing in on the way doesn't lose it.
 */

export const ETSY_MODE = "ethos-etsy";
export const ETSY_ORDER = "ethos-etsy-order";

export function rememberEtsyOrder(order: string) {
  try {
    sessionStorage.setItem(ETSY_ORDER, order.trim());
    sessionStorage.setItem(ETSY_MODE, "1");
  } catch {}
}

export function rememberedEtsyOrder(): string | null {
  try {
    return sessionStorage.getItem(ETSY_ORDER);
  } catch {
    return null;
  }
}
