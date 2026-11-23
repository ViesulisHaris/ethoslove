export type TrackMood = "warm" | "romantic" | "dreamy" | "calm" | "hopeful" | "playful" | "cinematic";

export type LibraryTrack = {
  id: string;
  title: string;
  mood: TrackMood;
  url: string;
  /** Seconds. */
  duration: number;
  /** Displayed under the title, e.g. "Piano · slow" */
  note: string;
  /** The same in Spanish, for the Spanish editor (walk-make-6). The title stays as it is. */
  noteEs: string;
};

/**
 * Bundled library, rendered by scripts/gen-library.mjs (our own synthesis, so it's fully
 * cleared for use in gifts). Every track loops seamlessly.
 */
export const LIBRARY_TRACKS: LibraryTrack[] = [
  { id: "first-light", title: "First Light", mood: "warm", url: "/audio/library/first-light.mp3", duration: 58, note: "Felt piano · slow", noteEs: "Piano con fieltro · lento" },
  { id: "paper-boats", title: "Paper Boats", mood: "dreamy", url: "/audio/library/paper-boats.mp3", duration: 53, note: "Music box · floating", noteEs: "Caja de música · flotante" },
  { id: "sunday-slowly", title: "Sunday, Slowly", mood: "calm", url: "/audio/library/sunday-slowly.mp3", duration: 51, note: "Fingerpicked guitar", noteEs: "Guitarra punteada" },
  { id: "golden-hour", title: "Golden Hour", mood: "hopeful", url: "/audio/library/golden-hour.mp3", duration: 46, note: "Piano · bright", noteEs: "Piano · luminoso" },
  { id: "slow-dance", title: "Slow Dance", mood: "romantic", url: "/audio/library/slow-dance.mp3", duration: 46, note: "Electric piano · waltz", noteEs: "Piano eléctrico · vals" },
  { id: "under-the-stars", title: "Under the Stars", mood: "cinematic", url: "/audio/library/under-the-stars.mp3", duration: 51, note: "Pads · wide", noteEs: "Sintetizador · amplio" },
  { id: "home", title: "Home", mood: "playful", url: "/audio/library/home.mp3", duration: 40, note: "Ukulele · sunny", noteEs: "Ukelele · soleado" },
  { id: "quiet-hours", title: "Quiet Hours", mood: "calm", url: "/audio/library/quiet-hours.mp3", duration: 64, note: "Piano · sparse", noteEs: "Piano · sobrio" },
  { id: "fireside", title: "Fireside", mood: "warm", url: "/audio/library/fireside.mp3", duration: 66, note: "Felt piano · by the fire", noteEs: "Piano con fieltro · junto al fuego" },
  { id: "all-hallows", title: "All Hallows", mood: "dreamy", url: "/audio/library/all-hallows.mp3", duration: 36, note: "Music box · a waltz in the dark", noteEs: "Caja de música · un vals a oscuras" },
  { id: "merry-christmas", title: "We Wish You a Merry Christmas", mood: "playful", url: "/audio/library/merry-christmas.mp3", duration: 62, note: "U.S. Air Force Band · bright and festive", noteEs: "Banda de la Fuerza Aérea de EE. UU. · alegre y festiva" },
  { id: "waltz-of-the-flowers", title: "Waltz of the Flowers", mood: "romantic", url: "/audio/library/waltz-of-the-flowers.mp3", duration: 66, note: "Tchaikovsky · U.S. Army Band", noteEs: "Chaikovski · Banda del Ejército de EE. UU." },
  { id: "simple-gifts", title: "Simple Gifts", mood: "warm", url: "/audio/library/simple-gifts.mp3", duration: 70, note: "U.S. Air Force Band · a quiet hymn", noteEs: "Banda de la Fuerza Aérea de EE. UU. · un himno sereno" },
  { id: "bleak-midwinter", title: "In the Bleak Midwinter", mood: "calm", url: "/audio/library/bleak-midwinter.mp3", duration: 75, note: "U.S. Air Force brass · a snowy carol", noteEs: "Metales de la Fuerza Aérea de EE. UU. · un villancico con nieve" },
  { id: "o-christmas-tree", title: "O Christmas Tree", mood: "playful", url: "/audio/library/o-christmas-tree.mp3", duration: 72, note: "U.S. Air Force Airmen of Note · big band swing", noteEs: "Airmen of Note de la Fuerza Aérea de EE. UU. · swing de big band" },
];

export const TRACK_MOODS: TrackMood[] = ["warm", "romantic", "dreamy", "calm", "hopeful", "playful", "cinematic"];

/** The line under a track's title, in the editor's language. */
export function trackNote(track: LibraryTrack, locale: string): string {
  return locale === "es" ? track.noteEs : track.note;
}

export function findTrack(id: string | undefined): LibraryTrack | undefined {
  return LIBRARY_TRACKS.find((t) => t.id === id);
}
