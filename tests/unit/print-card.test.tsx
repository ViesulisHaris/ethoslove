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
