/**
 * Looks up the real song each demo plays (src/content/demo-songs.ts) through the site's own song
 * search, the way the editor does, and writes the table.
 *   node scripts/demo-songs.mjs http://localhost:3000
 * Apple's preview addresses change now and then: run it again when a demo's song stops answering.
 */
import { writeFileSync } from "node:fs";

const base = process.argv[2] ?? "http://localhost:3000";

/** slug → [title, artist]. Chosen by hand for what each gift is for. */
const PICKS = {
  "advent-calendar": ["All I Want for Christmas Is You", "Mariah Carey"],
  arcade: ["Levitating", "Dua Lipa"],
  "autumn-reel": ["Sweater Weather", "The Neighbourhood"],
  balloons: ["Happy", "Pharrell Williams"],
  "bat-swarm": ["Thriller", "Michael Jackson"],
  "be-my-boo": ["My Boo", "Usher"],
  "birthday-cinema": ["Birthday", "Katy Perry"],
  bloom: ["Just the Way You Are", "Bruno Mars"],
  bouquet: ["Lover", "Taylor Swift"],
  "cap-toss": ["Unwritten", "Natasha Bedingfield"],
  cauldron: ["Superstition", "Stevie Wonder"],
  constellations: ["Yellow", "Coldplay"],
  coquette: ["Espresso", "Sabrina Carpenter"],
  "dark-romance": ["Young and Beautiful", "Lana Del Rey"],
  digicam: ["Photograph", "Ed Sheeran"],
  evergreen: ["Perfect", "Ed Sheeran"],
  "fall-for-you": ["Can't Help Falling in Love", "Elvis Presley"],
  "favorite-person": ["Adore You", "Harry Styles"],
  fireside: ["The Christmas Song", "Nat King Cole"],
  "fortune-cookie": ["Lucky", "Jason Mraz"],
  "front-page": ["Celebration", "Kool & The Gang"],
  "frosted-window": ["Last Christmas", "Wham!"],
  garden: ["golden hour", "JVKE"],
  "gingerbread-house": ["Rockin' Around the Christmas Tree", "Brenda Lee"],
  halfway: ["Hey There Delilah", "Plain White T's"],
  "haunted-house": ["Ghostbusters", "Ray Parker Jr."],
  "jack-o-lantern": ["This Is Halloween", "Danny Elfman"],
  "jar-of-reasons": ["Thinking Out Loud", "Ed Sheeran"],
  kawaii: ["Sugar", "Maroon 5"],
  keepsake: ["A Thousand Years", "Christina Perri"],
  "light-the-candles": ["Thank You", "Dido"],
  "midnight-countdown": ["Counting Stars", "OneRepublic"],
  museum: ["At Last", "Etta James"],
  "music-box": ["All of Me", "John Legend"],
  "nice-list": ["Santa Tell Me", "Ariana Grande"],
  "on-repeat": ["As It Was", "Harry Styles"],
  "our-timeline": ["Until I Found You", "Stephen Sanchez"],
  "pack-your-bags": ["Riptide", "Vance Joy"],
  "paper-crane": ["Sorry", "Justin Bieber"],
  "party-animals": ["Uptown Funk", "Mark Ronson"],
  passport: ["Leaving on a Jet Plane", "John Denver"],
  "photo-booth": ["Die With A Smile", "Lady Gaga"],
  picnic: ["Banana Pancakes", "Jack Johnson"],
  "popup-card": ["Count on Me", "Bruno Mars"],
  "recipe-box": ["The Best Day", "Taylor Swift"],
  scrapbook: ["Memories", "Maroon 5"],
  "scratch-card": ["Marry You", "Bruno Mars"],
  seance: ["Somebody's Watching Me", "Rockwell"],
  sketchbook: ["Sunflower", "Post Malone"],
  "snow-globe": ["Let It Snow! Let It Snow! Let It Snow!", "Dean Martin"],
  "spooky-season": ["Monster Mash", "Bobby"],
  "sticker-bomb": ["Shut Up and Dance", "WALK THE MOON"],
  "string-the-lights": ["It's Beginning to Look a Lot Like Christmas", "Michael Bublé"],
  "text-thread": ["Call Me Maybe", "Carly Rae Jepsen"],
  "the-council": ["Stayin' Alive", "Bee Gees"],
  "the-letter": ["Make You Feel My Love", "Adele"],
  "the-toast": ["Marry Me", "Train"],
  "trick-or-treat": ["Spooky, Scary Skeletons", "Andrew Gold"],
  unwrapped: ["Underneath the Tree", "Kelly Clarkson"],
  vinyl: ["Fly Me to the Moon", "Frank Sinatra"],
  wishbone: ["What a Wonderful World", "Louis Armstrong"],
  xoxo: ["Kiss Me", "Sixpence None the Richer"],
};

const plain = (s) => s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, " ").trim();
const rows = {};
const missed = [];
for (const [slug, [title, artist]] of Object.entries(PICKS)) {
  const res = await fetch(`${base}/api/music/search?q=${encodeURIComponent(`${title} ${artist}`)}`);
  const { songs = [] } = await res.json();
  // The artist's own recording of that title: never a cover, a karaoke track or a tribute.
  const own = songs.filter((s) => plain(s.artist).includes(plain(artist)) && plain(s.title).startsWith(plain(title).split(" ").slice(0, 3).join(" ")) && !/karaoke|tribute|instrumental|cover|live|remix|naughty|vacation/i.test(`${s.title} ${s.album}`));
  // The plain title first, then a "single version" of it.
  const hit = own.find((s) => plain(s.title) === plain(title)) ?? own[0];
  if (!hit) {
    missed.push(`${slug}: ${title} / ${artist} (${songs.slice(0, 3).map((s) => `${s.title} by ${s.artist}`).join("; ")})`);
    continue;
  }
  rows[slug] = { trackId: hit.id, title: hit.title, artist: hit.artist, artwork: hit.artwork, url: hit.previewUrl, externalUrl: hit.url.replace(/[?&]uo=\d+/, "") };
  console.log("ok", slug, "·", hit.title, "·", hit.artist);
  await new Promise((r) => setTimeout(r, 1200));
}
if (missed.length) console.log("\nNOT FOUND\n" + missed.join("\n"));

const body = Object.entries(rows)
  .map(([slug, r]) => `  ${JSON.stringify(slug)}: ${JSON.stringify(r)},`)
  .join("\n");
writeFileSync(
  "src/content/demo-songs.ts",
  `import type { GiftMusic } from "@/lib/gift/schema";

/**
 * The real song each gift's demo carries while the song strip is on (templates/_shared/SongStrip.tsx,
 * NEXT_PUBLIC_SONG_STRIP): a well-known song for what the gift is for, heard on a tap like any
 * sender's own pick, beside its link on Apple Music. A demo only: a gift someone makes starts with
 * the template's library music, and the sender picks a song of their own in the editor.
 *
 * Written by scripts/demo-songs.mjs from the site's own song search (the picks are in that file);
 * Apple's preview addresses change now and then, so it is run again when one stops answering.
 */
const SONGS: Record<string, Pick<GiftMusic, "trackId" | "title" | "artist" | "artwork" | "url" | "externalUrl">> = {
${body}
};

/** The demo's song for \`slug\`, as the editor would have saved it; undefined for a gift with none. */
export function demoSong(slug: string): GiftMusic | undefined {
  const song = SONGS[slug];
  return song ? { source: "catalog", provider: "itunes", startAt: 0, ...song } : undefined;
}

export const DEMO_SONG_SLUGS = Object.keys(SONGS);
`,
);
console.log(`\nwrote ${Object.keys(rows).length} songs`);
