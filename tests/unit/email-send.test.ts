import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import { isUndeliverable } from "@/lib/email/send";

describe("isUndeliverable", () => {
  it("catches the reserved test domains", () => {
    for (const to of ["qa@example.org", "a@example.com", "b@mail.example.net", "c@shop.test", "d@x.invalid", "e@box.localhost", " F@EXAMPLE.ORG "]) expect(isUndeliverable(to)).toBe(true);
  });
  it("lets real addresses through", () => {
    for (const to of ["ana@gmail.com", "leo@example-studio.com", "x@examples.org", "y@test.com", "z@tryethos.io"]) expect(isUndeliverable(to)).toBe(false);
  });
});
