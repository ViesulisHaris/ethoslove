"use client";

import type { CSSProperties, ReactNode } from "react";
import { motion } from "motion/react";
import type { GiftPhoto } from "@/lib/gift/schema";
import { cn } from "@/lib/utils";
import { PAPER_GRAIN, SCRIPT_FONT } from "../_shared/cover-kit";
import { FitName } from "../_shared/FitName";
import { mulberry32 } from "../_shared/random";
import { Scrap, TornPaper } from "../_shared/collage/kit";
import { TONE, type Look } from "./looks";

/** Wings that beat, and a record that turns. Both stop for reduced motion. */
export const EVERGREEN_KEYFRAMES = `
@keyframes ev-flap { from { transform: scaleX(1) } to { transform: scaleX(.32) } }
.ev-flap { animation: ev-flap .3s ease-in-out infinite alternate; }
.ev-flap-slow { animation: ev-flap 1.6s ease-in-out infinite alternate; }
@keyframes ev-spin { to { transform: rotate(360deg) } }
.ev-spin { animation: ev-spin 9s linear infinite; }
@media (prefers-reduced-motion: reduce) { .ev-flap, .ev-flap-slow, .ev-spin { animation: none; } }
`;

export type Wings = "cream" | "green";

/** A butterfly cut-out in this collage's colours: a cream cabbage white, or a green one. */
export function Butterfly({ wings = "cream", flap, className, style }: { wings?: Wings; flap?: "fast" | "slow"; className?: string; style?: CSSProperties }) {
  return (
    <span aria-hidden="true" className={cn("block", flap === "fast" && "ev-flap", flap === "slow" && "ev-flap-slow", className)} style={style}>
      <Scrap id={wings === "cream" ? "butterfly-black-wide" : "butterfly-wine"} eager tone={wings === "cream" ? TONE.creamWings : TONE.greenWings} />
    </span>
  );
}

type Article = { headline: string; body: string };
type Edition = { masthead: string; line: [string, string, string]; pictured: string; articles: Article[]; weather: Article; ads: { title: string; lines: string[] }; crossword: { title: string; clue: string } };

/**
 * What the newsprint actually says: short, true-to-life little stories about the two of them, with
 * their names in the lead, so anyone who zooms in reads something real, not filler. No pronouns: the
 * paper doesn't know who is who.
 */
const EDITION: Record<"en" | "es", (her: string, him: string) => Edition> = {
  en: (her, him) => ({
    masthead: "THE EVENING LETTER",
    line: ["Vol. II", "Sunday edition", "Price: one kiss"],
    pictured: `${her} and ${him}, pictured on Sunday.`,
    articles: [
      { headline: "Local couple still holding hands", body: `Witnesses on the high street confirmed on Sunday that ${her} and ${him} were holding hands again, as they have most days since they met. Asked for a comment, ${him} said only: no plans to stop. Neighbours describe the pair as annoyingly happy. The two were later seen under one umbrella clearly built for one, arguing warmly about who had the bigger half. Sources close to the couple say it is always like this.` },
      { headline: "Evening walks continue", body: "Long walks after dinner remain the favourite activity in the household, a survey of two people found. The route rarely changes. Ice cream is involved more often than not, and nobody keeps count of whose turn it is to pay." },
      { headline: "Garden report", body: "The ivy on the back wall is thriving this year. So, by every account, is everything else. Gardeners recommend patience, sunlight and someone to sit with on the step while things grow." },
      { headline: "Letters to the editor", body: "Dear editor, I write to report that the person I share my breakfast with is the best thing in this town. I see no reason to keep it out of the paper any longer. Yours, a reader." },
      { headline: "Tonight", body: "Dinner at home, candles optional. Dress code: whatever is comfortable. No reservations needed; the table has been set for two for a while now." },
      { headline: "On this day", body: "On this day, some time ago, two people met and one of them could not stop smiling. Historians are still divided on which one." },
    ],
    weather: { headline: "Weather", body: "Clear skies through the weekend, with a warm spell wherever the two of them happen to be. Light rain on Tuesday, ideal for staying in." },
    ads: { title: "Small ads", lines: ["WANTED. One more slow Sunday. Will pay in pancakes.", "LOST. All track of time, on the sofa, again. No reward needed.", "NOT FOR SALE. One heart, already spoken for."] },
    crossword: { title: "Crossword", clue: "1 across: always green, like us (9)" },
  }),
  es: (her, him) => ({
    masthead: "LA CARTA DE LA TARDE",
    line: ["Año II", "Edición del domingo", "Precio: un beso"],
    pictured: `${her} y ${him}, el domingo.`,
    articles: [
      { headline: "Pareja local sigue de la mano", body: `Varios testigos confirmaron el domingo que ${her} y ${him} volvían a ir de la mano por la calle mayor, como casi todos los días desde que se conocieron. Cuando se le preguntó, ${him} solo dijo: no pensamos parar. Los vecinos describen a la pareja como insoportablemente feliz. Más tarde se vio a los dos bajo un paraguas pensado claramente para uno, discutiendo con cariño quién se quedaba con la mitad más grande. Fuentes cercanas aseguran que siempre es así.` },
      { headline: "Siguen los paseos de la tarde", body: "Los paseos largos después de cenar siguen siendo lo favorito de la casa, según una encuesta a dos personas. La ruta casi nunca cambia. Casi siempre hay helado de por medio, y nadie lleva la cuenta de a quién le toca pagar." },
      { headline: "Informe del jardín", body: "La hiedra de la pared del fondo crece como nunca este año. Y, según todos, todo lo demás también. Los jardineros recomiendan paciencia, sol y alguien con quien sentarse en el escalón mientras las cosas crecen." },
      { headline: "Cartas al director", body: "Querido director: escribo para contar que la persona con la que comparto el desayuno es lo mejor de esta ciudad. No veo motivo para seguir ocultándolo. Atentamente, un lector." },
      { headline: "Esta noche", body: "Cena en casa, velas opcionales. Código de vestimenta: lo que sea cómodo. No hace falta reservar; la mesa lleva tiempo puesta para dos." },
      { headline: "Tal día como hoy", body: "Tal día como hoy, hace un tiempo, dos personas se conocieron y una de ellas no podía dejar de sonreír. Los historiadores aún no se ponen de acuerdo sobre cuál." },
    ],
    weather: { headline: "El tiempo", body: "Cielos despejados todo el fin de semana, con calor allí donde estén los dos. Lluvia ligera el martes, ideal para quedarse en casa." },
    ads: { title: "Anuncios", lines: ["SE BUSCA. Otro domingo lento. Se paga en tortitas.", "PERDIDO. Todo sentido del tiempo, en el sofá, otra vez. No hace falta recompensa.", "NO SE VENDE. Un corazón, ya ocupado."] },
    crossword: { title: "Crucigrama", clue: "1 horizontal: siempre verde, como nosotros (12)" },
  }),
};

const SERIF = "Georgia, 'Times New Roman', serif";

/** The black squares of a 7 by 7 crossword, symmetric the way real ones are. */
const BLACK_SQUARES = new Set([3, 8, 12, 17, 21, 23, 25, 27, 31, 36, 40, 45]);

function Crossword({ ink, paper }: { ink: string; paper: string }) {
  return (
    <span className="grid w-full grid-cols-7" style={{ border: `1px solid ${ink}`, gap: 1, background: ink }}>
      {Array.from({ length: 49 }, (_, i) => (
        <span key={i} className="block aspect-square" style={{ background: BLACK_SQUARES.has(i) ? ink : paper }} />
      ))}
    </span>
  );
}

/** One story: its headline, then the words, justified the way a column is. */
function Story({ article, lead }: { article: Article; lead?: boolean }) {
  return (
    <>
      {article.headline ? <b className="mb-[calc(.4*var(--p))] block text-left text-[calc(2.1*var(--p))] leading-[1.12] [text-wrap:balance]">{article.headline}</b> : null}
      <p className={cn("mb-[calc(1.2*var(--p))] text-justify hyphens-auto", lead && "first-letter:float-left first-letter:mr-[calc(.4*var(--p))] first-letter:text-[calc(4.2*var(--p))] first-letter:leading-[.86] first-letter:font-bold")}>{article.body}</p>
    </>
  );
}

/**
 * Old newsprint, in two cuts. A scrap is torn from somewhere inside: the masthead if you like, then
 * stories running down `columns` columns from story `first`, so each scrap reads differently. A
 * sheet is a whole front page, for wrapping the parcel: the masthead and its edition line, the lead
 * across the top, their photo printed in halftone, then every story, the weather, the small ads and
 * a crossword, enough to run off the bottom of the parcel as a real page would.
 */
export function Newsprint({ look, locale, names, first = 0, columns = 3, masthead = true, sheet = false, photo, className, style }: { look: Look; locale: "en" | "es"; names: { her: string; him: string }; first?: number; columns?: number; masthead?: boolean; sheet?: boolean; photo?: GiftPhoto; className?: string; style?: CSSProperties }) {
  const paper = (EDITION[locale] ?? EDITION.en)(names.her, names.him);
  const flow: CSSProperties = { columnCount: columns, columnGap: "calc(1.8*var(--p))", columnRule: `1px solid ${look.newsInk}33` };
  const [lead, ...others] = paper.articles;
  return (
    <TornPaper seed={7 + first * 13} sides={{ top: true, right: true, bottom: true, left: true }} color={look.news} rim="#F7F2E4" grain={PAPER_GRAIN} depth={3} className={className} style={style}>
      <div aria-hidden="true" className="overflow-hidden px-[calc(3.4*var(--p))] pt-[calc(3*var(--p))] pb-[calc(3*var(--p))]" style={{ color: look.newsInk, fontFamily: SERIF }}>
        {masthead || sheet ? (
          <>
            {sheet ? (
              <p className="flex justify-between border-b pb-[calc(.5*var(--p))] text-[calc(1.15*var(--p))] tracking-[0.12em] uppercase opacity-75" style={{ borderColor: look.newsInk }}>
                {paper.line.map((part) => (
                  <span key={part}>{part}</span>
                ))}
              </p>
            ) : null}
            <p className={cn("text-center leading-none font-bold tracking-[0.06em] whitespace-nowrap", sheet ? "py-[calc(1*var(--p))] text-[calc(4.6*var(--p))]" : "pb-[calc(.8*var(--p))] text-[calc(3.6*var(--p))]")}>{paper.masthead}</p>
            <span className="block" style={{ borderTop: `calc(.35*var(--p)) solid ${look.newsInk}`, borderBottom: `1px solid ${look.newsInk}`, height: "calc(.9*var(--p))" }} />
          </>
        ) : null}
        {sheet ? (
          <>
            <p className="mt-[calc(1.4*var(--p))] text-left text-[calc(3.6*var(--p))] leading-[1.05] font-bold [text-wrap:balance]">{lead.headline}</p>
            <div className="mt-[calc(1.4*var(--p))] text-[calc(1.6*var(--p))] leading-[1.3] opacity-85" style={flow}>
              {photo ? (
                <figure className="mb-[calc(1.2*var(--p))] [break-inside:avoid]">
                  <span className="relative block aspect-[4/3] overflow-hidden" style={{ background: look.news }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photo.url} alt="" draggable={false} className="h-full w-full object-cover" style={{ filter: "grayscale(1) contrast(1.3) brightness(1.06)", mixBlendMode: "multiply" }} />
                    {/* the dot screen newsprint photos are printed with */}
                    <span className="absolute inset-0 block" style={{ backgroundImage: `radial-gradient(circle, transparent 38%, ${look.news} 42%)`, backgroundSize: "calc(.6*var(--p)) calc(.6*var(--p))", opacity: 0.55 }} />
                  </span>
                  <figcaption className="mt-[calc(.5*var(--p))] text-[calc(1.3*var(--p))] leading-tight italic">{paper.pictured}</figcaption>
                </figure>
              ) : null}
              <Story article={{ headline: "", body: lead.body }} lead />
              {others.slice(0, 2).map((article) => (
                <Story key={article.headline} article={article} />
              ))}
              <div className="mb-[calc(1.2*var(--p))] border-y py-[calc(.8*var(--p))] [break-inside:avoid]" style={{ borderColor: look.newsInk }}>
                <Story article={paper.weather} />
              </div>
              {others.slice(2).map((article) => (
                <Story key={article.headline} article={article} />
              ))}
              <div className="mb-[calc(1.2*var(--p))] [break-inside:avoid]">
                <b className="mb-[calc(.4*var(--p))] block text-[calc(2.1*var(--p))] leading-tight">{paper.crossword.title}</b>
                <Crossword ink={look.newsInk} paper={look.news} />
                <p className="mt-[calc(.5*var(--p))] text-[calc(1.3*var(--p))] italic">{paper.crossword.clue}</p>
              </div>
              <div className="border p-[calc(.8*var(--p))] [break-inside:avoid]" style={{ borderColor: look.newsInk }}>
                <b className="mb-[calc(.4*var(--p))] block text-center text-[calc(1.6*var(--p))] tracking-[0.14em] uppercase">{paper.ads.title}</b>
                {paper.ads.lines.map((line) => (
                  <p key={line} className="mb-[calc(.5*var(--p))] text-left">
                    {line}
                  </p>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="mt-[calc(1.4*var(--p))] text-[calc(1.5*var(--p))] leading-[1.34] opacity-80" style={flow}>
            {Array.from({ length: columns + 1 }, (_, i) => (
              <Story key={i} article={paper.articles[(first + i) % paper.articles.length]} />
            ))}
          </div>
        )}
      </div>
    </TornPaper>
  );
}

/**
 * A vinyl record with their song on the label: the title written over the spindle hole, their names
 * and the side printed under it, the way a real label is laid out. The light on the grooves turns
 * unless `still`; the label never does, so the words stay the right way up.
 */
export function Record({ look, title, names, side, still, className, style }: { look: Look; title: string; names: string; side: string; still: boolean; className?: string; style?: CSSProperties }) {
  return (
    <div aria-hidden="true" className={cn("relative aspect-square", className)} style={{ filter: "drop-shadow(0 calc(1.4*var(--p)) calc(2.4*var(--p)) rgba(20,30,15,.4))", ...style }}>
      <div className="absolute inset-0 rounded-full" style={{ background: "repeating-radial-gradient(circle, #1D211B 0 1.2%, #262A23 1.2% 1.8%)" }}>
        <span className={cn("absolute inset-0 rounded-full", !still && "ev-spin")} style={{ background: "conic-gradient(from 30deg, rgba(255,255,255,0), rgba(255,255,255,.1) 12%, rgba(255,255,255,0) 22%, rgba(255,255,255,0) 50%, rgba(255,255,255,.08) 62%, rgba(255,255,255,0) 72%)" }} />
        <div className="absolute inset-[31%] rounded-full" style={{ background: look.label, color: look.labelInk, boxShadow: "inset 0 0 0 calc(.4*var(--p)) rgba(0,0,0,.12)" }}>
          <div className="absolute inset-x-[12%] top-[10%] flex h-[34%] items-end justify-center">
            <FitName as="p" min={0.5} className="w-full text-center text-[calc(4.4*var(--p))] leading-[1.25]" style={{ fontFamily: SCRIPT_FONT }}>
              {title}
            </FitName>
          </div>
          <span className="absolute top-1/2 left-1/2 block h-[calc(1.6*var(--p))] w-[calc(1.6*var(--p))] -translate-x-1/2 -translate-y-1/2 rounded-full" style={{ background: "#1D211B" }} />
          <div className="absolute inset-x-[16%] top-[60%] text-center">
            <FitName as="p" min={0.6} className="w-full text-[calc(1.5*var(--p))] font-semibold tracking-[0.12em] uppercase">
              {names}
            </FitName>
            <p className="mt-[calc(.2*var(--p))] text-[calc(1.2*var(--p))] tracking-[0.16em] uppercase opacity-75">{side} · 33⅓</p>
          </div>
        </div>
      </div>
    </div>
  );
}

/** A puffy heart cut from sage felt. */
export function FeltHeart({ color, className, style }: { color: string; className?: string; style?: CSSProperties }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className={className} style={{ filter: "drop-shadow(0 calc(.4*var(--p)) calc(.6*var(--p)) rgba(20,30,15,.3))", ...style }}>
      <defs>
        <radialGradient id="ev-felt" cx="35%" cy="30%" r="80%">
          <stop offset="0" stopColor="#FFFFFF" stopOpacity=".45" />
          <stop offset=".5" stopColor="#FFFFFF" stopOpacity="0" />
        </radialGradient>
      </defs>
      <path d="M12 21s-7.8-4.7-9.8-9.4C.8 8.4 2.6 4.6 6.4 4.6c2.2 0 3.8 1.2 5.6 3.4 1.8-2.2 3.4-3.4 5.6-3.4 3.8 0 5.6 3.8 4.2 7C19.8 16.3 12 21 12 21Z" fill={color} />
      <path d="M12 21s-7.8-4.7-9.8-9.4C.8 8.4 2.6 4.6 6.4 4.6c2.2 0 3.8 1.2 5.6 3.4 1.8-2.2 3.4-3.4 5.6-3.4 3.8 0 5.6 3.8 4.2 7C19.8 16.3 12 21 12 21Z" fill="url(#ev-felt)" />
    </svg>
  );
}

/**
 * The line the paper tears along when the parcel opens: down the middle, jagged the way newsprint
 * gives, and the same line for both halves so they fit back together.
 */
const TEAR = (() => {
  const random = mulberry32(53);
  const line = Array.from({ length: 23 }, (_, i) => `${(50 + (random() - 0.5) * 3.2).toFixed(2)}% ${((i * 100) / 22).toFixed(2)}%`);
  return { left: `polygon(0% 0%, ${line.join(", ")}, 0% 100%)`, right: `polygon(100% 0%, ${line.join(", ")}, 100% 100%)` };
})();

/** Where the butterflies go when the parcel opens: outward and up, the same flight every time. */
const FLIGHTS = Array.from({ length: 8 }, (_, i) => {
  const random = mulberry32(31 + i * 17);
  const angle = -Math.PI / 2 + (random() - 0.5) * 2.4;
  // In cq units of the screen: far enough to leave the parcel, near enough to stay in sight.
  return { x: Math.cos(angle) * (22 + random() * 24), y: Math.sin(angle) * (26 + random() * 26) - 4, rotate: (random() - 0.5) * 50, delay: i * 0.06, w: 13 + random() * 9, wings: (i % 3 === 2 ? "green" : "cream") as Wings };
});

/**
 * The first screen: a parcel wrapped in a front page about the two of them (their photo printed on
 * it when there is one), tied with twine in a bow, a tag with their name hanging from it, a leaf and
 * a white flower tucked under the knot and a butterfly on the corner. Opening it, the twine slips off, the paper falls open both ways and butterflies fly out.
 */
export function Parcel({ look, forLabel, name, sender, locale, photo, opening, reduce }: { look: Look; forLabel: string; name: string; sender: string; locale: "en" | "es"; photo?: GiftPhoto; opening: boolean; reduce: boolean }) {
  const at = (delay: number, duration: number) => ({ duration: reduce ? 0.15 : duration, delay: reduce ? 0 : delay, ease: [0.45, 0, 0.25, 1] as const });
  const half = (side: "left" | "right") => (
    <motion.div
      className="absolute inset-0"
      style={{ clipPath: side === "left" ? TEAR.left : TEAR.right, transformOrigin: side === "left" ? "0% 50%" : "100% 50%" }}
      animate={opening ? { x: side === "left" ? "-62%" : "62%", rotate: side === "left" ? -16 : 16, opacity: 0 } : { x: 0, rotate: 0, opacity: 1 }}
      transition={at(0.35, 0.9)}
    >
      <div className="absolute inset-0 overflow-hidden rounded-[calc(1*var(--p))]" style={{ background: look.news, boxShadow: "0 calc(2*var(--p)) calc(4.6*var(--p)) rgba(20,30,15,.35)" }}>
        <Newsprint look={look} locale={locale} names={{ her: name, him: sender }} columns={3} sheet photo={photo} className="absolute inset-[-4%]" />
        <span className="absolute inset-0 block" style={{ background: "linear-gradient(115deg, rgba(255,255,255,.18), transparent 35%, rgba(0,0,0,.08) 70%, rgba(0,0,0,.16))" }} />
        <span className="absolute inset-y-0 left-1/2 block w-[6%] -translate-x-1/2" style={{ background: "linear-gradient(90deg, transparent, rgba(0,0,0,.1), transparent)" }} />
      </div>
    </motion.div>
  );
  return (
    <div className="relative w-full" style={{ aspectRatio: "0.82" }}>
      {/* what the paper was wrapped round, glowing as it opens */}
      <motion.span aria-hidden="true" className="absolute inset-[18%] block rounded-full" style={{ background: "radial-gradient(circle, rgba(255,252,240,.95) 0%, rgba(255,250,232,.45) 35%, transparent 70%)" }} initial={false} animate={opening && !reduce ? { opacity: [0, 0.9, 0], scale: [0.5, 1.4, 1.8] } : { opacity: 0, scale: 0.5 }} transition={{ duration: 1.1, delay: 0.35, ease: "easeOut" }} />
      {half("left")}
      {half("right")}

      {/* the twine, the bow, and what is tucked under it */}
      <motion.div aria-hidden="true" className="absolute inset-0" animate={opening ? { opacity: 0, scale: 1.1 } : { opacity: 1, scale: 1 }} transition={at(0, 0.35)}>
        <svg viewBox="0 0 100 122" preserveAspectRatio="none" className="absolute inset-0 h-full w-full">
          <path d="M40 0 L41 122" stroke="#C8B28A" strokeWidth="1.4" />
          <path d="M0 64 L100 62" stroke="#C8B28A" strokeWidth="1.4" />
          <path d="M40 0 L41 122" stroke="#8C7350" strokeWidth=".5" strokeDasharray="1.2 1.4" />
          <path d="M0 64 L100 62" stroke="#8C7350" strokeWidth=".5" strokeDasharray="1.2 1.4" />
        </svg>
        <span className="absolute top-[40%] left-[24%] block w-[32%] -rotate-[20deg]">
          <Scrap id="leaf-maple-red" eager tone={TONE.greenLeaf} />
        </span>
        <span className="absolute top-[44%] left-[38%] block w-[22%] rotate-[8deg]">
          <Scrap id="blossom-pale" eager tone={TONE.whiteFlower} />
        </span>
        <svg viewBox="0 0 60 40" className="absolute top-[45%] left-[28%] w-[26%]" aria-hidden="true">
          <path d="M30 20 C 18 4, 4 8, 8 18 C 11 26, 24 24, 30 20 C 36 24, 49 26, 52 18 C 56 8, 42 4, 30 20 Z" fill="none" stroke="#C8B28A" strokeWidth="2.4" strokeLinejoin="round" />
          <path d="M30 20 L22 38 M30 20 L38 37" stroke="#C8B28A" strokeWidth="2.4" strokeLinecap="round" />
          <circle cx="30" cy="20" r="3" fill="#B39A70" />
        </svg>
        {/* the tag, on a loop of twine */}
        <div className="absolute top-[58%] left-[50%] w-[40%] origin-top-left rotate-[-8deg]">
          <span className="ml-[10%] block h-[calc(6*var(--p))] w-px" style={{ background: "#B39A70" }} />
          <TornPaper seed={9} sides={{ bottom: true }} color={look.paper} grain={PAPER_GRAIN} depth={2}>
            <div className="px-[calc(3*var(--p))] pt-[calc(2.6*var(--p))] pb-[calc(3.2*var(--p))] text-center" style={{ color: look.ink }}>
              <span className="block text-[calc(2.2*var(--p))] font-semibold tracking-[0.3em] uppercase opacity-60">{forLabel}</span>
              <FitName as="p" className="w-full text-[calc(8*var(--p))] leading-[1.15]" style={{ fontFamily: SCRIPT_FONT }}>
                {name}
              </FitName>
            </div>
          </TornPaper>
        </div>
      </motion.div>
      <motion.div aria-hidden="true" className="absolute top-[-6%] right-[-6%] w-[26%] rotate-[18deg]" animate={opening ? { y: "-260%", x: "40%", opacity: 0 } : { y: 0, x: 0, opacity: 1 }} transition={at(0.05, 0.9)}>
        <Butterfly flap={reduce ? undefined : opening ? "fast" : "slow"} />
      </motion.div>

      {/* the butterflies that fly out */}
      {opening && !reduce
        ? FLIGHTS.map((f, i) => (
            <motion.div key={i} aria-hidden="true" className="absolute top-1/2 left-1/2 z-[5]" style={{ width: `calc(${f.w} * var(--p))`, translate: "-50% -50%" }} initial={{ opacity: 0, scale: 0.3, x: 0, y: 0 }} animate={{ opacity: [0, 1, 1, 0], scale: 1, x: `${f.x}cqw`, y: `${f.y}cqh`, rotate: f.rotate }} transition={{ duration: 1.9, delay: 0.4 + f.delay, ease: [0.2, 0.75, 0.35, 1], opacity: { times: [0, 0.12, 0.8, 1], duration: 1.9, delay: 0.4 + f.delay } }}>
              <Butterfly wings={f.wings} flap="fast" />
            </motion.div>
          ))
        : null}
    </div>
  );
}

/** Words written straight on the page in the look's ink. */
export function Hand({ children, look, size, className, style }: { children: ReactNode; look: Look; size: number; className?: string; style?: CSSProperties }) {
  return (
    <span className={className} style={{ fontFamily: SCRIPT_FONT, fontSize: `calc(${size} * var(--p))`, color: look.wallInk, lineHeight: 1.15, ...style }}>
      {children}
    </span>
  );
}
