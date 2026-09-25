"use client";

/**
 * The two figurines that turn in the box, drawn from the poses in ./pose: a porcelain ballerina
 * en pointe on a gold spindle, arms in fifth, and two swans on a mirror pond. Both are drawn face
 * on to the viewer at any point of a turn, so they can stand upright in the tilted box.
 */
import { useId, type ReactNode } from "react";
import { GOLD } from "./looks";
import { ballerina, heartness, swans, TILT, WAIST, type Arm, type SwanPose } from "./pose";

const SKIN = { light: "#FDEEE8", mid: "#F6DCD2", line: "#DDB3A6" };
const HAIR = { mid: "#6A4636", deep: "#4A2E22" };
const TULLE = { under: "#E68CA7", rim: "#F6B9CB", mid: "#FAD0DC", top: "#FDE5EC", line: "#E08FA8" };
const TIGHTS = { mid: "#F7D6DA", deep: "#E9B7BF" };
const BODICE = { mid: "#EE8FAB", deep: "#C9607E" };

const useUid = (): string => useId().replace(/[^a-zA-Z0-9]/g, "");

/** A gold drum on a spindle: what both figurines stand on. `top` is where the spindle ends. */
function Pedestal({ uid, rx, top }: { uid: string; rx: number; top: number }) {
  const ry = rx * TILT;
  return (
    <g>
      <ellipse cx="0" cy="1.4" rx={rx + 3} ry={ry + 1.4} fill="rgba(35,8,18,.38)" />
      <path d={`M${-rx} -4 L${-rx} 0 A${rx} ${ry} 0 0 0 ${rx} 0 L${rx} -4 Z`} fill={`url(#${uid}-drum)`} />
      <ellipse cx="0" cy="-4" rx={rx} ry={ry} fill={`url(#${uid}-drumtop)`} stroke={GOLD.deep} strokeWidth=".35" />
      <ellipse cx="0" cy="-4" rx={rx * 0.72} ry={ry * 0.72} fill="none" stroke={GOLD.deep} strokeOpacity=".5" strokeWidth=".3" strokeDasharray=".6 .8" />
      <rect x="-.85" y={top} width="1.7" height={-4 - top} rx=".6" fill={`url(#${uid}-drum)`} />
    </g>
  );
}

function GoldDefs({ uid }: { uid: string }) {
  return (
    <>
      <linearGradient id={`${uid}-drum`} x1="0" x2="1" y1="0" y2="0">
        <stop offset="0" stopColor={GOLD.deep} />
        <stop offset=".35" stopColor={GOLD.light} />
        <stop offset=".6" stopColor={GOLD.mid} />
        <stop offset="1" stopColor={GOLD.deep} />
      </linearGradient>
      <radialGradient id={`${uid}-drumtop`} cx=".4" cy=".35" r=".8">
        <stop offset="0" stopColor="#FFF4D0" />
        <stop offset=".55" stopColor={GOLD.mid} />
        <stop offset="1" stopColor={GOLD.deep} />
      </radialGradient>
    </>
  );
}

/* ------------------------------------------------------------------ ballerina */

/** A porcelain ballerina, `turn` of the way round (0 = facing you). */
export function Ballerina({ turn, className }: { turn: number; className?: string }) {
  const uid = useUid();
  const p = ballerina(turn);
  const a = turn * Math.PI * 2;
  const apart = Math.abs(Math.cos(a)) * 1.9;
  const w = p.waist;
  const s = p.shoulders;

  const arm = (x: Arm, key: string) => (
    <g key={key}>
      <path d={x.d} fill="none" stroke={SKIN.line} strokeWidth="2.5" strokeLinecap="round" />
      <path d={x.d} fill="none" stroke={`url(#${uid}-skin)`} strokeWidth="1.85" strokeLinecap="round" />
      <circle cx={x.hand.x} cy={x.hand.y} r="1" fill={SKIN.mid} />
    </g>
  );
  const bun = (
    <g key="bun">
      <circle cx={p.bun.x} cy={p.bun.y} r="3.5" fill={HAIR.mid} stroke={HAIR.deep} strokeWidth=".4" />
      <path d={`M${p.bun.x - 2.4} ${p.bun.y - 1.2} q2.4 -1.6 4.8 0`} fill="none" stroke={HAIR.deep} strokeWidth=".4" opacity=".6" />
      {[-2.2, 0, 2.2].map((dx) => (
        <circle key={dx} cx={p.bun.x + dx} cy={p.bun.y - 3.1 + Math.abs(dx) * 0.35} r=".85" fill="#F5A7BD" stroke="#D97D99" strokeWidth=".25" />
      ))}
    </g>
  );
  const back: [number, ReactNode][] = [];
  const front: [number, ReactNode][] = [];
  p.arms.forEach((x, i) => (x.z < 0 ? back : front).push([x.z, arm(x, `arm-${i}`)]));
  (p.bun.z < 0 ? back : front).push([p.bun.z, bun]);
  back.sort((m, n) => m[0] - n[0]);
  front.sort((m, n) => m[0] - n[0]);

  const passe = (
    <g key="passe">
      <path d={`M${p.passe.hip.x} ${p.passe.hip.y} L${p.passe.knee.x} ${p.passe.knee.y}`} stroke={p.passe.front ? TIGHTS.mid : TIGHTS.deep} strokeWidth="4.6" strokeLinecap="round" />
      <path d={`M${p.passe.knee.x} ${p.passe.knee.y} L${p.passe.toe.x} ${p.passe.toe.y}`} stroke={p.passe.front ? TIGHTS.mid : TIGHTS.deep} strokeWidth="3.3" strokeLinecap="round" />
      <circle cx={p.passe.toe.x} cy={p.passe.toe.y} r="1.5" fill="#F2A9BE" />
    </g>
  );
  const standing = (
    <g key="standing">
      <path d="M-1.1 -11.5 L-1.4 -17 C-2.5 -24 -2.4 -31 -1.9 -36 C-2.9 -42 -3.6 -50 -3.9 -57 L3.9 -57 C3.6 -50 2.9 -42 1.9 -36 C2.4 -31 2.5 -24 1.4 -17 L1.1 -11.5 Z" fill={`url(#${uid}-tights)`} />
      <path d="M-1.2 -11.6 L1.2 -11.6 L1.5 -16.2 L-1.5 -16.2 Z" fill="#F2A9BE" />
      <path d="M-1.5 -16 L1.6 -19.6 M1.5 -16 L-1.6 -19.6" stroke="#E68FA8" strokeWidth=".35" />
    </g>
  );

  return (
    <svg viewBox="-34 -116 68 124" className={className} aria-hidden="true" overflow="visible">
      <defs>
        <GoldDefs uid={uid} />
        <linearGradient id={`${uid}-tights`} x1="0" x2="1">
          <stop offset="0" stopColor={TIGHTS.deep} />
          <stop offset=".45" stopColor={TIGHTS.mid} />
          <stop offset="1" stopColor={TIGHTS.deep} />
        </linearGradient>
        <linearGradient id={`${uid}-skin`} x1="0" x2="1">
          <stop offset="0" stopColor={SKIN.mid} />
          <stop offset=".5" stopColor={SKIN.light} />
          <stop offset="1" stopColor={SKIN.mid} />
        </linearGradient>
        <linearGradient id={`${uid}-bodice`} x1="0" x2="1">
          <stop offset="0" stopColor={BODICE.deep} />
          <stop offset=".45" stopColor={BODICE.mid} />
          <stop offset="1" stopColor={BODICE.deep} />
        </linearGradient>
        <radialGradient id={`${uid}-tulle`} cx=".45" cy=".4" r=".7">
          <stop offset="0" stopColor="#FFF4F7" />
          <stop offset=".6" stopColor={TULLE.top} />
          <stop offset="1" stopColor={TULLE.mid} />
        </radialGradient>
      </defs>

      <Pedestal uid={uid} rx={12.5} top={-12} />

      {p.passe.front ? [standing, passe] : [passe, standing]}

      {/* the tutu, a disc of tulle seen a little from above */}
      <ellipse cx="0" cy={WAIST + 2.4} rx="25" ry={25 * TILT} fill={TULLE.under} opacity=".85" />
      <path d={p.rim} fill={TULLE.rim} stroke={TULLE.line} strokeWidth=".4" strokeLinejoin="round" />
      <ellipse cx="0" cy={WAIST + 0.4} rx="19" ry={19 * TILT} fill={TULLE.mid} />
      <ellipse cx="0" cy={WAIST - 0.8} rx="13.5" ry={13.5 * TILT} fill={`url(#${uid}-tulle)`} />
      {p.pleats.map((l, i) => (
        <line key={i} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} stroke={TULLE.line} strokeWidth=".42" strokeLinecap="round" opacity={l.o * 0.75} />
      ))}
      {p.beads.map((b, i) => (
        <circle key={i} cx={b.x} cy={b.y} r=".55" fill={GOLD.light} stroke={GOLD.deep} strokeWidth=".15" opacity={b.o} />
      ))}

      {back.map(([, node]) => node)}

      {/* the bodice, her shoulders and neck */}
      <path d={`M${-w} ${WAIST - 0.8} C${-w - 0.6} ${WAIST - 8} ${-w - 1.4} ${WAIST - 12} ${-s * 0.8} -71 L${s * 0.8} -71 C${w + 1.4} ${WAIST - 12} ${w + 0.6} ${WAIST - 8} ${w} ${WAIST - 0.8} Z`} fill={`url(#${uid}-bodice)`} />
      <path d={`M${-s * 0.8} -71 C${-s * 0.92} -75 ${-s} -78.4 ${-s} -80.4 C${-s * 0.5} -82.6 ${s * 0.5} -82.6 ${s} -80.4 C${s} -78.4 ${s * 0.92} -75 ${s * 0.8} -71 Z`} fill={`url(#${uid}-skin)`} />
      <rect x="-1.2" y="-89" width="2.4" height="8" rx="1" fill={SKIN.mid} />
      <line x1={p.seam.x} y1={WAIST - 1.2} x2={p.seam.x * 0.95} y2="-71" stroke={BODICE.deep} strokeWidth=".45" opacity={p.seam.o} />
      <path d={`M${p.seam.x - 1.3} -71.6 l1.3 .8 l1.3 -.8 l-1.3 .8 z`} fill="#FFFFFF" stroke="#E68FA8" strokeWidth=".3" opacity={p.seam.o} />
      <path d={`M${p.lacing.x - 1} ${WAIST - 2} l2 -3 l-2 -3 l2 -3 l-2 -3`} fill="none" stroke="#FFFFFF" strokeWidth=".4" opacity={p.lacing.o} />

      {/* the head: hair all round, and the face on whichever side is towards you */}
      <circle cx="0" cy="-94" r="6.2" fill={SKIN.mid} />
      <circle cx={p.hair.x} cy={p.hair.y} r="6.6" fill={HAIR.mid} />
      <path d={`M${p.hair.x - 4.2} ${p.hair.y - 3.6} q4.2 -2.6 8.4 0`} fill="none" stroke={HAIR.deep} strokeWidth=".45" opacity=".55" />
      <ellipse cx={p.face.x} cy="-92.8" rx={p.face.rx} ry="5.4" fill={SKIN.light} opacity={p.face.o} />
      <g opacity={p.face.eye}>
        <path d={`M${p.face.x - apart - 0.9} -93.6 q.9 .8 1.8 0 M${p.face.x + apart - 0.9} -93.6 q.9 .8 1.8 0`} fill="none" stroke="#6B4238" strokeWidth=".38" strokeLinecap="round" />
        <circle cx={p.face.x - apart * 1.35} cy="-91.6" r="1.05" fill="#F29BAE" opacity=".55" />
        <circle cx={p.face.x + apart * 1.35} cy="-91.6" r="1.05" fill="#F29BAE" opacity=".55" />
        <ellipse cx={p.face.x} cy="-89.9" rx=".75" ry=".42" fill="#D9546F" />
      </g>

      {front.map(([, node]) => node)}

      {/* glaze: porcelain catches the light on the same side as the box */}
      <ellipse cx="-6" cy={WAIST - 1.6} rx="6" ry="1.4" fill="#FFFFFF" opacity=".35" />
    </svg>
  );
}

/* --------------------------------------------------------------------- swans */

const BEAK = "#E9893C";
const FEATHER = { light: "#FFFFFF", mid: "#F3EEE8", line: "#CFC5BA" };

/** One swan side on, facing right, its body's middle at the origin on the water. */
function SwanSide({ uid }: { uid: string }) {
  return (
    <g>
      <path d="M-12.4 -7.4 L-17.2 -10.6 L-14.3 -5.2 Z" fill={FEATHER.mid} stroke={FEATHER.line} strokeWidth=".3" strokeLinejoin="round" />
      <path d="M-14.5 -5.2 C-13.6 -8.6 -10.5 -9.6 -6.5 -9.4 C-1.5 -9.2 4 -9 7 -7.3 C8.8 -6.3 9.2 -3.6 8 -1.5 C6.9 0 4.6 .6 1 .6 L-9 .6 C-12.2 .4 -14 -1.6 -14.5 -5.2 Z" fill={`url(#${uid}-feather)`} stroke={FEATHER.line} strokeWidth=".35" />
      <path d="M6 -7.4 C4 -13 -2 -16.8 -8.8 -15.2 C-12 -14.4 -13.4 -12 -13 -9.6 C-9 -11 -4 -10.4 0 -9.2 C2.6 -8.4 4.6 -7.8 6 -7.4 Z" fill={FEATHER.light} stroke={FEATHER.line} strokeWidth=".35" />
      <path d="M-1.6 -13.2 C-5 -12 -8.4 -11.6 -11.4 -11.8 M1.6 -11 C-2 -10.2 -6 -10 -9 -10.4" fill="none" stroke={FEATHER.line} strokeWidth=".3" strokeLinecap="round" />
      {/* the neck: one side of the heart */}
      <path d="M6.6 -7.8 C4.2 -12 -2.8 -17.5 -2.3 -26 C-1.8 -33.6 5 -37.6 7.3 -31.2" fill="none" stroke={FEATHER.line} strokeWidth="3.6" strokeLinecap="round" />
      <path d="M6.6 -7.8 C4.2 -12 -2.8 -17.5 -2.3 -26 C-1.8 -33.6 5 -37.6 7.3 -31.2" fill="none" stroke={FEATHER.light} strokeWidth="2.9" strokeLinecap="round" />
      <path d="M4.2 -7.6 C5.8 -10 8 -9.2 8.6 -6.8 Z" fill={FEATHER.light} />
      <ellipse cx="7" cy="-29.3" rx="2.5" ry="1.85" transform="rotate(62 7 -29.3)" fill={FEATHER.light} stroke={FEATHER.line} strokeWidth=".3" />
      <path d="M7.7 -27.9 L8.7 -25.6 L7 -27 Z" fill={BEAK} />
      <ellipse cx="7.6" cy="-28.4" rx=".7" ry=".5" fill="#2A1E1A" />
      <circle cx="6.4" cy="-30" r=".4" fill="#2A1E1A" />
      <path d="M5.4 -10.6 l-1.6 -1 l.2 1.9 z M5.4 -10.6 l1.7 -.8 l-.3 1.9 z" fill="#F29BB3" stroke="#D9728F" strokeWidth=".2" />
    </g>
  );
}

/** One swan face on (`front`) or from behind. */
function SwanEnd({ front }: { front: boolean }) {
  return (
    <g>
      <path d="M-1 -7 C-4 -15.5 -12 -15.2 -11.4 -6 C-8 -8 -4 -8.2 -1 -7 Z M1 -7 C4 -15.5 12 -15.2 11.4 -6 C8 -8 4 -8.2 1 -7 Z" fill={FEATHER.light} stroke={FEATHER.line} strokeWidth=".35" />
      <ellipse cx="0" cy="-4.4" rx="9.4" ry="4.6" fill={FEATHER.mid} stroke={FEATHER.line} strokeWidth=".35" />
      {front ? null : <path d="M-2.6 -3 L0 -8.6 L2.6 -3 Z" fill={FEATHER.light} stroke={FEATHER.line} strokeWidth=".3" />}
      <path d="M0 -8 C1.2 -14 -1.2 -20 0 -26.4" fill="none" stroke={FEATHER.line} strokeWidth="3.7" strokeLinecap="round" />
      <path d="M0 -8 C1.2 -14 -1.2 -20 0 -26.4" fill="none" stroke={FEATHER.light} strokeWidth="3" strokeLinecap="round" />
      <circle cx="0" cy="-28.6" r="2.6" fill={FEATHER.light} stroke={FEATHER.line} strokeWidth=".3" />
      {front ? (
        <>
          <path d="M-1 -28 L1 -28 L0 -25.3 Z" fill={BEAK} />
          <ellipse cx="0" cy="-28.3" rx=".95" ry=".55" fill="#2A1E1A" />
          <circle cx="-1.15" cy="-29.3" r=".38" fill="#2A1E1A" />
          <circle cx="1.15" cy="-29.3" r=".38" fill="#2A1E1A" />
        </>
      ) : null}
    </g>
  );
}

function Swan({ pose, uid }: { pose: SwanPose; uid: string }) {
  // The end-on view is laid down solid first and the side view fades over it, so a swan halfway
  // round is never two ghosts of itself with the pond showing through.
  const end = Math.min(1, (pose.front + pose.back) * 2.4);
  return (
    <g transform={`translate(${pose.x} ${pose.y}) scale(${pose.scale})`}>
      {end > 0.01 ? (
        <g opacity={end}>
          <SwanEnd front={pose.front >= pose.back} />
        </g>
      ) : null}
      {pose.profile > 0.01 ? (
        <g opacity={pose.profile} transform={`scale(${pose.side} 1)`}>
          <SwanSide uid={uid} />
        </g>
      ) : null}
    </g>
  );
}

/** Two swans on a mirror pond, `turn` of the way round; side by side they make a heart. */
export function Swans({ turn, className }: { turn: number; className?: string }) {
  const uid = useUid();
  const pair = swans(turn);
  const heart = heartness(turn);
  const a = turn * Math.PI * 2;
  const R = 21;
  const glints = [0.3, 2.2, 4.1].map((phi) => {
    const x = 13 * Math.sin(phi + a);
    const z = 13 * Math.cos(phi + a);
    return { x, y: z * TILT, o: z > -4 ? 0.7 : 0.25 };
  });
  return (
    <svg viewBox="-30 -50 60 60" className={className} aria-hidden="true" overflow="visible">
      <defs>
        <GoldDefs uid={uid} />
        <radialGradient id={`${uid}-pond`} cx=".42" cy=".38" r=".75">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset=".45" stopColor="#DCE6EE" />
          <stop offset="1" stopColor="#9DB0C2" />
        </radialGradient>
        <linearGradient id={`${uid}-feather`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="#FFFFFF" />
          <stop offset="1" stopColor="#E9E1D8" />
        </linearGradient>
      </defs>
      <Pedestal uid={uid} rx={9} top={-6} />
      {/* the pond: a round mirror in a gold rim, turning */}
      <ellipse cx="0" cy="-6" rx={R + 1.4} ry={(R + 1.4) * TILT} fill={`url(#${uid}-drum)`} />
      <ellipse cx="0" cy="-6.6" rx={R} ry={R * TILT} fill={`url(#${uid}-pond)`} />
      {glints.map((g, i) => (
        <path key={i} d={`M${g.x - 2.6} ${g.y - 6.6} q2.6 -.9 5.2 0`} fill="none" stroke="#FFFFFF" strokeWidth=".5" strokeLinecap="round" opacity={g.o} />
      ))}
      <g transform="translate(0 -6.8)">
        {pair.map((pose, i) => (
          <Swan key={i} pose={pose} uid={uid} />
        ))}
        <path d="M0 -41.5 C-2.2 -44 -5.2 -42.6 -4.2 -40.1 C-3.4 -38.3 -1.2 -37.1 0 -36 C1.2 -37.1 3.4 -38.3 4.2 -40.1 C5.2 -42.6 2.2 -44 0 -41.5 Z" fill="#F06E92" opacity={heart} transform={`translate(0 ${-(1 - heart) * 3})`} />
      </g>
    </svg>
  );
}
