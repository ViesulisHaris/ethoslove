/**
 * A group card's link token: made from the group's id, the link's version and the server's secret,
 * never stored. What the database keeps (its SHA-256) finds the group and opens nothing.
 */
import { describe, expect, it } from "vitest";
import { TOKEN_LENGTH, groupToken, isGroupToken, randomRef, sha256Hex, withdrawSecret } from "@/lib/group/token";

const GROUP = "6f1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const OTHER = "7a1c2a3b-4d5e-4f60-8a7b-9c0d1e2f3a4b";
const SECRET = "group-test-secret";

describe("the link's token", () => {
  it("is the same every time for the same group, version and secret", () => {
    expect(groupToken(GROUP, 1, SECRET)).toBe(groupToken(GROUP, 1, SECRET));
  });

  it("is 22 characters that fit in an address with nothing escaped", () => {
    const token = groupToken(GROUP, 1, SECRET);
    expect(token).toHaveLength(TOKEN_LENGTH);
    expect(token).toMatch(/^[A-Za-z0-9_-]{22}$/);
    expect(encodeURIComponent(token)).toBe(token);
    expect(isGroupToken(token)).toBe(true);
  });

  it("changes with the version (a reset link), the group and the secret", () => {
    const first = groupToken(GROUP, 1, SECRET);
    expect(groupToken(GROUP, 2, SECRET)).not.toBe(first);
    expect(groupToken(OTHER, 1, SECRET)).not.toBe(first);
    expect(groupToken(GROUP, 1, "another secret")).not.toBe(first);
  });

  it("names no gift and no group: nothing of the id is in it", () => {
    const token = groupToken(GROUP, 1, SECRET);
    for (const part of GROUP.split("-")) expect(token).not.toContain(part);
  });

  it("what is stored derives nothing: the hash is not the token and a hash of the hash finds nothing", () => {
    const token = groupToken(GROUP, 1, SECRET);
    const stored = sha256Hex(token);
    expect(stored).toMatch(/^[0-9a-f]{64}$/);
    expect(stored).not.toContain(token);
    expect(isGroupToken(stored)).toBe(false);
    // Holding the row (id, version, hash) without the secret makes no working link.
    expect(sha256Hex(groupToken(GROUP, 1, ""))).not.toBe(stored);
    expect(sha256Hex(stored)).not.toBe(stored);
  });

  it("refuses anything that is not shaped like one", () => {
    for (const bad of ["", "short", "a".repeat(21), "a".repeat(23), "has space in it 1234567", "../../etc/passwd_______", null, 7, undefined]) expect(isGroupToken(bad)).toBe(false);
  });
});

describe("the other random pieces", () => {
  it("a key is ten lower-case letters and digits, a report reference eight, and no two alike", () => {
    expect(randomRef(10)).toMatch(/^[a-z0-9]{10}$/);
    expect(randomRef(8)).toMatch(/^[a-z0-9]{8}$/);
    expect(new Set(Array.from({ length: 200 }, () => randomRef(10))).size).toBe(200);
  });

  it("a withdraw secret is long, unguessable and different every time", () => {
    expect(withdrawSecret()).toMatch(/^[A-Za-z0-9_-]{32}$/);
    expect(withdrawSecret()).not.toBe(withdrawSecret());
  });
});
