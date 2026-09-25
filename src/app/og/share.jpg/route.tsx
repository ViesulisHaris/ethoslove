import { readFile } from "node:fs/promises";
import path from "node:path";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import type { ReactElement } from "react";
import sharp from "sharp";
import { BRAND } from "@/config/brand";
import { HEART, SEAL } from "@/components/shared/logo";
import { formatDay } from "@/lib/dates/calendar";
import { rateLimit } from "@/lib/rate-limit";
import { clientIp } from "@/lib/request-ip";
import { coverCredit, fetchCover } from "@/lib/share/cover";
import { readShareCard, type ShareCard } from "@/lib/share/links";
import { getTrip } from "@/lib/trips/presets";

export const runtime = "nodejs";
export const maxDuration = 15;

const W = 1200;
const H = 630;

/**
 * The query is the whole card (lib/share/links.ts shareCardPath), so a drawn card is kept for a
 * year by the CDN and a week by whoever fetched it. A card drawn without its photograph because
 * Wikimedia was slow is kept for minutes only, so the next crawler gets the photograph.
 */
const KEEP = "public, max-age=604800, s-maxage=31536000, immutable";
const BRIEFLY = "public, max-age=300, s-maxage=300";
/** Per address, for the cards that make us fetch a photograph; a crawler asks for one per link, and the CDN answers the rest. */
const FETCHES_PER_MINUTE = 120;

const COPY = {
  en: { plan: "A DATE PLAN", place: "A PLACE FOR A DATE", trip: "A TRIP FOR TWO", planTitle: "A date, planned", placeTitle: "A date idea", days: (n: number) => `${n} DAYS`, photo: "Photo" },
  es: { plan: "UN PLAN PARA UNA CITA", place: "UN SITIO PARA UNA CITA", trip: "UN VIAJE PARA DOS", planTitle: "Una cita, planeada", placeTitle: "Una idea para una cita", days: (n: number) => `${n} DÍAS`, photo: "Foto" },
} as const;

// The image generator only knows the fonts it is handed. Both paths spelled out, as in app/og.png.
const serifFont = () => readFile(new URL("../../../fonts/newsreader-regular.ttf", import.meta.url));
const italicFont = () => readFile(new URL("../../../fonts/newsreader-italic.ttf", import.meta.url));

type Face = { eyebrow: string; title: string; credit: string | null };

const titleSize = (title: string, big: number) => (title.length <= 26 ? big : title.length <= 44 ? Math.round(big * 0.8) : Math.round(big * 0.66));

function Seal({ size }: { size: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32">
      <path d={SEAL} fill="#d6336c" />
      <path d={HEART} fill="#FBF6EE" opacity="0.95" />
    </svg>
  );
}

/** Drawn over the photograph: shade top and bottom, the seal small, the title large. Transparent everywhere else. */
function OverPhoto({ face }: { face: Face }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "42px 60px 38px",
        // Shade behind the seal at the top and behind the words at the bottom, deep enough for a
        // two-line title over white houses; the middle of the photograph is left as it is.
        backgroundImage: "linear-gradient(180deg, rgba(20,7,14,0.5) 0%, rgba(20,7,14,0) 22%, rgba(20,7,14,0) 32%, rgba(20,7,14,0.58) 55%, rgba(20,7,14,0.9) 100%)",
        color: "#FFF8F4",
        fontFamily: "Newsreader",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <Seal size={50} />
        <div style={{ marginLeft: 14, fontSize: 27, letterSpacing: 9, display: "flex" }}>{BRAND.name.toUpperCase()}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 23, letterSpacing: 5, color: "rgba(255,248,244,0.9)", display: "flex", textShadow: "0 1px 14px rgba(0,0,0,0.55)" }}>{face.eyebrow}</div>
        <div style={{ marginTop: 8, fontSize: titleSize(face.title, 86), lineHeight: 1.02, letterSpacing: -1.5, maxWidth: 1060, display: "flex", textShadow: "0 2px 22px rgba(0,0,0,0.35)" }}>{face.title}</div>
        <div style={{ marginTop: 20, display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 17, color: "rgba(255,248,244,0.72)" }}>
          <div style={{ display: "flex", letterSpacing: 4 }}>{BRAND.domain.toUpperCase()}</div>
          {face.credit ? <div style={{ display: "flex", maxWidth: 700, fontFamily: "Newsreader Italic" }}>{face.credit}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** No photograph to be had: the site's own card, with the title on it. Never a picture standing in for the place. */
function Plain({ face }: { face: Face }) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "60px 80px",
        backgroundColor: "#F7F1E7",
        backgroundImage: "radial-gradient(70% 90% at 12% 0%, #F6DAD3 0%, rgba(246,218,211,0) 62%), radial-gradient(60% 85% at 92% 100%, #DDE7D9 0%, rgba(221,231,217,0) 60%)",
        color: "#17130F",
        fontFamily: "Newsreader",
      }}
    >
      <div style={{ display: "flex", alignItems: "center" }}>
        <Seal size={60} />
        <div style={{ marginLeft: 18, fontSize: 32, letterSpacing: 10, display: "flex" }}>{BRAND.name.toUpperCase()}</div>
      </div>
      <div style={{ display: "flex", flexDirection: "column" }}>
        <div style={{ fontSize: 25, letterSpacing: 7, color: "rgba(23,19,15,0.52)", display: "flex" }}>{face.eyebrow}</div>
        <div style={{ marginTop: 14, fontSize: titleSize(face.title, 96), lineHeight: 1.04, letterSpacing: -2, maxWidth: 1040, display: "flex" }}>{face.title}</div>
      </div>
      <div style={{ fontSize: 23, letterSpacing: 8, color: "rgba(23,19,15,0.42)", display: "flex" }}>{BRAND.domain.toUpperCase()}</div>
    </div>
  );
}

async function draw(element: ReactElement): Promise<Buffer> {
  const [serif, serifItalic] = await Promise.all([serifFont(), italicFont()]);
  const png = await new ImageResponse(element, {
    width: W,
    height: H,
    fonts: [
      { name: "Newsreader", data: serif, weight: 400, style: "normal" },
      { name: "Newsreader Italic", data: serifItalic, weight: 400, style: "normal" },
    ],
  }).arrayBuffer();
  return Buffer.from(png);
}

/** The photograph filling the card, cropped towards whatever in it draws the eye, with the words laid over it. */
async function drawOverPhoto(photo: Buffer, face: Face): Promise<Buffer> {
  const base = await sharp(photo, { limitInputPixels: 60_000_000 }).rotate().resize(W, H, { fit: "cover", position: sharp.strategy.attention }).toBuffer();
  const overlay = await draw(<OverPhoto face={face} />);
  return sharp(base).composite([{ input: overlay }]).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
}

async function drawPlain(face: Face): Promise<Buffer> {
  return sharp(await draw(<Plain face={face} />))
    .flatten({ background: "#F7F1E7" })
    .jpeg({ quality: 84, mozjpeg: true })
    .toBuffer();
}

const jpeg = (body: Buffer, cache: string) =>
  new Response(new Uint8Array(body), { headers: { "Content-Type": "image/jpeg", "Content-Length": String(body.length), "Cache-Control": cache } });

/** A trip's own picture, from this site's files (traced into the function by next.config's outputFileTracingIncludes). */
async function tripPhoto(image: string): Promise<Buffer | null> {
  if (!/^\/trips\/[a-z0-9-]+\.webp$/.test(image)) return null;
  try {
    return await readFile(path.join(process.cwd(), "public", image));
  } catch {
    return null;
  }
}

function faceOf(card: Exclude<ShareCard, { kind: "trip" }>, credit: { credit?: string; licence?: string } | null, pictured: boolean): Face {
  const copy = COPY[card.locale];
  const day = card.kind === "plan" && card.date ? formatDay(card.date, card.locale).toUpperCase() : null;
  const by = [credit?.credit, credit?.licence, "Wikimedia Commons"].filter(Boolean).join(" · ");
  return {
    eyebrow: [copy[card.kind], day].filter(Boolean).join(" · "),
    title: card.title ?? (card.kind === "plan" ? copy.planTitle : copy.placeTitle),
    credit: pictured ? `${copy.photo}: ${by.length > 96 ? `${by.slice(0, 95)}…` : by}` : null,
  };
}

/**
 * The picture a shared plan, place or trip shows in Messages, WhatsApp and the rest: the real
 * photograph of the place, big, with its name, the day for a plan, and the seal small. The
 * photograph is fetched from Wikimedia's image hosts and nowhere else (lib/share/cover.ts).
 */
export async function GET(request: NextRequest) {
  const card = readShareCard(request.nextUrl.searchParams);

  if (card.kind === "trip") {
    const trip = getTrip(card.trip);
    const copy = COPY[card.locale];
    const face: Face = trip ? { eyebrow: `${copy.trip} · ${copy.days(trip.days)}`, title: trip.title[card.locale], credit: null } : { eyebrow: copy.trip, title: BRAND.name, credit: null };
    const photo = trip?.image ? await tripPhoto(trip.image) : null;
    if (photo) {
      try {
        return jpeg(await drawOverPhoto(photo, face), KEEP);
      } catch {
        // An unreadable file: the plain card, briefly.
      }
    }
    return jpeg(await drawPlain(face), trip && !trip.image ? KEEP : BRIEFLY);
  }

  if (!card.cover) return jpeg(await drawPlain(faceOf(card, null, false)), KEEP);

  if (!(await rateLimit(`og-share:${clientIp(request.headers)}`, { limit: FETCHES_PER_MINUTE, windowSeconds: 60 }))) {
    return new Response("Too many requests", { status: 429, headers: { "Cache-Control": "no-store", "Retry-After": "60" } });
  }
  const [photo, credit] = await Promise.all([fetchCover(card.cover), coverCredit(card.cover)]);
  if (photo) {
    try {
      return jpeg(await drawOverPhoto(photo, faceOf(card, credit, true)), KEEP);
    } catch {
      // Not a picture sharp can read after all: the plain card below.
    }
  }
  return jpeg(await drawPlain(faceOf(card, null, false)), BRIEFLY);
}
