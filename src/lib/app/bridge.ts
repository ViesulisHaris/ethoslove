/**
 * The website inside the iPhone app. The app opens the editor, the demos, the games, a sent gift
 * and a gift's stats in a WKWebView and, before any of the page's own scripts run, installs
 * `window.EthosNative` and marks `<html data-app="ios">`. That is what "app mode" means here: the
 * global exists. CSS reads the attribute (`[data-app-hide]` in globals.css); code reads the global.
 *
 * Calls go one way, as `request(type, payload)`, and resolve with the app's reply (the app answers
 * through WKScriptMessageHandlerWithReply). The app talks back with `ethos-native` events on
 * `window` ({ type: "entitlements" | "session", payload }), for things that change while a page is
 * open. Contract: the Ethos app's docs/ARCHITECTURE.md §2.8.
 *
 * Nothing here is used, or even defined, on the website outside the app: a normal browser never
 * has the global, so every caller keeps its web behaviour. No React here, so anything may import
 * it; the hooks are in ./use-bridge.
 */

export type NativeRequest =
  | { type: "ready"; payload: { route: "editor" | "game" | "demo" | "gift" | "other"; title?: string } }
  | { type: "close"; payload: Record<string, never> }
  | { type: "title"; payload: { title: string } }
  | { type: "haptic"; payload: { style: "selection" | "light" | "medium" | "success" | "warning" } }
  | { type: "signIn"; payload: { reason: "publish" | "pack" | "save" } }
  | { type: "paywall"; payload: { templateSlug: string; tier: "free" | "premium"; features: string[] } }
  | { type: "buyPack"; payload: { packId: string } }
  | {
      type: "published";
      payload: { giftId: string; shortId: string; url: string; status: "live" | "scheduled"; unlockAt?: string; title: string; recipientName: string; templateSlug: string };
    }
  | { type: "share"; payload: { url: string; title?: string; text?: string } }
  | { type: "openExternal"; payload: { url: string } };

export type NativeRequestType = NativeRequest["type"];
export type PayloadOf<T extends NativeRequestType> = Extract<NativeRequest, { type: T }>["payload"];

/** What each request answers. `unknown_type` comes back from an app older than the request. */
export type NativeReplies = {
  ready: { ok: boolean };
  close: { ok: boolean };
  title: { ok: boolean };
  haptic: { ok: boolean };
  signIn: { status: "signedIn" | "cancelled" };
  paywall: { status: "unlocked" | "cancelled" | "failed"; error?: string };
  buyPack: { status: "unlocked" | "cancelled" | "failed"; error?: string };
  published: { ok: boolean };
  share: { status: "shared" | "cancelled" };
  openExternal: { ok: boolean };
};

type EthosNative = {
  version: number;
  platform: string;
  locale: string;
  signedIn: boolean;
  request: (type: string, payload?: unknown) => unknown;
};

/** The event the app fires once `window.EthosNative` is in place (its script runs at document start). */
export const NATIVE_READY_EVENT = "ethos-native-ready";
/** What the app sends the page: `{ type, payload }` in `detail`. */
export const NATIVE_EVENT = "ethos-native";

type WebKitWindow = { EthosNative?: EthosNative; webkit?: { messageHandlers?: { ethos?: { postMessage: (message: unknown) => unknown } } } };

export function nativeBridge(): EthosNative | null {
  if (typeof window === "undefined") return null;
  const w = window as unknown as WebKitWindow;
  const bridge = w.EthosNative;
  if (bridge && typeof bridge.request === "function") return bridge;
  // The app's message handler without its script (an app build that installs only the handler):
  // the same messages, posted straight to it.
  const handler = w.webkit?.messageHandlers?.ethos;
  if (handler && typeof handler.postMessage === "function")
    return { version: 0, platform: "ios", locale: "", signedIn: false, request: (type, payload = {}) => handler.postMessage({ type, payload }) };
  return null;
}

/** True inside the iPhone app. Never on the server. */
export const isInApp = (): boolean => nativeBridge() !== null;

/**
 * Asks the app for something and waits for its answer. Rejects outside the app, and when the app
 * throws; a reply that isn't an object reads as `{}`, so callers check the field they need.
 */
export async function request<T extends NativeRequestType>(type: T, payload: PayloadOf<T>): Promise<Partial<NativeReplies[T]> & { ok?: boolean; error?: string }> {
  const bridge = nativeBridge();
  if (!bridge) throw new Error("not_in_app");
  const reply = await bridge.request(type, payload);
  return reply && typeof reply === "object" ? (reply as Partial<NativeReplies[T]>) : {};
}

/** Fire and forget: for messages whose answer changes nothing on the page (ready, haptics, close). */
export function tell<T extends NativeRequestType>(type: T, payload: PayloadOf<T>): void {
  if (!isInApp()) return;
  void request(type, payload).catch(() => undefined);
}

/**
 * The share sheet: the app's own inside the app (a web view has no reliable navigator.share), the
 * browser's otherwise. Resolves false when there was nothing to share with, so the caller can copy.
 */
export async function shareLink(input: { url: string; title?: string; text?: string }): Promise<boolean> {
  if (isInApp()) {
    try {
      await request("share", { url: input.url, ...(input.title ? { title: input.title } : {}), ...(input.text ? { text: input.text } : {}) });
      return true;
    } catch {
      return false;
    }
  }
  if (typeof navigator === "undefined" || !navigator.share) return false;
  try {
    await navigator.share(input);
  } catch {
    // Closed the share sheet: nothing to do.
  }
  return true;
}

/**
 * For a link that leaves what the app opened (back to the gallery, another game): inside the app it
 * closes the page instead, and the app's own screen is underneath. Use as an onClick.
 */
export function closeInApp(event: { preventDefault: () => void }): void {
  if (!isInApp()) return;
  event.preventDefault();
  tell("close", {});
}
