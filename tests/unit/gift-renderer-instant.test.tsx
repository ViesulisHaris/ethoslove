import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { GiftRenderer } from "@/templates/_shared/GiftRenderer";
import { loadTemplate, loadedTemplate } from "@/templates/registry";

/** The gift's loading screen: the layer it draws over everything, until the template is in hand. */
const LOADING_SCREEN = "z-[60]";

describe("a template the tab has already loaded", () => {
  it("is known from the moment it has loaded, and not before", async () => {
    expect(loadedTemplate("bouquet")).toBeNull();
    const mod = await loadTemplate("bouquet");
    expect(mod).not.toBeNull();
    expect(loadedTemplate("bouquet")).toBe(mod);
    expect(loadedTemplate("no-such-template")).toBeNull();
  });

  it("the editor's phone preview (instant) opens on the gift itself; every other renderer still starts on the loading screen", async () => {
    const mod = await loadTemplate("the-letter");
    const data = { ...mod!.demoData.en, recipientName: "Ana", senderName: "Leo" };
    const instant = renderToStaticMarkup(<GiftRenderer slug="the-letter" data={data} mode="preview" instant />);
    const usual = renderToStaticMarkup(<GiftRenderer slug="the-letter" data={data} mode="preview" />);
    expect(instant).not.toContain(LOADING_SCREEN);
    expect(instant).toContain("Ana");
    expect(usual).toContain(LOADING_SCREEN);
  });

  it("instant changes nothing for a template the tab hasn't loaded: it waits behind the loading screen like any other", () => {
    const html = renderToStaticMarkup(<GiftRenderer slug="nice-list" data={null} mode="preview" instant />);
    expect(loadedTemplate("nice-list")).toBeNull();
    expect(html).toContain(LOADING_SCREEN);
  });
});
