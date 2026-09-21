import { GROUP_GLYPHS } from "@/lib/dates/glyphs";
import { GROUPS, type PlaceGroup } from "@/lib/dates/kinds";

const PINS: { group: PlaceGroup; x: number; y: number }[] = [
  { group: "sweet", x: 96, y: 210 },
  { group: "outdoors", x: 250, y: 96 },
  { group: "eat", x: 306, y: 232 },
  { group: "culture", x: 168, y: 92 },
  { group: "play", x: 48, y: 96 },
  { group: "unwind", x: 330, y: 138 },
];

/**
 * A drawing of the Dates map for the front page: the same paper, streets and pins, with a dotted
 * walk from something sweet to a view. A picture rather than the map itself, which is a megabyte
 * nobody on the front page has asked for yet.
 */
export function MapCard({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 380 300" className={className} role="img" aria-hidden="true">
      <defs>
        <clipPath id="map-card-clip">
          <rect width="380" height="300" rx="26" />
        </clipPath>
        <filter id="map-card-pin" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="2" stdDeviation="2.5" floodColor="#46192A" floodOpacity="0.3" />
        </filter>
      </defs>
      <g clipPath="url(#map-card-clip)">
        <rect width="380" height="300" fill="#FBF3EE" />
        <path d="M-10 250 C60 236 120 262 190 250 S320 236 400 262 V310 H-10Z" fill="#CFE3EE" />
        <path d="M206 20 q40 -14 70 8 t20 56 q-30 22 -66 8 t-24 -72Z" fill="#DCEBD8" />
        <path d="M20 150 q24 -10 44 4 t8 40 q-22 12 -42 2 t-10 -46Z" fill="#DCEBD8" />
        <g stroke="#FFFFFF" strokeLinecap="round" fill="none">
          <path d="M-10 60 L400 120" strokeWidth="11" />
          <path d="M-10 190 L400 170" strokeWidth="9" />
          <path d="M130 -10 L150 310" strokeWidth="11" />
          <path d="M290 -10 L270 250" strokeWidth="8" />
          <path d="M40 -10 L70 250" strokeWidth="6" />
          <path d="M-10 120 L400 40" strokeWidth="5" />
          <path d="M200 120 L380 300" strokeWidth="5" />
        </g>
        <g stroke="#EBD8CF" strokeLinecap="round" fill="none" strokeWidth="1">
          <path d="M-10 60 L400 120" transform="translate(0 -6)" />
          <path d="M-10 60 L400 120" transform="translate(0 6)" />
          <path d="M130 -10 L150 310" transform="translate(-6 0)" />
          <path d="M130 -10 L150 310" transform="translate(6 0)" />
        </g>
        <path d="M96 210 C120 160 190 170 250 96" fill="none" stroke="#D6336C" strokeWidth="3.2" strokeLinecap="round" strokeDasharray="0.5 8" />
        {PINS.map((pin) => (
          <g key={pin.group} transform={`translate(${pin.x} ${pin.y})`} filter="url(#map-card-pin)">
            <circle r="17" fill="#FFFFFF" />
            <circle r="14" fill={GROUPS[pin.group].color} />
            <g transform="translate(-8.5 -8.5) scale(0.71)" fill="none" stroke="#FFFFFF" strokeWidth="2.3" strokeLinecap="round" strokeLinejoin="round">
              {GROUP_GLYPHS[pin.group].map((d) => (
                <path key={d} d={d} />
              ))}
            </g>
          </g>
        ))}
        {[
          { n: 1, x: 96, y: 210 },
          { n: 2, x: 250, y: 96 },
        ].map((s) => (
          <g key={s.n} transform={`translate(${s.x + 19} ${s.y - 19})`}>
            <circle r="10.5" fill="#D6336C" stroke="#FFFFFF" strokeWidth="2.5" />
            <text textAnchor="middle" y="4" fontSize="11" fontWeight="700" fill="#FFFFFF" fontFamily="var(--font-sans)">
              {s.n}
            </text>
          </g>
        ))}
      </g>
      <rect x="0.5" y="0.5" width="379" height="299" rx="25.5" fill="none" stroke="rgba(42,15,31,0.08)" />
    </svg>
  );
}
