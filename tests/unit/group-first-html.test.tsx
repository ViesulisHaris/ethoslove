/**
 * The page at a group card's link as the server sends it, which is all there is of it until its
 * script has arrived (seconds on a bad connection, for ever where a script is blocked or switched
 * off). In that state a tap on "Add my note" used to be the browser's own submit: a GET of the page
 * with the name, the note and the email address in its address, and nothing sent. These read the
 * first HTML for what keeps that from happening, and for what else that HTML used to get wrong.
 */
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { ContributeForm, type ContributeState } from "@/components/group/contribute-form";
import { isolated } from "@/lib/group/bidi";
import { cleanText } from "@/lib/group/clean";

const page = (over: { state?: ContributeState; locale?: "en" | "es"; fromName?: string; forName?: string; takesPhotos?: boolean } = {}) =>
  renderToStaticMarkup(<ContributeForm token="previewPreviewPreview0" state={over.state ?? "open"} locale={over.locale ?? "en"} fromName={over.fromName ?? "Tom"} forName={over.forName ?? "Nora"} prompt="One line that only you would know." noteMax={140} takesPhotos={over.takesPhotos ?? true} reportRef="prev1ew0" />);
const tag = (html: string, testid: string) => new RegExp(`<[a-z0-9]+\\b[^>]*data-testid="${testid}"[^>]*>`).exec(html)?.[0] ?? "";

describe("the form before the page's script runs", () => {
  const html = page();

  it("can't be sent by the browser itself: it is a POST, and its button is not live yet", () => {
    const form = tag(html, "contribute-form");
    expect(form).toContain('method="post"');
    // No action: a POST nobody handles, to this same page, with nothing in its address.
    expect(form).not.toContain("action=");
    const button = tag(html, "contribute-submit");
    expect(button).toContain('type="submit"');
    expect(button).toMatch(/\sdisabled=""/);
    // A form whose only submit button is switched off is not submitted by Enter in a field either.
    expect(html.match(/type="submit"/g)).toHaveLength(1);
  });

  it("still takes typing in every field from the first frame", () => {
    for (const id of ["contribute-name", "contribute-note", "contribute-email", "contribute-wants-email", "contribute-agree"]) {
      expect(tag(html, id), id).not.toBe("");
      expect(tag(html, id), id).not.toMatch(/\sdisabled|\sreadonly/i);
    }
  });

  it("says what to do where no script will ever run", () => {
    expect(html).toMatch(/<noscript><p[^>]*data-testid="contribute-needs-script"[^>]*>This page needs JavaScript to add your note\. Turn it on and reload\.<\/p><\/noscript>/);
    expect(page({ locale: "es" })).toContain("Esta página necesita JavaScript para añadir tu nota. Actívalo y vuelve a cargarla.");
  });

  it("shows the address field off the tick itself, by the stylesheet, and counts nothing it can't count", () => {
    // The box's label is what the address part looks at (`peer` … `peer-has-checked`).
    expect(/<label class="peer [^"]*"><input type="checkbox"[^>]*name="wantsEmail"/.test(html)).toBe(true);
    expect(tag(html, "contribute-email-part")).toMatch(/class="[^"]*\bhidden peer-has-checked:block\b/);
    // "0 of 140" under a note already half typed was a lie: the count is not shown until it can be right.
    expect(tag(html, "contribute-count")).toMatch(/class="[^"]*\binvisible\b/);
  });

  it("draws its round mark in the HTML itself: nothing waits, unseen, for a script to show it", () => {
    const mark = tag(html, "contribute-mark");
    expect(mark).not.toBe("");
    expect(mark).not.toMatch(/style=|opacity/);
    expect(html).not.toMatch(/opacity:\s*0/);
  });

  it("no field is set smaller than 16 px, which is what makes an iPhone zoom the page", () => {
    for (const id of ["contribute-name", "contribute-note", "contribute-email"]) {
      expect(tag(html, id), id).toMatch(/class="[^"]*\btext-base\b/);
      expect(tag(html, id), id).not.toMatch(/text-\[1[0-5]px\]|\btext-sm\b|\btext-xs\b/);
    }
  });

  it("each field that takes a name or a note starts from the side its script starts from", () => {
    for (const id of ["contribute-name", "contribute-note", "contribute-prompt"]) expect(tag(html, id), id).toContain('dir="auto"');
    expect(tag(html, "contribute-email")).not.toContain("dir=");
  });
});

describe("the ends a link comes to", () => {
  it("each heading can take the focus and is in a region that is read out when it arrives", () => {
    for (const state of ["full", "closed", "expired", "sent"] as const) {
      const html = page({ state });
      expect(html, state).toMatch(/<div role="status"><h1 tabindex="-1"[^>]*data-testid="contribute-ended"/);
      // No form, and nothing to send.
      expect(html, state).not.toContain("<form");
    }
  });
});

describe("a name written right to left, inside a sentence that is not", () => {
  it("is kept to itself, and a name in any other script is not touched", () => {
    expect(isolated("Tom")).toBe("Tom");
    expect(isolated("Los García")).toBe("Los García");
    expect(isolated("田中")).toBe("田中");
    expect(isolated("محمد")).toBe("⁨محمد⁩");
    expect(isolated("נועה")).toBe("⁨נועה⁩");
    expect(isolated("DJ محمد")).toBe("⁨DJ محمد⁩");
  });

  it("only as it is drawn: what is stored never holds the marks", () => {
    expect(cleanText(isolated("محمد"))).toBe("محمد");
    const html = page({ fromName: "محمد", forName: "נועה" });
    expect(html).toContain("Add your note for ⁨נועה⁩");
    expect(html).toContain("⁨محمد⁩ is putting a group card together.");
    // Latin names: not a character more than before.
    expect(page()).toContain("Add your note for Nora<");
  });
});
