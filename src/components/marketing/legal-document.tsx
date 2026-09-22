import type { LegalDoc } from "@/content/legal";
import { LEGAL_ENTITY } from "@/content/legal";

export function LegalDocument({ doc, updatedLabel, locale = "en" }: { doc: LegalDoc; updatedLabel: string; locale?: "en" | "es" }) {
  return (
    <div className="container-x grid gap-12 pt-14 pb-24 sm:pt-20 lg:grid-cols-[260px_1fr] lg:gap-20">
      <aside className="lg:sticky lg:top-24 lg:self-start">
        <p className="text-eyebrow text-coral">{updatedLabel}</p>
        <h1 className="display-lg mt-3">{doc.title}</h1>
        <div className="mt-8 border-t border-border pt-5 text-xs leading-relaxed text-muted-foreground">
          <p className="font-medium text-ink">{LEGAL_ENTITY.name}</p>
          <p>{locale === "es" ? "N.º de registro" : "Reg. no."} {LEGAL_ENTITY.regNo}</p>
          <p>{locale === "es" ? "IVA" : "VAT"} {LEGAL_ENTITY.vat}</p>
          <p className="mt-2">{LEGAL_ENTITY.address}</p>
          <p className="mt-2">{LEGAL_ENTITY.email}</p>
        </div>
        <nav className="mt-8 hidden lg:block" aria-label="Sections">
          <ol className="flex flex-col text-sm text-muted-foreground">
            {doc.sections.map((s, i) => (
              <li key={i}>
                <a href={`#s${i + 1}`} className="block py-1.5 hover:text-ink">
                  {s.heading}
                </a>
              </li>
            ))}
          </ol>
        </nav>
      </aside>
      <article className="max-w-2xl">
        <p className="text-lg leading-relaxed text-ink-soft">{doc.intro}</p>
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
