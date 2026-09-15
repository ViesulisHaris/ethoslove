import type { GiftData } from "@/lib/gift/schema";

export type UploadStatus = "processing" | "local" | "uploading" | "uploaded" | "error";

export type AssetRecord = {
  id: string;
  kind: "photo" | "audio" | "video";
  /** Object URL for previewing the local blob (revoked on removal). */
  objectUrl?: string;
  /** Set once the blob is stored in IndexedDB. */
  local: boolean;
  /** Supabase Storage path once uploaded. */
  storagePath?: string;
  mime?: string;
  bytes?: number;
  status: UploadStatus;
  progress: number;
  error?: string;
};

export type ScheduleSettings = {
  enabled: boolean;
  unlockAt?: string; // ISO with offset
  timezone: string;
};

export type EditorDraft = {
  version: 1;
  slug: string;
  data: GiftData;
  giftId: string | null;
  shortId: string | null;
  status: "draft" | "scheduled" | "live";
  schedule: ScheduleSettings;
  password: string;
  removeWatermark: boolean;
  updatedAt: number;
  /** Where each file on this device already went in Storage, so reopening the draft sends nothing twice. */
  uploaded?: Record<string, string>;
};

export type SaveState = "idle" | "saving" | "saved" | "offline" | "error";
