/**
 * Who has the floor, sound-wise. A real song's preview must never play under the sender's video
 * (Apple's terms for previews), and a preview talking over the sender's voice message helps no
 * one, so whichever starts announces it here and the others step aside:
 *
 * - the song preview starts → videos pause (and don't autoplay again) and the voice message stops;
 * - a video or the voice message starts → the song preview stops.
 *
 * Module state rather than context, so it works whichever template, screen or depth each sits in.
 */
export type SoundKind = "songPreview" | "video" | "voiceNote";
type Listener = (kind: SoundKind, owner: object) => void;

const listeners = new Set<Listener>();
let current: { kind: SoundKind; owner: object } | null = null;

export function claimSound(kind: SoundKind, owner: object): void {
  current = { kind, owner };
  for (const listener of [...listeners]) listener(kind, owner);
}

/** Call when a sound ends or stops, so a video may autoplay again. */
export function releaseSound(owner: object): void {
  if (current?.owner === owner) current = null;
}

export function isSongPreviewPlaying(): boolean {
  return current?.kind === "songPreview";
}

/** Subscribe to claims; returns the unsubscribe. Listeners hear their own claims too, so compare `owner`. */
export function onSoundClaimed(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
