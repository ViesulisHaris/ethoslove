import { DIRECTORIES } from "@/config/directories";

/**
 * One quiet row under the home page's last section, on the footer's own colour so it reads as the
 * footer's first row: the badges of the directories that want to see one (config/directories.ts).
 * The home page only, because that is the address they check. Each badge is 22px tall and dimmed,
 * the smallest the owner picked from a side-by-side (20 Nov 2026), and no smaller or fainter: a
 * directory looks for a badge a person can see, and a link hidden from people is one search engines
 * count against the site. No nofollow either: a checker passes only a link it may follow.
 */
export function DirectoryLine() {
  return (
    <div data-app-hide className="bg-forest">
      <div data-testid="directory-links" className="container-x flex flex-wrap items-center gap-2.5 pt-3">
        {DIRECTORIES.map((directory) => (
          <a key={directory.href} href={directory.href} target="_blank" rel="noopener" className="inline-flex opacity-70 transition-opacity duration-200 hover:opacity-100">
            {/* eslint-disable-next-line @next/next/no-img-element -- a small SVG at the foot of the page: the image optimizer has nothing to do with it */}
            <img
              src={directory.badge.src}
              alt={directory.badge.alt}
              width={directory.badge.width}
              height={directory.badge.height}
              loading="lazy"
              decoding="async"
              className="h-[22px] w-auto"
            />
          </a>
        ))}
      </div>
    </div>
  );
}
