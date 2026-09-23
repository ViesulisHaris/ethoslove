/**
 * The App Router has no navigation events of its own; this hook is how Next 16 says one has begun.
 * It only re-broadcasts it, so the route progress bar (components/motion/site-motion) can hear
 * about every navigation — a link, `router.push`, back and forward — without owning this file.
 */
export function onRouterTransitionStart(url: string, navigationType: "push" | "replace" | "traverse") {
  window.dispatchEvent(new CustomEvent("ethos:navigate", { detail: { url, navigationType } }));
}
