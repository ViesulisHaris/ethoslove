import { describe, expect, it } from "vitest";
import { checkEmail } from "@/lib/auth/email-check";

describe("checkEmail (walk-make-2)", () => {
  it("refuses a domain with no dot", () => {
    expect(checkEmail("maya@gmail")).toEqual({ kind: "noDot" });
    expect(checkEmail("maya@gmail.")).toEqual({ kind: "noDot" });
    expect(checkEmail(" maya@localhost ")).toEqual({ kind: "noDot" });
  });

  it("suggests the common slips, keeping the name as typed", () => {
    const cases: [string, string][] = [
      ["ana@gmail.con", "ana@gmail.com"],
      ["ana@gmail.co", "ana@gmail.com"],
      ["ana@gmail.cm", "ana@gmail.com"],
      ["ana@gmial.com", "ana@gmail.com"],
      ["ana@gmai.com", "ana@gmail.com"],
      ["Ana.Ruiz@Hotmial.com", "Ana.Ruiz@hotmail.com"],
      ["ana@hotmail.con", "ana@hotmail.com"],
      ["ana@yahoo.con", "ana@yahoo.com"],
      ["ana@yahoo.co", "ana@yahoo.com"],
      ["ana@icloud.con", "ana@icloud.com"],
      ["ana@outlook.con", "ana@outlook.com"],
    ];
    for (const [typed, fix] of cases) expect(checkEmail(typed), typed).toEqual({ kind: "suggest", suggestion: fix });
  });

  it("never corrects a real address", () => {
    for (const ok of [
      "ana@gmail.com",
      "ana@yahoo.co.uk",
      "ana@yahoo.co.jp",
      "ana@mail.co",
      "ana@hotmail.co.uk",
      "ana@gmail.com.ar",
      "ana@acme-studio.com",
      "ana@sub.example.org",
      "ana@con.com",
      "",
      "no-at-sign",
    ])
      expect(checkEmail(ok), ok).toEqual({ kind: "ok" });
  });
});
