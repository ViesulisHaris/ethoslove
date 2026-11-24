import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { PrintCard } from "@/components/dashboard/print-card";
import type { QrDesign } from "@/lib/qr/compose";

const design: QrDesign = { dots: "rounded", colour: "#d6336c", gradient: false, centre: "logo", photo: "", size: "m", label: "" };
const props = { url: "https://tryethos.io/g/abc123xyz", recipientName: "Mia", senderName: "Leo", accent: "#d6336c", brand: "Ethos", design, photoUrl: null };

/**
 * The print card as it printed before the Tree Tag was added beside it, held to the character: the
 * snapshot files were written from the component before the tag's edit (growth/tag, step 2).
 */
describe("the print card", () => {
  it("prints exactly as it did, in English", async () => {
    await expect(renderToStaticMarkup(<PrintCard {...props} locale="en" />)).toMatchFileSnapshot("./__snapshots__/print-card.en.html");
  });

  it("prints exactly as it did, in Spanish", async () => {
    await expect(renderToStaticMarkup(<PrintCard {...props} locale="es" />)).toMatchFileSnapshot("./__snapshots__/print-card.es.html");
  });

  it("is still what it draws when the shape is asked for by name", async () => {
    await expect(renderToStaticMarkup(<PrintCard {...props} locale="en" shape="card" />)).toMatchFileSnapshot("./__snapshots__/print-card.en.html");
  });
});

describe("The Tree Tag sheet", () => {
  const tag = (locale: "en" | "es", senderName = "Leo") => renderToStaticMarkup(<PrintCard {...props} senderName={senderName} locale={locale} shape="tree-tag" />);

  it("cannot be printed before the code is drawn, and says it is drawing it", () => {
    const html = tag("en");
    expect(html).toMatch(/<button type="button" disabled="" aria-busy="true">.*Drawing the code…<\/button>/);
    expect(html).not.toContain("Print The Tree Tag");
  });

  it("is named for screen readers, which read one tag and not four", () => {
    const html = tag("en");
    expect(html).toContain('<h1 class="sr-only">The Tree Tag</h1>');
    expect(html.match(/data-testid="tree-tag"/g)).toHaveLength(4);
    expect(html.match(/data-testid="tree-tag" aria-hidden="true"/g)).toHaveLength(3);
  });

  it("keeps a right-to-left sender apart from the word before it", () => {
    // The line runs right to left for such a sender, so "from" is read first; a Latin sender's line is untouched.
    expect(tag("en", "ليلى")).toContain('<span dir="rtl">from <bdi>ليلى</bdi></span>');
    expect(tag("en", "יעל ודני")).toContain('<span dir="rtl">from <bdi>יעל ודני</bdi></span>');
    expect(tag("es")).toContain("<span>de <bdi>Leo</bdi></span>");
    expect(tag("en", "美咲")).toContain("<span>from <bdi>美咲</bdi></span>");
  });

  it("says the line under the code in one voice in both languages, and the hint speaks of four tags", () => {
    expect(tag("es")).toContain("Escanear la mañana de Navidad");
    expect(tag("es")).not.toContain("Escanéame");
    expect(tag("en")).toContain("punch the holes, and tie them to the tree.");
    expect(tag("es")).toContain("perfora los agujeros y átalas al árbol.");
  });
});
