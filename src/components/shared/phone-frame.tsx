import { cn } from "@/lib/utils";

/**
 * A CSS-only phone frame (390×844 logical, the design size for every template).
 * Scales with width; children fill the screen area.
 */
export function PhoneFrame({
  children,
  className,
  screenClassName,
  width = 320,
}: {
  children: React.ReactNode;
  className?: string;
  screenClassName?: string;
  /** Pixels, or any CSS width — a short screen can hand it a height-derived one. */
  width?: number | string;
}) {
  return (
    <div
      className={cn("relative shrink-0 select-none", className)}
      style={{ width, aspectRatio: "390 / 844" }}
    >
      {/* Body */}
      <div aria-hidden="true" className="absolute inset-0 rounded-[13%/6%] bg-[#1c1917] shadow-[0_30px_80px_-24px_rgba(26,22,20,0.55),inset_0_0_0_2px_rgba(255,255,255,0.06)]" />
      {/* Side buttons */}
      <div aria-hidden="true" className="absolute -left-[1.5%] top-[18%] h-[6%] w-[1.5%] rounded-l bg-[#2a2522]" />
      <div aria-hidden="true" className="absolute -left-[1.5%] top-[27%] h-[10%] w-[1.5%] rounded-l bg-[#2a2522]" />
      <div aria-hidden="true" className="absolute -right-[1.5%] top-[24%] h-[14%] w-[1.5%] rounded-r bg-[#2a2522]" />
      {/* Screen */}
      <div
        className={cn(
          "absolute inset-[2.6%] overflow-hidden rounded-[11%/5.2%] bg-night",
          screenClassName,
        )}
      >
        {children}
        {/* Dynamic island */}
        <div aria-hidden="true" className="pointer-events-none absolute left-1/2 top-[1.6%] h-[3.6%] w-[31%] -translate-x-1/2 rounded-full bg-black" />
      </div>
    </div>
  );
}
