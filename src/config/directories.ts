/**
 * Directories that list Ethos for free only while tryethos.io shows their badge (the owner's yes,
 * 20 Nov 2026). SaaSTool checks every so often that its badge is still on the home page and takes
 * the listing down when it is not, so check the directory before taking a name out of this list.
 * The address is the one its badge code gives, to the letter: its checker looks for that.
 *
 * The badge is their own dark one, kept in public/badges rather than loaded from their server: the
 * site's image policy allows no outside pictures here, and opening the home page should tell a
 * directory nothing about who opened it. `width` and `height` are the picture as drawn.
 *
 * Not here on purpose: AlternativeTo asks for no badge, and Fazier's free launch wants three
 * comments from the account besides its badge, which is the owner's to decide.
 */
export const DIRECTORIES = [
  {
    name: "SaaSTool",
    href: "https://saastool.site/item/ethos?utm_source=tryethos.io",
    badge: { src: "/badges/saastool-dark.svg", alt: "Featured on SaaSTool.site", width: 210, height: 54 },
  },
] as const;
