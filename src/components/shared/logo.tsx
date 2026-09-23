import { cn } from "@/lib/utils";
import { BRAND } from "@/config/brand";

/**
 * The seal: twelve even scallops round (16, 16), 2.05 to 29.95 on both axes. It used to run from
 * 2.5 down to 32, taller than wide, so it sat low in its box and read as off-centre beside the name.
 */
const SEAL =
  "M16 2.05C17.22 2.05 18.22 3.44 19.29 3.73C20.36 4.01 21.92 3.31 22.97 3.92C24.03 4.53 24.2 6.23 24.98 7.02C25.77 7.8 27.47 7.97 28.08 9.03C28.69 10.08 27.99 11.64 28.27 12.71C28.56 13.78 29.95 14.78 29.95 16C29.95 17.22 28.56 18.22 28.27 19.29C27.99 20.36 28.69 21.92 28.08 22.97C27.47 24.03 25.77 24.2 24.98 24.98C24.2 25.77 24.03 27.47 22.97 28.08C21.92 28.69 20.36 27.99 19.29 28.27C18.22 28.56 17.22 29.95 16 29.95C14.78 29.95 13.78 28.56 12.71 28.27C11.64 27.99 10.08 28.69 9.03 28.08C7.97 27.47 7.8 25.77 7.02 24.98C6.23 24.2 4.53 24.03 3.92 22.97C3.31 21.92 4.01 20.36 3.73 19.29C3.44 18.22 2.05 17.22 2.05 16C2.05 14.78 3.44 13.78 3.73 12.71C4.01 11.64 3.31 10.08 3.92 9.03C4.53 7.97 6.23 7.8 7.02 7.02C7.8 6.23 7.97 4.53 9.03 3.92C10.08 3.31 11.64 4.01 12.71 3.73C13.78 3.44 14.78 2.05 16 2.05Z";

/**
 * The heart, optically centred: its box runs 10.6 to 22.4, so the box's middle (16.5) sits half a
 * unit below the seal's and its centre of mass (15.5) half a unit above. The wide lobes carry the
 * weight, so a heart centred by its box looks high; this one was drawn higher still, 8.7 to 20.5.
 */
const HEART =
  "M16 12.09c-1.9-2.4-5.6-1.8-6.4 1.2-.6 2.3.9 4.2 2.7 5.8l3.7 3.3 3.7-3.3c1.8-1.6 3.3-3.5 2.7-5.8-.8-3-4.5-3.6-6.4-1.2Z";

/** Brand mark: a wax seal pressed with a heart, in the brand's rose (or ink, or paper). */
export function LogoMark({ className, tone = "coral" }: { className?: string; tone?: "coral" | "ink" | "paper" }) {
  const fill = tone === "coral" ? "var(--brand-coral)" : tone === "ink" ? "var(--brand-ink)" : "var(--brand-paper)";
  const inner = tone === "paper" ? "var(--brand-ink)" : "#FBF6EE";
  return (
    <svg viewBox="0 0 32 32" aria-hidden="true" className={cn("size-7 shrink-0", className)} fill="none">
      <path d={SEAL} fill={fill} />
      <path d={HEART} fill={inner} opacity="0.95" />
    </svg>
  );
}

export function Wordmark({ className }: { className?: string }) {
  return (
    <span
      className={cn("font-display text-[1.55rem] leading-none tracking-[-0.02em] italic", className)}
      style={{ fontVariationSettings: '"opsz" 32' }}
    >
      {BRAND.name}
    </span>
  );
}

/**
 * The lockup, measured in the name's em so it keeps its proportions at any size: the seal is 1.13em
 * (28px beside the 24.8px name), and 0.22em apart, which with the seal's own margin and the italic
 * E's overhang leaves a clear 7px between the two. The name drops 0.07em so the word's weight is
 * centred on the seal: its line box centres it too high, and centring only the x-height ("thos")
 * leaves the E's cap flush with the seal's top edge, which still reads as hanging from it. At 0.07em
 * the cap sits a hair inside the seal's top and the x-height a hair under its middle.
 */
export function Logo({ className, tone }: { className?: string; tone?: "coral" | "ink" | "paper" }) {
  return (
    <span className={cn("inline-flex items-center gap-[0.22em] text-[1.55rem] leading-none", className)}>
      <LogoMark tone={tone} className="size-[1.13em]" />
      <Wordmark className="relative top-[0.07em] text-[1em]" />
    </span>
  );
}
