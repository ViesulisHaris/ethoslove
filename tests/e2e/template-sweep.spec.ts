import { existsSync, readdirSync } from "node:fs";
import { expect, test, type Locator, type Page } from "@playwright/test";

/**
 * The template sweep. Every template, fed every edge case a real gift can hold
 * (src/templates/_shared/e2e/edge-cases.ts: no settings, fewest and most photos, every text at its
 * limit, odd settings, every option), must render with no crash and nothing like "undefined" on
 * screen, and must play through to its end like a recipient would play it. Written after an Arcade
 * gift that could never be won (9 Nov 2026): a screen that looks right isn't proof.
 *
 * It needs the demo page's test switch, so a build or dev server with NEXT_PUBLIC_E2E=1:
 *   NEXT_PUBLIC_E2E=1 PORT=<free port> npx playwright test template-sweep --project=mobile-chrome --workers=2
 * SWEEP=arcade,bloom limits it to some templates.
 */
const SLUGS = readdirSync("src/templates", { withFileTypes: true })
  .filter((d) => d.isDirectory() && existsSync(`src/templates/${d.name}/manifest.ts`))
  .map((d) => d.name)
  .filter((slug) => !process.env.SWEEP || process.env.SWEEP.split(",").includes(slug))
  .sort();

const BAD_TEXT = /\bundefined\b|\bNaN\b|\[object Object\]|Invalid Date/;
const CRASH = /template crashed|Maximum update depth|Rendered (more|fewer) hooks|Cannot update a component while rendering/i;
/** Buttons a recipient presses to move on, tried first. */
const GO = /start|open|next|continue|tap|read|reveal|unwrap|skip|play|begin|enter|let'?s|show|see|yes|done|finish|light|blow|shake|pour|flip|turn|pulsa|abr|siguiente|continuar|toca|leer|ver|empez|saltar/i;
/** Buttons that leave, replay or only change a setting: never pressed. */
const NEVER = /replay|again|otra vez|previous|\bprev\b|anterior|make (one|your)|send (one|it|a)|react|share|sound|mute|unmute|music|audio|volume|crt|back|keep|download|copy|save|instagram|whatsapp|facebook|tiktok|reply|responder|volver|compartir|sonido|música|microphone|micrófono|camera|cámara|allow|permit|permission|motion|gyro|turn on tilt|read the phone.?s tilt/i;
/** Buttons a finger holds down rather than taps. */
const HOLD = /\bhold\b|press and hold|mant[eé]n/i;
/** Something to scratch away: rubbed across, back and forth, until it's gone. */
const SCRATCH = /scratch|rasca/i;

test.skip(process.env.NEXT_PUBLIC_E2E !== "1", "the sweep needs a server built with NEXT_PUBLIC_E2E=1");

type Watch = { problems: string[] };

function watch(page: Page): Watch {
  const w: Watch = { problems: [] };
  page.on("pageerror", (e) => w.problems.push(`page error: ${e.message.slice(0, 200)}`));
  page.on("console", (m) => {
    if (m.type() === "error" && CRASH.test(m.text())) w.problems.push(`console: ${m.text().slice(0, 200)}`);
  });
  return w;
}

/** Opens a case; null when the template doesn't have it. */
async function openCase(page: Page, slug: string, name: string): Promise<Locator | null> {
  await page.goto(`/demo/${slug}?e2e=${name}`);
  // The live gift: collage templates also show a little preview copy of it.
  const root = page.locator(`[data-template="${slug}"][data-mode="live"]`);
  const missing = page.locator("[data-e2e-missing]");
  await expect(root.or(missing).first()).toBeVisible({ timeout: 60_000 });
  if (await missing.isVisible()) return null;
  await expect(page.getByText(/someone made this for you/i)).toBeHidden({ timeout: 60_000 });
  return root;
}

async function badText(root: Locator): Promise<string | null> {
  const text = await root.innerText().catch(() => "");
  const m = BAD_TEXT.exec(text);
  return m ? `shows "${text.slice(Math.max(0, m.index - 30), m.index + 30).replace(/\s+/g, " ")}"` : null;
}

async function tapCentre(page: Page, root: Locator, fy = 0.5) {
  const box = await root.boundingBox();
  if (box) await page.mouse.click(box.x + box.width / 2, box.y + box.height * fy);
}

/** Taps spread over the whole gift, so scattered things (stars, balloons, envelopes) get found. */
const GRID = [0.22, 0.36, 0.5, 0.64, 0.78, 0.88].flatMap((fy) => [0.15, 0.33, 0.5, 0.67, 0.85].map((fx) => [fx, fy] as const));

/**
 * Presses on through a gift like a recipient: buttons that move on first, then taps across the
 * whole gift, swipes, holds and scrolls (inside the gift only: the demo bar's links sit above it).
 */
async function driveToEnd(page: Page, slug: string, root: Locator, ms: number) {
  const deadline = Date.now() + ms;
  const pressed: string[] = [];
  // Presses of each button since the gift last moved on: one that does nothing gets eight tries (a stir takes four).
  let tries = new Map<string, number>();
  let mark = "";
  let gesture = 0;
  // What the last press or tap landed on, to name it if the page goes somewhere else.
  let last = "";
  const under = (x: number, y: number) =>
    page
      .evaluate(([x, y]) => {
        const el = document.elementFromPoint(x, y);
        const hit = el?.closest("a, button, [role=button]") ?? el;
        if (!hit) return "nothing";
        const label = (hit.getAttribute("aria-label") || hit.textContent || "").replace(/\s+/g, " ").trim().slice(0, 40);
        return `<${hit.tagName.toLowerCase()}${hit.getAttribute("href") ? ` href=${hit.getAttribute("href")}` : ""}> "${label}" at ${Math.round(x)},${Math.round(y)}`;
      }, [x, y] as const)
      .catch(() => "?");
  for (let step = 0; Date.now() < deadline; step++) {
    if (!new URL(page.url()).pathname.endsWith(`/demo/${slug}`)) return { ended: false, pct: 0, pressed, left: `${page.url()}, last touched ${last}` };
    const state = await page.evaluate(() => {
      const events = (window as unknown as { __giftEvents?: { type: string; pct?: number }[] }).__giftEvents ?? [];
      return { ended: events.some((e) => e.type === "ended"), pct: Math.max(0, ...events.map((e) => e.pct ?? 0)), count: events.length };
    });
    if (state.ended) return { ended: true, pct: 100, pressed };
    if (String(state.pct) !== mark) {
      mark = String(state.pct);
      tries = new Map();
    }
    // A reader scrolls: a long message, and the end screen below it, only count once in view.
    if (step % 2 === 1)
      await page.evaluate((slug) => {
        const rootEl = document.querySelector(`[data-template="${slug}"][data-mode="live"]`);
        for (const el of rootEl?.querySelectorAll<HTMLElement>("*") ?? []) {
          if (el.scrollHeight <= el.clientHeight + 4) continue;
          const o = getComputedStyle(el).overflowY;
          if (o === "auto" || o === "scroll") el.scrollBy({ top: el.clientHeight * 0.8 });
        }
      }, slug);
    const candidates = await page.evaluate(
      ({ slug, go, never }) => {
        const rootEl = document.querySelector(`[data-template="${slug}"][data-mode="live"]`);
        if (!rootEl) return [];
        const goRe = new RegExp(go, "i");
        const neverRe = new RegExp(never, "i");
        const box = rootEl.getBoundingClientRect();
        return [...rootEl.querySelectorAll<HTMLElement>('button, [role="button"]')]
          .map((el) => {
            const r = el.getBoundingClientRect();
            return { el, name: (el.getAttribute("aria-label") || el.textContent || "").replace(/\s+/g, " ").trim(), r, x: r.left + r.width / 2, y: r.top + r.height / 2 };
          })
          .filter(({ el, name, r, x, y }) => {
            if (r.width < 6 || r.height < 6) return false;
            // Only what a finger can reach: its middle on screen, inside the gift, and not under anything.
            // (A button scrolled half out of view, clamped to the edge, once tapped the demo bar's link.)
            if (x < box.left || x > box.right || y < box.top || y > box.bottom || x > innerWidth || y > innerHeight) return false;
            const top = document.elementFromPoint(x, y);
            if (!top || !(top === el || el.contains(top))) return false;
            const s = getComputedStyle(el);
            if (s.visibility === "hidden" || s.pointerEvents === "none" || Number(s.opacity) < 0.05) return false;
            if ((el as HTMLButtonElement).disabled || el.getAttribute("aria-disabled") === "true") return false;
            return !neverRe.test(name);
          })
          .map(({ name, x, y }) => ({
            name: name.slice(0, 40),
            // A short label: a long one is a caption or a message, whatever words it holds.
            go: name.length <= 30 && goRe.test(name),
            x,
            y,
          }))
          .sort((a, b) => Number(b.go) - Number(a.go));
      },
      { slug, go: GO.source, never: NEVER.source },
    );
    // Ones that move on first, then whichever has been pressed least: every star, every balloon in turn.
    const triesOf = (name: string) => tries.get(name) ?? 0;
    const target = candidates.filter((c) => triesOf(c.name) < 8).sort((a, b) => Number(b.go) - Number(a.go) || triesOf(a.name) - triesOf(b.name))[0];
    const box = await root.boundingBox({ timeout: 5_000 }).catch(() => null);
    if (!box) return { ended: false, pct: state.pct, pressed, left: "the gift disappeared" };
    // Something to rub away (a scratch card's foil): a canvas under a crosshair, scratched edge to edge.
    const foil = await page.evaluate((slug) => {
      const rootEl = document.querySelector(`[data-template="${slug}"][data-mode="live"]`);
      const c = [...(rootEl?.querySelectorAll<HTMLCanvasElement>("canvas") ?? [])].find((el) => {
        const r = el.getBoundingClientRect();
        return getComputedStyle(el).cursor === "crosshair" && getComputedStyle(el).pointerEvents !== "none" && r.width * r.height > 20_000 && r.top >= 0 && r.bottom <= innerHeight;
      });
      const r = c?.getBoundingClientRect();
      return r ? { x: r.left, y: r.top, w: r.width, h: r.height } : null;
    }, slug);
    if (foil && step % 3 === 0) {
      for (let y = foil.y + 12; y < foil.y + foil.h - 6; y += 16) {
        await page.mouse.move(foil.x + 6, y);
        await page.mouse.down();
        await page.mouse.move(foil.x + foil.w - 6, y + 8, { steps: 8 });
        await page.mouse.up();
      }
      if (pressed.at(-1) !== "(scratched the foil)") pressed.push("(scratched the foil)");
    } else if (target && step % 4 !== 3) {
      last = await under(target.x, target.y);
      if (HOLD.test(target.name)) {
        // Mostly short holds, as someone watching a glass fill lets go in time (The Toast spills past
        // full); now and then a long one, for what has to be held down a while.
        await page.mouse.move(target.x, target.y);
        await page.mouse.down();
        await page.waitForTimeout(triesOf(target.name) % 4 === 3 ? 3000 : 900);
        await page.mouse.up();
      } else if (SCRATCH.test(target.name)) {
        // Back and forth over the card around it, row by row, as a coin would.
        for (let row = -3; row <= 3; row++) {
          const y = target.y + row * Math.min(28, box.height / 14);
          await page.mouse.move(box.x + box.width * 0.12, y);
          await page.mouse.down();
          for (let i = 1; i <= 10; i++) await page.mouse.move(box.x + box.width * (0.12 + 0.76 * (i / 10)), y + (i % 2 ? 6 : -6));
          await page.mouse.up();
        }
      } else await page.mouse.click(target.x, target.y);
      tries.set(target.name, (tries.get(target.name) ?? 0) + 1);
      if (pressed.at(-1) !== target.name) pressed.push(target.name);
    } else {
      const at = (fx: number, fy: number) => [box.x + box.width * fx, box.y + box.height * fy] as const;
      const kind = gesture++ % 10;
      if (kind === 3) {
        // A swipe across, slow enough to scratch, drag or turn a page.
        await page.mouse.move(...at(0.15, 0.55));
        await page.mouse.down();
        for (let i = 1; i <= 14; i++) await page.mouse.move(...at(0.15 + 0.7 * (i / 14), 0.45 + 0.2 * Math.sin(i)));
        await page.mouse.up();
      } else if (kind === 6) {
        // A press and hold.
        await page.mouse.move(...at(0.5, 0.55));
        await page.mouse.down();
        await page.waitForTimeout(1500);
        await page.mouse.up();
      } else if (kind === 9) {
        // A swipe up, and a wheel turn, for whatever scrolls or lifts.
        await page.mouse.move(...at(0.5, 0.82));
        await page.mouse.down();
        for (let i = 1; i <= 8; i++) await page.mouse.move(...at(0.5, 0.82 - 0.5 * (i / 8)));
        await page.mouse.up();
        await page.mouse.move(...at(0.5, 0.5));
        await page.mouse.wheel(0, 700);
      } else {
        const [x, y] = at(...GRID[step % GRID.length]);
        last = await under(x, y);
        await page.mouse.click(x, y);
      }
    }
    await page.waitForTimeout(300);
  }
  const pct = await page.evaluate(() => Math.max(0, ...(((window as unknown as { __giftEvents?: { pct?: number }[] }).__giftEvents ?? []).map((e) => e.pct ?? 0))));
  return { ended: false, pct, pressed };
}

for (const slug of SLUGS) {
  test(`${slug}: every edge case renders cleanly`, async ({ page }) => {
    test.setTimeout(420_000);
    const w = watch(page);
    const failures: string[] = [];
    const root = await openCase(page, slug, "demo");
    expect(root, "the demo case").not.toBeNull();
    const options = Number((await page.locator("[data-e2e-options]").first().getAttribute("data-e2e-options")) ?? 1);
    const cases = ["demo", "empty", "min", "max", "quiet", "later", "odd", ...Array.from({ length: Math.max(0, options - 1) }, (_, i) => `options-${i + 1}`)];
    for (const name of cases) {
      w.problems.length = 0;
      const r = await openCase(page, slug, name).catch((e: Error) => {
        failures.push(`${name}: never got past loading (${e.message.split("\n")[0]})`);
        return null;
      });
      if (!r) continue;
      await page.waitForTimeout(2500);
      const first = await badText(r);
      if (first) failures.push(`${name}: ${first}`);
      for (const fy of [0.5, 0.7, 0.4]) {
        await tapCentre(page, r, fy);
        await page.waitForTimeout(900);
      }
      const later = await badText(r);
      if (later && later !== first) failures.push(`${name}, after taps: ${later}`);
      for (const p of new Set(w.problems)) failures.push(`${name}: ${p}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });

  test(`${slug}: plays through to its end`, async ({ page }) => {
    test.setTimeout(840_000);
    const w = watch(page);
    const failures: string[] = [];
    for (const name of ["min", "max", "quiet"]) {
      w.problems.length = 0;
      const root = await openCase(page, slug, name);
      if (!root) continue;
      // The most photos take longest: twelve stars to find, twenty balloons to pop.
      const run = await driveToEnd(page, slug, root, name === "max" ? 240_000 : 120_000);
      if ("left" in run && run.left) failures.push(`${name}: left the gift (${run.left}) after pressing ${run.pressed.join(" → ") || "nothing"}`);
      else if (!run.ended) failures.push(`${name}: never reached the end (progress ${run.pct}%; pressed ${run.pressed.join(" → ") || "nothing"})`);
      if (!run.ended) await page.screenshot({ path: test.info().outputPath(`${name}-stuck.png`) });
      const text = await badText(root);
      if (text) failures.push(`${name}, at the end: ${text}`);
      for (const p of new Set(w.problems)) failures.push(`${name}: ${p}`);
    }
    expect(failures, failures.join("\n")).toEqual([]);
  });
}
