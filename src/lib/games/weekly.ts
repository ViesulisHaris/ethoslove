import { DARES, TRUTHS } from "./content";
import { DAILY_EPOCH, DAILY_NAME_MAX, cleanName } from "./daily";
import { DECKS } from "./questions";
import { THIS_PAIRS, type ThisPair } from "./this-or-that";

type L = { en: string; es: string };

/**
 * The weekly challenge (/games/weekly): five cards on one theme, the same for everyone, new each
 * Monday. Three are this-or-that pairs that two people answer apart and compare by a link; the
 * fourth is a question to ask out loud and the fifth a dare, for when both have answered. Every
 * card is one of the games' own (this-or-that.ts, questions.ts, content.ts): nothing is written
 * here but the themes. Nothing is stored and nothing is asked of a server: the week is counted from
 * the clock, the set is the week's place in the list, and the picks travel after the `#` of a link.
 * The clock is always an argument here, never read.
 */

/* ---- the week ---- */

/** 1 January 1970 was a Thursday, so the first Monday is day 4 (5 January 1970). */
const FIRST_MONDAY = 4;
/**
 * The week a UTC day (lib/games/daily.ts, dayOf) falls in: Monday to Sunday, counted from Monday
 * 5 January 1970. Not the calendar's week number: that starts again every January and runs to 52
 * or 53, so a set chosen from it would be skipped or shown twice at the turn of a year.
 */
export const weekOf = (day: number): number => Math.floor((day - FIRST_MONDAY) / 7);
/** The Monday a week starts on, as a UTC day number. */
export const weekStart = (week: number): number => week * 7 + FIRST_MONDAY;
/**
 * The first week of the first round of the list: the week of Monday 23 November 2026, the day
 * today's question began. Which set a week shows is counted from here. Never change it once the
 * page is live: every week's challenge would change with it.
 */
export const WEEKLY_EPOCH = weekOf(DAILY_EPOCH);

/* ---- the sets ---- */

/** Where a set's question comes from: one of the three free question decks, or the truths of truth or dare. */
export type WeeklyDeck = "light" | "deep" | "apart" | "truth";
/**
 * One week's five cards. `picks` are three ids of THIS_PAIRS; `ask` is a card of a question deck or
 * a truth, and `dare` a card of DARES, each named by its English line (those decks have no ids).
 * Once a set has been live, its id and its three picks never change, and their order neither: a
 * link sent that week carries the id and three answers in that order.
 */
export type WeeklySet = { id: string; theme: L; picks: readonly [string, string, string]; ask: readonly [deck: WeeklyDeck, en: string]; dare: string };

const set = (id: string, en: string, es: string, picks: [string, string, string], ask: [WeeklyDeck, string], dare: string): WeeklySet => ({ id, theme: { en, es }, picks, ask, dare });

/**
 * Pairs whose two sides swap who is who ("I cook, you wash up" / "You cook, I wash up"): two people
 * who agree would tap different sides, and the count would call it a miss. In the game both read one
 * card at one table, so it works there; never in a weekly set (tests/unit/games-weekly.test.ts).
 */
export const WEEKLY_MIRRORED: readonly string[] = ["sofa-side", "last-bite", "cook-wash", "spicy", "coffee-order", "map", "story", "friends", "family", "remember", "plants", "first-move"];

/** In the order they are played, one a week, round and round. New sets go at the end. */
export const WEEKLY_SETS: readonly WeeklySet[] = [
  set("film-night", "Film night", "Noche de peli", ["film-pick", "subtitles", "film-talk"], ["light", "Which film would you happily watch with me forever?"], "Tell me the story of how we met as a nature documentary."),
  set("how-we-text", "How we text", "Cómo nos escribimos", ["reply-speed", "double-text", "voice-note"], ["truth", "Which message did you write and delete before sending me?"], "Say out loud something you'd normally only text me. Now."),
  set("dinner-out", "Dinner out", "Cena fuera", ["table", "order", "bill"], ["light", "What's a food you pretend to like for my sake?"], "Order a dessert to share in a made-up accent."),
  set("mornings", "Mornings", "Las mañanas", ["alarm", "wake", "early"], ["light", "What's the funniest thing I've said in my sleep?"], "Do my morning routine, as me, in thirty seconds."),
  set("packing", "Packing", "Hacer la maleta", ["pack", "luggage", "plan-trip"], ["light", "Which of us would be worse at camping?"], "Let me choose your outfit for tomorrow."),
  set("presents", "Presents", "Los regalos", ["gift", "surprise", "handwriting"], ["truth", "What's the best present I've given you, and why?"], "Write me a two-line poem on your phone and read it out."),
  set("in-the-kitchen", "In the kitchen", "En la cocina", ["recipe", "music-cook", "cook-class"], ["truth", "Rate my cooking out of ten. No rounding up."], "Feed me a bite of something with your eyes closed."),
  set("a-night-in", "A night in", "Noche en casa", ["takeaway", "guests", "pyjamas"], ["deep", "What does a perfect ordinary Tuesday with me look like?"], "Slow dance with me for one full song. No phones."),
  set("planning-a-date", "Planning a date", "Planear una cita", ["double", "new-place", "day-night"], ["truth", "Which of our dates would you repeat tomorrow?"], "Plan our next date out loud, in one breath."),
  set("far-apart", "Far apart", "A distancia", ["call-video", "landed", "song"], ["apart", "What's the hardest hour of the day to be apart?"], "Do your best impression of me answering the phone."),
  set("breakfast", "Breakfast", "El desayuno", ["breakfast", "fridge", "tea"], ["light", "Name three things in our fridge right now. No looking."], "Make me a cup of tea, with full hotel service."),
  set("making-up", "Making up", "Hacer las paces", ["argue-text", "sorry", "space"], ["deep", "What does a good apology look like to you?"], "Hug me for 20 seconds without letting go."),
  set("on-the-way", "On the way", "De camino", ["train-plane", "window-seat", "road-music"], ["light", "What's a song you know every word to and aren't proud of?"], "Show me the last five songs you played and defend each one."),
  set("sweet-talk", "Sweet talk", "Cosas bonitas", ["compliment", "words", "nickname"], ["truth", "What's a compliment you've never said out loud?"], "Give me a compliment for every letter of my name."),
  set("one-more-episode", "One more episode", "Un capítulo más", ["one-more", "asleep-film", "rewatch"], ["light", "If our life was a sitcom, what would it be called?"], "Sell me to the room like a shopping channel."),
  set("a-night-out", "A night out", "Salir de noche", ["dress", "dance-floor", "sunrise"], ["truth", "Which of my outfits is your favorite?"], "Do your best catwalk across the room."),
  set("in-the-chat", "In the chat", "En el chat", ["emoji", "pet-names", "screenshot"], ["truth", "Which text from me have you kept?"], "Do a dramatic reading of our last text chat."),
  set("sharing-food", "Sharing food", "Compartir comida", ["chips", "dessert", "taste"], ["light", "What food would you ban from the house if you could?"], "Recite our first dinner order from memory. Out loud."),
  set("bedtime", "Bedtime", "A dormir", ["bed-read", "goodnight", "thermostat"], ["light", "What's the strangest dream you've had about me?"], "Give me three kisses, each somewhere different on my face."),
  set("a-new-city", "A new city", "Una ciudad nueva", ["city-first", "lost", "hotel"], ["deep", "What does home mean to you now?"], "Pretend we've just met and ask me out."),
  set("big-days", "Big days", "Los días señalados", ["birthday", "anniversary", "our-song"], ["deep", "What's a tradition you'd like us to start?"], "Raise a toast to us with whatever's in your glass."),
  set("a-day-out", "A day out", "Un día fuera", ["museum", "picnic-rain", "arcade"], ["light", "You get one do-over of a day we've had. Which day?"], "Recreate the first photo we ever took."),
  set("through-the-day", "Through the day", "Durante el día", ["good-morning", "lunch-call", "photo-day"], ["apart", "What part of your day do you most wish I'd been there for?"], "Tell me about your day like a sports commentator."),
  set("a-lazy-sunday", "A lazy Sunday", "Domingo tranquilo", ["sunday", "bath", "board"], ["deep", "What's one thing you wish we did more of?"], "Hold my hand and say nothing for one minute."),
  set("housework", "Housework", "Las tareas de casa", ["laundry", "tidy", "bed-make"], ["truth", "What's a habit of mine you've quietly tried to change?"], "Give me a pep talk like a football coach at half-time."),
  set("a-week-away", "A week away", "Una semana fuera", ["beach-day", "return", "next-trip"], ["truth", "Which photo of us is your favorite, and why?"], "Pose for a photo like it's a magazine cover."),
];

/** A set's five cards, read from their decks. */
export type WeeklyCards = { picks: [ThisPair, ThisPair, ThisPair]; ask: L; dare: L };

export function weeklyCards(of: WeeklySet): WeeklyCards {
  const picks = of.picks.map((id) => THIS_PAIRS.find((p) => p.id === id));
  const [deck, line] = of.ask;
  const ask = (deck === "truth" ? TRUTHS : DECKS[deck].cards).find((card) => card.en === line);
  const dare = DARES.find((card) => card.en === of.dare);
  // Held by the unit tests for every set: a deck's line reworded without its set would end up here.
  if (!picks[0] || !picks[1] || !picks[2] || !ask || !dare) throw new Error(`weekly: the set "${of.id}" names a card its deck no longer has`);
  return { picks: [picks[0], picks[1], picks[2]], ask, dare };
}

/** The game a set's question comes from (its picture under the challenge): a truth is truth or dare's, any other the question cards'. */
export const weeklyAskGame = (of: WeeklySet): "dare" | "deck" => (of.ask[0] === "truth" ? "dare" : "deck");

/** The set of a week: the same for everyone, and none twice until the whole list has gone round. */
export function weeklySet(week: number, sets: readonly WeeklySet[] = WEEKLY_SETS): WeeklySet {
  const n = sets.length;
  if (n === 0) throw new Error("weekly: no sets");
  return sets[(((week - WEEKLY_EPOCH) % n) + n) % n];
}

export const setById = (id: string, sets: readonly WeeklySet[] = WEEKLY_SETS): WeeklySet | null => sets.find((s) => s.id === id) ?? null;

/* ---- the link ---- */

export type Side = 0 | 1;
/** One person's three answers, in the order of the set's picks. */
export type WeeklyPicks = readonly [Side, Side, Side];
export type WeeklyAnswer = { name: string; picks: WeeklyPicks };
/** What a link holds. `to` is the answer it replies to: the first person's, sent back so they see both. */
export type WeeklyLink = { week: number; set: WeeklySet; from: WeeklyAnswer; to?: WeeklyAnswer };

/**
 * The longest hash a real link can be: "#w=1." and a week (5 digits), a set id (40), and two
 * answers, each a name of 24 characters (a character taking up to 12 once percent-encoded) and
 * three picks. About 640; anything longer was not made by encodeWeekly.
 */
export const WEEKLY_HASH_MAX = 5 + 6 + 41 + 2 * (DAILY_NAME_MAX * 12 + 5);

/** A field of the link: never holds a dot, so the dot can separate the fields (as in daily.ts). */
const field = (name: string) => encodeURIComponent(cleanName(name)).replace(/\./g, "%2E");

/** Three picks as they travel: "010". */
export const picksText = (picks: readonly Side[]): string => picks.join("");
/** Picks so far (none to three) from what was kept or sent, or null for anything else. */
export function picksFrom(text: unknown, exactly?: 3): Side[] | null {
  if (typeof text !== "string" || !/^[01]{0,3}$/.test(text) || (exactly && text.length !== exactly)) return null;
  return [...text].map((c) => (c === "1" ? 1 : 0));
}

/**
 * "#w=1.<week>.<setId>.<name>.<picks>" and, for a reply, ".<name>.<picks>" of the answer replied to.
 * The name comes before the picks so a link always ends on a digit: a chat app leaves a link's last
 * dot (or bracket, or "!") out of what it makes tappable.
 */
export function encodeWeekly(link: { week: number; setId: string; from: WeeklyAnswer; to?: WeeklyAnswer }): string {
  const parts = ["1", String(link.week), link.setId, field(link.from.name), picksText(link.from.picks)];
  if (link.to) parts.push(field(link.to.name), picksText(link.to.picks));
  // The "=" matters: the ad pixels stay off on any address whose hash holds one (isAdTrackingOffHere).
  return `#w=${parts.join(".")}`;
}

function answer(nameText: string, picks: string): WeeklyAnswer | null {
  const three = picksFrom(picks, 3);
  if (!three) return null;
  try {
    return { name: cleanName(decodeURIComponent(nameText)), picks: [three[0], three[1], three[2]] };
  } catch {
    return null;
  }
}

/** What a hash holds, or null for anything that is not a whole, sane link. `thisWeek` is the reader's week. */
export function decodeWeekly(hash: unknown, thisWeek: number, sets: readonly WeeklySet[] = WEEKLY_SETS): WeeklyLink | null {
  if (typeof hash !== "string" || hash.length > WEEKLY_HASH_MAX) return null;
  const body = hash.startsWith("#w=") ? hash.slice(3) : hash.startsWith("w=") ? hash.slice(2) : null;
  if (body === null) return null;
  const parts = body.split(".");
  if ((parts.length !== 5 && parts.length !== 7) || parts[0] !== "1") return null;
  const [, weekText, setId, fromName, fromPicks, toName, toPicks] = parts;
  if (!/^\d{1,5}$/.test(weekText)) return null;
  const week = Number(weekText);
  // A clock a little behind must not refuse this week's link.
  if (week < WEEKLY_EPOCH || week > thisWeek + 1) return null;
  if (!/^[a-z0-9-]{1,40}$/.test(setId)) return null;
  const found = setById(setId, sets);
  if (!found) return null;
  // A link of this week (or next week's, from a clock ahead) is shown as "This week": it must carry
  // that week's set, or the page would name one theme while the hub names another. An earlier week's
  // link keeps the set it names (L5): the list may have grown since, and moved which set a week gives.
  if (week >= thisWeek && found.id !== weeklySet(week, sets).id) return null;
  const from = answer(fromName, fromPicks);
  if (!from) return null;
  const link: WeeklyLink = { week, set: found, from };
  if (parts.length === 7) {
    const to = answer(toName, toPicks);
    if (!to) return null;
    link.to = to;
  }
  return link;
}

/** On how many of the three two people picked the same side. */
export const sameCount = (a: WeeklyPicks, b: WeeklyPicks): number => a.filter((side, i) => side === b[i]).length;

/** What a tab remembers of the last link it sent: the week, the set, the name and picks it carried, and whether it was a reply. */
export type WeeklySent = { week: number; setId: string; name: string; picks: string; reply?: boolean };

/**
 * Whether a link is one this tab sent itself (people tap their own link in the chat to check it),
 * as sentHere in daily.ts: the same week, set, picks and name as the last link the tab sent, a
 * first link and a reply told apart by what the tab sent.
 */
export function weeklySentHere(link: WeeklyLink, sent: WeeklySent | null): boolean {
  if (!sent || !!sent.reply !== !!link.to) return false;
  return sent.week === link.week && sent.setId === link.set.id && sent.picks === picksText(link.from.picks) && cleanName(sent.name) === link.from.name;
}
