import Image from "next/image";
import { getFormatter, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { postContent } from "@/content/blog";
import { readingMinutes } from "@/content/blog/text";
import type { BlogPost } from "@/content/blog/types";
import { getManifest } from "@/templates/manifests";

/** A post in a list: the poster of the template it leads with, its date, title and description. */
export async function PostCard({ post, locale }: { post: BlogPost; locale: string }) {
  const t = await getTranslations("blog");
  const format = await getFormatter();
  const { content, locale: contentLocale } = postContent(post, locale);
  const manifest = getManifest(post.templates[0] ?? "");
  return (
    <article className="group relative flex gap-5 rounded-[26px] border border-line bg-card p-4 transition-colors hover:border-ink/30">
      {manifest ? (
        <div className="relative aspect-[390/600] w-20 shrink-0 overflow-hidden rounded-2xl bg-ink/10">
          <Image src={manifest.thumbnail.poster} alt={manifest.tagline[contentLocale]} fill sizes="80px" quality={60} className="object-cover" />
        </div>
      ) : null}
      <div className="flex min-w-0 flex-col">
        <p className="text-mono-meta text-ink-soft">
          <time dateTime={post.published}>{format.dateTime(new Date(`${post.published}T12:00:00Z`), { dateStyle: "medium" })}</time>
          {" · "}
          {t("minutes", { minutes: readingMinutes(content) })}
        </p>
        <h3 className="font-display mt-1.5 text-xl leading-snug text-balance">
          {/* The whole card is the link, through the title's ::after. */}
          <Link href={`/blog/${post.slug}`} className="after:absolute after:inset-0 group-hover:text-coral">
            {content.title}
          </Link>
        </h3>
        <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-ink-soft">{content.description}</p>
      </div>
    </article>
  );
}
