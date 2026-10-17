"use client";

import { useId, type CSSProperties } from "react";
import type { Body } from "./schema";

/**
 * The camera, drawn: a pocket digital camera from about 2006 that belongs to no brand. The front
 * has the lens (whose barrel really runs out when it's switched on), the flash and the wordmark;
 * the back has the screen, the four-way pad and the little buttons. Both are drawn in one box,
 * `VIEW`, with the top plate's buttons standing proud of the body, so the template can lay its
 * own buttons and the screen's contents over them by percentage.
 */

export const VIEW = { w: 320, h: 214 } as const;
/** The body under the buttons on its top. */
const BODY = { x: 4, y: 18, w: 312, h: 192, r: 30 } as const;
/** The screen, in `VIEW` units: 4:3, like the photos a camera like this took. */
export const LCD = { x: 23, y: 38, w: 208, h: 156 } as const;
/** Where the strap is tied on, on the back; the front's is the mirror image. */
export const LUG = { x: 314, y: 178 } as const;

export type BodyLook = {
  light: string;
  base: string;
  dark: string;
  deep: string;
  /** The little buttons, a shade off the body. */
  button: string;
  /** Small print: the model, the megapixels, the button labels. */
  ink: string;
  wordmark: string;
  /** Satin metal: the lens rings, the shutter, the pad's middle. */
  metal: [string, string, string];
  /** How much the top of the body catches the light. */
  gloss: number;
};

export const BODY_LOOKS: Record<Body, BodyLook> = {
  pink: { light: "#FFE9F0", base: "#F6C2D3", dark: "#E49BB6", deep: "#B7698A", button: "#EFAFC5", ink: "#8C4764", wordmark: "#FFFFFF", metal: ["#FFFFFF", "#DCDFE4", "#9DA3AD"], gloss: 0.55 },
  silver: { light: "#FAFBFC", base: "#D7DBE1", dark: "#B0B6BF", deep: "#7D8591", button: "#C6CBD2", ink: "#4A515B", wordmark: "#39404A", metal: ["#FFFFFF", "#CDD1D7", "#8D949F"], gloss: 0.6 },
  lilac: { light: "#F1EAFF", base: "#CFBFF4", dark: "#AE98E2", deep: "#7D66B8", button: "#C1ADEE", ink: "#56448D", wordmark: "#FFFFFF", metal: ["#FFFFFF", "#DAD8E4", "#9C98AE"], gloss: 0.5 },
  black: { light: "#5A5A63", base: "#2E2E35", dark: "#1D1D22", deep: "#0C0C0F", button: "#3B3B44", ink: "#C3C6CE", wordmark: "#E8E9EE", metal: ["#F4F5F7", "#B9BDC5", "#6E747E"], gloss: 0.28 },
};

/** A gradient id that is safe inside url(#…), whatever useId hands back. */
function useUid(): string {
  return `dc${useId().replace(/[^a-zA-Z0-9]/g, "")}`;
}

const FONT = "'Arial Black', 'Helvetica Neue', Arial, sans-serif";

/** The shell both faces share: shaded like a rounded box, with a gloss along the top. */
function Shell({ look, id }: { look: BodyLook; id: string }) {
  const { x, y, w, h, r } = BODY;
  return (
    <g>
      <defs>
        <linearGradient id={`${id}-body`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={look.light} />
          <stop offset="0.16" stopColor={look.base} />
          <stop offset="0.78" stopColor={look.base} />
          <stop offset="1" stopColor={look.dark} />
        </linearGradient>
        <linearGradient id={`${id}-sides`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#000" stopOpacity="0.22" />
          <stop offset="0.06" stopColor="#000" stopOpacity="0" />
          <stop offset="0.94" stopColor="#000" stopOpacity="0" />
          <stop offset="1" stopColor="#000" stopOpacity="0.26" />
        </linearGradient>
        <linearGradient id={`${id}-gloss`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFF" stopOpacity={look.gloss} />
          <stop offset="1" stopColor="#FFF" stopOpacity="0" />
        </linearGradient>
      </defs>
      <rect x={x} y={y + 3} width={w} height={h} rx={r} fill={look.deep} opacity="0.55" />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={`url(#${id}-body)`} />
      <rect x={x} y={y} width={w} height={h} rx={r} fill={`url(#${id}-sides)`} />
      <rect x={x + 7} y={y + 2.5} width={w - 14} height={46} rx={r - 6} fill={`url(#${id}-gloss)`} />
      <path d={`M${x + r} ${y + 1.2}H${x + w - r}`} stroke="#FFF" strokeOpacity={look.gloss * 0.9} strokeWidth="1.3" strokeLinecap="round" />
      <rect x={x + 0.5} y={y + 0.5} width={w - 1} height={h - 1} rx={r - 0.5} fill="none" stroke={look.deep} strokeOpacity="0.45" />
    </g>
  );
}

/** Satin metal, lit from the top left. */
function MetalGradient({ id, look, angle = "tl" }: { id: string; look: BodyLook; angle?: "tl" | "top" }) {
  const [hi, mid, lo] = look.metal;
  return angle === "top" ? (
    <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stopColor={hi} />
      <stop offset="0.45" stopColor={mid} />
      <stop offset="1" stopColor={lo} />
    </linearGradient>
  ) : (
    <linearGradient id={id} x1="0.15" y1="0" x2="0.85" y2="1">
      <stop offset="0" stopColor={hi} />
      <stop offset="0.5" stopColor={mid} />
      <stop offset="1" stopColor={lo} />
    </linearGradient>
  );
}

/**
 * The shutter (with the zoom ring round it) and the power button with its light, standing on the
 * top plate. `cx` is where each sits along the top; the front shows them mirrored.
 */
function TopPlate({ look, id, shutter, power, on, pulse }: { look: BodyLook; id: string; shutter: number; power: number; on: boolean; pulse?: "power" | "shutter" }) {
  return (
    <g>
      <defs>
        <MetalGradient id={`${id}-cap`} look={look} angle="top" />
      </defs>
      {/* zoom ring and shutter */}
      <rect x={shutter - 22} y={10} width={44} height={10} rx={5} fill={look.dark} />
      <rect x={shutter - 22} y={10} width={44} height={5} rx={2.5} fill="#FFF" opacity="0.22" />
      <rect x={shutter - 12.5} y={3.5} width={25} height={11} rx={5.5} fill={`url(#${id}-cap)`} stroke={look.metal[2]} strokeWidth="0.6" />
      <rect x={shutter - 9} y={4.8} width={13} height={2.4} rx={1.2} fill="#FFF" opacity="0.8" />
      {pulse === "shutter" ? <rect className="dc-ring" x={shutter - 16} y={0} width={32} height={18} rx={9} fill="none" stroke="#FF5C93" strokeWidth="2.2" /> : null}
      {/* power, and the light beside it */}
      <rect x={power - 10} y={11.5} width={20} height={8} rx={4} fill={look.button} stroke={look.deep} strokeOpacity="0.4" strokeWidth="0.6" />
      <rect x={power - 7} y={12.6} width={14} height={2} rx={1} fill="#FFF" opacity="0.35" />
      <circle cx={power + (power < VIEW.w / 2 ? -15 : 15)} cy={15.5} r={2} fill={on ? "#63F59B" : "#6F7780"} stroke={look.deep} strokeOpacity="0.5" strokeWidth="0.5" />
      {on ? <circle cx={power + (power < VIEW.w / 2 ? -15 : 15)} cy={15.5} r={4.5} fill="#63F59B" opacity="0.35" /> : null}
      {pulse === "power" ? <rect className="dc-ring" x={power - 14} y={7.5} width={28} height={16} rx={8} fill="none" stroke="#FF5C93" strokeWidth="2.2" /> : null}
    </g>
  );
}

/** Where each stage of the barrel ends up when the lens is out, along the line it comes towards you. */
const LENS = { cx: 204, cy: 118 } as const;
const OUT = { x: -0.8, y: 0.6 } as const;
const STAGES = [
  { r: 49, face: 42, travel: 11 },
  { r: 41, face: 35, travel: 20 },
  { r: 34.5, face: 27.5, travel: 28 },
] as const;
const SLICES = 12;

/**
 * The front: flash, viewfinder, focus lamp, the lens in its housing, the wordmark. With `out` the
 * lens barrier opens and the barrel runs out in three stages, each drawn as a stack of rings so it
 * reads as a tube coming towards you. `instant` skips the travel.
 */
export function CameraFront({ look, out, instant, pulse }: { look: BodyLook; out: boolean; instant: boolean; pulse?: "power" }) {
  const id = useUid();
  const ease = "cubic-bezier(.35,.05,.2,1)";
  const move = (dist: number, delay: number): CSSProperties => ({
    transform: out ? `translate(${OUT.x * dist}px, ${OUT.y * dist}px)` : "translate(0px, 0px)",
    transition: instant ? "none" : `transform .5s ${ease} ${delay}s`,
  });
  const { cx, cy } = LENS;
  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="block h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <MetalGradient id={`${id}-metal`} look={look} />
        <radialGradient id={`${id}-well`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.7" stopColor="#0A0A0D" />
          <stop offset="1" stopColor="#2A2A31" />
        </radialGradient>
        <linearGradient id={`${id}-side`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor={look.metal[1]} />
          <stop offset="0.45" stopColor={look.metal[2]} />
          <stop offset="1" stopColor="#3B3F46" />
        </linearGradient>
        <linearGradient id={`${id}-side-dark`} x1="0.2" y1="0" x2="0.8" y2="1">
          <stop offset="0" stopColor="#5A5E66" />
          <stop offset="0.5" stopColor="#26282D" />
          <stop offset="1" stopColor="#0E0F12" />
        </linearGradient>
        <radialGradient id={`${id}-glass`} cx="0.42" cy="0.38" r="0.62">
          <stop offset="0" stopColor="#3A3F6B" />
          <stop offset="0.35" stopColor="#141A33" />
          <stop offset="0.8" stopColor="#07080F" />
          <stop offset="1" stopColor="#02030A" />
        </radialGradient>
        <linearGradient id={`${id}-blade`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#6B6F78" />
          <stop offset="0.5" stopColor="#2C2F35" />
          <stop offset="1" stopColor="#15161A" />
        </linearGradient>
        <linearGradient id={`${id}-flash`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="0.55" stopColor="#E9EDF2" />
          <stop offset="1" stopColor="#C4CAD3" />
        </linearGradient>
        <pattern id={`${id}-fresnel`} width="3" height="24" patternUnits="userSpaceOnUse">
          <rect width="1" height="24" fill="#9AA3B0" opacity="0.35" />
        </pattern>
        <filter id={`${id}-soft`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="5" />
        </filter>
        <clipPath id={`${id}-glass-clip`}>
          <circle cx={cx} cy={cy} r="27" />
        </clipPath>
        <path id={`${id}-ring-text`} d={`M ${cx - 31} ${cy} a 31 31 0 1 1 62 0 a 31 31 0 1 1 -62 0`} />
      </defs>

      <TopPlate look={look} id={id} shutter={VIEW.w - 262} power={VIEW.w - 200} on={out} pulse={pulse} />
      <Shell look={look} id={id} />

      {/* the lug on the left, for the strap */}
      <rect x={VIEW.w - LUG.x - 3} y={LUG.y - 6} width={6} height={12} rx={2} fill={`url(#${id}-metal)`} stroke={look.metal[2]} strokeWidth="0.5" />

      {/* flash, viewfinder, focus lamp */}
      <rect x={24} y={32} width={62} height={27} rx={6} fill={look.metal[2]} />
      <rect x={26} y={34} width={58} height={23} rx={5} fill={`url(#${id}-flash)`} />
      <rect x={26} y={34} width={58} height={23} rx={5} fill={`url(#${id}-fresnel)`} />
      <rect x={29} y={36} width={52} height={5} rx={2.5} fill="#FFF" opacity="0.75" />
      <rect x={96} y={35} width={24} height={18} rx={4.5} fill={look.metal[2]} />
      <rect x={97.5} y={36.5} width={21} height={15} rx={3.5} fill="#15171D" />
      <rect x={99} y={38} width={9} height={4} rx={2} fill="#FFF" opacity="0.35" />
      <circle cx={108} cy={67} r={5.2} fill={look.metal[2]} />
      <circle cx={108} cy={67} r={4} fill="#E58A3A" />
      <circle cx={106.6} cy={65.6} r={1.3} fill="#FFF" opacity="0.8" />

      <text x={26} y={76} fontFamily={FONT} fontSize="7.4" fontWeight="900" letterSpacing="0.5" fill={look.ink}>
        7.1 MEGA PIXELS
      </text>
      <text x={26} y={84.5} fontFamily={FONT} fontSize="5.2" fontWeight="700" letterSpacing="0.8" fill={look.ink} opacity="0.8">
        3x OPTICAL ZOOM
      </text>

      {/* the wordmark, stamped into the shell */}
      <g fontFamily={FONT} fontWeight="900" fontStyle="italic">
        <text x={23.8} y={183.8} fontSize="23" letterSpacing="-0.6" fill={look.deep} opacity="0.35">
          LOVESHOT
        </text>
        <text x={23} y={183} fontSize="23" letterSpacing="-0.6" fill={look.wordmark}>
          LOVESHOT
        </text>
        <text x={24} y={197} fontSize="8" letterSpacing="1.6" fill={look.ink}>
          3000 · DIGITAL
        </text>
      </g>

      {/* the lens housing, and its shadow on the body once the barrel is out */}
      <circle cx={cx} cy={cy} r={60} fill={`url(#${id}-metal)`} />
      <circle cx={cx} cy={cy} r={60} fill="none" stroke={look.metal[2]} strokeWidth="0.8" />
      <circle cx={cx} cy={cy} r={57} fill="none" stroke="#FFF" strokeOpacity="0.55" strokeWidth="1" strokeDasharray="60 300" transform={`rotate(200 ${cx} ${cy})`} />
      <circle cx={cx} cy={cy} r={53} fill={`url(#${id}-well)`} />
      <circle
        cx={cx + OUT.x * 10}
        cy={cy + OUT.y * 14}
        r={44}
        fill="#000"
        filter={`url(#${id}-soft)`}
        style={{ opacity: out ? 0.45 : 0, transition: instant ? "none" : "opacity .6s ease .2s" }}
      />

      {/* the barrel, stage by stage: each one's side, then its face */}
      {STAGES.map((stage, s) => {
        const from = s === 0 ? 0 : STAGES[s - 1].travel;
        const delay = s * 0.14;
        return (
          <g key={s}>
            {Array.from({ length: SLICES + 1 }, (_, i) => (
              <circle key={i} cx={cx} cy={cy} r={stage.r} fill={`url(#${id}-${s === 2 ? "side-dark" : "side"})`} style={move(from + ((stage.travel - from) * i) / SLICES, delay)} />
            ))}
            <g style={move(stage.travel, delay)}>
              <circle cx={cx} cy={cy} r={stage.r} fill={s === 2 ? "#18191D" : `url(#${id}-metal)`} />
              <circle cx={cx} cy={cy} r={stage.r - 0.6} fill="none" stroke="#FFF" strokeOpacity={s === 2 ? 0.25 : 0.7} strokeWidth="0.9" strokeDasharray={`${stage.r * 1.6} ${stage.r * 8}`} transform={`rotate(195 ${cx} ${cy})`} />
              <circle cx={cx} cy={cy} r={stage.face} fill={s === 2 ? "#0E0E11" : "#2A2C31"} />
              {s === 2 ? (
                <text fontFamily="Arial, Helvetica, sans-serif" fontSize="3.3" fontWeight="700" letterSpacing="0.35" fill="#E9EAEE" opacity="0.85">
                  <textPath href={`#${id}-ring-text`} startOffset="2%">
                    ZOOM LENS 3x · 5.8–17.4mm 1:2.8–4.9 · LOVESHOT ·
                  </textPath>
                </text>
              ) : null}
            </g>
          </g>
        );
      })}

      {/* the glass, and the barrier that covers it until the camera is on */}
      <g style={move(STAGES[2].travel, 0.28)}>
        <circle cx={cx} cy={cy} r={27} fill={`url(#${id}-glass)`} />
        <ellipse cx={cx + 6} cy={cy + 7} rx={16} ry={11} fill="#7C5CFF" opacity="0.28" />
        <ellipse cx={cx - 7} cy={cy + 9} rx={10} ry={6} fill="#3DDC97" opacity="0.18" />
        <circle cx={cx} cy={cy} r={11} fill="#05060C" />
        <circle cx={cx} cy={cy} r={11} fill="none" stroke="#5B63A8" strokeOpacity="0.5" strokeWidth="0.8" />
        <ellipse cx={cx - 9} cy={cy - 10} rx={8} ry={4.5} fill="#FFF" opacity="0.55" transform={`rotate(-35 ${cx - 9} ${cy - 10})`} />
        <circle cx={cx + 9} cy={cy + 8} r={1.6} fill="#FFF" opacity="0.7" />
      </g>
      {/* The clip rides with the glass, so the blades slide off it wherever the barrel has got to. */}
      <g style={move(STAGES[2].travel, 0.28)}>
        <g clipPath={`url(#${id}-glass-clip)`}>
          <g style={{ transform: out ? "translateX(-30px)" : "translateX(0px)", transition: instant ? "none" : `transform .28s ${ease} .02s` }}>
            <path d={`M${cx - 28} ${cy - 28}H${cx + 0.4}l-2 7 2 7-2 7 2 7-2 7 2 7-2 7 2 7H${cx - 28}Z`} fill={`url(#${id}-blade)`} />
          </g>
          <g style={{ transform: out ? "translateX(30px)" : "translateX(0px)", transition: instant ? "none" : `transform .28s ${ease} .02s` }}>
            <path d={`M${cx + 28} ${cy - 28}H${cx + 0.4}l-2 7 2 7-2 7 2 7-2 7 2 7-2 7 2 7H${cx + 28}Z`} fill={`url(#${id}-blade)`} />
            <path d={`M${cx + 0.4} ${cy - 28}l-2 7 2 7-2 7 2 7-2 7 2 7-2 7 2 7`} fill="none" stroke="#000" strokeOpacity="0.6" strokeWidth="0.7" />
          </g>
        </g>
      </g>
    </svg>
  );
}

/**
 * The back: the screen in its glossy frame (left blank, for the template to fill), the mode
 * switch, the print button and its light, the four-way pad, DISP and MENU, and the speaker.
 * `ready` lights the print button, which is what the last photo is waiting for.
 */
export function CameraBack({ look, on, ready, pulse }: { look: BodyLook; on: boolean; ready: boolean; pulse?: "shutter" }) {
  const id = useUid();
  const pad = { cx: 278, cy: 120 };
  const arrow = (x: number, y: number, rot: number) => <path d="M0 -3.2L3 1.8H-3Z" fill={look.ink} opacity="0.75" transform={`translate(${x} ${y}) rotate(${rot})`} />;
  return (
    <svg viewBox={`0 0 ${VIEW.w} ${VIEW.h}`} className="block h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <MetalGradient id={`${id}-metal`} look={look} />
        <linearGradient id={`${id}-bezel`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2B2B33" />
          <stop offset="1" stopColor="#0B0B0E" />
        </linearGradient>
        <radialGradient id={`${id}-padring`} cx="0.4" cy="0.35" r="0.7">
          <stop offset="0" stopColor={look.light} />
          <stop offset="0.6" stopColor={look.button} />
          <stop offset="1" stopColor={look.dark} />
        </radialGradient>
      </defs>

      <TopPlate look={look} id={id} shutter={262} power={200} on={on} pulse={pulse} />
      <Shell look={look} id={id} />
      <rect x={LUG.x - 3} y={LUG.y - 6} width={6} height={12} rx={2} fill={`url(#${id}-metal)`} stroke={look.metal[2]} strokeWidth="0.5" />

      <text x={20} y={27} fontFamily={FONT} fontSize="6.6" fontWeight="900" fontStyle="italic" letterSpacing="0.3" fill={look.ink}>
        LOVESHOT <tspan fontStyle="normal" fontWeight="700" fontSize="5.4">3000</tspan>
      </text>

      {/* the screen's frame; the screen itself is the template's */}
      <rect x={LCD.x - 8} y={LCD.y - 8} width={LCD.w + 16} height={LCD.h + 16} rx={12} fill={`url(#${id}-bezel)`} />
      <rect x={LCD.x - 7.5} y={LCD.y - 7.5} width={LCD.w + 15} height={LCD.h + 15} rx={11.5} fill="none" stroke="#FFF" strokeOpacity="0.14" />
      <rect x={LCD.x} y={LCD.y} width={LCD.w} height={LCD.h} rx={2} fill="#050608" />

      {/* mode switch: set to play */}
      <rect x={258} y={36} width={40} height={11} rx={5.5} fill={look.dark} />
      <rect x={258} y={36} width={40} height={11} rx={5.5} fill="none" stroke={look.deep} strokeOpacity="0.4" strokeWidth="0.6" />
      <circle cx={291.5} cy={41.5} r={6.4} fill={`url(#${id}-metal)`} stroke={look.metal[2]} strokeWidth="0.5" />
      <path d="M263.5 39.5h5l1-1.4h2.4l1 1.4h1.6v5h-11z" fill={look.ink} opacity="0.55" transform="translate(-3 0)" />

      {/* print / share: a printer, and a light that comes on when there is something to print */}
      <rect x={262} y={57} width={32} height={15} rx={7.5} fill={look.button} stroke={look.deep} strokeOpacity="0.4" strokeWidth="0.6" />
      <rect x={264} y={58.2} width={28} height={4} rx={2} fill="#FFF" opacity="0.3" />
      <path d="M273.5 60.5h9v3h2.5v5.5h-2.5v2h-9v-2H271v-5.5h2.5z" fill={look.ink} opacity="0.7" />
      <rect x={274.8} y={65.2} width={6.4} height={3.8} fill={look.button} />
      <circle cx={255} cy={64.5} r={2.3} fill={ready ? "#5AB0FF" : "#76808C"} stroke={look.deep} strokeOpacity="0.5" strokeWidth="0.5" />
      {ready ? <circle className="dc-glow" cx={255} cy={64.5} r={6} fill="#5AB0FF" opacity="0.45" /> : null}

      {/* the four-way pad */}
      <circle cx={pad.cx} cy={pad.cy + 1.5} r={29} fill={look.deep} opacity="0.35" />
      <circle cx={pad.cx} cy={pad.cy} r={29} fill={`url(#${id}-padring)`} />
      <circle cx={pad.cx} cy={pad.cy} r={29} fill="none" stroke={look.deep} strokeOpacity="0.45" strokeWidth="0.7" />
      <circle cx={pad.cx} cy={pad.cy} r={27} fill="none" stroke="#FFF" strokeOpacity="0.5" strokeWidth="0.9" strokeDasharray="40 200" transform={`rotate(200 ${pad.cx} ${pad.cy})`} />
      {arrow(pad.cx, pad.cy - 21, 0)}
      {arrow(pad.cx, pad.cy + 21, 180)}
      {arrow(pad.cx - 21, pad.cy, -90)}
      {arrow(pad.cx + 21, pad.cy, 90)}
      <circle cx={pad.cx} cy={pad.cy} r={12.5} fill={look.deep} opacity="0.35" />
      <circle cx={pad.cx} cy={pad.cy - 0.6} r={12} fill={`url(#${id}-metal)`} />
      <text x={pad.cx} y={pad.cy - 1} textAnchor="middle" fontFamily={FONT} fontSize="3.8" fontWeight="900" fill="#555B65">
        FUNC
      </text>
      <text x={pad.cx} y={pad.cy + 4} textAnchor="middle" fontFamily={FONT} fontSize="3.8" fontWeight="900" fill="#555B65">
        SET
      </text>

      {/* DISP and MENU */}
      {[
        { x: 251, label: "DISP." },
        { x: 281, label: "MENU" },
      ].map((b) => (
        <g key={b.label}>
          <rect x={b.x} y={160} width={24} height={11} rx={5.5} fill={look.button} stroke={look.deep} strokeOpacity="0.4" strokeWidth="0.6" />
          <rect x={b.x + 2} y={161} width={20} height={3} rx={1.5} fill="#FFF" opacity="0.28" />
          <text x={b.x + 12} y={181} textAnchor="middle" fontFamily={FONT} fontSize="4.6" fontWeight="900" letterSpacing="0.4" fill={look.ink} opacity="0.8">
            {b.label}
          </text>
        </g>
      ))}

      {/* speaker */}
      {Array.from({ length: 12 }, (_, i) => (
        <circle key={i} cx={287 + (i % 4) * 3.6} cy={190 + Math.floor(i / 4) * 3.6} r={0.95} fill={look.deep} opacity="0.55" />
      ))}
    </svg>
  );
}

/** Points along a cubic Bézier, spaced evenly by length rather than by the curve's parameter. */
function along(curves: number[][], count: number): { x: number; y: number }[] {
  const pts: { x: number; y: number }[] = [];
  for (const [x0, y0, x1, y1, x2, y2, x3, y3] of curves)
    for (let i = 0; i <= 60; i++) {
      const t = i / 60;
      const u = 1 - t;
      pts.push({ x: u * u * u * x0 + 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t * x3, y: u * u * u * y0 + 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t * y3 });
    }
  const lens = [0];
  for (let i = 1; i < pts.length; i++) lens.push(lens[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
  const total = lens[lens.length - 1];
  return Array.from({ length: count }, (_, k) => {
    const want = (k / (count - 1)) * total;
    const i = Math.max(1, lens.findIndex((l) => l >= want));
    const f = (want - lens[i - 1]) / (lens[i] - lens[i - 1] || 1);
    return { x: pts[i - 1].x + (pts[i].x - pts[i - 1].x) * f, y: pts[i - 1].y + (pts[i].y - pts[i - 1].y) * f };
  });
}

/** The strap: a loop of beads from the lug, with a letter bead for them and a heart charm. */
const LOOP = along(
  [
    [3, 3, 16, 10, 25, 34, 22, 56],
    [22, 56, 19, 74, 6, 76, 4, 60],
    [4, 60, 2, 42, 0, 20, 3, 3],
  ],
  25,
);
const BEADS = ["pearl", "pink", "pearl", "lilac", "pearl", "yellow", "pearl", "pink", "pearl", "lilac"] as const;
const BEAD_FILL: Record<(typeof BEADS)[number], [string, string]> = {
  pearl: ["#FFFFFF", "#E6DED8"],
  pink: ["#FFD0E0", "#EF86AA"],
  lilac: ["#EFE4FF", "#AE93E6"],
  yellow: ["#FFF3BF", "#F2C94C"],
};

export function Strap({ initial, mirrored = false, className, style }: { initial: string; mirrored?: boolean; className?: string; style?: CSSProperties }) {
  const id = useUid();
  const letterAt = 12;
  const bottom = LOOP[letterAt];
  return (
    <svg viewBox="-6 -2 40 104" className={className} style={style} aria-hidden="true">
      <defs>
        {Object.entries(BEAD_FILL).map(([name, [hi, lo]]) => (
          <radialGradient key={name} id={`${id}-${name}`} cx="0.35" cy="0.3" r="0.75">
            <stop offset="0" stopColor={hi} />
            <stop offset="1" stopColor={lo} />
          </radialGradient>
        ))}
        <linearGradient id={`${id}-charm`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FF9CC0" />
          <stop offset="1" stopColor="#D23C74" />
        </linearGradient>
      </defs>
      {/* the thread the beads are on, and the charm's chain */}
      <path d="M3 3C16 10 25 34 22 56C19 74 6 76 4 60C2 42 0 20 3 3" fill="none" stroke="#FFFFFF" strokeOpacity="0.8" strokeWidth="0.8" />
      <path d={`M${bottom.x} ${bottom.y}l1.5 9l-0.5 6`} fill="none" stroke="#C9CCD2" strokeWidth="1.1" strokeDasharray="1.6 0.9" />
      {LOOP.slice(0, -1).map((p, i) => {
        if (i === letterAt) return null;
        const bead = BEADS[i % BEADS.length];
        return (
          <g key={i}>
            <circle cx={p.x} cy={p.y + 0.5} r={2.6} fill="#000" opacity="0.18" />
            <circle cx={p.x} cy={p.y} r={2.6} fill={`url(#${id}-${bead})`} />
            <circle cx={p.x - 0.8} cy={p.y - 0.9} r={0.7} fill="#FFF" opacity="0.9" />
          </g>
        );
      })}
      {/* their initial, on a white cube */}
      {/* Hung the other way round, the strap is drawn mirrored: the letter is turned back so it still reads. */}
      <g transform={`translate(${bottom.x} ${bottom.y}) rotate(-8)${mirrored ? " scale(-1 1)" : ""}`}>
        <rect x={-3.6} y={-3.6} width={7.2} height={7.2} rx={1.3} fill="#FFFDF8" stroke="#D8D2CC" strokeWidth="0.4" />
        <text y={2.3} textAnchor="middle" fontFamily={FONT} fontSize="6" fontWeight="900" fill="#1E1A1C">
          {initial}
        </text>
      </g>
      {/* the heart charm */}
      <g transform={`translate(${bottom.x + 1} ${bottom.y + 20}) rotate(10)`}>
        <path d="M0 5.6C-4.6 2.4-6.6.2-6.6-2.2c0-2 1.5-3.4 3.3-3.4 1.4 0 2.6.8 3.3 2 .7-1.2 1.9-2 3.3-2 1.8 0 3.3 1.4 3.3 3.4 0 2.4-2 4.6-6.6 7.8z" fill={`url(#${id}-charm)`} stroke="#B32A5E" strokeWidth="0.4" />
        <ellipse cx={-2.6} cy={-2.4} rx={1.5} ry={0.9} fill="#FFF" opacity="0.8" transform="rotate(-30 -2.6 -2.4)" />
      </g>
    </svg>
  );
}
