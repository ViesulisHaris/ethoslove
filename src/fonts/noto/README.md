# Noto fonts for names on the share card

The gift share card (`src/app/g/[shortId]/card.jpg`) draws a recipient's name in these when it is
written in a script the card's image generator can't shape or has no font for (see
`src/lib/gift/name-scripts.ts` and `name-art.ts`).

Each file is the Regular, hinted TrueType from the Noto project's own font site
(github.com/notofonts/notofonts.github.io, `fonts/<Family>/hinted/ttf/`), downloaded 17 Nov 2026.
All of them are licensed under the SIL Open Font License 1.1, copyright The Noto Project Authors;
the licence text is in `OFL.txt`.
