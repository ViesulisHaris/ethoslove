import type { Metadata } from "next";
import { BRAND } from "@/config/brand";
import { SITE } from "@/config/site";
import { routing, type Locale } from "@/i18n/routing";
import { PRODUCTS, PRODUCT_ORDER, type Currency } from "@/lib/pricing/products";
import type { TemplateManifest } from "@/templates/types";

type Node = Record<string, unknown>;

/** Public URL of a site path in a locale: English at the root, Spanish under /es. */
export function localizedUrl(locale: string, path = "/"): string {
  const prefix = locale === routing.defaultLocale ? "" : `/${locale}`;
  return `${SITE.url}${prefix}${path === "/" ? "" : path}`;
}

/** Canonical and hreflang links for a page that exists in every locale, or only in `locales`. */
export function localeAlternates(locale: string, path: string, locales: readonly string[] = routing.locales): NonNullable<Metadata["alternates"]> {
  const languages: Record<string, string> = { "x-default": localizedUrl(routing.defaultLocale, path) };
  for (const l of locales) languages[l] = localizedUrl(l, path);
  return { canonical: localizedUrl(locale, path), languages };
}

/** The share card drawn by app/og.png, optionally for one template, or the front page's gift-led card. */
export function ogImageUrl(locale: string, templateSlug?: string, card?: "gift"): string {
  const params = new URLSearchParams({ locale });
  if (templateSlug) params.set("template", templateSlug);
  if (card) params.set("card", card);
  return `/og.png?${params}`;
}

/**
 * Title, description, canonical, hreflang and share cards for one marketing page. A page that sets
 * openGraph replaces the layout's wholesale, so everything a card needs is set here.
 */
export function pageMetadata({
  locale,
  path,
  title,
  description,
  image,
  absoluteTitle = false,
  locales,
  article,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
  image?: string;
  absoluteTitle?: boolean;
  /** The locales the page exists in, when not all of them (a blog post not yet in Spanish). */
  locales?: readonly string[];
  /** An article's dates; they also make the share card an article rather than a website. */
  article?: { publishedTime: string; modifiedTime: string };
}): Metadata {
  // Search results show about seventy characters of a title; past that, the brand is what goes.
  const branded = `${title} · ${SITE.name}`;
  const bare = absoluteTitle || branded.length > 70;
  const shareTitle = bare ? title : branded;
  const card = { url: image ?? ogImageUrl(locale), width: 1200, height: 630, alt: shareTitle };
  const share = {
    siteName: SITE.name,
    locale: locale === "es" ? "es_ES" : "en_US",
    url: localizedUrl(locale, path),
    title: shareTitle,
    description,
    images: [card],
  };
  return {
    title: bare ? { absolute: title } : title,
    description,
    alternates: localeAlternates(locale, path, locales),
    openGraph: article ? { ...share, type: "article", ...article } : { ...share, type: "website" },
    twitter: { card: "summary_large_image", site: SITE.twitterHandle, title: shareTitle, description, images: [card.url] },
  };
}

/**
 * A page's metadata with a shared link's preview on it (lib/share/links.ts): its own title and the
 * card drawn from the link's photograph, on og and twitter alike. og:url keeps the preview's query,
 * or Facebook and those that follow it would fetch the bare page and show its default card. The
 * page's title, canonical and robots stay as they were: this is what a chat shows, nothing more.
 */
export function withSharePreview(base: Metadata, { url, title, description, image, alt }: { url: string; title: string; description: string; image: string; alt: string }): Metadata {
  const card = { url: image, width: 1200, height: 630, type: "image/jpeg", alt };
  return {
    ...base,
    openGraph: { ...base.openGraph, url, title, description, images: [card] },
    twitter: { card: "summary_large_image", site: SITE.twitterHandle, title, description, images: [card] },
  };
}

/** JSON-LD for a <script type="application/ld+json">. "<" is escaped so no string can close the tag. */
export function jsonLd(nodes: Node[]): string {
  return JSON.stringify({ "@context": "https://schema.org", "@graph": nodes }).replace(/</g, "\\u003c");
}

const ORGANIZATION_ID = `${SITE.url}/#organization`;
const price = (minor: number) => (minor / 100).toFixed(2);

/**
 * The countries a merchant listing names for delivery and returns. Ethos sells wherever a card
 * works; Google wants countries listed (up to 50), so these are the markets search traffic comes
 * from (Search Console, Oct 2026) and the ones the site's two languages serve.
 */
const SELLING_COUNTRIES = ["US", "GB", "CA", "AU", "NZ", "IE", "IN", "PH", "SG", "ZA", "DE", "FR", "ES", "IT", "NL", "BE", "AT", "CH", "PT", "SE", "DK", "NO", "FI", "PL", "RO", "LV", "LT", "EE", "MX", "AR", "CO", "CL", "PE"];

/**
 * A template is digital content, supplied the moment it is paid for and kept for good: no returns
 * (the buyer agrees at checkout that supply starts at once, Terms §9). Faults are still refunded
 * under §10; that is a guarantee, not a return.
 */
const NO_RETURNS: Node = {
  "@type": "MerchantReturnPolicy",
  applicableCountry: SELLING_COUNTRIES,
  returnPolicyCategory: "https://schema.org/MerchantReturnNotPermitted",
};

/** Nothing ships: it arrives on the buyer's account at once, at no cost. */
function instantDelivery(currency: string): Node {
  const days = { "@type": "QuantitativeValue", minValue: 0, maxValue: 0, unitCode: "DAY" };
  return {
    "@type": "OfferShippingDetails",
    shippingRate: { "@type": "MonetaryAmount", value: 0, currency },
    shippingDestination: SELLING_COUNTRIES.map((country) => ({ "@type": "DefinedRegion", addressCountry: country })),
    deliveryTime: { "@type": "ShippingDeliveryTime", handlingTime: days, transitTime: days },
  };
}

export function organizationNode(): Node {
  return {
    "@type": "Organization",
    "@id": ORGANIZATION_ID,
    name: BRAND.name,
    alternateName: BRAND.legalName,
    url: SITE.url,
    logo: `${SITE.url}/icons/icon-512.png`,
    email: BRAND.supportEmail,
    sameAs: Object.values(BRAND.socials),
    hasMerchantReturnPolicy: NO_RETURNS,
  };
}

export function websiteNode(): Node {
  return {
    "@type": "WebSite",
    "@id": `${SITE.url}/#website`,
    url: SITE.url,
    name: BRAND.name,
    inLanguage: [...routing.locales],
    publisher: { "@id": ORGANIZATION_ID },
  };
}

/**
 * Ethos itself: a web app that is free to start, with one-time purchases, priced in the currency the
 * page shows (its [currency] segment), so what a search result quotes is what the page says.
 */
export function appNode(locale: Locale, shown: Currency, description: string, planNames: Record<"free" | (typeof PRODUCT_ORDER)[number], string>): Node {
  const currency = shown.toUpperCase();
  return {
    "@type": "WebApplication",
    "@id": `${SITE.url}/#app`,
    name: BRAND.name,
    url: localizedUrl(locale),
    description,
    applicationCategory: "LifestyleApplication",
    operatingSystem: "Any",
    browserRequirements: "Requires a modern web browser",
    inLanguage: [...routing.locales],
    publisher: { "@id": ORGANIZATION_ID },
    offers: [
      { "@type": "Offer", name: planNames.free, price: "0", priceCurrency: currency },
      ...PRODUCT_ORDER.map((id) => ({
        "@type": "Offer",
        name: planNames[id],
        price: price(PRODUCTS[id].amounts[shown]),
        priceCurrency: currency,
        url: localizedUrl(locale, "/pricing"),
      })),
    ],
  };
}

/** A template as a product: what it is, what it looks like, and what it costs to send one, in the page's currency. */
export function templateProductNode(manifest: TemplateManifest, locale: Locale, currency: Currency, category: string): Node {
  const url = localizedUrl(locale, `/templates/${manifest.slug}`);
  return {
    "@type": "Product",
    "@id": `${url}#product`,
    name: manifest.name[locale],
    description: manifest.description[locale],
    image: `${SITE.url}${manifest.thumbnail.poster}`,
    category,
    brand: { "@type": "Brand", name: BRAND.name },
    url,
    offers: {
      "@type": "Offer",
      price: manifest.tier === "free" ? "0" : price(PRODUCTS.single.amounts[currency]),
      priceCurrency: currency.toUpperCase(),
      availability: "https://schema.org/InStock",
      url,
      shippingDetails: instantDelivery(currency.toUpperCase()),
      hasMerchantReturnPolicy: NO_RETURNS,
    },
  };
}

export function breadcrumbNode(items: { name: string; url: string }[]): Node {
  return {
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, i) => ({ "@type": "ListItem", position: i + 1, name: item.name, item: item.url })),
  };
}

export function templateListNode(manifests: readonly TemplateManifest[], locale: Locale, name: string): Node {
  return {
    "@type": "ItemList",
    name,
    itemListElement: manifests.map((m, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: m.name[locale],
      url: localizedUrl(locale, `/templates/${m.slug}`),
    })),
  };
}

/** A blog post, written and published by Ethos. */
export function blogPostingNode({
  locale,
  path,
  title,
  description,
  keyword,
  published,
  modified,
  image,
}: {
  locale: string;
  path: string;
  title: string;
  description: string;
  keyword: string;
  published: string;
  modified: string;
  image: string;
}): Node {
  const url = localizedUrl(locale, path);
  return {
    "@type": "BlogPosting",
    "@id": `${url}#article`,
    headline: title,
    description,
    keywords: keyword,
    inLanguage: locale,
    url,
    mainEntityOfPage: url,
    datePublished: published,
    dateModified: modified,
    image: image.startsWith("http") ? image : `${SITE.url}${image}`,
    author: { "@id": ORGANIZATION_ID },
    publisher: { "@id": ORGANIZATION_ID },
    isPartOf: { "@id": `${localizedUrl(locale, "/blog")}#blog` },
  };
}

/** /blog itself, with its posts. */
export function blogNode(locale: string, name: string, posts: { title: string; path: string; published: string }[]): Node {
  return {
    "@type": "Blog",
    "@id": `${localizedUrl(locale, "/blog")}#blog`,
    name,
    url: localizedUrl(locale, "/blog"),
    inLanguage: locale,
    publisher: { "@id": ORGANIZATION_ID },
    blogPost: posts.map((p) => ({ "@type": "BlogPosting", headline: p.title, url: localizedUrl(locale, p.path), datePublished: p.published })),
  };
}

export function faqNode(faq: { q: string; a: string }[]): Node {
  return {
    "@type": "FAQPage",
    mainEntity: faq.map(({ q, a }) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })),
  };
}
