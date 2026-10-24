import Image from "next/image";
import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { getManifest } from "@/templates/manifests";
import type { TemplateManifest } from "@/templates/types";

/** One gift idea: a template, and what it is for this person or this day. */
export type GiftIdea = { template: string; heading: string; body: string };

/** The ideas whose template still exists, each with its manifest. */
export function withManifests(ideas: readonly GiftIdea[]): (GiftIdea & { manifest: TemplateManifest })[] {
  return ideas.flatMap((idea) => {
    const manifest = getManifest(idea.template);
    return manifest ? [{ ...idea, manifest }] : [];
  });
}

/**
 * A numbered list of gift ideas, as on the gift-idea and occasion pages: the template's poster, what
 * it is for them, and a way into the editor. Two columns on a wide screen. Each idea is an h2 where the
 * list is the page, an h3 under a heading of its own.
 */
export async function GiftIdeaList({
  ideas,
  locale,
  heading: Heading = "h3",
  className,
}: {
  ideas: (GiftIdea & { manifest: TemplateManifest })[];
  locale: GiftLocale;
  heading?: "h2" | "h3";
  className?: string;
}) {
  const t = await getTranslations("recipients");
  return (
    <ol className={cn("grid gap-x-12 lg:grid-cols-2", className)}>
      {ideas.map((idea, i) => (
        <li key={idea.template} className="flex gap-5 border-b border-line py-7">
          <Link href={`/templates/${idea.template}`} className="shrink-0" tabIndex={-1} aria-hidden="true">
            <Image src={idea.manifest.thumbnail.poster} alt="" width={96} height={148} sizes="96px" className="h-[148px] w-24 rounded-xl bg-muted object-cover" />
          </Link>
          <div className="min-w-0">
            <p className="text-mono-meta text-muted-foreground">
              {String(i + 1).padStart(2, "0")} · {idea.manifest.name[locale]}
              {idea.manifest.tier === "free" ? ` · ${t("free")}` : null}
            </p>
            <Heading className="mt-2 font-display text-2xl leading-tight">
              <Link href={`/templates/${idea.template}`} className="transition-colors hover:text-coral">
                {idea.heading}
              </Link>
            </Heading>
            <p className="mt-2.5 leading-relaxed text-ink-soft">{idea.body}</p>
            <Link href={`/create/${idea.template}`} className="mt-3 inline-flex min-h-10 items-center gap-1.5 text-sm font-semibold text-coral underline-offset-4 hover:underline">
              {t("make")}
              <ArrowRight aria-hidden="true" className="size-4" />
            </Link>
          </div>
        </li>
      ))}
    </ol>
  );
}
