import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { BRAND } from "@/config/brand";
import { getManifest } from "@/templates/registry";

const COPY = {
  en: { eyebrow: "DIGITAL GIFTS", templateEyebrow: "A DIGITAL GIFT", line: "Photos, their song and your words, sent as a link." },
  es: { eyebrow: "REGALOS DIGITALES", templateEyebrow: "UN REGALO DIGITAL", line: "Fotos, su canción y tus palabras, enviadas con un enlace." },
} as const;

// Same serif as the gift link card (see g/[shortId]/opengraph-image.tsx).
const serifFont = () => readFile(new URL("../../fonts/newsreader-regular.ttf", import.meta.url));
const italicFont = () => readFile(new URL("../../fonts/newsreader-italic.ttf", import.meta.url));

/**
 * The share card for marketing pages: the brand line, or a template's name and tagline for
 * /templates/[slug]. Only known template slugs are drawn, so nobody can put their words on our card.
 * Lives at /og.png so the locale proxy (which skips paths with a dot) never redirects it.
 */
export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const locale = params.get("locale") === "es" ? "es" : "en";
  const manifest = getManifest(params.get("template") ?? "");
  const copy = COPY[locale];
  const eyebrow = manifest ? copy.templateEyebrow : copy.eyebrow;
  const headline = manifest ? manifest.name[locale] : BRAND.tagline[locale];
  const line = manifest ? manifest.tagline[locale] : copy.line;
  const [serif, serifItalic] = await Promise.all([serifFont(), italicFont()]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "64px 80px",
          backgroundColor: "#F7F1E7",
          backgroundImage:
            "radial-gradient(70% 90% at 12% 0%, #F6DAD3 0%, rgba(246,218,211,0) 62%), radial-gradient(60% 85% at 92% 100%, #DDE7D9 0%, rgba(221,231,217,0) 60%)",
          color: "#17130F",
          fontFamily: "Newsreader",
        }}
      >
        <div style={{ display: "flex", alignItems: "center" }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              background: "radial-gradient(circle at 36% 30%, #F4C7C3, #E8604C 48%, #B23A2E 100%)",
            }}
          >
            <svg width="30" height="30" viewBox="0 0 24 24">
              <path
                d="M12 20.8s-7.2-4.4-9.2-8.8C1.4 8.6 3.1 4.8 6.8 4.8c2 0 3.5 1.1 5.2 3.2 1.7-2.1 3.2-3.2 5.2-3.2 3.7 0 5.4 3.8 4 7.2-2 4.4-9.2 8.8-9.2 8.8Z"
                fill="#FFF8F4"
              />
            </svg>
          </div>
          <div style={{ marginLeft: 20, fontSize: 34, letterSpacing: 10, display: "flex" }}>{BRAND.name.toUpperCase()}</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 26, letterSpacing: 8, color: "rgba(23,19,15,0.5)", display: "flex" }}>{eyebrow}</div>
          <div style={{ marginTop: 16, fontSize: headline.length > 30 ? 84 : 112, lineHeight: 1.04, letterSpacing: -2, display: "flex" }}>
            {headline}
          </div>
          <div
            style={{
              marginTop: 20,
              fontSize: 40,
              lineHeight: 1.25,
              fontFamily: "Newsreader Italic",
              color: "rgba(23,19,15,0.62)",
              display: "flex",
            }}
          >
            {line}
          </div>
        </div>
        <div style={{ fontSize: 24, letterSpacing: 8, color: "rgba(23,19,15,0.42)", display: "flex" }}>{BRAND.domain.toUpperCase()}</div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        { name: "Newsreader", data: serif, weight: 400, style: "normal" },
        { name: "Newsreader Italic", data: serifItalic, weight: 400, style: "normal" },
      ],
      headers: { "cache-control": "public, max-age=86400, s-maxage=604800, stale-while-revalidate=2592000" },
    },
  );
}
