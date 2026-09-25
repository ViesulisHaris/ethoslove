"use client";

import { useId } from "react";
import { motion } from "motion/react";

/**
 * The hamper, seen from above and in front, on a 240 × 250 drawing: the lid's hinge along the back
 * of the rim at y 92, the front of the rim at 126, the body down to 226. Closed, the lid lies over
 * the rim with a leather handle on top and two straps down the front. It opens the way a real lid
 * does on a flat picture: its top folds away into the hinge, then its gingham underside rises up
 * behind the basket.
 */

const WICKER = { light: "#F5D49A", mid: "#DDA85F", deep: "#A86F31", gap: "#6D4521", line: "#5A3719" };
const LEATHER = { mid: "#8A5230", deep: "#5E3219", light: "#B57A4C" };
const BRASS = { light: "#FFF0B8", mid: "#E2B85A", deep: "#9C7424" };

export type BasketProps = {
  open: boolean;
  /** The gingham the lid and the inside are lined with. */
  lining: { cloth: string; check: string };
  /** No animation: the lid is simply where it belongs. */
  still: boolean;
  className?: string;
};

export function Basket({ open, lining, still, className }: BasketProps) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, "");
  const id = (name: string) => `${uid}-${name}`;
  const url = (name: string) => `url(#${id(name)})`;
  const fold = still ? { duration: 0 } : { duration: 0.32, ease: [0.55, 0, 0.75, 0.4] as const };
  const rise = still ? { duration: 0 } : { delay: 0.28, type: "spring" as const, stiffness: 170, damping: 13, mass: 0.8 };

  return (
    <svg viewBox="0 0 240 250" className={className} aria-hidden="true" style={{ overflow: "visible" }}>
      <defs>
        {/* The front: rows of weavers going over and under the stakes, lit from above. */}
        <linearGradient id={id("weaver")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={WICKER.light} />
          <stop offset=".55" stopColor={WICKER.mid} />
          <stop offset="1" stopColor={WICKER.deep} />
        </linearGradient>
        <pattern id={id("weave")} width="26" height="13" patternUnits="userSpaceOnUse">
          <rect width="26" height="13" fill={WICKER.gap} />
          <rect x="1" y="1.2" width="20" height="5" rx="2.5" fill={url("weaver")} />
          <rect x="-12" y="7.7" width="20" height="5" rx="2.5" fill={url("weaver")} />
          <rect x="14" y="7.7" width="20" height="5" rx="2.5" fill={url("weaver")} />
          <rect x="21.6" y="0" width="3" height="6.5" fill={WICKER.deep} opacity=".85" />
          <rect x="8.6" y="6.5" width="3" height="6.5" fill={WICKER.deep} opacity=".85" />
        </pattern>
        {/* The lid's top: a finer herringbone, in the light. */}
        <pattern id={id("lidweave")} width="14" height="14" patternUnits="userSpaceOnUse" patternTransform="skewX(-12)">
          <rect width="14" height="14" fill={WICKER.deep} />
          <path d="M0 3.5 L7 0 L14 3.5 L14 6.5 L7 3 L0 6.5 Z" fill={WICKER.light} />
          <path d="M0 10.5 L7 7 L14 10.5 L14 13.5 L7 10 L0 13.5 Z" fill={WICKER.mid} />
        </pattern>
        {/* A braided rim: slanted strands side by side. */}
        <pattern id={id("braid")} width="9" height="12" patternUnits="userSpaceOnUse" patternTransform="skewX(-35)">
          <rect width="9" height="12" fill={WICKER.deep} />
          <rect x="1" y="0" width="6" height="12" rx="3" fill={url("weaver")} />
        </pattern>
        <pattern id={id("gingham")} width="12" height="12" patternUnits="userSpaceOnUse">
          <rect width="12" height="12" fill={lining.cloth} />
          <rect width="6" height="12" fill={lining.check} />
          <rect width="12" height="6" fill={lining.check} />
        </pattern>
        <linearGradient id={id("shade")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".18" />
          <stop offset=".45" stopColor="#FFFFFF" stopOpacity="0" />
          <stop offset="1" stopColor="#3A1E08" stopOpacity=".38" />
        </linearGradient>
        <linearGradient id={id("side")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#3A1E08" stopOpacity=".28" />
          <stop offset=".18" stopColor="#3A1E08" stopOpacity="0" />
          <stop offset=".82" stopColor="#3A1E08" stopOpacity="0" />
          <stop offset="1" stopColor="#3A1E08" stopOpacity=".34" />
        </linearGradient>
        <linearGradient id={id("inside")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B1708" stopOpacity=".55" />
          <stop offset="1" stopColor="#2B1708" stopOpacity=".05" />
        </linearGradient>
        <linearGradient id={id("leather")} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor={LEATHER.deep} />
          <stop offset=".45" stopColor={LEATHER.light} />
          <stop offset="1" stopColor={LEATHER.mid} />
        </linearGradient>
        <linearGradient id={id("brass")} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor={BRASS.light} />
          <stop offset=".5" stopColor={BRASS.mid} />
          <stop offset="1" stopColor={BRASS.deep} />
        </linearGradient>
        <linearGradient id={id("lip")} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B1708" stopOpacity=".45" />
          <stop offset="1" stopColor="#2B1708" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={id("ground")} cx=".5" cy=".5" r=".5">
          <stop offset="0" stopColor="#3B2414" stopOpacity=".42" />
          <stop offset="1" stopColor="#3B2414" stopOpacity="0" />
        </radialGradient>
        <clipPath id={id("body")}>
          <path d="M14 126 L226 126 L215 214 Q213 224 202 224 L38 224 Q27 224 25 214 Z" />
        </clipPath>
        <clipPath id={id("mouth")}>
          <path d="M44 94 L196 94 L218 122 L22 122 Z" />
        </clipPath>
      </defs>

      {/* Its shadow on the blanket. */}
      <ellipse cx="120" cy="228" rx="118" ry="16" fill={url("ground")} />

      {/* The lid, open: its lined underside standing up behind the rim. */}
      <motion.g initial={false} animate={{ scaleY: open ? 1 : 0, opacity: open ? 1 : 0 }} transition={open ? rise : fold} style={{ transformBox: "fill-box", transformOrigin: "50% 100%" }}>
        <path d="M40 94 L52 10 Q53 4 60 4 L180 4 Q187 4 188 10 L200 94 Z" fill={url("braid")} stroke={WICKER.line} strokeOpacity=".5" strokeWidth="1.2" />
        <path d="M52 88 L61 17 L179 17 L188 88 Z" fill={url("gingham")} />
        <path d="M52 88 L61 17 L179 17 L188 88 Z" fill={url("shade")} opacity=".7" />
        {/* two little straps across the lining, the kind that hold the plates */}
        <path d="M58 52 L182 52" stroke={LEATHER.mid} strokeWidth="5" opacity=".85" />
        <path d="M58 52 L182 52" stroke={LEATHER.light} strokeWidth="1" strokeDasharray="3 3" opacity=".7" />
      </motion.g>

      {/* Inside, seen over the rim once the lid is up: the lining, and a napkin folded in. */}
      <g clipPath={url("mouth")}>
        <rect x="20" y="92" width="200" height="32" fill={url("gingham")} />
        <path d="M20 92 L220 92 L220 106 Q150 99 120 110 Q80 98 20 108 Z" fill="#2B1708" opacity=".35" />
        <path d="M40 124 Q70 104 104 116 Q126 104 150 118 Q180 102 206 124 Z" fill={lining.cloth} opacity=".9" />
        <path d="M40 124 Q70 104 104 116 Q126 104 150 118 Q180 102 206 124 Z" fill={url("gingham")} opacity=".65" />
        <rect x="20" y="92" width="200" height="32" fill={url("inside")} />
      </g>

      {/* The body. */}
      <path d="M14 126 L226 126 L215 214 Q213 224 202 224 L38 224 Q27 224 25 214 Z" fill={url("weave")} />
      <g clipPath={url("body")}>
        <rect x="0" y="120" width="240" height="110" fill={url("shade")} />
        <rect x="0" y="120" width="240" height="110" fill={url("side")} />
        {/* a braided band round the foot */}
        <rect x="0" y="206" width="240" height="18" fill={url("braid")} />
        <rect x="0" y="206" width="240" height="18" fill="#3A1E08" opacity=".22" />
      </g>
      <path d="M14 126 L226 126 L215 214 Q213 224 202 224 L38 224 Q27 224 25 214 Z" fill="none" stroke={WICKER.line} strokeOpacity=".55" strokeWidth="1.4" />

      {/* The rim round the open top. */}
      <path d="M40 88 L200 88 L232 128 L8 128 Z M46 95 L194 95 L218 121 L22 121 Z" fillRule="evenodd" fill={url("braid")} stroke={WICKER.line} strokeOpacity=".45" strokeWidth="1.2" />

      {/* The straps' lower halves and their buckles, which stay with the basket. */}
      {[74, 166].map((x) => (
        <g key={x}>
          <rect x={x - 7} y="128" width="14" height="50" rx="2" fill={url("leather")} />
          <path d={`M${x - 4.5} 131 L${x - 4.5} 175 M${x + 4.5} 131 L${x + 4.5} 175`} stroke="#F3D9B8" strokeOpacity=".55" strokeWidth=".9" strokeDasharray="2.4 2.2" />
          <rect x={x - 10} y="142" width="20" height="15" rx="2.5" fill="none" stroke={url("brass")} strokeWidth="3.2" />
          <rect x={x - 1.4} y="140" width="2.8" height="19" rx="1.2" fill={url("brass")} />
        </g>
      ))}

      {/* The lid, closed: its woven top, its lip over the rim, the handle and the straps' upper halves. */}
      <motion.g initial={false} animate={{ scaleY: open ? 0 : 1, opacity: open ? 0 : 1 }} transition={open ? fold : rise} style={{ transformBox: "fill-box", transformOrigin: "50% 0%" }}>
        <path d="M36 84 L204 84 L234 124 L6 124 Z" fill={url("lidweave")} />
        <path d="M36 84 L204 84 L234 124 L6 124 Z" fill={url("shade")} opacity=".55" />
        <path d="M36 84 L204 84 L234 124 L6 124 Z" fill="none" stroke={WICKER.line} strokeOpacity=".5" strokeWidth="1.3" />
        {/* the lip's shadow on the front of the basket */}
        <path d="M16 140 L224 140 L223 152 L17 152 Z" fill={url("lip")} />
        <path d="M6 124 L234 124 L232 138 Q231 142 226 142 L14 142 Q9 142 8 138 Z" fill={url("braid")} stroke={WICKER.line} strokeOpacity=".5" strokeWidth="1.2" />
        <path d="M6 124 L234 124 L232 138 Q231 142 226 142 L14 142 Q9 142 8 138 Z" fill="#3A1E08" opacity=".18" />
        {[74, 166].map((x) => (
          <g key={x}>
            <path d={`M${x - 6} 96 L${x + 6} 96 L${x + 7} 146 L${x - 7} 146 Z`} fill={url("leather")} />
            <path d={`M${x - 3.5} 99 L${x - 4.2} 143 M${x + 3.5} 99 L${x + 4.2} 143`} stroke="#F3D9B8" strokeOpacity=".55" strokeWidth=".9" strokeDasharray="2.4 2.2" />
            <circle cx={x} cy="140" r="1.8" fill={BRASS.mid} />
          </g>
        ))}
        {/* the handle, lying on the lid */}
        <path d="M100 104 C100 82 140 82 140 104" fill="none" stroke={LEATHER.deep} strokeWidth="9" strokeLinecap="round" />
        <path d="M100 104 C100 82 140 82 140 104" fill="none" stroke={url("leather")} strokeWidth="6" strokeLinecap="round" />
        <path d="M103 100 C104 87 136 87 137 100" fill="none" stroke="#F3D9B8" strokeOpacity=".5" strokeWidth=".9" strokeDasharray="2.4 2.2" />
        <rect x="93" y="100" width="14" height="9" rx="2" fill={url("brass")} />
        <rect x="133" y="100" width="14" height="9" rx="2" fill={url("brass")} />
      </motion.g>
    </svg>
  );
}
