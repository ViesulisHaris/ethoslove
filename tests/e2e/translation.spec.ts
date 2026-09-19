import { expect, test } from "@playwright/test";

/**
 * People who don't read English use the site through their browser's translator, and it rewrites
 * the page under React: a Romanian customer's editor crashed again and again (error WAAC4V) and
 * their own words came back reworded in the preview. This does to the page what Chrome's
 * "Translate this page" does — every text node is swapped for a <font> holding the translation,
 * translate="no" is respected, text that appears later is translated too — with a "ro·" prefix
 * standing in for the translation, so a test can see exactly what was touched.
 */
const TRANSLATOR = `(() => {
  const skip = (node) => {
    for (let el = node.parentElement; el; el = el.parentElement) {
      if (el.getAttribute("translate") === "no" || el.classList.contains("notranslate")) return true;
      if (["SCRIPT", "STYLE", "TEXTAREA", "TITLE"].includes(el.tagName) || el.dataset.sim) return true;
    }
    return false;
  };
  const swap = (t) => {
    if (!t.parentNode || !/\\p{L}/u.test(t.nodeValue || "") || skip(t)) return;
    const font = document.createElement("font");
    font.dataset.sim = "1";
    font.textContent = t.nodeValue.replace(/\\p{L}+/gu, (w) => "ro·" + w);
    t.parentNode.replaceChild(font, t);
  };
  const walk = (root) => {
    if (root.nodeType === 3) return swap(root);
    const w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const all = [];
    while (w.nextNode()) all.push(w.currentNode);
    all.forEach(swap);
  };
  // Started by the test once the page is interactive, the way Chrome offers to translate a page
  // someone is already reading.
  window.__translate = () => {
    walk(document.body);
    let pending = [];
    new MutationObserver((ms) => {
      for (const m of ms) {
        if (m.type === "characterData") pending.push(m.target);
        for (const n of m.addedNodes) if (!(n.dataset && n.dataset.sim)) pending.push(n);
      }
      setTimeout(() => { const now = pending; pending = []; now.forEach((n) => n.isConnected && walk(n)); }, 100);
    }).observe(document.body, { childList: true, subtree: true, characterData: true });
  };
})();`;

type Translating = { __translate: () => void };

test.describe("a page the browser is translating", () => {
  test.beforeEach(async ({ page }) => {
    await page.addInitScript(TRANSLATOR);
  });

  test("the editor keeps working, and the preview keeps the sender's words as written", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (e) => errors.push(`${e.name}: ${e.message}`));
    await page.goto("/create/the-letter");
    // The form answers typing only once React has taken over the page; then translate it.
    await page.locator("#recipientName").fill("I");
    await expect(page.locator("#recipientName")).toHaveValue("I");
    await page.evaluate(() => (window as unknown as Translating).__translate());

    // Typed a letter at a time, so React and the translator take turns with the same nodes.
    await page.locator("#recipientName").pressSequentially("oana", { delay: 30 });
    await page.locator("#senderName").pressSequentially("Mihai", { delay: 30 });
    await page.locator("#message").pressSequentially("Îți mulțumesc pentru tot.", { delay: 15 });
    await page.locator("#message").press("Home");
    await page.locator("#message").press("Enter");
    await page.locator("#message").pressSequentially("Dragă mamă,", { delay: 15 });

    // The editor's own words were translated: the translator really ran.
    await expect(page.getByText(/ro·/).first()).toBeAttached();
    // On a phone the preview is its own tab.
    const previewTab = page.getByRole("tab").nth(1);
    if (await previewTab.isVisible()) await previewTab.click();

    const gift = page.locator(".gift-root").first();
    await expect(gift).toHaveAttribute("translate", "no");
    await expect(gift).toContainText("Îți mulțumesc pentru tot.");
    await expect(gift).toContainText("Ioana");
    await expect(gift).not.toContainText("ro·");
    await expect(page.getByText(/Error code/)).toHaveCount(0);
    expect(errors).toEqual([]);
  });

  test("a translated page can't make React throw", async ({ page }) => {
    await page.goto("/pricing");
    // The app installs its guard as it starts (src/lib/dom/survive-translation.ts).
    await page.waitForFunction(() => (Node.prototype as unknown as { __survivesTranslation?: boolean }).__survivesTranslation === true);
    // What the crash was: React inserting before, or removing, a text node the translator had
    // already swapped out of the page.
    const result = await page.evaluate(() => {
      const box = document.createElement("p");
      const label = document.createTextNode("Unlock everything");
      box.appendChild(label);
      document.body.appendChild(box);
      const font = document.createElement("font");
      box.replaceChild(font, label);
      try {
        box.insertBefore(document.createElement("svg"), label);
        box.removeChild(label);
        return "ok";
      } catch (e) {
        return String(e);
      } finally {
        box.remove();
      }
    });
    expect(result).toBe("ok");
  });
});
