// Etsy listing photos, 2000x2000: a hero, two pairs of moments, a single moment and "how it works",
// from the demo frames etsy-shots.mjs captured. (The listing video comes from etsy-shots.mjs with ETSY_VIDEO=1.)
//   node scripts/etsy-photos.mjs <repo> <shots> docs/marketing/etsy/photos [slugs…]
// ETSY_PHOTOS=5-how-it-works renders only the photos named (comma-separated); that one needs no frames.
import { createRequire } from "node:module";
import { mkdirSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const [WT, SHOTS, OUT, ...only] = process.argv.slice(2);
const req = createRequire(join(WT, "package.json"));
const { chromium } = req("@playwright/test");
const sharp = req("sharp");

const GIFTS = {
  "popup-card": { bg: "#efe4d6", ink: "#3b2a22", title: "Pop-up Birthday Card", line: "They light the candles and blow them out", hero: 7, a: [1, 4, "It arrives as a card", "and opens into a cake"], b: [10, 14, "They blow, it bursts", "and your letter is there"], single: [5, "Their name and age on the topper"] },
  bouquet: { bg: "#f2e9df", ink: "#3b2a22", title: "Virtual Bouquet", line: "Flowers that come together stem by stem", hero: 8, a: [4, 7, "You pick every flower", "wrapped and tied for them"], b: [11, 16, "A card tucked inside", "with your words"], single: [9, "It never wilts"] },
  xoxo: { bg: "#f6e6e2", ink: "#4a1d22", title: "XOXO Love Letter", line: "Sealed with a kiss, full of your photos", hero: 3, a: [1, 7, "It arrives sealed", "and opens into your photos"], b: [9, 12, "Polaroids, kisses, hearts", "your letter at the end"], single: [5, "Every tap leaves a kiss"] },
  coquette: { bg: "#fbe4ea", ink: "#4a1d2e", title: "Coquette Love Letter", line: "Untie the bow: lilies, polaroids, your song", hero: 3, a: [2, 6, "A polaroid of the two of you", "and your song plays"], b: [9, 13, "Polaroids and lilies", "your letter at the end"], single: [5, "A little player that really pauses"] },
  "birthday-cinema": { bg: "#2b1012", ink: "#fbeee6", title: "Birthday Cinema", line: "Curtains, candles, confetti. Blow to make a wish.", hero: 7, a: [1, 3, "The curtains open", "a cake with real candles"], b: [5, 11, "They blow the candles out", "your photos roll, your letter waits"], single: [8, "Their name in lights"] },
  digicam: { bg: "#f9dbe6", ink: "#47202f", title: "Digicam Photo Gift", line: "Your photos on a little 2006 camera", hero: 7, a: [1, 4, "They press power", "and it says hello"], b: [13, 17, "Every shutter press, a photo", "then it prints the roll"], single: [10, "The orange date in the corner"] },
  scrapbook: { bg: "#f3ebe1", ink: "#3b2a22", title: "Digital Scrapbook", line: "Polaroids, washi tape and a note from you", hero: 5, a: [1, 7, "They open the book", "and your photos develop"], b: [10, 14, "A typed letter from you", "and their song playing"], single: [8, "Photo strips, film and washi tape"] },
  museum: { bg: "#ebe5dc", ink: "#2b2622", title: "Museum Gallery Gift", line: "A quiet gallery of the two of you", hero: 3, a: [2, 6, "They walk in", "and swipe from room to room"], b: null, single: [3, "Each photo framed, with a title, a year, a line"] },
  "jar-of-reasons": { bg: "#fbe4ea", ink: "#4a1d2e", title: "Reasons I Love You Jar", line: "A jar of your reasons. They shake one out.", hero: 2, a: [2, 4, "They tap the jar", "and a reason falls out"], b: [6, 14, "Some notes carry a photo", "one reason at a time"], single: [11, "Every note in your words"] },
  halfway: { bg: "#fbe4ea", ink: "#4a1d2e", title: "Long Distance Love Map", line: "Blow a paper plane from your door to theirs", hero: 3, a: [1, 5, "The real distance between you", "they blow, the plane flies"], b: [7, 10, "Until it's zero", "and your letter is there"], single: [4, "The halfway point, in your words"] },
  passport: { bg: "#e3ecf6", ink: "#1d2a44", title: "Digital Passport", line: "From your city to theirs, in one flight", hero: 2, a: [2, 6, "Their name on the cover", "the route draws itself"], b: [10, 12, "They land in your city", "every photo is a stamp"], single: [14, "Every stamp a place you've been"] },
  "on-repeat": { bg: "#fbe0ea", ink: "#4a1d2e", title: "Album Cover Love Letter", line: "Your photo as the album cover, their name as the artist", hero: 1, a: [1, 5, "Your photo as the album cover", "and your song plays"], b: [9, 12, "A playlist of your photos", "and your letter at the end"], single: [3, "Stickers, a bow and your song"] },
  "pack-your-bags": { bg: "#1b2440", ink: "#f4ecdf", title: "Surprise Trip Reveal", line: "They pack the bag. The board says where.", hero: 14, a: [3, 8, "They pack your clues", "the date swings from the handle"], b: [12, 15, "A departures board spells it out", "a boarding pass with both your names"], single: [20, "Your letter under the stub"] },
  "scratch-card": { bg: "#f3e2cc", ink: "#3d2a14", title: "Scratch Off Cards", line: "Five cards. The last one is the big one.", hero: 2, a: [2, 7, "A stack of cards for them", "they scratch the foil away"], b: [29, 57, "Each one hides a photo", "and the last one asks"], single: [10, "A photo and a line on every card"] },
  "snow-globe": { bg: "#2b1d16", ink: "#f6eadb", title: "Snow Globe", line: "Shake it. Each time it settles, a photo or a line.", hero: 6, a: [1, 8, "A globe on their shelf", "they shake it and it snows"], b: [10, 13, "It settles on one of your lines", "or one of your photos"], single: [23, "Then your letter opens"] },
  fireside: { bg: "#2a1a14", ink: "#f6e7d6", title: "Fireside Letter", line: "A candle, a blanket and a letter by the window", hero: 6, a: [1, 6, "It arrives as a letter", "they light the candle"], b: [12, 17, "Your letter unfolds", "your photos on a string"], single: [7, "The room turns gold"] },
  arcade: { bg: "#ece4f8", ink: "#3a2a55", title: "Arcade Love Game", line: "Catch the hearts. Unlock the photos.", hero: 14, a: [1, 9, "Press start", "catch the falling hearts"], b: [25, 45, "Each level clears a photo", "then they win"], single: [51, "And your message"] },
  // Wave 3
  constellations: { bg: "#1d1b3a", ink: "#f1ecff", title: "Photo Constellation", line: "Every star in their sky is one of your photos", hero: 44, a: [2, 4, "Their own night sky", "every star holds a photo"], b: [16, 39, "They find every star", "and the stars join into a heart"], single: [28, "Each photo with your caption"] },
  bloom: { bg: "#fbe4ea", ink: "#4a1d2e", title: "Bloom", line: "A flower that opens while they hold the screen", hero: 12, a: [1, 6, "A flower with their name", "it opens while they hold"], b: [9, 38, "Your photos float up", "your message waits inside"], single: [5, "Petal by petal"] },
  "midnight-countdown": { bg: "#161a33", ink: "#f6e9cf", title: "New Year Countdown", line: "Dusk to fireworks, timed to midnight", hero: 6, a: [2, 4, "A live countdown to midnight", "the sky darkens as it gets close"], b: [9, 13, "At zero, your words", "then your photos and your letter"], single: [7, "Fireworks at midnight"] },
  "the-toast": { bg: "#2b1a22", ink: "#f6ead6", title: "The Toast", line: "Tilt to pour, knock to clink, and your speech begins", hero: 20, a: [1, 7, "For the two of them", "they tilt the phone to pour"], b: [19, 24, "A knock to clink", "and your speech begins"], single: [28, "Your photos in the speech"] },
  "autumn-reel": { bg: "#efe0cc", ink: "#4a2414", title: "Autumn Film Collage", line: "Your photos develop into a vintage autumn collage", hero: 4, a: [1, 2, "Your photos as negatives", "one tap and they develop"], b: [9, 13, "Film, leaves and a cat or two", "your letter at the end"], single: [7, "Your song on a little player"] },
  "be-my-boo": { bg: "#fbefe2", ink: "#4a2a14", title: "Be My Boo", line: "A little ghost says boo. Your photos are underneath.", hero: 4, a: [1, 3, "A ghost holds their name", "and flies off to show your photos"], b: [7, 13, "Your song on a little player", "your letter at the end"], single: [5, "A black cat, swishing its tail"] },
  "dark-romance": { bg: "#2b0d14", ink: "#f6e6e2", title: "Dark Romance Letter", line: "Turn the key: black roses, red velvet and your song", hero: 5, a: [1, 4, "A diary with their name in gold", "they turn the key"], b: [11, 14, "Polaroids, a crow, candles", "your letter under a wax seal"], single: [8, "Your photo as The Lovers"] },
  evergreen: { bg: "#dfe6d3", ink: "#2c3a26", title: "Sage Butterfly Letter", line: "Unwrap the newspaper and the butterflies fly out", hero: 4, a: [1, 2, "Wrapped in old newspaper", "butterflies fly out"], b: [9, 12, "Your photos on polaroids", "your letter at the end"], single: [5, "A record with your song on it"] },
  "fall-for-you": { bg: "#f1e2cf", ink: "#4a2a14", title: "Fall for You", line: "Light the candle: an autumn collage of your photos", hero: 4, a: [1, 3, "A candle with their name", "light it and the room warms up"], b: [9, 13, "A recipe card for the two of you", "and your letter"], single: [5, "Their name in letter blocks"] },
  keepsake: { bg: "#eadcc6", ink: "#3b2a22", title: "Keepsake Box", line: "Pressed flowers, a gold locket and a typed letter", hero: 4, a: [1, 3, "A parcel with a wax seal", "your first photo under dried flowers"], b: [9, 17, "A locket with your initials", "your letter, typed on old paper"], single: [13, "The rest pressed in like pages"] },
  "spooky-season": { bg: "#f6e1cf", ink: "#4a2414", title: "Spooky Season Scrapbook", line: "Blow the leaves away. A cozy Halloween is underneath.", hero: 3, a: [1, 2, "A heap of leaves with their name", "one tap and they blow away"], b: [6, 12, "Film, pumpkins and a black cat", "your letter at the end"], single: [5, "Your song and a postcard"] },
  balloons: { bg: "#fbe9e4", ink: "#4a1d2e", title: "Birthday Balloons", line: "Pop the balloons. Your photos fall out.", hero: 8, a: [1, 4, "It arrives as a present", "their age in gold, balloons to pop"], b: [14, 20, "Your photos land on the floor", "your letter is in the last one"], single: [16, "The biggest one holds your letter"] },
  "bat-swarm": { bg: "#231a3d", ink: "#f4ecdf", title: "Bat Swarm", line: "Tap the moon. The bats spell their name.", hero: 8, a: [2, 4, "A full moon over the castle", "one tap and the bats pour out"], b: [10, 14, "Then your words", "and your letter underneath"], single: [12, "And a heart, wings still beating"] },
  "cap-toss": { bg: "#1b2448", ink: "#f4ecdf", title: "Graduation Cap Toss", line: "They cheer. The cap flies. The diploma is your letter.", hero: 9, a: [1, 8, "They make some noise", "and the cap flies up"], b: [11, 15, "They pull the ribbon", "and your letter unrolls"], single: [18, "Their photos, like a yearbook"] },
  cauldron: { bg: "#14261f", ink: "#ecf3e4", title: "Love Potion", line: "Three jars of what you love. The potion does the rest.", hero: 10, a: [1, 6, "Three jars in your words", "they tip each one in"], b: [12, 14, "The cork pops", "and your letter is inside"], single: [18, "Your photos, kept in jars"] },
  "fortune-cookie": { bg: "#5e1418", ink: "#fbeee6", title: "Fortune Cookies", line: "Crack one open. Suspiciously accurate.", hero: 6, a: [2, 3, "A plate of cookies", "each one holds a fortune you wrote"], b: [9, 12, "Some slips carry a photo", "lucky numbers on every one"], single: [13, "Silly, sweet or oddly specific"] },
  "front-page": { bg: "#efe8dc", ink: "#1f1b16", title: "Birthday Newspaper", line: "Breaking news: it's about them", hero: 4, a: [2, 3, "It waits folded on the table", "and they're the front page"], b: [6, 9, "Your story, set like the news", "and a page of their photos"], single: [8, "Classified ads you write"] },
  "haunted-house": { bg: "#141a33", ink: "#f4ecdf", title: "Haunted House", line: "Every lit window holds a photo. The door holds your letter.", hero: 12, a: [2, 7, "Open the gate in the storm", "the windows light one by one"], b: [10, 14, "A photo in every window", "then they knock on the door"], single: [19, "Your letter behind the door"] },
  kawaii: { bg: "#fde3ec", ink: "#4a1d2e", title: "Kawaii Birthday Card", line: "Bows, blush and a plushie who's happy to see them", hero: 6, a: [1, 5, "It arrives as a letter", "a plush bunny waves hello"], b: [7, 10, "The box pops open", "your photos as stickers"], single: [11, "And a note from you"] },
  "paper-crane": { bg: "#2e2925", ink: "#f3ece0", title: "Paper Crane Apology", line: "Every fold says one more line", hero: 14, a: [2, 8, "A sheet of paper", "every fold says one more line"], b: [11, 16, "It becomes a crane", "they blow and it flies off"], single: [19, "Your letter, where it was"] },
  "party-animals": { bg: "#f3ecdf", ink: "#3b2a22", title: "Party Animals", line: "A birthday crashed by hamsters in party hats", hero: 8, a: [1, 5, "An invitation, hamster seal", "a birthday collage of your photos"], b: [12, 19, "Photos, a guest list", "a cake they blow out"], single: [22, "Your letter at the bottom"] },
  "photo-booth": { bg: "#5c1018", ink: "#fbeee6", title: "Photo Booth Strip", line: "Four flashes, and a strip of the two of you prints", hero: 9, a: [2, 7, "They pull the curtain", "three, two, one, flash"], b: [18, 21, "The strip prints", "and lands on a wall of love letters"], single: [25, "Your letter in handwriting"] },
  picnic: { bg: "#fbe4ea", ink: "#4a1d2e", title: "Picnic Love Notes", line: "Everything in the basket carries a line from you", hero: 15, a: [1, 6, "A basket on a gingham blanket", "each thing comes out with your line"], b: [12, 19, "Your photos in gingham frames", "and the date you planned"], single: [11, "A ticket to happiness"] },
  "the-council": { bg: "#efe6d6", ink: "#3b2414", title: "The Cat Council", line: "Five cats hear the case and stamp a verdict", hero: 7, a: [2, 4, "The council hears the case", "each cat reads your evidence"], b: [9, 15, "Then the verdict", "stamped and signed"], single: [11, "The ruling is your letter"] },
  sketchbook: { bg: "#f1ebe1", ink: "#3b2a22", title: "Doodle Sketchbook", line: "Every page draws itself as they turn to it", hero: 8, a: [1, 5, "A sketchbook with their name", "every page draws itself"], b: [11, 16, "Your photos taped in", "with notes in handwriting"], single: [22, "Your letter on the last page"] },
  "text-thread": { bg: "#efece6", ink: "#1f1b16", title: "Text Thread Love Story", line: "Your messages arrive one bubble at a time", hero: 12, a: [2, 4, "It starts on their lock screen", "then the chat opens"], b: [9, 16, "Your photos dropped in", "one bubble at a time"], single: [7, "Typing dots and all"] },
  "trick-or-treat": { bg: "#231a3d", ink: "#f8e6cf", title: "Trick or Treat", line: "Ring the bell. A little ghost has something for them.", hero: 8, a: [1, 4, "It arrives as a present", "a porch on Halloween night"], b: [7, 11, "Trick or treat?", "then your words on a scroll"], single: [15, "Your photos in haunted frames"] },
  vinyl: { bg: "#efe6d8", ink: "#2b1d14", title: "Vinyl Record Gift", line: "Drop the needle. Your photos are in the crate.", hero: 4, a: [1, 7, "A record on the shelf", "they drop the needle"], b: [8, 13, "Your photos in the crate", "your words on the liner notes"], single: [5, "It spins while the music plays"] },
  "the-letter": { bg: "#3a2418", ink: "#f6eadb", title: "Wax-Sealed Love Letter", line: "Break the seal. Your words write themselves.", hero: 14, a: [1, 4, "Sealed with your initial", "the letter slides out"], b: [8, 20, "Your words, in handwriting", "line by line, to your name"], single: [6, "Your photos as polaroids"] },
  "favorite-person": { bg: "#fbe9ee", ink: "#4a1d2e", title: "Favorite Person Scrapbook", line: "Lift the tissue paper: pearls, pressed flowers, your photos", hero: 6, a: [2, 4, "Tissue paper with their name", "lift it, and your scrapbook is there"], b: [9, 15, "Your song on a little player", "your letter at the end"], single: [11, "Pressed flowers and love you"] },
  garden: { bg: "#eef1e3", ink: "#2c3a26", title: "The Garden", line: "A garden that blooms as they scroll", hero: 12, a: [2, 7, "A gate with their name", "a garden drawn in ink"], b: [16, 23, "Your photos on the trellis", "your letter in the greenhouse"], single: [24, "A bouquet of everything they passed"] },
  "jack-o-lantern": { bg: "#24160f", ink: "#f8e6cf", title: "Jack-o'-Lantern", line: "Carved with their name, then lit", hero: 10, a: [2, 5, "A pumpkin and a knife", "it carves itself"], b: [7, 11, "Their name across the belly", "then they light the candle"], single: [16, "Your letter by candlelight"] },
  "music-box": { bg: "#fbe4ea", ink: "#4a1d2e", title: "Music Box", line: "Wind the key. A ballerina turns, your photos in the mirror.", hero: 13, a: [1, 9, "Their name on the gold plate", "they wind the key, the lid opens"], b: [22, 35, "A new photo with every turn", "then a letter lifts out"], single: [39, "Your letter under a wax seal"] },
  "our-timeline": { bg: "#f3ede3", ink: "#2b2622", title: "Our Timeline", line: "A road that draws itself as they scroll", hero: 7, a: [2, 4, "Your years, in order", "a road that draws itself"], b: [11, 23, "Every stop a photo and a date", "and it's only the beginning"], single: [14, "A date and a line for each"] },
  "recipe-box": { bg: "#f6e9e2", ink: "#4a1d14", title: "The Recipe for Mom", line: "Her recipe, one ingredient at a time, then your letter", hero: 15, a: [1, 8, "The recipe for her, on the counter", "she tilts the phone to pour"], b: [16, 22, "She shakes it to stir", "and your letter is the method"], single: [27, "Your photos, kept in the box"] },
  "sticker-bomb": { bg: "#1f4a37", ink: "#f2f7ef", title: "Sticker Bomb Card", line: "Every tap slaps a meme sticker. Twelve taps open the card.", hero: 12, a: [1, 5, "Tap anywhere", "every tap slaps a sticker"], b: [8, 14, "Twelve taps and it's a mess", "then they read your card"], single: [9, "Labels in your words"] },
  seance: { bg: "#24170e", ink: "#f6e6cf", title: "Spirit Board Message", line: "Touch the planchette. It spells your words.", hero: 12, a: [2, 6, "They touch the planchette", "it moves by itself"], b: [10, 15, "Letter by letter", "then your letter in the dark"], single: [20, "Your photos as spirit photographs"] },
};

const FONTS = '<link href="https://fonts.googleapis.com/css2?family=Newsreader:opsz,wght@6..72,400;6..72,500&family=Schibsted+Grotesk:wght@400;500;600&display=swap" rel="stylesheet">';
const base = (g) => `
  * { box-sizing: border-box; margin: 0 }
  body { width: 1000px; height: 1000px; background: ${g.bg}; color: ${g.ink}; font-family: "Schibsted Grotesk", system-ui, sans-serif; overflow: hidden; position: relative }
  .phone { position: absolute; background: #1b1215; border-radius: 46px; padding: 11px; box-shadow: 0 28px 60px rgba(30,10,15,.28), 0 6px 14px rgba(30,10,15,.18) }
  .phone img { display: block; width: 100%; height: 100%; object-fit: cover; border-radius: 36px }
  .serif { font-family: "Newsreader", Georgia, serif }
`;
const phone = (src, { left, top, w }) => `<div class="phone" style="left:${left}px;top:${top}px;width:${w}px;height:${Math.round(w * 16 / 9)}px"><img src="${src}"></div>`;

const hero = (g, img) => `<style>${base(g)}
  .text { position: absolute; left: 70px; top: 120px; width: 420px }
  .kicker { font-size: 22px; font-weight: 600; letter-spacing: .02em; opacity: .75 }
  h1 { font: 500 72px/1.02 "Newsreader", Georgia, serif; margin-top: 18px }
  p { font-size: 27px; line-height: 1.35; margin-top: 22px; opacity: .85 }
  ul { list-style: none; padding: 0; margin-top: 44px; display: grid; gap: 14px; font-size: 24px; font-weight: 500 }
  li::before { content: "✓"; margin-right: 12px; color: #d6336c; font-weight: 700 }
</style>
<div class="text"><div class="kicker">Interactive digital gift</div><h1>${g.title}</h1><p>${g.line}</p>
<ul><li>No Canva, no app</li><li>Made on your phone in minutes</li><li>Sent as a link they open</li></ul></div>
${phone(img, { left: 540, top: 70, w: 420 })}`;

const pair = (g, a, b, capA, capB) => `<style>${base(g)}
  .cap { position: absolute; width: 400px; text-align: center; font: 500 34px/1.15 "Newsreader", Georgia, serif }
</style>
${phone(a, { left: 70, top: 160, w: 400 })}${phone(b, { left: 530, top: 160, w: 400 })}
<div class="cap" style="left:70px;top:58px">${capA}</div><div class="cap" style="left:530px;top:58px">${capB}</div>`;

const single = (g, img, cap) => `<style>${base(g)}
  .cap { position: absolute; left: 70px; top: 400px; width: 380px; font: 500 52px/1.08 "Newsreader", Georgia, serif }
</style>
<div class="cap">${cap}</div>${phone(img, { left: 520, top: 70, w: 420 })}`;

const how = (g) => `<style>${base(g)}
  .wrap { position: absolute; left: 90px; top: 110px; width: 820px }
  h2 { font: 500 64px/1.05 "Newsreader", Georgia, serif }
  ol { list-style: none; padding: 0; margin-top: 60px; display: grid; gap: 44px }
  li { display: flex; gap: 28px; align-items: flex-start }
  b { flex: none; width: 64px; height: 64px; border-radius: 50%; background: ${g.ink}; color: ${g.bg}; display: grid; place-items: center; font-size: 30px }
  li span { font-size: 31px; line-height: 1.3 } li strong { display: block; font-size: 36px; margin-bottom: 4px }
  .note { margin-top: 64px; font-size: 26px; padding: 22px 28px; border-radius: 18px; background: color-mix(in srgb, ${g.ink} 12%, transparent) }
</style>
<div class="wrap"><h2>How it works</h2><ol>
<li><b>1</b><span><strong>Go to tryethos.io/etsy</strong>Type your Etsy order number. No download.</span></li>
<li><b>2</b><span><strong>Make it on your phone</strong>Names, photos, your words. A few minutes, no Canva.</span></li>
<li><b>3</b><span><strong>Send them the link</strong>They open it on any phone, wherever they are.</span></li>
</ol><div class="note">If it doesn't open on their phone, message us and we'll refund you.</div></div>`;

const frame = (slug, i) => {
  const files = readdirSync(join(SHOTS, slug, "frames")).sort();
  const f = files[Math.min(i, files.length - 1)];
  return `data:image/png;base64,${readFileSync(join(SHOTS, slug, "frames", f)).toString("base64")}`;
};

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1000, height: 1000 }, deviceScaleFactor: 2 });
for (const [slug, g] of Object.entries(GIFTS)) {
  if (only.length && !only.includes(slug)) continue;
  const dir = join(OUT, slug);
  mkdirSync(dir, { recursive: true });
  const shots = [
    ["1-hero", () => hero(g, frame(slug, g.hero))],
    ["2-moments", () => pair(g, frame(slug, g.a[0]), frame(slug, g.a[1]), g.a[2], g.a[3])],
    ...(g.b ? [["3-moments", () => pair(g, frame(slug, g.b[0]), frame(slug, g.b[1]), g.b[2], g.b[3])]] : []),
    ["4-detail", () => single(g, frame(slug, g.single[0]), g.single[1])],
    ["5-how-it-works", () => how(g)],
  ];
  const named = process.env.ETSY_PHOTOS?.split(",");
  for (const [name, html] of shots) {
    if (named && !named.includes(name)) continue;
    await page.setContent(`<!doctype html><html><head><meta charset="utf-8">${FONTS}</head><body>${html()}</body></html>`, { waitUntil: "networkidle" });
    await page.evaluate(() => document.fonts.ready);
    const png = await page.screenshot();
    await sharp(png).jpeg({ quality: 88, mozjpeg: true }).toFile(join(dir, `${name}.jpg`));
  }
  console.log(slug, "ok");
}
await browser.close();
