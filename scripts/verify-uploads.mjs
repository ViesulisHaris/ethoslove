/**
 * Upload edge cases against the real Supabase project. Three things customers hit:
 *   1. a song the phone labels "audio/x-m4r" (an iPhone ringtone) must upload, as audio/mp4;
 *   2. a file type Storage can't take is refused when it's picked, not left "uploading";
 *   3. a song Storage refuses says why, and one tap takes it out so the gift can be sent.
 * Signs in a throwaway user, never publishes (nothing is emailed), and cleans up after itself.
 *
 *   node scripts/verify-uploads.mjs [outDir] [baseURL] [songFile]
 * Needs NEXT_PUBLIC_SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY (reads .env.local).
 */
import { chromium } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";
import { mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

const out = process.argv[2] ?? "./.verify";
const base = process.argv[3] ?? "http://localhost:3000";
const songFile = process.argv[4] ?? "public/audio/library/golden-hour.mp3";
// The auth callback welcomes profiles created moments ago; waiting past that window keeps test addresses out of the mail queue.
const WELCOME_WINDOW_MS = Number(process.env.WELCOME_WINDOW_MS ?? 125_000);
mkdirSync(out, { recursive: true });

const env = Object.fromEntries(readFileSync(".env.local", "utf8").split("\n").filter((l) => l.includes("=") && !l.startsWith("#")).map((l) => [l.slice(0, l.indexOf("=")).trim(), l.slice(l.indexOf("=") + 1).trim()]));
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const email = `e2e-uploads-${Date.now()}@ethoslove.test`;
const { data: created, error: createErr } = await admin.auth.admin.createUser({ email, email_confirm: true, user_metadata: { full_name: "Upload Tester", locale: "en" } });
if (createErr) throw createErr;
const userId = created.user.id;
console.log("user:", userId);
{
  // Aged past the welcome window, so signing in doesn't mail a test address; wait it out if that fails.
  const { data: aged } = await admin.from("profiles").update({ created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString() }).eq("id", userId).select("id");
  if (!aged?.length) {
    console.log(`profile not aged, waiting ${Math.round(WELCOME_WINDOW_MS / 1000)}s`);
    await new Promise((r) => setTimeout(r, WELCOME_WINDOW_MS));
  }
}

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1400, height: 900 }, locale: "en-US" });
const page = await context.newPage();
const errors = [];
page.on("pageerror", (e) => errors.push(`pageerror: ${e.message}`));
page.on("console", (m) => m.type() === "error" && errors.push(`console: ${m.text().slice(0, 300)}`));
const shot = (n) => page.screenshot({ path: join(out, `uploads-${n}.png`) });
const PHOTO_INPUT = 'input[type="file"]';
const checks = [];
const check = (name, ok, detail = "") => {
  checks.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? ` · ${detail}` : ""}`);
};

// Storage's answer to a type it won't take, served for songs while `refuseSongs` is on.
let refuseSongs = false;
// Held open rather than refused: a file that simply never finishes, which is what traps a gift.
let stallPhotos = false;
await page.route("**/storage/v1/object/gifts/**", async (route) => {
  const req = route.request();
  if (refuseSongs && req.method() === "POST" && /\.(m4a|mp3|bin)$/.test(new URL(req.url()).pathname)) {
    return route.fulfill({ status: 400, contentType: "application/json", body: JSON.stringify({ statusCode: "415", error: "invalid_mime_type", message: "mime type audio/x-m4r is not supported" }) });
  }
  if (stallPhotos && req.method() === "POST" && /\.(webp|png|jpg|jpeg)$/.test(new URL(req.url()).pathname)) {
    await new Promise((r) => setTimeout(r, 40000));
    return route.abort();
  }
  return route.continue();
});

try {
  const { data: link, error: linkErr } = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (linkErr) throw linkErr;
  await page.goto(`${base}/auth/confirm?token_hash=${link.properties.hashed_token}&type=magiclink&next=/create/the-letter`, { waitUntil: "networkidle" });
  await page.getByLabel("Their name").waitFor({ timeout: 30000 });
  await page.getByLabel("Their name").fill("Jack");
  await page.getByLabel("Your name").fill("Sophie");
  await page.getByLabel("Message").fill("Happy birthday. This one has our song in it.");
  await page.locator('input[type="file"]').first().setInputFiles(["public/demo/photos/p1.webp"]);
  await page.getByText("Uploaded").first().waitFor({ timeout: 40000 });

  // 1. The iPhone ringtone.
  await page.getByRole("radio", { name: /Upload your own/ }).click();
  const audioInput = page.locator('input[type="file"][accept*="audio/mpeg"]');
  await audioInput.setInputFiles({ name: "our-song.m4r", mimeType: "audio/x-m4r", buffer: readFileSync(songFile) });
  const status = page.getByTestId("song-upload-status");
  await status.filter({ hasText: /Uploaded|can’t|connection|no longer/ }).waitFor({ timeout: 90000 });
  check("ringtone uploads", (await status.innerText()).includes("Uploaded"), await status.innerText());
  await page.waitForTimeout(2600); // debounced remote save
  const { data: rows } = await admin.from("gifts").select("id, data").eq("user_id", userId);
  const withSong = rows?.find((r) => r.data?.music?.source === "upload");
  const songUrl = withSong?.data?.music?.url ?? "";
  check("draft points at the stored song", /^gifts\/[0-9a-f-]{36}\/[\w-]+\.m4a$/.test(songUrl), songUrl);
  const { data: files } = withSong ? await admin.storage.from("gifts").list(withSong.id) : { data: [] };
  const stored = files?.find((f) => f.name.endsWith(".m4a"));
  check("stored as audio/mp4", stored?.metadata?.mimetype === "audio/mp4", `${stored?.name} ${stored?.metadata?.mimetype} ${stored?.metadata?.size} bytes`);
  check("one draft row for one gift", rows?.length === 1, `${rows?.length} rows`);
  await shot("01-ringtone-uploaded");

  // 1b. Coming back to the page finds the same gift: no new draft row, nothing sent again, previews intact.
  let storagePosts = 0;
  page.on("request", (r) => {
    if (r.method() === "POST" && r.url().includes("/storage/v1/object/gifts/")) storagePosts++;
  });
  await page.reload({ waitUntil: "networkidle" });
  await page.getByLabel("Their name").waitFor({ timeout: 30000 });
  await status.filter({ hasText: /Uploaded|can’t|connection|no longer/ }).waitFor({ timeout: 30000 });
  await page.waitForTimeout(3000);
  const { data: afterReload } = await admin.from("gifts").select("id").eq("user_id", userId);
  check("reopening keeps the same draft row", afterReload?.length === 1 && afterReload[0].id === withSong?.id, `${afterReload?.length} rows`);
  check("reopening sends nothing again", storagePosts === 0, `${storagePosts} uploads`);
  check("song still marked uploaded after reopening", (await status.innerText()).includes("Uploaded"));
  const thumbOk = await page.locator('img[src^="blob:"]').first().evaluate((img) => img.complete && img.naturalWidth > 0).catch(() => false);
  check("photo preview works after reopening", thumbOk);

  // 1c. A copy of a draft that has since been published elsewhere must not write over the live gift.
  const liveId = withSong.id;
  await admin.from("gifts").update({ status: "live", published_at: new Date().toISOString() }).eq("id", liveId);
  await page.getByLabel("Message").fill("Happy birthday. This one has our song in it. (edited later)");
  let rowsNow = [];
  for (let i = 0; i < 40; i++) {
    const { data } = await admin.from("gifts").select("id, status, data").eq("user_id", userId);
    rowsNow = data ?? [];
    const next = rowsNow.find((r) => r.id !== liveId);
    if (next?.data?.message?.includes("edited later") && (next.data?.music?.url ?? "").startsWith(`gifts/${next.id}/`)) break;
    await page.waitForTimeout(1000);
  }
  const live = rowsNow.find((r) => r.id === liveId);
  const next = rowsNow.find((r) => r.id !== liveId);
  check("published gift left untouched", Boolean(live) && !live.data?.message?.includes("edited later"));
  check(
    "edits carry on in a fresh draft with its own files",
    Boolean(next) && next.status === "draft" && next.data?.message?.includes("edited later") && (next.data?.music?.url ?? "").startsWith(`gifts/${next.id}/`) && (next.data?.photos?.[0]?.url ?? "").startsWith(`gifts/${next.id}/`),
    JSON.stringify({ rows: rowsNow.length, music: next?.data?.music?.url, photo: next?.data?.photos?.[0]?.url }),
  );

  // 2. A type we can't take is refused when it's picked.
  await audioInput.setInputFiles({ name: "memo.amr", mimeType: "audio/amr", buffer: Buffer.from("#!AMR\n0000") });
  const refusedAtDoor = await page.getByText("We can’t use this file type. Try an MP3 or M4A.").first().waitFor({ timeout: 6000 }).then(() => true, () => false);
  check("unsupported type refused on pick", refusedAtDoor);
  check("the uploaded song stayed", (await status.innerText()).includes("Uploaded"));

  // 3. Storage refuses a song: the reason shows, and Remove clears the way to publish.
  refuseSongs = true;
  await audioInput.setInputFiles({ name: "second-song.m4a", mimeType: "audio/mp4", buffer: readFileSync(songFile) });
  await status.filter({ hasText: "can’t use this file type" }).waitFor({ timeout: 30000 }).catch(() => {});
  check("refused song says why in the music section", (await status.innerText()).includes("can’t use this file type"), await status.innerText());
  await shot("02-song-refused");
  await page.getByRole("button", { name: /^Publish/ }).first().click();
  const failed = page.getByTestId("failed-uploads");
  const listed = await failed.waitFor({ timeout: 20000 }).then(() => true, () => false);
  const listText = listed ? await failed.innerText() : "";
  check("publish sheet names the song and the reason", listText.includes("Your song “second-song”") && listText.includes("can’t use this file type"), listText.replace(/\s+/g, " "));
  check("checklist no longer blames photos", (await page.getByText("Some photos didn’t upload").count()) === 0 && (await page.getByText("Something didn’t upload").count()) > 0);
  await shot("03-publish-sheet-failed");
  await page.getByTestId("remove-failed-song").click();
  const cleared = await failed.waitFor({ state: "detached", timeout: 10000 }).then(() => true, () => false);
  check("remove takes the song out", cleared);
  const pendingLine = page.locator("li", { hasText: "Your files are still uploading" }).first();
  const crossed = await pendingLine.evaluate((el) => getComputedStyle(el).textDecorationLine).catch(() => "missing");
  check("upload line is ticked off", crossed.includes("line-through"), crossed);
  let publishReady = false;
  for (let i = 0; i < 25 && !publishReady; i++) {
    publishReady = await page.getByRole("button", { name: /Publish now/ }).isEnabled().catch(() => false);
    if (!publishReady) await page.waitForTimeout(400);
  }
  const publishButtons = await page.evaluate(() =>
    [...document.querySelectorAll("button")].filter((b) => /Publish now/.test(b.textContent ?? "")).map((b) => ({ disabled: b.disabled, hidden: b.offsetParent === null })),
  );
  check("publish is available again", publishReady, JSON.stringify(publishButtons));
  const songErrors = errors.filter((e) => /Content Security Policy/.test(e));
  check("song waveform loads (no CSP refusals)", songErrors.length === 0, `${songErrors.length} refusals`);
  await shot("04-song-removed");
  refuseSongs = false;

  // 4. A file that never finishes must not trap the gift behind a spinner with nothing to do.
  stallPhotos = true;
  await page.locator(PHOTO_INPUT).first().setInputFiles(["public/demo/photos/p2.webp"]);
  await page.waitForTimeout(2500);
  const stuckList = page.getByTestId("failed-uploads");
  check("a file still going raises no alarm at first", (await stuckList.isVisible().catch(() => false)) === false);
  await page.waitForTimeout(21000);
  const offered = await stuckList.waitFor({ timeout: 10000 }).then(() => true, () => false);
  const stuckText = offered ? (await stuckList.innerText()).replace(/\s+/g, " ") : "";
  check("after a moment the sheet names it and offers a way out", offered && /photo/i.test(stuckText) && /finished uploading/i.test(stuckText), stuckText);
  await shot("05-stuck-photo");
  await page.getByTestId("remove-failed-photos").click();
  await page.waitForTimeout(2000);
  check("removing the stuck photo clears the block", (await stuckList.isVisible().catch(() => false)) === false);
  const uploadLine = page.locator("li", { hasText: "Your files are still uploading" }).first();
  const settled = await uploadLine.evaluate((el) => getComputedStyle(el).textDecorationLine).catch(() => "missing");
  check("uploads stop blocking once it is out", settled.includes("line-through"), settled);
  await shot("06-unblocked");
  stallPhotos = false;
} catch (e) {
  console.log("VERIFY FAILED:", e.message);
  checks.push({ name: "script", ok: false });
  await shot("99-failure").catch(() => {});
} finally {
  await browser.close();
  const { data: gifts } = await admin.from("gifts").select("id").eq("user_id", userId);
  for (const g of gifts ?? []) {
    const { data: files } = await admin.storage.from("gifts").list(g.id);
    if (files?.length) await admin.storage.from("gifts").remove(files.map((f) => `${g.id}/${f.name}`));
  }
  await admin.auth.admin.deleteUser(userId);
  console.log("cleaned up");
  console.log(errors.length ? `PAGE ERRORS:\n${errors.join("\n")}` : "no page errors");
  const failedChecks = checks.filter((c) => !c.ok);
  console.log(failedChecks.length ? `${failedChecks.length} CHECK(S) FAILED` : `ALL ${checks.length} CHECKS PASSED`);
  process.exitCode = failedChecks.length ? 1 : 0;
}
