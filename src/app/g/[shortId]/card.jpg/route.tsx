import { readFile } from "node:fs/promises";
import { ImageResponse } from "next/og";
import type { NextRequest } from "next/server";
import sharp from "sharp";
import { BRAND } from "@/config/brand";
import { cardArt, cardFiles } from "@/lib/gift/card-art";
import { fetchPublicGiftMeta } from "@/lib/gift/public";
import { cardLookFor, SHARE_CARD, type CardLook } from "@/lib/gift/share-card";
import { isShortId } from "@/lib/gift/short-id";

export const runtime = "nodejs";

const HEART =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24"><path d="M12 20.8s-7.2-4.4-9.2-8.8C1.4 8.6 3.1 4.8 6.8 4.8c2 0 3.5 1.1 5.2 3.2 1.7-2.1 3.2-3.2 5.2-3.2 3.7 0 5.4 3.8 4 7.2-2 4.4-9.2 8.8-9.2 8.8Z" fill="#FFF8F4"/></svg>`,
  );

// The image generator only knows the fonts it is handed, so the site's display serif ships with
// it. Both paths are spelled out: a template literal here resolves to one file for both faces.
const serifFont = () => readFile(new URL("../../../../fonts/newsreader-regular.ttf", import.meta.url));
const italicFont = () => readFile(new URL("../../../../fonts/newsreader-italic.ttf", import.meta.url));

/**
 * The seals, bows and flowers on the cards (src/share-card, PNG because the generator reads no
 * WebP). Each path is spelled out for the same reason as the fonts': the bundler ships only files
 * it can see named, so a template literal would leave them behind.
 */
const ART: Record<string, () => Promise<Buffer>> = {
  "blossom-gold": () => readFile(new URL("../../../../share-card/blossom-gold.png", import.meta.url)),
  "bow-lace-black": () => readFile(new URL("../../../../share-card/bow-lace-black.png", import.meta.url)),
  "bow-satin-blush": () => readFile(new URL("../../../../share-card/bow-satin-blush.png", import.meta.url)),
  "bow-satin-pink": () => readFile(new URL("../../../../share-card/bow-satin-pink.png", import.meta.url)),
  "carnation-picotee": () => readFile(new URL("../../../../share-card/carnation-picotee.png", import.meta.url)),
  "dahlia-wine": () => readFile(new URL("../../../../share-card/dahlia-wine.png", import.meta.url)),
  "dried-flowers": () => readFile(new URL("../../../../share-card/dried-flowers.png", import.meta.url)),
  "lily-pink": () => readFile(new URL("../../../../share-card/lily-pink.png", import.meta.url)),
  "peony-kraft": () => readFile(new URL("../../../../share-card/peony-kraft.png", import.meta.url)),
  "rose-black-large": () => readFile(new URL("../../../../share-card/rose-black-large.png", import.meta.url)),
  "rose-ember": () => readFile(new URL("../../../../share-card/rose-ember.png", import.meta.url)),
  "rose-oxblood": () => readFile(new URL("../../../../share-card/rose-oxblood.png", import.meta.url)),
  "roses-kraft": () => readFile(new URL("../../../../share-card/roses-kraft.png", import.meta.url)),
  sakura: () => readFile(new URL("../../../../share-card/sakura.png", import.meta.url)),
  "wax-seal-flower": () => readFile(new URL("../../../../share-card/wax-seal-flower.png", import.meta.url)),
  "wax-seal-heart": () => readFile(new URL("../../../../share-card/wax-seal-heart.png", import.meta.url)),
  "wax-seal-swans": () => readFile(new URL("../../../../share-card/wax-seal-swans.png", import.meta.url)),
};

/** The cut-outs one look draws, as data URIs. */
async function artFor(look: CardLook): Promise<Record<string, string>> {
  const files = cardFiles(look).filter((file) => ART[file]);
  const data = await Promise.all(files.map(async (file) => `data:image/png;base64,${(await ART[file]()).toString("base64")}`));
  return Object.fromEntries(files.map((file, i) => [file, data[i]]));
}

/**
 * A crawler fetches this for every chat a gift is pasted into. As the PNG the generator draws it
 * was 521 KB, drawn afresh on every fetch — past the ~300 KB WhatsApp is known to drop previews
 * over — so it is sent as a JPEG (80–125 KB with the cut-outs) and the CDN keeps it for a day.
 * The URL carries a version of what it shows (see shareCardUrl).
 */
const CACHE = "public, max-age=3600, s-maxage=86400, stale-while-revalidate=604800";

/** The card before the envelope: a pressed invitation, drawn only if the envelope ever fails. */
function plainCard(name: string, es: boolean) {
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#F7F1E7",
        backgroundImage:
          "radial-gradient(70% 90% at 16% 6%, #F6DAD3 0%, rgba(246,218,211,0) 62%), radial-gradient(62% 85% at 88% 94%, #DDE7D9 0%, rgba(221,231,217,0) 60%)",
        color: "#17130F",
        fontFamily: "Newsreader",
        paddingBottom: 90,
      }}
    >
      <div style={{ position: "absolute", top: 44, right: 44, bottom: 44, left: 44, border: "2px solid rgba(23,19,15,0.14)", borderRadius: 30 }} />
      <div
        style={{
          width: 150,
          height: 150,
          borderRadius: 999,
          background: "radial-gradient(circle at 36% 30%, #F4C7C3, #E8604C 48%, #B23A2E 100%)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          boxShadow: "0 30px 70px rgba(232,96,76,0.32)",
        }}
      >
        {/* eslint-disable-next-line @next/next/no-img-element -- drawn by the image generator, not a browser */}
        <img src={HEART} width={66} height={66} alt="" />
      </div>
      <div style={{ marginTop: 54, fontSize: 52, letterSpacing: 18, color: "rgba(23,19,15,0.5)", fontStyle: "normal", display: "flex" }}>{es ? "UN REGALO PARA" : "A GIFT FOR"}</div>
      <div style={{ marginTop: 18, fontSize: 250, lineHeight: 1, letterSpacing: -6, fontStyle: "normal", display: "flex" }}>{name}</div>
      <div style={{ marginTop: 26, fontSize: 96, fontFamily: "Newsreader Italic", color: "rgba(23,19,15,0.62)", display: "flex" }}>{es ? "alguien te ha hecho algo" : "someone made you something"}</div>
      <div style={{ position: "absolute", bottom: 96, fontSize: 46, letterSpacing: 12, color: "rgba(23,19,15,0.4)", fontStyle: "normal", display: "flex" }}>
        {BRAND.domain.toUpperCase()}
      </div>
    </div>
  );
}

/**
 * The card every gift link shows in Messages, WhatsApp and everywhere else: a sealed envelope
 * with their name beside it, on the paper that suits the gift (see card-art). It never reveals
 * the gift, only who it is for.
 */
export async function GET(_request: NextRequest, ctx: RouteContext<"/g/[shortId]/card.jpg">) {
  const { shortId } = await ctx.params;
  const gift = isShortId(shortId) ? await fetchPublicGiftMeta(shortId) : null;
  const [serif, serifItalic] = await Promise.all([serifFont(), italicFont()]);
  const es = gift?.locale === "es";
  // A link whose gift can't be read still gets a card that reads right: "for you".
  const name = gift?.recipientName || (es ? "ti" : "you");
  const options = {
    ...SHARE_CARD,
    fonts: [
      { name: "Newsreader", data: serif, weight: 400 as const, style: "normal" as const },
      { name: "Newsreader Italic", data: serifItalic, weight: 400 as const, style: "normal" as const },
    ],
  };

  let png: ArrayBuffer;
  try {
    const look = cardLookFor(gift?.templateSlug, gift?.look, shortId);
    png = await new ImageResponse(cardArt({ name, look, locale: es ? "es" : "en", art: await artFor(look) }), options).arrayBuffer();
  } catch (error) {
    // A gift link must always show a card: if the envelope can't be drawn, the plain one is.
    console.error("share card: envelope failed, drawing the plain card", error);
    png = await new ImageResponse(plainCard(name, es), options).arrayBuffer();
  }

  const jpeg = await sharp(Buffer.from(png)).flatten({ background: "#F7F1E7" }).jpeg({ quality: 82, mozjpeg: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: { "Content-Type": "image/jpeg", "Content-Length": String(jpeg.length), "Cache-Control": CACHE },
  });
}
