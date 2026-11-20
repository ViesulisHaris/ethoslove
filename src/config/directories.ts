/**
 * Directories that list Ethos for free only while tryethos.io links back to them (the owner's yes,
 * 20 Nov 2026). SaaSTool checks every so often that its link is still on the home page and takes
 * the listing down when it is not, so check the directory before taking a name out of this list.
 * The address is the one its badge code gives, to the letter: its checker looks for that.
 *
 * Not here on purpose: AlternativeTo asks for no link, and Fazier's free launch wants its own badge
 * image and three comments from the account, which is the owner's to decide.
 */
export const DIRECTORIES = [{ name: "SaaSTool", href: "https://saastool.site/item/ethos?utm_source=tryethos.io" }] as const;
