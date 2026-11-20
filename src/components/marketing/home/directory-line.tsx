import { getTranslations } from "next-intl/server";
import { DIRECTORIES } from "@/config/directories";

/**
 * One quiet line under the home page's last section, in the footer's own colours so it reads as the
 * footer's first row: the directories that want a link back (config/directories.ts). The home page
 * only, because that is the address they check, and as small as the footer's smallest print but no
 * smaller: a directory looks for a link a person can see, and a link hidden from people is one
 * search engines count against the site. No nofollow either: a checker passes only a link it may follow.
 */
export async function DirectoryLine() {
  const t = await getTranslations("footer");
  return (
    <div data-app-hide className="bg-forest">
      <p data-testid="directory-links" className="container-x pt-3 text-[11px] text-cream/45">
        {t("directories")}{" "}
        {DIRECTORIES.map((directory, i) => (
          <span key={directory.href}>
            {i > 0 ? " · " : null}
            <a href={directory.href} target="_blank" rel="noopener" className="underline-offset-2 transition-colors duration-200 hover:text-cream hover:underline">
              {directory.name}
            </a>
          </span>
        ))}
      </p>
    </div>
  );
}
