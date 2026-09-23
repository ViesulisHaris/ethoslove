import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import type { LegalDoc } from "@/content/legal";
import { LEGAL_ENTITY } from "@/content/legal";

/** `children` sits right under the intro: the one thing a page asks the reader to do (the withdraw button). */
export function LegalDocument({ doc, updatedLabel, locale = "en", children }: { doc: LegalDoc; updatedLabel: string; locale?: "en" | "es"; children?: ReactNode }) {
  const contents = locale === "es" ? "Contenido" : "Contents";
  const sections = (linkClass: string) => (
    <ol className="flex flex-col text-sm text-muted-foreground">
      {doc.sections.map((s, i) => (
        <li key={i}>
          <a href={`#s${i + 1}`} className={linkClass}>
            {s.heading}
          </a>
        </li>
      ))}
    </ol>
  );
  return (
    <div className="container-x grid gap-12 pt-14 pb-24 sm:pt-20 lg:grid-cols-[260px_1fr] lg:gap-20">
      {/*
       * The aside holds the title, the company and eighteen links: taller than a laptop's window. It
       * scrolls on its own so the last sections can be reached from anywhere in a 20,000px page;
       * a sticky box that can't scroll only shows its end once the article has.
       */}
      <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100dvh-7rem)] lg:self-start lg:overflow-y-auto lg:overscroll-contain">
        <p className="text-eyebrow text-coral">{updatedLabel}</p>
        <h1 className="display-lg mt-3">{doc.title}</h1>
        <div className="mt-8 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-ink">{LEGAL_ENTITY.name}</p>
          <p>{locale === "es" ? "N.º de registro" : "Reg. no."} {LEGAL_ENTITY.regNo}</p>
          <p>{locale === "es" ? "IVA" : "VAT"} {LEGAL_ENTITY.vat}</p>
          <p className="mt-2">{LEGAL_ENTITY.address}</p>
          <p className="mt-2">{LEGAL_ENTITY.email}</p>
        </div>
        {/*
         * Phones and tablets: the same list, folded, at the top. No script: <details> opens and
         * closes by itself, so the page stays a server component. Links are 44px for a thumb.
         */}
        <details className="group mt-8 rounded-2xl border border-border bg-card lg:hidden">
          <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
            {contents}
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-muted-foreground transition-transform group-open:rotate-180" />
          </summary>
          <nav aria-label={contents} className="border-t border-border px-4 py-1">
            {sections("flex min-h-11 items-center py-2 hover:text-ink")}
          </nav>
        </details>
        <nav className="mt-8 hidden lg:block" aria-label={contents}>
          {sections("block py-1.5 hover:text-ink")}
        </nav>
      </aside>
      <article className="max-w-2xl">
        <p className="text-lg leading-relaxed text-ink-soft">{doc.intro}</p>
        {children}
        {doc.sections.map((s, i) => (
          <section key={i} id={`s${i + 1}`} className="mt-10 scroll-mt-28">
            <h2 className="font-display text-2xl">{s.heading}</h2>
            {s.paragraphs.map((p, j) => (
              <p key={j} className="mt-3 leading-relaxed text-ink-soft">
                {p}
              </p>
            ))}
          </section>
        ))}
      </article>
    </div>
  );
}
