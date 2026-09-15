"use client";

import { create } from "zustand";
import { nanoid } from "nanoid";
import type { GiftData, GiftLocale, GiftPhoto } from "@/lib/gift/schema";
import type { TemplateManifest } from "@/templates/types";
import { LIMITS } from "@/config/site";
import { getSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  GIFTS_BUCKET,
  buildStoragePath,
  extensionForMime,
  isLocalRef,
  isStoragePath,
  storageObjectKey,
} from "@/lib/gift/assets";
import { ensureDraft, saveDraft, signAssetUrls } from "@/app/actions/gift";
import type { CatalogSong } from "@/app/api/music/search/route";
import type { LibraryTrack } from "./music-library";
import type { AssetRecord, EditorDraft, SaveState, ScheduleSettings } from "./types";
import { deleteBlob, getBlob, putBlob } from "./blob-store";
import { UploadError, timeoutFor, uploadBlob } from "./upload";
import { uploadTypeFor } from "./media-types";
import { LASTING_FAILURES, groupOf, isVideoItself, reasonOf, type FailedGroup } from "./failed-uploads";
import { processImageFile, transformImage } from "./image";
import { clearLocalDraft, localAssetIds, localRefs, readLocalDraft, serializeForLocal, writeLocalDraft } from "./persistence";

const LOCAL_DEBOUNCE = 350;
const REMOTE_DEBOUNCE = 1800;

export type EditorState = {
  slug: string;
  manifest: TemplateManifest | null;
  data: GiftData;
  giftId: string | null;
  shortId: string | null;
  status: "draft" | "scheduled" | "live";
  schedule: ScheduleSettings;
  password: string;
  removeWatermark: boolean;
  assets: Record<string, AssetRecord>;
  hydrated: boolean;
  authed: boolean;
  userId: string | null;
  save: SaveState;
  savedAt: number | null;
  dirty: boolean;

  init: (args: {
    slug: string;
    manifest: TemplateManifest;
    initial: GiftData;
    authed: boolean;
    userId: string | null;
    remote?: RemoteGift | null;
  }) => Promise<void>;
  setAuth: (authed: boolean, userId: string | null) => void;
  patch: (p: Partial<GiftData>) => void;
  patchFields: (p: Record<string, unknown>) => void;
  setSchedule: (p: Partial<ScheduleSettings>) => void;
  setPassword: (v: string) => void;
  setRemoveWatermark: (v: boolean) => void;

  addPhotos: (files: File[]) => Promise<void>;
  removePhoto: (id: string) => Promise<void>;
  movePhoto: (from: number, to: number) => void;
  updatePhoto: (id: string, p: Partial<GiftPhoto>) => void;
  editPhoto: (
    id: string,
    opts: {
      rotate?: 0 | 90 | 180 | 270;
      crop?: { x: number; y: number; width: number; height: number };
    },
  ) => Promise<void>;

  setLibraryTrack: (track: LibraryTrack | null) => void;
  setCatalogTrack: (song: CatalogSong | null) => void;
  setVoiceNote: (blob: Blob, seconds: number) => Promise<void>;
  clearVoiceNote: () => void;
  setUploadedMusic: (file: File) => Promise<void>;
  setMusicStart: (seconds: number) => void;
  clearMusic: () => void;

  setUploadedVideo: (file: File) => Promise<void>;
  clearVideo: () => void;

  ensureRemote: () => Promise<string | null>;
  uploadPending: () => Promise<void>;
  /** Give failed uploads another go (a photo the browser has lost cannot be retried). */
  retryUploads: () => Promise<void>;
  /** Take whatever didn't upload out of the gift (or one part of it) so it can be published without it. */
  dropFailedUploads: (only?: FailedGroup) => Promise<void>;
  syncNow: () => Promise<boolean>;
  serializedForServer: () => GiftData;
  markPublished: (shortId: string, status: "live" | "scheduled") => void;
};

export type RemoteGift = {
  id: string;
  shortId: string;
  status: "draft" | "scheduled" | "live";
  data: GiftData;
  unlockAt: string | null;
  timezone: string | null;
  hasPassword: boolean;
};

let localTimer: number | undefined;
let remoteTimer: number | undefined;

function defaultTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  } catch {
    return "UTC";
  }
}

function assetRefs(state: Pick<EditorState, "assets">): Record<string, string | undefined> {
  const refs: Record<string, string | undefined> = {};
  for (const a of Object.values(state.assets))
    refs[a.id] = a.storagePath ?? (a.local ? `idb:${a.id}` : undefined);
  return refs;
}

/** Object URL → persistent ref, for assets addressed by URL rather than id (video + poster). */
function refsByUrl(state: Pick<EditorState, "assets">): Record<string, string | undefined> {
  const refs: Record<string, string | undefined> = {};
  for (const a of Object.values(state.assets))
    if (a.objectUrl) refs[a.objectUrl] = a.storagePath ?? (a.local ? `idb:${a.id}` : undefined);
  return refs;
}

/** Grabs a frame ~0.6s in as a WebP poster. */
async function captureVideoPoster(file: File): Promise<Blob | null> {
  try {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error("video metadata"));
    });
    video.currentTime = Math.min(0.6, Math.max(0, video.duration / 4));
    await new Promise<void>((resolve) => (video.onseeked = () => resolve()));
    const canvas = document.createElement("canvas");
    const scale = Math.min(1, 1280 / Math.max(video.videoWidth, video.videoHeight));
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    canvas.getContext("2d")!.drawImage(video, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/webp", 0.85));
  } catch {
    return null;
  }
}

export const useEditor = create<EditorState>((set, get) => {
  // The local-draft key this editing session opened: the template's own page, or a gift from the dashboard.
  let sessionKey: string | null = null;

  const persistLocal = () => {
    window.clearTimeout(localTimer);
    localTimer = window.setTimeout(() => {
      const s = get();
      if (!s.hydrated) return;
      const refs = localRefs(s.assets);
      const draft: EditorDraft = {
        version: 1,
        slug: s.slug,
        data: s.data,
        giftId: s.giftId,
        shortId: s.shortId,
        status: s.status,
        schedule: s.schedule,
        password: s.password,
        removeWatermark: s.removeWatermark,
        updatedAt: Date.now(),
        uploaded: refs.uploaded,
      };
      const serialized = serializeForLocal(draft, refs.byId, refs.byUrl);
      // Saved where the session opened, so coming back to the same page finds the same gift. It used
      // to be left at the moment before the draft row existed, and every visit made a new row and
      // uploaded every photo again. The gift's own key keeps the dashboard's copy current too.
      const own = draftScope(s.slug, s.giftId);
      writeLocalDraft(sessionKey ?? own, serialized);
      if (s.giftId && sessionKey !== own) writeLocalDraft(own, serialized);
      if (!s.authed || !s.giftId)
        set({ save: s.authed ? "saving" : "offline", savedAt: Date.now() });
    }, LOCAL_DEBOUNCE);
  };

  const persistRemote = () => {
    window.clearTimeout(remoteTimer);
    remoteTimer = window.setTimeout(() => void get().syncNow(), REMOTE_DEBOUNCE);
  };

  const touch = () => {
    set({ dirty: true });
    persistLocal();
    // Signed in: sync to the server. The first sync creates the draft row, which is what
    // lets uploads start — so this must run even before a giftId exists.
    if (get().authed) persistRemote();
  };

  const setAsset = (id: string, patch: Partial<AssetRecord>) =>
    set((st) => (st.assets[id] ? { assets: { ...st.assets, [id]: { ...st.assets[id], ...patch } } } : {}));

  // The publish sheet, the autosave and a retry can all ask for a draft row at once; one row answers all of them.
  let ensuring: Promise<string | null> | null = null;

  /** Leave a draft row that no longer takes this draft, keeping every file this device can send again. */
  const detachFromGift = (oldGiftId: string) => {
    const folder = `gifts/${oldGiftId}/`;
    const assets = { ...get().assets };
    for (const a of Object.values(assets)) {
      if (a.local && a.storagePath?.startsWith(folder)) assets[a.id] = { ...a, storagePath: undefined, status: "local", progress: 0, error: undefined };
    }
    const { slug } = get();
    set({ giftId: null, shortId: null, assets });
    if (sessionKey === draftScope(slug, oldGiftId)) sessionKey = slug;
    persistLocal();
  };

  /**
   * Three attempts, each with its own timeout and stall detection, so a phone that loses
   * signal mid-upload ends up on "failed, retry" instead of "uploading" forever. A refusal no
   * retry can change (a type Storage won't take, a file over the limit, a file the browser can
   * no longer read) stops at the first answer, so the sender hears why straight away.
   */
  const uploadAsset = async (id: string) => {
    const s = get();
    const asset = s.assets[id];
    const supabase = getSupabaseBrowserClient();
    if (!asset || !s.giftId || !s.authed || !supabase || asset.storagePath || asset.status === "uploading") return;
    // Claimed before the first await, so two queues running at once can't both send it.
    setAsset(id, { status: "uploading", progress: 0, error: undefined });
    const fail = (error: string) => setAsset(id, { status: "error", error, progress: 0 });

    const blob = await getBlob(id);
    // The browser dropped the draft's copy (private mode, cleared site data, a different browser),
    // or kept a copy it can no longer read, which would otherwise go up as an empty file.
    if (!blob || !(await readable(blob))) return fail("missing_blob");
    // Storage checks the label, and phones mislabel ordinary files: an iPhone ringtone is "audio/x-m4r".
    const type = uploadTypeFor(asset.kind, blob.type || asset.mime, "name" in blob ? (blob as File).name : undefined);
    if (!type) return fail("unsupported_type");
    if (blob.size > LIMITS.uploadMaxBytes) return fail("too_big");

    const {
      data: { session },
    } = await supabase.auth.getSession();
    const baseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const apikey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const giftId = get().giftId;
    if (!session?.access_token || !baseUrl || !apikey || !giftId) return fail("unauthorized");
    const path = buildStoragePath(giftId, id, extensionForMime(type));
    const url = `${baseUrl}/storage/v1/object/${GIFTS_BUCKET}/${storageObjectKey(path)}`;
    const headers = {
      authorization: `Bearer ${session.access_token}`,
      apikey,
      "content-type": type,
      "cache-control": "max-age=31536000",
      "x-upsert": "true",
    };
    setAsset(id, { mime: type });
    let failure = "network";
    for (let attempt = 0; attempt < 3; attempt++) {
      if (attempt) await new Promise((r) => setTimeout(r, attempt === 1 ? 1500 : 4000));
      try {
        await uploadBlob({ url, headers, blob, timeoutMs: timeoutFor(blob.size), onProgress: (f) => setAsset(id, { progress: f }) });
        setAsset(id, { status: "uploaded", storagePath: path, progress: 1, error: undefined });
        persistLocal();
        persistRemote();
        return;
      } catch (e) {
        failure = e instanceof UploadError ? e.kind : "network";
        if (failure === "unauthorized" || LASTING_FAILURES.has(failure)) break;
      }
    }
    fail(failure);
  };

  return {
    slug: "",
    manifest: null,
    data: null as unknown as GiftData,
    giftId: null,
    shortId: null,
    status: "draft",
    schedule: { enabled: false, timezone: "UTC" },
    password: "",
    removeWatermark: false,
    assets: {},
    hydrated: false,
    authed: false,
    userId: null,
    save: "idle",
    savedAt: null,
    dirty: false,

    async init({ slug, manifest, initial, authed, userId, remote }) {
      sessionKey = draftScope(slug, remote?.id ?? null);
      const timezone = defaultTimezone();
      let data = initial;
      let assets: Record<string, AssetRecord> = {};
      let giftId: string | null = remote?.id ?? null;
      let shortId: string | null = remote?.shortId ?? null;
      let status: EditorState["status"] = remote?.status ?? "draft";
      let schedule: ScheduleSettings = { enabled: false, timezone };
      let password = "";
      let removeWatermark = false;

      const local = readLocalDraft(draftScope(slug, giftId));

      if (remote) {
        // Editing something already in the database: storage paths need signed URLs for preview.
        data = remote.data;
        const paths = [
          ...remote.data.photos.map((p) => p.url).filter(isStoragePath),
          ...(remote.data.music?.source === "upload" && isStoragePath(remote.data.music.url)
            ? [remote.data.music.url]
            : []),
          ...(remote.data.video && isStoragePath(remote.data.video.url)
            ? [remote.data.video.url]
            : []),
          ...(remote.data.video?.poster && isStoragePath(remote.data.video.poster)
            ? [remote.data.video.poster]
            : []),
        ];
        const signed = paths.length
          ? await signAssetUrls(paths)
          : { ok: true as const, data: {} as Record<string, string> };
        const map = signed.ok ? signed.data : {};
        data = {
          ...data,
          photos: data.photos.map((p) => ({ ...p, url: map[p.url] ?? p.url })),
          music:
            data.music && data.music.source === "upload"
              ? { ...data.music, url: map[data.music.url] ?? data.music.url }
              : data.music,
          video: data.video
            ? {
                url: map[data.video.url] ?? data.video.url,
                poster: data.video.poster
                  ? (map[data.video.poster] ?? data.video.poster)
                  : undefined,
              }
            : undefined,
        };
        if (remote.data.video && isStoragePath(remote.data.video.url)) {
          const vid = remote.data.video.url.split("/").pop()!.split(".")[0];
          assets[vid] = {
            id: vid,
            kind: "video",
            local: false,
            storagePath: remote.data.video.url,
            status: "uploaded",
            progress: 1,
            objectUrl: map[remote.data.video.url],
          };
          if (remote.data.video.poster && isStoragePath(remote.data.video.poster)) {
            assets[`${vid}p`] = {
              id: `${vid}p`,
              kind: "photo",
              local: false,
              storagePath: remote.data.video.poster,
              status: "uploaded",
              progress: 1,
              objectUrl: map[remote.data.video.poster],
            };
          }
        }
        for (const p of remote.data.photos) {
          if (isStoragePath(p.url))
            assets[p.id] = {
              id: p.id,
              kind: "photo",
              local: false,
              storagePath: p.url,
              status: "uploaded",
              progress: 1,
            };
        }
        if (
          remote.data.music?.source === "upload" &&
          remote.data.music.trackId &&
          isStoragePath(remote.data.music.url)
        ) {
          assets[remote.data.music.trackId] = {
            id: remote.data.music.trackId,
            kind: "audio",
            local: false,
            storagePath: remote.data.music.url,
            status: "uploaded",
            progress: 1,
          };
        }
        if (remote.unlockAt)
          schedule = {
            enabled: true,
            unlockAt: remote.unlockAt,
            timezone: remote.timezone ?? timezone,
          };
        removeWatermark = !remote.data.watermark;
        // A newer local draft for the same gift wins (the user kept editing offline).
        if (local && local.updatedAt > Date.now() - 1000 * 60 * 60 * 24 * 7) {
          const rehydrated = await rehydrate(local, assets);
          data = rehydrated.data;
          assets = rehydrated.assets;
          schedule = local.schedule;
          password = local.password;
          removeWatermark = local.removeWatermark;
        }
      } else if (local) {
        const rehydrated = await rehydrate(local, {});
        data = rehydrated.data;
        assets = rehydrated.assets;
        giftId = local.giftId;
        shortId = local.shortId;
        status = local.status;
        schedule = local.schedule.timezone ? local.schedule : { ...local.schedule, timezone };
        password = local.password;
        removeWatermark = local.removeWatermark;
      }

      set({
        slug,
        manifest,
        data,
        assets,
        giftId,
        shortId,
        status,
        schedule,
        password,
        removeWatermark,
        authed,
        userId,
        hydrated: true,
        save: authed && giftId ? "saved" : local ? "offline" : "idle",
        dirty: false,
      });
      if (authed && giftId) void get().uploadPending();
    },

    setAuth(authed, userId) {
      set({ authed, userId });
      if (authed && get().giftId) void get().uploadPending();
    },

    patch(p) {
      set((s) => ({ data: { ...s.data, ...p } }));
      touch();
    },
    patchFields(p) {
      set((s) => ({
        data: { ...s.data, fields: { ...(s.data.fields as Record<string, unknown>), ...p } },
      }));
      touch();
    },
    setSchedule(p) {
      set((s) => ({ schedule: { ...s.schedule, ...p } }));
      touch();
    },
    setPassword(v) {
      set({ password: v });
      touch();
    },
    setRemoveWatermark(v) {
      set({ removeWatermark: v });
      touch();
    },

    async addPhotos(files) {
      const { manifest, data } = get();
      const max = manifest?.features.photos.max ?? 20;
      const accepted = files.slice(0, Math.max(0, max - data.photos.length));
      await Promise.all(
        accepted.map(async (file) => {
          const id = nanoid(10);
          set((s) => ({
            assets: {
              ...s.assets,
              [id]: { id, kind: "photo", local: false, status: "processing", progress: 0 },
            },
          }));
          try {
            const { blob, width, height } = await processImageFile(file);
            await putBlob(id, blob);
            const objectUrl = URL.createObjectURL(blob);
            set((s) => ({
              assets: {
                ...s.assets,
                [id]: {
                  ...s.assets[id],
                  objectUrl,
                  local: true,
                  status: "local",
                  mime: blob.type,
                  bytes: blob.size,
                },
              },
              data: {
                ...s.data,
                photos: [
                  ...s.data.photos,
                  {
                    id,
                    url: objectUrl,
                    width,
                    height,
                    caption: "",
                    alt: file.name.replace(/\.[^.]+$/, ""),
                  },
                ],
              },
            }));
            touch();
            void uploadAsset(id);
          } catch (e) {
            set((s) => ({
              assets: {
                ...s.assets,
                [id]: { ...s.assets[id], status: "error", error: (e as Error).message },
              },
            }));
          }
        }),
      );
    },

    async removePhoto(id) {
      const asset = get().assets[id];
      if (asset?.objectUrl) URL.revokeObjectURL(asset.objectUrl);
      set((s) => {
        const assets = { ...s.assets };
        delete assets[id];
        return { assets, data: { ...s.data, photos: s.data.photos.filter((p) => p.id !== id) } };
      });
      await deleteBlob(id);
      touch();
    },

    movePhoto(from, to) {
      set((s) => {
        const photos = [...s.data.photos];
        const [item] = photos.splice(from, 1);
        photos.splice(to, 0, item);
        return { data: { ...s.data, photos } };
      });
      touch();
    },

    updatePhoto(id, p) {
      set((s) => ({
        data: {
          ...s.data,
          photos: s.data.photos.map((ph) => (ph.id === id ? { ...ph, ...p } : ph)),
        },
      }));
      touch();
    },

    async editPhoto(id, opts) {
      const asset = get().assets[id];
      const blob = asset?.local
        ? await getBlob(id)
        : await fetch(get().data.photos.find((p) => p.id === id)!.url).then((r) => r.blob());
      if (!blob) return;
      const { blob: out, width, height } = await transformImage(blob, opts);
      await putBlob(id, out);
      if (asset?.objectUrl) URL.revokeObjectURL(asset.objectUrl);
      const objectUrl = URL.createObjectURL(out);
      set((s) => ({
        assets: {
          ...s.assets,
          [id]: {
            ...s.assets[id],
            objectUrl,
            local: true,
            storagePath: undefined,
            status: "local",
            mime: out.type,
            bytes: out.size,
          },
        },
        data: {
          ...s.data,
          photos: s.data.photos.map((ph) =>
            ph.id === id ? { ...ph, url: objectUrl, width, height } : ph,
          ),
        },
      }));
      touch();
      void uploadAsset(id);
    },

    setLibraryTrack(track) {
      get().clearMusic();
      if (track)
        set((s) => ({
          data: {
            ...s.data,
            music: {
              source: "library",
              url: track.url,
              trackId: track.id,
              title: track.title,
              startAt: 0,
            },
          },
        }));
      touch();
    },

    setCatalogTrack(song) {
      get().clearMusic();
      if (song) {
        set((s) => ({
          data: {
            ...s.data,
            music: {
              source: "catalog",
              url: song.previewUrl,
              trackId: song.id,
              title: song.title,
              artist: song.artist,
              artwork: song.artwork,
              provider: "itunes",
              externalUrl: song.url,
              startAt: 0,
            },
          },
        }));
      }
      touch();
    },

    async setVoiceNote(blob, seconds) {
      get().clearVoiceNote();
      const id = nanoid(10);
      const mime = (blob.type || "audio/webm").split(";")[0];
      await putBlob(id, blob);
      const objectUrl = URL.createObjectURL(blob);
      set((s) => ({
        assets: {
          ...s.assets,
          [id]: {
            id,
            kind: "audio",
            local: true,
            objectUrl,
            mime,
            bytes: blob.size,
            status: "local",
            progress: 0,
          },
        },
        data: { ...s.data, voiceNote: { url: objectUrl, duration: Math.round(seconds) } },
      }));
      touch();
      void uploadAsset(id);
    },

    clearVoiceNote() {
      const s = get();
      const note = s.data.voiceNote;
      if (!note) return;
      const ids = Object.values(s.assets)
        .filter((a) => a.objectUrl && a.objectUrl === note.url)
        .map((a) => a.id);
      set((st) => {
        const assets = { ...st.assets };
        for (const id of ids) {
          if (assets[id]?.objectUrl) URL.revokeObjectURL(assets[id].objectUrl!);
          delete assets[id];
          void deleteBlob(id);
        }
        return { assets, data: { ...st.data, voiceNote: undefined } };
      });
      touch();
    },

    async setUploadedMusic(file) {
      get().clearMusic();
      const id = nanoid(10);
      const mime = uploadTypeFor("audio", file.type, file.name) ?? (file.type || "audio/mpeg");
      await putBlob(id, file);
      const objectUrl = URL.createObjectURL(file);
      set((s) => ({
        assets: {
          ...s.assets,
          [id]: {
            id,
            kind: "audio",
            local: true,
            objectUrl,
            mime,
            bytes: file.size,
            status: "local",
            progress: 0,
          },
        },
        data: {
          ...s.data,
          music: {
            source: "upload",
            url: objectUrl,
            trackId: id,
            title: file.name.replace(/\.[^.]+$/, ""),
            startAt: 0,
          },
        },
      }));
      touch();
      void uploadAsset(id);
    },

    setMusicStart(seconds) {
      set((s) =>
        s.data.music
          ? { data: { ...s.data, music: { ...s.data.music, startAt: Math.max(0, seconds) } } }
          : {},
      );
      touch();
    },

    async setUploadedVideo(file) {
      get().clearVideo();
      const id = nanoid(10);
      const posterId = `${id}p`;
      const mime = uploadTypeFor("video", file.type, file.name) ?? (file.type || "video/mp4");
      await putBlob(id, file);
      const objectUrl = URL.createObjectURL(file);
      const poster = await captureVideoPoster(file);
      let posterUrl: string | undefined;
      if (poster) {
        await putBlob(posterId, poster);
        posterUrl = URL.createObjectURL(poster);
      }
      set((s) => ({
        assets: {
          ...s.assets,
          [id]: {
            id,
            kind: "video",
            local: true,
            objectUrl,
            mime,
            bytes: file.size,
            status: "local",
            progress: 0,
          },
          ...(poster && posterUrl
            ? {
                [posterId]: {
                  id: posterId,
                  kind: "photo" as const,
                  local: true,
                  objectUrl: posterUrl,
                  mime: "image/webp",
                  bytes: poster.size,
                  status: "local" as const,
                  progress: 0,
                },
              }
            : {}),
        },
        data: { ...s.data, video: { url: objectUrl, poster: posterUrl } },
      }));
      touch();
      void uploadAsset(id);
      if (poster) void uploadAsset(posterId);
    },

    clearVideo() {
      const s = get();
      const video = s.data.video;
      if (!video) return;
      const ids = Object.values(s.assets)
        .filter((a) => a.objectUrl && (a.objectUrl === video.url || a.objectUrl === video.poster))
        .map((a) => a.id);
      set((st) => {
        const assets = { ...st.assets };
        for (const id of ids) {
          if (assets[id]?.objectUrl) URL.revokeObjectURL(assets[id].objectUrl!);
          delete assets[id];
          void deleteBlob(id);
        }
        return { assets, data: { ...st.data, video: undefined } };
      });
      touch();
    },

    clearMusic() {
      const s = get();
      const id = s.data.music?.source === "upload" ? s.data.music.trackId : undefined;
      if (id) {
        const asset = s.assets[id];
        if (asset?.objectUrl) URL.revokeObjectURL(asset.objectUrl);
        void deleteBlob(id);
      }
      set((st) => {
        const assets = { ...st.assets };
        if (id) delete assets[id];
        return { assets, data: { ...st.data, music: undefined } };
      });
      touch();
    },

    async ensureRemote() {
      const s = get();
      if (!s.authed) return null;
      if (s.giftId) return s.giftId;
      ensuring ??= (async () => {
        const result = await ensureDraft({
          templateSlug: s.slug,
          locale: s.data.locale as GiftLocale,
        });
        if (!result.ok) {
          set({ save: "error" });
          return null;
        }
        set({ giftId: result.data.giftId, shortId: result.data.shortId });
        persistLocal();
        await get().uploadPending();
        return result.data.giftId;
      })().finally(() => {
        ensuring = null;
      });
      return ensuring;
    },

    async uploadPending() {
      const s = get();
      if (!s.authed || !s.giftId) return;
      // Earlier failures get another go here too; a lost blob is the one thing a retry can't fix.
      const queue = Object.values(s.assets).filter(
        (a) => a.local && !a.storagePath && a.status !== "uploading" && !(a.status === "error" && LASTING_FAILURES.has(a.error ?? "")),
      );
      // Three at a time: a phone on mobile data chokes when a dozen photos go up at once.
      const worker = async () => {
        while (queue.length) await uploadAsset(queue.shift()!.id);
      };
      await Promise.all(Array.from({ length: Math.min(3, queue.length) }, worker));
    },

    async retryUploads() {
      set((st) => {
        const assets = { ...st.assets };
        for (const a of Object.values(assets))
          if (a.status === "error" && !a.storagePath && reasonOf(a.error) === "network") assets[a.id] = { ...a, status: "local", error: undefined, progress: 0 };
        return { assets };
      });
      if (!get().giftId) await get().ensureRemote();
      else await get().uploadPending();
    },

    async dropFailedUploads(only) {
      const failed = Object.values(get().assets).filter((a) => a.status === "error" && !a.storagePath);
      for (const a of failed) {
        const { data } = get();
        const group = groupOf(data, a);
        if (only && group !== only) continue;
        if (group === "photos") await get().removePhoto(a.id);
        else if (group === "song") get().clearMusic();
        else if (group === "voice") get().clearVoiceNote();
        else if (group === "video" && isVideoItself(data, a)) get().clearVideo();
        else {
          // A still frame that didn't go up (the clip plays without one), or a leftover nothing uses.
          if (a.objectUrl) URL.revokeObjectURL(a.objectUrl);
          set((st) => {
            const assets = { ...st.assets };
            delete assets[a.id];
            const video = group === "video" && st.data.video ? { ...st.data.video, poster: undefined } : st.data.video;
            return { assets, data: { ...st.data, video } };
          });
          await deleteBlob(a.id);
          touch();
        }
      }
    },

    async syncNow() {
      const s = get();
      if (!s.authed || !s.hydrated) return false;
      const giftId = s.giftId ?? (await get().ensureRemote());
      if (!giftId) return false;
      set({ save: "saving" });
      let result = await saveDraft({ giftId, data: get().serializedForServer(), expectDraft: get().status === "draft" });
      if (!result.ok && (result.error === "not_found" || result.error === "not_draft") && get().status === "draft" && get().giftId === giftId) {
        // The row this device remembered is gone (tidied away after a week, deleted, another account
        // signed in) or was published from somewhere else: carry on in a fresh draft, never over it.
        detachFromGift(giftId);
        const fresh = await get().ensureRemote();
        if (fresh) result = await saveDraft({ giftId: fresh, data: get().serializedForServer(), expectDraft: true });
      }
      set({
        save: result.ok ? "saved" : "error",
        savedAt: Date.now(),
        dirty: result.ok ? false : get().dirty,
      });
      return result.ok;
    },

    serializedForServer() {
      const s = get();
      if (!s.data) return s.data;
      const refs = assetRefs(s);
      const byUrl = refsByUrl(s);
      return {
        ...s.data,
        video: s.data.video
          ? {
              url: byUrl[s.data.video.url] ?? s.data.video.url,
              poster: s.data.video.poster
                ? (byUrl[s.data.video.poster] ?? s.data.video.poster)
                : undefined,
            }
          : undefined,
        voiceNote: s.data.voiceNote
          ? { ...s.data.voiceNote, url: byUrl[s.data.voiceNote.url] ?? s.data.voiceNote.url }
          : undefined,
        photos: s.data.photos.map((p) => ({
          ...p,
          url: refs[p.id] ?? (isLocalRef(p.url) ? `idb:${p.id}` : p.url),
        })),
        music:
          s.data.music && s.data.music.source === "upload" && s.data.music.trackId
            ? { ...s.data.music, url: refs[s.data.music.trackId] ?? `idb:${s.data.music.trackId}` }
            : s.data.music,
      };
    },

    markPublished(shortId, status) {
      const { slug, giftId } = get();
      if (giftId) {
        // The template's page starts the next gift fresh; this one stays editable from the dashboard.
        if (sessionKey === slug || readLocalDraft(slug)?.giftId === giftId) clearLocalDraft(slug);
        sessionKey = draftScope(slug, giftId);
      }
      set({ shortId, status, dirty: false, save: "saved", savedAt: Date.now() });
      persistLocal();
    },
  };
});

/** A few bytes are enough to tell whether the browser can still read a stored file. */
async function readable(blob: Blob): Promise<boolean> {
  if (blob.size === 0) return false;
  try {
    await blob.slice(0, Math.min(blob.size, 64 * 1024)).arrayBuffer();
    return true;
  } catch {
    return false;
  }
}

export function draftScope(slug: string, giftId: string | null): string {
  return giftId ? `${slug}:${giftId}` : slug;
}

/** Turn a stored draft (idb refs) back into previewable object URLs. Drops photos whose blob is gone. */
async function rehydrate(local: EditorDraft, existing: Record<string, AssetRecord>) {
  const assets: Record<string, AssetRecord> = { ...existing };
  const ids = localAssetIds(local.data);
  const blobs = new Map<string, Blob>();
  await Promise.all(
    ids.map(async (id) => {
      const b = await getBlob(id);
      if (b) blobs.set(id, b);
    }),
  );
  // Where files already went: the remote row's own paths, and this device's record of its uploads.
  const uploaded: Record<string, string> = { ...(local.uploaded ?? {}) };
  for (const a of Object.values(existing)) if (a.storagePath) uploaded[a.id] = a.storagePath;
  /** This device's copy while it has one (a working preview, nothing sent twice), else the stored file. */
  const place = (id: string, kind: AssetRecord["kind"]): string | undefined => {
    const blob = blobs.get(id);
    const stored = uploaded[id];
    if (!blob) {
      if (!stored) return undefined;
      assets[id] = { id, kind, local: false, storagePath: stored, status: "uploaded", progress: 1 };
      return stored;
    }
    const objectUrl = URL.createObjectURL(blob);
    assets[id] = { id, kind, local: true, objectUrl, mime: blob.type, bytes: blob.size, storagePath: stored, status: stored ? "uploaded" : "local", progress: stored ? 1 : 0 };
    return objectUrl;
  };

  const photos = local.data.photos
    .map((p) => {
      if (isStoragePath(p.url)) {
        assets[p.id] = {
          id: p.id,
          kind: "photo",
          local: false,
          storagePath: p.url,
          status: "uploaded",
          progress: 1,
        };
        return p;
      }
      const url = isLocalRef(p.url) ? place(p.id, "photo") : undefined;
      return url ? { ...p, url } : null;
    })
    .filter((p): p is GiftPhoto => p !== null);

  let music = local.data.music;
  if (music?.source === "upload" && music.trackId) {
    if (isStoragePath(music.url)) {
      assets[music.trackId] = {
        id: music.trackId,
        kind: "audio",
        local: false,
        storagePath: music.url,
        status: "uploaded",
        progress: 1,
      };
    } else {
      const url = place(music.trackId, "audio");
      music = url ? { ...music, url } : undefined;
    }
  }
  const resolve = (ref: string | undefined, kind: AssetRecord["kind"]): string | undefined => {
    if (!ref) return undefined;
    if (isStoragePath(ref)) return ref;
    if (!ref.startsWith("idb:")) return ref;
    return place(ref.slice(4), kind);
  };
  let voiceNote = local.data.voiceNote;
  if (voiceNote) {
    const url = resolve(voiceNote.url, "audio");
    voiceNote = url ? { ...voiceNote, url } : undefined;
    if (voiceNote && isStoragePath(voiceNote.url)) {
      const id = voiceNote.url.split("/").pop()!.split(".")[0];
      assets[id] = {
        id,
        kind: "audio",
        local: false,
        storagePath: voiceNote.url,
        status: "uploaded",
        progress: 1,
      };
    }
  }
  let video = local.data.video;
  if (video) {
    const url = resolve(video.url, "video");
    video = url ? { url, poster: resolve(video.poster, "photo") } : undefined;
    if (video && isStoragePath(video.url)) {
      const id = video.url.split("/").pop()!.split(".")[0];
      assets[id] = {
        id,
        kind: "video",
        local: false,
        storagePath: video.url,
        status: "uploaded",
        progress: 1,
      };
    }
  }
  return { data: { ...local.data, photos, music, video, voiceNote }, assets };
}

/** Preview data: whatever the store has, with a non-empty recipient so templates render. */
export function previewData(data: GiftData, fallbackName: string): GiftData {
  return {
    ...data,
    recipientName: data.recipientName || fallbackName,
    senderName: data.senderName || "—",
  };
}

/** Signed-URL-free storage paths for photos that are uploaded; used by the publish sheet. */
export function readyForPublish(state: EditorState): boolean {
  return Object.values(state.assets).every(
    (a) => a.status === "uploaded" || (!a.local && Boolean(a.storagePath)),
  );
}
