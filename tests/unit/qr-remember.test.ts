import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanDesignQuery, rememberQrDesign, rememberedQrDesign } from "@/lib/qr/remember";
import { qrDesignQuery, readQrDesign } from "@/lib/qr/compose";

const store = () => {
  const map = new Map<string, string>();
  vi.stubGlobal("window", {
    localStorage: {
      getItem: (k: string) => map.get(k) ?? null,
      setItem: (k: string, v: string) => void map.set(k, v),
    },
  });
  return map;
};

describe("the Tree Tag's code design, the same from the share screen and the dashboard", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("keeps the design chosen on the share screen for that gift, and hands it to the dashboard's link", () => {
    store();
    const design = qrDesignQuery({
      dots: "square",
      colour: "#1a1614",
      gradient: false,
      centre: "none",
      photo: "",
      size: "l",
      label: "",
    });
    rememberQrDesign("gift-1", design);
    expect(rememberedQrDesign("gift-1")).toBe(design);
    expect(
      readQrDesign(
        Object.fromEntries(new URLSearchParams(rememberedQrDesign("gift-1"))),
        "#d6336c",
      ),
    ).toMatchObject({ dots: "square", colour: "#1a1614", centre: "none", size: "l" });
    // Another gift's link is not given it.
    expect(rememberedQrDesign("gift-2")).toBe("");
  });

  it("with nothing kept, the dashboard prints the default, which is the QR designer's own default", () => {
    store();
    expect(rememberedQrDesign("gift-1")).toBe("");
    const accent = "#E8604C";
    const designerDefault = qrDesignQuery({
      dots: "rounded",
      colour: accent,
      gradient: false,
      centre: "logo",
      photo: "",
      size: "m",
      label: "",
    });
    expect(readQrDesign({}, accent)).toEqual(
      readQrDesign(Object.fromEntries(new URLSearchParams(designerDefault)), accent),
    );
  });

  it("keeps only the design's own fields, and never throws when storage is blocked", () => {
    expect(cleanDesignQuery("dots=dots&shape=card&next=%2Fevil&colour=%23000000")).toBe(
      "dots=dots&colour=%23000000",
    );
    vi.stubGlobal("window", {
      localStorage: {
        getItem: () => {
          throw new Error("blocked");
        },
        setItem: () => {
          throw new Error("blocked");
        },
      },
    });
    expect(() => rememberQrDesign("gift-1", "dots=dots")).not.toThrow();
    expect(rememberedQrDesign("gift-1")).toBe("");
  });
});
