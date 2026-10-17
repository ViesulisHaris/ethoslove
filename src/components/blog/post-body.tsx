import Image from "next/image";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import type { BlogBlock } from "@/content/blog/types";
import { getManifest } from "@/templates/manifests";
import { RichText } from "./rich-text";

/** The body of a post, block by block, in the site's editorial type. */
export async function PostBody({ blocks, locale }: { blocks: readonly BlogBlock[]; locale: GiftLocale }) {
  const t = await getTranslations("blog");
  return (
    <div className="flex flex-col">
      {blocks.map((block, i) => {
        switch (block.type) {
          case "p":
            return (
              <p key={i} className="mt-5 text-[17px] leading-relaxed text-ink-soft">
                <RichText text={block.text} />
              </p>
            );
          case "h2":
            return (
              <h2 key={i} className="display-md mt-14 text-balance">
                {block.text}
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="font-display mt-9 text-2xl leading-snug">
                {block.text}
              </h3>
            );
          case "list": {
            const Tag = block.ordered ? "ol" : "ul";
            return (
              <Tag key={i} className={`mt-5 flex flex-col gap-3 pl-6 text-[17px] leading-relaxed text-ink-soft ${block.ordered ? "list-decimal" : "list-disc"} marker:text-coral`}>
                {block.items.map((item, j) => (
                  <li key={j} className="pl-1">
                    <RichText text={item} />
                  </li>
                ))}
              </Tag>
            );
          }
          case "quote":
            return (
              <figure key={i} className="mt-7 border-l-2 border-coral pl-5">
                <blockquote className="font-display text-xl leading-snug text-ink italic">
                  <RichText text={block.text} />
                </blockquote>
                {block.cite ? <figcaption className="text-mono-meta mt-2 text-ink-soft">{block.cite}</figcaption> : null}
              </figure>
            );
          case "tip":
            return (
              <aside key={i} className="mt-8 rounded-2xl border border-line bg-cream/60 px-6 py-5">
                <p className="text-eyebrow text-coral">{block.title}</p>
                <p className="mt-2 leading-relaxed text-ink-soft">
                  <RichText text={block.text} />
                </p>
              </aside>
            );
          case "template": {
            const manifest = getManifest(block.slug);
            if (!manifest) return null;
            return (
              // Under 360 px the text beside the poster had 132 px: there the poster goes on top.
              <aside key={i} className="mt-9 flex gap-5 rounded-[26px] border border-line bg-card p-4 shadow-soft max-[360px]:flex-col max-[360px]:gap-4 sm:gap-6 sm:p-5">
                {/* self-start: stretched to the row's height, the poster lost its shape and showed a sliver. */}
                <Link href={`/templates/${manifest.slug}`} data-testid="blog-template-poster" className="relative aspect-[390/600] w-24 shrink-0 self-start overflow-hidden rounded-2xl bg-ink/10 sm:w-32">
                  <Image src={manifest.thumbnail.poster} alt={manifest.tagline[locale]} fill sizes="128px" quality={75} className="object-cover" />
                </Link>
                <div className="flex min-w-0 flex-col justify-center">
                  <p className="text-eyebrow text-ink-soft">{manifest.tier === "free" ? t("templateFree") : t("templatePremium")}</p>
                  <p className="font-display mt-1.5 text-2xl leading-tight">{manifest.name[locale]}</p>
                  <p className="mt-2 text-[15px] leading-relaxed text-ink-soft">
                    <RichText text={block.note} />
                  </p>
                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Link href={`/create/${manifest.slug}`} className="inline-flex h-10 items-center gap-1.5 rounded-full bg-forest px-4 text-sm font-medium text-cream transition-colors hover:bg-forest-raised">
                      {t("makeThis")}
                      <ArrowRight className="size-3.5" />
                    </Link>
                    <Link href={`/templates/${manifest.slug}`} className="inline-flex min-h-10 items-center gap-1 text-sm font-medium text-ink-soft underline-offset-4 hover:text-ink hover:underline">
                      {t("seeIt")}
                      <ArrowUpRight className="size-3.5" />
                    </Link>
                  </div>
                </div>
              </aside>
            );
          }
          case "image":
            return (
              <figure key={i} className="mt-9">
                <Image src={block.src} alt={block.alt} width={block.width} height={block.height} sizes="(min-width: 768px) 720px, 100vw" quality={75} className="h-auto w-full rounded-2xl" />
                {block.caption ? <figcaption className="mt-2.5 text-sm text-ink-soft">{block.caption}</figcaption> : null}
              </figure>
            );
          case "table": {
            // Three columns or more don't fit a phone: the last one was cut off, with nothing to say
            // the table scrolls. There each row is a card instead, every cell under its column's
            // name. The roles keep it a table for screen readers, which drop a table's meaning once
            // its rows are restyled as blocks.
            const cards = block.head.length > 2;
            return (
              <div key={i} className={`mt-8 overflow-x-auto rounded-2xl border border-line ${cards ? "max-sm:overflow-visible max-sm:rounded-none max-sm:border-0" : ""}`}>
                <table role="table" className="w-full border-collapse text-left text-[15px]">
                  <thead role="rowgroup" className={`bg-cream/70 ${cards ? "max-sm:sr-only" : ""}`}>
                    <tr role="row">
                      {block.head.map((h, j) => (
                        <th key={j} role="columnheader" scope="col" className="px-4 py-3 font-semibold text-ink">
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody role="rowgroup" className={cards ? "max-sm:flex max-sm:flex-col max-sm:gap-3" : ""}>
                    {block.rows.map((row, j) => (
                      <tr key={j} role="row" className={`border-t border-line align-top ${cards ? "max-sm:block max-sm:rounded-2xl max-sm:border max-sm:bg-card max-sm:px-4 max-sm:py-2" : ""}`}>
                        {row.map((cell, k) => (
                          <td
                            key={k}
                            role="cell"
                            data-label={block.head[k]}
                            className={`px-4 py-3 leading-relaxed text-ink-soft ${cards ? "max-sm:block max-sm:px-0 max-sm:py-1.5 max-sm:before:mb-0.5 max-sm:before:block max-sm:before:text-eyebrow max-sm:before:text-ink max-sm:before:content-[attr(data-label)]" : ""}`}
                          >
                            <RichText text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }
        }
      })}
    </div>
  );
}
