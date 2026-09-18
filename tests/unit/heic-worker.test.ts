import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { extractHeicWorker, workerFileContents, workerFileName } from "../../scripts/heic-worker.mjs";
import { HEIC_WORKER_URL, isHeifHeader } from "@/lib/editor/heic";
import nextConfig from "../../next.config";

const root = resolve(__dirname, "../..");

/**
 * HEIC photos only work if the decoder runs in its own worker file under its own policy (see
 * scripts/heic-worker.mjs). These pin the three things that have to agree for that: the file on
 * disk, the URL the editor asks for, and the headers served with it.
 */
describe("HEIC decoder worker", () => {
  const worker = extractHeicWorker(root);

  it("is exactly the decoder heic2any ships, for the installed version", () => {
    const committed = readFileSync(resolve(root, "public/workers", workerFileName(worker.version)), "utf8");
    // Upgrading heic2any without rerunning `node scripts/heic-worker.mjs` fails here.
    expect(committed).toBe(workerFileContents(worker));
  });

  it("is the file the editor loads", () => {
    expect(HEIC_WORKER_URL).toBe(`/workers/${workerFileName(worker.version)}`);
  });

  it("gets a policy of its own that lets the decoder start, and nothing else does", async () => {
    const rules = await nextConfig.headers!();
    const csp = (source: string) =>
      rules
        .filter((r) => r.source === source)
        .flatMap((r) => r.headers)
        .find((h) => h.key === "Content-Security-Policy")?.value ?? "";
    const siteIndex = rules.findIndex((r) => r.source === "/(.*)");
    const workerIndex = rules.findIndex((r) => r.source === "/workers/:path*");

    // The later rule wins for the same header, so the worker's has to come after the site's.
    expect(workerIndex).toBeGreaterThan(siteIndex);
    expect(csp("/workers/:path*")).toContain("'unsafe-eval'");
    expect(csp("/workers/:path*")).toContain("default-src 'none'");
    // The pages keep theirs: no eval outside development.
    if (process.env.NODE_ENV === "production") expect(csp("/(.*)")).not.toContain("'unsafe-eval'");
    expect(csp("/(.*)")).toContain("worker-src 'self' blob:");
  });
});

describe("isHeifHeader", () => {
  const box = (brand: string) => new Uint8Array([0, 0, 0, 24, ...Buffer.from("ftyp"), ...Buffer.from(brand), 0, 0, 0, 0]);

  it("knows an iPhone photo by its brand, whatever it is called", () => {
    for (const brand of ["heic", "heix", "mif1", "msf1", "hevc"]) expect(isHeifHeader(box(brand)), brand).toBe(true);
  });

  it("leaves everything a browser can already read alone", () => {
    expect(isHeifHeader(box("avif"))).toBe(false);
    expect(isHeifHeader(new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 16, 74, 70, 73, 70, 0, 1]))).toBe(false); // JPEG
    expect(isHeifHeader(new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]))).toBe(false); // PNG
    expect(isHeifHeader(new Uint8Array([0, 0, 0, 24, ...Buffer.from("ftyp")]))).toBe(false); // cut short
  });

  it("recognises a real HEIC from the phone's camera roll", () => {
    // The first 12 bytes of an iPhone 15 photo.
    expect(isHeifHeader(new Uint8Array([0, 0, 0, 0x2c, 0x66, 0x74, 0x79, 0x70, 0x68, 0x65, 0x69, 0x63]))).toBe(true);
  });
});
