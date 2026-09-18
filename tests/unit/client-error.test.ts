import { describe, expect, it } from "vitest";
import { buildClientErrorReport, clientErrorSchema, errorCode, isOwnError, redactGiftPath, scrubStack } from "@/lib/client-error";

describe("what an error screen sends home", () => {
  const crash = { name: "TypeError", message: "Cannot read properties of undefined (reading 'map')", stack: Array.from({ length: 40 }, (_, i) => `    at frame${i} (https://tryethos.io/_next/static/chunks/x.js:1:${i})`).join("\n") };

  it("gives the same error the same short code, and different errors different ones", () => {
    expect(errorCode(crash)).toBe(errorCode({ ...crash, stack: "elsewhere" }));
    expect(errorCode(crash)).toMatch(/^[0-9A-Z]{6}$/);
    expect(errorCode(crash)).not.toBe(errorCode({ name: "TypeError", message: "x is not a function" }));
    // A server error reaches the browser with its message stripped; the digest tells them apart.
    expect(errorCode({ name: "Error", message: "masked", digest: "111" })).not.toBe(errorCode({ name: "Error", message: "masked", digest: "222" }));
    expect(errorCode(undefined)).toMatch(/^[0-9A-Z]{6}$/);
  });

  it("keeps the path but never the query string or hash", () => {
    const report = buildClientErrorReport(crash, "page", { path: "/create/bouquet?resume=publish&token=abc#top" });
    expect(report.path).toBe("/create/bouquet");
  });

  it("trims the stack and message to something a log line can hold, and still validates", () => {
    const report = buildClientErrorReport({ ...crash, message: "x".repeat(5000) }, "gift", { path: "/g/94p3j6szr", template: "the-letter", build: "dpl_68NTNFaBw8ogHSf5UjJTzEcxd6q1" });
    expect(report.stack?.split("\n")).toHaveLength(12);
    expect(report.message).toHaveLength(500);
    expect(report.template).toBe("the-letter");
    expect(clientErrorSchema.safeParse(report).success).toBe(true);
  });

  it("copes with something thrown that isn't an Error", () => {
    const report = buildClientErrorReport(undefined, "root", { path: "/" });
    expect(report).toMatchObject({ where: "root", name: "Error", message: "", path: "/" });
    expect(clientErrorSchema.safeParse(report).success).toBe(true);
  });

  it("refuses a report that isn't one of ours", () => {
    expect(clientErrorSchema.safeParse({ where: "page", code: "X", name: "E", message: "m", path: "/", stack: "s".repeat(5000) }).success).toBe(false);
    expect(clientErrorSchema.safeParse({ where: "elsewhere", code: "X", name: "E", message: "m", path: "/" }).success).toBe(false);
    expect(clientErrorSchema.safeParse(null).success).toBe(false);
  });
});

describe("errors that never reach an error screen", () => {
  const origin = "https://tryethos.io";

  it("reports our own code, found by its file or its stack", () => {
    expect(isOwnError({ message: "Maximum call stack size exceeded.", filename: `${origin}/_next/static/chunks/abc.js` }, origin)).toBe(true);
    expect(isOwnError({ message: "x is not a function", stack: `TypeError: x\n    at f (${origin}/_next/static/chunks/abc.js:1:2)` }, origin)).toBe(true);
  });

  it("leaves alone what isn't ours or says nothing", () => {
    expect(isOwnError({ message: "Script error.", filename: "" }, origin)).toBe(false);
    expect(isOwnError({ message: "Error invoking postMessage: Java object is gone", filename: `${origin}/` }, origin)).toBe(false);
    expect(isOwnError({ message: "ResizeObserver loop completed with undelivered notifications.", filename: `${origin}/` }, origin)).toBe(false);
    expect(isOwnError({ message: "boom", filename: "chrome-extension://abc/content.js", stack: "at chrome-extension://abc/content.js:1:1" }, origin)).toBe(false);
    expect(isOwnError({ message: "", filename: `${origin}/x.js` }, origin)).toBe(false);
  });

  it("never logs a gift's link, in either language", () => {
    expect(redactGiftPath("/g/94p3j6szr")).toBe("/g/[shortId]");
    expect(redactGiftPath("/es/g/94p3j6szr/reply")).toBe("/es/g/[shortId]/reply");
    expect(redactGiftPath("/templates/garden")).toBe("/templates/garden");
    expect(redactGiftPath("/gifts")).toBe("/gifts");
  });

  it("is a report the endpoint accepts", () => {
    for (const where of ["window", "promise"] as const) {
      const report = buildClientErrorReport({ name: "RangeError", message: "Maximum call stack size exceeded." }, where, { path: redactGiftPath("/g/abc") });
      expect(clientErrorSchema.safeParse(report).success).toBe(true);
    }
  });
});

describe("scrubStack", () => {
  it("drops query strings and gift links from a stack, and keeps line and column", () => {
    const stack = [
      "letter@https://tryethos.io/g/94p3j6szr:1:46",
      "at done (https://tryethos.io/checkout/success?session_id=cs_live_abc123:2:10)",
      "at f (https://tryethos.io/_next/static/chunks/abc.js:1:2)",
      "at g (https://tryethos.io/es/g/zz9/reply:3:4)",
    ].join("\n");
    const out = scrubStack(stack);
    expect(out).not.toMatch(/94p3j6szr|cs_live|zz9/);
    expect(out).toContain("https://tryethos.io/g/[shortId]:1:46");
    expect(out).toContain("https://tryethos.io/checkout/success:2:10)");
    expect(out).toContain("https://tryethos.io/_next/static/chunks/abc.js:1:2");
    expect(out).toContain("https://tryethos.io/es/g/[shortId]/reply:3:4");
  });

  it("is applied to every report, not only the uncaught ones", () => {
    const report = buildClientErrorReport({ name: "Error", message: "m", stack: "x@https://tryethos.io/g/secret1:1:1" }, "gift", { path: "/g/secret1" });
    expect(report.stack).toBe("x@https://tryethos.io/g/[shortId]:1:1");
  });
});
