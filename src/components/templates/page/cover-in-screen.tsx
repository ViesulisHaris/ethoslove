import Image from "next/image";

/** The shape every cover and film is recorded in: 13 across, 20 down (public/templates/<slug>/poster.jpg and preview.webm; tests/unit/template-film-starts.test.ts measures them). */
export const COVER_SHAPE = [13, 20] as const;
export const COVER_RATIO = `${COVER_SHAPE[0]} / ${COVER_SHAPE[1]}`;

/** Where the soft copies lie: one mirrored above the cover, one mirrored below it, one under it. */
const SOFT = ["-150%", "50%", "-50%"] as const;

/**
 * A gift's cover in a drawn phone's screen. The screen is taller than the cover (390:844 against
 * 13:20), so filling it cut a seventh off each side, and a cover with words at its edges lost
 * letters: XOXO's "MY PERSON" read "Y ERSON" (the user walk of 23 Nov 2026). Here it is drawn
 * whole, at the screen's width and in its middle, over a soft copy of itself that fills the rest,
 * the way the hero's phone shows it (hero-flatlay.tsx); its top and bottom edges fade into that
 * copy (.hero-cover, globals.css).
 *
 * The blur is a share of the screen's width, so the small phone of step three and the large one
 * of "The experience" look alike. The soft copy is asked for at thumbnail size: it is only colour.
 */
export function CoverInScreen({ poster, sizes }: { poster: string; sizes: string }) {
  return (
    <span data-screen-cover className="absolute inset-0 block overflow-hidden [container-type:inline-size]">
      <span aria-hidden="true" className="pointer-events-none absolute inset-0 block scale-125 blur-[7cqw]">
        {SOFT.map((shift) => (
          <Image
            key={shift}
            src={poster}
            alt=""
            width={COVER_SHAPE[0] * 4}
            height={COVER_SHAPE[1] * 4}
            sizes="48px"
            quality={60}
            className="absolute top-1/2 left-0 block h-auto w-full"
            style={{ aspectRatio: COVER_RATIO, transform: `translateY(${shift})${shift === "-50%" ? "" : " scaleY(-1)"}` }}
          />
        ))}
      </span>
      <span data-whole className="hero-cover absolute top-1/2 left-0 block w-full -translate-y-1/2" style={{ aspectRatio: COVER_RATIO }}>
        <Image src={poster} alt="" fill sizes={sizes} className="object-contain" />
      </span>
    </span>
  );
}
