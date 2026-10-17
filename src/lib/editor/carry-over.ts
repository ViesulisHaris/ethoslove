import type { GiftData } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import { defaultCoverFor } from "@/templates/_shared/covers/looks";

/**
 * A gift started in one template, moved to another ("make it a Bouquet" on The Letter): the
 * sender's own things go with it, the old template's things stay behind.
 *
 * Going: the names, the words, the photos (as many as the new template holds, first ones first),
 * the song, the voice note, the clip where the new template plays one, a countdown, a surprise, a
 * dedication, a date or a trip inside, and a colour they chose themselves.
 * Staying: the old template's own fields (a letter's seal and paper mean nothing to a bouquet), its
 * cover, and its default colour, which was never their choice.
 *
 * Every file gets a copy of its own under a new id. Sharing one would tie the two drafts together:
 * removing a photo from either deletes the file both point at, and a copy the old draft uploaded
 * sits in the old gift's Storage folder, which goes when that draft is tidied away.
 */

type Manifest = Pick<TemplateManifest, "slug" | "defaultAccent" | "features">;

/** A file the moved gift would take: the id it has here, and the address that shows it now. */
export type FileToCarry = { id: string; url: string };

/**
 * The files the new template would take, looked up by what the store holds: photos by their own
 * id, an uploaded song by its track, and a voice note or a clip (which the gift addresses by URL)
 * through the asset that URL belongs to.
 */
export function filesToCarry(data: GiftData, to: Manifest, idForUrl: (url: string) => string | undefined): FileToCarry[] {
  const files: FileToCarry[] = data.photos.slice(0, to.features.photos.max).map((p) => ({ id: p.id, url: p.url }));
  if (to.features.music && data.music?.source === "upload" && data.music.trackId) files.push({ id: data.music.trackId, url: data.music.url });
  const byUrl = (url: string | undefined) => {
    const id = url ? idForUrl(url) : undefined;
    if (id && url) files.push({ id, url });
  };
  byUrl(data.voiceNote?.url);
  if (to.features.video) {
    byUrl(data.video?.url);
    byUrl(data.video?.poster);
  }
  return files;
}

/**
 * The gift as the new template starts it. `copies` maps a file's id here to the id of its copy;
 * anything without a copy (the browser no longer had it) is left out rather than left broken, and a
 * clip loses only its still frame. The files are `idb:` refs, which is how a draft on this device
 * points at them, so the new editor opens it exactly as it would after a reload.
 */
export function carryOver(args: {
  data: GiftData;
  from: Manifest;
  to: Manifest;
  fields: Record<string, unknown>;
  copies: Record<string, string>;
  idForUrl: (url: string) => string | undefined;
}): GiftData {
  const { data, from, to, fields, copies, idForUrl } = args;
  const ref = (id: string | undefined) => (id && copies[id] ? `idb:${copies[id]}` : undefined);
  const refForUrl = (url: string | undefined) => (url ? ref(idForUrl(url)) : undefined);

  const photos = data.photos.slice(0, to.features.photos.max).flatMap((p) => {
    const url = ref(p.id);
    return url ? [{ ...p, id: copies[p.id], url }] : [];
  });

  let music = to.features.music ? data.music : undefined;
  if (music?.source === "upload") {
    const url = ref(music.trackId);
    music = url && music.trackId ? { ...music, url, trackId: copies[music.trackId] } : undefined;
  }

  const voiceUrl = refForUrl(data.voiceNote?.url);
  const voiceNote = data.voiceNote && voiceUrl ? { ...data.voiceNote, url: voiceUrl } : undefined;

  const videoUrl = to.features.video ? refForUrl(data.video?.url) : undefined;
  const video = videoUrl ? { url: videoUrl, poster: refForUrl(data.video?.poster) } : undefined;

  return {
    ...data,
    templateSlug: to.slug,
    photos,
    music,
    voiceNote,
    video,
    accentColor: data.accentColor.toLowerCase() === from.defaultAccent.toLowerCase() ? to.defaultAccent : data.accentColor,
    cover: defaultCoverFor(to.slug),
    // Set by the server from what was paid for; a new gift starts with the footer, like any other.
    watermark: true,
    fields,
  };
}
