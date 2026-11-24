/**
 * The last QR design chosen for a gift on the share screen, kept in this browser only, so The Tree Tag
 * opened later from the dashboard prints the same code as the one opened from the share screen. A
 * convenience: when it is missing (another device, cleared storage, a private window) the print page
 * draws its default, which is also the QR designer's default.
 */
const KEY = (giftId: string) => `ethos.qr-design.${giftId}`;
const KEYS = ["dots", "colour", "gradient", "centre", "photo", "size", "label"] as const;

/** Only the design's own fields, nothing else a stored string might carry (the print page checks each value again). */
export function cleanDesignQuery(query: string): string {
  const read = new URLSearchParams(query);
  const kept = new URLSearchParams();
  for (const key of KEYS) {
    const value = read.get(key);
    if (value) kept.set(key, value.slice(0, 80));
  }
  return kept.toString();
}

export function rememberQrDesign(giftId: string, query: string): void {
  const clean = cleanDesignQuery(query);
  if (!clean) return;
  try {
    window.localStorage.setItem(KEY(giftId), clean);
  } catch {
    /* storage blocked: the default design prints */
  }
}

export function rememberedQrDesign(giftId: string): string {
  try {
    return cleanDesignQuery(window.localStorage.getItem(KEY(giftId)) ?? "");
  } catch {
    return "";
  }
}
