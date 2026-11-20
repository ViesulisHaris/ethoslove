import Image from "next/image";
import { ArrowRight, Play } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { getManifest } from "@/templates/manifests";
import type { TemplateManifest } from "@/templates/types";
import { sendsFree } from "@/lib/gift/free-tier";
import { fieldLimit } from "@/lib/gift/field-limit";

/**
 * A line to borrow: something to type into one of the template's own fields, short enough to fit
 * it. `field` is that field's key in the template's schema (or one every gift has: "message",
 * "caption", "title"), which is how tests/unit/gift-guides.test.ts proves the line fits.
 */
export type BorrowedLine = { field: string; where: string; text: string };

/** One gift idea: a template, and what it is for this person or this day. */
export type GiftIdea = { template: string; heading: string; body: string; line?: BorrowedLine };

/** The ideas whose template still exists, each with its manifest. */
export function withManifests<T extends GiftIdea>(ideas: readonly T[]): (T & { manifest: TemplateManifest })[] {
  return ideas.flatMap((idea) => {
    const manifest = getManifest(idea.template);
    return manifest ? [{ ...idea, manifest }] : [];
  });
}

/**
 * A numbered list of gift ideas, as on the gift-idea and occasion pages: the template's poster, what
 * it is for them, and a way into the editor. Two columns on a wide screen. Each idea is an h2 where the
 * list is the page, an h3 under a heading of its own.
 *
 * `watch` adds the way to see the template play first (its full-screen demo). `source` names the
 * page in the editor link's `?ref=`, so a sale can be traced to the page that sent it
 * (lib/attribution/ref.ts): lowercase letters, digits and hyphens.
 */
export async function GiftIdeaList({
  ideas,
  locale,
  heading: Heading = "h3",
  className,
  watch = false,
  source,
}: {
  ideas: (GiftIdea & { manifest: TemplateManifest })[];
  locale: GiftLocale;
  heading?: "h2" | "h3";
  className?: string;
  watch?: boolean;
  source?: string;
}) {
  const t = await getTranslations("recipients");
  const query = source ? `?ref=${source}` : "";
  // How long each borrowed line may be, from the template's own schema. A letter's 4,000 says nothing, so it is left out.
  const limits = await Promise.all(ideas.map((idea) => (idea.line && idea.line.field !== "message" ? fieldLimit(idea.template, idea.line.field) : null)));
  return (
    <ol className={cn("grid gap-x-12 lg:grid-cols-2", className)}>
      {ideas.map((idea, i) => (
        <li key={idea.template} className="flex gap-5 border-b border-line py-7">
          <Link href={`/templates/${idea.template}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
            {/* The link is hidden from screen readers (the name below is the real one), so this alt text is for image search alone. */}
            <Image src={idea.manifest.thumbnail.poster} alt={`${idea.manifest.name[locale]}: ${idea.manifest.tagline[locale]}`} width={96} height={148} sizes="96px" className="h-[148px] w-24 rounded-xl bg-muted object-cover" />
          </Link>
          <div className="min-w-0">
            <p className="text-mono-meta text-muted-foreground">
              {String(i + 1).padStart(2, "0")} · {idea.manifest.name[locale]}
              {sendsFree(idea.manifest) ? ` · ${t("free")}` : null}
            </p>
            <Heading className="mt-2 font-display text-2xl leading-tight">
              <Link href={`/templates/${idea.template}`} className="transition-colors hover:text-coral">
                {idea.heading}
              </Link>
            </Heading>
            <p className="mt-2.5 leading-relaxed text-ink-soft">{idea.body}</p>
            {idea.line ? (
              <figure className="mt-4 border-l-2 border-rose pl-3.5" data-testid="borrowed-line">
                <figcaption className="text-mono-meta text-muted-foreground">
                  {idea.line.where}
                  {limits[i] ? ` · ${t("upTo", { max: limits[i] })}` : null}
                </figcaption>
                <blockquote className="mt-1 font-display text-lg leading-snug text-ink italic">{idea.line.text}</blockquote>
              </figure>
            ) : null}
            <div className="mt-3 flex flex-wrap items-center gap-x-5">
              <Link
                href={`/create/${idea.template}${query}`}
                data-testid="idea-make"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-semibold text-coral underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 active:text-coral-deep"
              >
                {t("make")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
              {watch ? (
                <Link
                  href={`/demo/${idea.template}`}
                  data-testid="idea-watch"
                  aria-label={t("watchNamed", { name: idea.manifest.name[locale] })}
                  className="inline-flex min-h-11 items-center gap-1.5 rounded-sm text-sm font-medium text-ink-soft underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:ring-3 focus-visible:ring-ring/50 active:text-ink"
                >
                  <Play aria-hidden="true" className="size-3.5" />
                  {t("watch")}
                </Link>
              ) : null}
            </div>
          </div>
        </li>
      ))}
    </ol>
  );
}
