import { describe, expect, it } from "vitest";
import { buildClientErrorReport, clientErrorSchema, errorCode } from "@/lib/client-error";

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
