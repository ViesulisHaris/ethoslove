"use client";

/**
 * The lock screen's furniture: the status glyphs, the padlock and the notification card the
 * sender's messages arrive on. Drawn here (SVG and CSS, sized in --k) so the cover reads as a
 * phone someone just picked up, at any screen size.
 */

export function StatusIcons() {
  return (
    <span className="flex items-center gap-[calc(1.5*var(--k))] opacity-85" aria-hidden="true">
      <svg viewBox="0 0 18 12" className="h-[calc(2.5*var(--k))] w-auto" fill="currentColor">
        {[0, 1, 2, 3].map((i) => (
          <rect key={i} x={i * 4.6} y={9 - i * 2.6} width="3.2" height={3 + i * 2.6} rx="1" opacity={i === 3 ? 0.45 : 1} />
        ))}
      </svg>
      <svg viewBox="0 0 16 12" className="h-[calc(2.5*var(--k))] w-auto" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round">
        <path d="M1.4 4.1A9.6 9.6 0 0 1 14.6 4.1" />
        <path d="M4.2 6.9A5.8 5.8 0 0 1 11.8 6.9" />
        <circle cx="8" cy="10.1" r="1.05" fill="currentColor" stroke="none" />
      </svg>
      <svg viewBox="0 0 26 12" className="h-[calc(2.5*var(--k))] w-auto">
        <rect x=".7" y=".7" width="22" height="10.6" rx="3.4" fill="none" stroke="currentColor" strokeWidth="1.2" opacity=".55" />
        <rect x="2.5" y="2.5" width="14.5" height="7" rx="2" fill="currentColor" />
        <path d="M24.3 4.3a2.3 2.3 0 0 1 0 3.4Z" fill="currentColor" opacity=".55" />
      </svg>
    </span>
  );
}

export function LockGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="w-[calc(5*var(--k))] opacity-85" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
      <path d="M8.2 10.4V7.4a3.8 3.8 0 0 1 7.6 0v3" />
      <rect x="5" y="10.2" width="14" height="9.6" rx="3" fill="currentColor" stroke="none" />
    </svg>
  );
}

/** One notification: the app tile with the contact's initial, their name, and the message. */
export function NotificationCard({ name, badge, text, color, now }: { name: string; badge: string; text: string; color: string; now: string }) {
  return (
    <div
      className="w-full rounded-[calc(4.6*var(--k))] px-[calc(3.2*var(--k))] py-[calc(2.8*var(--k))] text-white"
      style={{
        backgroundColor: "rgba(255,255,255,.17)",
        backdropFilter: "blur(calc(4*var(--k)))",
        WebkitBackdropFilter: "blur(calc(4*var(--k)))",
        boxShadow: "inset 0 0 0 calc(.2*var(--k)) rgba(255,255,255,.26), 0 calc(1.2*var(--k)) calc(3*var(--k)) rgba(0,0,0,.28)",
      }}
    >
      <div className="flex items-center gap-[calc(2*var(--k))]">
        <span
          className="grid size-[calc(7*var(--k))] shrink-0 place-items-center rounded-[calc(2.1*var(--k))] text-[calc(3.2*var(--k))] leading-none font-semibold"
          style={{ backgroundColor: color, boxShadow: "inset 0 calc(.4*var(--k)) 0 rgba(255,255,255,.3)" }}
        >
          {badge}
        </span>
        <p className="min-w-0 flex-1 truncate text-[calc(3*var(--k))] font-semibold">{name}</p>
        <span className="shrink-0 text-[calc(2.4*var(--k))] opacity-65">{now}</span>
      </div>
      <p className="mt-[calc(1.5*var(--k))] text-[calc(3.5*var(--k))] leading-snug [overflow-wrap:anywhere]">{text}</p>
    </div>
  );
}
