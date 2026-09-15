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
};

/**
 * Bundled library, rendered by scripts/gen-library.mjs (our own synthesis, so it's fully
 * cleared for use in gifts). Every track loops seamlessly.
 */
export const LIBRARY_TRACKS: LibraryTrack[] = [
  { id: "first-light", title: "First Light", mood: "warm", url: "/audio/library/first-light.mp3", duration: 58, note: "Felt piano · slow" },
  { id: "paper-boats", title: "Paper Boats", mood: "dreamy", url: "/audio/library/paper-boats.mp3", duration: 53, note: "Music box · floating" },
  { id: "sunday-slowly", title: "Sunday, Slowly", mood: "calm", url: "/audio/library/sunday-slowly.mp3", duration: 51, note: "Fingerpicked guitar" },
  { id: "golden-hour", title: "Golden Hour", mood: "hopeful", url: "/audio/library/golden-hour.mp3", duration: 46, note: "Piano · bright" },
  { id: "slow-dance", title: "Slow Dance", mood: "romantic", url: "/audio/library/slow-dance.mp3", duration: 46, note: "Electric piano · waltz" },
  { id: "under-the-stars", title: "Under the Stars", mood: "cinematic", url: "/audio/library/under-the-stars.mp3", duration: 51, note: "Pads · wide" },
  { id: "home", title: "Home", mood: "playful", url: "/audio/library/home.mp3", duration: 40, note: "Ukulele · sunny" },
  { id: "quiet-hours", title: "Quiet Hours", mood: "calm", url: "/audio/library/quiet-hours.mp3", duration: 64, note: "Piano · sparse" },
  { id: "fireside", title: "Fireside", mood: "warm", url: "/audio/library/fireside.mp3", duration: 66, note: "Felt piano · by the fire" },
  { id: "all-hallows", title: "All Hallows", mood: "dreamy", url: "/audio/library/all-hallows.mp3", duration: 36, note: "Music box · a waltz in the dark" },
];

export const TRACK_MOODS: TrackMood[] = ["warm", "romantic", "dreamy", "calm", "hopeful", "playful", "cinematic"];

export function findTrack(id: string | undefined): LibraryTrack | undefined {
  return LIBRARY_TRACKS.find((t) => t.id === id);
}
