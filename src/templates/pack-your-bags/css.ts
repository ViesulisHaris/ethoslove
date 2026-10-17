import { PAPER_GRAIN } from "../_shared/cover-kit";

/**
 * The template's own stylesheet. Everything that moves here moves by transform or opacity, and
 * the flaps and the tossed tags are CSS animations the browser runs by itself: React only flips
 * an attribute to start one. Sizes are in --k, which is --u: the gift's container, never the screen.
 *
 * A split-flap tile is four halves: the new character's top and the old one's bottom sit still,
 * and two leaves fold over them — the old top falling away, the new bottom falling into place.
 * Restarting a CSS animation normally means forcing a layout; instead each flip swaps between two
 * identical keyframe names (data-f="a" / "b"), which restarts it for free.
 */
export const CSS = `
.pyb{--k:var(--u)}
.pyb-grain{background-image:${PAPER_GRAIN}}

/* ---------- the luggage tags ---------- */
.pyb-tag{position:absolute;display:block;width:calc(30*var(--k));height:calc(15*var(--k));padding:0;border:0;background:none;color:inherit;cursor:pointer;touch-action:manipulation;-webkit-tap-highlight-color:transparent;outline:none}
.pyb-tag[disabled]{cursor:default}
/* A tag drawn smaller than a fingertip (a phone held sideways) still takes a fingertip's tap. */
.pyb-tag::before{content:"";position:absolute;left:0;right:0;top:calc(-1 * max(0px, (44px - 15 * var(--k)) / 2));bottom:calc(-1 * max(0px, (44px - 15 * var(--k)) / 2))}
.pyb-tag:focus-visible .pyb-arc::after{content:"";position:absolute;inset:calc(-1.2*var(--k));border-radius:calc(2.4*var(--k));box-shadow:0 0 0 2px #fff,0 0 0 4px var(--gift-accent)}
.pyb-fly,.pyb-arc{position:absolute;inset:0;display:block}
.pyb-arc{transform:rotate(var(--tilt));filter:drop-shadow(0 calc(.5*var(--k)) calc(.8*var(--k)) rgba(0,0,0,.4))}
.pyb-card{position:absolute;inset:0;display:flex;align-items:center;padding:0 calc(2.6*var(--k)) 0 calc(7*var(--k));background-color:#E8CD95;background-image:${PAPER_GRAIN},linear-gradient(160deg,rgba(255,255,255,.28),transparent 55%);color:#2B2116;clip-path:polygon(calc(5*var(--k)) 0,100% 0,100% 100%,calc(5*var(--k)) 100%,0 72%,0 28%)}
.pyb-card::before{content:"";position:absolute;inset:calc(.9*var(--k)) calc(.9*var(--k)) calc(.9*var(--k)) calc(5.4*var(--k));border:1px dashed rgba(90,60,30,.35);border-radius:calc(.6*var(--k))}
.pyb-hole{position:absolute;left:calc(1.6*var(--k));top:50%;width:calc(3.4*var(--k));height:calc(3.4*var(--k));margin-top:calc(-1.7*var(--k));border-radius:50%;background:radial-gradient(circle,#1a2230 0 32%,#EBC878 35% 55%,#8A6424 60% 68%,transparent 71%)}
.pyb-string{position:absolute;left:calc(-4.6*var(--k));top:calc(2.2*var(--k));width:calc(8*var(--k));height:calc(10*var(--k));overflow:visible}
.pyb-no{position:absolute;right:calc(2*var(--k));top:calc(1.4*var(--k));font:700 calc(1.8*var(--k))/1 var(--font-sans),system-ui,sans-serif;letter-spacing:.2em;opacity:.45}
/* The padding is room for ink: a handwriting face's last letter reaches past its own advance (Caveat's
   l and f by a fifth of an em), and the clip that stops a fourth line would shave it off the end. */
.pyb-clue{position:relative;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden;padding-right:.22em;font-family:var(--gift-font-hand);line-height:1.02;text-align:left;overflow-wrap:anywhere}
.pyb-tick{position:absolute;right:calc(-1.4*var(--k));top:calc(-2.2*var(--k));display:grid;place-items:center;width:calc(6*var(--k));height:calc(6*var(--k));border-radius:50%;background:var(--gift-accent);color:var(--gift-on-accent);box-shadow:0 calc(.4*var(--k)) calc(1*var(--k)) rgba(0,0,0,.35),0 0 0 calc(.5*var(--k)) #F6EEDD;transform:scale(0)}
.pyb-tag[data-state=flying] .pyb-fly{animation:pyb-x .64s linear forwards}
.pyb-tag[data-state=flying] .pyb-arc{animation:pyb-y .64s forwards}
.pyb-tag[data-state=landed] .pyb-fly{transform:translateX(calc(var(--dx)*var(--k)))}
.pyb-tag[data-state=landed] .pyb-arc{transform:translateY(calc(var(--dy)*var(--k))) rotate(var(--rot)) scale(.74)}
.pyb-tag[data-state=landed] .pyb-tick{animation:pyb-pop .45s cubic-bezier(.3,1.7,.5,1) forwards}
.pyb-tag[data-state=home] .pyb-arc{animation:pyb-bob 3.2s ease-in-out var(--bob) infinite alternate}
@keyframes pyb-bob{from{transform:rotate(var(--tilt)) translateY(0)}to{transform:rotate(calc(var(--tilt) * -.4)) translateY(calc(-.8*var(--k)))}}
@keyframes pyb-x{0%{transform:translateX(0)}86%,100%{transform:translateX(calc(var(--dx)*var(--k)))}}
@keyframes pyb-y{
  0%{transform:translateY(0) rotate(var(--tilt)) scale(1);animation-timing-function:cubic-bezier(.22,.7,.42,1)}
  42%{transform:translateY(calc(var(--peak)*var(--k))) rotate(var(--mid)) scale(1.06);animation-timing-function:cubic-bezier(.55,0,.85,.45)}
  86%{transform:translateY(calc(var(--dy)*var(--k))) rotate(var(--rot)) scale(.7);animation-timing-function:ease-out}
  93%{transform:translateY(calc((var(--dy) - .9)*var(--k))) rotate(var(--rot)) scale(.77);animation-timing-function:ease-in}
  100%{transform:translateY(calc(var(--dy)*var(--k))) rotate(var(--rot)) scale(.74)}
}
@keyframes pyb-pop{from{transform:scale(0) rotate(-40deg)}to{transform:scale(1) rotate(0)}}

/* the button that moves the gift on: a ring breathes out of it, so the button itself holds still */
.pyb-go::after{content:"";position:absolute;inset:0;border-radius:inherit;border:2px solid var(--gift-accent);pointer-events:none;animation:pyb-ring 2.2s ease-out infinite}
@keyframes pyb-ring{0%{transform:scale(1);opacity:.9}70%,100%{transform:scale(1.14,1.5);opacity:0}}

/* ---------- the suitcase ---------- */
.pyb-case{position:absolute;left:calc(4.5*var(--k));top:calc(27*var(--k));width:calc(91*var(--k));height:calc(63*var(--k));perspective:calc(240*var(--k));transform-origin:calc(68.5*var(--k)) calc(29*var(--k));transition:transform .8s cubic-bezier(.22,1,.36,1)}
.pyb-case[data-moved=true]{transform:translate(calc(-23*var(--k)),calc(2*var(--k))) scale(1.12)}
.pyb-floor{position:absolute;left:calc(-4*var(--k));right:calc(-4*var(--k));top:calc(46*var(--k));height:calc(24*var(--k));border-radius:50%;background:radial-gradient(closest-side,rgba(0,0,0,.55),transparent);opacity:.8}
.pyb-lid{position:absolute;left:0;top:0;width:calc(45*var(--k));height:calc(58*var(--k));transform-style:preserve-3d;transform-origin:calc(45.5*var(--k)) 50%;z-index:5}
.pyb-lid[data-state=closing]{animation:pyb-lid .9s cubic-bezier(.45,0,.3,1) forwards}
.pyb-lid[data-state=closed]{transform:rotateY(180deg)}
.pyb-face{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;border-radius:calc(4.5*var(--k));overflow:hidden}
.pyb-face-out{transform:rotateY(180deg)}
.pyb-face-out::after{content:"";position:absolute;inset:0;background-image:${PAPER_GRAIN};opacity:.35}
@keyframes pyb-lid{0%{transform:rotateY(0)}66%{transform:rotateY(180deg)}80%{transform:rotateY(171deg)}100%{transform:rotateY(180deg)}}
.pyb-base{position:absolute;left:calc(46*var(--k));top:0;width:calc(45*var(--k));height:calc(63*var(--k));z-index:1}
.pyb-spine{position:absolute;left:calc(44.2*var(--k));top:calc(3*var(--k));width:calc(2.6*var(--k));height:calc(52*var(--k));border-radius:calc(.8*var(--k));background:linear-gradient(90deg,#3E1D0E,#6B3519 50%,#3E1D0E);z-index:0;transition:opacity .3s}
.pyb-case[data-moved=true] .pyb-spine{opacity:0}
.pyb-lidshade{position:absolute;left:calc(46*var(--k));top:0;width:calc(45*var(--k));height:calc(58*var(--k));border-radius:calc(4.5*var(--k));background:radial-gradient(90% 80% at 10% 50%,rgba(20,8,2,.6),rgba(20,8,2,.15));opacity:0;z-index:4;pointer-events:none}
.pyb-lid[data-state=closing]~.pyb-lidshade{animation:pyb-shade .9s linear forwards}
@keyframes pyb-shade{0%,30%{opacity:0}62%{opacity:1}66%,100%{opacity:0}}
.pyb-thud{animation:pyb-thud .5s ease-out .58s both}
@keyframes pyb-thud{0%{transform:scale(1)}30%{transform:scale(1.018,.985)}100%{transform:scale(1)}}

/* the zip, run once the lid is down */
.pyb-zip{position:absolute;left:calc(51*var(--k));top:calc(2.1*var(--k));width:calc(35*var(--k));height:calc(1.3*var(--k));z-index:6;pointer-events:none}
.pyb-zip-track{position:absolute;inset:0;border-radius:calc(.6*var(--k));background:repeating-linear-gradient(90deg,#E6C47A 0 calc(.45*var(--k)),#2F1A0E calc(.45*var(--k)) calc(.9*var(--k)));box-shadow:0 0 0 calc(.25*var(--k)) #2F1A0E;transform-origin:0 50%;transform:scaleX(0)}
.pyb-zip-pull{position:absolute;left:calc(-1.2*var(--k));top:calc(-.6*var(--k));width:calc(2.4*var(--k));height:calc(5.4*var(--k));border-radius:calc(.8*var(--k)) calc(.8*var(--k)) calc(1.2*var(--k)) calc(1.2*var(--k));background:linear-gradient(90deg,#8A6424,#F0CF83 45%,#C9994A);box-shadow:0 calc(.3*var(--k)) calc(.6*var(--k)) rgba(0,0,0,.4)}
.pyb-zip[data-zip=run] .pyb-zip-track{animation:pyb-zipt .62s cubic-bezier(.45,0,.2,1) forwards}
.pyb-zip[data-zip=run] .pyb-zip-pull{animation:pyb-zipp .62s cubic-bezier(.45,0,.2,1) forwards}
.pyb-zip[data-zip=done] .pyb-zip-track{transform:scaleX(1)}
.pyb-zip[data-zip=done] .pyb-zip-pull{transform:translateX(calc(35*var(--k)))}
@keyframes pyb-zipt{to{transform:scaleX(1)}}
@keyframes pyb-zipp{to{transform:translateX(calc(35*var(--k)))}}

/* ---------- the departures board ---------- */
.pyb-board{position:relative;width:calc(94*var(--k));padding:calc(3.2*var(--k)) calc(4*var(--k)) calc(4*var(--k));border-radius:calc(2.6*var(--k));background:linear-gradient(180deg,rgba(255,255,255,.05),transparent 22%),var(--panel);box-shadow:inset 0 0 0 calc(.55*var(--k)) var(--frame),inset 0 0 0 calc(.8*var(--k)) rgba(0,0,0,.5),0 calc(3*var(--k)) calc(7*var(--k)) rgba(0,0,0,.55);color:var(--ink)}
.pyb-rivet{position:absolute;width:calc(1.3*var(--k));height:calc(1.3*var(--k));border-radius:50%;background:radial-gradient(circle at 35% 35%,rgba(255,255,255,.55),rgba(255,255,255,.08) 60%,rgba(0,0,0,.4))}
.pyb-cell{display:inline-flex;gap:var(--tg)}
.pyb-tile{position:relative;display:inline-block;flex:none;width:var(--tw);height:var(--th);perspective:calc(var(--th)*4);font-family:var(--font-sans),system-ui,sans-serif;font-weight:700;color:var(--ink);contain:strict}
/* the gap between the halves, in step with the tile: a fixed pixel line swallows the bar of a small G */
.pyb-tile::after{content:"";position:absolute;left:0;right:0;top:calc(50% - var(--th) * .015);height:max(.5px,calc(var(--th) * .03));background:rgba(0,0,0,.7);z-index:3}
.pyb-h{position:absolute;left:0;right:0;height:50%;overflow:hidden;backface-visibility:hidden;-webkit-backface-visibility:hidden}
.pyb-h>span{position:absolute;left:0;right:0;height:200%;display:flex;align-items:center;justify-content:center;font-size:calc(var(--th)*.7);line-height:1;letter-spacing:0}
.pyb-t{top:0;border-radius:var(--tr) var(--tr) 0 0;background:linear-gradient(var(--f1),var(--f2))}
.pyb-t>span{top:0}
.pyb-b{bottom:0;border-radius:0 0 var(--tr) var(--tr);background:linear-gradient(var(--f2),var(--f3))}
.pyb-b>span{bottom:0}
.pyb-lt{transform-origin:50% 100%;transform:rotateX(-90deg);z-index:2}
.pyb-lb{transform-origin:50% 0;transform:rotateX(90deg);z-index:2}
.pyb-lt::before{content:"";position:absolute;inset:0;z-index:1;background:linear-gradient(rgba(0,0,0,.1),rgba(0,0,0,.6));opacity:0}
.pyb-tile[data-f=a] .pyb-lt{animation:pyb-fa var(--fh) ease-in both}
.pyb-tile[data-f=a] .pyb-lt::before{animation:pyb-sa var(--fh) ease-in both}
.pyb-tile[data-f=a] .pyb-lb{animation:pyb-ga var(--fh) var(--fh) ease-out both}
.pyb-tile[data-f=b] .pyb-lt{animation:pyb-fb var(--fh) ease-in both}
.pyb-tile[data-f=b] .pyb-lt::before{animation:pyb-sb var(--fh) ease-in both}
.pyb-tile[data-f=b] .pyb-lb{animation:pyb-gb var(--fh) var(--fh) ease-out both}
@keyframes pyb-fa{from{transform:rotateX(0)}to{transform:rotateX(-90deg)}}
@keyframes pyb-fb{from{transform:rotateX(0)}to{transform:rotateX(-90deg)}}
@keyframes pyb-ga{from{transform:rotateX(90deg)}to{transform:rotateX(0)}}
@keyframes pyb-gb{from{transform:rotateX(90deg)}to{transform:rotateX(0)}}
@keyframes pyb-sa{from{opacity:0}to{opacity:1}}
@keyframes pyb-sb{from{opacity:0}to{opacity:1}}
.pyb-lamp{display:inline-flex;align-items:center;gap:calc(1.2*var(--k));color:var(--lamp);opacity:.2;transition:opacity .3s}
.pyb-lamp::before{content:"";width:calc(1.8*var(--k));height:calc(1.8*var(--k));border-radius:50%;background:currentColor;box-shadow:0 0 calc(1.4*var(--k)) currentColor}
.pyb-lamp[data-on=true]{opacity:1;animation:pyb-blink 1.1s steps(1,end) infinite;text-shadow:0 0 calc(1.2*var(--k)) currentColor}
@keyframes pyb-blink{0%,58%{opacity:1}60%,100%{opacity:.25}}

/* ---------- the tickets ---------- */
.pyb-notch-b{-webkit-mask:radial-gradient(circle at 0 100%,transparent calc(3*var(--k)),#000 calc(3*var(--k) + .5px)) 0 0/51% 100% no-repeat,radial-gradient(circle at 100% 100%,transparent calc(3*var(--k)),#000 calc(3*var(--k) + .5px)) 100% 0/51% 100% no-repeat;mask:radial-gradient(circle at 0 100%,transparent calc(3*var(--k)),#000 calc(3*var(--k) + .5px)) 0 0/51% 100% no-repeat,radial-gradient(circle at 100% 100%,transparent calc(3*var(--k)),#000 calc(3*var(--k) + .5px)) 100% 0/51% 100% no-repeat}
.pyb-notch-t{-webkit-mask:radial-gradient(circle at 0 0,transparent calc(3*var(--k)),#000 calc(3*var(--k) + .5px)) 0 0/51% 100% no-repeat,radial-gradient(circle at 100% 0,transparent calc(3*var(--k)),#000 calc(3*var(--k) + .5px)) 100% 0/51% 100% no-repeat;mask:radial-gradient(circle at 0 0,transparent calc(3*var(--k)),#000 calc(3*var(--k) + .5px)) 0 0/51% 100% no-repeat,radial-gradient(circle at 100% 0,transparent calc(3*var(--k)),#000 calc(3*var(--k) + .5px)) 100% 0/51% 100% no-repeat}
.pyb-paper{background-color:#F7F0E1;background-image:${PAPER_GRAIN},radial-gradient(120% 80% at 20% 0%,rgba(255,255,255,.7),transparent 60%);color:#1F2735}
.pyb-lbl{display:block;font:700 calc(2.3*var(--k))/1.1 var(--font-sans),system-ui,sans-serif;letter-spacing:.14em;text-transform:uppercase;opacity:.6}
.pyb-val{display:block;margin-top:calc(.8*var(--k));overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font:600 calc(3.5*var(--k))/1.15 var(--font-sans),system-ui,sans-serif}
.pyb-hint{animation:pyb-nudge 1.6s ease-in-out infinite}
@keyframes pyb-nudge{0%,100%{transform:translateY(0)}50%{transform:translateY(calc(1*var(--k)))}}
.pyb-pin{transform-box:fill-box;transform-origin:50% 100%;transform:scale(.55);opacity:.55;transition:transform .45s cubic-bezier(.3,1.7,.5,1),opacity .3s}
.pyb-pin[data-on=true]{transform:scale(1);opacity:1}

@media (prefers-reduced-motion: reduce){
  .pyb-tag[data-state=home] .pyb-arc,.pyb-hint,.pyb-lamp[data-on=true],.pyb-thud,.pyb-go::after{animation:none}
  .pyb-tag[data-state=landed] .pyb-tick{animation:none;transform:scale(1)}
  .pyb-case{transition:none}
}
`;
