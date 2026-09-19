import type { ReactNode } from "react";

/**
 * What an animal says: a comic bubble with a hard outline, pointing back at whoever said it.
 * Sized in `--p`, the stage unit every meme template defines on its root.
 */
export function Bubble({ children, side, below }: { children: ReactNode; side: "left" | "middle" | "right"; below: boolean }) {
  const tail = side === "left" ? "22%" : side === "right" ? "78%" : "50%";
  return (
    <span
      className="relative block w-max max-w-[calc(46*var(--p))] rounded-[calc(3*var(--p))] border-[calc(.5*var(--p))] border-[#1F1720] bg-white px-[calc(2.4*var(--p))] py-[calc(1.5*var(--p))] text-center text-[calc(3.5*var(--p))] leading-[1.12] font-extrabold tracking-tight text-[#1F1720] uppercase"
      style={{ fontFamily: "var(--gift-font-body)", boxShadow: "calc(.6*var(--p)) calc(.8*var(--p)) 0 #1F1720" }}
    >
      {children}
      <span aria-hidden="true" className="absolute h-[calc(2.4*var(--p))] w-[calc(2.4*var(--p))] border-[#1F1720] bg-white" style={{ left: tail, translate: "-50% 0", rotate: "45deg", ...(below ? { top: "calc(-1.45*var(--p))", borderTopWidth: "calc(.5*var(--p))", borderLeftWidth: "calc(.5*var(--p))" } : { bottom: "calc(-1.45*var(--p))", borderBottomWidth: "calc(.5*var(--p))", borderRightWidth: "calc(.5*var(--p))" }) }} />
    </span>
  );
}

