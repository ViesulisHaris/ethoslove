import { jsonLd } from "@/lib/seo";

/** Structured data for search engines and AI assistants: a plain script tag, as the Next.js JSON-LD guide recommends. */
export function JsonLd({ nodes }: { nodes: Record<string, unknown>[] }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd(nodes) }} />;
}
