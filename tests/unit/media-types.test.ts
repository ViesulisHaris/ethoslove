import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { extensionForMime } from "@/lib/gift/assets";
import { BUCKET_TYPES, uploadTypeFor, type UploadKind } from "@/lib/editor/media-types";
import { failureFromResponse } from "@/lib/editor/upload";

describe("upload types", () => {
  it("uploads an iPhone ringtone as the M4A it is", () => {
    expect(uploadTypeFor("audio", "audio/x-m4r")).toBe("audio/mp4");
    expect(extensionForMime(uploadTypeFor("audio", "audio/x-m4r")!)).toBe("m4a");
    expect(uploadTypeFor("audio", "", "Our song.M4R")).toBe("audio/mp4");
  });

  it("falls back to the extension when the label is missing, generic or wrong", () => {
    expect(uploadTypeFor("audio", "application/octet-stream", "track.mp3")).toBe("audio/mpeg");
    expect(uploadTypeFor("audio", "video/mpeg", "track.mp3")).toBe("audio/mpeg");
    expect(uploadTypeFor("video", "", "clip.MOV")).toBe("video/quicktime");
    expect(uploadTypeFor("audio", "audio/mpeg; codecs=mp3")).toBe("audio/mpeg");
  });

  it("keeps every type the bucket already takes", () => {
    for (const kind of Object.keys(BUCKET_TYPES) as UploadKind[]) {
      for (const type of BUCKET_TYPES[kind]) expect(uploadTypeFor(kind, type)).toBe(type);
    }
  });

  it("maps the common aliases", () => {
    expect(uploadTypeFor("audio", "audio/x-wav")).toBe("audio/wav");
    expect(uploadTypeFor("audio", "audio/mp3")).toBe("audio/mpeg");
    expect(uploadTypeFor("audio", "video/mp4")).toBe("audio/mp4");
    expect(uploadTypeFor("video", "video/x-m4v")).toBe("video/mp4");
    expect(uploadTypeFor("photo", "image/jpg")).toBe("image/jpeg");
  });

  it("refuses what the bucket or a browser can't take", () => {
    expect(uploadTypeFor("audio", "video/mpeg")).toBeNull();
    expect(uploadTypeFor("audio", "audio/flac", "song.flac")).toBeNull();
    expect(uploadTypeFor("audio", "audio/amr", "memo.amr")).toBeNull();
    expect(uploadTypeFor("video", "video/mpeg", "clip.mpg")).toBeNull();
    expect(uploadTypeFor("video", "audio/mp4", "voice.m4a")).toBeNull();
    expect(uploadTypeFor("audio", undefined)).toBeNull();
  });

  it("matches the gifts bucket the migrations create", () => {
    const sql = readFileSync("supabase/migrations/0001_init.sql", "utf8") + readFileSync("supabase/migrations/0003_audio_webm.sql", "utf8");
    const gifts = sql.match(/\('gifts'[\s\S]*?\]\)/)?.[0] ?? "";
    const fromSql = new Set([...gifts.matchAll(/'([a-z]+\/[a-z0-9.+-]+)'/g)].map((m) => m[1]));
    for (const m of sql.matchAll(/array_append\(allowed_mime_types, '([^']+)'\)/g)) fromSql.add(m[1]);
    expect(fromSql.size).toBeGreaterThan(10);
    expect(new Set(Object.values(BUCKET_TYPES).flat())).toEqual(fromSql);
  });
});

describe("upload refusals", () => {
  it("tells a lasting refusal from a passing one", () => {
    expect(failureFromResponse(400, '{"statusCode":"415","error":"invalid_mime_type","message":"mime type audio/x-m4r is not supported"}')).toBe("unsupported_type");
    expect(failureFromResponse(400, '{"statusCode":"400","error":"InvalidRequest","message":"No content provided"}')).toBe("unreadable");
    expect(failureFromResponse(413, "")).toBe("too_big");
    expect(failureFromResponse(400, '{"statusCode":"413","error":"Payload too large","message":"The object exceeded the maximum allowed size"}')).toBe("too_big");
    expect(failureFromResponse(400, '{"statusCode":"403","error":"Unauthorized","message":"new row violates row-level security policy"}')).toBe("unauthorized");
    expect(failureFromResponse(401, "")).toBe("unauthorized");
    expect(failureFromResponse(503, "<html>Service Unavailable</html>")).toBe("server");
  });
});
