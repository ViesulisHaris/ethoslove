"use client";

/**
 * The music box, built in CSS 3D so its lid can really swing open on its hinge: a lacquered body
 * with gold mouldings, velvet inside, a slab of a lid with an oval gilt mirror under it, bun feet,
 * and a butterfly key on its right side that turns on its own axle. Each face is a flat panel
 * painted with gradients and a little SVG, placed round one origin (the middle of the body) and
 * turned together, so the lid, the key and the figurine agree about where everything is.
 *
 * Sizes are in --k. The body is W wide, D deep and H tall; x runs right, y down, z towards you.
 */
import type { CSSProperties, ReactNode, Ref } from "react";
import { cn } from "@/lib/utils";
import { SCRIPT_FONT } from "../_shared/cover-kit";
import { Scrap } from "../_shared/collage/kit";
import { GOLD, type Finish } from "./looks";

export const BOX = { W: 58, D: 36, H: 21, T: 4.4, wall: 2.2, well: 9.5, foot: 3.2 };
/** How the box sits: turned on the vanity to show its keyed side, seen a little from above. */
export const VIEW = { tilt: -24, turn: -26 };
/** How far the lid swings, open. */
export const LID_OPEN = 101;

const k = (n: number): string => `calc(${n} * var(--k))`;
const t3 = (x: number, y: number, z: number): string => `translate3d(${k(x)}, ${k(y)}, ${k(z)})`;
/** The key's grip at the end of its shaft, turned `angle` radians about it. */
export const keyTransform = (angle: number): string => `${t3(5.2, 0, 0)} rotateX(${angle}rad)`;
const HIDE_BACK: CSSProperties = { backfaceVisibility: "hidden", WebkitBackfaceVisibility: "hidden" };

/** A flat panel `w` × `h`, centred on the box's origin, then moved into place by `transform`. */
function Face({ w, h, transform, style, className, children, twoSided = false }: { w: number; h: number; transform: string; style?: CSSProperties; className?: string; children?: ReactNode; twoSided?: boolean }) {
  return (
    <div className={cn("absolute top-0 left-0", className)} style={{ width: k(w), height: k(h), marginLeft: k(-w / 2), marginTop: k(-h / 2), transform, ...(twoSided ? null : HIDE_BACK), ...style }}>
      {children}
    </div>
  );
}

const goldBand = (dir = "180deg"): string => `linear-gradient(${dir}, ${GOLD.light} 0%, ${GOLD.mid} 38%, ${GOLD.deep} 62%, ${GOLD.mid} 82%, ${GOLD.light} 100%)`;
const goldLine = (inset: number, bottom = inset): CSSProperties => ({
  position: "absolute",
  top: k(inset),
  left: k(inset),
  right: k(inset),
  bottom: k(bottom),
  borderRadius: k(0.8),
  boxShadow: `inset 0 0 0 ${k(0.28)} ${GOLD.deep}, inset 0 0 0 ${k(0.62)} ${GOLD.mid}, inset 0 0 0 ${k(0.8)} ${GOLD.light}`,
});

/** Painted on the lacquer: a spray of small roses, the way old boxes were decorated by hand. */
function Posy({ finish, flip = false, className }: { finish: Finish; flip?: boolean; className?: string }) {
  const [rose, blush] = finish.posy;
  return (
    <svg viewBox="0 0 40 20" className={className} aria-hidden="true" style={{ transform: flip ? "scaleX(-1)" : undefined }}>
      <path d="M3 15 C10 13 16 9 24 9 C29 9 33 10 37 8" fill="none" stroke="#8FA27A" strokeWidth=".8" strokeLinecap="round" />
      {[
        [9, 12.6, -30],
        [17, 9.6, 20],
        [30, 8.6, -12],
      ].map(([x, y, r], i) => (
        <ellipse key={i} cx={x} cy={y} rx="2.6" ry="1.2" transform={`rotate(${r} ${x} ${y})`} fill="#9DB085" />
      ))}
      {[
        [13, 11.2, 3.2],
        [23, 8.2, 3.8],
        [34, 7.4, 2.4],
      ].map(([x, y, r], i) => (
        <g key={i}>
          <circle cx={x} cy={y} r={r} fill={rose} />
          <circle cx={x - r * 0.2} cy={y - r * 0.15} r={r * 0.62} fill={blush} opacity=".7" />
          <path d={`M${x - r * 0.5} ${y} q${r * 0.5} ${-r * 0.6} ${r} 0`} fill="none" stroke="#FFFFFF" strokeOpacity=".55" strokeWidth=".45" />
        </g>
      ))}
      {[6, 27, 38].map((x, i) => (
        <circle key={i} cx={x} cy={i === 1 ? 5 : 12} r=".9" fill={blush} />
      ))}
    </svg>
  );
}

/** Filigree for the corners of a gold frame. */
function Corner({ className, style }: { className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 10 10" className={cn("absolute", className)} style={style} aria-hidden="true">
      <path d="M1 9 C1 4.5 4.5 1 9 1 M2.6 9 C2.8 6 4.4 3.6 7 2.8 M1.2 6.4 C2.6 6.6 3.6 5.6 3.4 4.2" fill="none" stroke={GOLD.mid} strokeWidth=".7" strokeLinecap="round" />
      <circle cx="4.6" cy="4.6" r=".9" fill={GOLD.light} stroke={GOLD.deep} strokeWidth=".25" />
    </svg>
  );
}

function CornerSet({ inset, size }: { inset: number; size: number }) {
  const s: CSSProperties = { width: k(size), height: k(size) };
  return (
    <>
      <Corner style={{ ...s, left: k(inset), top: k(inset) }} />
      <Corner style={{ ...s, right: k(inset), top: k(inset), transform: "scaleX(-1)" }} />
      <Corner style={{ ...s, left: k(inset), bottom: k(inset), transform: "scaleY(-1)" }} />
      <Corner style={{ ...s, right: k(inset), bottom: k(inset), transform: "scale(-1,-1)" }} />
    </>
  );
}

/** The engraved plate on the front: their name, cut into gold. */
function NamePlate({ name }: { name: string }) {
  const size = name.length > 14 ? 2.5 : name.length > 9 ? 3.1 : 3.9;
  return (
    <div className="absolute top-1/2 left-1/2 grid -translate-x-1/2 -translate-y-1/2 place-items-center overflow-hidden" style={{ width: k(21), height: k(7.2), borderRadius: "50%", background: `radial-gradient(120% 140% at 40% 30%, #FFF6D6 0%, ${GOLD.light} 28%, ${GOLD.mid} 62%, ${GOLD.deep} 100%)`, boxShadow: `0 ${k(0.3)} ${k(0.6)} rgba(60,30,10,.4), inset 0 0 0 ${k(0.3)} ${GOLD.deep}, inset 0 0 0 ${k(0.7)} rgba(255,246,214,.7)` }}>
      <span className="max-w-[86%] truncate px-[4%] leading-none" style={{ fontFamily: SCRIPT_FONT, fontSize: k(size), color: GOLD.ink, textShadow: `0 ${k(0.12)} 0 rgba(255,244,205,.8), 0 ${k(-0.08)} 0 rgba(80,50,10,.35)` }}>
        {name}
      </span>
    </div>
  );
}

/** A gold rosette where the key goes in. */
function Rosette() {
  return (
    <svg viewBox="-10 -10 20 20" className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" style={{ width: k(7.2), height: k(7.2) }} aria-hidden="true">
      {Array.from({ length: 10 }, (_, i) => (
        <ellipse key={i} cx="0" cy="-6.2" rx="1.9" ry="3.4" transform={`rotate(${i * 36})`} fill={GOLD.mid} stroke={GOLD.deep} strokeWidth=".4" />
      ))}
      <circle r="4.6" fill={GOLD.light} stroke={GOLD.deep} strokeWidth=".5" />
      <circle r="2.2" fill={GOLD.deep} />
    </svg>
  );
}

/** The butterfly grip of the key, flat: two lobes either side of the shaft, each pierced with a heart. */
function KeyGrip() {
  const lobe = "M0 -1.4 C1.2 -3.2 1.6 -6.4 4.8 -8.6 C7.2 -10.2 9.8 -9 9.8 -6.4 C9.8 -3.8 7.6 -2.4 5 -1.6 C3 -1 1.4 -1 0 -1.4 Z";
  const heart = "M6.1 -6.9 C5.5 -7.8 4.1 -7.4 4.4 -6.3 C4.6 -5.6 5.5 -5 6.1 -4.5 C6.7 -5 7.6 -5.6 7.8 -6.3 C8.1 -7.4 6.7 -7.8 6.1 -6.9 Z";
  return (
    <svg viewBox="-1 -11 12 22" className="h-full w-full overflow-visible" aria-hidden="true">
      <defs>
        <linearGradient id="mb-grip" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#FFF4D0" />
          <stop offset=".4" stopColor={GOLD.mid} />
          <stop offset="1" stopColor={GOLD.deep} />
        </linearGradient>
      </defs>
      {[1, -1].map((s) => (
        <g key={s} transform={`scale(1 ${s})`}>
          <path d={lobe} fill="url(#mb-grip)" stroke={GOLD.deep} strokeWidth=".5" />
          <path d={heart} fill="rgba(60,30,10,.55)" />
        </g>
      ))}
      <rect x="-1" y="-1.7" width="3" height="3.4" rx="1" fill={GOLD.mid} stroke={GOLD.deep} strokeWidth=".4" />
    </svg>
  );
}

/** The oval mirror in the lid: gilt frame, silvered glass, and whatever is showing in it. */
function Mirror({ children, onOpen, label }: { children?: ReactNode; onOpen?: () => void; label?: string }) {
  const frame = { width: k(29.5), height: k(33.5) };
  const glass = (
    <span className="absolute overflow-hidden rounded-[50%]" style={{ inset: k(2.3), background: "radial-gradient(120% 90% at 35% 25%, #FFFFFF 0%, #E4E8EC 38%, #B7C0C9 100%)", boxShadow: `inset 0 ${k(0.6)} ${k(1.4)} rgba(40,30,40,.45)` }}>
      {children}
      {/* the glass over the picture: one bright streak, and a soft darkening towards the gilt */}
      <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={{ background: "linear-gradient(118deg, transparent 22%, rgba(255,255,255,.36) 30%, rgba(255,255,255,.08) 38%, transparent 46%), radial-gradient(90% 90% at 50% 50%, transparent 62%, rgba(30,20,30,.28))" }} />
    </span>
  );
  return (
    <div className="absolute top-[44%] left-1/2 -translate-x-1/2 -translate-y-1/2" style={frame}>
      <svg viewBox="0 0 59 67" className="absolute inset-0 h-full w-full overflow-visible" aria-hidden="true" style={{ filter: `drop-shadow(0 ${k(0.4)} ${k(0.6)} rgba(40,10,20,.5))` }}>
        <defs>
          <linearGradient id="mb-gilt" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#FFF4D0" />
            <stop offset=".3" stopColor={GOLD.mid} />
            <stop offset=".55" stopColor={GOLD.light} />
            <stop offset="1" stopColor={GOLD.deep} />
          </linearGradient>
        </defs>
        <ellipse cx="29.5" cy="33.5" rx="28.6" ry="32.6" fill="url(#mb-gilt)" stroke={GOLD.deep} strokeWidth=".8" />
        <ellipse cx="29.5" cy="33.5" rx="25.8" ry="29.6" fill="none" stroke="#FFF1C4" strokeWidth=".6" opacity=".8" />
        {Array.from({ length: 28 }, (_, i) => {
          const a = (i / 28) * Math.PI * 2;
          return <circle key={i} cx={29.5 + 27.2 * Math.cos(a)} cy={33.5 + 31.1 * Math.sin(a)} r=".75" fill="#FFF6D6" stroke={GOLD.deep} strokeWidth=".25" />;
        })}
        {/* a crest of scrolls on top, and a small shell below */}
        <path d="M19 3.4 C22 -1.4 26 .4 29.5 -2.6 C33 .4 37 -1.4 40 3.4 C36 2.2 33 3.2 29.5 5 C26 3.2 23 2.2 19 3.4 Z" fill="url(#mb-gilt)" stroke={GOLD.deep} strokeWidth=".5" />
        <path d="M24.5 64.4 C26 67.8 33 67.8 34.5 64.4 C32 65.6 27 65.6 24.5 64.4 Z" fill="url(#mb-gilt)" stroke={GOLD.deep} strokeWidth=".45" />
      </svg>
      {onOpen ? (
        <button type="button" onClick={onOpen} aria-label={label} data-mirror="" className="absolute block rounded-[50%] outline-none focus-visible:ring-4 focus-visible:ring-white/70" style={{ inset: 0 }}>
          {glass}
        </button>
      ) : (
        glass
      )}
    </div>
  );
}

export type BoxProps = {
  finish: Finish;
  name: string;
  /** 0 shut, 1 fully open. */
  lid: number;
  /** No transitions: the editor's still frame and reduced motion. */
  instant: boolean;
  /** How far the key has turned, in radians. */
  keyAngle: number;
  /** Whoever stands on the velvet, drawn face on; and whether they have risen out of it. */
  figurine: ReactNode;
  risen: boolean;
  /** How the figurine's drawing is shaped: its width and height in --k, how far its foot sits above the drawing's bottom, and how far the spindle lifts it. */
  figure: { w: number; h: number; foot: number; rise: number };
  /** What the mirror shows, and what a tap on it does. */
  mirror: ReactNode;
  onMirror?: () => void;
  mirrorLabel?: string;
  /** The folded letter still tucked in the velvet. */
  letterTucked: boolean;
  /** The key's axle, for measuring where it is on screen, and its grip, which the tune turns back as it plays. */
  axleRef?: Ref<HTMLSpanElement>;
  gripRef?: Ref<HTMLDivElement>;
};

export function MusicBox({ finish, name, lid, instant, keyAngle, figurine, risen, figure, mirror, onMirror, mirrorLabel, letterTucked, axleRef, gripRef }: BoxProps) {
  const { W, D, H, T, wall, well, foot } = BOX;
  const lacquerFront = `linear-gradient(180deg, ${finish.sheen} 0%, ${finish.lacquer} 34%, ${finish.lacquer} 70%, ${finish.shade} 100%)`;
  const lacquerSide = `linear-gradient(180deg, ${finish.lacquer} 0%, ${finish.shade} 45%, ${finish.deep} 100%)`;
  const velvet = (at = "50% 30%") => `radial-gradient(120% 90% at ${at}, ${finish.velvet} 0%, ${finish.velvetDeep} 100%)`;
  const ease = instant ? "none" : "transform 1.7s cubic-bezier(.42,0,.16,1)";
  const floorY = -H / 2 + well;

  const band = (h: number, top: boolean): CSSProperties => ({ position: "absolute", left: 0, right: 0, [top ? "top" : "bottom"]: 0, height: k(h), background: goldBand(), boxShadow: `0 ${k(top ? 0.25 : -0.25)} ${k(0.5)} rgba(60,30,10,.35)` });

  return (
    <div className="absolute top-0 left-0" style={{ transformStyle: "preserve-3d", transform: `rotateX(${VIEW.tilt}deg) rotateY(${VIEW.turn}deg)` }}>
      {/* the doily it stands on, and its shadow on the lace */}
      <Face w={84} h={84} transform={`${t3(0, H / 2 + foot + 0.05, 0)} rotateX(90deg)`}>
        <Scrap id="doily-pink" eager shadow={false} className="absolute inset-0" width="100%" style={{ height: "100%", filter: "saturate(.1) brightness(1.18) contrast(.9)", opacity: 0.9 }} />
        <span aria-hidden="true" className="absolute inset-0" style={{ background: `radial-gradient(${k(35)} ${k(23)} at 50% 50%, rgba(50,20,30,.5) 0%, rgba(50,20,30,.3) 60%, transparent 100%)` }} />
      </Face>

      {/* bun feet: gold balls, always seen round */}
      {[
        [-1, 1],
        [1, 1],
        [1, -1],
        [-1, -1],
      ].map(([sx, sz], i) => (
        <div key={i} className="absolute top-0 left-0" style={{ transform: `${t3(sx * (W / 2 - 3.4), H / 2 + foot / 2, sz * (D / 2 - 3.4))} rotateY(${-VIEW.turn}deg) rotateX(${-VIEW.tilt}deg)` }}>
          <span className="absolute block rounded-full" style={{ width: k(4.4), height: k(4.4), left: k(-2.2), top: k(-2.2), background: `radial-gradient(circle at 35% 30%, #FFF4D0, ${GOLD.mid} 45%, ${GOLD.deep})` }} />
        </div>
      ))}

      {/* inside: velvet walls and floor, lit from the front */}
      <Face w={W - wall * 2} h={well} transform={t3(0, -H / 2 + well / 2, -D / 2 + wall)} style={{ background: `linear-gradient(180deg, ${finish.velvetDeep}, ${finish.velvet})` }} />
      <Face w={D - wall * 2} h={well} transform={`${t3(-W / 2 + wall, -H / 2 + well / 2, 0)} rotateY(90deg)`} style={{ background: `linear-gradient(180deg, ${finish.velvetDeep}, ${finish.velvet} 90%)` }} />
      <Face w={W - wall * 2} h={D - wall * 2} transform={`${t3(0, floorY, 0)} rotateX(90deg)`} style={{ background: velvet("50% 60%") }}>
        {/* the velvet's pile, and the round well the figurine turns in */}
        <span aria-hidden="true" className="absolute inset-0 opacity-40" style={{ background: "repeating-radial-gradient(circle at 30% 40%, rgba(255,255,255,.05) 0 1px, transparent 1px 3px)" }} />
        <span aria-hidden="true" className="absolute left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ top: `calc(50% + ${k(4)})`, width: k(22), height: k(22), boxShadow: `inset 0 0 0 ${k(0.5)} ${GOLD.mid}, inset 0 0 ${k(2)} rgba(0,0,0,.45)` }} />
        {letterTucked ? (
          <span aria-hidden="true" className="absolute block" style={{ left: k(2.4), top: k(2.6), width: k(16), height: k(10), rotate: "7deg", background: "linear-gradient(160deg, #FFFDF7, #F1E6D4)", boxShadow: `0 ${k(0.5)} ${k(0.9)} rgba(30,10,20,.45)` }}>
            <span className="absolute inset-0" style={{ background: "linear-gradient(to bottom right, transparent 49.4%, rgba(120,90,70,.3) 50%, transparent 50.6%), linear-gradient(to bottom left, transparent 49.4%, rgba(120,90,70,.3) 50%, transparent 50.6%)" }} />
            <span className="absolute top-1/2 left-1/2 w-[34%] -translate-x-1/2 -translate-y-1/2">
              <Scrap id="wax-seal-hibiscus" eager width="100%" />
            </span>
          </span>
        ) : null}
      </Face>

      {/* the figurine, rising from the velvet and always turned to face you */}
      <div className="absolute top-0 left-0" style={{ transformStyle: "preserve-3d", transform: `${t3(0, floorY + figure.foot - (risen ? figure.rise : -5), 4)} rotateY(${-VIEW.turn}deg) rotateX(${-VIEW.tilt}deg)`, transition: instant ? "none" : `transform 1.5s cubic-bezier(.3,.8,.3,1) .75s, opacity .25s linear ${lid > 0.05 ? ".45s" : "1.2s"}`, opacity: lid > 0.05 ? 1 : 0 }}>
        {/* the spindle it rides up on, running down into the velvet */}
        <span className="absolute block" style={{ left: k(-0.5), top: k(-figure.foot - 1), width: k(1), height: k(figure.rise + figure.foot + 4), background: goldBand("90deg"), borderRadius: k(0.5) }} />
        <div className="absolute" style={{ width: k(figure.w), height: k(figure.h), left: k(-figure.w / 2), top: k(-figure.h) }}>
          {figurine}
        </div>
      </div>

      {/* the rim of the walls: a gold lip */}
      <Face w={W} h={wall} transform={`${t3(0, -H / 2, D / 2 - wall / 2)} rotateX(90deg)`} style={{ background: goldBand("90deg") }} />
      <Face w={W} h={wall} transform={`${t3(0, -H / 2, -D / 2 + wall / 2)} rotateX(90deg)`} style={{ background: goldBand("90deg") }} />
      <Face w={wall} h={D - wall * 2} transform={`${t3(-W / 2 + wall / 2, -H / 2, 0)} rotateX(90deg)`} style={{ background: goldBand() }} />
      <Face w={wall} h={D - wall * 2} transform={`${t3(W / 2 - wall / 2, -H / 2, 0)} rotateX(90deg)`} style={{ background: goldBand() }} />

      {/* the front: lacquer, mouldings, painted roses and their name on a gold plate */}
      <Face w={W} h={H} transform={t3(0, 0, D / 2)} style={{ background: lacquerFront }}>
        <span style={band(1.4, true)} />
        <span style={band(2.4, false)} />
        <span style={goldLine(2.6, 3.6)} />
        <CornerSet inset={3.3} size={3.2} />
        <span className="absolute" style={{ left: k(5.4), top: k(8.2), width: k(13), height: k(6.5) }}>
          <Posy finish={finish} className="h-full w-full" />
        </span>
        <span className="absolute" style={{ right: k(5.4), top: k(8.2), width: k(13), height: k(6.5) }}>
          <Posy finish={finish} flip className="h-full w-full" />
        </span>
        <span className="absolute inset-x-0" style={{ top: k(1.4), bottom: k(2.4) }}>
          <NamePlate name={name} />
        </span>
        <span aria-hidden="true" className="absolute inset-0" style={{ background: "linear-gradient(100deg, rgba(255,255,255,.28) 0%, transparent 30%, transparent 70%, rgba(0,0,0,.06) 100%)" }} />
      </Face>

      {/* the right side, in the shade, with the key */}
      <Face w={D} h={H} transform={`${t3(W / 2, 0, 0)} rotateY(90deg)`} style={{ background: lacquerSide }}>
        <span style={band(1.4, true)} />
        <span style={band(2.4, false)} />
        <span style={goldLine(2.6, 3.6)} />
        <span className="absolute inset-x-0" style={{ top: k(1.4), bottom: k(2.4) }}>
          <Rosette />
        </span>
      </Face>

      {/* the key: a shaft out of the rosette, and the grip turning on it */}
      <div className="absolute top-0 left-0" style={{ transformStyle: "preserve-3d", transform: t3(W / 2, 0, 0) }}>
        <Face w={5.4} h={1.7} transform={t3(2.7, 0, 0)} twoSided style={{ background: goldBand(), borderRadius: k(0.4) }} />
        <Face w={5.4} h={1.7} transform={`${t3(2.7, 0, 0)} rotateX(90deg)`} twoSided style={{ background: goldBand(), borderRadius: k(0.4) }} />
        <div ref={gripRef} className="absolute top-0 left-0" style={{ transformStyle: "preserve-3d", transform: keyTransform(keyAngle) }}>
          <span ref={axleRef} className="absolute block" style={{ width: 1, height: 1, left: 0, top: 0 }} />
          <Face w={8} h={16} transform={t3(3.6, 0, 0)} twoSided style={{ filter: `drop-shadow(0 ${k(0.3)} ${k(0.4)} rgba(60,30,10,.4))` }}>
            <KeyGrip />
          </Face>
        </div>
      </div>

      {/* the lid, on its hinge along the back edge */}
      <div className="absolute top-0 left-0" style={{ transformStyle: "preserve-3d", transform: `${t3(0, -H / 2, -D / 2)} rotateX(${lid * LID_OPEN}deg)`, transition: ease }}>
        {/* its underside: velvet, and the mirror */}
        <Face w={W + 1} h={D + 1} transform={`${t3(0, 0, (D + 1) / 2)} rotateX(-90deg)`} style={{ background: velvet("50% 40%"), boxShadow: `inset 0 0 0 ${k(0.6)} ${GOLD.mid}, inset 0 0 ${k(3)} rgba(0,0,0,.4)` }}>
          <Mirror onOpen={onMirror} label={mirrorLabel}>
            {mirror}
          </Mirror>
        </Face>
        {/* its top: lacquer with a gold border and a painted posy in an oval */}
        <Face w={W + 1} h={D + 1} transform={`${t3(0, -T, (D + 1) / 2)} rotateX(90deg)`} style={{ background: `linear-gradient(170deg, ${finish.sheen} 0%, ${finish.lacquer} 55%, ${finish.shade} 100%)` }}>
          <span style={goldLine(2)} />
          <CornerSet inset={2.8} size={4} />
          <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-[50%]" style={{ width: k(30), height: k(21), background: `radial-gradient(circle at 45% 40%, #FFFDF8, ${finish.sheen})`, boxShadow: `inset 0 0 0 ${k(0.5)} ${GOLD.mid}, inset 0 0 0 ${k(0.9)} ${GOLD.light}, 0 ${k(0.3)} ${k(0.6)} rgba(60,30,10,.25)` }}>
            <span className="absolute inset-[18%]">
              <Posy finish={finish} className="h-full w-full" />
            </span>
          </span>
        </Face>
        {/* its front and right edges: gold mouldings */}
        <Face w={W + 1} h={T} transform={t3(0, -T / 2, D + 1)} style={{ background: goldBand(), borderRadius: k(0.6) }} />
        <Face w={D + 1} h={T} transform={`${t3((W + 1) / 2, -T / 2, (D + 1) / 2)} rotateY(90deg)`} style={{ background: `linear-gradient(180deg, ${GOLD.mid}, ${GOLD.deep})`, borderRadius: k(0.6) }} />
        {/* the catch at the front */}
        <Face w={4} h={3.4} transform={t3(0, 0.9, D + 1.05)} style={{ background: `radial-gradient(circle at 40% 35%, #FFF4D0, ${GOLD.mid} 60%, ${GOLD.deep})`, borderRadius: `${k(0.6)} ${k(0.6)} ${k(2)} ${k(2)}` }} />
      </div>
    </div>
  );
}
