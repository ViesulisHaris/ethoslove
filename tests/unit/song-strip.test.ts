import { describe, expect, it } from "vitest";
import { songStripOn } from "@/templates/_shared/SongStrip";

describe("the song strip's switch", () => {
  it("is off unless NEXT_PUBLIC_SONG_STRIP is exactly 1: a gift is as it was", () => {
    for (const raw of [undefined, "", "0", "true", "on", " 1"]) expect(songStripOn(raw), String(raw)).toBe(false);
    expect(songStripOn("1")).toBe(true);
  });
});
