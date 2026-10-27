import Image from "next/image";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { GiftLocale } from "@/lib/gift/schema";
import { DIGITAL_GIFT_GUIDE } from "@/content/digital-gifts";
import { RECIPIENTS, RECIPIENT_GUIDES, recipientSlug } from "@/content/recipients";
import { templateSeo } from "@/content/template-seo";
import { getManifest } from "@/templates/manifests";

/**
 * On /gifts, after the occasions: what a digital gift is, thirty ideas grouped the way people shop
 * for them (every one a template, linked by the words people search it by), and the gift-idea
 * pages by person. The answer to "digital gift" and to "digital gift ideas" in one place.
 */
export async function DigitalGiftGuideSection({ locale }: { locale: GiftLocale }) {
  const t = await getTranslations("recipients");
  const guide = DIGITAL_GIFT_GUIDE[locale];
  return (
    <section className="border-b border-line py-20 lg:py-28" aria-labelledby="what-is-a-digital-gift">
      <div className="container-x grid gap-10 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <p className="text-eyebrow text-ink-soft">{guide.eyebrow}</p>
          <h2 id="what-is-a-digital-gift" className="display-xl mt-4 max-w-[7.2em]">
            {guide.title}
          </h2>
        </div>
        <div className="flex flex-col gap-5 text-lg leading-relaxed lg:col-span-7">
          <p>{guide.definition}</p>
          <p className="text-ink-soft">{guide.notACard}</p>
        </div>
      </div>

      <div className="container-x mt-20">
        <h2 className="display-md">{guide.ideasTitle}</h2>
        <p className="mt-3 max-w-xl text-ink-soft">{guide.ideasLead}</p>
        <div className="mt-10 flex flex-col gap-12">
          {guide.groups.map((group) => (
            <div key={group.title}>
              <h3 className="text-eyebrow text-ink-soft">{group.title}</h3>
              <ul className="mt-4 grid border-t border-line sm:grid-cols-2 sm:gap-x-8 lg:grid-cols-3">
                {group.templates.map((slug) => {
                  const manifest = getManifest(slug);
                  if (!manifest) return null;
                  return (
                    <li key={slug} className="border-b border-line">
                      <Link href={`/templates/${slug}`} className="group flex items-center gap-4 py-4">
                        <Image
                          src={manifest.thumbnail.poster}
                          alt=""
                          width={48}
                          height={74}
                          sizes="48px"
                          className="h-[74px] w-12 shrink-0 rounded-lg bg-muted object-cover"
                        />
                        <span className="min-w-0">
                          <span className="block font-display text-xl leading-tight transition-colors group-hover:text-coral">
                            {templateSeo(slug, locale)?.keyword ?? manifest.name[locale]}
                          </span>
                          <span className="mt-1 block text-sm leading-snug text-ink-soft">{manifest.tagline[locale]}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <h2 className="display-md mt-20">{guide.byWho}</h2>
        <ul className="mt-5 flex flex-wrap gap-2">
          {RECIPIENTS.map((r) => (
            <li key={r}>
              <Link
                href={`/gifts/${recipientSlug(r)}`}
                className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-ink/40"
              >
                {RECIPIENT_GUIDES[r][locale].label}
              </Link>
            </li>
          ))}
          <li>
            <Link
              href="/occasions"
              className="inline-flex min-h-10 items-center rounded-full border border-border bg-card px-3.5 py-1.5 text-sm transition-colors hover:border-ink/40"
            >
              {t("occasions")}
            </Link>
          </li>
        </ul>
      </div>
    </section>
  );
}
