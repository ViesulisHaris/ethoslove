import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import { BRAND } from "@/config/brand";
import { HEART, SEAL } from "@/components/shared/logo";
import { getManifest } from "@/templates/manifests";

const COPY = {
  en: { eyebrow: "FOR THE TWO OF YOU", headline: "Find the date. Keep the person.", templateEyebrow: "A GIFT BY ETHOS", line: "Date ideas near you, trips, games and gifts for two." },
  es: { eyebrow: "PARA VOSOTROS DOS", headline: "Encuentra la cita. Quédate con la persona.", templateEyebrow: "UN REGALO DE ETHOS", line: "Ideas para citas cerca de ti, escapadas, juegos y regalos para dos." },
} as const;

// Same serif as the gift link card (see g/[shortId]/card.jpg).
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
  const headline = manifest ? manifest.name[locale] : copy.headline;
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
          <div style={{ width: 64, height: 64, display: "flex" }}>
            {/* The site's own seal, not a stand-in: the link preview is often the first time anyone sees the mark. */}
            <svg width="64" height="64" viewBox="0 0 32 32">
              <path d={SEAL} fill="#d6336c" />
              <path d={HEART} fill="#FBF6EE" opacity="0.95" />
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
